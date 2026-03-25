"""
UNGUEALHEALTH - Entraînement du modèle CNN

Structure attendue du dataset :
    dataset/
        train/
            sain/           ← images PNG/JPG
            onychomycose/
            psoriasis/
            ...
        val/
            sain/
            onychomycose/
            ...

Usage:
    python model/train.py --data ./dataset --epochs 30 --batch 32 --lr 1e-4

Ressources publiques pour constituer un dataset :
    - ISIC Archive (dermatologie) : https://www.isic-archive.com
    - DermNet NZ : https://dermnet.com/
    - Kaggle Nail Disease Dataset
"""

import sys
import argparse
import logging
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, WeightedRandomSampler
import torchvision.datasets as datasets
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix

from model.architecture import build_model, save_weights, load_weights
from preprocessing.pipeline import TRAIN_TRANSFORM, INFERENCE_TRANSFORM
from config import CLASSES, NUM_CLASSES, MODEL_PATH, DEVICE

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("training.log"),
    ],
)
logger = logging.getLogger("train")


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_weighted_sampler(dataset) -> WeightedRandomSampler:
    """Sur-échantillonnage pour compenser les classes déséquilibrées."""
    labels   = [s[1] for s in dataset.samples]
    counts   = np.bincount(labels, minlength=NUM_CLASSES).astype(float)
    weights  = 1.0 / np.where(counts > 0, counts, 1.0)
    sample_w = torch.tensor([weights[l] for l in labels], dtype=torch.double)
    return WeightedRandomSampler(sample_w, len(sample_w), replacement=True)


def train_one_epoch(model, loader, criterion, optimizer, device, scaler=None):
    model.train()
    total_loss, correct, total = 0.0, 0, 0

    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        optimizer.zero_grad()

        if scaler is not None:
            with torch.autocast(device_type=device):
                out  = model(imgs)
                loss = criterion(out, labels)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
        else:
            out  = model(imgs)
            loss = criterion(out, labels)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

        total_loss += loss.item() * imgs.size(0)
        correct    += (out.argmax(1) == labels).sum().item()
        total      += imgs.size(0)

    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    all_preds, all_labels = [], []

    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        out  = model(imgs)
        loss = criterion(out, labels)

        total_loss += loss.item() * imgs.size(0)
        preds       = out.argmax(1)
        correct    += (preds == labels).sum().item()
        total      += imgs.size(0)
        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())

    return total_loss / total, correct / total, all_preds, all_labels


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Entraînement du classifier d'ongles")
    parser.add_argument("--data",    default="./dataset", type=str)
    parser.add_argument("--epochs",  default=30,  type=int)
    parser.add_argument("--batch",   default=32,  type=int)
    parser.add_argument("--lr",      default=1e-4, type=float)
    parser.add_argument("--patience",default=7,   type=int)
    parser.add_argument("--resume",  action="store_true")
    parser.add_argument("--freeze",  action="store_true",
                        help="Geler le backbone (transfer learning strict)")
    args = parser.parse_args()

    data_dir = Path(args.data)
    device   = torch.device(DEVICE)
    logger.info(f"Device  : {device}")
    logger.info(f"Dataset : {data_dir}")

    # ── Datasets ──────────────────────────────────────────────────────────────
    train_set = datasets.ImageFolder(data_dir / "train", transform=TRAIN_TRANSFORM)
    val_set   = datasets.ImageFolder(data_dir / "val",   transform=INFERENCE_TRANSFORM)

    # Vérification de la cohérence des classes
    if train_set.classes != CLASSES:
        logger.warning(
            f"Classes dataset {train_set.classes} ≠ config {CLASSES}. "
            "Assurez-vous que les sous-dossiers correspondent."
        )

    sampler    = make_weighted_sampler(train_set)
    train_load = DataLoader(train_set, batch_size=args.batch, sampler=sampler,
                            num_workers=2, pin_memory=True)
    val_load   = DataLoader(val_set,   batch_size=args.batch, shuffle=False,
                            num_workers=2, pin_memory=True)

    logger.info(f"Train : {len(train_set)} images | Val : {len(val_set)} images")

    # ── Modèle ─────────────────────────────────────────────────────────────────
    model = build_model(pretrained=True, freeze_backbone=args.freeze).to(device)

    if args.resume and MODEL_PATH.exists():
        model = load_weights(model, MODEL_PATH, device=str(device))
        logger.info("Reprise depuis le checkpoint existant")

    # ── Loss avec pondération des classes rares ────────────────────────────────
    counts  = np.bincount([s[1] for s in train_set.samples], minlength=NUM_CLASSES).astype(float)
    w       = torch.tensor(1.0 / np.where(counts > 0, counts, 1.0), dtype=torch.float32)
    w       = (w / w.sum() * NUM_CLASSES).to(device)
    criterion = nn.CrossEntropyLoss(weight=w, label_smoothing=0.1)

    # ── Optimiseur : LR différentiel backbone / head ──────────────────────────
    backbone_params = list(model.features.parameters())
    head_params     = list(model.classifier.parameters())
    optimizer = optim.AdamW([
        {"params": backbone_params, "lr": args.lr * 0.1},
        {"params": head_params,     "lr": args.lr},
    ], weight_decay=1e-4)

    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    # AMP si CUDA disponible
    scaler = torch.amp.GradScaler() if device.type == "cuda" else None

    # ── Boucle d'entraînement ──────────────────────────────────────────────────
    best_val_acc = 0.0
    patience_cnt = 0

    for epoch in range(1, args.epochs + 1):
        t0 = time.time()

        train_loss, train_acc = train_one_epoch(
            model, train_load, criterion, optimizer, device, scaler)
        val_loss, val_acc, preds, labels = evaluate(
            model, val_load, criterion, device)

        scheduler.step()
        elapsed = time.time() - t0

        logger.info(
            f"Epoch {epoch:03d}/{args.epochs}  "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f}  "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f}  "
            f"({elapsed:.1f}s)"
        )

        # Early stopping + sauvegarde du meilleur modèle
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_cnt = 0
            save_weights(model, MODEL_PATH)
            logger.info(f"  ✓ Nouveau meilleur modèle (val_acc={val_acc:.4f})")
        else:
            patience_cnt += 1
            if patience_cnt >= args.patience:
                logger.info(f"Early stopping après {epoch} epochs (patience={args.patience})")
                break

    # ── Rapport final ──────────────────────────────────────────────────────────
    logger.info("\n=== Rapport de classification (validation) ===")
    logger.info("\n" + classification_report(labels, preds, target_names=CLASSES))
    cm = confusion_matrix(labels, preds)
    logger.info(f"Matrice de confusion:\n{cm}")
    logger.info(f"Meilleure val_acc : {best_val_acc:.4f}")


if __name__ == "__main__":
    main()
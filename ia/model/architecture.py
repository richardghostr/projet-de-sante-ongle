"""
UNGUEALHEALTH - Architecture CNN EfficientNet-B0
Fine-tune pour la classification de pathologies ungueales (8 classes).
"""

import logging
from pathlib import Path
from typing import Optional

from config import NUM_CLASSES, BACKBONE, MODEL_PATH, DEVICE

logger = logging.getLogger("unguealhealth.model")


def _imports():
    """Importe torch/torchvision (lazy) - leve ImportError si absent."""
    try:
        import torch
        import torch.nn as nn
        import torchvision.models as models
        return torch, nn, models
    except Exception as e:
        raise ImportError(
            f"torch/torchvision indisponibles ({e}). "
            "Le moteur ONNX Runtime sera utilise en fallback."
        ) from e


class NailClassifier:
    """
    EfficientNet-B0 adapte a la classification d'ongles.

    Architecture :
        Backbone EfficientNet-B0 pre-entraine ImageNet
        Tete de classification :
            Linear(1280 -> 512) + ReLU + Dropout(0.4)
            Linear(512 -> NUM_CLASSES)
    """

    def __new__(cls, num_classes=NUM_CLASSES, pretrained=True, freeze_backbone=False):
        torch, nn, models = _imports()

        class _NailNet(nn.Module):
            def __init__(self):
                super().__init__()
                weights = models.EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
                base = models.efficientnet_b0(weights=weights)
                self.features = base.features
                self.avgpool  = base.avgpool
                in_features   = base.classifier[1].in_features  # 1280

                if freeze_backbone:
                    for p in self.features.parameters():
                        p.requires_grad = False

                self.classifier = nn.Sequential(
                    nn.Dropout(p=0.4, inplace=True),
                    nn.Linear(in_features, 512),
                    nn.ReLU(inplace=True),
                    nn.Dropout(p=0.3),
                    nn.Linear(512, num_classes),
                )

            def forward(self, x):
                x = self.features(x)
                x = self.avgpool(x)
                x = torch.flatten(x, 1)
                return self.classifier(x)

            def predict_proba(self, x):
                with torch.no_grad():
                    return torch.softmax(self.forward(x), dim=1)

        return _NailNet()


def build_model(pretrained=True, freeze_backbone=False):
    """Instancie et retourne le modele."""
    return NailClassifier(
        num_classes=NUM_CLASSES,
        pretrained=pretrained,
        freeze_backbone=freeze_backbone,
    )


def load_weights(model, path=MODEL_PATH, device=DEVICE):
    """Charge les poids depuis path dans model."""
    torch, nn, _ = _imports()
    state = torch.load(path, map_location=device)
    if isinstance(state, dict) and "model_state_dict" in state:
        state = state["model_state_dict"]
    model.load_state_dict(state)
    logger.info(f"Poids charges depuis {path}")
    return model


def save_weights(model, path=MODEL_PATH):
    """Sauvegarde les poids du modele."""
    torch, _, _ = _imports()
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), path)
    logger.info(f"Poids sauvegardes dans {path}")


def get_model_info(model):
    """Infos sur le modele."""
    total = sum(p.numel() for p in model.parameters())
    train = sum(p.numel() for p in model.parameters() if p.requires_grad)
    return {
        "backbone":               BACKBONE,
        "num_classes":            NUM_CLASSES,
        "total_parameters":       total,
        "trainable_parameters":   train,
        "frozen_parameters":      total - train,
    }
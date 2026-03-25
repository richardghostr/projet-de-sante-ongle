"""
UNGUEALHEALTH - Pipeline de prétraitement des images

Compatible torch+torchvision ET numpy-only (fallback ONNX Runtime).
Les transforms torchvision ne sont importées qu'au besoin (lazy import).
"""

import cv2
import numpy as np
from PIL import Image
import io
import logging
from dataclasses import dataclass
from typing import Optional, Tuple, Any

from config import (
    INPUT_SIZE,
    NORMALIZE_MEAN,
    NORMALIZE_STD,
    QUALITY_BLUR_THRESHOLD,
    QUALITY_BRIGHTNESS_MIN,
    QUALITY_BRIGHTNESS_MAX,
)

logger = logging.getLogger("unguealhealth.preprocessing")


# ── Lazy import torch/torchvision ──────────────────────────────────────────────

def _get_torch_transforms():
    """Retourne (INFERENCE_TRANSFORM, TRAIN_TRANSFORM) via torchvision si disponible."""
    try:
        import torch
        import torchvision.transforms as T
        inf = T.Compose([
            T.Resize(INPUT_SIZE),
            T.ToTensor(),
            T.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD),
        ])
        train = T.Compose([
            T.Resize((256, 256)),
            T.RandomCrop(INPUT_SIZE),
            T.RandomHorizontalFlip(),
            T.RandomVerticalFlip(),
            T.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.05),
            T.RandomRotation(20),
            T.ToTensor(),
            T.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD),
        ])
        return inf, train
    except Exception:
        return None, None


# Placeholders (None si torch indisponible, chargés à la demande)
INFERENCE_TRANSFORM = None
TRAIN_TRANSFORM = None


@dataclass
class ImageQuality:
    label: str          # "excellente" | "acceptable" | "floue" | "trop_sombre" | "trop_claire"
    blur_score: float   # variance du Laplacien
    brightness: float   # luminosité moyenne
    is_acceptable: bool


def assess_quality(img_bgr: np.ndarray) -> ImageQuality:
    """Évalue la qualité d'une image BGR (sortie OpenCV)."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    blur_score  = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness  = float(np.mean(gray))

    if blur_score < QUALITY_BLUR_THRESHOLD:
        label, ok = "floue", False
    elif brightness < QUALITY_BRIGHTNESS_MIN:
        label, ok = "trop_sombre", False
    elif brightness > QUALITY_BRIGHTNESS_MAX:
        label, ok = "trop_claire", False
    elif blur_score > 300 and QUALITY_BRIGHTNESS_MIN + 20 < brightness < QUALITY_BRIGHTNESS_MAX - 20:
        label, ok = "excellente", True
    else:
        label, ok = "acceptable", True

    return ImageQuality(label=label, blur_score=round(blur_score, 1),
                        brightness=round(brightness, 1), is_acceptable=ok)


def decode_image(raw: bytes) -> Tuple[np.ndarray, Image.Image]:
    """
    Décode bytes → (array BGR OpenCV, PIL Image RGB).
    Lève ValueError si décodage impossible.
    """
    # OpenCV
    arr = np.frombuffer(raw, np.uint8)
    img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Impossible de décoder l'image (format non supporté ou fichier corrompu)")

    # PIL
    img_pil = Image.open(io.BytesIO(raw)).convert("RGB")
    return img_bgr, img_pil


def strip_exif(raw: bytes) -> bytes:
    """Supprime les métadonnées EXIF pour protéger la vie privée."""
    try:
        img = Image.open(io.BytesIO(raw))
        buf = io.BytesIO()
        # Sauvegarder sans EXIF
        img.save(buf, format=img.format or "JPEG", exif=b"")
        return buf.getvalue()
    except Exception:
        return raw  # renvoyer l'original si nettoyage impossible


def preprocess_for_inference(img_pil: Image.Image) -> Any:
    """
    Transforme une PIL Image → tensor [1, 3, H, W] normalisé (torch) ou
    ndarray [1, 3, H, W] float32 normalisé (numpy fallback).

    Retourne un objet utilisable par le moteur d'inférence actif.
    """
    try:
        import torch
        import torchvision.transforms as T
        transform = T.Compose([
            T.Resize(INPUT_SIZE),
            T.ToTensor(),
            T.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD),
        ])
        tensor = transform(img_pil)      # [3, 224, 224]
        return tensor.unsqueeze(0)       # [1, 3, 224, 224]
    except Exception:
        # Fallback numpy pour ONNX Runtime
        img = img_pil.resize(INPUT_SIZE, Image.BILINEAR)
        arr = np.array(img, dtype=np.float32) / 255.0   # [H, W, 3]
        mean = np.array(NORMALIZE_MEAN, dtype=np.float32)
        std  = np.array(NORMALIZE_STD,  dtype=np.float32)
        arr  = (arr - mean) / std                       # [H, W, 3] normalised
        arr  = arr.transpose(2, 0, 1)                   # [3, H, W]
        return arr[np.newaxis].astype(np.float32)       # [1, 3, 224, 224]


def resize_for_display(img_bgr: np.ndarray, max_size: int = 512) -> np.ndarray:
    """Redimensionne pour l'affichage (heatmap) sans dépasser max_size px."""
    h, w = img_bgr.shape[:2]
    scale = min(max_size / h, max_size / w, 1.0)
    if scale < 1.0:
        new_w, new_h = int(w * scale), int(h * scale)
        return cv2.resize(img_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return img_bgr.copy()
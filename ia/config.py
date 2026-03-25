"""
UNGUEALHEALTH - Configuration du service IA
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).parent

# ── Serveur ────────────────────────────────────────────────────────────────────
HOST = os.getenv("IA_HOST", "0.0.0.0")
PORT = int(os.getenv("IA_PORT", 8001))
DEBUG = os.getenv("IA_DEBUG", "false").lower() == "true"
WORKERS = int(os.getenv("IA_WORKERS", 1))

# ── Modèle ─────────────────────────────────────────────────────────────────────
MODEL_DIR   = BASE_DIR / "model"
MODEL_PATH  = MODEL_DIR / "nail_classifier.pth"
MODEL_VERSION = "v3.0-efficientnet"
BACKBONE     = "efficientnet_b0"       # torchvision backbone
INPUT_SIZE   = (224, 224)              # taille d'entrée du réseau
DEVICE       = os.getenv("IA_DEVICE", "cpu")   # "cpu" | "cuda" | "mps"

# ── Classes (8 pathologies) ────────────────────────────────────────────────────
CLASSES = [
    "sain",
    "onychomycose",
    "psoriasis",
    "melanonychie",
    "onycholyse",
    "paronychie",
    "lichen",
    "hematome",
]

NUM_CLASSES = len(CLASSES)

# Seuil de confiance minimum pour accepter une prédiction
CONFIDENCE_THRESHOLD = 0.25

# ── Niveaux de risque par pathologie ──────────────────────────────────────────
RISK_LEVELS: dict[str, str] = {
    "sain":          "sain",
    "hematome":      "bas",
    "onycholyse":    "bas",
    "paronychie":    "modere",
    "lichen":        "modere",
    "onychomycose":  "modere",
    "psoriasis":     "modere",
    "melanonychie":  "eleve",
}

# ── Stockage ───────────────────────────────────────────────────────────────────
STORAGE_DIR  = BASE_DIR / "storage"
HEATMAP_DIR  = STORAGE_DIR / "heatmaps"
MAX_FILE_SIZE = 10 * 1024 * 1024   # 10 MB
ALLOWED_MIME  = {"image/jpeg", "image/png", "image/webp"}

# ── Upload / qualité image ─────────────────────────────────────────────────────
QUALITY_BLUR_THRESHOLD       = 80    # variance du Laplacien
QUALITY_BRIGHTNESS_MIN       = 35
QUALITY_BRIGHTNESS_MAX       = 225

# Normalisation ImageNet (backbone pré-entraîné)
NORMALIZE_MEAN = [0.485, 0.456, 0.406]
NORMALIZE_STD  = [0.229, 0.224, 0.225]
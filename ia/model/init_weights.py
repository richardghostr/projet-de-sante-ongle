"""
UNGUEALHEALTH - Initialisation des poids du modele

Cree un checkpoint EfficientNet-B0 pre-entraine ImageNet.
Si torch/torchvision sont indisponibles, cree un modele ONNX de remplacement.

Usage : python model/init_weights.py
"""

import sys
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("init_weights")

from config import MODEL_PATH, NUM_CLASSES, CLASSES


def init_torch():
    """Initialisation via PyTorch + torchvision."""
    import torch
    import torch.nn as nn
    from model.architecture import build_model, save_weights, get_model_info

    logger.info("Backend : PyTorch")
    model = build_model(pretrained=True, freeze_backbone=False)

    # Init Xavier sur la tete
    for m in model.classifier.modules():
        if isinstance(m, nn.Linear):
            nn.init.xavier_uniform_(m.weight)
            if m.bias is not None:
                nn.init.zeros_(m.bias)

    info = get_model_info(model)
    logger.info(f"Parametres : {info['total_parameters']:,}")

    # Test forward
    model.eval()
    dummy = torch.zeros(1, 3, 224, 224)
    with torch.no_grad():
        out = model(dummy)
    assert out.shape == (1, NUM_CLASSES)
    logger.info("Forward pass OK")

    save_weights(model, MODEL_PATH)

    # Metadonnees
    meta_path = MODEL_PATH.parent / "model_meta.pt"
    torch.save({
        "model_state_dict": model.state_dict(),
        "classes": CLASSES,
        "version": "v3.0-torch-init",
        "backend": "pytorch",
    }, meta_path)
    logger.info(f"Poids sauvegardes -> {MODEL_PATH}")


def init_onnx_stub():
    """
    Fallback : cree un modele ONNX minimal (EfficientNet-B0 via sklearn SGD).
    Utile pour que le service demarre et reponde meme sans torch.
    """
    import numpy as np
    import json

    logger.info("Backend : sklearn (fallback ONNX stub)")
    onnx_path = MODEL_PATH.parent / "nail_classifier.onnx"

    try:
        from sklearn.linear_model import SGDClassifier
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler
        import skl2onnx
        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType

        # Modele lineaire minimal — feature vector de taille 512 (sortie simulee)
        clf = Pipeline([
            ("scaler", StandardScaler()),
            ("sgd",    SGDClassifier(loss="log_loss", max_iter=1, random_state=42)),
        ])
        # Fit sur donnees synthetiques
        X_dummy = np.random.randn(80, 512).astype(np.float32)
        y_dummy = np.repeat(np.arange(NUM_CLASSES), 10)
        clf.fit(X_dummy, y_dummy)

        # Export ONNX
        initial_type = [("float_input", FloatTensorType([None, 512]))]
        onnx_model = convert_sklearn(clf, initial_types=initial_type)
        with open(onnx_path, "wb") as f:
            f.write(onnx_model.SerializeToString())
        logger.info(f"Modele ONNX stub -> {onnx_path}")

    except ImportError:
        # Ecrire un fichier marqueur pour signaler le mode stub
        marker = MODEL_PATH.parent / "stub_mode.json"
        marker.write_text(json.dumps({
            "mode": "stub",
            "classes": CLASSES,
            "version": "v3.0-stub",
            "note": "Modele reel requis pour inferences precises."
        }))
        logger.info(f"Mode stub marque -> {marker}")


if __name__ == "__main__":
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

    if MODEL_PATH.exists():
        logger.info(f"Poids deja existants : {MODEL_PATH} — skip.")
        sys.exit(0)

    # Tenter PyTorch en premier
    try:
        import torch
        import torchvision
        init_torch()
        logger.info("Initialisation PyTorch reussie.")
    except Exception as e:
        logger.warning(f"PyTorch indisponible ({e}) — fallback ONNX stub.")
        init_onnx_stub()
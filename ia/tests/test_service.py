"""
UNGUEALHEALTH - Tests du service IA

Usage:
    cd ia/
    python -m pytest tests/ -v
    python -m pytest tests/ -v --tb=short
"""

import sys
import io
import json
import numpy as np
from pathlib import Path

# Ajouter le dossier parent
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from PIL import Image

# ── Fixtures ───────────────────────────────────────────────────────────────────

def make_jpeg_bytes(color=(200, 200, 200), size=(300, 300)) -> bytes:
    """Crée une image JPEG synthétique en mémoire."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def make_png_bytes(color=(150, 180, 150), size=(256, 256)) -> bytes:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ── Tests preprocessing ────────────────────────────────────────────────────────

class TestPreprocessing:

    def test_decode_jpeg(self):
        from preprocessing.pipeline import decode_image
        raw = make_jpeg_bytes()
        img_bgr, img_pil = decode_image(raw)
        assert img_bgr is not None
        assert img_bgr.shape[2] == 3
        assert img_pil.mode == "RGB"

    def test_decode_invalid(self):
        from preprocessing.pipeline import decode_image
        with pytest.raises(ValueError):
            decode_image(b"not_an_image")

    def test_quality_bright(self):
        from preprocessing.pipeline import assess_quality
        import cv2
        # Image bien éclairée et nette
        raw = make_jpeg_bytes(color=(180, 180, 180), size=(400, 400))
        arr = np.frombuffer(raw, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        q = assess_quality(img)
        assert q.label in ("excellente", "acceptable", "floue")
        assert q.brightness > 50

    def test_quality_dark(self):
        from preprocessing.pipeline import assess_quality
        import cv2
        raw = make_jpeg_bytes(color=(10, 10, 10), size=(200, 200))
        arr = np.frombuffer(raw, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        q = assess_quality(img)
        assert q.label == "trop_sombre"
        assert not q.is_acceptable

    def test_preprocess_tensor_shape(self):
        from preprocessing.pipeline import preprocess_for_inference
        img_pil = Image.new("RGB", (300, 400), color=(120, 180, 150))
        tensor = preprocess_for_inference(img_pil)
        assert tensor.shape == (1, 3, 224, 224)

    def test_strip_exif(self):
        from preprocessing.pipeline import strip_exif
        raw = make_jpeg_bytes()
        cleaned = strip_exif(raw)
        assert isinstance(cleaned, bytes)
        assert len(cleaned) > 0


# ── Tests modèle ───────────────────────────────────────────────────────────────

class TestModel:

    def test_build_model_shape(self):
        import torch
        from model.architecture import build_model
        from config import NUM_CLASSES
        model = build_model(pretrained=False)
        model.eval()
        dummy = torch.zeros(1, 3, 224, 224)
        with torch.no_grad():
            out = model(dummy)
        assert out.shape == (1, NUM_CLASSES)

    def test_predict_proba_sum_to_one(self):
        import torch
        from model.architecture import build_model
        model = build_model(pretrained=False)
        model.eval()
        dummy = torch.zeros(2, 3, 224, 224)
        probs = model.predict_proba(dummy)
        sums = probs.sum(dim=1)
        assert all(abs(s.item() - 1.0) < 1e-5 for s in sums)

    def test_model_info(self):
        from model.architecture import build_model, get_model_info
        model = build_model(pretrained=False)
        info = get_model_info(model)
        assert info["num_classes"] == 8
        assert info["total_parameters"] > 0
        assert "backbone" in info


# ── Tests config ───────────────────────────────────────────────────────────────

class TestConfig:

    def test_classes_count(self):
        from config import CLASSES, NUM_CLASSES
        assert len(CLASSES) == NUM_CLASSES == 8

    def test_risk_levels_complete(self):
        from config import CLASSES, RISK_LEVELS
        for cls in CLASSES:
            assert cls in RISK_LEVELS, f"Classe '{cls}' absente de RISK_LEVELS"

    def test_paths_defined(self):
        from config import MODEL_DIR, HEATMAP_DIR, MODEL_PATH
        assert MODEL_DIR is not None
        assert HEATMAP_DIR is not None


# ── Tests FastAPI (client de test) ─────────────────────────────────────────────

class TestAPI:

    @pytest.fixture(autouse=True)
    def client(self):
        from fastapi.testclient import TestClient
        from server import app
        self.client = TestClient(app)

    def test_root(self):
        r = self.client.get("/")
        assert r.status_code == 200
        data = r.json()
        assert "service" in data
        assert "endpoints" in data

    def test_health(self):
        r = self.client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert "status" in data
        assert "model_loaded" in data

    def test_classes(self):
        r = self.client.get("/classes")
        assert r.status_code == 200
        data = r.json()
        assert "classes" in data
        assert len(data["classes"]) == 8

    def test_metrics(self):
        r = self.client.get("/metrics")
        assert r.status_code == 200
        data = r.json()
        assert "cpu_percent" in data

    def test_predict_missing_file(self):
        r = self.client.post("/predict")
        assert r.status_code == 422   # Unprocessable Entity

    def test_predict_wrong_mime(self):
        r = self.client.post(
            "/predict",
            files={"image": ("test.gif", b"GIF89a", "image/gif")},
        )
        assert r.status_code == 400
        assert "Type non supporte" in r.json()["detail"]

    def test_predict_invalid_image(self):
        r = self.client.post(
            "/predict",
            files={"image": ("test.jpg", b"not_real_image_data", "image/jpeg")},
        )
        # Doit retourner 400 (decode error)
        assert r.status_code in (400, 500)

    def test_predict_valid_jpeg(self):
        """Test complet avec une vraie image JPEG."""
        raw = make_jpeg_bytes(color=(200, 180, 160), size=(256, 256))
        r = self.client.post(
            "/predict",
            files={"image": ("nail.jpg", raw, "image/jpeg")},
        )
        # Peut retourner 200 (modèle chargé) ou 503 (pas de poids)
        assert r.status_code in (200, 503)

        if r.status_code == 200:
            data = r.json()
            assert "prediction" in data
            assert "predictions" in data
            assert "risk_level" in data
            assert "recommendations" in data
            assert data["prediction"]["label"] in [
                "sain", "onychomycose", "psoriasis", "melanonychie",
                "onycholyse", "paronychie", "lichen", "hematome"
            ]
            assert 0 <= data["score"] <= 1
            assert len(data["predictions"]) <= 5

    def test_heatmap_not_found(self):
        r = self.client.get("/heatmaps/inexistant.jpg")
        assert r.status_code == 404

    def test_heatmap_path_traversal(self):
        """Sécurité : traversée de chemin interdite."""
        r = self.client.get("/heatmaps/../config.py")
        assert r.status_code == 404


# ── Tests inference engine ─────────────────────────────────────────────────────

class TestInferenceEngine:

    def test_singleton(self):
        from inference.engine import InferenceEngine
        e1 = InferenceEngine.get()
        e2 = InferenceEngine.get()
        assert e1 is e2

    def test_advice_all_classes(self):
        from inference.engine import ADVICE
        from config import CLASSES
        for cls in CLASSES:
            assert cls in ADVICE, f"Conseils manquants pour '{cls}'"
            assert len(ADVICE[cls]) >= 1

    def test_confidence_labels(self):
        from inference.engine import _confidence_label
        assert _confidence_label(0.90) == "eleve"
        assert _confidence_label(0.70) == "modere"
        assert _confidence_label(0.50) == "faible"
        assert _confidence_label(0.20) == "tres_faible"


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))
import cv2
import numpy as np
"""
UNGUEALHEALTH - Moteur d'inference adaptatif

Backends supportes (par ordre de priorite) :
  1. PyTorch  — EfficientNet-B0 CNN complet (meilleure precision)
  2. ONNX Runtime — modele exporte .onnx (portable, sans torch)
  3. Stub heuristique — fallback vision-only numpy/opencv

Le moteur selectionne automatiquement le meilleur backend disponible.
"""

import logging
import time
import threading
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List

import numpy as np

from config import (
    CLASSES, NUM_CLASSES, MODEL_PATH, DEVICE, MODEL_VERSION,
    CONFIDENCE_THRESHOLD, RISK_LEVELS, MODEL_DIR,
)
from preprocessing.pipeline import preprocess_for_inference

logger = logging.getLogger("unguealhealth.inference")

# ── Conseils medicaux par pathologie ──────────────────────────────────────────
ADVICE: dict = {
    "sain": [
        {"type": "general",    "titre": "Ongle sain",   "priorite": 1,
         "texte": "Aucune anomalie detectee. Continuez a entretenir vos ongles regulierement."},
        {"type": "prevention", "titre": "Prevention",   "priorite": 2,
         "texte": "Hydratez vos cuticules, evitez les chocs et coupez les ongles proprement."},
    ],
    "onychomycose": [
        {"type": "traitement", "titre": "Traitement antifongique", "priorite": 1,
         "texte": "Une infection fongique est suspectee. Des antifongiques topiques (amorolfine, ciclopirox) sont disponibles en pharmacie. Consultez un dermatologue si l'infection persiste au-dela de 3 semaines."},
        {"type": "hygiene",    "titre": "Hygiene",               "priorite": 2,
         "texte": "Sechez soigneusement les pieds apres chaque lavage. Changez de chaussettes quotidiennement. Evitez de marcher pieds nus dans les lieux publics humides."},
        {"type": "prevention", "titre": "Prevention recidive",   "priorite": 3,
         "texte": "Desinfectez les chaussures avec un spray antifongique. Preferez des chaussures en matiere respirante."},
    ],
    "psoriasis": [
        {"type": "consultation", "titre": "Suivi dermatologique", "priorite": 1,
         "texte": "Le psoriasis ungueal est souvent associe a un psoriasis cutane. Un suivi dermatologique regulier est recommande pour adapter le traitement."},
        {"type": "traitement",   "titre": "Traitements locaux",  "priorite": 2,
         "texte": "Les corticoides topiques et les derives de la vitamine D peuvent ameliorer l'etat des ongles. Ne pas s'auto-medicamenter sans avis medical."},
        {"type": "hygiene",      "titre": "Soins quotidiens",    "priorite": 3,
         "texte": "Hydratez regulierement ongles et cuticules. Evitez les traumatismes (Koebner). Coupez les ongles courts."},
    ],
    "melanonychie": [
        {"type": "urgence",      "titre": "Consultation urgente", "priorite": 1,
         "texte": "ATTENTION : Une bande pigmentee longitudinale necessite une evaluation dermatologique rapide pour exclure un melanome sous-ungueal. Consultez un dermatologue dans les 2 semaines."},
        {"type": "surveillance", "titre": "Surveillance",         "priorite": 1,
         "texte": "Photographiez l'ongle regulierement. Consultez si la bande s'elargit, change de couleur, ou si la pigmentation deborde sur la peau autour de l'ongle (signe de Hutchinson)."},
    ],
    "onycholyse": [
        {"type": "hygiene",    "titre": "Hygiene",            "priorite": 1,
         "texte": "Gardez l'espace sous-ungueal propre et sec. Coupez l'ongle decolle progressivement."},
        {"type": "traitement", "titre": "Cause sous-jacente", "priorite": 2,
         "texte": "L'onycholyse peut etre d'origine traumatique, fongique ou liee au psoriasis/thyroide. Consultez un medecin pour identifier et traiter la cause."},
        {"type": "prevention", "titre": "Prevention",         "priorite": 3,
         "texte": "Evitez les ongles longs. Portez des gants pour les travaux manuels. Limitez l'exposition prolongee a l'eau."},
    ],
    "paronychie": [
        {"type": "traitement", "titre": "Traitement",  "priorite": 1,
         "texte": "Bains antiseptiques (chlorhexidine) 2x/jour. Une creme antibiotique peut etre necessaire. Consultez si fievre, pus important ou progression malgre le traitement."},
        {"type": "hygiene",    "titre": "Hygiene",     "priorite": 2,
         "texte": "Ne pas arracher les petites peaux. Evitez de vous ronger les ongles. Sechez soigneusement apres le lavage."},
    ],
    "lichen": [
        {"type": "consultation", "titre": "Avis dermatologique", "priorite": 1,
         "texte": "Le lichen plan ungueal peut provoquer une destruction irreversible de l'ongle. Un diagnostic dermatologique precoce est essentiel pour preserver la matrice."},
        {"type": "traitement",   "titre": "Traitement",          "priorite": 2,
         "texte": "Les injections de corticoides intra-matricielles sont le traitement de reference. Ne pas retarder la consultation."},
    ],
    "hematome": [
        {"type": "general",     "titre": "Hematome sous-ungueal", "priorite": 1,
         "texte": "Un hematome sous-ungueal est generalement benin apres un choc. La coloration noire disparait avec la repousse de l'ongle (3-6 mois)."},
        {"type": "traitement",  "titre": "Douleur intense",       "priorite": 2,
         "texte": "Si la douleur est tres importante, un medecin peut pratiquer une trepanation (petite perforation de l'ongle) pour evacuer l'hematome."},
        {"type": "surveillance","titre": "Surveillance",          "priorite": 3,
         "texte": "Consultez si l'ongle se detache, si la douleur s'aggrave, ou si vous n'avez subi aucun traumatisme recent (la melanonychie peut ressembler a un hematome)."},
    ],
}


# ── Dataclasses ────────────────────────────────────────────────────────────────

@dataclass
class SinglePrediction:
    label: str
    probability: float
    description: str = ""


@dataclass
class InferenceResult:
    prediction:         SinglePrediction
    predictions:        List[SinglePrediction]
    score:              float
    confidence_level:   str
    risk_level:         str
    heatmap_url:        Optional[str]
    model_version:      str
    processing_time_ms: int
    image_quality:      str
    recommendations:    List[dict]
    backend:            str = "unknown"
    raw_probs:          List[float] = field(default_factory=list)


# ── Backends ───────────────────────────────────────────────────────────────────

class _TorchBackend:
    """Backend PyTorch — EfficientNet-B0 complet."""

    name = "pytorch"

    def __init__(self):
        import torch
        from model.architecture import build_model, load_weights
        self.torch = torch
        self._model = build_model(pretrained=False)
        self._model = load_weights(self._model, MODEL_PATH, device=DEVICE)
        self._device = torch.device(DEVICE)
        self._model.to(self._device)
        self._model.eval()
        logger.info("Backend PyTorch charge.")

    def predict(self, tensor) -> np.ndarray:
        """Retourne probabilites numpy [NUM_CLASSES]."""
        if not isinstance(tensor, self.torch.Tensor):
            tensor = self.torch.tensor(tensor, dtype=self.torch.float32)
        tensor = tensor.to(self._device)
        probs = self._model.predict_proba(tensor)
        return probs[0].cpu().numpy()

    @property
    def model(self):
        return self._model


class _OnnxBackend:
    """Backend ONNX Runtime — portable, sans PyTorch."""

    name = "onnxruntime"

    def __init__(self):
        import onnxruntime as ort
        onnx_path = MODEL_DIR / "nail_classifier.onnx"
        if not onnx_path.exists():
            raise FileNotFoundError(f"Modele ONNX absent : {onnx_path}")
        opts = ort.SessionOptions()
        opts.log_severity_level = 3
        self._session = ort.InferenceSession(
            str(onnx_path),
            sess_options=opts,
            providers=["CPUExecutionProvider"],
        )
        self._input_name = self._session.get_inputs()[0].name
        logger.info("Backend ONNX Runtime charge.")

    def predict(self, tensor) -> np.ndarray:
        if not isinstance(tensor, np.ndarray):
            tensor = np.array(tensor, dtype=np.float32)
        # Certains modeles ONNX attendent [1, 512] (feature vector)
        # Si c'est un CNN complet [1,3,224,224], on passe direct
        result = self._session.run(None, {self._input_name: tensor})
        logits = result[0][0]   # [NUM_CLASSES]
        # Softmax manuel
        e = np.exp(logits - logits.max())
        return e / e.sum()

    @property
    def model(self):
        return None


class _HeuristicBackend:
    """
    Backend heuristique pur numpy/OpenCV.
    Extrait des features visuelles et predit via regles metier.
    Moins precis qu'un CNN mais toujours fonctionnel.
    """

    name = "heuristic"

    def __init__(self):
        logger.warning(
            "Backend heuristique actif. "
            "Installez PyTorch + torchvision pour une meilleure precision."
        )

    def predict(self, tensor) -> np.ndarray:
        """
        Extrait des features visuelles depuis le tensor normalise
        et calcule un vecteur de probabilites par regles.
        """
        # Denormaliser pour retrouver les pixels
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        arr  = np.array(tensor[0], dtype=np.float32)  # [3, 224, 224]
        arr  = arr * std[:, None, None] + mean[:, None, None]
        arr  = np.clip(arr * 255, 0, 255).astype(np.uint8)
        img  = arr.transpose(1, 2, 0)  # [224, 224, 3] RGB

        import cv2
        bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        return self._visual_heuristic(bgr)

    def _visual_heuristic(self, img_bgr: np.ndarray) -> np.ndarray:
        """Heuristique visuelle -> probabilites [NUM_CLASSES]."""
        hsv  = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        lab  = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

        brightness = np.mean(gray) / 255.0
        saturation = np.mean(hsv[:,:,1]) / 255.0
        mean_a     = (np.mean(lab[:,:,1]) - 128) / 128.0
        mean_b     = (np.mean(lab[:,:,2]) - 128) / 128.0

        # Ratio jaune
        y_mask    = cv2.inRange(hsv, np.array([15,50,50]), np.array([35,255,255]))
        yellow_r  = np.sum(y_mask > 0) / y_mask.size

        # Ratio zones sombres
        dark_r    = np.sum(gray < 60) / gray.size

        # Lignes verticales (melanonychie)
        edges     = cv2.Canny(gray, 50, 150)
        lines     = cv2.HoughLinesP(edges, 1, np.pi/180, 30,
                                    minLineLength=30, maxLineGap=10)
        vert_lines = 0 if lines is None else sum(
            1 for l in lines if abs(int(l[0][0]) - int(l[0][2])) < 20
        )

        # Texture
        lap_var   = cv2.Laplacian(gray, cv2.CV_64F).var() / 10000.0
        sobel_x   = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y   = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        roughness = (np.mean(np.abs(sobel_x)) + np.mean(np.abs(sobel_y))) / 500.0

        probs = np.zeros(NUM_CLASSES, dtype=np.float32)
        idx   = {c: i for i, c in enumerate(CLASSES)}

        # Sain
        if brightness > 0.5 and yellow_r < 0.1 and dark_r < 0.1:
            probs[idx["sain"]] = 0.5 + brightness * 0.3

        # Onychomycose
        if yellow_r > 0.1 or mean_b > 0.15:
            probs[idx["onychomycose"]] = min(0.88, 0.25 + yellow_r * 2.5 + mean_b * 0.6)

        # Psoriasis
        if lap_var > 0.3 and roughness > 0.15:
            probs[idx["psoriasis"]] = min(0.80, 0.2 + lap_var + roughness)

        # Melanonychie
        if vert_lines > 2 and dark_r > 0.04:
            probs[idx["melanonychie"]] = min(0.88, 0.25 + vert_lines * 0.12 + dark_r)

        # Hematome
        if dark_r > 0.18:
            probs[idx["hematome"]] = min(0.82, 0.2 + dark_r * 2.2)

        # Onycholyse
        white_r = 1.0 - saturation
        if white_r > 0.65:
            probs[idx["onycholyse"]] = min(0.75, 0.2 + white_r * 0.5)

        # Paronychie
        if mean_a > 0.08:
            probs[idx["paronychie"]] = min(0.72, 0.15 + mean_a * 2.2)

        # Lichen
        if roughness > 0.22:
            probs[idx["lichen"]] = min(0.68, 0.1 + roughness * 2.0)

        # Normaliser + bruit minimal
        total = probs.sum()
        if total < 0.01:
            probs[idx["sain"]] = 0.60
            total = 0.60
        probs = probs / total
        noise = np.random.uniform(-0.02, 0.02, NUM_CLASSES).astype(np.float32)
        probs = np.clip(probs + noise, 0, 1)
        probs = probs / probs.sum()
        return probs

    @property
    def model(self):
        return None


# ── Singleton du moteur ────────────────────────────────────────────────────────

class InferenceEngine:
    """Moteur d'inference thread-safe avec selection automatique du backend."""

    _instance: Optional["InferenceEngine"] = None
    _lock = threading.Lock()

    def __init__(self):
        self._backend = None
        self._load_lock = threading.Lock()

    @classmethod
    def get(cls) -> "InferenceEngine":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def ensure_model(self) -> bool:
        if self._backend is not None:
            return True
        with self._load_lock:
            if self._backend is not None:
                return True
            self._backend = self._load_best_backend()
        return self._backend is not None

    def _load_best_backend(self):
        """Charge le meilleur backend disponible."""

        # 1. PyTorch
        if MODEL_PATH.exists():
            try:
                b = _TorchBackend()
                logger.info("Moteur : PyTorch CNN")
                return b
            except Exception as e:
                logger.warning(f"PyTorch echec : {e}")

        # 2. Generer les poids si absents
        if not MODEL_PATH.exists():
            logger.info("Poids absents — initialisation automatique…")
            self._auto_init()

            if MODEL_PATH.exists():
                try:
                    b = _TorchBackend()
                    logger.info("Moteur : PyTorch CNN (post-init)")
                    return b
                except Exception as e:
                    logger.warning(f"PyTorch post-init echec : {e}")

        # 3. ONNX Runtime
        onnx_path = MODEL_DIR / "nail_classifier.onnx"
        if onnx_path.exists():
            try:
                b = _OnnxBackend()
                logger.info("Moteur : ONNX Runtime")
                return b
            except Exception as e:
                logger.warning(f"ONNX echec : {e}")

        # 4. Heuristique (toujours disponible)
        logger.warning("Moteur : heuristique (fallback)")
        return _HeuristicBackend()

    def _auto_init(self):
        init_script = str(Path(__file__).parent.parent / "model" / "init_weights.py")
        try:
            subprocess.run(
                [sys.executable, init_script],
                check=True, capture_output=True, timeout=300,
            )
        except Exception as e:
            logger.error(f"Auto-init echoue : {e}")

    @property
    def model_loaded(self) -> bool:
        return self._backend is not None

    @property
    def backend_name(self) -> str:
        return self._backend.name if self._backend else "none"

    @property
    def model(self):
        return self._backend.model if self._backend else None

    # ── Inference ──────────────────────────────────────────────────────────────

    def predict(self, img_pil, img_bgr, image_quality: str,
                generate_heatmap: bool = True) -> InferenceResult:
        if not self.ensure_model():
            raise RuntimeError("Aucun backend d'inference disponible.")

        t0 = time.perf_counter()

        # Pretraitement
        tensor = preprocess_for_inference(img_pil)

        # Inference
        probs_np = self._backend.predict(tensor).tolist()

        # Top-5
        top_idx  = np.argsort(probs_np)[::-1]
        all_pred = [
            SinglePrediction(
                label       = CLASSES[i],
                probability = round(probs_np[i], 4),
                description = _class_desc(CLASSES[i]),
            )
            for i in top_idx
        ]
        main_pred = all_pred[0]
        score     = main_pred.probability

        if score < CONFIDENCE_THRESHOLD:
            main_pred = SinglePrediction(
                label="sain", probability=score,
                description=_class_desc("sain")
            )

        confidence_level = _conf_label(score)
        risk_level       = RISK_LEVELS.get(main_pred.label, "bas")

        # Heatmap Grad-CAM (seulement si PyTorch disponible)
        heatmap_url = None
        if generate_heatmap and self.backend_name == "pytorch" and score >= CONFIDENCE_THRESHOLD:
            try:
                from inference.gradcam import generate_gradcam
                class_idx   = CLASSES.index(main_pred.label)
                tensor_grad = preprocess_for_inference(img_pil)
                heatmap_url = generate_gradcam(
                    self._backend.model, tensor_grad, img_bgr,
                    class_idx=class_idx
                )
            except Exception as e:
                logger.warning(f"Heatmap non generee : {e}")

        # Conseils
        recommendations = list(ADVICE.get(main_pred.label, ADVICE["sain"]))
        if confidence_level in ("faible", "tres_faible"):
            recommendations.insert(0, {
                "type": "avertissement", "titre": "Confiance limitee", "priorite": 0,
                "texte": (
                    "Le score de confiance est faible. Ce resultat doit etre interprete "
                    "avec prudence. Une consultation professionnelle est recommandee."
                ),
            })

        processing_time = int((time.perf_counter() - t0) * 1000)

        return InferenceResult(
            prediction        = main_pred,
            predictions       = all_pred[:5],
            score             = round(score, 4),
            confidence_level  = confidence_level,
            risk_level        = risk_level,
            heatmap_url       = heatmap_url,
            model_version     = MODEL_VERSION,
            processing_time_ms= processing_time,
            image_quality     = image_quality,
            recommendations   = recommendations,
            backend           = self.backend_name,
            raw_probs         = probs_np,
        )


# ── Helpers ────────────────────────────────────────────────────────────────────

def _conf_label(score: float) -> str:
    if score >= 0.80: return "eleve"
    if score >= 0.60: return "modere"
    if score >= 0.40: return "faible"
    return "tres_faible"


def _class_desc(cls: str) -> str:
    descs = {
        "sain":         "Ongle en bonne sante, sans anomalie detectee.",
        "onychomycose": "Infection fongique de l'ongle (dermatophytes, levures).",
        "psoriasis":    "Manifestation du psoriasis au niveau de l'ongle.",
        "melanonychie": "Pigmentation longitudinale de l'ongle, a surveiller.",
        "onycholyse":   "Decollement de l'ongle de son lit ungueal.",
        "paronychie":   "Infection/inflammation du repli cutane peri-ungueal.",
        "lichen":       "Atteinte inflammatoire de l'ongle par lichen plan.",
        "hematome":     "Accumulation de sang sous l'ongle (trauma).",
    }
    return descs.get(cls, "")

# Alias pour compatibilite avec les tests
_confidence_label = _conf_label
_class_description = _class_desc
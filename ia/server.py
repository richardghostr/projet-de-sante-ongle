"""
UNGUEALHEALTH - Service IA v3.0
FastAPI + EfficientNet-B0 + Grad-CAM

Endpoints :
    GET  /            → infos du service
    GET  /health      → santé + modèle chargé
    GET  /classes     → liste des classes
    POST /predict     → analyse d'image (multipart/form-data field: "image")
    GET  /heatmaps/{f}→ servir les heatmaps générées
    GET  /metrics     → métriques psutil (CPU, RAM)
"""

import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional
import datetime

import psutil
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

import config as cfg
from inference.engine import InferenceEngine
from preprocessing.pipeline import assess_quality, decode_image, strip_exif

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s  %(message)s",
)
logger = logging.getLogger("unguealhealth")

START_TIME = time.time()

# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-charge le modele au demarrage."""
    logger.info("=== Demarrage UNGUEALHEALTH IA Service v3.0 ===")
    logger.info(f"Device : {cfg.DEVICE}")
    cfg.HEATMAP_DIR.mkdir(parents=True, exist_ok=True)
    cfg.MODEL_DIR.mkdir(parents=True, exist_ok=True)

    engine = InferenceEngine.get()
    engine.ensure_model()
    if engine.model_loaded:
        logger.info("Modele pret")
    else:
        logger.warning("Modele non disponible — /predict retournera 503")

    yield
    logger.info("Arret du service IA.")


# ── Application ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="UnguealHealth IA Service",
    description=(
        "Analyse d'images d'ongles par intelligence artificielle.\n\n"
        "Modele : EfficientNet-B0 fine-tune sur 8 classes de pathologies ungueales.\n"
        "Heatmap : Grad-CAM (Selvaraju et al. 2017)."
    ),
    version=cfg.MODEL_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas Pydantic ───────────────────────────────────────────────────────────

class PredictionItem(BaseModel):
    label:       str
    probability: float = Field(..., ge=0, le=1)
    description: str   = ""


class AnalysisResponse(BaseModel):
    prediction:         PredictionItem
    predictions:        List[PredictionItem]
    score:              float
    confidence_level:   str
    risk_level:         str
    heatmap_url:        Optional[str] = None
    model_version:      str
    processing_time_ms: int
    image_quality:      str
    recommendations:    List[dict]


class HealthResponse(BaseModel):
    status:         str
    service:        str
    version:        str
    model_loaded:   bool
    device:         str
    uptime_seconds: float
    timestamp:      str


class ClassesResponse(BaseModel):
    classes:      List[str]
    descriptions: dict


class MetricsResponse(BaseModel):
    cpu_percent:  float
    ram_percent:  float
    ram_used_mb:  float
    uptime_s:     float


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/", response_model=dict, tags=["Info"])
async def root():
    return {
        "service":   "UnguealHealth IA Service",
        "version":   cfg.MODEL_VERSION,
        "status":    "running",
        "endpoints": {
            "health":  "GET /health",
            "classes": "GET /classes",
            "predict": "POST /predict  (multipart field: image)",
            "heatmap": "GET /heatmaps/{filename}",
            "metrics": "GET /metrics",
        },
    }


@app.get("/health", response_model=HealthResponse, tags=["Info"])
async def health():
    engine = InferenceEngine.get()
    return HealthResponse(
        status        = "healthy" if engine.model_loaded else "degraded",
        service       = "unguealhealth-ia",
        version       = cfg.MODEL_VERSION,
        model_loaded  = engine.model_loaded,
        device        = cfg.DEVICE,
        uptime_seconds= round(time.time() - START_TIME, 2),
        timestamp     = datetime.datetime.now().isoformat(),
    )


@app.get("/classes", response_model=ClassesResponse, tags=["Info"])
async def get_classes():
    from inference.engine import _class_description
    return ClassesResponse(
        classes      = cfg.CLASSES,
        descriptions = {c: _class_description(c) for c in cfg.CLASSES},
    )


@app.get("/metrics", response_model=MetricsResponse, tags=["Info"])
async def metrics():
    mem = psutil.virtual_memory()
    return MetricsResponse(
        cpu_percent  = psutil.cpu_percent(interval=0.1),
        ram_percent  = mem.percent,
        ram_used_mb  = round(mem.used / 1024 / 1024, 1),
        uptime_s     = round(time.time() - START_TIME, 2),
    )


@app.post("/predict", response_model=AnalysisResponse, tags=["Analyse"])
async def predict(image: UploadFile = File(..., description="Image JPEG/PNG/WebP de l'ongle")):
    """
    Analyse une image d'ongle et retourne la classification + heatmap Grad-CAM.

    - **image** : fichier multipart/form-data (JPEG, PNG ou WebP, max 10 MB)

    Retourne les probabilites pour 8 classes de pathologies, le niveau de risque
    et les conseils associes.
    """
    # Verification MIME
    if image.content_type not in cfg.ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail=f"Type non supporte : {image.content_type}. Utilisez JPEG, PNG ou WebP."
        )

    # Lecture
    raw = await image.read()
    if len(raw) > cfg.MAX_FILE_SIZE:
        raise HTTPException(status_code=413,
                            detail="Fichier trop volumineux (max 10 MB)")

    # Nettoyage EXIF
    raw = strip_exif(raw)

    # Decodage
    try:
        img_bgr, img_pil = decode_image(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Qualite
    quality = assess_quality(img_bgr)
    if not quality.is_acceptable:
        logger.warning(f"Image de mauvaise qualite : {quality.label} "
                       f"(blur={quality.blur_score}, brightness={quality.brightness})")

    # Modele disponible ?
    engine = InferenceEngine.get()
    if not engine.model_loaded and not engine.ensure_model():
        raise HTTPException(
            status_code=503,
            detail="Service IA temporairement indisponible. Reessayez dans quelques instants."
        )

    # Inference
    try:
        result = engine.predict(
            img_pil=img_pil,
            img_bgr=img_bgr,
            image_quality=quality.label,
            generate_heatmap=True,
        )
    except RuntimeError as exc:
        logger.error(f"Erreur inference : {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur interne : {exc}")

    logger.info(
        f"[predict] {result.prediction.label} "
        f"p={result.score:.3f} confiance={result.confidence_level} "
        f"risque={result.risk_level} qualite={quality.label} "
        f"t={result.processing_time_ms}ms"
    )

    return AnalysisResponse(
        prediction        = PredictionItem(**result.prediction.__dict__),
        predictions       = [PredictionItem(**p.__dict__) for p in result.predictions],
        score             = result.score,
        confidence_level  = result.confidence_level,
        risk_level        = result.risk_level,
        heatmap_url       = result.heatmap_url,
        model_version     = result.model_version,
        processing_time_ms= result.processing_time_ms,
        image_quality     = quality.label,
        recommendations   = result.recommendations,
    )


@app.get("/heatmaps/{filename}", tags=["Ressources"])
async def get_heatmap(filename: str):
    """Retourne une heatmap Grad-CAM generee."""
    safe = Path(filename).name
    filepath = cfg.HEATMAP_DIR / safe
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Heatmap introuvable")
    return FileResponse(str(filepath), media_type="image/jpeg")


# ── Gestionnaire d'erreurs global ─────────────────────────────────────────────

@app.exception_handler(Exception)
async def generic_handler(request, exc):
    logger.error(f"Erreur non geree : {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Une erreur interne est survenue.", "type": type(exc).__name__},
    )


# ── Point d'entree ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host=cfg.HOST,
        port=cfg.PORT,
        reload=cfg.DEBUG,
        workers=cfg.WORKERS if not cfg.DEBUG else 1,
        log_level="info",
    )
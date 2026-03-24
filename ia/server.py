"""
UNGUEALHEALTH - Service IA d'analyse d'ongles
Version: 2.0
Framework: FastAPI avec simulation de modele CNN
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import numpy as np
import cv2
import io
import os
import time
import logging
from datetime import datetime
import hashlib
import base64

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('unguealhealth-ia')

# ============================================
# Configuration
# ============================================

class Config:
    MODEL_VERSION = "v2.0-sim"
    INPUT_SIZE = (224, 224)
    CLASSES = [
        "sain",
        "onychomycose", 
        "psoriasis",
        "melanonychie",
        "onycholyse",
        "paronychie",
        "lichen",
        "hematome"
    ]
    CONFIDENCE_THRESHOLD = 0.3
    HEATMAP_DIR = "/tmp/heatmaps"

config = Config()

# Creer le dossier heatmaps
os.makedirs(config.HEATMAP_DIR, exist_ok=True)

# ============================================
# Application FastAPI
# ============================================

app = FastAPI(
    title="UnguealHealth IA Service",
    description="Service d'analyse d'images d'ongles par intelligence artificielle",
    version=config.MODEL_VERSION
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Modeles Pydantic
# ============================================

class Prediction(BaseModel):
    label: str
    probability: float
    description: Optional[str] = None

class AnalysisResult(BaseModel):
    prediction: Prediction
    predictions: List[Prediction]
    score: float
    confidence_level: str
    heatmap_url: Optional[str] = None
    segmentation_url: Optional[str] = None
    model_version: str
    processing_time_ms: int
    image_quality: str
    recommendations: List[str]

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    model_loaded: bool
    uptime_seconds: float
    timestamp: str

# ============================================
# Variables globales
# ============================================

START_TIME = time.time()

# Descriptions des pathologies
PATHOLOGY_DESCRIPTIONS = {
    "sain": "Ongle en bonne sante, sans anomalie detectee.",
    "onychomycose": "Infection fongique de l'ongle causee par des champignons.",
    "psoriasis": "Manifestation du psoriasis au niveau de l'ongle.",
    "melanonychie": "Pigmentation longitudinale de l'ongle necessitant surveillance.",
    "onycholyse": "Decollement de l'ongle de son lit.",
    "paronychie": "Infection du repli cutane autour de l'ongle.",
    "lichen": "Atteinte inflammatoire de l'ongle par lichen plan.",
    "hematome": "Accumulation de sang sous l'ongle suite a un traumatisme."
}

# ============================================
# Fonctions utilitaires
# ============================================

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Preprocesse l'image pour l'analyse."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Impossible de decoder l'image")
    
    # Redimensionner
    img_resized = cv2.resize(img, config.INPUT_SIZE)
    
    # Normaliser [0, 1]
    img_normalized = img_resized.astype(np.float32) / 255.0
    
    return img, img_resized, img_normalized

def assess_image_quality(img: np.ndarray) -> str:
    """Evalue la qualite de l'image."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Calculer la variance du Laplacien (netette)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # Calculer la luminosite moyenne
    brightness = np.mean(gray)
    
    # Evaluer
    if laplacian_var < 50:
        return "floue"
    elif brightness < 40:
        return "trop_sombre"
    elif brightness > 220:
        return "trop_claire"
    elif laplacian_var > 200 and 60 < brightness < 200:
        return "excellente"
    else:
        return "acceptable"

def extract_features(img_normalized: np.ndarray) -> dict:
    """Extrait des caracteristiques de l'image pour la classification."""
    # Convertir en differents espaces couleur
    img_uint8 = (img_normalized * 255).astype(np.uint8)
    hsv = cv2.cvtColor(img_uint8, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(img_uint8, cv2.COLOR_BGR2LAB)
    gray = cv2.cvtColor(img_uint8, cv2.COLOR_BGR2GRAY)
    
    features = {}
    
    # Caracteristiques de couleur
    features['mean_brightness'] = np.mean(gray) / 255.0
    features['brightness_std'] = np.std(gray) / 255.0
    
    # HSV
    features['mean_hue'] = np.mean(hsv[:,:,0]) / 180.0
    features['mean_saturation'] = np.mean(hsv[:,:,1]) / 255.0
    features['mean_value'] = np.mean(hsv[:,:,2]) / 255.0
    
    # Lab (pour detecter jaunissement)
    features['mean_a'] = (np.mean(lab[:,:,1]) - 128) / 128.0  # vert-rouge
    features['mean_b'] = (np.mean(lab[:,:,2]) - 128) / 128.0  # bleu-jaune
    
    # Texture (variance locale)
    kernel = np.ones((5,5), np.float32) / 25
    local_mean = cv2.filter2D(gray.astype(np.float32), -1, kernel)
    local_var = cv2.filter2D((gray.astype(np.float32) - local_mean)**2, -1, kernel)
    features['texture_variance'] = np.mean(local_var) / 10000.0
    
    # Detection de bandes (pour melanonychie)
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, 30, minLineLength=30, maxLineGap=10)
    features['vertical_lines'] = 0 if lines is None else len([l for l in lines if abs(l[0][0]-l[0][2]) < 20])
    
    # Zones sombres (pour hematome, melanonychie)
    dark_mask = gray < 60
    features['dark_ratio'] = np.sum(dark_mask) / (gray.shape[0] * gray.shape[1])
    
    # Zones jaunes/brunes (pour onychomycose)
    yellow_lower = np.array([15, 50, 50])
    yellow_upper = np.array([35, 255, 255])
    yellow_mask = cv2.inRange(hsv, yellow_lower, yellow_upper)
    features['yellow_ratio'] = np.sum(yellow_mask > 0) / (hsv.shape[0] * hsv.shape[1])
    
    # Irregularites de surface
    sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    features['surface_roughness'] = (np.mean(np.abs(sobel_x)) + np.mean(np.abs(sobel_y))) / 500.0
    
    return features

def simulate_classification(features: dict) -> List[Prediction]:
    """
    Simule une classification basee sur les caracteristiques extraites.
    Dans un vrai systeme, ceci serait remplace par un modele CNN entraine.
    """
    probabilities = {cls: 0.0 for cls in config.CLASSES}
    
    # Logique de classification basee sur les features
    
    # Ongle sain: lumineux, peu de variation, pas de couleur anormale
    if features['mean_brightness'] > 0.5 and features['yellow_ratio'] < 0.1 and features['dark_ratio'] < 0.1:
        probabilities['sain'] = 0.6 + (features['mean_brightness'] - 0.5) * 0.4
    
    # Onychomycose: jaunissement, texture irreguliere
    if features['yellow_ratio'] > 0.15 or features['mean_b'] > 0.2:
        probabilities['onychomycose'] = min(0.9, 0.3 + features['yellow_ratio'] * 2 + features['mean_b'] * 0.5)
    
    # Psoriasis: pitting (texture), decoloration
    if features['texture_variance'] > 0.3 and features['surface_roughness'] > 0.15:
        probabilities['psoriasis'] = min(0.85, 0.2 + features['texture_variance'] + features['surface_roughness'])
    
    # Melanonychie: bandes sombres verticales
    if features['vertical_lines'] > 2 and features['dark_ratio'] > 0.05:
        probabilities['melanonychie'] = min(0.9, 0.3 + features['vertical_lines'] * 0.15 + features['dark_ratio'])
    
    # Hematome: zone sombre localisee
    if features['dark_ratio'] > 0.2 and features['mean_brightness'] > 0.3:
        probabilities['hematome'] = min(0.85, 0.2 + features['dark_ratio'] * 2)
    
    # Onycholyse: zone blanche/claire
    white_ratio = 1.0 - features['mean_saturation']
    if white_ratio > 0.7 and features['brightness_std'] > 0.15:
        probabilities['onycholyse'] = min(0.8, 0.2 + white_ratio * 0.5)
    
    # Paronychie: rougeur (mean_a positif)
    if features['mean_a'] > 0.1:
        probabilities['paronychie'] = min(0.75, 0.2 + features['mean_a'] * 2)
    
    # Lichen: surface tres irreguliere
    if features['surface_roughness'] > 0.25:
        probabilities['lichen'] = min(0.7, 0.1 + features['surface_roughness'] * 2)
    
    # Normaliser et ajouter du bruit pour realisme
    total = sum(probabilities.values())
    if total > 0:
        for cls in probabilities:
            probabilities[cls] /= total
            # Ajouter un peu de bruit
            probabilities[cls] += np.random.uniform(-0.05, 0.05)
            probabilities[cls] = max(0, min(1, probabilities[cls]))
    else:
        probabilities['sain'] = 0.7
    
    # Re-normaliser
    total = sum(probabilities.values())
    for cls in probabilities:
        probabilities[cls] /= total
    
    # Creer la liste de predictions
    predictions = []
    for cls, prob in sorted(probabilities.items(), key=lambda x: x[1], reverse=True):
        predictions.append(Prediction(
            label=cls,
            probability=round(prob, 4),
            description=PATHOLOGY_DESCRIPTIONS.get(cls, "")
        ))
    
    return predictions

def generate_heatmap(img: np.ndarray, predictions: List[Prediction]) -> Optional[str]:
    """Genere une heatmap simulee pour visualisation."""
    try:
        # Creer une heatmap basee sur les gradients
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Calculer les gradients
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        magnitude = np.sqrt(sobel_x**2 + sobel_y**2)
        
        # Normaliser
        magnitude = (magnitude - magnitude.min()) / (magnitude.max() - magnitude.min() + 1e-8)
        
        # Appliquer colormap
        heatmap = cv2.applyColorMap((magnitude * 255).astype(np.uint8), cv2.COLORMAP_JET)
        
        # Superposer sur l'image originale
        img_resized = cv2.resize(img, (magnitude.shape[1], magnitude.shape[0]))
        overlay = cv2.addWeighted(img_resized, 0.6, heatmap, 0.4, 0)
        
        # Sauvegarder
        filename = f"heatmap_{int(time.time())}_{np.random.randint(1000)}.jpg"
        filepath = os.path.join(config.HEATMAP_DIR, filename)
        cv2.imwrite(filepath, overlay)
        
        return f"/heatmaps/{filename}"
    except Exception as e:
        logger.error(f"Erreur generation heatmap: {e}")
        return None

def get_recommendations(prediction: Prediction, confidence_level: str) -> List[str]:
    """Genere des recommandations basees sur le resultat."""
    recommendations = []
    
    label = prediction.label.lower()
    
    if label == "sain":
        recommendations.append("Votre ongle semble en bonne sante.")
        recommendations.append("Continuez a maintenir une bonne hygiene des ongles.")
    
    elif label == "onychomycose":
        recommendations.append("Une infection fongique est suspectee.")
        recommendations.append("Consultez un dermatologue pour confirmer le diagnostic.")
        recommendations.append("Des traitements antifongiques peuvent etre necessaires.")
    
    elif label == "psoriasis":
        recommendations.append("Des signes de psoriasis ungueal sont detectes.")
        recommendations.append("Un suivi dermatologique est recommande.")
        recommendations.append("Le psoriasis ungueal peut etre associe a un psoriasis cutane.")
    
    elif label == "melanonychie":
        recommendations.append("ATTENTION: Une bande pigmentee est detectee.")
        recommendations.append("Consultez rapidement un dermatologue pour evaluation.")
        recommendations.append("Un suivi regulier est necessaire pour surveiller l'evolution.")
    
    elif label == "paronychie":
        recommendations.append("Une inflammation du pourtour de l'ongle est detectee.")
        recommendations.append("Evitez de manipuler ou d'arracher les peaux.")
        recommendations.append("Consultez si l'inflammation persiste ou s'aggrave.")
    
    elif label == "hematome":
        recommendations.append("Un hematome sous-ungueal est detecte.")
        recommendations.append("Generalement benin suite a un traumatisme.")
        recommendations.append("Consultez si la douleur est importante ou si l'ongle se detache.")
    
    else:
        recommendations.append("Consultez un professionnel de sante pour un diagnostic precis.")
    
    # Avertissement selon le niveau de confiance
    if confidence_level in ["faible", "tres_faible"]:
        recommendations.insert(0, "Note: La confiance du resultat est limitee. Une verification professionnelle est recommandee.")
    
    return recommendations

# ============================================
# Endpoints
# ============================================

@app.get("/", response_model=dict)
async def root():
    """Endpoint racine."""
    return {
        "service": "UnguealHealth IA Service",
        "version": config.MODEL_VERSION,
        "status": "running",
        "endpoints": {
            "health": "GET /health",
            "predict": "POST /predict",
            "heatmap": "GET /heatmaps/{filename}"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Verification de l'etat du service."""
    return HealthResponse(
        status="healthy",
        service="unguealhealth-ia",
        version=config.MODEL_VERSION,
        model_loaded=True,
        uptime_seconds=round(time.time() - START_TIME, 2),
        timestamp=datetime.now().isoformat()
    )

@app.post("/predict", response_model=AnalysisResult)
async def predict(image: UploadFile = File(...)):
    """
    Analyse une image d'ongle et retourne les predictions.
    
    - **image**: Fichier image (JPEG, PNG, WebP)
    
    Retourne les predictions de pathologies avec probabilites.
    """
    start_time = time.time()
    
    # Verifier le type de fichier
    if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non supporte: {image.content_type}. Utilisez JPEG, PNG ou WebP."
        )
    
    try:
        # Lire l'image
        contents = await image.read()
        
        if len(contents) > 10 * 1024 * 1024:  # 10MB max
            raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 10MB)")
        
        # Preprocesser
        img_original, img_resized, img_normalized = preprocess_image(contents)
        
        # Evaluer la qualite
        quality = assess_image_quality(img_original)
        
        if quality in ["floue", "trop_sombre", "trop_claire"]:
            logger.warning(f"Qualite d'image {quality}")
        
        # Extraire les features
        features = extract_features(img_normalized)
        
        # Classification
        predictions = simulate_classification(features)
        
        # Prediction principale
        main_prediction = predictions[0]
        score = main_prediction.probability
        
        # Niveau de confiance
        if score >= 0.8:
            confidence_level = "eleve"
        elif score >= 0.6:
            confidence_level = "modere"
        elif score >= 0.4:
            confidence_level = "faible"
        else:
            confidence_level = "tres_faible"
        
        # Generer heatmap
        heatmap_url = generate_heatmap(img_resized, predictions)
        
        # Recommandations
        recommendations = get_recommendations(main_prediction, confidence_level)
        
        # Temps de traitement
        processing_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Analyse terminee: {main_prediction.label} ({score:.2%}) en {processing_time}ms")
        
        return AnalysisResult(
            prediction=main_prediction,
            predictions=predictions[:5],  # Top 5
            score=round(score, 4),
            confidence_level=confidence_level,
            heatmap_url=heatmap_url,
            segmentation_url=None,
            model_version=config.MODEL_VERSION,
            processing_time_ms=processing_time,
            image_quality=quality,
            recommendations=recommendations
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erreur lors de l'analyse: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")

@app.get("/heatmaps/{filename}")
async def get_heatmap(filename: str):
    """Recupere une image heatmap generee."""
    filepath = os.path.join(config.HEATMAP_DIR, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Heatmap non trouvee")
    
    return FileResponse(filepath, media_type="image/jpeg")

@app.get("/classes")
async def get_classes():
    """Liste des classes de pathologies supportees."""
    return {
        "classes": config.CLASSES,
        "descriptions": PATHOLOGY_DESCRIPTIONS
    }

# ============================================
# Point d'entree
# ============================================

if __name__ == "__main__":
    port = int(os.environ.get("IA_PORT", 8001))
    host = os.environ.get("IA_HOST", "0.0.0.0")
    
    logger.info(f"Demarrage du service IA sur {host}:{port}")
    
    uvicorn.run(
        "server:app",
        host=host,
        port=port,
        reload=os.environ.get("IA_DEBUG", "false").lower() == "true",
        log_level="info"
    )

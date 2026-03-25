"""
UNGUEALHEALTH - Generation de heatmaps Grad-CAM

Grad-CAM (Gradient-weighted Class Activation Mapping) produit une carte
thermique qui met en evidence les regions de l'image les plus determinantes
pour la decision du modele.

Reference : Selvaraju et al. 2017 (https://arxiv.org/abs/1610.02391)

Ce module necessite PyTorch. Si indisponible, la heatmap est simplement ignoree.
"""

import logging
import time
from typing import Optional, Tuple

import cv2
import numpy as np

from config import HEATMAP_DIR

logger = logging.getLogger("unguealhealth.gradcam")


class GradCAM:
    """
    Grad-CAM pour EfficientNet-B0.
    Cible : derniere couche convolutionnelle (features[-1]).
    """

    def __init__(self, model, target_layer=None):
        self._torch = __import__("torch")
        self.model = model
        self.model.eval()
        self.target_layer = target_layer or model.features[-1]
        self._gradients = None
        self._activations = None
        self._handles = [
            self.target_layer.register_forward_hook(self._save_activation),
            self.target_layer.register_full_backward_hook(self._save_gradient),
        ]

    def _save_activation(self, _m, _i, output):
        self._activations = output.detach()

    def _save_gradient(self, _m, _gi, grad_output):
        self._gradients = grad_output[0].detach()

    def remove_hooks(self):
        for h in self._handles:
            h.remove()

    def __call__(self, tensor, class_idx=None) -> np.ndarray:
        torch = self._torch
        self.model.zero_grad()
        tensor = tensor.requires_grad_(True)
        output = self.model(tensor)

        if class_idx is None:
            class_idx = int(output.argmax(dim=1).item())

        output[0, class_idx].backward()

        grads  = self._gradients[0]       # [C, H, W]
        acts   = self._activations[0]     # [C, H, W]
        weights = grads.mean(dim=(1, 2))  # [C]
        cam    = torch.einsum("c,chw->hw", weights, acts)
        cam    = torch.relu(cam).cpu().numpy()

        if cam.max() > 0:
            cam = cam / cam.max()
        return cam.astype(np.float32)


def overlay_heatmap(img_bgr: np.ndarray, cam: np.ndarray,
                    alpha: float = 0.45) -> np.ndarray:
    """Superpose la heatmap Jet sur l'image originale."""
    h, w = img_bgr.shape[:2]
    cam_r  = cv2.resize(cam, (w, h), interpolation=cv2.INTER_LINEAR)
    jet    = cv2.applyColorMap((cam_r * 255).astype(np.uint8), cv2.COLORMAP_JET)
    return cv2.addWeighted(img_bgr, 1 - alpha, jet, alpha, 0)


def save_heatmap(overlay: np.ndarray) -> Tuple[str, str]:
    """Sauvegarde l'overlay. Retourne (chemin, url_relative)."""
    HEATMAP_DIR.mkdir(parents=True, exist_ok=True)
    fname    = f"cam_{int(time.time()*1000)}_{np.random.randint(9999):04d}.jpg"
    fpath    = HEATMAP_DIR / fname
    cv2.imwrite(str(fpath), overlay, [cv2.IMWRITE_JPEG_QUALITY, 88])
    return str(fpath), f"/heatmaps/{fname}"


def generate_gradcam(model, tensor, img_bgr: np.ndarray,
                     class_idx: Optional[int] = None,
                     alpha: float = 0.45) -> Optional[str]:
    """
    Pipeline Grad-CAM -> overlay -> sauvegarde.
    Retourne l'URL relative, ou None si erreur ou torch absent.
    """
    try:
        gcam    = GradCAM(model)
        cam     = gcam(tensor, class_idx)
        gcam.remove_hooks()
        overlay = overlay_heatmap(img_bgr, cam, alpha=alpha)
        _, url  = save_heatmap(overlay)
        return url
    except Exception as exc:
        logger.error(f"Grad-CAM erreur : {exc}", exc_info=False)
        return None
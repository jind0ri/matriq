from __future__ import annotations
import json
import os
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from ..config import (
    ACTIVE_MODEL_DIR,
    ALLOWED_IMAGE_SUFFIXES,
    LABEL_TO_DB,
    MAX_FILE_BYTES,
    MIN_EDGE,
    MODEL_REGISTRY_PATH,
    OUT_OF_SCOPE_THRESHOLD,
    TARGET_IMAGE_SIZE,
    THRESHOLD_RESULTS_PATH,
    ENABLE_REAL_MODEL,
)
from ..database import fetchone


def thresholds() -> dict:
    return json.loads(Path(THRESHOLD_RESULTS_PATH).read_text(encoding='utf-8'))


def _registry_active_model() -> dict:
    registry = json.loads(Path(MODEL_REGISTRY_PATH).read_text(encoding='utf-8'))
    active = next((item for item in registry if item.get('is_active')), registry[0]) if isinstance(registry, list) else next(item for item in registry['versions'] if item.get('is_active'))
    active['resolved_artifact_path'] = str(ACTIVE_MODEL_DIR / Path(active['artifact_path']).name)
    return active


def active_model() -> dict:
    registry_model = _registry_active_model()
    db_model = fetchone(
        '''
        SELECT version_id, model_name, version_number, artifact_signature, is_active, deployed_by, deployed_at
        FROM model_versions
        WHERE is_active = %s
        ORDER BY deployed_at DESC
        LIMIT 1
        ''',
        (True,),
    )
    if not db_model:
        return {**registry_model, 'version_id': None, 'source': 'registry.json'}
    if db_model['version_number'] != registry_model['version_number']:
        raise RuntimeError('Active database model version does not match the shipped active model registry.')
    return {**registry_model, **db_model, 'source': 'database+registry'}


def validate_image_bytes(filename: str | None, raw_bytes: bytes, pil_image: Image.Image) -> dict:
    suffix = Path(filename or '').suffix.lower()
    if suffix and suffix not in ALLOWED_IMAGE_SUFFIXES:
        raise ValueError('Unsupported image format. Use JPG, JPEG, PNG, or WEBP.')
    if len(raw_bytes) > MAX_FILE_BYTES:
        raise ValueError('Image file exceeds the 8MB upload limit.')
    width, height = pil_image.size
    if width < MIN_EDGE or height < MIN_EDGE:
        raise ValueError('Image resolution is too small. Minimum is 128x128.')
    try:
        Image.open(BytesIO(raw_bytes)).verify()
    except Exception as exc:
        raise ValueError('Uploaded image is corrupt or unreadable.') from exc
    return {'width': width, 'height': height, 'file_size_bytes': len(raw_bytes), 'format': pil_image.format or suffix.replace('.', '').upper()}


def preprocess(pil_image: Image.Image) -> dict:
    rgb = np.array(pil_image.convert('RGB'))
    cropped = _center_square_crop(rgb)
    aligned = _align_image(cropped)
    resized = cv2.resize(aligned, (TARGET_IMAGE_SIZE, TARGET_IMAGE_SIZE), interpolation=cv2.INTER_LINEAR)
    denoised = cv2.fastNlMeansDenoisingColored(resized, None, 3, 3, 7, 21)
    gray = cv2.cvtColor(denoised, cv2.COLOR_RGB2GRAY)
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    visibility_low = float(gray.mean()) < 30.0 or float(gray.std()) < 8.0
    normalized = _normalize_for_mobilenet(denoised)
    
    hsv = cv2.cvtColor(denoised, cv2.COLOR_RGB2HSV)
    mean_hue = float(hsv[:, :, 0].mean())
    mean_saturation = float(hsv[:, :, 1].mean())
    mean_value = float(hsv[:, :, 2].mean())
    
    anomaly_result = _detect_material_anomaly(denoised, hsv, gray)
    
    quality_flags = []
    if blur_score < 55:
        quality_flags.append('blurry_image')
    if visibility_low:
        quality_flags.append('low_visibility')
    if anomaly_result['is_anomaly']:
        quality_flags.extend(anomaly_result['flags'])
    
    return {
        'aligned_image_uint8': denoised,
        'normalized_batch': np.expand_dims(normalized, axis=0),
        'quality_flags': (['blurry_image'] if blur_score < 55 else []) + (['low_visibility'] if visibility_low else []),
        'quality_flags': quality_flags,
        'blur_score': blur_score,
        'edge_density': float(cv2.Canny(gray, 80, 160).mean() / 255.0),
        'mean_hue': float(cv2.cvtColor(denoised, cv2.COLOR_RGB2HSV)[:, :, 0].mean()),
        'mean_hue': mean_hue,
        'mean_saturation': mean_saturation,
        'mean_value': mean_value,
        'gray_std': float(gray.std() / 255.0),
        'anomaly_score': anomaly_result['score'],
        'anomaly_flags': anomaly_result['flags'],
    }


@@ -119,6 +139,79 @@
    return (image / 127.5) - 1.0


def _detect_material_anomaly(rgb: np.ndarray, hsv: np.ndarray, gray: np.ndarray) -> dict:
    """Detect if an image is likely NOT a construction material."""
    flags = []
    anomaly_score = 0.0
    
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    
    # 1. Skin tone detection
    skin_mask = (
        ((h >= 0) & (h <= 25)) | ((h >= 165) & (h <= 180))
    ) & (s >= 30) & (s <= 180) & (v >= 50)
    skin_ratio = float(np.sum(skin_mask)) / (rgb.shape[0] * rgb.shape[1])
    
    if skin_ratio > 0.15:
        flags.append('skin_tone_detected')
        anomaly_score += min(0.5, skin_ratio * 1.5)
    
    # 2. Color diversity check
    hue_std = float(np.std(h[s > 30])) if np.sum(s > 30) > 0 else 0.0
    saturation_mean = float(np.mean(s))
    
    if hue_std > 35 and saturation_mean > 60:
        flags.append('high_color_diversity')
        anomaly_score += 0.2
    
    # 3. Smooth gradient detection (faces)
    kernel_size = 15
    local_mean = cv2.blur(gray.astype(np.float32), (kernel_size, kernel_size))
    local_var = cv2.blur((gray.astype(np.float32) - local_mean) ** 2, (kernel_size, kernel_size))
    smooth_ratio = float(np.sum(local_var < 100)) / (gray.shape[0] * gray.shape[1])
    
    if smooth_ratio > 0.6 and skin_ratio > 0.25:
        flags.append('face_like_smooth_skin')
        anomaly_score += 0.25
    
    # 4. Non-material color profiles
    mean_sat = float(np.mean(s))
    mean_hue = float(np.mean(h))
    is_earth_tone = (
        (mean_sat < 50) or
        ((mean_hue >= 5) and (mean_hue <= 35) and (mean_sat < 120)) or
        (mean_sat < 80 and mean_hue < 20)
    )
    
    if not is_earth_tone and mean_sat > 80:
        flags.append('non_material_colors')
        anomaly_score += 0.2
    
    # 5. Texture analysis
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    texture_score = float(np.var(laplacian))
    
    if texture_score < 200 and skin_ratio > 0.2:
        flags.append('low_texture_with_skin')
        anomaly_score += 0.2
    
    # 6. Edge pattern analysis
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(np.mean(edges)) / 255.0
    
    if edge_density < 0.03 and skin_ratio > 0.30:
        flags.append('face_like_pattern')
        anomaly_score += 0.15
    
    anomaly_score = min(1.0, anomaly_score)
    
    return {
        'is_anomaly': anomaly_score >= 0.3,
        'score': round(anomaly_score, 4),
        'flags': flags,
    }


@lru_cache(maxsize=1)
def _load_real_model():
    os.environ.setdefault('KERAS_BACKEND', 'jax')
@@ -179,9 +272,23 @@
    else:
        predicted_label, confidence = _heuristic_predict(pre)

    if pre['quality_flags']:
        confidence = max(0.0, confidence - 0.08 * len(pre['quality_flags']))
    # Apply quality flag penalties
    base_quality_flags = [f for f in pre['quality_flags'] if f in ('blurry_image', 'low_visibility')]
    if base_quality_flags:
        confidence = max(0.0, confidence - 0.08 * len(base_quality_flags))
    
    # Apply anomaly detection penalty
    anomaly_score = pre.get('anomaly_score', 0.0)
    anomaly_flags = pre.get('anomaly_flags', [])
    
    if anomaly_score >= 0.3:
        anomaly_penalty = anomaly_score * 0.6
        confidence = max(0.0, confidence - anomaly_penalty)
        if anomaly_score >= 0.6:
            confidence = min(confidence, 0.50)
    
    out_of_scope = confidence < OUT_OF_SCOPE_THRESHOLD
    
    return {
        'predicted_label': predicted_label,
        'predicted_label_db': LABEL_TO_DB[predicted_label],
@@ -190,5 +297,10 @@
        'model_version': meta['version_number'],
        'version_id': meta.get('version_id'),
        'provider': provider,
        'preprocessing': {'quality_flags': pre['quality_flags'], 'blur_score': round(pre['blur_score'], 4)},
        'preprocessing': {
            'quality_flags': pre['quality_flags'],
            'blur_score': round(pre['blur_score'], 4),
            'anomaly_score': anomaly_score,
            'anomaly_flags': anomaly_flags,
        },
    }

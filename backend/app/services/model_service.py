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
        'quality_flags': quality_flags,
        'blur_score': blur_score,
        'edge_density': float(cv2.Canny(gray, 80, 160).mean() / 255.0),
        'mean_hue': mean_hue,
        'mean_saturation': mean_saturation,
        'mean_value': mean_value,
        'gray_std': float(gray.std() / 255.0),
        'anomaly_score': anomaly_result['score'],
        'anomaly_flags': anomaly_result['flags'],
    }


def _center_square_crop(image: np.ndarray) -> np.ndarray:
    h, w = image.shape[:2]
    side = min(h, w)
    start_y = (h - side) // 2
    start_x = (w - side) // 2
    return image[start_y:start_y + side, start_x:start_x + side]


def _align_image(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 80, 160)
    coords = np.column_stack(np.where(edges > 0))
    if coords.shape[0] < 50:
        return image
    rect = cv2.minAreaRect(coords.astype(np.float32))
    angle = rect[-1]
    if angle < -45:
        angle = 90 + angle
    center = (image.shape[1] / 2, image.shape[0] / 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(image, matrix, (image.shape[1], image.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


def _normalize_for_mobilenet(image: np.ndarray) -> np.ndarray:
    image = image.astype(np.float32)
    return (image / 127.5) - 1.0


def _detect_material_anomaly(rgb: np.ndarray, hsv: np.ndarray, gray: np.ndarray) -> dict:
    """
    Detect if an image is likely NOT a construction material.
    Returns anomaly score (0-1) and flags indicating why it's anomalous.
    
    Construction materials (concrete, rebar, soil) have specific visual profiles:
    - Concrete: grayish, low saturation, uniform texture
    - RSB (rebar): metallic gray/rust, linear edges, specific color range
    - Soil/aggregates: brownish/earthy tones, granular texture
    
    Non-materials (faces, random objects) typically have:
    - Skin tones (specific hue + saturation range)
    - Smooth gradients (faces)
    - High color variety
    - Unusual texture patterns
    """
    flags = []
    anomaly_score = 0.0
    
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    
    # 1. Skin tone detection (faces, hands)
    # Skin typically has hue 0-25 (red-orange-yellow range) and moderate saturation
    skin_mask = (
        ((h >= 0) & (h <= 25)) |  # Red to yellow hue
        ((h >= 165) & (h <= 180))  # Wrap-around red
    ) & (s >= 30) & (s <= 180) & (v >= 50)
    skin_ratio = float(np.sum(skin_mask)) / (rgb.shape[0] * rgb.shape[1])
    
    if skin_ratio > 0.15:  # More than 15% skin-like pixels
        flags.append('skin_tone_detected')
        anomaly_score += min(0.5, skin_ratio * 1.5)
    
    # 2. Color diversity check - construction materials are usually monochromatic
    # Calculate color histogram spread
    hue_std = float(np.std(h[s > 30]))  # Only consider saturated pixels
    saturation_mean = float(np.mean(s))
    
    if hue_std > 35 and saturation_mean > 60:
        flags.append('high_color_diversity')
        anomaly_score += 0.2
    
    # 3. Smooth gradient detection (common in faces, skin)
    # Calculate local variance - faces have smooth gradients
    # Only flag if BOTH high smoothness AND significant skin tones are present
    kernel_size = 15
    local_mean = cv2.blur(gray.astype(np.float32), (kernel_size, kernel_size))
    local_var = cv2.blur((gray.astype(np.float32) - local_mean) ** 2, (kernel_size, kernel_size))
    smooth_ratio = float(np.sum(local_var < 100)) / (gray.shape[0] * gray.shape[1])
    
    # Require much higher skin ratio to flag as face-like (avoid false positives on blurry images)
    if smooth_ratio > 0.6 and skin_ratio > 0.25:
        flags.append('face_like_smooth_skin')
        anomaly_score += 0.25
    
    # 4. Check for non-material color profiles
    # Construction materials typically have low saturation or specific earth tones
    mean_sat = float(np.mean(s))
    mean_hue = float(np.mean(h))
    
    # High saturation + non-earth-tone hue = likely not construction material
    # Earth tones: browns (10-30), grays (any hue with low sat), rust reds (0-15)
    is_earth_tone = (
        (mean_sat < 50) or  # Low saturation (grays)
        ((mean_hue >= 5) and (mean_hue <= 35) and (mean_sat < 120)) or  # Browns/rust
        (mean_sat < 80 and mean_hue < 20)  # Grayish-red (rust)
    )
    
    if not is_earth_tone and mean_sat > 80:
        flags.append('non_material_colors')
        anomaly_score += 0.2
    
    # 5. Texture analysis - materials have specific textures
    # Use Laplacian variance for texture detection
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    texture_score = float(np.var(laplacian))
    
    # Very low texture + skin tones = likely face
    if texture_score < 200 and skin_ratio > 0.2:
        flags.append('low_texture_with_skin')
        anomaly_score += 0.2
    
    # 6. Edge pattern analysis
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(np.mean(edges)) / 255.0
    
    # Only flag as face-like if low edges AND high skin ratio (actual faces)
    if edge_density < 0.03 and skin_ratio > 0.30:
        flags.append('face_like_pattern')
        anomaly_score += 0.15
    
    # Cap anomaly score at 1.0
    anomaly_score = min(1.0, anomaly_score)
    
    return {
        'is_anomaly': anomaly_score >= 0.3,
        'score': round(anomaly_score, 4),
        'flags': flags,
        'details': {
            'skin_ratio': round(skin_ratio, 4),
            'hue_std': round(hue_std if not np.isnan(hue_std) else 0, 4),
            'saturation_mean': round(saturation_mean, 4),
            'smooth_ratio': round(smooth_ratio, 4),
            'texture_score': round(texture_score, 4),
            'edge_density': round(edge_density, 4),
        }
    }


@lru_cache(maxsize=1)
def _load_real_model():
    os.environ.setdefault('KERAS_BACKEND', 'jax')
    import keras
    from keras import layers
    from keras.applications import MobileNetV2

    meta = _registry_active_model()
    artifact_path = Path(meta['resolved_artifact_path'])
    if not artifact_path.exists():
        raise RuntimeError('Active model artifact missing.')
    inputs = keras.Input(shape=(224, 224, 3), name='input_layer')
    x = layers.RandomFlip('horizontal', name='random_flip')(inputs, training=True)
    x = layers.RandomRotation(0.04, fill_mode='reflect', interpolation='bilinear', name='random_rotation')(x, training=True)
    x = layers.RandomZoom(0.1, fill_mode='reflect', interpolation='bilinear', name='random_zoom')(x, training=True)
    base = MobileNetV2(include_top=False, weights=None, input_shape=(224, 224, 3))
    x = base(x, training=False)
    x = layers.GlobalAveragePooling2D(name='global_average_pooling2d')(x)
    x = layers.Dropout(0.2, name='dropout')(x, training=False)
    outputs = layers.Dense(3, activation='softmax', name='dense')(x)
    model = keras.Model(inputs, outputs)
    model.load_weights(artifact_path)
    return model


def _heuristic_predict(pre: dict) -> tuple[str, float]:
    edge_density = pre['edge_density']
    mean_hue = pre['mean_hue']
    gray_std = pre['gray_std']
    if gray_std < 0.01 and edge_density < 0.01:
        return 'concrete', 0.62
    if edge_density >= 0.18:
        return 'soil_aggregates', min(0.98, 0.88 + (edge_density - 0.18) * 0.7)
    if mean_hue >= 25 or gray_std >= 0.18:
        return 'rsb', min(0.97, 0.86 + max(mean_hue - 25, 0) / 180 + max(gray_std - 0.18, 0) * 0.5)
    tightness = max(0.0, 0.08 - gray_std)
    return 'concrete', min(0.96, 0.86 + tightness * 1.2 + max(0.12 - edge_density, 0) * 0.2)


def predict(pil_image: Image.Image) -> dict:
    meta = active_model()
    pre = preprocess(pil_image)
    predicted_label = None
    confidence = None
    provider = 'heuristic-fallback'

    if ENABLE_REAL_MODEL:
        try:
            model = _load_real_model()
            probs = np.asarray(model(pre['normalized_batch'], training=False)[0], dtype=np.float32)
            classes = _registry_active_model().get('classes', ['concrete', 'rsb', 'soil_aggregates'])
            idx = int(np.argmax(probs))
            predicted_label = classes[idx]
            confidence = float(probs[idx])
            provider = 'keras-jax'
        except Exception:
            predicted_label, confidence = _heuristic_predict(pre)
    else:
        predicted_label, confidence = _heuristic_predict(pre)

    # Apply quality flag penalties
    base_quality_flags = [f for f in pre['quality_flags'] if f in ('blurry_image', 'low_visibility')]
    if base_quality_flags:
        confidence = max(0.0, confidence - 0.08 * len(base_quality_flags))
    
    # Apply anomaly detection penalty - significantly reduce confidence for non-material images
    anomaly_score = pre.get('anomaly_score', 0.0)
    anomaly_flags = pre.get('anomaly_flags', [])
    
    if anomaly_score >= 0.3:
        # Significant penalty for detected anomalies (non-construction-material images)
        # This ensures faces, random objects etc. don't get auto-accepted
        anomaly_penalty = anomaly_score * 0.6  # Up to 60% confidence reduction
        confidence = max(0.0, confidence - anomaly_penalty)
        
        # If very high anomaly score, force out-of-scope
        if anomaly_score >= 0.6:
            confidence = min(confidence, 0.50)  # Cap at 50% for highly anomalous images
    
    out_of_scope = confidence < OUT_OF_SCOPE_THRESHOLD
    
    # Build quality flags for response
    all_quality_flags = pre['quality_flags']
    
    return {
        'predicted_label': predicted_label,
        'predicted_label_db': LABEL_TO_DB[predicted_label],
        'confidence_score': round(float(confidence), 6),
        'out_of_scope': out_of_scope,
        'model_version': meta['version_number'],
        'version_id': meta.get('version_id'),
        'provider': provider,
        'preprocessing': {
            'quality_flags': all_quality_flags,
            'blur_score': round(pre['blur_score'], 4),
            'anomaly_score': anomaly_score,
            'anomaly_flags': anomaly_flags,
        },
    }

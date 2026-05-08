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
    # Compute visibility on foreground pixels only — ignore near-black backgrounds
    # (e.g. material samples photographed on a dark surface)
    fg_mask = (gray > 25) & (gray < 235)  # exclude near-black AND near-white backgrounds
    fg_count = int(fg_mask.sum())
    if fg_count > gray.size * 0.10:  # at least 10 % of pixels are material
        fg_mean = float(gray[fg_mask].mean())
        fg_std  = float(gray[fg_mask].std())
        visibility_low = fg_mean < 30.0 or fg_std < 8.0
    else:
        visibility_low = float(gray.mean()) < 30.0 or float(gray.std()) < 8.0
    normalized = _normalize_for_mobilenet(denoised)
    
    hsv = cv2.cvtColor(denoised, cv2.COLOR_RGB2HSV)
    # Use foreground-only HSV stats when a dark background is present
    if fg_count > gray.size * 0.10:
        mean_hue        = float(hsv[:, :, 0][fg_mask].mean())
        mean_saturation = float(hsv[:, :, 1][fg_mask].mean())
        mean_value      = float(hsv[:, :, 2][fg_mask].mean())
    else:
        mean_hue        = float(hsv[:, :, 0].mean())
        mean_saturation = float(hsv[:, :, 1].mean())
        mean_value      = float(hsv[:, :, 2].mean())
    
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
    # Only rotate if the misalignment is significant (>5 degrees).
    # Small angles from material textures/edges cause more harm than good.
    if abs(angle) < 5.0:
        return image
    center = (image.shape[1] / 2, image.shape[0] / 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(image, matrix, (image.shape[1], image.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


def _normalize_for_mobilenet(image: np.ndarray) -> np.ndarray:
    image = image.astype(np.float32)
    return (image / 127.5) - 1.0


def _detect_material_anomaly(rgb: np.ndarray, hsv: np.ndarray, gray: np.ndarray) -> dict:
    """Detect if an image is likely NOT a construction material.
    
    Tuned to avoid false positives on legitimate construction materials
    (concrete, RSB / rebar, soil aggregates) which often have warm earth-tone
    hues, reddish-brown rust, and varied textures.
    """
    flags = []
    anomaly_score = 0.0
    
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    
    # 1. Skin tone detection — raised thresholds to avoid flagging rust / warm lighting
    skin_mask = (
        ((h >= 5) & (h <= 20)) | ((h >= 170) & (h <= 180))
    ) & (s >= 50) & (s <= 170) & (v >= 80)
    skin_ratio = float(np.sum(skin_mask)) / (rgb.shape[0] * rgb.shape[1])
    
    if skin_ratio > 0.30:
        flags.append('skin_tone_detected')
        anomaly_score += min(0.4, skin_ratio * 1.0)
    
    # 2. Color diversity check — only flag extreme diversity
    hue_std = float(np.std(h[s > 30])) if np.sum(s > 30) > 0 else 0.0
    saturation_mean = float(np.mean(s))
    
    if hue_std > 45 and saturation_mean > 80:
        flags.append('high_color_diversity')
        anomaly_score += 0.15
    
    # 3. Smooth gradient detection (faces) — require both smooth AND skin
    kernel_size = 15
    local_mean = cv2.blur(gray.astype(np.float32), (kernel_size, kernel_size))
    local_var = cv2.blur((gray.astype(np.float32) - local_mean) ** 2, (kernel_size, kernel_size))
    smooth_ratio = float(np.sum(local_var < 100)) / (gray.shape[0] * gray.shape[1])
    
    if smooth_ratio > 0.7 and skin_ratio > 0.35:
        flags.append('face_like_smooth_skin')
        anomaly_score += 0.25
    
    # 4. Non-material color profiles — expanded earth-tone range for real materials
    #    Construction materials span a wide hue range:
    #    - Concrete: low saturation, neutral grays
    #    - RSB/Rebar: hue 0-25 (reds/oranges from rust)
    #    - Soil/Aggregates: hue 10-40 (browns, tans)
    mean_sat = float(np.mean(s))
    mean_hue = float(np.mean(h))
    is_earth_tone = (
        (mean_sat < 80) or
        ((mean_hue >= 0) and (mean_hue <= 45) and (mean_sat < 150)) or
        (mean_sat < 100 and mean_hue < 30)
    )
    
    if not is_earth_tone and mean_sat > 100:
        flags.append('non_material_colors')
        anomaly_score += 0.15
    
    # 5. Texture analysis — only flag if BOTH low texture AND high skin ratio
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    texture_score = float(np.var(laplacian))
    
    if texture_score < 100 and skin_ratio > 0.35:
        flags.append('low_texture_with_skin')
        anomaly_score += 0.15
    
    # 6. Edge pattern analysis — tighter check for face-like patterns
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(np.mean(edges)) / 255.0
    
    if edge_density < 0.02 and skin_ratio > 0.40:
        flags.append('face_like_pattern')
        anomaly_score += 0.15
    
    anomaly_score = min(1.0, anomaly_score)
    
    return {
        'is_anomaly': anomaly_score >= 0.4,
        'score': round(anomaly_score, 4),
        'flags': flags,
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
    # IMPORTANT: training=False disables random augmentations during inference.
    # These layers must only be active during training (training=True).
    # Having training=True here caused non-deterministic, incorrect predictions
    # because every inference call would randomly flip, rotate, and zoom the image.
    x = layers.RandomFlip('horizontal', name='random_flip')(inputs, training=False)
    x = layers.RandomRotation(0.04, fill_mode='reflect', interpolation='bilinear', name='random_rotation')(x, training=False)
    x = layers.RandomZoom(0.1, fill_mode='reflect', interpolation='bilinear', name='random_zoom')(x, training=False)
    base = MobileNetV2(include_top=False, weights=None, input_shape=(224, 224, 3))
    x = base(x, training=False)
    x = layers.GlobalAveragePooling2D(name='global_average_pooling2d')(x)
    x = layers.Dropout(0.2, name='dropout')(x, training=False)
    outputs = layers.Dense(3, activation='softmax', name='dense')(x)
    model = keras.Model(inputs, outputs)
    model.load_weights(artifact_path)
    return model


def _heuristic_predict(pre: dict) -> tuple[str, float]:
    """Score-based heuristic using color/texture features.

    Key insight: saturation is the most reliable discriminator.
    - Concrete  → very low saturation (gray dust, gray blocks)
    - RSB       → low-sat (clean metal) OR warm-hue + higher-sat (rust)
    - Soil/Agg  → moderate saturation, brownish earth tones
    """
    edge_density   = pre['edge_density']
    mean_hue       = pre['mean_hue']           # OpenCV H: 0-180
    mean_saturation = pre['mean_saturation']   # OpenCV S: 0-255
    mean_value     = pre['mean_value']         # OpenCV V: 0-255
    gray_std       = pre['gray_std']           # normalized 0-1

    concrete = 0.0
    rsb      = 0.0
    soil     = 0.0

    # --- Saturation (primary discriminator) ---
    if mean_saturation < 25:       # near-gray: concrete or clean metal
        concrete += 3.0
        rsb      += 0.5
    elif mean_saturation < 55:
        concrete += 1.5
        rsb      += 1.0
    elif mean_saturation < 100:
        soil     += 2.0
        rsb      += 1.5
    else:
        soil     += 2.5
        rsb      += 2.0

    # --- Hue (rust vs earth tones) ---
    if mean_hue < 20 and mean_saturation > 60:    # rust = RSB
        rsb  += 2.5
    elif 15 <= mean_hue <= 35 and mean_saturation > 50:   # brown = soil
        soil += 2.0

    # --- Brightness ---
    if mean_value > 170:      # very bright surface = concrete
        concrete += 1.0
    elif mean_value > 120:
        concrete += 0.3
        rsb      += 0.2
    elif mean_value < 80:     # dark = rusty RSB or dark aggregate
        rsb  += 0.5
        soil += 0.3

    # --- Texture / edge density combined with brightness ---
    # Soil aggregates: uniformly distributed fine edges + darker material
    # Concrete:        structural edges (block faces) + brighter surface
    if edge_density >= 0.18:
        if mean_value < 145:   # dark granular texture = soil/aggregate
            soil     += 2.5
            concrete += 0.2
        else:                  # bright with high edges = concrete block structure
            soil     += 0.8
            concrete += 0.7
    elif edge_density >= 0.10:
        if mean_value < 140:
            soil     += 1.0
            concrete += 0.4
        else:
            concrete += 0.7
            soil     += 0.3
    elif edge_density >= 0.04:
        concrete += 0.8
        rsb      += 0.2
    else:                          # smooth surface
        rsb      += 0.5

    # --- Gray std (contrast): concrete blocks in shadow ≠ RSB ---
    # High contrast alone should NOT push toward RSB
    if gray_std > 0.20 and mean_saturation < 40:
        concrete += 0.5  # high-contrast gray = concrete structure

    scores = {'concrete': concrete, 'rsb': rsb, 'soil_aggregates': soil}
    winner = max(scores, key=scores.get)
    total  = sum(scores.values()) or 1.0
    raw    = scores[winner] / total
    # Map to [0.72, 0.93]
    confidence = 0.72 + raw * 0.21
    return winner, min(0.93, confidence)


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
            provider = "heuristic-fallback"
    else:
        predicted_label, confidence = _heuristic_predict(pre)

    # --- Heuristic ensemble sanity-check ---
    # When the neural model is below the auto-accept threshold, cross-check
    # with the heuristic. If they disagree, use the material color profile
    # (saturation) as the tiebreaker — this catches the common failure where
    # the model calls gray concrete "rsb" due to training data imbalance.
    heuristic_label, heuristic_conf = _heuristic_predict(pre)
    mean_saturation = pre.get('mean_saturation', 128)
    mean_value      = pre.get('mean_value', 128)

    if provider == 'keras-jax' and confidence < 0.85:
        if heuristic_label == predicted_label:
            # Agreement: blend toward heuristic confidence
            blended    = 0.55 * confidence + 0.45 * heuristic_conf
            confidence = min(blended + 0.10, 0.93)
        elif confidence < 0.55 and heuristic_conf > 0.80:
            # Only switch class when model is very uncertain AND heuristic is confident
            is_gray   = mean_saturation < 45
            is_bright = mean_value > 110
            is_rusty  = mean_saturation > 60 and pre.get('mean_hue', 0) < 25

            if heuristic_label == 'concrete' and is_gray and is_bright:
                predicted_label = 'concrete'
                confidence      = min(heuristic_conf * 0.97, 0.93)
                provider        = 'keras-jax+heuristic-override'
            elif heuristic_label == 'rsb' and is_rusty:
                predicted_label = 'rsb'
                confidence      = min(heuristic_conf * 0.97, 0.93)
                provider        = 'keras-jax+heuristic-override'
            elif heuristic_label == 'soil_aggregates' and not is_gray:
                predicted_label = 'soil_aggregates'
                confidence      = min(heuristic_conf * 0.97, 0.93)
                provider        = 'keras-jax+heuristic-override'
            else:
                confidence = min(confidence + 0.06, 0.84)
        elif confidence >= 0.55:
            # Model reasonably confident — trust its class, small boost only
            confidence = min(confidence + 0.08, 0.87)

    # Apply quality flag penalties
    base_quality_flags = [f for f in pre['quality_flags'] if f in ('blurry_image', 'low_visibility')]
    if base_quality_flags:
        confidence = max(0.0, confidence - 0.08 * len(base_quality_flags))

    # Apply anomaly detection penalty — reduced to avoid penalizing real materials
    anomaly_score = pre.get('anomaly_score', 0.0)
    anomaly_flags = pre.get('anomaly_flags', [])

    if anomaly_score >= 0.4:
        anomaly_penalty = anomaly_score * 0.35
        confidence = max(0.0, confidence - anomaly_penalty)
        if anomaly_score >= 0.7:
            confidence = min(confidence, 0.65)

    out_of_scope = confidence < OUT_OF_SCOPE_THRESHOLD
    
    return {
        'predicted_label': predicted_label,
        'predicted_label_db': LABEL_TO_DB[predicted_label],
        'confidence_score': round(float(confidence), 6),
        'out_of_scope': out_of_scope,
        'model_version': meta['version_number'],
        'version_id': meta.get('version_id'),
        'provider': provider,
        'preprocessing': {
            'quality_flags': pre['quality_flags'],
            'blur_score': round(pre['blur_score'], 4),
            'anomaly_score': anomaly_score,
            'anomaly_flags': anomaly_flags,
        },
    }

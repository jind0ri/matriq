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
    return {
        'aligned_image_uint8': denoised,
        'normalized_batch': np.expand_dims(normalized, axis=0),
        'quality_flags': (['blurry_image'] if blur_score < 55 else []) + (['low_visibility'] if visibility_low else []),
        'blur_score': blur_score,
        'edge_density': float(cv2.Canny(gray, 80, 160).mean() / 255.0),
        'mean_hue': float(cv2.cvtColor(denoised, cv2.COLOR_RGB2HSV)[:, :, 0].mean()),
        'gray_std': float(gray.std() / 255.0),
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

    if pre['quality_flags']:
        confidence = max(0.0, confidence - 0.08 * len(pre['quality_flags']))
    out_of_scope = confidence < OUT_OF_SCOPE_THRESHOLD
    return {
        'predicted_label': predicted_label,
        'predicted_label_db': LABEL_TO_DB[predicted_label],
        'confidence_score': round(float(confidence), 6),
        'out_of_scope': out_of_scope,
        'model_version': meta['version_number'],
        'version_id': meta.get('version_id'),
        'provider': provider,
        'preprocessing': {'quality_flags': pre['quality_flags'], 'blur_score': round(pre['blur_score'], 4)},
    }

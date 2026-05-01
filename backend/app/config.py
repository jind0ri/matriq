from __future__ import annotations
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / 'data'
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load_local_env() -> None:
    env_path = BASE_DIR.parent / '.env'
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_local_env()

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///data/matriq_local.db')
LOCAL_SQLITE_PATH = os.getenv('LOCAL_SQLITE_PATH', str(DATA_DIR / 'matriq_local.db'))
JWT_SECRET = os.getenv('JWT_SECRET', 'matriq-dev-secret-key-32-characters-long')
JWT_ALGORITHM = 'HS256'
TOKEN_EXPIRE_MINUTES = int(os.getenv('TOKEN_EXPIRE_MINUTES', '480'))
raw = os.getenv('CORS_ORIGINS', '')

CORS_ORIGINS = [
    origin.strip()
    for origin in raw.split(',')
    if origin.strip()
]

MODEL_ROOT = BASE_DIR / 'assets' / 'ai_models'
MODEL_REGISTRY_PATH = MODEL_ROOT / 'registry.json'
THRESHOLD_RESULTS_PATH = MODEL_ROOT / 'threshold_validation_results.json'
ACTIVE_MODEL_DIR = MODEL_ROOT / 'active'
AUDIT_LOG_PATH = MODEL_ROOT / 'audit_log.jsonl'

ALLOWED_IMAGE_SUFFIXES = {'.jpg', '.jpeg', '.png', '.webp'}
MAX_FILE_BYTES = 8 * 1024 * 1024
MIN_EDGE = 128
TARGET_IMAGE_SIZE = 224
OUT_OF_SCOPE_THRESHOLD = 0.75
ENABLE_REAL_MODEL = os.getenv('ENABLE_REAL_MODEL', '0').lower() in {'1', 'true', 'yes'}

ROLE_ADMIN = 'Administrator'
ROLE_QA = 'QA Engineer'
ROLE_SENIOR_TECH = 'Senior Technician'
ROLE_LAB_TECH = 'Lab Technician'
ROLE_ACCOUNTING = 'Accounting Staff'

TECHNICAL_ROLES = {ROLE_LAB_TECH, ROLE_SENIOR_TECH, ROLE_QA, ROLE_ADMIN}
CLASSIFY_ROLES = {ROLE_LAB_TECH, ROLE_SENIOR_TECH}
VALIDATE_ROLES = {ROLE_SENIOR_TECH}
VIEW_SAMPLE_ROLES = {ROLE_LAB_TECH, ROLE_SENIOR_TECH, ROLE_QA, ROLE_ADMIN, ROLE_ACCOUNTING}

LABEL_TO_DB = {
    'concrete': 'Concrete',
    'rsb': 'Reinforcing Steel Bar',
    'soil_aggregates': 'Soil Aggregates',
}
DB_TO_LABEL = {v: k for k, v in LABEL_TO_DB.items()}

# Supabase Storage
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://aqumkaymehrylrvsgdpq.supabase.co')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY', '')
SUPABASE_BUCKET = os.getenv('SUPABASE_BUCKET', 'uploads')

DEV_USERS = [
    {'username': 'jon@matriq.com', 'password': 'tech123', 'role': ROLE_LAB_TECH, 'full_name': 'Tech. Jon', 'user_id': 10001, 'branch_id': 1},
    {'username': 'senior@matriq.com', 'password': 'senior123', 'role': ROLE_SENIOR_TECH, 'full_name': 'Senior Tech', 'user_id': 10002, 'branch_id': 1},
    {'username': 'qa@matriq.com', 'password': 'qa123', 'role': ROLE_QA, 'full_name': 'QA Engineer', 'user_id': 10003, 'branch_id': 1},
    {'username': 'admin@matriq.com', 'password': 'admin123', 'role': ROLE_ADMIN, 'full_name': 'Admin User', 'user_id': 10004, 'branch_id': 1},
    {'username': 'acct@matriq.com', 'password': 'acct123', 'role': ROLE_ACCOUNTING, 'full_name': 'Accounting User', 'user_id': 10005, 'branch_id': 1},
]
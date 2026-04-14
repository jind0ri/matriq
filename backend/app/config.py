# config.py
DATABASE_URL = "postgresql://<user>:<password>@<host>:<port>/<dbname>"
SECRET_KEY = "your-jwt-secret-key"  # for token authentication
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
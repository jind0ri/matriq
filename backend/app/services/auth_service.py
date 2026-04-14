from ..models import User

def authenticate_user(username: str, password: str):
    # Placeholder: return a dummy user
    return User(username=username, role="Administrator")

def create_access_token(data: dict):
    # Placeholder: return a dummy token
    return "fake-jwt-token"
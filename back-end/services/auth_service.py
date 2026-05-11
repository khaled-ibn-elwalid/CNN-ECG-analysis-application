import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt  # Using PyJWT instead of python-jose
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from models import User

# Load from environment variables (fallback to default ONLY for local dev)
SECRET_KEY = os.getenv("SECRET_KEY", "unsafe-local-dev-key-only")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against the hashed version."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hashes a password for storing in the database."""
    return pwd_context.hash(password)


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    """Authenticates a user by username and password."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generates a JWT access token using PyJWT."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire})
    
    # Encode the JWT using PyJWT
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt
     

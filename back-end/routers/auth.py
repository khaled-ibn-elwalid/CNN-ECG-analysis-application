from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
from services.auth_service import authenticate_user, create_access_token
from schemas import TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(
    # Use OAuth2PasswordRequestForm instead of a custom JSON payload
    payload: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    
    # Generate token with username and role
    token = create_access_token(data={"sub": user.username, "role": user.role.value})
    
    # OAuth2 standard expects 'access_token' and 'token_type'
    return TokenResponse(access_token=token, token_type="bearer")
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm # <-- We will use this now
from sqlalchemy.orm import Session

from database import get_db
from services.auth_service import authenticate_user, create_access_token
from schemas import TokenResponse
# Note: We no longer need to import LoginRequest here

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(
    
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    
    user = authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    
    # Generate token with username and role
    token = create_access_token(data={"sub": user.username, "role": user.role.value})
    
    # OAuth2 standard expects 'access_token' and 'token_type'
    return TokenResponse(access_token=token, token_type="bearer")
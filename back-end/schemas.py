from datetime import datetime
from pydantic import BaseModel, ConfigDict
from models import GenderEnum

# =========================================================
# Individual class prediction
# =========================================================
class ClassPrediction(BaseModel):
    label: str
    confidence: float
    is_positive: bool

# =========================================================
# Full prediction response
# =========================================================
class PredictionResponse(BaseModel):
    predictions: list[ClassPrediction]
    top_label: str
    top_confidence: float
    
    # Warning: Ensure this array is downsampled and free of NaNs 
    # before passing it here to prevent JSON serialization crashes!
    signal: list[list[float]]  # shape: [n_leads, n_samples]
    lead_names: list[str]

# =========================================================
# Auth
# =========================================================
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# =========================================================
# Patients & Diagnoses
# =========================================================
class PatientCreate(BaseModel):
    name: str
    age: int
    gender: GenderEnum

# 1. MOVED DiagnosisResponse UP so PatientResponse can see it!
class DiagnosisResponse(BaseModel):
    id: int
    result: str
    confidence: float
    signal_path: str | None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class PatientResponse(BaseModel):
    id: int
    name: str
    age: int
    gender: GenderEnum
    created_at: datetime
    diagnoses: list[DiagnosisResponse] = []
    
    model_config = ConfigDict(from_attributes=True)
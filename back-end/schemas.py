from pydantic import BaseModel

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
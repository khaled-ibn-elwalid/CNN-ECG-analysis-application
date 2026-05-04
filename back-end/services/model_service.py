import torch
import numpy as np

from pathlib import Path
from fastapi import HTTPException

from schemas import PredictionResponse, ClassPrediction

# =========================================================
# ⚠️ CRUCIAL NEW REQUIREMENT
# =========================================================
# You must import your model's architecture class here.
# Change 'your_model_file' and 'YourECGModel' to match your actual code.
from .model_architecture import ECG1DCNN


# =========================================================
# Constants
# =========================================================

# Updated to point to your new weights file
MODEL_PATH  = Path(__file__).parent.parent / "models" / "best_ecg_model_weights.pt"
THRESHOLD   = 0.5
CLASS_NAMES = ["NORM", "MI", "STTC", "CD", "HYP"]


# =========================================================
# Singleton model holder
# =========================================================

_model = None


# =========================================================
# Load model — called once at startup
# =========================================================

def load_model():
    """
    Instantiates the model architecture and loads the state_dict.
    Called once during FastAPI lifespan startup.
    Sets model to eval mode and moves to CPU.
    """

    global _model

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model weights not found at: {MODEL_PATH}\n"
            f"Make sure best_ecg_model_weights.pt is inside the models/ folder."
        )

    try:
        # -----------------------------------------------
        # 1. Instantiate the bare architecture first
        # (Pass whatever init arguments your model requires here)
        # -----------------------------------------------
        _model = ECG1DCNN() 

        # -----------------------------------------------
        # 2. Load the state dictionary safely
        # weights_only=True guarantees no malicious code execution
        # -----------------------------------------------
        state_dict = torch.load(
            MODEL_PATH,
            map_location=torch.device("cpu"),
            weights_only=True, 
        )

        # -----------------------------------------------
        # 3. Inject the weights into the bare architecture
        # -----------------------------------------------
        _model.load_state_dict(state_dict)

        # -----------------------------------------------
        # 4. Switch to inference mode
        # -----------------------------------------------
        _model.eval()

        print(f"Model weights loaded successfully from {MODEL_PATH}")

    except Exception as e:
        raise RuntimeError(f"Failed to load model weights: {str(e)}")


# =========================================================
# Get model — safety check before inference
# =========================================================

def get_model():
    """
    Returns the loaded model.
    Raises a 503 if load_model() was never called.
    """
    if _model is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Server is not ready."
        )
    return _model


# =========================================================
# Predict
# =========================================================

def predict(tensor: torch.Tensor) -> PredictionResponse:
    """
    Runs inference on a preprocessed ECG tensor.

    Args:
        tensor: torch.Tensor of shape (1, 12, 1000)

    Returns:
        PredictionResponse with predictions, top label,
        top confidence. Signal is added by the router.
    """
    model = get_model()

    with torch.no_grad():
        # Forward pass → raw logits shape: (1, 5)
        logits = model(tensor)
        
        # Convert logits → probabilities
        probs = torch.sigmoid(logits)

    # Move to numpy for easier handling; shape: (5,)
    probs_np = probs.squeeze(0).cpu().numpy()

    # Apply threshold → binary predictions
    preds = (probs_np >= THRESHOLD).astype(int)

    # Build per-class predictions
    class_predictions = [
        ClassPrediction(
            label       = CLASS_NAMES[i],
            confidence  = float(round(probs_np[i], 4)),
            is_positive = bool(preds[i]),
        )
        for i in range(len(CLASS_NAMES))
    ]

    # Identify top label — highest confidence score
    top_index      = int(np.argmax(probs_np))
    top_label      = CLASS_NAMES[top_index]
    top_confidence = float(round(probs_np[top_index], 4))

    # Return PredictionResponse
    return PredictionResponse(
        predictions    = class_predictions,
        top_label      = top_label,
        top_confidence = top_confidence,
        signal         = [],        # safely filled by router later
        lead_names     = [],        # safely filled by router later
    )
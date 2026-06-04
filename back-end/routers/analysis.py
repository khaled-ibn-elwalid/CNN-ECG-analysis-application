from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Import your auth and db dependencies
from database import get_db
from dependencies import get_current_user
from models import User, Diagnosis

# Import your ML services and schemas
from services.validator import validate_ecg_files
from services.preprocessor import preprocess
from services.model_service import predict
from schemas import PredictionResponse

# Import patient service to verify the patient exists
from services.patient_service import get_patient_by_id

# =========================================================
# Router Setup
# =========================================================
router = APIRouter(prefix="/analysis", tags=["analysis"])


# =========================================================
# POST /analysis/predict
# =========================================================
@router.post("/predict", response_model=PredictionResponse)
async def predict_ecg(
    # 1. CHANGED: patient_id is now optional and defaults to None
    patient_id: int | None = Form(None), 
    dat_file: UploadFile = File(...),
    hea_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Full prediction pipeline (Supports Guest/Quick Analysis Mode):
    """

    # -----------------------------------------------
    # 1. Verify Patient Exists (ONLY if an ID was provided)
    # -----------------------------------------------
    if patient_id is not None and patient_id > 0: 
        patient = get_patient_by_id(db, patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with ID {patient_id} not found."
            )

    # -----------------------------------------------
    # 2. Validate & Read files
    # -----------------------------------------------
    validate_ecg_files(dat_file, hea_file)

    try:
        dat_bytes = await dat_file.read()
        hea_bytes = await hea_file.read()
    except Exception:
        raise HTTPException(
            status_code=422,
            detail="Failed to read uploaded files. Please try again."
        )

    # -----------------------------------------------
    # 3. Preprocess
    # -----------------------------------------------
    try:
        preprocessed = preprocess(dat_bytes, hea_bytes)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Preprocessing failed unexpectedly: {str(e)}"
        )

    # -----------------------------------------------
    # 4. Run model inference
    # -----------------------------------------------
    try:
        response = predict(preprocessed["tensor"])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Model inference failed unexpectedly: {str(e)}"
        )

    # -----------------------------------------------
    # 5. Save Diagnosis to Database (ONLY if an ID was provided)
    # -----------------------------------------------
    if patient_id is not None and patient_id > 0:
        new_diagnosis = Diagnosis(
            patient_id=patient_id,
            result=response.top_label,
            confidence=response.top_confidence,
            signal_path=None,
        )
        db.add(new_diagnosis)
        db.commit()

    # -----------------------------------------------
    # 6. Fill in signal and return to frontend
    # -----------------------------------------------
    response.signal = preprocessed["signal"]
    response.lead_names = preprocessed["lead_names"]

    # This always returns the result, whether it was saved to a patient or not!
    return response
from fastapi import APIRouter, UploadFile, File, HTTPException

from services.validator import validate_ecg_files
from services.preprocessor import preprocess
from services.model_service import predict
from schemas import PredictionResponse


# =========================================================
# Router
# =========================================================

router = APIRouter()


# =========================================================
# POST /predict
# =========================================================

@router.post("/predict", response_model=PredictionResponse)
async def predict_ecg(
    dat_file: UploadFile = File(...),
    hea_file: UploadFile = File(...),
):
    """
    Full prediction pipeline:
        1. Validate files
        2. Preprocess signal
        3. Run model inference
        4. Assemble and return response
    """

    # -----------------------------------------------
    # 1. Validate files before reading bytes
    # catches missing names, wrong extensions,
    # mismatched stems and size violations early
    # -----------------------------------------------

    validate_ecg_files(dat_file, hea_file)

    # -----------------------------------------------
    # 2. Read bytes after validation passes
    # we read after validation because UploadFile.size
    # is available from headers without reading bytes
    # -----------------------------------------------

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
    # runs full pipeline: wfdb read, filter,
    # resample, normalize, segment
    # returns tensor + frontend signal + lead names
    # -----------------------------------------------

    try:
        preprocessed = preprocess(dat_bytes, hea_bytes)
    except HTTPException:
        # re-raise clean HTTPExceptions from preprocessor
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Preprocessing failed unexpectedly: {str(e)}"
        )

    # -----------------------------------------------
    # 4. Run model inference
    # returns PredictionResponse with empty
    # signal and lead_names fields
    # -----------------------------------------------

    try:
        response = predict(preprocessed["tensor"])
    except HTTPException:
        # re-raise 503 if model is not loaded
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Model inference failed unexpectedly: {str(e)}"
        )

    # -----------------------------------------------
    # 5. Fill in signal and lead names
    # only the router has access to both
    # preprocessor output and model response
    # -----------------------------------------------

    response.signal     = preprocessed["signal"]
    response.lead_names = preprocessed["lead_names"]

    return response
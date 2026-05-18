from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User
from schemas import PatientCreate, PatientResponse
from services.patient_service import(
    create_patient,
    get_patients,
    get_patient_by_id,
    delete_patient,
)

router = APIRouter(prefix="/patients", tags=["patients"])
# POST /patients

@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_new_patient(
    patient_data: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user), # <--- FIXED
):
    return create_patient(db, patient_data)

# GET /patients
@router.get("/", response_model=list[PatientResponse])
def list_patients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_patients(db, skip=skip, limit=limit)

# GET /patients/{id}

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id : int,
    db : Session = Depends(get_db),
    current_user : User = Depends(get_current_user),
):
    patient - get_patient_by_id (db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail= f"Patient with id {patient_id} not found"
        )
    return patient

# DELETE /patients/{id}
@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = delete_patient(db, patient_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with id {patient_id} not found",
        )


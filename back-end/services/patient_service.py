from sqlalchemy.orm import Session
from models import Patient
from schemas import PatientCreate

def get_patients(db : Session, skip :int = 0, limit: int = 100)-> list[Patient]:
    """Retrive a list of patients with pagination."""
    return db.query(Patient).offset(skip).limit(limit).all()

def get_patient_by_id(db: Session, patient_id:int)-> Patient | None:
    """Retrive single patient by ID"""
    return db.query(Patient).filter(Patient.id == patient_id).first()

def create_patient(db: Session, patient_data: PatientCreate)-> Patient:
    """Create new patient in the database"""
    db_patient = Patient(**patient_data.model_dump())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)

    return db_patient

def delete_patient(db: Session, patient_id: int)-> bool :
    """Delete a patient from the db."""
    db_patient = get_patient_by_id(db, patient_id)
    if not db_patient :
        return False
    
    db.delete(db_patient)
    db.commit()
    return True
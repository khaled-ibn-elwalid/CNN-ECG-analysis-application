from datetime import datetime
import enum
from database import Base

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Enum
)
from sqlalchemy.orm import relationship




class RoleEnum(enum.Enum):
    admin = "admin"


class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"


# Users
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.admin, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# Patients
class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(Enum(GenderEnum), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    diagnoses = relationship(
        "Diagnosis",
        back_populates="patient",
        cascade="all, delete-orphan"
    )


# Diagnoses
class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    result = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    signal_path = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship(
        "Patient",
        back_populates="diagnoses"
    )
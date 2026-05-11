from services.auth_service import get_password_hash
from database import SessionLocal, engine, Base
from passlib.context import CryptContext
from models import User, RoleEnum
from sqlalchemy import select

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin1234"

def init_db():
    #create all db if they dont exist
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        # Modern SQLAlchemy 2.0 Select syntax
        stmt = select(User).where(User.username == ADMIN_USERNAME)
        existing_user = db.scalar(stmt)

        if not existing_user:
            admin = User(
                username=ADMIN_USERNAME,
                hashed_password=get_password_hash(ADMIN_PASSWORD),
                role=RoleEnum.admin, # Assuming this is a standard Enum
            )
            db.add(admin)
            db.commit()
            print(f"[seed] Admin user '{ADMIN_USERNAME}' created.")
        else:
            print(f"[seed] Admin user '{ADMIN_USERNAME}' already exists, skipping.")

if __name__ == "main":
    init_db()

    
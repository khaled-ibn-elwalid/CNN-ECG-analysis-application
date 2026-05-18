from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth
from seed import init_db
from routers import patients

from routers import predict
from services.model_service import load_model


# =========================================================
# Lifespan — runs once on startup and shutdown
# =========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: load model into memory once.
    Shutdown: nothing to clean up.
    """
    init_db()

    print("Starting up — loading model...")
    load_model()
    print("Model ready. Server is accepting requests.")

    yield

    print("Shutting down.")


# =========================================================
# App
# =========================================================

app = FastAPI(
    title       = "ECG Predictor API",
    description = "Upload a PhysioNet .dat and .hea file to get ECG predictions.",
    version     = "1.0.0",
    lifespan    = lifespan,
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:5173"],   # Vite default port
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# =========================================================
# Routes
# =========================================================

app.include_router(
    predict.router,
    prefix = "",
    tags   = ["Prediction"],
)


# =========================================================
# Health check
# =========================================================

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(predict.router)
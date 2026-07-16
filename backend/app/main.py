from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.ml.dataset import ensure_dataset
from app.ml.serve_predict import router as cmms_predict_router
from app.routers.api import router

app = FastAPI(
    title="Sistema IA Artículo — Predicción de fallas CMMS",
    version="0.1.0",
    description="Demo alineada al artículo: EDA → 5 modelos → CV → tuning → McNemar → reportes",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list + ["http://127.0.0.1:3000", "http://localhost:4003"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Nest CMMS llama /health y /predict en la raíz (AI_SERVICE_URL)
app.include_router(cmms_predict_router)
app.include_router(router)


@app.on_event("startup")
def startup():
    ensure_dataset()

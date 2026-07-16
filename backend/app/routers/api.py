import asyncio

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from starlette import status

from app.auth import Token, User, authenticate_user, create_access_token, get_current_user
from app.config import FIGURES_DIR, REPORTS_DIR
from app.ml.dataset import ensure_dataset, generate_mock_dataset, save_mock_dataset
from app.ml.pipeline import (
    eda_summary,
    load_metrics,
    predict_fleet,
    regenerate_analysis_figures_from_metrics,
)
from app.ml.train_job import get_train_status, start_train_job

router = APIRouter(prefix="/api")


@router.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    return Token(access_token=create_access_token(user.username))


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return {"username": user.username}


@router.post("/dataset/generate")
async def generate_dataset(user: User = Depends(get_current_user)):
    path = save_mock_dataset(generate_mock_dataset())
    eda = eda_summary()
    return {"ok": True, "path": str(path), "eda": eda}


@router.get("/eda")
async def get_eda(user: User = Depends(get_current_user)):
    return eda_summary()


@router.post("/train", status_code=status.HTTP_202_ACCEPTED)
async def train(
    n_folds: int = 5,
    do_tuning: bool = True,
    user: User = Depends(get_current_user),
):
    n_folds = max(2, min(n_folds, 5))
    try:
        return await start_train_job(n_folds=n_folds, do_tuning=do_tuning)
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/train/status")
async def train_status(user: User = Depends(get_current_user)):
    return get_train_status()


@router.get("/metrics")
async def metrics(user: User = Depends(get_current_user)):
    data = load_metrics()
    if not data:
        raise HTTPException(status_code=404, detail="Aún no hay métricas. Entrena primero.")
    # Asegura gráfico de accuracy aunque el entrenamiento sea anterior
    if not (data.get("figures") or {}).get("accuracy_comparison"):
        figs = regenerate_analysis_figures_from_metrics()
        if figs:
            data = load_metrics() or data
    if "base_models" not in data and data.get("models"):
        data["base_models"] = [n for n in data["models"] if str(n).startswith("M")]
    return data


@router.get("/predict/ranking")
async def ranking(top_n: int = 15, user: User = Depends(get_current_user)):
    try:
        return {"items": predict_fleet(top_n=top_n)}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/figures/{name}")
async def figure(name: str, user: User = Depends(get_current_user)):
    from pathlib import Path

    path = FIGURES_DIR / Path(name).name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Figura no encontrada")
    return FileResponse(path)


@router.get("/reports/{name}")
async def report(name: str, user: User = Depends(get_current_user)):
    from pathlib import Path

    path = REPORTS_DIR / Path(name).name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return FileResponse(path)


@router.get("/health")
async def health():
    return {"status": "ok"}

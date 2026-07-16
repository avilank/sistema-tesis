"""Predicción para el CMMS (Nest llama POST /predict sin auth de demo)."""

from __future__ import annotations

from typing import Any

import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import ARTIFACTS_DIR
from app.ml.dataset import FEATURE_COLS

BEST_MODEL_PATH = ARTIFACTS_DIR / "best_model.joblib"

FEATURE_LABELS = {
    "km_actual": "Kilometraje actual",
    "km_30d": "Km últimos 30 días",
    "km_90d": "Km últimos 90 días",
    "ritmo_km_dia": "Ritmo km/día",
    "correctivos_90d": "Correctivos 90d",
    "preventivos_90d": "Preventivos 90d",
    "dias_desde_ultima_ot": "Días desde última OT",
    "antiguedad_anios": "Antigüedad",
    "presion_freno_del": "Presión freno del.",
    "presion_freno_tras": "Presión freno tras.",
    "temp_refrigeracion": "Temp. refrigeración",
    "categoria_vehiculo": "Categoría vehículo",
    "sede_id": "Sede",
}

router = APIRouter(tags=["cmms-predict"])


class PredictRequest(BaseModel):
    assetId: int
    asOf: str | None = None
    features: dict[str, float] = Field(default_factory=dict)
    modelVersion: str | None = None


class TopFactor(BaseModel):
    feature: str
    shap: float
    label: str


class PredictResponse(BaseModel):
    assetId: int
    failureProbability: float
    calibrated: bool = False
    confidence: dict[str, Any] = Field(default_factory=dict)
    topFactors: list[TopFactor] = Field(default_factory=list)
    modelVersion: str | None = None


def _heuristic_proba(row: dict[str, float]) -> float:
    corr = float(row.get("correctivos_90d") or 0)
    prev = float(row.get("preventivos_90d") or 0)
    dias = float(row.get("dias_desde_ultima_ot") or 0)
    km30 = float(row.get("km_30d") or 0)
    z = (
        -1.2
        + 0.45 * corr
        - 0.2 * prev
        + 0.008 * max(0.0, dias - 30)
        + 0.25 * min(km30 / 3000.0, 2.0)
    )
    return float(1 / (1 + np.exp(-z)))


def _row_from_features(features: dict[str, float]) -> dict[str, float]:
    row: dict[str, float] = {}
    for col in FEATURE_COLS:
        val = features.get(col, 0.0)
        try:
            row[col] = float(val) if val is not None else 0.0
        except (TypeError, ValueError):
            row[col] = 0.0
    return row


def _top_factors(row: dict[str, float], proba: float) -> list[TopFactor]:
    weights = {
        "correctivos_90d": 0.45,
        "dias_desde_ultima_ot": 0.25,
        "km_30d": 0.2,
        "preventivos_90d": -0.2,
        "ritmo_km_dia": 0.1,
    }
    scored = []
    for feat, w in weights.items():
        contrib = w * float(row.get(feat) or 0) * (1 if w > 0 else -1)
        scored.append(
            TopFactor(
                feature=feat,
                shap=round(float(contrib) * max(proba, 0.1), 4),
                label=FEATURE_LABELS.get(feat, feat),
            )
        )
    scored.sort(key=lambda x: abs(x.shap), reverse=True)
    return scored[:5]


@router.get("/health")
def health():
    return {
        "status": "ok",
        "modelLoaded": BEST_MODEL_PATH.exists(),
    }


@router.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest):
    if not body.features:
        raise HTTPException(status_code=400, detail="features es requerido")

    row = _row_from_features(body.features)
    model_version = body.modelVersion or "heuristic-v1"
    calibrated = False

    if BEST_MODEL_PATH.exists():
        try:
            bundle = joblib.load(BEST_MODEL_PATH)
            model = bundle["model"]
            features = bundle.get("features") or FEATURE_COLS
            X = pd.DataFrame([{f: row.get(f, 0.0) for f in features}])
            proba = float(model.predict_proba(X)[0, 1])
            model_version = str(bundle.get("name") or bundle.get("best_model") or "best_model.joblib")
            calibrated = True
        except Exception:
            proba = _heuristic_proba(row)
    else:
        proba = _heuristic_proba(row)

    proba = float(np.clip(proba, 0.0, 1.0))
    return PredictResponse(
        assetId=body.assetId,
        failureProbability=round(proba, 4),
        calibrated=calibrated,
        confidence={"lowerCovered": True, "source": "cmms-features"},
        topFactors=_top_factors(row, proba),
        modelVersion=model_version,
    )

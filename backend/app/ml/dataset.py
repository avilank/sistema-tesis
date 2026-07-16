"""Genera un dataset tabular mock alineado al artículo (vehículo × mes)."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from app.config import PROCESSED_DIR, RAW_DIR

FEATURE_COLS = [
    "km_actual",
    "km_30d",
    "km_90d",
    "ritmo_km_dia",
    "correctivos_90d",
    "preventivos_90d",
    "dias_desde_ultima_ot",
    "antiguedad_anios",
    "presion_freno_del",
    "presion_freno_tras",
    "temp_refrigeracion",
    "categoria_vehiculo",
    "sede_id",
]


def generate_mock_dataset(
    n_vehicles: int = 120,
    months: list[str] | None = None,
    seed: int = 42,
) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    if months is None:
        months = [
            "2026-01-01",
            "2026-02-01",
            "2026-03-01",
            "2026-04-01",
            "2026-05-01",
            "2026-06-01",
        ]

    rows: list[dict] = []
    for vid in range(1, n_vehicles + 1):
        categoria = int(rng.integers(1, 4))
        sede = int(rng.integers(1, 4))
        antiguedad = float(rng.uniform(1.0, 12.0))
        km_base = float(rng.uniform(80_000, 450_000))
        risk = (
            0.08 * antiguedad
            + 0.15 * (categoria == 3)
            + rng.normal(0, 0.35)
        )

        for m in months:
            km_30d = float(rng.uniform(800, 4500))
            km_90d = km_30d * float(rng.uniform(2.4, 3.3))
            ritmo = km_30d / 30.0
            correctivos_90d = int(max(0, rng.poisson(lam=max(0.2, 0.6 + risk))))
            preventivos_90d = int(rng.poisson(lam=1.4))
            dias_ultima = int(rng.integers(5, 180))
            p_del = float(rng.normal(6.5, 1.1))
            p_tras = float(rng.normal(6.2, 1.2))
            temp = float(rng.normal(4.0, 2.5))

            logit = (
                -1.6
                + 0.35 * correctivos_90d
                + 0.012 * max(0, 120 - dias_ultima)
                + 0.00025 * km_30d
                + 0.08 * antiguedad
                - 0.25 * p_del
                + 0.06 * abs(temp - 4)
                + rng.normal(0, 0.45)
            )
            prob = 1 / (1 + np.exp(-logit))
            y = int(rng.random() < prob)

            rows.append(
                {
                    "vehicle_id": vid,
                    "placa": f"YAM-{vid:03d}",
                    "cutoff_date": m,
                    "km_actual": round(km_base + km_90d, 1),
                    "km_30d": round(km_30d, 1),
                    "km_90d": round(km_90d, 1),
                    "ritmo_km_dia": round(ritmo, 2),
                    "correctivos_90d": correctivos_90d,
                    "preventivos_90d": preventivos_90d,
                    "dias_desde_ultima_ot": dias_ultima,
                    "antiguedad_anios": round(antiguedad, 2),
                    "presion_freno_del": round(p_del, 2),
                    "presion_freno_tras": round(p_tras, 2),
                    "temp_refrigeracion": round(temp, 2),
                    "categoria_vehiculo": categoria,
                    "sede_id": sede,
                    "y": y,
                }
            )
            km_base += km_30d

    df = pd.DataFrame(rows)
    df["cutoff_date"] = pd.to_datetime(df["cutoff_date"])
    return df.sort_values(["cutoff_date", "vehicle_id"]).reset_index(drop=True)


def save_mock_dataset(df: pd.DataFrame | None = None) -> Path:
    """Genera o persiste dataset. Si df es None y ya hay cohorte real, no sobrescribe."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    raw_path = RAW_DIR / "cohort_mock.csv"
    processed_path = PROCESSED_DIR / "X_tab.parquet"

    if df is None:
        if raw_path.exists() or processed_path.exists():
            if raw_path.exists() and not processed_path.exists():
                df = pd.read_csv(raw_path, parse_dates=["cutoff_date"])
            else:
                return processed_path if processed_path.exists() else raw_path
        else:
            df = generate_mock_dataset()

    df.to_csv(raw_path, index=False)
    df.to_parquet(processed_path, index=False)
    return processed_path


def ensure_dataset() -> Path:
    """Asegura que exista cohorte; no pisa CSV/parquet ya generados (p. ej. desde CMMS)."""
    return save_mock_dataset()


def load_dataset() -> pd.DataFrame:
    parquet = PROCESSED_DIR / "X_tab.parquet"
    csv = RAW_DIR / "cohort_mock.csv"
    if parquet.exists():
        return pd.read_parquet(parquet)
    if csv.exists():
        df = pd.read_csv(csv, parse_dates=["cutoff_date"])
        return df
    path = save_mock_dataset()
    return pd.read_parquet(path)


if __name__ == "__main__":
    out = save_mock_dataset()
    df = pd.read_parquet(out)
    print(f"Guardado: {out}")
    print(f"N={len(df)}  veh={df['vehicle_id'].nunique()}  pos%={100*df['y'].mean():.1f}")

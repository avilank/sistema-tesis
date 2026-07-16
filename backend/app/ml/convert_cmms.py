"""
Convierte datos CMMS a cohorte tabular (vehiculo x mes).

Modo rapido (recomendado):
  python -m app.ml.convert_cmms --from-db --env-file ..\\..\\..\\service-mantenimiento\\.env

Modo CSV:
  exporta 6 tablas; para work_orders usa solo columnas clave o work_orders_slim.csv
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import numpy as np
import pandas as pd


def _parse_numeric(value) -> float:
    if pd.isna(value):
        return np.nan
    txt = str(value).strip().lower()
    if not txt:
        return np.nan
    txt = txt.replace(",", ".")
    cleaned = "".join(ch for ch in txt if ch.isdigit() or ch in ".-")
    if not cleaned or cleaned in {".", "-", "-."}:
        return np.nan
    try:
        return float(cleaned)
    except ValueError:
        return np.nan


def _load_env_file(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def _read_csv(path: str | Path) -> pd.DataFrame:
    return pd.read_csv(path, encoding="utf-8", low_memory=False)


def _extract_work_orders_slim(src: Path) -> pd.DataFrame:
    """Parsea work_orders.csv roto (comas/JSON en description) por regex."""
    lines = src.read_text(encoding="utf-8", errors="replace").splitlines()
    dt = r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+-\d{2}"
    rows = []
    for line in lines[1:]:
        dates = re.findall(dt, line)
        if not dates:
            continue
        m_sub = re.search(dt + r",(\d+),[tf],", line)
        m_asset = re.search(
            r",(?:completed|pending|cancelled|in_progress|open|closed|rejected|approved),(\d+),",
            line,
        )
        if m_sub and m_asset:
            rows.append(
                {
                    "assetId": int(m_asset.group(1)),
                    "workOrderSubcategoryId": int(m_sub.group(1)),
                    "createdAt": dates[0],
                }
            )
    if not rows:
        raise RuntimeError(f"No se extrajeron filas de {src}")
    return pd.DataFrame(rows)


def _read_work_orders(path: str | Path) -> pd.DataFrame:
    """work_orders.csv de pgAdmin suele romperse por JSON/comas en description."""
    path = Path(path)
    slim = path.parent / "work_orders_slim.csv"
    if slim.exists():
        print(f"Usando {slim.name} (export liviano)")
        return _read_csv(slim)

    needed = ["assetId", "workOrderSubcategoryId", "createdAt"]
    try:
        return _read_csv(path)[needed]
    except Exception:
        pass

    try:
        return pd.read_csv(
            path,
            usecols=needed,
            engine="python",
            on_bad_lines="skip",
            encoding="utf-8",
        )
    except Exception:
        print(f"work_orders.csv ilegible; extrayendo columnas clave de {path.name}")
        df = _extract_work_orders_slim(path)
        slim.write_text(
            "assetId,workOrderSubcategoryId,createdAt\n"
            + df.to_csv(index=False, header=False),
            encoding="utf-8",
        )
        print(f"Generado {slim.name} ({len(df)} filas)")
        return df


def load_from_db(env_file: Path) -> tuple[pd.DataFrame, ...]:
    import psycopg2

    env = _load_env_file(env_file)
    host = env["DATABASE_HOST"]
    port = int(re.match(r"\d+", env.get("DATABASE_PORT", "5432")).group(0))
    user = env["DATABASE_USER"]
    password = env.get("DATABASE_PASS") or env.get("DATABASE_PASSWORD")
    dbname = env["DATABASE_NAME"]

    conn = psycopg2.connect(
        host=host, port=port, user=user, password=password, dbname=dbname, connect_timeout=30
    )
    conn.set_session(readonly=True, autocommit=True)

    vehicles = pd.read_sql(
        """
        SELECT v."vehicleId", v.vehicle_category_id,
               COALESCE(a."locationId", a."actualLocationId") AS "locationId",
               a."fabricationYear"
        FROM vehicles v
        LEFT JOIN assets a ON a."assetId" = v."vehicleId"
        """,
        conn,
    )
    km = pd.read_sql(
        'SELECT "vehicleId", kilometers, "recordedAt" FROM vehicle_km_history',
        conn,
    )
    work_orders = pd.read_sql(
        'SELECT "assetId", "workOrderSubcategoryId", "createdAt" FROM work_orders',
        conn,
    )
    subcats = pd.read_sql(
        'SELECT "workOrderSubcategoryId", name, "workOrderCategoryId" FROM work_order_subcategories',
        conn,
    )
    check_lists = pd.read_sql('SELECT "checkListId", "createdAt" FROM check_lists', conn)
    check_measures = pd.read_sql(
        'SELECT "checkListId", "assetId", value, "measureName" FROM check_list_measures',
        conn,
    )
    conn.close()
    print("Datos cargados directamente desde PostgreSQL (sin CSV)")
    return vehicles, km, work_orders, subcats, check_lists, check_measures


def _merge_assets(vehicles: pd.DataFrame, assets: pd.DataFrame | None) -> pd.DataFrame:
    if assets is None or assets.empty:
        return vehicles
    cols = [c for c in ["assetId", "code", "locationId", "actualLocationId", "fabricationYear"] if c in assets.columns]
    if "assetId" not in cols:
        return vehicles
    merged = vehicles.merge(
        assets[cols].rename(columns={"assetId": "vehicleId"}),
        on="vehicleId",
        how="left",
        suffixes=("", "_asset"),
    )
    for col in ("locationId", "actualLocationId", "fabricationYear", "code"):
        asset_col = f"{col}_asset"
        if asset_col in merged.columns:
            if col in merged.columns:
                merged[col] = merged[col].fillna(merged[asset_col])
            else:
                merged[col] = merged[asset_col]
            merged = merged.drop(columns=[asset_col])
    return merged


def _resolve_vehicle_columns(vehicles: pd.DataFrame) -> pd.DataFrame:
    out = vehicles.copy()
    if "vehicleId" not in out.columns:
        raise ValueError("vehicles debe incluir columna 'vehicleId'")

    if "vehicle_category_id" in out.columns:
        out["categoria_vehiculo"] = out["vehicle_category_id"]
    elif "vehicleCategoryId" in out.columns:
        out["categoria_vehiculo"] = out["vehicleCategoryId"]
    else:
        out["categoria_vehiculo"] = 1

    if "locationId" in out.columns and "actualLocationId" in out.columns:
        out["sede_id"] = out["locationId"].fillna(out["actualLocationId"])
    elif "locationId" in out.columns:
        out["sede_id"] = out["locationId"]
    elif "actualLocationId" in out.columns:
        out["sede_id"] = out["actualLocationId"]
    else:
        out["sede_id"] = 1

    out["categoria_vehiculo"] = pd.to_numeric(out["categoria_vehiculo"], errors="coerce").fillna(1).astype(int)
    out["sede_id"] = pd.to_numeric(out["sede_id"], errors="coerce").fillna(1).astype(int)

    if "fabricationYear" in out.columns:
        year = pd.to_numeric(out["fabricationYear"], errors="coerce")
        out["antiguedad_anios"] = (pd.Timestamp.utcnow().year - year).clip(lower=0).fillna(5.0)
    else:
        out["antiguedad_anios"] = 5.0

    if "code" in out.columns:
        out["placa"] = out["code"].astype(str).str.strip()
        out.loc[out["placa"].isin(["", "nan", "None"]), "placa"] = np.nan
    else:
        out["placa"] = np.nan

    return out[["vehicleId", "categoria_vehiculo", "sede_id", "antiguedad_anios", "placa"]]


def build_cohort(
    vehicles: pd.DataFrame,
    km: pd.DataFrame,
    work_orders: pd.DataFrame,
    subcats: pd.DataFrame,
    check_lists: pd.DataFrame,
    check_measures: pd.DataFrame,
    assets: pd.DataFrame | None = None,
) -> pd.DataFrame:
    vehicles = _merge_assets(vehicles, assets)
    vehicles_info = _resolve_vehicle_columns(vehicles)

    subcats = subcats[["workOrderSubcategoryId", "name", "workOrderCategoryId"]]
    wo = work_orders.merge(subcats, on="workOrderSubcategoryId", how="left")
    wo["createdAt"] = pd.to_datetime(wo["createdAt"], utc=True)

    km = km.copy()
    km["recordedAt"] = pd.to_datetime(km["recordedAt"], utc=True)

    check = check_measures[["checkListId", "assetId", "value", "measureName"]].merge(
        check_lists[["checkListId", "createdAt"]],
        on="checkListId",
        how="left",
    )
    check["createdAt"] = pd.to_datetime(check["createdAt"], utc=True)
    check["value_num"] = check["value"].apply(_parse_numeric)
    check["measureName"] = check["measureName"].astype(str).str.lower()

    start = min(wo["createdAt"].min(), km["recordedAt"].min()).to_period("M").to_timestamp()
    end = max(wo["createdAt"].max(), km["recordedAt"].max()).to_period("M").to_timestamp()
    months = pd.date_range(start, end, freq="MS", tz="UTC")

    vehicle_ids = vehicles["vehicleId"].dropna().astype(int).unique().tolist()
    rows = []
    for cutoff in months:
        cutoff_end = cutoff + pd.Timedelta(days=30)
        for vid in vehicle_ids:
            vrow = vehicles_info[vehicles_info["vehicleId"] == vid]
            if len(vrow):
                categoria_vehiculo = int(vrow["categoria_vehiculo"].iloc[0])
                sede_id = int(vrow["sede_id"].iloc[0])
                antiguedad_anios = float(vrow["antiguedad_anios"].iloc[0])
                if pd.isna(antiguedad_anios):
                    antiguedad_anios = 5.0
            else:
                categoria_vehiculo, sede_id, antiguedad_anios = 1, 1, 5.0

            hist_km = km[(km["vehicleId"] == vid) & (km["recordedAt"] <= cutoff)]
            if hist_km.empty:
                continue
            hist_km = hist_km.sort_values("recordedAt")
            km_actual = float(hist_km.iloc[-1]["kilometers"])
            km_30 = hist_km[hist_km["recordedAt"] > cutoff - pd.Timedelta(days=30)]
            km_90 = hist_km[hist_km["recordedAt"] > cutoff - pd.Timedelta(days=90)]
            km_30d = float(km_actual - (km_30.iloc[0]["kilometers"] if len(km_30) else km_actual))
            km_90d = float(km_actual - (km_90.iloc[0]["kilometers"] if len(km_90) else km_actual))

            wo_hist = wo[(wo["assetId"] == vid) & (wo["createdAt"] <= cutoff)]
            corr_90 = wo_hist[
                (wo_hist["workOrderCategoryId"] == 6)
                & (wo_hist["createdAt"] > cutoff - pd.Timedelta(days=90))
            ]
            prev_90 = wo_hist[
                wo_hist["name"].astype(str).str.contains("preventivo", case=False, na=False)
                & (wo_hist["createdAt"] > cutoff - pd.Timedelta(days=90))
            ]
            last = wo_hist.sort_values("createdAt")
            dias = int((cutoff - last.iloc[-1]["createdAt"]).days) if len(last) else 180

            future = wo[
                (wo["assetId"] == vid)
                & (wo["workOrderCategoryId"] == 6)
                & (wo["createdAt"] > cutoff)
                & (wo["createdAt"] <= cutoff_end)
            ]
            y = int(len(future) > 0)

            chk_hist = check[(check["assetId"] == vid) & (check["createdAt"] <= cutoff)]
            chk_90 = chk_hist[chk_hist["createdAt"] > cutoff - pd.Timedelta(days=90)]
            p_del = chk_90[
                chk_90["measureName"].str.contains("presion")
                & chk_90["measureName"].str.contains("del")
            ]
            p_tras = chk_90[
                chk_90["measureName"].str.contains("presion")
                & chk_90["measureName"].str.contains("tras")
            ]
            temp_ref = chk_90[
                chk_90["measureName"].str.contains("temp")
                & chk_90["measureName"].str.contains("refri")
            ]

            placa_val = vrow["placa"].iloc[0] if len(vrow) else np.nan
            if pd.notna(placa_val) and str(placa_val).strip() not in {"", "nan", "None"}:
                placa = str(placa_val).strip()
            else:
                placa = f"VEH-{int(vid)}"

            rows.append(
                {
                    "vehicle_id": int(vid),
                    "placa": placa,
                    "cutoff_date": cutoff.tz_localize(None),
                    "km_actual": km_actual,
                    "km_30d": max(0.0, km_30d),
                    "km_90d": max(0.0, km_90d),
                    "ritmo_km_dia": max(0.0, km_30d) / 30.0,
                    "correctivos_90d": int(len(corr_90)),
                    "preventivos_90d": int(len(prev_90)),
                    "dias_desde_ultima_ot": dias,
                    "antiguedad_anios": round(antiguedad_anios, 2),
                    "presion_freno_del": float(p_del["value_num"].mean()) if len(p_del) else np.nan,
                    "presion_freno_tras": float(p_tras["value_num"].mean()) if len(p_tras) else np.nan,
                    "temp_refrigeracion": float(temp_ref["value_num"].mean()) if len(temp_ref) else np.nan,
                    "categoria_vehiculo": categoria_vehiculo,
                    "sede_id": sede_id,
                    "y": y,
                }
            )

    out = pd.DataFrame(rows)
    num_cols = [
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
    for col in num_cols:
        out[col] = pd.to_numeric(out[col], errors="coerce")
        med = out[col].median()
        out[col] = out[col].fillna(med if pd.notna(med) else 0)
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-db", action="store_true", help="Leer directo de PostgreSQL (mas rapido)")
    parser.add_argument(
        "--env-file",
        default=r"c:\YAMBOLY\service-mantenimiento\.env",
        help="Ruta al .env del CMMS (solo con --from-db)",
    )
    parser.add_argument("--vehicles")
    parser.add_argument("--km")
    parser.add_argument("--work-orders")
    parser.add_argument("--subcategories")
    parser.add_argument("--check-lists")
    parser.add_argument("--check-measures")
    parser.add_argument("--assets", help="Opcional: assets.csv con assetId y code (placa real)")
    parser.add_argument("--out", default="data/raw/cohort_mock.csv")
    args = parser.parse_args()

    assets_df = _read_csv(args.assets) if args.assets else None

    if args.from_db:
        tables = load_from_db(Path(args.env_file))
        df = build_cohort(*tables, assets=assets_df)
    else:
        required = [
            args.vehicles,
            args.km,
            args.work_orders,
            args.subcategories,
            args.check_lists,
            args.check_measures,
        ]
        if not all(required):
            parser.error("Sin --from-db debes pasar las 6 rutas CSV")
        tables = (
            _read_csv(args.vehicles),
            _read_csv(args.km),
            _read_work_orders(args.work_orders),
            _read_csv(args.subcategories),
            _read_csv(args.check_lists),
            _read_csv(args.check_measures),
        )
        df = build_cohort(*tables, assets=assets_df)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out, index=False)

    # Actualizar parquet para que el pipeline lo use de inmediato
    parquet = out.parent.parent / "processed" / "X_tab.parquet"
    parquet.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(parquet, index=False)

    print(f"OK {len(df)} filas -> {out}")
    print(f"Parquet -> {parquet}")
    print(f"Vehiculos: {df['vehicle_id'].nunique()} | Positivos y=1: {df['y'].sum()} ({100*df['y'].mean():.2f}%)")
    print("Siguiente: abre dashboard y pulsa Entrenar modelos.")


if __name__ == "__main__":
    main()

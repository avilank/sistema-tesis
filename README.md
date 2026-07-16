# Sistema IA Artículo — Demo predicción de fallas CMMS

Monorepo local (sin Docker) alineado al artículo:
EDA → 5 modelos (3 base + 2 híbridos) → CV → tuning → McNemar → reportes → ranking.

## Estructura

```
sistema-ia-articulo/
├── backend/     # FastAPI + pipeline ML
└── frontend/    # Next.js demo (login + dashboard único)
```

## Credenciales demo

- Usuario: `admin`
- Contraseña: `admin123`

## 1) Backend

```powershell
cd c:\YAMBOLY\sistema-ia-articulo\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

## 2) Frontend

```powershell
cd c:\YAMBOLY\sistema-ia-articulo\frontend
npm install
npm run dev
```

App: http://localhost:3000

## Flujo en la UI

1. Login
2. Dashboard muestra EDA (Tabla 1)
3. Botón **Entrenar modelos**
4. Ver comparativa, ROC, matriz, CV, McNemar, ranking
5. Descargar PDF / Word / Excel

## Dataset mock

Se genera solo en `backend/data/raw/cohort_mock.csv` (120 vehículos × 6 meses).

## Convertir datos reales del CMMS

1. Exporta CSV desde DBeaver:
   - `vehicles`
   - `vehicle_km_history`
   - `work_orders`
   - `work_order_subcategories`
   - `check_lists`
   - `check_list_measures`
2. Ejecuta:

```powershell
cd c:\YAMBOLY\sistema-ia-articulo\backend
.\.venv\Scripts\Activate.ps1
python -m app.ml.convert_cmms --vehicles path\vehicles.csv --km path\vehicle_km_history.csv --work-orders path\work_orders.csv --subcategories path\work_order_subcategories.csv --check-lists path\check_lists.csv --check-measures path\check_list_measures.csv --out data\raw\cohort_mock.csv
```

3. Si cambiaste `--out`, copia/renombra a `data/raw/cohort_mock.csv`.
4. Reentrena desde la UI (botón **Entrenar modelos**), o vía API:

```powershell
curl -X POST "http://127.0.0.1:8000/api/train?n_folds=5&do_tuning=true" -H "Authorization: Bearer TU_TOKEN"
```

## Postgres local (opcional)

Por defecto usa **SQLite** (`backend/data/app.db`) para cero fricción.

Si quieres Postgres 18 local:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE sistema_ia_articulo;"
```

En `backend/.env`:

```
DATABASE_URL=postgresql+psycopg2://postgres:TU_PASS@localhost:5432/sistema_ia_articulo
```

(La demo actual no requiere tablas de negocio; el ML lee CSV/Parquet.)

## Modelos

| Código | Algoritmo |
|---|---|
| M1 | Regresión Logística |
| M2 | Random Forest |
| M3 | XGBoost |
| H1 | Stacking LightGBM + CatBoost |
| H2 | Stacking MLP + SVM |

Mejor modelo → `backend/artifacts/best_model.joblib`

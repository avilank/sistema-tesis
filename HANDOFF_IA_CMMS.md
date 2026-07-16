# Handoff IA + CMMS — Flujo, setup y pautas de prueba

Documento para el **Desarrollador 2**: cómo está conectado el laboratorio ML (`sistema-ia-articulo`) con el CMMS (`service-mantenimiento` + `mantenimiento-app`), qué ya existe y cómo probarlo.

---

## 1. Piezas (3 repos)

| Repo | Rol |
|------|-----|
| `sistema-ia-articulo` | Laboratorio: entrena modelos → `best_model.joblib` + sirve `POST /predict` |
| `service-mantenimiento` | CMMS backend: arma features desde BD, llama al ML, guarda predicciones/sugerencias |
| `mantenimiento-app` | UI operativa: banner/badge de riesgo en tablero OT + bandeja de sugerencias |

**Regla de producto**

- El **jefe de planta** no entrena modelos ni carga features a mano.
- Usa datos que ya existen en el CMMS (vehículos, km, OT, checklists).
- El **laboratorio** (`sistema-ia-articulo`) es solo para análisis / tesis / reentrenar.

---

## 2. Flujo final

```
1) Analista / Dev1
   sistema-ia-articulo → Entrenar modelos → artifacts/best_model.joblib
   FastAPI en :8000  (GET /health, POST /predict)

2) CMMS backend (cron diario o manual)
   service-mantenimiento
   → construye features (km, OT, checklists) por asset
   → POST http://127.0.0.1:8000/predict  { assetId, features }
   → guarda en ai_failure_predictions
   → si failureProb >= umbral → crea sugerencia PENDING en ai_wo_suggestions

3) Jefe de planta (día a día)
   mantenimiento-app → /dashboard/workorders
   → banner "Vehículos en riesgo"
   → badge IA en tarjeta OT
   → /dashboard/ai-suggestions → aceptar/rechazar
      (aceptar crea OT real en el CMMS)
```

---

## 3. Qué ya existe (no rehacer)

### 3.1 ML — `sistema-ia-articulo/backend`

- Entrenamiento y métricas en el dashboard demo (`frontend/`).
- Artefacto: `backend/artifacts/best_model.joblib`
- Endpoints para Nest (sin auth de demo, en la raíz):
  - `GET /health`
  - `POST /predict` — body: `{ assetId, features, asOf? }`
- Archivo: `app/ml/serve_predict.py` (incluido desde `app/main.py`)

### 3.2 Backend Nest — `service-mantenimiento`

Módulo: `src/modules/ai-predictions/`

| Pieza | Archivo / endpoint |
|-------|-------------------|
| Features desde CMMS | `services/ai-feature-builder.service.ts` |
| Cliente HTTP al ML | `services/ai-client.service.ts` |
| Persistencia + sugerencias | `services/ai-prediction.service.ts` |
| Alertas ranking | `GET /ai-predictions/risk-alerts` |
| Batch | `POST /ai-predictions/run-batch?limit=40` |
| Un asset | `POST /ai-predictions/asset/:assetId/predict` |
| Sugerencias | `GET /ai-predictions/suggestions` |
| Aceptar / rechazar | `POST .../suggestions/:id/accept` · `.../reject` |
| Cron | `src/jobs/ai-predictions/ai-prediction.job.ts` (05:00) |

**Env (`.env` del CMMS):**

```env
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SUGGESTION_THRESHOLD=0.6
AI_PREDICTION_HORIZON_DAYS=30
# AI_PREDICTION_JOB_ENABLED=false
```

Si el servicio Python está caído, Nest usa **heurística local** (no tumba el API).

Prefijo API habitual: `/api/v2/...`

### 3.3 Frontend — `mantenimiento-app`

| Pieza | Ubicación |
|-------|-----------|
| Banner riesgo | `src/components/dashboard/ai/RiskAlertsBanner.tsx` |
| Integrado en tablero OT | `WorkOrdersPage.tsx` |
| Badge en tarjeta | `WorkOrderCard.tsx` (`riskAlert`) |
| Hook | `src/presentation/hooks/server/ai/useRiskAlerts.ts` |
| Repo HTTP | `AiPredictionRepository.ts` → `/ai-predictions/risk-alerts` |
| Bandeja sugerencias | `/dashboard/ai-suggestions` |
| Card dashboard | `AiRiskCard.tsx` |

---

## 4. Cómo levantar (local)

### 4.1 Servicio ML (puerto 8000)

```powershell
cd c:\YAMBOLY\sistema-ia-articulo\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Check: http://127.0.0.1:8000/health

### 4.2 CMMS backend

Arrancar `service-mantenimiento` como siempre (Nest). Verificar `AI_SERVICE_URL` en `.env`.

### 4.3 Frontend operativo

```powershell
cd c:\YAMBOLY\mantenimiento-app
npm run dev
```

App: http://localhost:3000

### 4.4 Sembrar predicciones (obligatorio para ver UI)

Con sesión logueada (cookie JWT del CMMS):

```http
POST /api/v2/ai-predictions/run-batch?limit=40
```

Sin esto, el banner suele quedar vacío (no hay filas en `ai_failure_predictions`).

---

## 5. Pautas de prueba (Dev2)

### 5.1 Checklist de preparación

- [ ] Migraciones tablas `ai_*` aplicadas
- [ ] `AI_SERVICE_URL` apunta a `:8000`
- [ ] Existe `sistema-ia-articulo/backend/artifacts/best_model.joblib`
- [ ] Los 3 servicios arriba

### 5.2 Health del modelo

```http
GET http://127.0.0.1:8000/health
```

Esperado: `status: ok`, idealmente `modelLoaded: true`.

### 5.3 Generar predicciones

```http
POST /api/v2/ai-predictions/run-batch?limit=40
```

Esperado: `success: true`, `processed` > 0, `ok` > 0.

Un solo vehículo:

```http
POST /api/v2/ai-predictions/asset/{assetId}/predict
Body (opcional): { "asOf": "2026-06-01" }
```

### 5.4 Verificar API de alertas

```http
GET /api/v2/ai-predictions/risk-alerts?minProb=0.4&limit=15
```

Esperado: items con `assetId`, `code`, `failureProb`, `riesgo` (`alto` | `medio` | `bajo`).

```http
GET /api/v2/ai-predictions/suggestions?status=PENDING
```

Esperado: sugerencias si `failureProb >= AI_SUGGESTION_THRESHOLD`.

### 5.5 Probar UI operativa

1. Login en `mantenimiento-app`.
2. Ir a **Tablero OT** → `/dashboard/workorders`.
3. Verificar:
   - Banner “Vehículos en riesgo (IA · 30 días)” (si hay alertas ≥ 0.4).
   - Badge `IA alto/medio` en tarjetas cuyo `assetId` esté en riesgo.
4. Dashboard general: card **Sugerencias IA**.
5. `/dashboard/ai-suggestions`:
   - **Aceptar** → crea OT real; deja de estar PENDING.
   - **Rechazar** → no crea OT.

### 5.6 Casos negativos (obligatorios)

| Prueba | Acción | Esperado |
|--------|--------|----------|
| ML apagado | Parar FastAPI y llamar `run-batch` / predict | Heurística Nest; API no cae |
| Sin predicciones | BD sin filas `ai_*` | Banner vacío / sin crash |
| Threshold alto | `AI_SUGGESTION_THRESHOLD=0.95` + batch | Pocas o ninguna sugerencia |
| Scope | Si hay `ai_module_scope` restrictivo | Asset fuera de scope no predice / null |

### 5.7 Checklist de aceptación

- [ ] `/health` ML OK
- [ ] `run-batch` inserta en `ai_failure_predictions`
- [ ] `risk-alerts` devuelve códigos reales (`code` / placa)
- [ ] Banner visible en tablero OT
- [ ] Badge en tarjeta OT
- [ ] Aceptar sugerencia crea OT
- [ ] Rechazar no crea OT
- [ ] El front operativo **no** expone “Entrenar modelos” (eso es solo laboratorio)

### 5.8 Orden rápido (~15 min)

1. `GET /health` (ML)
2. `POST /ai-predictions/run-batch?limit=20`
3. `GET /ai-predictions/risk-alerts`
4. Tablero OT (banner + badge)
5. Aceptar 1 sugerencia
6. Apagar ML → `POST .../asset/:id/predict` → confirma fallback

---

## 6. Qué le toca continuar a Dev2

1. Probar E2E en su máquina / ambiente de pruebas.
2. Confirmar migraciones `ai_*`.
3. Ajustar `AI_SUGGESTION_THRESHOLD` según negocio.
4. Validar / activar cron de predicción diaria.
5. Pulir UX (filtro sede, link a detalle de asset).
6. **No** rehacer el módulo `ai-predictions` ni el laboratorio de tesis.

---

## 7. Troubleshooting

| Síntoma | Causa probable | Qué hacer |
|---------|----------------|-----------|
| Banner no aparece | No hay predicciones | Correr `run-batch` |
| `unavailable` alto en batch | ML caído o mal URL | Revisar `:8000/health` y `AI_SERVICE_URL` |
| Predice pero sin sugerencias | Prob &lt; umbral | Bajar `AI_SUGGESTION_THRESHOLD` o revisar scores |
| Códigos `VEH-xxx` en vez de placa | Falta merge `assets.code` en features/alerts | Verificar que el asset tenga `code` y que el listado de risk-alerts lo incluya |
| Laboratorio muestra 2430 filas | Cohorte sintética vieja | Regenerar desde `data/raw/exports` (backup en `exports/_backup_before_synthetic/`) |

### Regenerar cohorte real (laboratorio)

```powershell
cd c:\YAMBOLY\sistema-ia-articulo\backend
python -m app.ml.convert_cmms `
  --vehicles data\raw\exports\vehicles.csv `
  --km data\raw\exports\vehicle_km_history.csv `
  --work-orders data\raw\exports\work_orders.csv `
  --subcategories data\raw\exports\work_order_subcategories.csv `
  --check-lists data\raw\exports\check_lists.csv `
  --check-measures data\raw\exports\check_list_measures.csv `
  --assets data\raw\exports\assets.csv `
  --out data\raw\cohort_mock.csv
```

Esperado (~datos reales actuales): **~364 filas**, ~157 vehículos, ~9% positivos. Luego reentrenar en el dashboard del laboratorio.

---

## 8. Mensaje corto para Dev2

> Ya está conectado: el laboratorio entrena y expone `/predict` en `:8000`. Nest arma features del CMMS, predice, guarda alertas/sugerencias. El front muestra riesgo en el tablero de OT y la bandeja IA. Tu tarea: correr `run-batch`, verificar banner/badge, cron y umbrales; no rehacer el módulo `ai-predictions`.

---

## 9. Referencias de rutas clave

```
sistema-ia-articulo/
  backend/app/ml/serve_predict.py
  backend/artifacts/best_model.joblib
  backend/data/raw/cohort_mock.csv
  backend/data/raw/exports/

service-mantenimiento/
  src/modules/ai-predictions/
  src/jobs/ai-predictions/ai-prediction.job.ts
  .env  → AI_SERVICE_URL

mantenimiento-app/
  src/components/dashboard/ai/RiskAlertsBanner.tsx
  src/components/dashboard/workorders/views/work-orders/WorkOrdersPage.tsx
  src/app/dashboard/ai-suggestions/page.tsx
```

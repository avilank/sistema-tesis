# Backend FastAPI + pipeline ML (XGBoost, LightGBM, CatBoost, reportes)
FROM python:3.11-slim-bookworm

# Dependencias de sistema para OpenMP, CatBoost, matplotlib/reportlab
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libglib2.0-0 \
    libgthread-2.0-0 \
    libfreetype6 \
    libpng16-16 \
    fonts-dejavu-core \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    MPLBACKEND=Agg

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel \
    && pip install -r requirements.txt

COPY app ./app

# Directorios persistentes: SQLite, dataset mock, modelos y reportes
RUN mkdir -p data/raw data/processed artifacts/figures artifacts/reports \
    && adduser --disabled-password --gecos "" --uid 10001 appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

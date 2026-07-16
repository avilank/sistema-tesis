"""Estado del entrenamiento ML en segundo plano (polling desde el frontend)."""

from __future__ import annotations

import asyncio
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from app.ml.pipeline import run_full_pipeline


class TrainStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class TrainJobState:
    status: TrainStatus = TrainStatus.IDLE
    step: str = ""
    progress: int = 0
    error: str | None = None
    best_model: str | None = None
    started_at: str | None = None
    finished_at: str | None = None


_state = TrainJobState()
_lock = asyncio.Lock()
_bg_task: asyncio.Task | None = None


def get_train_status() -> dict[str, Any]:
    data = asdict(_state)
    data["status"] = _state.status.value
    return data


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _set_progress(step: str, progress: int) -> None:
    _state.step = step
    _state.progress = max(0, min(progress, 100))


def _progress_callback(step: str, progress: int) -> None:
    _set_progress(step, progress)


async def start_train_job(n_folds: int, do_tuning: bool) -> dict[str, Any]:
    global _bg_task

    async with _lock:
        if _state.status == TrainStatus.RUNNING:
            raise RuntimeError("Ya hay un entrenamiento en curso.")

        _state.status = TrainStatus.RUNNING
        _state.step = "preparing_data"
        _state.progress = 0
        _state.error = None
        _state.best_model = None
        _state.started_at = _now_iso()
        _state.finished_at = None

        _bg_task = asyncio.create_task(_run_worker(n_folds, do_tuning))

    return {
        "status": TrainStatus.RUNNING.value,
        "message": "Entrenamiento iniciado",
        "started_at": _state.started_at,
    }


async def _run_worker(n_folds: int, do_tuning: bool) -> None:
    try:
        result = await asyncio.to_thread(
            run_full_pipeline,
            n_folds,
            do_tuning,
            _progress_callback,
        )
        _state.status = TrainStatus.COMPLETED
        _state.best_model = result.get("best_model")
        _state.step = "done"
        _state.progress = 100
    except Exception as exc:  # noqa: BLE001 — persistir error para polling
        _state.status = TrainStatus.FAILED
        _state.error = str(exc) or "Error desconocido durante el entrenamiento"
        _state.step = "failed"
    finally:
        _state.finished_at = _now_iso()


def is_train_running() -> bool:
    return _state.status == TrainStatus.RUNNING

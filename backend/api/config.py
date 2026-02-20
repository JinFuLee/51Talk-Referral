"""
配置管理 API 端点
面板配置、月度目标、汇率
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

CONFIG_DIR = PROJECT_ROOT / "config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

PANEL_CONFIG_FILE = CONFIG_DIR / "panel_config.json"
TARGETS_OVERRIDE_FILE = CONFIG_DIR / "targets_override.json"
EXCHANGE_RATE_FILE = CONFIG_DIR / "exchange_rate.json"

router = APIRouter()

_service: Any = None


def set_service(service: Any) -> None:
    global _service
    _service = service


# ── Helpers ───────────────────────────────────────────────────────────────────

def _read_json(path: Path, default: Any = None) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return default
    return default


def _write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ── Request Models ────────────────────────────────────────────────────────────

class ExchangeRateBody(BaseModel):
    rate: float


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/panel")
def get_panel_config() -> dict[str, Any]:
    """读取面板配置 panel_config.json"""
    data = _read_json(PANEL_CONFIG_FILE, {})
    return data


@router.put("/panel")
def put_panel_config(body: dict[str, Any]) -> dict[str, Any]:
    """写入面板配置 panel_config.json"""
    try:
        _write_json(PANEL_CONFIG_FILE, body)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"status": "ok"}


@router.get("/targets")
def get_targets_all() -> dict[str, Any]:
    """返回全部月度目标（含 override）"""
    from core.config import MONTHLY_TARGETS
    base = dict(MONTHLY_TARGETS)
    overrides = _read_json(TARGETS_OVERRIDE_FILE, {})
    # 合并覆盖
    for month, vals in overrides.items():
        if month in base:
            base[month].update(vals)
        else:
            base[month] = vals
    return base


@router.get("/monthly-targets")
def get_monthly_targets() -> list[dict[str, Any]]:
    """返回所有月份目标列表"""
    from core.config import MONTHLY_TARGETS
    overrides = _read_json(TARGETS_OVERRIDE_FILE, {})
    result = []
    for month, vals in MONTHLY_TARGETS.items():
        merged = dict(vals)
        if month in overrides:
            merged.update(overrides[month])
        result.append({"month": month, **merged})
    return result


@router.put("/targets/{month}")
def put_targets_month(month: str, body: dict[str, Any]) -> dict[str, Any]:
    """更新指定月份目标，持久化到 targets_override.json"""
    if len(month) != 6 or not month.isdigit():
        raise HTTPException(status_code=400, detail="month 格式应为 YYYYMM（如 202602）")
    overrides = _read_json(TARGETS_OVERRIDE_FILE, {})
    overrides[month] = {**(overrides.get(month) or {}), **body}
    try:
        _write_json(TARGETS_OVERRIDE_FILE, overrides)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"status": "ok", "month": month, "updated": body}


@router.get("/exchange-rate")
def get_exchange_rate() -> dict[str, Any]:
    """返回当前汇率"""
    from core.config import EXCHANGE_RATE_THB_USD
    stored = _read_json(EXCHANGE_RATE_FILE, {})
    rate = stored.get("rate", EXCHANGE_RATE_THB_USD)
    return {"rate": rate, "unit": "THB/USD"}


@router.put("/exchange-rate")
def put_exchange_rate(body: ExchangeRateBody) -> dict[str, Any]:
    """更新汇率"""
    if body.rate <= 0:
        raise HTTPException(status_code=400, detail="汇率必须大于 0")
    try:
        _write_json(EXCHANGE_RATE_FILE, {"rate": body.rate})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"status": "ok", "rate": body.rate}

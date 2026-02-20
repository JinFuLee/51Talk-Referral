"""
通知与调度配置 API 端点
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

CONFIG_DIR = PROJECT_ROOT / "config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

NOTIFY_CONFIG_FILE = CONFIG_DIR / "notify_config.json"
SCHEDULE_CONFIG_FILE = CONFIG_DIR / "schedule_config.json"

router = APIRouter()

_service: Any = None


def set_service(service: Any) -> None:
    global _service
    _service = service


def _read_json(path: Path, default: Any = None) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return default
    return default


def _write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


@router.get("/config")
def get_notify_config() -> dict[str, Any]:
    """读取通知配置"""
    return _read_json(NOTIFY_CONFIG_FILE, {})


@router.put("/config")
def put_notify_config(body: dict[str, Any]) -> dict[str, Any]:
    """写入通知配置"""
    try:
        _write_json(NOTIFY_CONFIG_FILE, body)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"status": "ok"}


@router.post("/test")
def send_test_notification() -> dict[str, Any]:
    """发送测试通知"""
    try:
        from core.notifier import Notifier
        notify_config = _read_json(NOTIFY_CONFIG_FILE, {})
        notifier = Notifier(config=notify_config)
        result = notifier.send_test()
        return {"status": "ok", "result": result}
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=f"notifier 模块不可用: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/schedule")
def get_schedule_config() -> dict[str, Any]:
    """读取调度配置"""
    return _read_json(SCHEDULE_CONFIG_FILE, {})


@router.put("/schedule")
def put_schedule_config(body: dict[str, Any]) -> dict[str, Any]:
    """写入调度配置"""
    try:
        _write_json(SCHEDULE_CONFIG_FILE, body)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"status": "ok"}

"""
指标矩阵 API 端点
管理各岗位（CC/SS/LP）的指标激活配置
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from backend.models.indicator_matrix import MatrixUpdateBody

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
CONFIG_DIR = PROJECT_ROOT / "config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

MATRIX_OVERRIDE_FILE = CONFIG_DIR / "indicator_matrix_override.json"
PROJECT_CONFIG_FILE = PROJECT_ROOT / "projects" / "referral" / "config.json"

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────


def _read_json(path: Path, default: Any = None) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return default
    return default


def _write_json(path: Path, data: Any) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _get_project_config() -> dict[str, Any]:
    """读取 projects/referral/config.json"""
    data = _read_json(PROJECT_CONFIG_FILE, {})
    if not data:
        raise HTTPException(status_code=500, detail="无法读取项目配置文件")
    return data


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/indicator-matrix/registry", summary="获取指标注册表")
def get_indicator_registry() -> list[dict[str, Any]]:
    """返回 config.json 中的 indicator_registry 全量列表"""
    config = _get_project_config()
    registry = config.get("indicator_registry", [])
    if not registry:
        raise HTTPException(status_code=404, detail="指标注册表为空或不存在")
    return registry


@router.get("/indicator-matrix/matrix", summary="获取各岗位指标矩阵配置")
def get_indicator_matrix() -> dict[str, Any]:
    """读取 config.json indicator_matrix，与 override 合并返回"""
    config = _get_project_config()
    base_matrix: dict[str, Any] = config.get("indicator_matrix", {})
    if not base_matrix:
        raise HTTPException(status_code=404, detail="指标矩阵配置不存在")

    override = _read_json(MATRIX_OVERRIDE_FILE, {})

    # override 中有 role key 时，用 override 的 active 列表替换 base 的 active 列表
    merged: dict[str, Any] = {}
    for role, role_config in base_matrix.items():
        if role in override and "active" in override[role]:
            merged[role] = {**role_config, "active": override[role]["active"]}
        else:
            merged[role] = role_config

    return merged


@router.put("/indicator-matrix/matrix/{role}", summary="更新岗位指标激活列表")
def put_indicator_matrix(role: str, body: MatrixUpdateBody) -> dict[str, Any]:
    """
    更新指定岗位的 active 指标列表（仅 SS 或 LP）。
    CC 为只读，返回 403。
    验证：所有 ID 都在 registry 中且是 CC active 的子集。
    """
    role_upper = role.upper()

    if role_upper == "CC":
        raise HTTPException(
            status_code=403, detail="CC 岗位指标矩阵为只读，不允许修改"
        )

    if role_upper not in ("SS", "LP"):
        raise HTTPException(
            status_code=400,
            detail=f"不支持的岗位: {role}，仅允许 SS 或 LP",
        )

    config = _get_project_config()
    registry: list[dict[str, Any]] = config.get("indicator_registry", [])
    base_matrix: dict[str, Any] = config.get("indicator_matrix", {})

    # 所有注册的指标 ID 集合
    all_registry_ids = {item["id"] for item in registry}

    # CC 的 active 集合（作为上限）
    cc_active_set = set(base_matrix.get("CC", {}).get("active", []))

    # 校验：所有 ID 在注册表中
    invalid_ids = [id_ for id_ in body.active if id_ not in all_registry_ids]
    if invalid_ids:
        raise HTTPException(
            status_code=400,
            detail=f"以下指标 ID 不在注册表中: {invalid_ids}",
        )

    # 校验：所有 ID 是 CC active 的子集
    not_in_cc = [id_ for id_ in body.active if id_ not in cc_active_set]
    if not_in_cc:
        raise HTTPException(
            status_code=400,
            detail=f"以下指标不在 CC 激活列表中: {not_in_cc}",
        )

    # 写入 override
    override = _read_json(MATRIX_OVERRIDE_FILE, {})
    override[role_upper] = {"active": body.active}
    try:
        _write_json(MATRIX_OVERRIDE_FILE, override)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # 审计日志
    audit_path = PROJECT_ROOT / "output" / "indicator-matrix-changes.jsonl"
    audit_entry = {
        "ts": datetime.now(datetime.UTC).isoformat(),
        "action": "update",
        "role": role_upper,
        "active_count": len(body.active),
        "active": body.active,
    }
    try:
        with audit_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(audit_entry, ensure_ascii=False) + "\n")
    except Exception:
        pass  # 审计失败不阻塞业务

    return {"status": "ok", "role": role_upper, "active_count": len(body.active)}


@router.post(
    "/indicator-matrix/matrix/{role}/reset",
    summary="重置岗位指标配置为默认值",
)
def reset_indicator_matrix(role: str) -> dict[str, Any]:
    """
    删除 override 中对应 role 的配置，恢复 config.json 默认值。
    CC 为只读，返回 403。
    """
    role_upper = role.upper()

    if role_upper == "CC":
        raise HTTPException(
            status_code=403, detail="CC 岗位指标矩阵为只读，不允许重置"
        )

    if role_upper not in ("SS", "LP"):
        raise HTTPException(
            status_code=400,
            detail=f"不支持的岗位: {role}，仅允许 SS 或 LP",
        )

    override = _read_json(MATRIX_OVERRIDE_FILE, {})

    if role_upper not in override:
        return {
            "status": "ok",
            "role": role_upper,
            "message": "该岗位未有自定义配置，无需重置",
        }

    del override[role_upper]
    try:
        _write_json(MATRIX_OVERRIDE_FILE, override)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # 审计日志
    audit_path = PROJECT_ROOT / "output" / "indicator-matrix-changes.jsonl"
    audit_entry = {
        "ts": datetime.now(datetime.UTC).isoformat(),
        "action": "reset",
        "role": role_upper,
    }
    try:
        with audit_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(audit_entry, ensure_ascii=False) + "\n")
    except Exception:
        pass  # 审计失败不阻塞业务

    return {"status": "ok", "role": role_upper, "message": "已恢复默认配置"}

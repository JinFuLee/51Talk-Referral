"""
配置管理 API 端点
面板配置、月度目标、汇率、围场角色、打卡阈值
"""

from __future__ import annotations

import json
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from backend.core.data_manager import DataManager

from .dependencies import get_data_manager, get_service

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

CONFIG_DIR = PROJECT_ROOT / "config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

BACKUP_DIR = CONFIG_DIR / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

PANEL_CONFIG_FILE = CONFIG_DIR / "panel_config.json"
TARGETS_OVERRIDE_FILE = CONFIG_DIR / "targets_override.json"
EXCHANGE_RATE_FILE = CONFIG_DIR / "exchange_rate.json"
ENCLOSURE_ROLE_FILE = CONFIG_DIR / "enclosure_role_override.json"
CHECKIN_THRESHOLDS_FILE = CONFIG_DIR / "checkin_thresholds.json"
QUICKBI_SOURCE_FILE = CONFIG_DIR / "quickbi_source.json"

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
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _backup_config_file(path: Path) -> None:
    """PUT 写入前自动备份 config 文件，保留最近 10 个备份"""
    if not path.exists():
        return
    ts = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"{path.stem}_{ts}{path.suffix}"
    try:
        shutil.copy2(path, backup_path)
        # 保留最近 10 个备份，删除旧的
        backups = sorted(BACKUP_DIR.glob(f"{path.stem}_*{path.suffix}"), reverse=True)
        for old in backups[10:]:
            old.unlink(missing_ok=True)
    except Exception:
        pass  # 备份失败不阻塞业务


# ── Request Models ────────────────────────────────────────────────────────────


class ExchangeRateBody(BaseModel):
    rate: float


class PanelConfigUpdate(BaseModel):
    """面板配置更新：接受任意键值对，通过 model_extra 透传"""

    model_config = {"extra": "allow"}


class MonthTargetsUpdate(BaseModel):
    """月度目标更新：接受任意数值型键值对"""

    model_config = {"extra": "allow"}


class MonthlyTargetV2Body(BaseModel):
    """V2 月度目标结构入参：透传给 models.config.MonthlyTargetV2 校验"""

    model_config = {"extra": "allow"}


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/panel", summary="读取面板配置")
def get_panel_config() -> dict[str, Any]:
    """读取面板配置 panel_config.json"""
    data = _read_json(PANEL_CONFIG_FILE, {})
    return data


@router.put("/panel", summary="更新面板配置")
def put_panel_config(body: PanelConfigUpdate) -> dict[str, Any]:
    """写入面板配置 panel_config.json"""
    _backup_config_file(PANEL_CONFIG_FILE)
    try:
        _write_json(PANEL_CONFIG_FILE, body.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"status": "ok"}


@router.get("/targets", summary="获取所有月度目标（含 override）")
def get_targets_all() -> dict[str, Any]:
    """返回全部月度目标（含 override）"""
    from backend.core.config import MONTHLY_TARGETS

    base = dict(MONTHLY_TARGETS)
    overrides = _read_json(TARGETS_OVERRIDE_FILE, {})
    # 合并覆盖
    for month, vals in overrides.items():
        if month in base:
            base[month].update(vals)
        else:
            base[month] = vals
    return base


@router.get("/monthly-targets", summary="获取所有月份目标列表")
def get_monthly_targets() -> list[dict[str, Any]]:
    """返回所有月份目标列表"""
    from backend.core.config import MONTHLY_TARGETS

    overrides = _read_json(TARGETS_OVERRIDE_FILE, {})
    result = []
    for month, vals in MONTHLY_TARGETS.items():
        merged = dict(vals)
        if month in overrides:
            merged.update(overrides[month])
        result.append({"month": month, **merged})
    return result


@router.put("/targets/{month}", summary="更新指定月份目标")
def put_targets_month(month: str, body: MonthTargetsUpdate) -> dict[str, Any]:
    """更新指定月份目标，持久化到 targets_override.json"""
    if len(month) != 6 or not month.isdigit():
        raise HTTPException(
            status_code=400, detail="month 格式应为 YYYYMM（如 202602）"
        )
    body_dict = body.model_dump()
    _backup_config_file(TARGETS_OVERRIDE_FILE)
    overrides = _read_json(TARGETS_OVERRIDE_FILE, {})
    overrides[month] = {**(overrides.get(month) or {}), **body_dict}
    try:
        _write_json(TARGETS_OVERRIDE_FILE, overrides)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"status": "ok", "month": month, "updated": body_dict}


@router.get("/exchange-rate", summary="获取当前汇率")
def get_exchange_rate() -> dict[str, Any]:
    """返回当前汇率"""
    from backend.core.config import EXCHANGE_RATE_THB_USD

    stored = _read_json(EXCHANGE_RATE_FILE, {})
    rate = stored.get("rate", EXCHANGE_RATE_THB_USD)
    return {"rate": rate, "unit": "THB/USD"}


@router.put("/exchange-rate", summary="更新汇率")
def put_exchange_rate(body: ExchangeRateBody) -> dict[str, Any]:
    """更新汇率"""
    if body.rate <= 0:
        raise HTTPException(status_code=400, detail="汇率必须大于 0")
    _backup_config_file(EXCHANGE_RATE_FILE)
    try:
        _write_json(EXCHANGE_RATE_FILE, {"rate": body.rate})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"status": "ok", "rate": body.rate}


# ── V2 月目标 ──────────────────────────────────────────────────────────────────


@router.get("/targets/{month}/v2", summary="获取 V2 分层月度目标")
def get_targets_v2(month: str) -> dict[str, Any]:
    """返回完整 V2 结构（无 V2 记录则从扁平数据合成）"""
    if len(month) != 6 or not month.isdigit():
        raise HTTPException(status_code=400, detail="month 格式应为 YYYYMM")

    overrides = _read_json(TARGETS_OVERRIDE_FILE, {})
    month_override = overrides.get(month, {})

    # 如果 override 有 version=2 直接返回
    if month_override.get("version") == 2:
        return month_override

    # 否则从扁平数据合成 V2
    from backend.core.config import MONTHLY_TARGETS

    flat = MONTHLY_TARGETS.get(month, {}).copy()
    if month in overrides:
        flat.update(overrides[month])

    return _synthesize_v2_from_flat(month, flat)


@router.put("/targets/{month}/v2", summary="保存 V2 分层月度目标")
def put_targets_v2(month: str, body: MonthlyTargetV2Body) -> dict[str, Any]:
    """保存 V2 结构到 targets_override.json (含强校验)"""
    from backend.models.config import MonthlyTargetV2

    if len(month) != 6 or not month.isdigit():
        raise HTTPException(status_code=400, detail="month 格式应为 YYYYMM")

    try:
        v2_model = MonthlyTargetV2(**body.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"数据格式错误: {exc}") from exc

    body_dict = v2_model.model_dump()
    body_dict["version"] = 2
    body_dict["month"] = month

    _backup_config_file(TARGETS_OVERRIDE_FILE)
    overrides = _read_json(TARGETS_OVERRIDE_FILE, {})
    overrides[month] = body_dict
    try:
        _write_json(TARGETS_OVERRIDE_FILE, overrides)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"status": "ok", "month": month}


@router.post("/targets/{month}/calculate", summary="双向计算目标（V2 结构）")
def calculate_targets(month: str, body: MonthlyTargetV2Body) -> dict[str, Any]:
    """接收部分 V2 输入，返回完整计算结果（双向计算）"""
    from backend.models.config import MonthlyTargetV2

    try:
        v2 = MonthlyTargetV2(**body.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "v2": v2.model_dump(),
        "flat": v2.flatten(),
    }


def _synthesize_v2_from_flat(month: str, flat: dict) -> dict:
    """从扁平目标合成 V2 结构"""
    sub = flat.get("子口径", {})
    total_amount = flat.get("金额目标", 0.0)
    asp = flat.get("客单价", 0.0)
    conv = flat.get("目标转化率", 0.0)

    cc_reg = sub.get("CC窄口径", {}).get("倒子目标", 0)
    ss_reg = sub.get("SS窄口径", {}).get("倒子目标", 0)
    lp_reg = sub.get("LP窄口径", {}).get("倒子目标", 0)
    wide_reg = sub.get("宽口径", {}).get("倒子目标", 0)

    return {
        "version": 2,
        "month": month,
        "hard": {
            "total_revenue": 0.0,
            "referral_pct": 0.0,
            "referral_revenue": total_amount,
            "display_currency": "USD",
            "lock_field": "amount",
        },
        "channels": {
            "cc_narrow": {
                "user_count": cc_reg,
                "asp": asp,
                "conversion_rate": conv,
                "reserve_rate": 0.0,
                "attend_rate": 0.0,
            },
            "ss_narrow": {
                "user_count": ss_reg,
                "asp": asp,
                "conversion_rate": conv,
                "reserve_rate": 0.0,
                "attend_rate": 0.0,
            },
            "lp_narrow": {
                "user_count": lp_reg,
                "asp": asp,
                "conversion_rate": conv,
                "reserve_rate": 0.0,
                "attend_rate": 0.0,
            },
            "wide": {
                "user_count": wide_reg,
                "asp": asp,
                "conversion_rate": conv,
                "reserve_rate": 0.0,
                "attend_rate": 0.0,
            },
        },
        "enclosures": {
            "d0_30": {
                "reach_rate": 0.0,
                "participation_rate": 0.0,
                "conversion_rate": 0.0,
                "checkin_rate": 0.0,
            },
            "d31_60": {
                "reach_rate": 0.0,
                "participation_rate": 0.0,
                "conversion_rate": 0.0,
                "checkin_rate": 0.0,
            },
            "d61_90": {
                "reach_rate": 0.0,
                "participation_rate": 0.0,
                "conversion_rate": 0.0,
                "checkin_rate": 0.0,
            },
            "d91_120": {
                "reach_rate": 0.0,
                "participation_rate": 0.0,
                "conversion_rate": 0.0,
                "checkin_rate": 0.0,
            },
            "d121_150": {
                "reach_rate": 0.0,
                "participation_rate": 0.0,
                "conversion_rate": 0.0,
                "checkin_rate": 0.0,
            },
            "d151_180": {
                "reach_rate": 0.0,
                "participation_rate": 0.0,
                "conversion_rate": 0.0,
                "checkin_rate": 0.0,
            },
            "d6M": {
                "reach_rate": 0.0,
                "participation_rate": 0.0,
                "conversion_rate": 0.0,
                "checkin_rate": 0.0,
            },
            "d7M": {
                "reach_rate": 0.0,
                "participation_rate": 0.0,
                "conversion_rate": 0.0,
                "checkin_rate": 0.0,
            },
            "d8M": {
                "reach_rate": 0.0,
                "participation_rate": 0.0,
                "conversion_rate": 0.0,
                "checkin_rate": 0.0,
            },
            "d9M": {
                "reach_rate": 0.0,
                "participation_rate": 0.0,
                "conversion_rate": 0.0,
                "checkin_rate": 0.0,
            },
            "d10M": {
                "reach_rate": 0.0,
                "participation_rate": 0.0,
                "conversion_rate": 0.0,
                "checkin_rate": 0.0,
            },
            "d11M": {
                "reach_rate": 0.0,
                "participation_rate": 0.0,
                "conversion_rate": 0.0,
                "checkin_rate": 0.0,
            },
            "d12M": {
                "reach_rate": 0.0,
                "participation_rate": 0.0,
                "conversion_rate": 0.0,
                "checkin_rate": 0.0,
            },
            "d12M_plus": {
                "reach_rate": 0.0,
                "participation_rate": 0.0,
                "conversion_rate": 0.0,
                "checkin_rate": 0.0,
            },
        },
        "sop": {
            "checkin_rate": 0.0,
            "reach_rate": 0.0,
            "participation_rate": 0.0,
            "reserve_rate": flat.get("约课率目标", 0.0),
            "attend_rate": flat.get("出席率目标", 0.0),
            "outreach_calls_per_day": 0,
        },
    }


# ── 全链路目标自动拆解 ─────────────────────────────────────────────────────────


@router.get("/targets/decompose", summary="全链路目标自动拆解（基于上月实际转化率）")
def get_targets_decompose(
    revenue_target: float = 200444,
    svc=Depends(get_service),
) -> dict:
    """按上月各口径实际 revenue share 将总营收目标拆解到各漏斗层级。

    Args:
        revenue_target: 总收入目标（USD），如 200444

    Returns:
        {
            "total": {registrations, appointments, attendance, payments,
                      revenue_usd, conversion_rate, asp},
            "channels": {
                "CC窄口": {...}, "SS窄口": {...},
                "LP窄口": {...}, "宽口": {...}
            },
            "basis": "YYYYMM",
            "message": str | None,
        }
    """
    if revenue_target <= 0:
        raise HTTPException(status_code=400, detail="revenue_target 必须大于 0")

    from backend.core.daily_snapshot_service import DB_PATH, DailySnapshotService
    from backend.core.target_recommender import decompose_targets_from_last_month

    snapshot_svc = DailySnapshotService(DB_PATH)
    result = decompose_targets_from_last_month(snapshot_svc, revenue_target)
    return result


# ── 智能目标推荐 ────────────────────────────────────────────────────────────────


@router.get("/targets/{month}/recommend", summary="智能目标推荐（三档场景）")
def get_target_recommendations(
    month: str,
    svc=Depends(get_service),
) -> dict[str, Any]:
    """智能目标推荐：三档场景 + 可行性评估"""
    if len(month) != 6 or not month.isdigit():
        raise HTTPException(status_code=400, detail="month 格式应为 YYYYMM")

    from backend.core.config import MONTHLY_TARGETS

    # ── 1. 计算历史增长率 ────────────────────────────────────────────────────
    sorted_months = sorted(MONTHLY_TARGETS.keys())
    growth_rates = {"reg": 0.1, "paid": 0.1, "revenue": 0.15}  # 默认 fallback

    if len(sorted_months) >= 2:
        prev_key = sorted_months[-2]
        curr_key = sorted_months[-1]
        prev = MONTHLY_TARGETS[prev_key]
        curr = MONTHLY_TARGETS[curr_key]

        def safe_growth(curr_val: float, prev_val: float) -> float:
            if prev_val and prev_val > 0:
                return (curr_val - prev_val) / prev_val
            return 0.1

        growth_rates = {
            "reg": safe_growth(curr.get("注册目标", 0), prev.get("注册目标", 0)),
            "paid": safe_growth(curr.get("付费目标", 0), prev.get("付费目标", 0)),
            "revenue": safe_growth(curr.get("金额目标", 0), prev.get("金额目标", 0)),
        }

    # ── 2. 获取当前月目标作为基准 ────────────────────────────────────────────
    base_targets = MONTHLY_TARGETS.get(
        month, MONTHLY_TARGETS.get(sorted_months[-1], {})
    )
    base_reg = base_targets.get("注册目标", 0)
    base_paid = base_targets.get("付费目标", 0)
    base_revenue = base_targets.get("金额目标", 0.0)
    base_asp = base_targets.get("客单价", 850)
    base_conv = base_targets.get("目标转化率", 0.23)
    sub = base_targets.get("子口径", {})

    # 渠道比例（从子口径推算，或默认比例）
    cc_reg = sub.get("CC窄口径", {}).get("倒子目标", 0)
    ss_reg = sub.get("SS窄口径", {}).get("倒子目标", 0)
    lp_reg = sub.get("LP窄口径", {}).get("倒子目标", 0)
    wide_reg = sub.get("宽口径", {}).get("倒子目标", 0)

    total_sub = cc_reg + ss_reg + lp_reg + wide_reg
    if total_sub > 0:
        ratios = {
            "cc": cc_reg / total_sub,
            "ss": ss_reg / total_sub,
            "lp": lp_reg / total_sub,
            "wide": wide_reg / total_sub,
        }
    else:
        ratios = {"cc": 0.25, "ss": 0.10, "lp": 0.10, "wide": 0.55}

    # ── 3. 生成三档场景 ──────────────────────────────────────────────────────
    def make_scenario(multiplier: float, label: str) -> dict:
        reg = int(base_reg * multiplier)
        paid = int(base_paid * multiplier)
        revenue = round(base_revenue * multiplier, 2)
        return {
            "label": label,
            "multiplier": round(multiplier, 3),
            "summary": {
                "注册目标": reg,
                "付费目标": paid,
                "金额目标": revenue,
            },
            "v2_prefill": {
                "hard": {
                    "referral_revenue": revenue,
                    "lock_field": "amount",
                },
                "channels": {
                    "cc_narrow": {
                        "user_count": int(reg * ratios["cc"]),
                        "asp": base_asp,
                        "conversion_rate": base_conv,
                    },
                    "ss_narrow": {
                        "user_count": int(reg * ratios["ss"]),
                        "asp": base_asp,
                        "conversion_rate": base_conv,
                    },
                    "lp_narrow": {
                        "user_count": int(reg * ratios["lp"]),
                        "asp": base_asp,
                        "conversion_rate": base_conv,
                    },
                    "wide": {
                        "user_count": int(reg * ratios["wide"]),
                        "asp": base_asp,
                        "conversion_rate": base_conv,
                    },
                },
                "sop": {
                    "reserve_rate": base_targets.get("约课率目标", 0.77),
                    "attend_rate": base_targets.get("出席率目标", 0.66),
                },
            },
        }

    scenarios = {
        "conservative": make_scenario(1.0, "保守（持平）"),
        "base": make_scenario(1.0 + growth_rates["revenue"], "基准（趋势延伸）"),
        "aggressive": make_scenario(
            1.0 + growth_rates["revenue"] * 1.5, "激进（加速增长）"
        ),
    }

    # ── 4. 可行性评估（当月） ────────────────────────────────────────────────
    feasibility = _calculate_feasibility(svc, month, base_targets)

    return {
        "month": month,
        "growth_rates": {k: round(v, 4) for k, v in growth_rates.items()},
        "scenarios": scenarios,
        "feasibility": feasibility,
    }


# ── 围场角色配置 ────────────────────────────────────────────────────────────────


@router.get("/enclosure-role", summary="获取围场-岗位负责配置")
def get_enclosure_role() -> dict[str, Any]:
    """返回围场角色配置（narrow + wide），含 override 合并。

    数据源优先级：enclosure_role_override.json > config.json > Pydantic 默认值
    """
    from backend.core.project_config import load_project_config

    cfg = load_project_config("referral")

    # 从 config.json 读取基线（enclosure_role_narrow/wide 是独立顶层字段）
    base: dict[str, Any] = {
        "narrow": cfg.enclosure_role_narrow
        if hasattr(cfg, "enclosure_role_narrow")
        else {},
        "wide": cfg.enclosure_role_wide if hasattr(cfg, "enclosure_role_wide") else {},
    }

    # override 文件覆盖（Settings UI 写入）
    override = _read_json(ENCLOSURE_ROLE_FILE, {})
    if override:
        for key in ("narrow", "wide"):
            if key in override:
                base[key] = override[key]
    return base


@router.put("/enclosure-role", summary="更新围场-岗位负责配置")
def put_enclosure_role(body: dict[str, Any]) -> dict[str, Any]:
    """保存围场角色配置到 override 文件"""
    _backup_config_file(ENCLOSURE_ROLE_FILE)
    try:
        _write_json(ENCLOSURE_ROLE_FILE, body)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"status": "ok"}


# ── 打卡阈值配置 ────────────────────────────────────────────────────────────────


@router.get("/checkin-thresholds", summary="获取打卡率阈值")
def get_checkin_thresholds() -> dict[str, Any]:
    """返回打卡率阈值配置"""
    default: dict[str, Any] = {"good": 0.6, "warning": 0.3, "danger": 0.0}
    return _read_json(CHECKIN_THRESHOLDS_FILE, default)


@router.put("/checkin-thresholds", summary="更新打卡率阈值")
def put_checkin_thresholds(body: dict[str, Any]) -> dict[str, Any]:
    """保存打卡率阈值到 config 文件"""
    _backup_config_file(CHECKIN_THRESHOLDS_FILE)
    try:
        _write_json(CHECKIN_THRESHOLDS_FILE, body)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"status": "ok"}


# ── Quick BI 数据源配置 ──────────────────────────────────────────────────────


class QuickBIUrlUpdate(BaseModel):
    dashboard_url: str


@router.get("/quickbi-source", summary="读取 Quick BI 数据源配置")
def get_quickbi_source() -> dict[str, Any]:
    """返回 Quick BI 仪表板 URL 和表格配置。"""
    cfg = _read_json(QUICKBI_SOURCE_FILE, {})
    return {
        "dashboard_url": cfg.get("dashboard_url", ""),
        "tables": cfg.get("tables", []),
        "last_updated": cfg.get("last_updated"),
    }


@router.put("/quickbi-source", summary="更新 Quick BI 仪表板 URL")
def put_quickbi_source(body: QuickBIUrlUpdate) -> dict[str, Any]:
    """更新 accessTicket 过期后的新链接。"""
    url = body.dashboard_url.strip()
    if not url.startswith("https://bi.aliyuncs.com/"):
        raise HTTPException(
            status_code=400,
            detail="URL 必须以 https://bi.aliyuncs.com/ 开头",
        )
    cfg = _read_json(QUICKBI_SOURCE_FILE, {})
    old_url = cfg.get("dashboard_url", "")
    cfg["dashboard_url"] = url
    cfg["last_updated"] = datetime.now(UTC).isoformat()
    _backup_config_file(QUICKBI_SOURCE_FILE)
    _write_json(QUICKBI_SOURCE_FILE, cfg)
    return {
        "status": "ok",
        "url_changed": url != old_url,
    }


# ── 围场过程指标目标（从 D2 推导）──────────────────────────────────────────────


@router.get("/enclosure-targets", summary="获取围场级过程指标目标（D2 均值推导）")
def get_enclosure_targets(
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    """返回各围场的过程指标均值，用于 Settings 页面"围场目标"展示。

    从 D2（围场过程数据_byCC）按围场 groupby，取每个围场的平均值。

    Returns:
        {
            "overall": {checkin_rate, cc_contact_rate, ss_contact_rate,
                        lp_contact_rate, participation_rate},
            "by_enclosure": {
                "0~30": {checkin_rate, ...},
                ...
            }
        }
    """
    import pandas as pd

    try:
        data = dm.load_all()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"数据加载失败: {exc}") from exc

    d2 = data.get("enclosure_cc")
    if d2 is None or not hasattr(d2, "columns"):
        return {"overall": {}, "by_enclosure": {}}

    _COLS = {
        "checkin_rate": "当月有效打卡率",
        "cc_contact_rate": "CC触达率",
        "ss_contact_rate": "SS触达率",
        "lp_contact_rate": "LP触达率",
        "participation_rate": "转介绍参与率",
    }

    def _safe_mean(df_: Any, col: str) -> float:
        if col not in df_.columns:
            return 0.0
        v = pd.to_numeric(df_[col], errors="coerce").mean()
        return round(float(v), 4) if not pd.isna(v) else 0.0

    # 过程指标均值仅用有效围场行（非有效围场过期学员不代表当前状态）
    d2_active = d2[d2["_is_active"]] if "_is_active" in d2.columns else d2

    overall = {
        en_key: _safe_mean(d2_active, zh_col)
        for en_key, zh_col in _COLS.items()
    }

    by_enclosure: dict[str, dict[str, float]] = {}
    if "围场" in d2_active.columns:
        for enc, group in d2_active.groupby("围场"):
            by_enclosure[str(enc)] = {
                en_key: _safe_mean(group, zh_col)
                for en_key, zh_col in _COLS.items()
            }

    return {"overall": overall, "by_enclosure": by_enclosure}


# ── WMA 三档推荐（新） ──────────────────────────────────────────────────────


@router.get("/targets/recommend", summary="WMA 三档目标推荐（Holt 1957）")
def get_targets_recommend(
    n_months: int = 6,
) -> dict[str, Any]:
    """基于 WMA+线性趋势生成三档目标推荐（稳达标/冲刺/大票）。

    返回完整全链路拆解：总目标 → 各口径（CC窄口/SS窄口/LP窄口/宽口）
    × 漏斗（注册→预约→出席→付费→业绩）。

    Args:
        n_months: 使用最近 n 个月历史数据，默认 6
    """
    if n_months < 3 or n_months > 24:
        raise HTTPException(status_code=400, detail="n_months 范围 3-24")

    from backend.core.daily_snapshot_service import DB_PATH, DailySnapshotService
    from backend.core.target_recommender import recommend_targets_wma

    snapshot_svc = DailySnapshotService(DB_PATH)
    result = recommend_targets_wma(snapshot_svc, n_months)
    return result


@router.get("/targets/tiers", summary="三档目标场景预览（稳达标/占比达标/自定义）")
def get_target_tiers(
    request: Request,
    company_revenue: float = 0,
    referral_share: float = 0.30,
    include_custom: bool = False,
    revenue_target: float = 0,
    asp: float = 0,
    reg_to_pay_rate: float = 0,
    registrations: float = 0,
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    """返回三档目标场景预览。

    一档（pace）全自动；二档（share）需 company_revenue；三档（custom）需传自定义参数。

    Args:
        company_revenue: 公司总业绩目标（USD），0 表示不计算二档
        referral_share:  转介绍占比（0-1），默认 0.30
        include_custom:  是否计算三档（需同时传入至少一个自定义参数）
        revenue_target:  三档：总收入目标（USD）
        asp:             三档：客单价（USD）
        reg_to_pay_rate: 三档：注册付费率（0-1）
        registrations:   三档：注册目标数量
    """
    from backend.core.daily_snapshot_service import DB_PATH, DailySnapshotService
    from backend.core.target_recommender import TargetTierEngine

    snapshot_svc = DailySnapshotService(DB_PATH)
    engine = TargetTierEngine(snapshot_svc)

    # 从 DataManager + D1 直接获取当前实绩和 bm_pct
    current_actuals: dict[str, Any] = {}
    bm_pct: float = 0.5

    try:
        from backend.core.channel_funnel_engine import ChannelFunnelEngine

        data = dm.load_all()

        # D1 泰国行
        d1 = data.get("result")
        if d1 is not None and hasattr(d1, "columns"):
            import pandas as pd
            from backend.core.data_manager import DataManager

            df = DataManager.filter_thai_region(d1, fallback_to_all=True)

            def _s(col: str) -> float:
                return float(
                    pd.to_numeric(df[col], errors="coerce").sum()
                ) if col in df.columns else 0.0

            reg = _s("转介绍注册数")
            appt = _s("预约数")
            attend = _s("出席数")
            pay = _s("转介绍付费数")
            rev = _s("总带新付费金额USD")

            current_actuals = {
                "registrations": reg,
                "appointments": appt,
                "attendance": attend,
                "payments": pay,
                "revenue_usd": rev,
                "appt_rate": appt / reg if reg > 0 else 0,
                "attend_rate": attend / appt if appt > 0 else 0,
                "paid_rate": pay / attend if attend > 0 else 0,
                "asp": rev / pay if pay > 0 else 0,
                "reg_to_pay_rate": pay / reg if reg > 0 else 0,
            }

            # BM% 从工作日计算
            from datetime import date, timedelta

            ref = date.today() - timedelta(days=1)
            from backend.core.daily_snapshot_service import _workday_index

            wi = _workday_index(ref)
            # 当月总工作日（近似 22）
            import calendar

            _, days_in_month = calendar.monthrange(ref.year, ref.month)
            total_wd = sum(
                1
                for d in range(1, days_in_month + 1)
                if date(ref.year, ref.month, d).weekday() != 2
            )
            bm_pct = wi / total_wd if total_wd > 0 else 0.5

            # 渠道口径
            funnel = ChannelFunnelEngine.from_data_dict(data)
            ch_data = funnel.compute()
            if ch_data:
                current_actuals["channels"] = {
                    ch: {
                        k: float(m.get(k) or 0)
                        for k in (
                            "registrations", "appointments",
                            "attendance", "payments",
                            "revenue_usd", "appt_rate",
                            "attend_rate", "paid_rate", "asp",
                        )
                    }
                    for ch, m in ch_data.items()
                    if ch != "其它"
                }
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(
            "获取当前实绩失败，使用空值: %s", exc
        )

    # 三档自定义参数（至少传一个才触发计算）
    custom_inputs: dict[str, Any] | None = None
    has_custom = (
        revenue_target > 0 or asp > 0 or reg_to_pay_rate > 0 or registrations > 0
    )
    if include_custom and has_custom:
        custom_inputs = {}
        if revenue_target > 0:
            custom_inputs["revenue_target"] = revenue_target
        if asp > 0:
            custom_inputs["asp"] = asp
        if reg_to_pay_rate > 0:
            custom_inputs["reg_to_pay_rate"] = reg_to_pay_rate
        if registrations > 0:
            custom_inputs["registrations"] = registrations

    result = engine.get_all_tiers(
        current_actuals=current_actuals,
        bm_pct=bm_pct,
        company_revenue=company_revenue,
        referral_share=referral_share,
        custom_inputs=custom_inputs,
    )
    result["bm_pct"] = round(bm_pct, 4)
    return result


@router.post(
    "/targets/apply",
    summary="一键应用三档目标（pace/share/custom）写入 targets_override",
)
def post_targets_apply_tiers(
    tier: str = "pace",
    month: str | None = None,
    company_revenue: float = 0,
    referral_share: float = 0.30,
    custom_inputs: dict[str, Any] | None = None,
    svc=Depends(get_service),
) -> dict[str, Any]:
    """将三档（pace/share/custom）目标写入本月 targets_override.json。

    Args:
        tier:            pace（稳达标）| share（占比达标）| custom（自定义）
        month:           YYYYMM，不传则使用当前自然月
        company_revenue: 二档专用，公司总业绩目标
        referral_share:  二档专用，转介绍占比
        custom_inputs:   三档自定义字段（revenue_target/asp/reg_to_pay_rate 等）
    """
    valid_tiers = {"pace", "share", "custom"}
    if tier not in valid_tiers:
        raise HTTPException(
            status_code=400,
            detail=f"tier 必须为 {valid_tiers} 之一",
        )

    from datetime import date

    if month is None:
        today = date.today()
        month = f"{today.year:04d}{today.month:02d}"

    if len(month) != 6 or not month.isdigit():
        raise HTTPException(status_code=400, detail="month 格式应为 YYYYMM")

    from backend.core.daily_snapshot_service import DB_PATH, DailySnapshotService
    from backend.core.target_recommender import TargetTierEngine

    snapshot_svc = DailySnapshotService(DB_PATH)
    engine = TargetTierEngine(snapshot_svc)

    # 生成指定档位数据
    if tier == "pace":
        current_actuals: dict[str, Any] = {}
        bm_pct = 0.5
        if svc is not None:
            cached = svc.get_cached_result()
            if cached:
                summary = cached.get("summary", {})
                bm_pct = float(cached.get("time_progress") or 0.5)

                def _pick(key: str, sub: str = "actual") -> float:
                    block = summary.get(key, {})
                    return float(block.get(sub, 0) if isinstance(block, dict) else 0)

                current_actuals = {
                    "registrations": _pick("registrations"),
                    "appointments":  _pick("appointments"),
                    "attendance":    _pick("attendance"),
                    "payments":      _pick("payments"),
                    "revenue_usd":   _pick("revenue"),
                }
                for rate_key in ("appt_rate", "attend_rate", "paid_rate", "asp"):
                    v = summary.get(rate_key)
                    if isinstance(v, dict):
                        current_actuals[rate_key] = float(v.get("actual", 0))
                    elif v is not None:
                        current_actuals[rate_key] = float(v)
        tier_data = engine.tier_pace(current_actuals, bm_pct)

    elif tier == "share":
        if company_revenue <= 0:
            raise HTTPException(
                status_code=400, detail="share 档需要 company_revenue > 0"
            )
        tier_data = engine.tier_share(company_revenue, referral_share)

    else:  # custom
        tier_data = engine.tier_custom(custom_inputs or {})

    total = tier_data["total"]
    channels = tier_data["channels"]

    # 构建写入 targets_override 的扁平结构（兼容现有格式）
    sub_口径: dict[str, Any] = {}
    for ch_name, ch_data in channels.items():
        key_map = {
            "CC窄口": "CC窄口径",
            "SS窄口": "SS窄口径",
            "LP窄口": "LP窄口径",
            "宽口":   "宽口径",
        }
        legacy_key = key_map.get(ch_name, ch_name)
        sub_口径[legacy_key] = {
            "倒子目标": round(ch_data.get("registrations", 0)),
        }

    import datetime as _dt

    override_payload: dict[str, Any] = {
        "注册目标":   round(total.get("registrations", 0)),
        "付费目标":   round(total.get("payments", 0)),
        "金额目标":   round(total.get("revenue_usd", 0), 2),
        "客单价":     round(total.get("asp", 0), 2),
        "目标转化率": round(total.get("reg_to_pay_rate", 0), 6),
        "子口径":     sub_口径,
        "_tier_engine":    "TargetTierEngine",
        "_tier":           tier,
        "_tier_label":     tier_data.get("label", ""),
        "_applied_at":     _dt.datetime.utcnow().isoformat() + "Z",
    }

    _backup_config_file(TARGETS_OVERRIDE_FILE)
    overrides = _read_json(TARGETS_OVERRIDE_FILE, {})
    overrides[month] = {**(overrides.get(month) or {}), **override_payload}
    try:
        _write_json(TARGETS_OVERRIDE_FILE, overrides)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "status":  "ok",
        "month":   month,
        "tier":    tier,
        "label":   tier_data.get("label", ""),
        "applied": {
            "total":    total,
            "channels": {ch: v["registrations"] for ch, v in channels.items()},
        },
    }


def _calculate_feasibility(svc: Any, month: str, targets: dict) -> dict:
    """计算当月目标可行性"""
    result: dict[str, Any] = {
        "score": None,
        "label": "数据不足",
        "detail": {},
        "confidence": "low",
    }

    if svc is None:
        return result

    cached = svc.get_cached_result()
    if cached is None:
        return result

    summary = cached.get("summary", {})
    time_progress = cached.get("time_progress", 0)
    prediction = cached.get("prediction", {})

    if not summary or time_progress <= 0:
        return result

    details: dict[str, Any] = {}
    scores: list[float] = []

    # 对每个关键指标计算可行性
    metric_map = {
        "registrations": ("注册目标", "注册"),
        "payments": ("付费目标", "付费"),
        "revenue": ("金额目标", "金额"),
    }

    for eng_key, (target_key, label) in metric_map.items():
        target_val = targets.get(target_key, 0)
        if target_val <= 0:
            continue

        # 从 summary 取实绩
        metric_data = summary.get(eng_key, {})
        actual = metric_data.get("actual", 0) if isinstance(metric_data, dict) else 0

        # 节奏比
        pace_ratio = (actual / target_val) / time_progress if time_progress > 0 else 0

        # 预测值（如果有）
        pred_key = f"eom_{eng_key}"
        pred_val = prediction.get(pred_key)

        if pred_val and pred_val > 0:
            predicted_ratio = pred_val / target_val
            score = predicted_ratio
        else:
            score = pace_ratio

        details[label] = {
            "actual": actual,
            "target": target_val,
            "pace_ratio": round(pace_ratio, 3),
            "predicted_completion": round(score, 3),
        }
        scores.append(score)

    if not scores:
        return result

    avg_score = sum(scores) / len(scores)

    # 转为概率描述
    if avg_score >= 1.0:
        label_str = "高概率达成"
        pct = "90%+"
        confidence = "high"
    elif avg_score >= 0.85:
        label_str = "基本可达"
        pct = "70-90%"
        confidence = "medium"
    elif avg_score >= 0.7:
        label_str = "有挑战"
        pct = "50-70%"
        confidence = "medium"
    elif avg_score >= 0.5:
        label_str = "风险较大"
        pct = "30-50%"
        confidence = "low"
    else:
        label_str = "难度极高"
        pct = "<30%"
        confidence = "low"

    return {
        "score": round(avg_score, 3),
        "label": label_str,
        "probability": pct,
        "detail": details,
        "confidence": confidence,
    }

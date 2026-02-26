"""
配置管理 API 端点
面板配置、月度目标、汇率
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .dependencies import get_service
from services.analysis_service import AnalysisService

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

CONFIG_DIR = PROJECT_ROOT / "config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

PANEL_CONFIG_FILE = CONFIG_DIR / "panel_config.json"
TARGETS_OVERRIDE_FILE = CONFIG_DIR / "targets_override.json"
EXCHANGE_RATE_FILE = CONFIG_DIR / "exchange_rate.json"

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

@router.get("/panel")
def get_panel_config() -> dict[str, Any]:
    """读取面板配置 panel_config.json"""
    data = _read_json(PANEL_CONFIG_FILE, {})
    return data


@router.put("/panel")
def put_panel_config(body: PanelConfigUpdate) -> dict[str, Any]:
    """写入面板配置 panel_config.json"""
    try:
        _write_json(PANEL_CONFIG_FILE, body.model_dump())
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
def put_targets_month(month: str, body: MonthTargetsUpdate) -> dict[str, Any]:
    """更新指定月份目标，持久化到 targets_override.json"""
    if len(month) != 6 or not month.isdigit():
        raise HTTPException(status_code=400, detail="month 格式应为 YYYYMM（如 202602）")
    body_dict = body.model_dump()
    overrides = _read_json(TARGETS_OVERRIDE_FILE, {})
    overrides[month] = {**(overrides.get(month) or {}), **body_dict}
    try:
        _write_json(TARGETS_OVERRIDE_FILE, overrides)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"status": "ok", "month": month, "updated": body_dict}


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


# ── V2 月目标 ──────────────────────────────────────────────────────────────────

@router.get("/targets/{month}/v2")
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
    from core.config import MONTHLY_TARGETS
    flat = MONTHLY_TARGETS.get(month, {}).copy()
    if month in overrides:
        flat.update(overrides[month])

    return _synthesize_v2_from_flat(month, flat)


@router.put("/targets/{month}/v2")
def put_targets_v2(month: str, body: "MonthlyTargetV2Body") -> dict[str, Any]:
    """保存 V2 结构到 targets_override.json (含强校验)"""
    from models.config import MonthlyTargetV2
    if len(month) != 6 or not month.isdigit():
        raise HTTPException(status_code=400, detail="month 格式应为 YYYYMM")

    try:
        v2_model = MonthlyTargetV2(**body.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"数据格式错误: {str(exc)}")

    body_dict = v2_model.model_dump()
    body_dict["version"] = 2
    body_dict["month"] = month

    overrides = _read_json(TARGETS_OVERRIDE_FILE, {})
    overrides[month] = body_dict
    try:
        _write_json(TARGETS_OVERRIDE_FILE, overrides)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"status": "ok", "month": month}


@router.post("/targets/{month}/calculate")
def calculate_targets(month: str, body: "MonthlyTargetV2Body") -> dict[str, Any]:
    """接收部分 V2 输入，返回完整计算结果（双向计算）"""
    from models.config import MonthlyTargetV2
    try:
        v2 = MonthlyTargetV2(**body.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {
        "v2": v2.model_dump(),
        "flat": v2.flatten(),
    }


def _synthesize_v2_from_flat(month: str, flat: dict) -> dict:
    """从扁平目标合成 V2 结构"""
    sub = flat.get("子口径", {})
    total_reg = flat.get("注册目标", 0)
    total_paid = flat.get("付费目标", 0)
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
            "cc_narrow": {"user_count": cc_reg, "asp": asp, "conversion_rate": conv, "reserve_rate": 0.0, "attend_rate": 0.0},
            "ss_narrow": {"user_count": ss_reg, "asp": asp, "conversion_rate": conv, "reserve_rate": 0.0, "attend_rate": 0.0},
            "lp_narrow": {"user_count": lp_reg, "asp": asp, "conversion_rate": conv, "reserve_rate": 0.0, "attend_rate": 0.0},
            "wide": {"user_count": wide_reg, "asp": asp, "conversion_rate": conv, "reserve_rate": 0.0, "attend_rate": 0.0},
        },
        "enclosures": {
            "d0_30": {"reach_rate": 0.0, "participation_rate": 0.0, "conversion_rate": 0.0, "checkin_rate": 0.0},
            "d31_60": {"reach_rate": 0.0, "participation_rate": 0.0, "conversion_rate": 0.0, "checkin_rate": 0.0},
            "d61_90": {"reach_rate": 0.0, "participation_rate": 0.0, "conversion_rate": 0.0, "checkin_rate": 0.0},
            "d91_180": {"reach_rate": 0.0, "participation_rate": 0.0, "conversion_rate": 0.0, "checkin_rate": 0.0},
            "d181_plus": {"reach_rate": 0.0, "participation_rate": 0.0, "conversion_rate": 0.0, "checkin_rate": 0.0},
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


# ── 智能目标推荐 ────────────────────────────────────────────────────────────────

@router.get("/targets/{month}/recommend")
def get_target_recommendations(
    month: str,
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """智能目标推荐：三档场景 + 可行性评估"""
    if len(month) != 6 or not month.isdigit():
        raise HTTPException(status_code=400, detail="month 格式应为 YYYYMM")

    from core.config import MONTHLY_TARGETS

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
    base_targets = MONTHLY_TARGETS.get(month, MONTHLY_TARGETS.get(sorted_months[-1], {}))
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
                    "cc_narrow": {"user_count": int(reg * ratios["cc"]), "asp": base_asp, "conversion_rate": base_conv},
                    "ss_narrow": {"user_count": int(reg * ratios["ss"]), "asp": base_asp, "conversion_rate": base_conv},
                    "lp_narrow": {"user_count": int(reg * ratios["lp"]), "asp": base_asp, "conversion_rate": base_conv},
                    "wide": {"user_count": int(reg * ratios["wide"]), "asp": base_asp, "conversion_rate": base_conv},
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
        "aggressive": make_scenario(1.0 + growth_rates["revenue"] * 1.5, "激进（加速增长）"),
    }

    # ── 4. 可行性评估（当月） ────────────────────────────────────────────────
    feasibility = _calculate_feasibility(svc, month, base_targets)

    return {
        "month": month,
        "growth_rates": {k: round(v, 4) for k, v in growth_rates.items()},
        "scenarios": scenarios,
        "feasibility": feasibility,
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
        if isinstance(metric_data, dict):
            actual = metric_data.get("actual", 0)
        else:
            actual = 0

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

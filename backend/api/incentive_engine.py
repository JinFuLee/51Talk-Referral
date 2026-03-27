"""转介绍内场激励系统 API

路由前缀：/api/incentive

端点：
  GET  /recommend                     — AI 杠杆分析，返回 top 3 激励推荐
  GET  /campaigns?month=&status=      — 读取活动列表
  POST /campaigns                     — 新建活动
  PUT  /campaigns/{id}                — 更新活动字段
  DELETE /campaigns/{id}              — 软删除（status=deleted）
  GET  /progress?month=               — 实时进度计算
  POST /campaigns/{id}/poster         — 生成海报图片（PNG）
  GET  /budget?month=                 — 读取预算配置
  PUT  /budget                        — 更新预算配置
"""

from __future__ import annotations

import json
import logging
import math
import uuid
from datetime import UTC, date, datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Literal

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager

logger = logging.getLogger(__name__)

router = APIRouter()

# ── 路径常量 ──────────────────────────────────────────────────────────────────

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_CONFIG_DIR = _PROJECT_ROOT / "config"
_CAMPAIGNS_PATH = _CONFIG_DIR / "incentive_campaigns.json"
_BUDGET_PATH = _CONFIG_DIR / "incentive_budget.json"
_PROJECT_CONFIG_PATH = _PROJECT_ROOT / "projects" / "referral" / "config.json"


# ── Pydantic 模型 ─────────────────────────────────────────────────────────────


class IncentiveCondition(BaseModel):
    metric: str
    operator: Literal["gte", "lte", "gt", "lt"] = "gte"
    threshold: float


class Campaign(BaseModel):
    id: str
    name: str
    name_th: str = ""
    role: Literal["CC", "SS", "LP"]
    month: str  # YYYYMM
    start_date: str | None = None
    end_date: str | None = None
    metric: str
    operator: str = "gte"
    threshold: float
    reward_thb: float
    leverage_source: dict[str, Any] | None = None
    status: Literal["active", "paused", "completed", "deleted"] = "active"
    poster_path: str | None = None
    created_at: str = ""
    updated_at: str = ""


class CampaignCreateBody(BaseModel):
    name: str
    name_th: str = ""
    role: Literal["CC", "SS", "LP"]
    month: str
    start_date: str | None = None
    end_date: str | None = None
    metric: str
    operator: str = "gte"
    threshold: float
    reward_thb: float
    leverage_source: dict[str, Any] | None = None


class CampaignUpdateBody(BaseModel):
    model_config = {"extra": "allow"}


class PersonProgress(BaseModel):
    person_name: str
    team: str = ""
    metric_value: float | None = None
    threshold: float
    gap: float | None = None
    progress_pct: float = 0.0
    status: Literal["qualified", "close", "in_progress", "not_started"] = "not_started"
    reward_thb: float = 0.0


class CampaignProgress(BaseModel):
    campaign: Campaign
    records: list[PersonProgress] = []
    qualified_count: int = 0
    close_count: int = 0
    total_estimated_thb: float = 0.0


class LeverRecommendation(BaseModel):
    rank: int
    stage: str
    stage_label: str = ""
    leverage_score: float
    revenue_impact_usd: float
    current_rate: float | None = None
    target_rate: float | None = None
    suggested_campaign: dict[str, Any] | None = None


class BudgetConfig(BaseModel):
    indoor_budget_thb: float = 35000
    outdoor_budget_thb: float = 65000
    updated_at: str = ""


# ── 配置读写工具 ───────────────────────────────────────────────────────────────


def _read_json(path: Path, default: Any = None) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return default
    return default


def _write_json(path: Path, data: Any) -> None:
    """原子写入：先写临时文件，再替换"""
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    try:
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(path)
    except Exception:
        tmp.unlink(missing_ok=True)
        raise


def _now_iso() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


# ── 活动 CRUD 工具 ─────────────────────────────────────────────────────────────


def _load_campaigns_raw() -> list[dict[str, Any]]:
    data = _read_json(_CAMPAIGNS_PATH, {"campaigns": []})
    if isinstance(data, dict):
        return data.get("campaigns", [])
    return []


def _save_campaigns_raw(campaigns: list[dict[str, Any]]) -> None:
    _write_json(_CAMPAIGNS_PATH, {"campaigns": campaigns})


def _find_campaign(campaign_id: str) -> dict[str, Any]:
    for c in _load_campaigns_raw():
        if c.get("id") == campaign_id and c.get("status") != "deleted":
            return c
    raise HTTPException(status_code=404, detail=f"活动 {campaign_id} 不存在")


def _update_campaign(campaign_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    campaigns = _load_campaigns_raw()
    for c in campaigns:
        if c.get("id") == campaign_id:
            c.update(updates)
            c["updated_at"] = _now_iso()
            _save_campaigns_raw(campaigns)
            return c
    raise HTTPException(status_code=404, detail=f"活动 {campaign_id} 不存在")


# ── 目标读取工具 ───────────────────────────────────────────────────────────────


def _load_project_targets(month: str) -> dict[str, Any]:
    proj_cfg = _read_json(_PROJECT_CONFIG_PATH, {})
    base = dict(proj_cfg.get("monthly_targets", {}).get(month, {}))
    overrides = _read_json(_CONFIG_DIR / "targets_override.json", {})
    base.update(overrides.get(month, {}))
    return base


# ── 数据聚合工具 ───────────────────────────────────────────────────────────────

_METRIC_LABELS_ZH = {
    "leads": "转介绍注册数",
    "paid": "转介绍付费数",
    "revenue": "总带新付费金额USD",
    "showup": "转介绍付费数",         # showup 在 D2 没有独立列，用 paid 近似
    "participation_rate": "转介绍参与率",
    "checkin_rate": "当月有效打卡率",
    "cc_reach_rate": "CC触达率",
    "ss_reach_rate": "SS触达率",
    "lp_reach_rate": "LP触达率",
    "coefficient": "带新系数",
}

_METRIC_LABELS_SS = {
    "leads": "转介绍注册数",
    "paid": "转介绍付费数",
    "revenue": "总带新付费金额USD",
    "participation_rate": "转介绍参与率",
    "checkin_rate": "当月有效打卡率",
    "ss_reach_rate": "SS触达率",
    "coefficient": "带新系数",
}

_METRIC_LABELS_LP = {
    "leads": "转介绍注册数",
    "paid": "转介绍付费数",
    "revenue": "总带新付费金额USD",
    "participation_rate": "转介绍参与率",
    "checkin_rate": "当月有效打卡率",
    "lp_reach_rate": "LP触达率",
    "coefficient": "带新系数",
}


def _sf(val) -> float | None:
    if val is None:
        return None
    try:
        if isinstance(val, float) and math.isnan(val):
            return None
        f = float(val)
        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return None


def _safe_mode(series: pd.Series) -> str:
    m = series.dropna().mode()
    return str(m.iloc[0]) if not m.empty else ""


def _get_role_metrics(role: str, dm: DataManager) -> dict[str, dict[str, Any]]:
    """按角色从 DataManager 聚合个人指标。

    返回：{person_name: {metric_key: value, "team": str}}
    """
    data = dm.load_all()
    result: dict[str, dict[str, Any]] = {}

    if role == "CC":
        df: pd.DataFrame = data.get("enclosure_cc", pd.DataFrame())
        if df.empty:
            return result
        cc_col = "last_cc_name"
        grp_col = "last_cc_group_name"
        if cc_col not in df.columns:
            return result
        for cc_name, g in df.groupby(cc_col, sort=False):
            if not cc_name or str(cc_name).strip() in ("nan", "NaN", ""):
                continue
            row: dict[str, Any] = {}
            row["team"] = _safe_mode(g[grp_col]) if grp_col in g.columns else ""
            # 求和型指标
            for field, col in [
                ("leads", "转介绍注册数"),
                ("paid", "转介绍付费数"),
                ("revenue", "总带新付费金额USD"),
            ]:
                if col in g.columns:
                    row[field] = _sf(pd.to_numeric(g[col], errors="coerce").sum())
            # 均值型指标
            for field, col in [
                ("participation_rate", "转介绍参与率"),
                ("checkin_rate", "当月有效打卡率"),
                ("cc_reach_rate", "CC触达率"),
                ("coefficient", "带新系数"),
            ]:
                if col in g.columns:
                    row[field] = _sf(pd.to_numeric(g[col], errors="coerce").mean())
            result[str(cc_name)] = row

    elif role == "SS":
        df = data.get("enclosure_ss", pd.DataFrame())
        if df.empty:
            return result
        ss_col = "last_ss_name"
        grp_col = "last_ss_group_name"
        if ss_col not in df.columns:
            return result
        for ss_name, g in df.groupby(ss_col, sort=False):
            if not ss_name or str(ss_name).strip() in ("nan", "NaN", ""):
                continue
            row = {}
            row["team"] = _safe_mode(g[grp_col]) if grp_col in g.columns else ""
            for field, col in [
                ("leads", "转介绍注册数"),
                ("paid", "转介绍付费数"),
                ("revenue", "总带新付费金额USD"),
            ]:
                if col in g.columns:
                    row[field] = _sf(pd.to_numeric(g[col], errors="coerce").sum())
            for field, col in [
                ("participation_rate", "转介绍参与率"),
                ("checkin_rate", "当月有效打卡率"),
                ("ss_reach_rate", "SS触达率"),
                ("coefficient", "带新系数"),
            ]:
                if col in g.columns:
                    row[field] = _sf(pd.to_numeric(g[col], errors="coerce").mean())
            result[str(ss_name)] = row

    elif role == "LP":
        df = data.get("enclosure_lp", pd.DataFrame())
        if df.empty:
            return result
        lp_col = "last_lp_name"
        grp_col = "last_lp_group_name"
        if lp_col not in df.columns:
            return result
        for lp_name, g in df.groupby(lp_col, sort=False):
            if not lp_name or str(lp_name).strip() in ("nan", "NaN", ""):
                continue
            row = {}
            row["team"] = _safe_mode(g[grp_col]) if grp_col in g.columns else ""
            for field, col in [
                ("leads", "转介绍注册数"),
                ("paid", "转介绍付费数"),
                ("revenue", "总带新付费金额USD"),
            ]:
                if col in g.columns:
                    row[field] = _sf(pd.to_numeric(g[col], errors="coerce").sum())
            for field, col in [
                ("participation_rate", "转介绍参与率"),
                ("checkin_rate", "当月有效打卡率"),
                ("lp_reach_rate", "LP触达率"),
                ("coefficient", "带新系数"),
            ]:
                if col in g.columns:
                    row[field] = _sf(pd.to_numeric(g[col], errors="coerce").mean())
            result[str(lp_name)] = row

    return result


# ── /recommend 端点 ────────────────────────────────────────────────────────────

_STAGE_LABEL = {
    "appt_rate": "注册预约率",
    "attend_rate": "预约出席率",
    "paid_rate": "出席付费率",
}

_STAGE_TO_METRIC = {
    "appt_rate": {
        "role": "CC",
        "metric": "leads",
        "rationale_zh": "提升注册→预约转化，增加有效 leads 数",
    },
    "attend_rate": {
        "role": "CC",
        "metric": "showup",
        "rationale_zh": "提升预约→出席转化，减少爽约损耗",
    },
    "paid_rate": {
        "role": "CC",
        "metric": "paid",
        "rationale_zh": "提升出席→付费转化，缩短成交周期",
    },
}


@router.get("/recommend", summary="AI 杠杆分析 — 返回 top 3 内场激励推荐")
def get_recommendations(
    month: str | None = None,
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    """基于漏斗杠杆矩阵，推荐最高 ROI 的内场激励活动参数。"""
    from backend.core.channel_funnel_engine import ChannelFunnelEngine
    from backend.core.leverage_engine import compute_leverage_matrix

    if month is None:
        month = date.today().strftime("%Y%m")

    # 1. 构建漏斗数据
    data = dm.load_all()
    funnel_engine = ChannelFunnelEngine.from_data_dict(data)
    try:
        channel_funnel = funnel_engine.compute()
    except Exception as e:
        logger.warning(f"ChannelFunnelEngine.compute() 失败: {e}")
        channel_funnel = {}

    if not channel_funnel:
        return {
            "analysis_date": date.today().isoformat(),
            "month": month,
            "levers": [],
            "note": "暂无漏斗数据，请确认数据源已加载",
        }

    # 2. 读取目标
    targets_raw = _load_project_targets(month)
    targets = {
        "appt_rate": float(targets_raw.get("约课率目标", 0.77)),
        "attend_rate": float(targets_raw.get("出席率目标", 0.66)),
        "paid_rate": float(targets_raw.get("目标转化率", 0.193)),
    }

    # 3. 计算杠杆矩阵（不传历史数据，以目标作为历史最佳）
    leverage_result = compute_leverage_matrix(
        channel_funnel_data=channel_funnel,
        targets=targets,
    )

    # 4. 按 leverage_score 排序取 top scores，每个 stage 取最高
    scores: list[dict[str, Any]] = leverage_result.get("scores", [])
    stage_best: dict[str, dict[str, Any]] = {}
    for s in scores:
        stage = s["stage"]
        if (
            stage not in stage_best
            or s["leverage_score"] > stage_best[stage]["leverage_score"]
        ):
            stage_best[stage] = s

    # 只取三个漏斗阶段，按 leverage_score 降序
    sorted_stages = sorted(
        stage_best.values(), key=lambda x: x["leverage_score"], reverse=True
    )

    # 5. 估算 CC 人数（用于奖励金额均摊）
    try:
        cc_df: pd.DataFrame = data.get("enclosure_cc", pd.DataFrame())
        if "last_cc_name" in cc_df.columns:
            cc_count = max(1, int(cc_df["last_cc_name"].dropna().nunique()))
        else:
            cc_count = 30
    except Exception:
        cc_count = 30

    # 6. 生成推荐列表
    # 6. 计算各指标当前值分布（用于 smart threshold）
    cc_metrics = _get_role_metrics("CC", dm)
    metric_values: dict[str, list[float]] = {}
    for _pname, pdata in cc_metrics.items():
        for mk in ("paid", "leads", "showup", "revenue"):
            v = pdata.get(mk)
            if v is not None and v > 0:
                metric_values.setdefault(mk, []).append(float(v))

    # 月份信息
    today = date.today()
    y, m_num = int(month[:4]), int(month[4:6])
    import calendar
    month_last = calendar.monthrange(y, m_num)[1]
    month_start = f"{y}-{m_num:02d}-01"
    month_end = f"{y}-{m_num:02d}-{month_last}"
    start = max(today.isoformat(), month_start)

    _METRIC_ZH = {
        "paid": "付费", "leads": "注册", "showup": "出席", "revenue": "业绩",
    }
    _METRIC_TH = {
        "paid": "ยอดชำระ", "leads": "ยอดลงทะเบียน",
        "showup": "ยอดเข้าเรียน", "revenue": "ยอดขาย",
    }
    _MONTH_TH = [
        "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
    ]

    levers: list[dict[str, Any]] = []
    for i, score in enumerate(sorted_stages[:3]):
        stage = score["stage"]
        mapping = _STAGE_TO_METRIC.get(stage, {})
        suggested: dict[str, Any] | None = None

        if mapping and score["revenue_impact"] > 0:
            metric_key = mapping.get("metric", "paid")
            role = mapping.get("role", "CC")

            # Smart threshold: P60 of current values (achievable stretch)
            vals = sorted(metric_values.get(metric_key, []))
            if vals:
                p60_idx = int(len(vals) * 0.6)
                threshold = max(1, round(vals[min(p60_idx, len(vals) - 1)]))
            else:
                threshold = 5

            # 奖励 = revenue_impact 的 5%（成本控制）转 THB 均摊
            total_reward_thb = score["revenue_impact"] * 0.05 * 34
            per_person = round(total_reward_thb / cc_count / 100) * 100
            reward_thb = float(max(200, min(per_person, 2000)))

            # 自动生成名称
            mzh = _METRIC_ZH.get(metric_key, metric_key)
            mth = _METRIC_TH.get(metric_key, metric_key)
            month_th = _MONTH_TH[m_num] if m_num <= 12 else ""
            name = f"{m_num}月{role}{mzh}冲刺奖"
            name_th = f"โบนัสเป้า{mth} {role} {month_th}"

            suggested = {
                "role": role,
                "metric": metric_key,
                "threshold": threshold,
                "reward_thb": reward_thb,
                "name": name,
                "name_th": name_th,
                "start_date": start,
                "end_date": month_end,
                "rationale": mapping.get("rationale_zh", ""),
            }

        levers.append({
            "rank": i + 1,
            "stage": stage,
            "stage_label": _STAGE_LABEL.get(stage, stage),
            "leverage_score": score["leverage_score"],
            "revenue_impact_usd": score["revenue_impact"],
            "current_rate": score.get("actual_rate"),
            "target_rate": score.get("target_rate"),
            "suggested_campaign": suggested,
        })

    return {
        "analysis_date": date.today().isoformat(),
        "month": month,
        "levers": levers,
    }


# ── 活动 CRUD ─────────────────────────────────────────────────────────────────


@router.get("/campaigns", summary="读取活动列表")
def list_campaigns(
    month: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    campaigns = _load_campaigns_raw()
    result = []
    for c in campaigns:
        if c.get("status") == "deleted":
            continue
        if month and c.get("month") != month:
            continue
        if status and c.get("status") != status:
            continue
        result.append(c)
    return result


@router.post("/campaigns", summary="新建激励活动")
def create_campaign(body: CampaignCreateBody) -> dict[str, Any]:
    now = _now_iso()
    campaign = {
        "id": str(uuid.uuid4())[:8],
        "name": body.name,
        "name_th": body.name_th,
        "role": body.role,
        "month": body.month,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "metric": body.metric,
        "operator": body.operator,
        "threshold": body.threshold,
        "reward_thb": body.reward_thb,
        "leverage_source": body.leverage_source,
        "status": "active",
        "poster_path": None,
        "created_at": now,
        "updated_at": now,
    }
    campaigns = _load_campaigns_raw()
    campaigns.append(campaign)
    _save_campaigns_raw(campaigns)
    return campaign


@router.put("/campaigns/{campaign_id}", summary="更新活动字段")
def update_campaign(campaign_id: str, body: CampaignUpdateBody) -> dict[str, Any]:
    updates = body.model_extra or {}
    # 防止更新 id / created_at
    updates.pop("id", None)
    updates.pop("created_at", None)
    if not updates:
        raise HTTPException(status_code=400, detail="未提供任何更新字段")
    return _update_campaign(campaign_id, updates)


@router.delete("/campaigns/{campaign_id}", summary="软删除活动")
def delete_campaign(campaign_id: str) -> dict[str, Any]:
    return _update_campaign(campaign_id, {"status": "deleted"})


# ── /progress 进度计算 ─────────────────────────────────────────────────────────


def _evaluate_progress(
    actual: float | None,
    threshold: float,
    operator: str,
    reward_thb: float,
) -> tuple[float | None, float, str, float]:
    """
    返回 (gap, progress_pct, status, reward_if_qualified)
    """
    if actual is None:
        return None, 0.0, "not_started", 0.0

    # 计算 gap（正值 = 还差多少才达标）
    if operator == "gte":
        gap = max(0.0, threshold - actual)
        pct = min(actual / threshold, 1.0) if threshold > 0 else 0.0
        qualified = actual >= threshold
    elif operator == "lte":
        gap = max(0.0, actual - threshold)
        pct = min(threshold / actual, 1.0) if actual > 0 else 1.0
        qualified = actual <= threshold
    elif operator == "gt":
        gap = max(0.0, threshold - actual + 1e-9)
        pct = min(actual / threshold, 1.0) if threshold > 0 else 0.0
        qualified = actual > threshold
    elif operator == "lt":
        gap = max(0.0, actual - threshold + 1e-9)
        pct = min(threshold / actual, 1.0) if actual > 0 else 1.0
        qualified = actual < threshold
    else:
        gap = 0.0
        pct = 0.0
        qualified = False

    if qualified:
        status = "qualified"
    elif pct >= 0.8:
        status = "close"
    elif pct > 0:
        status = "in_progress"
    else:
        status = "not_started"

    return gap, round(pct, 4), status, reward_thb if qualified else 0.0


@router.get("/progress", summary="实时活动进度")
def get_progress(
    month: str | None = None,
    dm: DataManager = Depends(get_data_manager),
) -> list[dict[str, Any]]:
    if month is None:
        month = date.today().strftime("%Y%m")

    # 只取 active 活动
    campaigns = [c for c in _load_campaigns_raw()
                 if c.get("status") == "active" and c.get("month") == month]

    results: list[dict[str, Any]] = []
    for camp in campaigns:
        role: str = camp.get("role", "CC")
        metric: str = camp.get("metric", "leads")
        threshold: float = float(camp.get("threshold", 0))
        operator: str = camp.get("operator", "gte")
        reward_thb: float = float(camp.get("reward_thb", 0))

        persons = _get_role_metrics(role, dm)
        records: list[dict[str, Any]] = []

        for name, pdata in persons.items():
            actual = pdata.get(metric)
            gap, pct, status, earned = _evaluate_progress(
                actual, threshold, operator, reward_thb
            )
            records.append({
                "person_name": name,
                "team": pdata.get("team", ""),
                "metric_value": actual,
                "threshold": threshold,
                "gap": gap,
                "progress_pct": pct,
                "status": status,
                "reward_thb": earned,
            })

        records.sort(key=lambda r: r["progress_pct"], reverse=True)

        qualified_count = sum(1 for r in records if r["status"] == "qualified")
        close_count = sum(1 for r in records if r["status"] == "close")
        total_thb = sum(r["reward_thb"] for r in records)

        results.append({
            "campaign": camp,
            "records": records,
            "qualified_count": qualified_count,
            "close_count": close_count,
            "total_estimated_thb": round(total_thb, 2),
        })

    return results


# ── 海报生成 ───────────────────────────────────────────────────────────────────

_THAI_FONTS = [
    "Tahoma", "Angsana New", "Browallia New", "Arial Unicode MS", "DejaVu Sans"
]


_METRIC_TH_POSTER = {
    "paid": "ยอดชำระ (Paid)",
    "leads": "ยอดลงทะเบียน (Leads)",
    "showup": "ยอดเข้าเรียน (Showup)",
    "revenue": "ยอดขาย (Revenue)",
    "checkin_rate": "อัตราเช็คอิน (Check-in Rate)",
    "participation_rate": "อัตราการมีส่วนร่วม",
    "registrations": "ยอดลงทะเบียน (Registrations)",
    "payments": "ยอดชำระ (Payments)",
}

_OP_TH = {"gte": "≥", "lte": "≤", "gt": ">", "lt": "<"}

_MONTH_TH_FULL = [
    "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
    "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
    "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
]


# ── 海报主题系统 ─────────────────────────────────────────────────────────────

_POSTER_THEMES: dict[str, dict[str, Any]] = {
    "fire": {  # 🔥 冲刺型（paid/revenue）
        "grad_top": (180, 40, 0),
        "grad_bot": (60, 10, 30),
        "accent": (255, 180, 0),
        "card_bg": (120, 30, 10, 180),
        "emoji": "🔥",
        "subtitle": "Sprint Challenge",
    },
    "target": {  # 🎯 达标型（showup/checkin_rate）
        "grad_top": (0, 80, 60),
        "grad_bot": (10, 35, 50),
        "accent": (0, 230, 160),
        "card_bg": (0, 60, 50, 180),
        "emoji": "🎯",
        "subtitle": "Target Achievement",
    },
    "growth": {  # 🚀 爆发型（leads/registrations）
        "grad_top": (60, 20, 120),
        "grad_bot": (15, 20, 80),
        "accent": (160, 120, 255),
        "card_bg": (50, 20, 100, 180),
        "emoji": "🚀",
        "subtitle": "Growth Boost",
    },
    "honor": {  # ⭐ 荣耀型（participation_rate）
        "grad_top": (50, 40, 10),
        "grad_bot": (15, 12, 5),
        "accent": (255, 209, 0),
        "card_bg": (60, 50, 15, 180),
        "emoji": "⭐",
        "subtitle": "Honor Reward",
    },
    "compete": {  # 🏆 竞赛型（默认）
        "grad_top": (27, 54, 93),
        "grad_bot": (10, 20, 45),
        "accent": (255, 209, 0),
        "card_bg": (35, 70, 120, 180),
        "emoji": "🏆",
        "subtitle": "Team Challenge",
    },
}

_METRIC_TO_THEME: dict[str, str] = {
    "paid": "fire",
    "revenue": "fire",
    "revenue_usd": "fire",
    "payments": "fire",
    "showup": "target",
    "checkin_rate": "target",
    "leads": "growth",
    "registrations": "growth",
    "participation_rate": "honor",
}


def _draw_gradient(img, c1: tuple, c2: tuple) -> None:
    """垂直线性渐变"""
    from PIL import ImageDraw

    draw = ImageDraw.Draw(img)
    w, h = img.size
    for y in range(h):
        r = int(c1[0] + (c2[0] - c1[0]) * y / h)
        g = int(c1[1] + (c2[1] - c1[1]) * y / h)
        b = int(c1[2] + (c2[2] - c1[2]) * y / h)
        draw.line([(0, y), (w, y)], fill=(r, g, b))


def _build_poster_image(camp: dict[str, Any]) -> bytes:
    """多主题 Pillow 海报：按指标类型自动选视觉风格"""
    from PIL import Image, ImageDraw, ImageFont

    W, H = 1080, 1350

    # ── 字体 ──
    _FONT_CHAIN = [
        ("/System/Library/Fonts/Supplemental/Tahoma Bold.ttf", True),
        ("/System/Library/Fonts/Supplemental/Tahoma.ttf", False),
        ("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", None),
        ("/System/Library/Fonts/STHeiti Medium.ttc", None),
    ]
    bold_path = reg_path = ""
    for fp, is_bold in _FONT_CHAIN:
        if Path(fp).exists():
            if is_bold is True and not bold_path:
                bold_path = fp
            elif is_bold is False and not reg_path:
                reg_path = fp
            elif is_bold is None:
                if not reg_path:
                    reg_path = fp
                if not bold_path:
                    bold_path = fp
    if not reg_path:
        reg_path = bold_path or "arial.ttf"
    if not bold_path:
        bold_path = reg_path

    def font(size: int, bold: bool = False):
        return ImageFont.truetype(
            bold_path if bold else reg_path, size
        )

    # ── 主题选择 ──
    metric = camp.get("metric", "")
    theme_key = _METRIC_TO_THEME.get(metric, "compete")
    theme = _POSTER_THEMES[theme_key]
    accent = theme["accent"]
    WHITE = (255, 255, 255)
    MUTED = (180, 180, 180)
    SHADOW = (0, 0, 0)

    # ── 渐变背景 ──
    img = Image.new("RGB", (W, H))
    _draw_gradient(img, theme["grad_top"], theme["grad_bot"])
    draw = ImageDraw.Draw(img)

    # ── 顶部装饰线 ──
    draw.rectangle([0, 0, W, 6], fill=accent)

    cx = W // 2

    # ── 品牌+主题标识 ──
    draw.text(
        (cx, 50), "51Talk Thailand",
        font=font(22), fill=MUTED, anchor="mm",
    )
    draw.text(
        (cx, 80), theme["subtitle"],
        font=font(16), fill=MUTED, anchor="mm",
    )

    # ── 装饰 emoji ──
    draw.text(
        (cx, 145), theme["emoji"],
        font=font(48), fill=WHITE, anchor="mm",
    )

    # ── 主标题（泰文 + 文字阴影）──
    title = camp.get("name_th") or camp.get("name", "")
    # shadow
    draw.text(
        (cx + 2, 232), title,
        font=font(48, bold=True), fill=SHADOW, anchor="mm",
    )
    draw.text(
        (cx, 230), title,
        font=font(48, bold=True), fill=accent, anchor="mm",
    )

    # ── 分隔线 ──
    draw.rectangle(
        [cx - 50, 280, cx + 50, 283], fill=accent
    )

    # ── 卡片 ──
    cm = 60
    ct, cb = 320, 960
    card_rgb = theme["card_bg"][:3]
    draw.rounded_rectangle(
        [cm, ct, W - cm, cb], radius=20, fill=card_rgb,
    )

    # ── 参与对象 ──
    role = camp.get("role", "CC")
    role_th = {
        "CC": "CC (ฝ่ายขายหน้าบ้าน)",
        "SS": "SS (ฝ่ายขายหลังบ้าน)",
        "LP": "LP (ฝ่ายบริการ)",
    }.get(role, role)
    draw.text(
        (cx, ct + 45), "สำหรับ",
        font=font(18), fill=MUTED, anchor="mm",
    )
    draw.text(
        (cx, ct + 85), role_th,
        font=font(30, bold=True), fill=WHITE, anchor="mm",
    )

    # ── 条件 ──
    metric_label = _METRIC_TH_POSTER.get(metric, metric)
    op = _OP_TH.get(camp.get("operator", "gte"), "≥")
    threshold = camp.get("threshold", 0)
    thr_s = (
        str(int(threshold))
        if threshold == int(threshold)
        else str(threshold)
    )
    draw.text(
        (cx, ct + 160), "เป้าหมาย",
        font=font(18), fill=MUTED, anchor="mm",
    )
    draw.text(
        (cx, ct + 205),
        f"{metric_label} {op} {thr_s}",
        font=font(34, bold=True), fill=WHITE, anchor="mm",
    )

    # ── 奖励（大字+阴影）──
    reward = camp.get("reward_thb", 0)
    draw.text(
        (cx, ct + 300), "รางวัล",
        font=font(18), fill=MUTED, anchor="mm",
    )
    reward_str = f"฿{reward:,.0f}"
    draw.text(
        (cx + 3, ct + 378), reward_str,
        font=font(68, bold=True), fill=SHADOW, anchor="mm",
    )
    draw.text(
        (cx, ct + 375), reward_str,
        font=font(68, bold=True), fill=accent, anchor="mm",
    )
    draw.text(
        (cx, ct + 425), "ต่อคน",
        font=font(18), fill=MUTED, anchor="mm",
    )

    # ── 日期 ──
    month_str = camp.get("month", "")
    start = camp.get("start_date", "")
    end = camp.get("end_date", "")
    if month_str and len(month_str) == 6:
        mn = int(month_str[4:6])
        ml = _MONTH_TH_FULL[mn] if mn <= 12 else ""
        yr = int(month_str[:4]) + 543
        period = f"{ml} {yr}"
    elif start and end:
        period = f"{start} — {end}"
    else:
        period = ""
    if period:
        draw.text(
            (cx, ct + 520), "ระยะเวลา",
            font=font(16), fill=MUTED, anchor="mm",
        )
        draw.text(
            (cx, ct + 555), period,
            font=font(26, bold=True), fill=WHITE, anchor="mm",
        )

    # ── 底部 ──
    draw.rectangle([0, H - 6, W, H], fill=accent)
    draw.text(
        (cx, H - 35),
        "51Talk · Referral Operations",
        font=font(14), fill=MUTED, anchor="mm",
    )

    buf = BytesIO()
    img.save(buf, format="PNG", quality=95)
    return buf.getvalue()


@router.post("/campaigns/{campaign_id}/poster", summary="生成活动海报（PNG）")
def generate_poster(campaign_id: str) -> StreamingResponse:
    camp = _find_campaign(campaign_id)
    png_bytes = _build_poster_image(camp)

    # 持久化
    poster_dir = _PROJECT_ROOT / "output" / "posters"
    poster_dir.mkdir(parents=True, exist_ok=True)
    poster_path = poster_dir / f"{campaign_id}.png"
    poster_path.write_bytes(png_bytes)
    _update_campaign(campaign_id, {"poster_path": str(poster_path)})

    return StreamingResponse(
        BytesIO(png_bytes),
        media_type="image/png",
        headers={
            "Content-Disposition": (
                f'attachment; filename="poster_{campaign_id}.png"'
            )
        },
    )


# ── 预算配置 ───────────────────────────────────────────────────────────────────


@router.get("/budget", summary="读取激励预算配置")
def get_budget(month: str | None = None) -> dict[str, Any]:
    data = _read_json(
        _BUDGET_PATH, {"indoor_budget_thb": 35000, "outdoor_budget_thb": 65000}
    )
    if month:
        # 支持按月份覆盖（可选扩展）
        monthly = data.get("monthly_overrides", {}).get(month, {})
        if monthly:
            data = {**data, **monthly}
    return data


@router.put("/budget", summary="更新激励预算配置")
def update_budget(body: BudgetConfig) -> dict[str, Any]:
    existing = _read_json(_BUDGET_PATH, {})
    updated = {
        **existing,
        "indoor_budget_thb": body.indoor_budget_thb,
        "outdoor_budget_thb": body.outdoor_budget_thb,
        "updated_at": _now_iso(),
    }
    _write_json(_BUDGET_PATH, updated)
    return updated

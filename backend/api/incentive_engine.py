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
    levers: list[dict[str, Any]] = []
    for i, score in enumerate(sorted_stages[:3]):
        stage = score["stage"]
        mapping = _STAGE_TO_METRIC.get(stage, {})
        suggested: dict[str, Any] | None = None

        if mapping and score["revenue_impact"] > 0:
            # 奖励 = revenue_impact 的 5%（成本控制）转 THB 均摊给 CC
            total_reward_thb = score["revenue_impact"] * 0.05 * 34
            per_person = round(total_reward_thb / cc_count / 100) * 100
            reward_thb = float(max(200, min(per_person, 2000)))
            suggested = {
                "role": mapping.get("role", "CC"),
                "metric": mapping.get("metric", "paid"),
                "threshold": 5,
                "reward_thb": reward_thb,
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


@router.post("/campaigns/{campaign_id}/poster", summary="生成活动海报（PNG）")
def generate_poster(campaign_id: str) -> StreamingResponse:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    camp = _find_campaign(campaign_id)

    fig, ax = plt.subplots(figsize=(8, 6))
    fig.patch.set_facecolor("#1B365D")
    ax.set_facecolor("#1B365D")
    ax.set_axis_off()

    # 泰文标题（大字）
    title = camp.get("name_th") or camp.get("name", "")
    ax.text(
        0.5, 0.85, title,
        fontsize=32, color="#FFD100", ha="center", va="center",
        fontfamily=_THAI_FONTS, weight="bold",
        transform=ax.transAxes,
    )

    # 中文标题（小字）
    ax.text(
        0.5, 0.76, camp.get("name", ""),
        fontsize=16, color="#cccccc", ha="center", va="center",
        transform=ax.transAxes,
    )

    # 条件
    metric = camp.get("metric", "")
    operator_labels = {"gte": "≥", "lte": "≤", "gt": ">", "lt": "<"}
    op_label = operator_labels.get(camp.get("operator", "gte"), "≥")
    threshold = camp.get("threshold", 0)
    condition_th = f"เป้าหมาย: {metric} {op_label} {threshold}"
    ax.text(
        0.5, 0.62, condition_th,
        fontsize=20, color="white", ha="center", va="center",
        fontfamily=_THAI_FONTS,
        transform=ax.transAxes,
    )

    # 奖励
    reward_thb = camp.get("reward_thb", 0)
    reward_th = f"รางวัล: ฿{reward_thb:,.0f}"
    ax.text(
        0.5, 0.47, reward_th,
        fontsize=28, color="#FFD100", ha="center", va="center",
        fontfamily=_THAI_FONTS, weight="bold",
        transform=ax.transAxes,
    )

    # 日期
    start = camp.get("start_date", "")
    end = camp.get("end_date", "")
    if start or end:
        date_str = f"{start} — {end}" if (start and end) else (start or end)
        ax.text(
            0.5, 0.34, date_str,
            fontsize=15, color="white", ha="center", va="center",
            fontfamily=_THAI_FONTS,
            transform=ax.transAxes,
        )

    # 中文参与描述
    role = camp.get("role", "CC")
    month = camp.get("month", "")
    desc_zh = (
        f"参与对象: {role} | 月份: {month} | "
        f"条件: {metric} {op_label} {threshold} | 奖励: ฿{reward_thb:,.0f}"
    )
    ax.text(
        0.5, 0.13, desc_zh,
        fontsize=11, color="#999999", ha="center", va="center",
        transform=ax.transAxes,
    )

    # 水印
    ax.text(
        0.5, 0.04, "ref-ops-engine · 51Talk Thailand",
        fontsize=9, color="#555555", ha="center", va="center",
        transform=ax.transAxes,
    )

    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight",
                pad_inches=0.3, facecolor="#1B365D")
    plt.close(fig)
    buf.seek(0)

    # 持久化
    poster_dir = _PROJECT_ROOT / "output" / "posters"
    poster_dir.mkdir(parents=True, exist_ok=True)
    poster_path = poster_dir / f"{campaign_id}.png"
    poster_path.write_bytes(buf.getvalue())
    _update_campaign(campaign_id, {"poster_path": str(poster_path)})

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={
            "Content-Disposition": f'attachment; filename="poster_{campaign_id}.png"'
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

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
import re
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
from backend.models.filters import UnifiedFilter, parse_filters

logger = logging.getLogger(__name__)

router = APIRouter()

# ── 路径常量 ──────────────────────────────────────────────────────────────────

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_CONFIG_DIR = _PROJECT_ROOT / "config"
_CAMPAIGNS_PATH = _CONFIG_DIR / "incentive_campaigns.json"
_BUDGET_PATH = _CONFIG_DIR / "incentive_budget.json"
_PROJECT_CONFIG_PATH = _PROJECT_ROOT / "projects" / "referral" / "config.json"

# 层 2：CC 销售团队正则匹配（与 cc_performance.py 保持一致）
_CC_TEAM_PATTERN = re.compile(r"^TH-CC\w+Team$")


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
    "showup": "转介绍付费数",  # showup 在 D2 没有独立列，用 paid 近似
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

        # 层 2：只保留 CC 销售团队（排除 TH-TMK / TH-CC-Training / TH-SS* 等）
        if grp_col in df.columns:
            df = df[
                df[grp_col].astype(str).apply(lambda x: bool(_CC_TEAM_PATTERN.match(x)))
            ]
        if df.empty:
            return result

        # _is_active 列由 EnclosureCCLoader 写入
        has_active_col = "_is_active" in df.columns

        for cc_name, g in df.groupby(cc_col, sort=False):
            if not cc_name or str(cc_name).strip() in ("nan", "NaN", ""):
                continue
            row: dict[str, Any] = {}
            row["team"] = _safe_mode(g[grp_col]) if grp_col in g.columns else ""

            # SUM 指标：使用全部行（含非有效围场），非有效围场业绩是真实收入
            for field, col in [
                ("leads", "转介绍注册数"),
                ("paid", "转介绍付费数"),
                ("revenue", "总带新付费金额USD"),
            ]:
                if col in g.columns:
                    row[field] = _sf(pd.to_numeric(g[col], errors="coerce").sum())

            # MEAN 指标：仅使用有效围场行，非有效围场过程指标不代表当前活跃状态
            g_active = g[g["_is_active"]] if has_active_col else g
            for field, col in [
                ("participation_rate", "转介绍参与率"),
                ("checkin_rate", "当月有效打卡率"),
                ("cc_reach_rate", "CC触达率"),
                ("coefficient", "带新系数"),
            ]:
                if col in g_active.columns:
                    s = pd.to_numeric(g_active[col], errors="coerce")
                    row[field] = _sf(s.mean())
            result[str(cc_name)] = row

        # 合并 D4 数据（showup = 当月推荐出席人数）
        df_d4: pd.DataFrame = data.get("students", pd.DataFrame())
        if not df_d4.empty:
            d4_cc_col: str | None = None
            for c in ["last_cc_name", "末次CC员工姓名", "末次（当前）分配CC员工姓名"]:
                if c in df_d4.columns:
                    d4_cc_col = c
                    break
            if d4_cc_col:
                showup_col = "当月推荐出席人数"
                if showup_col in df_d4.columns:
                    for cc_name, g in df_d4.groupby(d4_cc_col, sort=False):
                        key = str(cc_name)
                        if key in result:
                            result[key]["showup"] = _sf(
                                pd.to_numeric(g[showup_col], errors="coerce").sum()
                            )

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

# ── 运营时间感知：不同月段可激励的指标 ──────────────────────────
# 结果指标（付费/业绩）需要 2-3 周漏斗周期
# 过程指标（触达/打卡/拨打）行为可立即改变
_OUTCOME_METRICS = {"paid", "revenue", "revenue_usd", "payments"}
_MID_METRICS = {"leads", "showup", "registrations"}  # 注册/出席
_PROCESS_METRICS = {
    "checkin_rate",
    "participation_rate",
    "cc_reach_rate",
    "ss_reach_rate",
    "lp_reach_rate",
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

# 月末过程指标推荐（杠杆分析无法覆盖的纯行为指标）
_PROCESS_RECOMMENDATIONS = [
    {
        "role": "CC",
        "metric": "checkin_rate",
        "rationale_zh": "提升打卡率，增加学员触达基础",
        "name_suffix": "打卡",
        "name_th_suffix": "เช็คอิน",
    },
    {
        "role": "CC",
        "metric": "participation_rate",
        "rationale_zh": "提升参与率，扩大转介绍漏斗入口",
        "name_suffix": "参与",
        "name_th_suffix": "การมีส่วนร่วม",
    },
    {
        "role": "CC",
        "metric": "cc_reach_rate",
        "rationale_zh": "提升触达率，增加有效沟通覆盖",
        "name_suffix": "触达",
        "name_th_suffix": "การติดต่อ",
    },
]


def _get_month_phase(month: str) -> tuple[str, int, str]:
    """返回 (phase, remaining_workdays, phase_label_zh)"""
    from backend.core.time_period import compute_month_progress

    mp = compute_month_progress()
    remaining = int(mp.remaining_workdays)
    if remaining > 20:
        return "early", remaining, "月初（全维度可激励）"
    if remaining > 10:
        return "mid", remaining, "月中（漏斗中段冲刺）"
    if remaining > 3:
        return "late", remaining, "月末（仅过程指标可激励）"
    return "closing", remaining, "月末收尾（建议规划下月）"


@router.get("/recommend", summary="AI 杠杆分析 — 返回 top 3 内场激励推荐")
def get_recommendations(
    month: str | None = None,
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
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

    # 6. 时间感知 + 指标分布
    phase, remaining, phase_label = _get_month_phase(month)
    cc_metrics = _get_role_metrics("CC", dm)
    metric_values: dict[str, list[float]] = {}
    for _pname, pdata in cc_metrics.items():
        for mk in (
            "paid",
            "leads",
            "showup",
            "revenue",
            "checkin_rate",
            "participation_rate",
            "cc_reach_rate",
        ):
            v = pdata.get(mk)
            if v is not None and v > 0:
                metric_values.setdefault(mk, []).append(float(v))

    # 月份信息
    today = date.today()
    y, m_num = int(month[:4]), int(month[4:6])
    import calendar

    month_last = calendar.monthrange(y, m_num)[1]
    month_end = f"{y}-{m_num:02d}-{month_last}"
    start = max(today.isoformat(), f"{y}-{m_num:02d}-01")

    _METRIC_ZH = {
        "paid": "付费",
        "leads": "注册",
        "showup": "出席",
        "revenue": "业绩",
        "checkin_rate": "打卡率",
        "participation_rate": "参与率",
        "cc_reach_rate": "触达率",
    }
    _METRIC_TH = {
        "paid": "ยอดชำระ",
        "leads": "ยอดลงทะเบียน",
        "showup": "ยอดเข้าเรียน",
        "revenue": "ยอดขาย",
        "checkin_rate": "อัตราเช็คอิน",
        "participation_rate": "อัตราการมีส่วนร่วม",
        "cc_reach_rate": "อัตราการติดต่อ",
    }
    _MONTH_TH = [
        "",
        "ม.ค.",
        "ก.พ.",
        "มี.ค.",
        "เม.ย.",
        "พ.ค.",
        "มิ.ย.",
        "ก.ค.",
        "ส.ค.",
        "ก.ย.",
        "ต.ค.",
        "พ.ย.",
        "ธ.ค.",
    ]

    # ── 所有月段都展示真实杠杆分析 ──
    # 月末：杠杆数据不变，但标记 actionable=false（下月初创建）
    levers: list[dict[str, Any]] = []
    for i, score in enumerate(sorted_stages[:3]):
        stage = score["stage"]
        mapping = _STAGE_TO_METRIC.get(stage, {})
        suggested: dict[str, Any] | None = None

        if mapping and score["revenue_impact"] > 0:
            metric_key = mapping.get("metric", "paid")
            role = mapping.get("role", "CC")

            # 判断当前月段是否可立即创建
            if metric_key in _OUTCOME_METRICS:
                actionable = phase == "early"
            elif metric_key in _MID_METRICS:
                actionable = phase in ("early", "mid")
            else:
                actionable = True  # 过程指标随时可创建

            # Smart threshold: P60
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

        # actionable 标记：月末结果指标→下月创建
        is_actionable = actionable if mapping else False
        action_note = ""
        if not is_actionable and mapping:
            if phase == "closing":
                action_note = "建议下月初创建"
            elif phase == "late":
                action_note = "结果指标需 2-3 周转化，建议下月初"
            elif phase == "mid":
                action_note = "月中可创建冲刺版"

        levers.append(
            {
                "rank": i + 1,
                "stage": stage,
                "stage_label": _STAGE_LABEL.get(stage, stage),
                "leverage_score": score["leverage_score"],
                "revenue_impact_usd": score["revenue_impact"],
                "current_rate": score.get("actual_rate"),
                "target_rate": score.get("target_rate"),
                "suggested_campaign": suggested,
                "actionable": is_actionable,
                "action_note": action_note,
            }
        )

    # 重编号（月中可能 skip 了结果指标）
    for idx, lev in enumerate(levers):
        lev["rank"] = idx + 1

    campaign_type = {
        "early": "โบนัสประจำเดือน（月度基础）",
        "mid": "Sprint สัปดาห์（冲刺）",
        "late": "Push สุดท้าย（最终冲刺）",
        "closing": "วางแผนเดือนหน้า（规划下月）",
    }.get(phase, "")

    return {
        "analysis_date": today.isoformat(),
        "month": month,
        "phase": phase,
        "phase_label": phase_label,
        "remaining_workdays": remaining,
        "campaign_type": campaign_type,
        "levers": levers,
    }


# ── 活动 CRUD ─────────────────────────────────────────────────────────────────


_OP_FUNCS: dict[str, Any] = {
    "gte": lambda v, t: v >= t,
    "lte": lambda v, t: v <= t,
    "gt": lambda v, t: v > t,
    "lt": lambda v, t: v < t,
}


def _check_condition(value: float, operator: str, threshold: float) -> bool:
    """判断 value 是否满足 operator+threshold 条件。"""
    fn = _OP_FUNCS.get(operator)
    return fn(value, threshold) if fn is not None else False


@router.get("/campaigns", summary="读取活动列表")
def list_campaigns(
    month: str | None = None,
    status: str | None = None,
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
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

    # 为每个活动计算轻量 qualified_count / total_count
    for c in result:
        try:
            metrics = _get_role_metrics(c.get("role", "CC"), dm)
            metric_key = c.get("metric", "leads")
            op = c.get("operator", "gte")
            thr = float(c.get("threshold", 0))
            c["qualified_count"] = sum(
                1
                for _, m in metrics.items()
                if m.get(metric_key) is not None
                and _check_condition(float(m[metric_key]), op, thr)
            )
            c["total_count"] = len(metrics)
        except Exception:
            c["qualified_count"] = None
            c["total_count"] = None

    return result


@router.post("/campaigns", summary="新建激励活动")
def create_campaign(body: CampaignCreateBody) -> dict[str, Any]:
    campaigns = _load_campaigns_raw()

    # 去重校验：同月 + 同角色 + 同指标 不可重复创建 active/paused 活动
    existing = [
        c
        for c in campaigns
        if c.get("month") == body.month
        and c.get("role") == body.role
        and c.get("metric") == body.metric
        and c.get("status") in ("active", "paused")
    ]
    if existing:
        existing_id = existing[0]["id"]
        raise HTTPException(
            status_code=409,
            detail=(
                f"该月份已有 {body.role} {body.metric} 的进行中活动"
                f"（ID: {existing_id}）"
            ),
        )

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
    filters: UnifiedFilter = Depends(parse_filters),
) -> list[dict[str, Any]]:
    if month is None:
        month = date.today().strftime("%Y%m")

    # 只取 active 活动
    campaigns = [
        c
        for c in _load_campaigns_raw()
        if c.get("status") == "active" and c.get("month") == month
    ]

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
            records.append(
                {
                    "person_name": name,
                    "team": pdata.get("team", ""),
                    "metric_value": actual,
                    "threshold": threshold,
                    "gap": gap,
                    "progress_pct": pct,
                    "status": status,
                    "reward_thb": earned,
                }
            )

        records.sort(key=lambda r: r["progress_pct"], reverse=True)

        qualified_count = sum(1 for r in records if r["status"] == "qualified")
        close_count = sum(1 for r in records if r["status"] == "close")
        total_thb = sum(r["reward_thb"] for r in records)

        results.append(
            {
                "campaign": camp,
                "records": records,
                "qualified_count": qualified_count,
                "close_count": close_count,
                "total_estimated_thb": round(total_thb, 2),
            }
        )

    return results


# ── 海报生成 ───────────────────────────────────────────────────────────────────

_THAI_FONTS = [
    "Tahoma",
    "Angsana New",
    "Browallia New",
    "Arial Unicode MS",
    "DejaVu Sans",
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
    "",
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
]


# ── 海报设计体系（Warm Neutral + 品牌色点缀）──────────────────────────────────

# 设计体系 token → RGB（from globals.css）
_DS = {
    "n50": (250, 250, 248),
    "n100": (244, 244, 240),
    "n200": (232, 231, 225),
    "n300": (212, 212, 196),
    "n400": (163, 163, 142),
    "n500": (115, 115, 96),
    "n700": (61, 61, 55),
    "n800": (41, 37, 33),
    "n900": (28, 24, 21),
    "brand_gold": (255, 209, 0),
    "brand_navy": (27, 54, 93),
    "success": (45, 159, 111),
    "warning": (232, 147, 42),
    "danger": (224, 85, 69),
    "chart_orange": (232, 147, 42),
    "chart_green": (45, 159, 111),
    "chart_blue": (27, 54, 93),
}

# 主题：只用设计体系色，通过色带色+背景深浅区分
_POSTER_THEMES: dict[str, dict[str, Any]] = {
    "fire": {
        "bg": _DS["n900"],
        "card": _DS["n800"],
        "stripe": _DS["warning"],  # 暖橙色带
        "title_color": _DS["n50"],
        "accent": _DS["warning"],
        "label": "Sprint Challenge",
    },
    "target": {
        "bg": _DS["n900"],
        "card": _DS["n800"],
        "stripe": _DS["success"],  # 翡翠绿色带
        "title_color": _DS["n50"],
        "accent": _DS["success"],
        "label": "Target Achievement",
    },
    "growth": {
        "bg": _DS["n900"],
        "card": _DS["n800"],
        "stripe": _DS["brand_navy"],  # 深蓝色带
        "title_color": _DS["n50"],
        "accent": _DS["brand_gold"],
        "label": "Growth Boost",
    },
    "honor": {
        "bg": _DS["n900"],
        "card": _DS["n800"],
        "stripe": _DS["brand_gold"],  # 金色带
        "title_color": _DS["brand_gold"],
        "accent": _DS["brand_gold"],
        "label": "Honor Reward",
    },
    "compete": {
        "bg": _DS["brand_navy"],
        "card": (35, 70, 120),
        "stripe": _DS["brand_gold"],
        "title_color": _DS["n50"],
        "accent": _DS["brand_gold"],
        "label": "Team Challenge",
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


def _build_poster_image(camp: dict[str, Any]) -> bytes:
    """设计体系海报：Warm Neutral 底 + 品牌色点缀，Apple/Notion 风"""
    from PIL import Image, ImageDraw, ImageFont

    W, H = 1080, 1350

    # ── 字体 ──
    _FC = [
        ("/System/Library/Fonts/Supplemental/Tahoma Bold.ttf", True),
        ("/System/Library/Fonts/Supplemental/Tahoma.ttf", False),
        ("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", None),
        ("/System/Library/Fonts/STHeiti Medium.ttc", None),
    ]
    bp = rp = ""
    for fp, ib in _FC:
        if Path(fp).exists():
            if ib is True and not bp:
                bp = fp
            elif ib is False and not rp:
                rp = fp
            elif ib is None:
                rp = rp or fp
                bp = bp or fp
    rp = rp or bp or "arial.ttf"
    bp = bp or rp

    def font(sz: int, bold: bool = False):
        return ImageFont.truetype(bp if bold else rp, sz)

    # ── 主题 ──
    metric = camp.get("metric", "")
    tk = _METRIC_TO_THEME.get(metric, "compete")
    th = _POSTER_THEMES[tk]
    bg = th["bg"]
    card = th["card"]
    stripe = th["stripe"]
    accent = th["accent"]
    title_c = th["title_color"]

    WHITE = (255, 255, 255)
    n50 = _DS["n50"]
    n400 = _DS["n400"]
    n500 = _DS["n500"]

    # ── 画布 ──
    img = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(img)
    cx = W // 2

    # ── 顶部色带（12px，主题标识色）──
    draw.rectangle([0, 0, W, 12], fill=stripe)

    # ── 品牌 ──
    draw.text(
        (cx, 55),
        "51Talk Thailand",
        font=font(20),
        fill=n500,
        anchor="mm",
    )
    draw.text(
        (cx, 82),
        th["label"],
        font=font(14),
        fill=n500,
        anchor="mm",
    )

    # ── 主标题 ──
    title = camp.get("name_th") or camp.get("name", "")
    draw.text(
        (cx, 180),
        title,
        font=font(46, bold=True),
        fill=title_c,
        anchor="mm",
    )

    # ── 细分隔线 ──
    draw.rectangle([cx - 40, 230, cx + 40, 232], fill=accent)

    # ── 卡片 ──
    cm, ct, cb = 72, 280, 920
    draw.rounded_rectangle(
        [cm, ct, W - cm, cb],
        radius=16,
        fill=card,
    )

    # 卡片内左侧色条
    draw.rectangle([cm, ct + 16, cm + 4, cb - 16], fill=accent)

    # ── 卡片内容（左对齐，更优雅）──
    lx = 130  # 左边距

    # 参与对象
    role = camp.get("role", "CC")
    role_th = {
        "CC": "CC (ฝ่ายขายหน้าบ้าน)",
        "SS": "SS (ฝ่ายขายหลังบ้าน)",
        "LP": "LP (ฝ่ายบริการ)",
    }.get(role, role)
    draw.text((lx, ct + 45), "สำหรับ", font=font(16), fill=n400)
    draw.text(
        (lx, ct + 75),
        role_th,
        font=font(28, bold=True),
        fill=n50,
    )

    # 分隔
    draw.rectangle(
        [lx, ct + 125, W - cm - 40, ct + 126],
        fill=n500,
    )

    # 条件
    ml = _METRIC_TH_POSTER.get(metric, metric)
    op = _OP_TH.get(camp.get("operator", "gte"), ">=")
    thr = camp.get("threshold", 0)
    ts = str(int(thr)) if thr == int(thr) else str(thr)
    draw.text(
        (lx, ct + 150),
        "เป้าหมาย",
        font=font(16),
        fill=n400,
    )
    draw.text(
        (lx, ct + 185),
        f"{ml}  {op}  {ts}",
        font=font(32, bold=True),
        fill=WHITE,
    )

    # 分隔
    draw.rectangle(
        [lx, ct + 245, W - cm - 40, ct + 246],
        fill=n500,
    )

    # 奖励
    reward = camp.get("reward_thb", 0)
    draw.text(
        (lx, ct + 275),
        "รางวัล",
        font=font(16),
        fill=n400,
    )
    draw.text(
        (lx, ct + 320),
        f"฿{reward:,.0f}",
        font=font(64, bold=True),
        fill=accent,
    )
    draw.text(
        (lx + 10, ct + 395),
        "ต่อคน",
        font=font(16),
        fill=n400,
    )

    # 分隔
    draw.rectangle(
        [lx, ct + 440, W - cm - 40, ct + 441],
        fill=n500,
    )

    # 日期
    ms = camp.get("month", "")
    start = camp.get("start_date", "")
    end = camp.get("end_date", "")
    if ms and len(ms) == 6:
        mn = int(ms[4:6])
        mlab = _MONTH_TH_FULL[mn] if mn <= 12 else ""
        yr = int(ms[:4]) + 543
        period = f"{mlab} {yr}"
    elif start and end:
        period = f"{start}  —  {end}"
    else:
        period = ""
    if period:
        draw.text(
            (lx, ct + 470),
            "ระยะเวลา",
            font=font(16),
            fill=n400,
        )
        draw.text(
            (lx, ct + 505),
            period,
            font=font(26, bold=True),
            fill=n50,
        )

    # ── 底部 ──
    draw.rectangle([0, H - 4, W, H], fill=stripe)
    draw.text(
        (cx, H - 30),
        "51Talk  ·  Referral Operations",
        font=font(13),
        fill=n500,
        anchor="mm",
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
            "Content-Disposition": (f'attachment; filename="poster_{campaign_id}.png"')
        },
    )


# ── 预算配置 ───────────────────────────────────────────────────────────────────


@router.get("/budget", summary="读取激励预算配置")
def get_budget(
    month: str | None = None,
    filters: UnifiedFilter = Depends(parse_filters),
) -> dict[str, Any]:
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

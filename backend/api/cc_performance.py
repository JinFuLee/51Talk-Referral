"""CC 个人业绩全维度 API

路由：GET /api/cc-performance?month=YYYYMM

数据来源：
  D2 (enclosure_cc)   — 围场汇总，含过程指标
  D3 (detail)         — 明细表，含接通数
  D4 (students)       — 学员表，含拨打/接通/出席
"""

from __future__ import annotations

import io
import json
import math
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.core.time_period import compute_month_progress
from backend.models.cc_performance import (
    CCPerformanceRecord,
    CCPerformanceResponse,
    CCPerformanceTeamSummary,
    ConversionRate,
    OutreachMetric,
    PerformanceMetric,
)

router = APIRouter()

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_CONFIG_DIR = _PROJECT_ROOT / "config"
_PROJECT_CONFIG_PATH = _PROJECT_ROOT / "projects" / "referral" / "config.json"


# ── 工具函数 ──────────────────────────────────────────────────────────────────


def _sf(val) -> float | None:
    """safe float：NaN / None → None"""
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    try:
        f = float(val)
        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return None


def _si(val) -> int | None:
    """safe int"""
    f = _sf(val)
    return int(round(f)) if f is not None else None


def _read_json(path: Path, default: Any = None) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return default
    return default


def _load_exchange_rate() -> float:
    stored = _read_json(_CONFIG_DIR / "exchange_rate.json", {})
    if stored and "rate" in stored:
        return float(stored["rate"])
    proj_cfg = _read_json(_PROJECT_CONFIG_PATH, {})
    return float(proj_cfg.get("exchange_rate", {}).get("THB_USD", 34.0))


def _load_targets(month: str) -> dict:
    """合并 targets_override.json + config.json 月度目标，返回指定月份的目标字典"""
    proj_cfg = _read_json(_PROJECT_CONFIG_PATH, {})
    base = dict(proj_cfg.get("monthly_targets", {}).get(month, {}))
    overrides = _read_json(_CONFIG_DIR / "targets_override.json", {})
    base.update(overrides.get(month, {}))
    return base


def _load_cc_targets(month: str) -> dict:
    """读取 config/cc_targets_YYYYMM.json，返回 dict[cc_name → target_dict]。

    文件不存在时返回空 dict。
    """
    path = _CONFIG_DIR / f"cc_targets_{month}.json"
    data = _read_json(path, {})
    return data.get("targets", {}) if isinstance(data, dict) else {}


def _load_outreach_calls_per_day() -> int:
    proj_cfg = _read_json(_PROJECT_CONFIG_PATH, {})
    return int(proj_cfg.get("ranking_targets", {}).get("outreach_calls_per_day", 30))


def _detect_cc_col(df: pd.DataFrame) -> str | None:
    """探测 D3/D4 中 CC 列名"""
    candidates = [
        "last_cc_name",
        "末次CC员工姓名",
        "末次（当前）分配CC员工姓名",
    ]
    for c in candidates:
        if c in df.columns:
            return c
    return None


def _safe_mode(series: pd.Series):
    """取 mode 第一个值，空时返回 None"""
    m = series.mode()
    return str(m.iloc[0]) if not m.empty else None


def _metric(actual, target) -> PerformanceMetric:
    a = _sf(actual)
    t = _sf(target)
    gap = (a - t) if (a is not None and t is not None) else None
    ach = (a / t) if (a is not None and t is not None and t > 0) else None
    return PerformanceMetric(target=t, actual=a, gap=gap, achievement_pct=ach)


def _conv_rate(actual, target=None) -> ConversionRate:
    a = _sf(actual)
    t = _sf(target)
    ach = (a / t) if (a is not None and t is not None and t > 0) else None
    return ConversionRate(actual=a, target=t, achievement_pct=ach)


def _outreach(count, base) -> OutreachMetric:
    c = _si(count)
    prop = (c / base) if (c is not None and base and base > 0) else None
    return OutreachMetric(count=c, proportion=_sf(prop))


# ── 数据聚合 ──────────────────────────────────────────────────────────────────


def _agg_d2(df: pd.DataFrame) -> pd.DataFrame:
    """D2 (enclosure_cc) groupby last_cc_name，返回 DataFrame，index=cc_name"""
    cc_col = "last_cc_name"
    if cc_col not in df.columns:
        return pd.DataFrame()

    grp_col = "last_cc_group_name"

    sum_cols = {
        "leads_actual": "转介绍注册数",
        "paid_actual": "转介绍付费数",
        "revenue_actual": "总带新付费金额USD",
        "students_count": "学员数",
    }
    mean_cols = {
        "participation_rate": "转介绍参与率",
        "checkin_rate": "当月有效打卡率",
        "cc_reach_rate": "CC触达率",
        "coefficient": "带新系数",
    }

    rows = []
    for cc_name, g in df.groupby(cc_col, sort=False):
        if not cc_name or str(cc_name).strip() in ("nan", "NaN", ""):
            continue
        row: dict[str, Any] = {"cc_name": str(cc_name)}
        row["team"] = _safe_mode(g[grp_col]) if grp_col in g.columns else None
        for field, col in sum_cols.items():
            s = (
                pd.to_numeric(g[col], errors="coerce")
                if col in g.columns
                else pd.Series(dtype=float)
            )
            row[field] = _sf(s.sum()) if not s.empty else None
        for field, col in mean_cols.items():
            s = (
                pd.to_numeric(g[col], errors="coerce")
                if col in g.columns
                else pd.Series(dtype=float)
            )
            row[field] = _sf(s.mean()) if not s.empty else None
        rows.append(row)

    return pd.DataFrame(rows).set_index("cc_name") if rows else pd.DataFrame()


def _agg_d4(df: pd.DataFrame, month: str) -> pd.DataFrame:
    """D4 (students) groupby CC 列，返回拨打/出席/有效接通指标"""
    cc_col = _detect_cc_col(df)
    if not cc_col:
        return pd.DataFrame()

    # 解析月份范围（T-1 视角，只判断月份前缀 YYYYMM）
    try:
        month_prefix = f"{month[:4]}-{month[4:6]}"
    except Exception:
        month_prefix = ""

    rows = []
    for cc_name, g in df.groupby(cc_col, sort=False):
        if not cc_name or str(cc_name).strip() in ("nan", "NaN", ""):
            continue
        row: dict[str, Any] = {"cc_name": str(cc_name)}

        # 出席
        showup_col = "当月推荐出席人数"
        row["showup_actual"] = (
            _sf(pd.to_numeric(g[showup_col], errors="coerce").sum())
            if showup_col in g.columns
            else None
        )

        # 本月已拨打学员数（末次拨打日期在本月）
        dial_date_col = "CC末次拨打日期(day)"
        if dial_date_col in g.columns and month_prefix:
            dates = g[dial_date_col].astype(str)
            row["called_this_month"] = int(dates.str.startswith(month_prefix).sum())
        else:
            row["called_this_month"] = None

        # 总拨打次数
        calls_col = "总CC拨打次数"
        row["calls_total"] = (
            _si(pd.to_numeric(g[calls_col], errors="coerce").sum())
            if calls_col in g.columns
            else None
        )

        # 有效接通 >= 120s
        duration_col = "CC末次接通时长"
        if duration_col in g.columns:
            dur = pd.to_numeric(g[duration_col], errors="coerce")
            row["effective_count"] = int((dur >= 120).sum())
        else:
            row["effective_count"] = None

        # 学员总数（=该 CC 名下所有行数）
        row["leads_user_a"] = len(g)

        rows.append(row)

    return pd.DataFrame(rows).set_index("cc_name") if rows else pd.DataFrame()


def _agg_d3(df: pd.DataFrame) -> pd.DataFrame:
    """D3 (detail) groupby CC 列，返回本月接通数"""
    cc_col = _detect_cc_col(df)
    if not cc_col:
        return pd.DataFrame()

    rows = []
    connected_col = "CC接通"
    for cc_name, g in df.groupby(cc_col, sort=False):
        if not cc_name or str(cc_name).strip() in ("nan", "NaN", ""):
            continue
        row: dict[str, Any] = {"cc_name": str(cc_name)}
        row["connected_count"] = (
            _si(pd.to_numeric(g[connected_col], errors="coerce").sum())
            if connected_col in g.columns
            else None
        )
        rows.append(row)

    return pd.DataFrame(rows).set_index("cc_name") if rows else pd.DataFrame()


# ── 核心业务逻辑 ─────────────────────────────────────────────────────────────


def _build_record(
    cc_name: str,
    row: pd.Series,
    targets: dict,
    total_students: float,
    call_target: int,
    mp,  # MonthProgress
    cc_targets: dict | None = None,
) -> CCPerformanceRecord:
    """将合并后的行数据构建为 CCPerformanceRecord

    D2 数据源只有转介绍口径，所有业绩指标 = 转介绍业绩。
    """

    team = str(row.get("team") or "")
    students_count = _si(row.get("students_count"))

    # ── 目标 ──
    team_paid_target = _si(targets.get("付费目标"))
    alloc_ratio = (
        (students_count / total_students)
        if (students_count and total_students > 0)
        else 0.0
    )

    # 个人目标（上传或按学员数分配）
    cc_target = cc_targets.get(cc_name, {}) if cc_targets else {}
    revenue_target = _sf(cc_target.get("referral_usd_target"))
    is_allocated = cc_target.get("_allocated", False)
    target_source = (
        "allocated" if (is_allocated or revenue_target is None) else "manual"
    )

    # ── 实际值 ──
    revenue_actual = _sf(row.get("revenue_actual"))
    paid_actual = _sf(row.get("paid_actual"))
    leads_actual = _sf(row.get("leads_actual"))
    showup_actual = _sf(row.get("showup_actual"))

    # ── ASP ──
    asp_actual = (
        revenue_actual / paid_actual
        if (revenue_actual is not None and paid_actual and paid_actual > 0)
        else None
    )
    asp_target = _sf(targets.get("客单价"))

    # ── 从 revenue_target 推算其余目标 ──
    asp_for_derive = asp_target or asp_actual
    paid_target_raw = (
        revenue_target / asp_for_derive
        if (revenue_target is not None and asp_for_derive and asp_for_derive > 0)
        else None
    )
    paid_target = round(paid_target_raw) if paid_target_raw is not None else None
    if paid_target is None:
        paid_target = (
            round(team_paid_target * alloc_ratio)
            if (team_paid_target is not None and team_paid_target > 0)
            else None
        )

    # lead_target = paid_target / leads→paid 转化率（实际值 fallback 团队目标）
    l2p_actual = (
        paid_actual / leads_actual
        if (paid_actual is not None and leads_actual and leads_actual > 0)
        else None
    )
    l2p_rate = _sf(targets.get("目标转化率")) or l2p_actual
    lead_target_raw = (
        paid_target / l2p_rate
        if (paid_target is not None and l2p_rate and l2p_rate > 0)
        else None
    )
    lead_target_val = round(lead_target_raw) if lead_target_raw is not None else None

    # showup_target = paid_target / showup→paid 转化率（优先团队目标，fallback 实际值）
    s2p_target = _sf(targets.get("出席转化率"))
    s2p_actual = (
        paid_actual / showup_actual
        if (paid_actual is not None and showup_actual and showup_actual > 0)
        else None
    )
    s2p_rate = s2p_target or s2p_actual
    showup_target_raw = (
        paid_target / s2p_rate
        if (paid_target is not None and s2p_rate and s2p_rate > 0)
        else None
    )
    showup_target_val = (
        round(showup_target_raw) if showup_target_raw is not None else None
    )

    # ── 转化率 ──
    showup_to_paid_actual = (
        paid_actual / showup_actual
        if (paid_actual is not None and showup_actual and showup_actual > 0)
        else None
    )
    leads_to_paid_actual = (
        paid_actual / leads_actual
        if (paid_actual is not None and leads_actual and leads_actual > 0)
        else None
    )

    # ── 节奏指标 ──
    elapsed = mp.elapsed_workdays
    remaining = mp.remaining_workdays
    time_progress = mp.time_progress

    current_daily_avg = (
        revenue_actual / elapsed
        if (revenue_actual is not None and elapsed > 0)
        else None
    )
    remaining_daily_avg = (
        (revenue_target - revenue_actual) / remaining
        if (revenue_target is not None and revenue_actual is not None and remaining > 0)
        else None
    )
    pace_daily_needed_val = max(
        0.0,
        ((revenue_target * time_progress - revenue_actual) / remaining) if (
            revenue_target is not None and revenue_actual is not None and remaining > 0
        ) else 0.0,
    )
    pace_daily_needed = pace_daily_needed_val if remaining > 0 else None
    efficiency_lift_pct = (
        remaining_daily_avg / current_daily_avg - 1
        if (
            remaining_daily_avg is not None
            and current_daily_avg
            and current_daily_avg > 0
        )
        else None
    )
    pace_gap_pct = (
        (revenue_actual / revenue_target - time_progress)
        if (revenue_actual is not None and revenue_target and revenue_target > 0)
        else None
    )

    # ── 拨打覆盖 ──
    calls_total = _si(row.get("calls_total"))
    called_this_month = _si(row.get("called_this_month"))
    call_proportion = (
        called_this_month / students_count
        if (called_this_month is not None and students_count and students_count > 0)
        else None
    )
    call_achievement_pct = (
        called_this_month / call_target
        if (called_this_month is not None and call_target and call_target > 0)
        else None
    )

    # ── 接通 / 有效接通 ──
    connected_count = _si(row.get("connected_count"))
    effective_count = _si(row.get("effective_count"))

    return CCPerformanceRecord(
        team=team,
        cc_name=cc_name,
        revenue=_metric(revenue_actual, revenue_target),
        pace_gap_pct=_sf(pace_gap_pct),
        paid=_metric(paid_actual, paid_target),
        asp=_metric(asp_actual, asp_target),
        showup=_metric(showup_actual, showup_target_val),
        leads=_metric(leads_actual, lead_target_val),
        leads_user_a=_si(row.get("leads_user_a")),
        showup_to_paid=_conv_rate(showup_to_paid_actual),
        leads_to_paid=_conv_rate(leads_to_paid_actual, _sf(targets.get("目标转化率"))),
        calls_total=calls_total,
        called_this_month=called_this_month,
        call_target=call_target,
        call_proportion=_sf(call_proportion),
        call_achievement_pct=_sf(call_achievement_pct),
        connected=_outreach(connected_count, students_count),
        effective=_outreach(effective_count, students_count),
        participation_rate=_sf(row.get("participation_rate")),
        checkin_rate=_sf(row.get("checkin_rate")),
        cc_reach_rate=_sf(row.get("cc_reach_rate")),
        coefficient=_sf(row.get("coefficient")),
        students_count=students_count,
        target_source=target_source,
        team_revenue_target=None,
        team_paid_target=team_paid_target,
        remaining_daily_avg=_sf(remaining_daily_avg),
        pace_daily_needed=_sf(pace_daily_needed),
        current_daily_avg=_sf(current_daily_avg),
        efficiency_lift_pct=_sf(efficiency_lift_pct),
    )


def _sum_metric(records: list[CCPerformanceRecord], field: str) -> PerformanceMetric:
    """跨 records 求和 PerformanceMetric"""
    actuals = [
        getattr(r, field).actual
        for r in records
        if getattr(r, field).actual is not None
    ]
    targets = [
        getattr(r, field).target
        for r in records
        if getattr(r, field).target is not None
    ]
    a = sum(actuals) if actuals else None
    t = sum(targets) if targets else None
    gap = (a - t) if (a is not None and t is not None) else None
    ach = (a / t) if (a is not None and t is not None and t > 0) else None
    return PerformanceMetric(target=t, actual=a, gap=gap, achievement_pct=ach)


def _avg_conversion(records: list[CCPerformanceRecord], field: str) -> ConversionRate:
    vals = [
        getattr(r, field).actual
        for r in records
        if getattr(r, field).actual is not None
    ]
    a = sum(vals) / len(vals) if vals else None
    return ConversionRate(actual=a)


def _build_team_summary(
    team: str, records: list[CCPerformanceRecord]
) -> CCPerformanceTeamSummary:
    """将团队所有 records 聚合为 CCPerformanceTeamSummary"""
    headcount = len(records)
    students_total = sum(r.students_count or 0 for r in records) or None

    # 聚合连续字段
    calls_total = sum(r.calls_total or 0 for r in records) or None
    called_this_month = sum(r.called_this_month or 0 for r in records) or None
    call_target_sum = sum(r.call_target or 0 for r in records) or None
    call_prop = (
        called_this_month / students_total
        if (called_this_month and students_total and students_total > 0)
        else None
    )
    call_ach = (
        called_this_month / call_target_sum
        if (called_this_month and call_target_sum and call_target_sum > 0)
        else None
    )

    connected_total = sum(r.connected.count or 0 for r in records) or None
    effective_total = sum(r.effective.count or 0 for r in records) or None

    # 过程指标均值
    def _avg(attr):
        vals = [getattr(r, attr) for r in records if getattr(r, attr) is not None]
        return sum(vals) / len(vals) if vals else None

    return CCPerformanceTeamSummary(
        team=team,
        headcount=headcount,
        revenue=_sum_metric(records, "revenue"),
        paid=_sum_metric(records, "paid"),
        asp=_sum_metric(records, "asp"),
        showup=_sum_metric(records, "showup"),
        leads=_sum_metric(records, "leads"),
        showup_to_paid=_avg_conversion(records, "showup_to_paid"),
        leads_to_paid=_avg_conversion(records, "leads_to_paid"),
        calls_total=calls_total,
        called_this_month=called_this_month,
        call_target=call_target_sum,
        call_proportion=_sf(call_prop),
        call_achievement_pct=_sf(call_ach),
        connected=_outreach(connected_total, students_total),
        effective=_outreach(effective_total, students_total),
        participation_rate=_avg("participation_rate"),
        checkin_rate=_avg("checkin_rate"),
        cc_reach_rate=_avg("cc_reach_rate"),
        coefficient=_avg("coefficient"),
        students_count=_si(students_total),
        records=records,
    )


# ── API 端点 ──────────────────────────────────────────────────────────────────


@router.get(
    "/cc-performance/targets/template",
    summary="下载 CC 个人目标上传模板（CSV）",
)
def get_cc_targets_template(
    month: str = Query(..., description="YYYYMM 格式月份"),
    dm: DataManager = Depends(get_data_manager),
) -> StreamingResponse:
    """生成 CC 个人目标上传模板，预填 CC 名字，目标列为空"""
    data = dm.load_all()
    df_d2 = data.get("enclosure_cc", pd.DataFrame())

    cc_names: list[str] = []
    if not df_d2.empty and "last_cc_name" in df_d2.columns:
        cc_names = [
            str(n)
            for n in df_d2["last_cc_name"].dropna().unique()
            if str(n).strip() not in ("nan", "NaN", "")
        ]
    cc_names.sort()

    header = "cc_name,referral_usd_target\n"
    rows = "".join(f"{name},\n" for name in cc_names)
    content = header + rows

    disposition = f'attachment; filename="cc_targets_template_{month}.csv"'
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8-sig")),  # utf-8-sig 保证 Excel 正确显示中文
        media_type="text/csv",
        headers={"Content-Disposition": disposition},
    )


@router.post(
    "/cc-performance/targets/upload",
    summary="上传 CC 个人目标（CSV 或 Excel）",
)
def upload_cc_targets(
    month: str = Query(..., description="YYYYMM 格式月份"),
    file: UploadFile = File(...),
) -> dict:
    """解析上传的 CSV/Excel，写入 config/cc_targets_YYYYMM.json"""
    content = file.file.read()
    filename = file.filename or ""

    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        df = pd.read_excel(io.BytesIO(content))
    else:
        df = pd.read_csv(io.BytesIO(content))

    if "cc_name" not in df.columns:
        raise HTTPException(status_code=400, detail="缺少 cc_name 列")

    numeric_cols = ["referral_usd_target"]
    targets: dict[str, dict] = {}
    total_rows = 0
    skipped_empty = 0
    duplicates: list[str] = []
    for _, row in df.iterrows():
        cc_name = str(row["cc_name"]).strip()
        if not cc_name or cc_name in ("nan", "NaN"):
            skipped_empty += 1
            continue
        total_rows += 1
        if cc_name in targets:
            duplicates.append(cc_name)
        entry: dict[str, Any] = {}
        for col in numeric_cols:
            if col in row.index:
                val = _sf(row[col])
                if val is not None:
                    entry[col] = val
        targets[cc_name] = entry

    payload = {
        "month": month,
        "updated_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "targets": targets,
    }

    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    target_path = _CONFIG_DIR / f"cc_targets_{month}.json"
    tmp_path = target_path.with_suffix(".tmp")
    json_str = json.dumps(payload, ensure_ascii=False, indent=2)
    tmp_path.write_text(json_str, encoding="utf-8")
    tmp_path.rename(target_path)

    return {
        "status": "ok",
        "count": len(targets),
        "total_rows": total_rows,
        "duplicates": len(duplicates),
        "duplicate_names": sorted(set(duplicates)),
        "skipped_empty": skipped_empty,
        "month": month,
    }


@router.delete(
    "/cc-performance/targets/{month}",
    summary="删除 CC 个人目标配置",
)
def delete_cc_targets(month: str) -> dict:
    """删除 config/cc_targets_YYYYMM.json"""
    target_path = _CONFIG_DIR / f"cc_targets_{month}.json"
    if target_path.exists():
        target_path.unlink()
    return {"status": "ok", "deleted": True}


@router.get(
    "/cc-performance",
    response_model=CCPerformanceResponse,
    summary="CC 个人业绩全维度报表",
)
def get_cc_performance(
    request: Request,
    month: str | None = None,
    dm: DataManager = Depends(get_data_manager),
) -> CCPerformanceResponse:
    """
    CC 个人业绩全维度 API。

    - month: YYYYMM，默认当前月份
    - 返回按团队分组的 CC 个人记录 + 各团队汇总 + 全局汇总
    """
    today = date.today()
    if not month:
        month = today.strftime("%Y%m")

    # 时间进度
    mp = compute_month_progress(reference_date=today)

    # 加载数据
    data = dm.load_all()
    df_d2 = data.get("enclosure_cc", pd.DataFrame())
    df_d3 = data.get("detail", pd.DataFrame())
    df_d4 = data.get("students", pd.DataFrame())

    # 聚合三个数据源
    agg_d2 = _agg_d2(df_d2) if not df_d2.empty else pd.DataFrame()
    agg_d4 = _agg_d4(df_d4, month) if not df_d4.empty else pd.DataFrame()
    agg_d3 = _agg_d3(df_d3) if not df_d3.empty else pd.DataFrame()

    # 合并
    merged = agg_d2
    if not merged.empty:
        if not agg_d4.empty:
            merged = merged.join(agg_d4, how="left", rsuffix="_d4")
        if not agg_d3.empty:
            merged = merged.join(agg_d3, how="left", rsuffix="_d3")
    elif not agg_d4.empty:
        merged = agg_d4
        if not agg_d3.empty:
            merged = merged.join(agg_d3, how="left", rsuffix="_d3")

    if merged.empty:
        return CCPerformanceResponse(
            month=month,
            time_progress_pct=mp.time_progress,
            elapsed_workdays=int(mp.elapsed_workdays),
            remaining_workdays=int(mp.remaining_workdays),
            exchange_rate=_load_exchange_rate(),
            teams=[],
            grand_total=None,
        )

    # 全局学员总数（用于目标加权）
    total_students = _sf(merged.get("students_count", pd.Series()).sum()) or 1.0

    # 配置
    targets = _load_targets(month)
    cc_targets = _load_cc_targets(month)
    calls_per_day = _load_outreach_calls_per_day()
    call_target = int(calls_per_day * mp.total_workdays)

    # ── 团队转介绍目标（铁数字，来自 config hard.referral_revenue）──
    hard = targets.get("hard", {})
    team_referral_target = _sf(hard.get("referral_revenue"))

    # ── 构建 case-insensitive 上传目标查找 ──
    # 上传 CC 名大小写可能与 D2 不一致，统一 lower 匹配
    uploaded_lower: dict[str, dict] = {}
    for cc_name_key, cc_t in (cc_targets or {}).items():
        val = _sf(cc_t.get("referral_usd_target"))
        if val is not None:
            uploaded_lower[cc_name_key.lower()] = cc_t

    sum_uploaded = sum(
        _sf(v.get("referral_usd_target")) or 0.0
        for v in uploaded_lower.values()
    )

    # ── 未上传 CC 按学员数分配剩余额度 ──
    remaining_budget = (
        max(0.0, team_referral_target - sum_uploaded)
        if team_referral_target is not None
        else 0.0
    )
    unassigned_students = 0.0
    for cc_name_iter in merged.index:
        if str(cc_name_iter).lower() not in uploaded_lower:
            s = _sf(merged.at[cc_name_iter, "students_count"])
            unassigned_students += s if s else 0.0

    # 构建 enriched_cc_targets（key = D2 原名，大小写匹配 D2）
    enriched_cc_targets: dict[str, dict] = {}
    for cc_name_iter in merged.index:
        cc_str = str(cc_name_iter)
        cc_lower = cc_str.lower()
        if cc_lower in uploaded_lower:
            # 已上传：原样使用
            enriched_cc_targets[cc_str] = uploaded_lower[cc_lower]
        else:
            # 未上传：按学员数分配剩余
            s = _sf(merged.at[cc_name_iter, "students_count"])
            alloc = (
                remaining_budget * (s / unassigned_students)
                if (s and unassigned_students > 0)
                else None
            )
            if alloc is not None:
                enriched_cc_targets[cc_str] = {
                    "referral_usd_target": round(alloc, 2),
                    "_allocated": True,  # 标记为自动分配
                }

    # 构建个人记录
    all_records: list[CCPerformanceRecord] = []
    for cc_name, row in merged.iterrows():
        rec = _build_record(
            cc_name=str(cc_name),
            row=row,
            targets=targets,
            total_students=total_students,
            call_target=call_target,
            mp=mp,
            cc_targets=enriched_cc_targets,
        )
        all_records.append(rec)

    # 按团队分组
    team_map: dict[str, list[CCPerformanceRecord]] = {}
    for rec in all_records:
        team_map.setdefault(rec.team or "未知团队", []).append(rec)

    teams = [_build_team_summary(team, recs) for team, recs in sorted(team_map.items())]

    # 全局汇总行
    grand_total: CCPerformanceRecord | None = None
    if all_records:
        # 直接用所有 records 聚合出一个伪 grand_total
        gt_students = sum(r.students_count or 0 for r in all_records) or None
        gt_revenue_actual = sum(r.revenue.actual or 0 for r in all_records) or None
        # 团队目标用 config hard.referral_revenue（铁数字），不用个人之和
        gt_revenue_target = team_referral_target or (
            sum(r.revenue.target or 0 for r in all_records) or None
        )
        gt_paid_actual = sum(r.paid.actual or 0 for r in all_records) or None
        gt_paid_target = sum(r.paid.target or 0 for r in all_records) or None
        gt_leads_actual = sum(r.leads.actual or 0 for r in all_records) or None
        gt_showup_actual = sum(r.showup.actual or 0 for r in all_records) or None
        gt_calls_total = sum(r.calls_total or 0 for r in all_records) or None
        gt_called = sum(r.called_this_month or 0 for r in all_records) or None
        gt_call_target = sum(r.call_target or 0 for r in all_records) or None
        gt_connected = sum(r.connected.count or 0 for r in all_records) or None
        gt_effective = sum(r.effective.count or 0 for r in all_records) or None

        def _avg_field(attr):
            vals = [
                getattr(r, attr)
                for r in all_records
                if getattr(r, attr) is not None
            ]
            return sum(vals) / len(vals) if vals else None

        _gt_asp = (
            gt_revenue_actual / gt_paid_actual
            if (gt_revenue_actual and gt_paid_actual and gt_paid_actual > 0)
            else None
        )
        _gt_s2p = (
            gt_paid_actual / gt_showup_actual
            if (gt_paid_actual and gt_showup_actual and gt_showup_actual > 0)
            else None
        )
        _gt_l2p = (
            gt_paid_actual / gt_leads_actual
            if (gt_paid_actual and gt_leads_actual and gt_leads_actual > 0)
            else None
        )
        _gt_cp = (
            gt_called / gt_students
            if (gt_called and gt_students and gt_students > 0)
            else None
        )
        _gt_ca = (
            gt_called / gt_call_target
            if (gt_called and gt_call_target and gt_call_target > 0)
            else None
        )
        grand_total = CCPerformanceRecord(
            team="合计",
            cc_name="全体",
            revenue=_metric(gt_revenue_actual, gt_revenue_target),
            pace_gap_pct=_avg_field("pace_gap_pct"),
            paid=_metric(gt_paid_actual, gt_paid_target),
            asp=_metric(_gt_asp, _sf(targets.get("客单价"))),
            showup=_metric(gt_showup_actual, None),
            leads=_metric(gt_leads_actual, None),
            leads_user_a=_si(
                sum(r.leads_user_a or 0 for r in all_records) or None
            ),
            showup_to_paid=_conv_rate(_gt_s2p),
            leads_to_paid=_conv_rate(_gt_l2p),
            calls_total=gt_calls_total,
            called_this_month=gt_called,
            call_target=gt_call_target,
            call_proportion=_sf(_gt_cp),
            call_achievement_pct=_sf(_gt_ca),
            connected=_outreach(gt_connected, gt_students),
            effective=_outreach(gt_effective, gt_students),
            participation_rate=_avg_field("participation_rate"),
            checkin_rate=_avg_field("checkin_rate"),
            cc_reach_rate=_avg_field("cc_reach_rate"),
            coefficient=_avg_field("coefficient"),
            students_count=_si(gt_students),
            target_source="allocated",
            team_revenue_target=None,
            team_paid_target=_si(targets.get("付费目标")),
            remaining_daily_avg=_avg_field("remaining_daily_avg"),
            pace_daily_needed=_avg_field("pace_daily_needed"),
            current_daily_avg=_avg_field("current_daily_avg"),
            efficiency_lift_pct=_avg_field("efficiency_lift_pct"),
        )

    return CCPerformanceResponse(
        month=month,
        time_progress_pct=mp.time_progress,
        elapsed_workdays=int(mp.elapsed_workdays),
        remaining_workdays=int(mp.remaining_workdays),
        exchange_rate=_load_exchange_rate(),
        teams=teams,
        grand_total=grand_total,
    )

"""BM（Benchmark 节奏）日历引擎

按业务节奏权重将月度 KPI 分配到每日，支持特殊日期覆盖和 Kick Off 自动标记。

day_type 枚举值：
  - "weekday": 普通工作日（周一/二/四/五）
  - "dayoff":  周三（Day Off 基线）
  - "weekend": 周六/日
  - "kickoff": 当月第一个 Kick Off 会议日（auto_kickoff=True 时自动标记）
  - "holiday_off": 调休特殊日
  - "special": 用户自定义特殊日
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# 默认 BM 原始权重（对应 config.json bm_config.raw_weights）
# ---------------------------------------------------------------------------

DEFAULT_RAW_WEIGHTS: dict[str, float] = {
    "weekday": 3.0,      # 周一/二/四/五
    "saturday": 5.0,     # 周六
    "sunday": 5.0,       # 周日
    "wednesday": 1.0,    # 周三 Day Off 基线
    "kickoff": 2.0,      # Kick Off 会议日
    "holiday_off": 1.0,  # 调休
}


# ---------------------------------------------------------------------------
# 数据结构
# ---------------------------------------------------------------------------

@dataclass
class BmDay:
    """单日 BM 节奏数据"""
    date: date
    day_of_week: int          # 0=周一 … 6=周日
    day_type: str             # weekday / dayoff / weekend / kickoff / holiday_off / special
    raw_weight: float         # 原始权重（未归一化）
    bm_daily_pct: float       # 归一化后当日占全月百分比
    bm_mtd_pct: float         # 截至当日（含）的累计百分比
    is_override: bool         # 是否被 specials 覆盖
    label: str                # 可选标签（如"调休万佛节""Kick Off"）


@dataclass
class BmCalendar:
    """当月 BM 日历"""
    month: str                # 格式 "YYYYMM"
    days: list[BmDay]
    total_raw_weight: float


# ---------------------------------------------------------------------------
# 核心函数
# ---------------------------------------------------------------------------

def generate_bm_calendar(
    year: int,
    month: int,
    raw_weights: dict[str, float] | None = None,
    specials: list[dict[str, Any]] | None = None,
    auto_kickoff: bool = True,
) -> BmCalendar:
    """
    生成指定月份的 BM 节奏日历。

    Args:
        year:         年份
        month:        月份 1-12
        raw_weights:  各 day_type 的原始权重（覆盖 DEFAULT_RAW_WEIGHTS）
        specials:     特殊日列表，每项 {"date":"YYYY-MM-DD","weight":N,"label":"..."}
        auto_kickoff: True 时自动将当月第一个非周三且非 special 的工作日标为 kickoff

    Returns:
        BmCalendar 实例
    """
    weights = {**DEFAULT_RAW_WEIGHTS, **(raw_weights or {})}

    # 构建 specials 索引 {date: {weight, label, day_type}}
    specials_map: dict[date, dict[str, Any]] = {}
    for sp in (specials or []):
        try:
            d = date.fromisoformat(sp["date"])
            specials_map[d] = {
                "weight": float(sp.get("weight", 1.0)),
                "label": sp.get("label", ""),
                "day_type": sp.get("day_type", "holiday_off"),
            }
        except (KeyError, ValueError):
            continue

    # 生成当月所有日期
    if month == 12:
        month_end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(year, month + 1, 1) - timedelta(days=1)

    all_dates: list[date] = []
    cur = date(year, month, 1)
    while cur <= month_end:
        all_dates.append(cur)
        cur += timedelta(days=1)

    # 确定 kickoff 日期（auto_kickoff=True 时）
    kickoff_date: date | None = None
    if auto_kickoff:
        for d in all_dates:
            # Kick Off = 第一个非周三(2)、非周末(5/6)、非 special 的工作日
            if d not in specials_map and d.weekday() not in (2, 5, 6):
                kickoff_date = d
                break

    # 构建每日数据（第一遍：确定 day_type 和 raw_weight）
    raw_days: list[tuple[date, str, float, bool, str]] = []
    # (date, day_type, raw_weight, is_override, label)

    for d in all_dates:
        if d in specials_map:
            sp = specials_map[d]
            raw_days.append((d, sp["day_type"], sp["weight"], True, sp["label"]))
            continue

        if d == kickoff_date:
            raw_days.append((d, "kickoff", weights["kickoff"], False, "Kick Off"))
            continue

        dow = d.weekday()
        if dow == 2:
            raw_days.append((d, "dayoff", weights["wednesday"], False, ""))
        elif dow == 5:
            raw_days.append((d, "weekend", weights["saturday"], False, ""))
        elif dow == 6:
            raw_days.append((d, "weekend", weights["sunday"], False, ""))
        else:
            raw_days.append((d, "weekday", weights["weekday"], False, ""))

    # 归一化
    total_raw = sum(r[2] for r in raw_days)
    if total_raw == 0:
        total_raw = 1.0

    bm_days: list[BmDay] = []
    cumulative = 0.0
    for d, day_type, rw, is_override, label in raw_days:
        daily_pct = rw / total_raw
        cumulative += daily_pct
        bm_days.append(BmDay(
            date=d,
            day_of_week=d.weekday(),
            day_type=day_type,
            raw_weight=rw,
            bm_daily_pct=round(daily_pct, 6),
            bm_mtd_pct=round(cumulative, 6),
            is_override=is_override,
            label=label,
        ))

    return BmCalendar(
        month=f"{year:04d}{month:02d}",
        days=bm_days,
        total_raw_weight=round(total_raw, 4),
    )


def get_bm_snapshot(calendar: BmCalendar, reference_date: date) -> dict[str, Any]:
    """
    基于 T-1 逻辑计算 BM 节奏快照。

    Args:
        calendar:       当月 BM 日历
        reference_date: 基准日（今天），数据截止到 T-1

    Returns:
        dict with: bm_mtd_pct, bm_remaining_pct, bm_today_pct,
                   bm_yesterday_pct, today_type, reference_date
    """
    yesterday = reference_date - timedelta(days=1)

    bm_mtd_pct = 0.0
    bm_today_pct = 0.0
    bm_yesterday_pct = 0.0
    bm_remaining_pct = 0.0
    today_type = "unknown"

    for day in calendar.days:
        if day.date < reference_date:
            bm_mtd_pct += day.bm_daily_pct
        elif day.date == reference_date:
            bm_today_pct = day.bm_daily_pct
            today_type = day.day_type
            bm_remaining_pct += day.bm_daily_pct
        else:
            bm_remaining_pct += day.bm_daily_pct

        if day.date == yesterday:
            bm_yesterday_pct = day.bm_daily_pct

    return {
        "bm_mtd_pct": round(bm_mtd_pct, 6),
        "bm_remaining_pct": round(bm_remaining_pct, 6),
        "bm_today_pct": round(bm_today_pct, 6),
        "bm_yesterday_pct": round(bm_yesterday_pct, 6),
        "today_type": today_type,
        "reference_date": reference_date.isoformat(),
    }


def load_bm_config(
    project_dir: Path,
) -> tuple[dict[str, float], dict[str, list[dict[str, Any]]]]:
    """
    加载 BM 配置，override 文件优先于 config.json。

    Args:
        project_dir: 项目根目录（包含 projects/referral/config.json 和 config/ 目录）

    Returns:
        (raw_weights, monthly_specials)
        monthly_specials: {"YYYYMM": [{"date":"...", "weight":N, "label":"..."}]}
    """
    # 1. 从 projects/referral/config.json 读取基础 bm_config
    config_path = project_dir / "projects" / "referral" / "config.json"
    raw_weights: dict[str, float] = dict(DEFAULT_RAW_WEIGHTS)
    monthly_specials: dict[str, list[dict[str, Any]]] = {}

    if config_path.exists():
        try:
            cfg = json.loads(config_path.read_text(encoding="utf-8"))
            bm_cfg = cfg.get("bm_config", {})
            if bm_cfg.get("raw_weights"):
                raw_weights.update(bm_cfg["raw_weights"])
            if bm_cfg.get("monthly_specials"):
                monthly_specials.update(bm_cfg["monthly_specials"])
        except Exception:
            pass

    # 2. 从 config/bm_specials_override.json 读取用户覆盖（月级别 key 覆盖）
    override_path = project_dir / "config" / "bm_specials_override.json"
    if override_path.exists():
        try:
            overrides = json.loads(override_path.read_text(encoding="utf-8"))
            # override 完全替换对应月份的 specials
            for month_key, specials in overrides.items():
                if specials is not None:
                    monthly_specials[month_key] = specials
        except Exception:
            pass

    return raw_weights, monthly_specials

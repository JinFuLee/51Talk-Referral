"""打卡面板 API — 全部基于 D3（detail）明细表

设计原则：
  打卡是学员自主行为（宽口径）。学员打卡了，负责该围场的 CC/SS/LP 都"得分"。
  区别是按谁的名字分组展示。

D3 列：stdt_id, 围场, 有效打卡(1/0),
        last_cc_name, last_cc_group_name,
        last_ss_name, last_ss_group_name,
        last_lp_name, last_lp_group_name

围场-角色映射（宽口）：
  CC:  0~30, 31~60, 61~90
  SS:  91~120
  LP:  121~150, 151~180
  运营: M6+, 181+

当前 D3 只有 0~30 的数据 → SS/LP 显示 0 是数据源限制，代码正确。
未来 D3 覆盖更多围场时自动生效。
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request, Response

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager

router = APIRouter()

# ── Config 动态加载 ─────────────────────────────────────────────────────────

_CONFIG_CACHE: dict | None = None
_CONFIG_MTIME: float = 0.0
_CONFIG_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "projects" / "referral" / "config.json"
)
_OVERRIDE_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "config" / "enclosure_role_override.json"
)


def _get_config() -> dict:
    """Lazy load config.json，带 mtime 检查，文件更新时自动重载。
    读取失败时返回空 dict，各调用方有 fallback。"""
    global _CONFIG_CACHE, _CONFIG_MTIME
    try:
        current_mtime = _CONFIG_PATH.stat().st_mtime
    except OSError:
        current_mtime = 0.0

    if _CONFIG_CACHE is None or current_mtime != _CONFIG_MTIME:
        try:
            with open(_CONFIG_PATH, encoding="utf-8") as f:
                _CONFIG_CACHE = json.load(f)
            _CONFIG_MTIME = current_mtime
        except Exception:
            _CONFIG_CACHE = {}
    return _CONFIG_CACHE


# ── 常量 ─────────────────────────────────────────────────────────────────────

# D3 围场原始字符串 → M 标签
# 纯数学映射（M0=0-30, M1=31-60...），与 config.json enclosure_role_wide 保持一致
_M_MAP: dict[str, str] = {
    "0~30":    "M0",
    "31~60":   "M1",
    "61~90":   "M2",
    "91~120":  "M3",
    "121~150": "M4",
    "151~180": "M5",
    "M6+":     "M6+",
    "181+":    "M6+",  # 兼容写法
}

# 围场段 → 天数映射（与前端 M_TO_DAYS 对齐）
_M_TO_DAYS: dict[str, tuple[int, int]] = {
    "0~30": (0, 30), "31~60": (31, 60), "61~90": (61, 90),
    "91~120": (91, 120), "121~150": (121, 150), "151~180": (151, 180),
    "M6+": (181, 9999),
}

# ── 硬编码 fallback（当 config.json 读取失败时使用）─────────────────────────

_WIDE_ROLE_FALLBACK: dict[str, list[str]] = {
    "CC": ["0~30", "31~60", "61~90"],
    "SS": ["91~120"],
    "LP": ["121~150", "151~180"],
    "运营": ["M6+", "181+"],
}

_ROLE_COLS_FALLBACK: dict[str, tuple[str, str]] = {
    "CC": ("last_cc_name", "last_cc_group_name"),
    "SS": ("last_ss_name", "last_ss_group_name"),
    "LP": ("last_lp_name", "last_lp_group_name"),
}

_QUALITY_SCORE_FALLBACK: dict = {
    "lesson_max": 15, "lesson_weight": 40,
    "referral_max": 3, "referral_weight": 30,
    "payment_max": 2, "payment_weight": 20,
    "enclosure_weights": {"0": 10, "1": 8, "2": 6, "3": 4, "default": 2},
}

_INVALID_NAMES_FALLBACK: frozenset[str] = frozenset({"nan", "小计", "合计", ""})

# ── 动态加载函数 ──────────────────────────────────────────────────────────────


def _get_wide_role() -> dict[str, list[str]]:
    """从 config/enclosure_role_override.json 的 wide 字段读取围场-角色映射。
    override 不存在时 fallback 到 config.json enclosure_role_wide，再到硬编码。

    override 格式: {"wide": {"M0": ["CC"], "M3": ["SS"], ...}}
    返回格式: {"CC": ["0~30", "31~60"], "SS": ["91~120"], ...}
    """
    # M 标签 → 围场段映射（用于 override 格式转换）
    _M_TO_BAND: dict[str, str] = {
        "M0": "0~30", "M1": "31~60", "M2": "61~90",
        "M3": "91~120", "M4": "121~150", "M5": "151~180", "M6+": "M6+",
    }

    # 优先读取 override 文件
    try:
        if _OVERRIDE_PATH.exists():
            override_data = json.loads(_OVERRIDE_PATH.read_text(encoding="utf-8"))
            wide: dict[str, list[str]] | None = override_data.get("wide")
            if wide:
                role_to_bands: dict[str, list[str]] = {}
                for month, roles in wide.items():
                    band = _M_TO_BAND.get(month)
                    if not band:
                        continue
                    for role in roles:
                        if role not in role_to_bands:
                            role_to_bands[role] = []
                        role_to_bands[role].append(band)
                        # 运营特殊：M6+ 同时加 "181+"
                        if month == "M6+" and role == "运营":
                            bands_r = role_to_bands[role]
                            if "181+" not in bands_r:
                                bands_r.append("181+")
                if role_to_bands:
                    return role_to_bands
    except Exception:
        pass

    # fallback：config.json enclosure_role_wide（原逻辑）
    cfg = _get_config().get("enclosure_role_wide", {})
    if not cfg:
        return _WIDE_ROLE_FALLBACK
    result: dict[str, list[str]] = {}
    for role, spec in cfg.items():
        min_d = spec.get("min_days", 0)
        max_d = spec.get("max_days") or 9999
        bands = [
            band for band, (lo, hi) in _M_TO_DAYS.items()
            if lo >= min_d and hi <= max_d
        ]
        # 运营角色（181+）特殊处理：包含 M6+ 和 181+
        if max_d >= 9999:
            for key in ("M6+", "181+"):
                if key not in bands:
                    bands.append(key)
        if bands:
            result[role] = bands
    return result if result else _WIDE_ROLE_FALLBACK


def _get_role_cols() -> dict[str, tuple[str, str]]:
    """从 config.json role_columns 读取各岗位人员列映射。fallback 到硬编码。"""
    cfg = _get_config().get("role_columns", {})
    if not cfg:
        return _ROLE_COLS_FALLBACK
    result: dict[str, tuple[str, str]] = {}
    for role, cols in cfg.items():
        if isinstance(cols, list) and len(cols) >= 2:
            result[role] = (cols[0], cols[1])
    return result if result else _ROLE_COLS_FALLBACK


def _get_invalid_names() -> frozenset[str]:
    """从 config.json invalid_names 读取无效名称集合。fallback 到硬编码。"""
    raw = _get_config().get("invalid_names")
    if not raw:
        return _INVALID_NAMES_FALLBACK
    return frozenset(str(x) for x in raw)


def _get_quality_score_config() -> dict:
    """从 config.json quality_score_config 读取质量评分权重。fallback 到硬编码。"""
    return _get_config().get("quality_score_config", _QUALITY_SCORE_FALLBACK)


# 为保持向后兼容性，保留模块级常量（值在首次使用时从 config 派生）
# 直接使用下面的 getter 函数，不依赖模块级绑定

def _get_wide_role_cached() -> dict[str, list[str]]:
    """模块级 _WIDE_ROLE 的兼容入口，每次从 getter 获取（config 热重载安全）。"""
    return _get_wide_role()


def _parse_role_enclosures(role_config: str | None, role: str) -> list[str] | None:
    """解析前端 role_config JSON → 指定角色的 D3 围场段列表。
    返回 None 表示无配置（fallback 到 _WIDE_ROLE 默认值）。"""
    if not role_config:
        return None
    try:
        parsed = json.loads(role_config)
        cfg = parsed.get(role)
        if not cfg:
            return None
        min_d = cfg.get("min_days", 0)
        max_d = cfg.get("max_days") or 9999
        bands = [
            band for band, (lo, hi) in _M_TO_DAYS.items()
            if lo >= min_d and hi <= max_d
        ]
        return bands if bands else None
    except (json.JSONDecodeError, AttributeError, TypeError):
        return None

# 各岗位人员列（name_col, group_col）— 从 config.json role_columns 动态加载
# 直接调用 _get_role_cols() 获取最新值
def _get_role_cols_snapshot() -> dict[str, tuple[str, str]]:
    """返回当前 config 的 role_cols 快照，供模块级 _ROLE_COLS 使用。"""
    return _get_role_cols()

# D3 列名
_D3_CHECKIN_COL  = "有效打卡"
_D3_STUDENT_COL  = "stdt_id"
_D3_ENCLOSURE_COL = "围场"

# D4 学员 ID 候选列（按优先级）
_D4_STUDENT_ID_CANDIDATES = ["学员id", "stdt_id"]
_D4_LIFECYCLE_COL = "生命周期"


# ── 工具函数 ─────────────────────────────────────────────────────────────────

def _safe(val) -> Any:
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
        return str(val) if val else None


def _safe_str(val) -> str:
    if val is None:
        return ""
    try:
        if pd.isna(val):
            return ""
    except (TypeError, ValueError):
        pass
    return str(val).strip()


def _m_label_to_index(m_label: str) -> int:
    """M0→0, M1→1, ... M6+→6"""
    try:
        return int(m_label.lstrip("M").rstrip("+"))
    except ValueError:
        return 99


def _clean_names(
    df: pd.DataFrame,
    name_col: str,
    group_col: str | None = None,
) -> pd.DataFrame:
    """过滤 nan / 小计 / 合计 / 空值行。
    无效名称集从 config.json invalid_names 动态读取。"""
    invalid = _get_invalid_names()
    df = df.copy()
    if name_col in df.columns:
        mask = ~df[name_col].astype(str).str.strip().isin(invalid)
        mask &= df[name_col].notna()
        df = df[mask]
    if group_col and group_col in df.columns:
        mask = ~df[group_col].astype(str).str.strip().isin({"nan", ""})
        mask &= df[group_col].notna()
        df = df[mask]
    return df


def _find_d4_id_col(df: pd.DataFrame) -> str | None:
    for c in _D4_STUDENT_ID_CANDIDATES:
        if c in df.columns:
            return c
    return None


def _detect_role_from_team(team: str) -> str:
    """从团队名推断岗位。
    优先从 config.json role_team_prefixes 读取各角色前缀列表（SS/LP/CC）；
    fallback 到内置规则：含 SS → SS；含 LP → LP；其余 → CC。
    例：TH-SS01Team → SS, TH-LP02Team → LP, TH-CC01Team → CC"""
    t = team.strip().upper()
    prefixes_cfg = _get_config().get("role_team_prefixes", {})
    if prefixes_cfg:
        # 按 SS → LP → CC 顺序匹配（CC 作为 fallback 最后处理）
        for role in ("SS", "LP"):
            patterns = prefixes_cfg.get(role, [])
            if any(p.upper() in t for p in patterns):
                return role
        # CC 兜底
        return "CC"
    # fallback：内置硬编码规则
    if "SS" in t:
        return "SS"
    if "LP" in t:
        return "LP"
    return "CC"


def _calc_quality_score(row_d3: pd.Series, d4_row: pd.Series | None) -> float:
    """
    质量评分（满分 100），权重从 config.json quality_score_config 动态读取：
      lesson_score   = min(本月课耗 / lesson_max, 1.0) * lesson_weight
      referral_score = min(当月推荐注册人数 / referral_max, 1.0) * referral_weight
      payment_score  = min(本月推荐付费数 / payment_max, 1.0) * payment_weight
      enclosure_score = enclosure_weights[m_idx] 或 enclosure_weights["default"]
    """
    qsc = _get_quality_score_config()
    enc_weights_raw: dict = qsc.get(
        "enclosure_weights",
        {"0": 10, "1": 8, "2": 6, "3": 4, "default": 2},
    )
    # 将字符串键转为 int 键（JSON 只能用字符串键），保留 "default"
    enc_weights: dict[int | str, int] = {}
    for k, v in enc_weights_raw.items():
        try:
            enc_weights[int(k)] = int(v)
        except (ValueError, TypeError):
            enc_weights[k] = int(v)  # "default" 等非数字键原样保留

    # 围场分
    enc_raw = None
    if d4_row is not None:
        enc_raw = d4_row.get(_D4_LIFECYCLE_COL) or d4_row.get("围场")
    enc_raw = enc_raw if enc_raw is not None else (
        row_d3.get("生命周期") or row_d3.get("围场")
    )
    m_label = _M_MAP.get(_safe_str(enc_raw), "M0") if enc_raw is not None else "M0"
    m_idx = _m_label_to_index(m_label)
    enclosure_score = enc_weights.get(m_idx, enc_weights.get("default", 2))

    if d4_row is None:
        return float(enclosure_score)

    lesson_max = float(qsc.get("lesson_max", 15))
    lesson_weight = float(qsc.get("lesson_weight", 40))
    referral_max = float(qsc.get("referral_max", 3))
    referral_weight = float(qsc.get("referral_weight", 30))
    payment_max = float(qsc.get("payment_max", 2))
    payment_weight = float(qsc.get("payment_weight", 20))

    lesson_val = _safe(d4_row.get("本月课耗")) or _safe(d4_row.get("课耗")) or 0.0
    lesson_score = min(float(lesson_val) / lesson_max, 1.0) * lesson_weight

    reg_val = (
        _safe(d4_row.get("当月推荐注册人数"))
        or _safe(d4_row.get("总推荐注册人数"))
        or 0.0
    )
    referral_score = min(float(reg_val) / referral_max, 1.0) * referral_weight

    pay_val = (
        _safe(d4_row.get("本月推荐付费数")) or _safe(d4_row.get("推荐付费")) or 0.0
    )
    payment_score = min(float(pay_val) / payment_max, 1.0) * payment_weight

    return round(lesson_score + referral_score + payment_score + enclosure_score, 1)


# ── 核心聚合 ──────────────────────────────────────────────────────────────────

def _aggregate_role(
    df_d3: pd.DataFrame,
    role: str,
    enclosures_override: list[str] | None = None,
) -> dict[str, Any]:
    """
    从 D3 聚合单个角色的打卡数据。

    - subset：筛选该角色负责的围场段
    - by_team：按 group_col 分组
    - by_enclosure：按围场段分组（使用 M 标签）

    enclosures_override: 外部传入的围场列表（来自前端 Settings），优先于硬编码默认值。
    """
    role_cols = _get_role_cols()
    name_col, group_col = role_cols.get(role, ("last_cc_name", "last_cc_group_name"))
    wide_role = _get_wide_role()
    enclosures = (
        enclosures_override if enclosures_override else wide_role.get(role, [])
    )

    # 按围场筛选
    if _D3_ENCLOSURE_COL in df_d3.columns:
        subset = df_d3[df_d3[_D3_ENCLOSURE_COL].isin(enclosures)].copy()
    else:
        subset = df_d3.copy()

    # 过滤无效人员行
    if name_col in subset.columns:
        gc = group_col if group_col in subset.columns else None
        subset = _clean_names(subset, name_col, gc)

    total = len(subset)
    checked = 0
    rate = 0.0

    if total > 0 and _D3_CHECKIN_COL in subset.columns:
        checked = int(
            pd.to_numeric(subset[_D3_CHECKIN_COL], errors="coerce")
            .fillna(0)
            .sum()
        )
        rate = checked / total

    # by_team
    by_team: list[dict] = []
    if total > 0 and group_col in subset.columns:
        for grp, g in subset.groupby(group_col, sort=False):
            grp_str = _safe_str(grp)
            if grp_str.lower() in _get_invalid_names():
                continue
            t = len(g)
            c = (
                int(
                    pd.to_numeric(g[_D3_CHECKIN_COL], errors="coerce")
                    .fillna(0)
                    .sum()
                )
                if _D3_CHECKIN_COL in g.columns
                else 0
            )
            by_team.append({
                "team":       grp_str,
                "students":   t,
                "checked_in": c,
                "rate":       round(c / t, 4) if t > 0 else 0.0,
            })
        by_team.sort(key=lambda x: x["rate"], reverse=True)

    # by_enclosure
    by_enclosure: list[dict] = []
    for enc in enclosures:
        if _D3_ENCLOSURE_COL in subset.columns:
            e = subset[subset[_D3_ENCLOSURE_COL] == enc]
        else:
            e = subset.iloc[0:0]
        t = len(e)
        c = (
            int(
                pd.to_numeric(e[_D3_CHECKIN_COL], errors="coerce")
                .fillna(0)
                .sum()
            )
            if t > 0 and _D3_CHECKIN_COL in e.columns
            else 0
        )
        by_enclosure.append({
            "enclosure":  _M_MAP.get(enc, enc),
            "students":   t,
            "checked_in": c,
            "rate":       round(c / t, 4) if t > 0 else 0.0,
        })

    return {
        "total_students": total,
        "checked_in":     checked,
        "checkin_rate":   round(rate, 4),
        "by_team":        by_team,
        "by_enclosure":   by_enclosure,
    }


# 运营渠道推荐配置
_OPS_CHANNELS: list[dict[str, Any]] = [
    {
        "channel_id": "phone",
        "channel_name": "电话/短信",
        "priority": "high",
        "cost_level": "high",
        "description": "高价值学员人工触达",
        "target_criteria": "质量评分≥70",
        "estimated_contact_rate": 0.70,
    },
    {
        "channel_id": "line_oa",
        "channel_name": "LINE OA",
        "priority": "medium",
        "cost_level": "medium",
        "description": "社交触达，适合 M6-M7 中等质量学员",
        "target_criteria": "质量评分≥40 且 M6-M7 围场",
        "estimated_contact_rate": 0.40,
    },
    {
        "channel_id": "app_push",
        "channel_name": "APP 站内推送",
        "priority": "medium",
        "cost_level": "low",
        "description": "自动化批量触达",
        "target_criteria": "全部 M6+ 未打卡",
        "estimated_contact_rate": 0.18,
    },
    {
        "channel_id": "email",
        "channel_name": "邮件",
        "priority": "low",
        "cost_level": "lowest",
        "description": "兜底广撒网",
        "target_criteria": "全部 M6+ 未打卡",
        "estimated_contact_rate": 0.10,
    },
]


def _aggregate_ops_channels(
    df_d3: pd.DataFrame,
    df_d4: pd.DataFrame,
    enclosures_override: list[str] | None = None,
) -> dict[str, Any]:
    """运营角色聚合：按渠道推荐 + 围场子段，不使用 CC/SS/LP 人员列。"""
    enclosures = enclosures_override or ["M6+", "181+"]

    # 筛选 M6+ 围场学员
    if _D3_ENCLOSURE_COL in df_d3.columns:
        subset = df_d3[df_d3[_D3_ENCLOSURE_COL].isin(enclosures)].copy()
    else:
        subset = df_d3.copy()

    total = len(subset)
    checked = 0
    if total > 0 and _D3_CHECKIN_COL in subset.columns:
        checked = int(
            pd.to_numeric(subset[_D3_CHECKIN_COL], errors="coerce").fillna(0).sum()
        )
    rate = checked / total if total > 0 else 0.0
    unchecked = total - checked

    # 构建 D4 索引，计算未打卡学员质量评分
    d3_id_col = _D3_STUDENT_COL if _D3_STUDENT_COL in subset.columns else None
    d4_id_col = _find_d4_id_col(df_d4) if not df_d4.empty else None
    d4_index: dict[str, pd.Series] = {}
    if d4_id_col and not df_d4.empty:
        for _, row in df_d4.iterrows():
            sid = _safe_str(row.get(d4_id_col, ""))
            if sid:
                d4_index[sid] = row

    quality_scores: list[float] = []
    for _, row in subset.iterrows():
        is_checked = pd.to_numeric(row.get(_D3_CHECKIN_COL, 0), errors="coerce") or 0
        if is_checked > 0:
            continue  # 只统计未打卡学员
        sid = _safe_str(row.get(d3_id_col, "")) if d3_id_col else ""
        d4_row = d4_index.get(sid)
        score = _calc_quality_score(row, d4_row)
        quality_scores.append(score)

    phone_count = sum(1 for s in quality_scores if s >= 70)
    line_count = sum(1 for s in quality_scores if s >= 40)

    channels: list[dict[str, Any]] = []
    for ch_def in _OPS_CHANNELS:
        ch = dict(ch_def)
        if ch["channel_id"] == "phone":
            ch["recommended_count"] = phone_count
        elif ch["channel_id"] == "line_oa":
            ch["recommended_count"] = line_count
        else:
            ch["recommended_count"] = unchecked
        channels.append(ch)

    # 围场子段
    by_enclosure_segment: list[dict[str, Any]] = []
    if _D3_ENCLOSURE_COL in subset.columns:
        for enc_val in sorted(subset[_D3_ENCLOSURE_COL].dropna().unique()):
            seg = subset[subset[_D3_ENCLOSURE_COL] == enc_val]
            t = len(seg)
            c = (
                int(
                    pd.to_numeric(seg[_D3_CHECKIN_COL], errors="coerce")
                    .fillna(0)
                    .sum()
                )
                if _D3_CHECKIN_COL in seg.columns
                else 0
            )
            label = _M_MAP.get(_safe_str(enc_val), _safe_str(enc_val))
            by_enclosure_segment.append({
                "segment": label,
                "label": f"{label}围场",
                "students": t,
                "checked_in": c,
                "rate": round(c / t, 4) if t > 0 else 0.0,
            })

    if not by_enclosure_segment:
        by_enclosure_segment = [
            {
                "segment": "M6+",
                "label": "181天+",
                "students": total,
                "checked_in": checked,
                "rate": round(rate, 4),
            }
        ]

    return {
        "total_students": total,
        "checked_in": checked,
        "checkin_rate": round(rate, 4),
        "channels": channels,
        "by_enclosure_segment": by_enclosure_segment,
        "by_team": [],        # 兼容 SummaryTab ChannelColumn（运营无团队拆分）
        "by_enclosure": [],   # 兼容 SummaryTab ChannelColumn（运营无围场拆分）
        "by_group": [],
        "by_person": [],
    }


def _aggregate_team_members(df_d3: pd.DataFrame, team: str, role: str) -> list[dict]:
    """
    按团队筛选 D3，按 name_col 分组，返回每个销售的打卡情况。
    """
    role_cols = _get_role_cols()
    name_col, group_col = role_cols.get(role, ("last_cc_name", "last_cc_group_name"))

    if name_col not in df_d3.columns or group_col not in df_d3.columns:
        return []

    df = _clean_names(df_d3, name_col, group_col)
    df = df[df[group_col].astype(str).str.strip() == team.strip()].copy()

    if df.empty:
        return []

    if _D3_CHECKIN_COL in df.columns:
        df["_checkin"] = pd.to_numeric(df[_D3_CHECKIN_COL], errors="coerce").fillna(0)
    else:
        df["_checkin"] = 0

    # 围场 M 标签（for by_enclosure）
    if _D3_ENCLOSURE_COL in df.columns:
        df["_m_label"] = df[_D3_ENCLOSURE_COL].map(
            lambda v: _M_MAP.get(_safe_str(v), _safe_str(v))
        )
    else:
        df["_m_label"] = "M?"

    members: list[dict] = []
    for name, person_df in df.groupby(name_col, sort=False):
        t = len(person_df)
        c = int(person_df["_checkin"].sum())
        r = c / t if t > 0 else 0.0

        by_enc: list[dict] = []
        for enc, enc_df in person_df.groupby("_m_label", sort=False):
            et = len(enc_df)
            ec = int(enc_df["_checkin"].sum())
            by_enc.append({
                "enclosure":  str(enc),
                "students":   et,
                "checked_in": ec,
                "rate":       round(ec / et, 4) if et > 0 else 0.0,
            })
        by_enc.sort(key=lambda x: _m_label_to_index(x["enclosure"]))

        members.append({
            "name":           _safe_str(name),
            "total_students": t,
            "checked_in":     c,
            "rate":           round(r, 4),
            "by_enclosure":   by_enc,
        })

    members.sort(key=lambda x: x["rate"], reverse=True)
    return members


def _build_followup_students(
    df_d3: pd.DataFrame,
    df_d4: pd.DataFrame,
    role:  str | None,
    team:  str | None,
    sales: str | None,
) -> list[dict]:
    """
    D3 筛选 有效打卡=0，JOIN D4，返回未打卡学员列表 + 质量评分。
    """
    if df_d3.empty:
        return []

    df = df_d3.copy()

    # 过滤未打卡
    if _D3_CHECKIN_COL in df.columns:
        df = df[pd.to_numeric(df[_D3_CHECKIN_COL], errors="coerce").fillna(0) == 0]

    # 围场 M 标签 + 角色判断
    def _row_enc(row: pd.Series) -> str:
        v = row.get(_D3_ENCLOSURE_COL) if _D3_ENCLOSURE_COL in row.index else None
        if v is None:
            v = row.get("生命周期")
        s = _safe_str(v)
        return _M_MAP.get(s, s) if s else "M?"

    _wide_role_map = _get_wide_role()

    def _enc_to_role(enc: str) -> str:
        for r, bands in _wide_role_map.items():
            if enc in [_M_MAP.get(b, b) for b in bands]:
                return r
        # M 标签直接对比（fallback）
        idx = _m_label_to_index(enc)
        if idx <= 2:
            return "CC"
        if idx == 3:
            return "SS"
        return "LP"

    df["_m_label"] = df.apply(_row_enc, axis=1)
    df["_role"]    = df["_m_label"].apply(_enc_to_role)

    # 按 role 筛选
    if role and role not in ("全部", ""):
        df = df[df["_role"] == role]

    # 根据 role 决定人员列
    _role_key = (role or "").strip().upper()
    _current_role_cols = _get_role_cols()
    if _role_key in _current_role_cols:
        name_col, group_col = _current_role_cols[_role_key]
    else:
        # 未指定 role：按存在性探测（CC 优先）
        _name_candidates = ["last_cc_name", "last_ss_name", "last_lp_name"]
        _group_candidates = [
            "last_cc_group_name",
            "last_ss_group_name",
            "last_lp_group_name",
        ]
        name_col  = next((c for c in _name_candidates  if c in df.columns), None)
        group_col = next((c for c in _group_candidates if c in df.columns), None)

    real_group = group_col if group_col and group_col in df.columns else None
    real_name  = name_col  if name_col  and name_col  in df.columns else None

    if team  and real_group:
        df = df[df[real_group].astype(str).str.strip() == team.strip()]
    if sales and real_name:
        df = df[df[real_name].astype(str).str.strip() == sales.strip()]

    if df.empty:
        return []

    # 构建 D4 索引
    d4_id_col = _find_d4_id_col(df_d4) if not df_d4.empty else None
    d4_index: dict[str, pd.Series] = {}
    if d4_id_col and not df_d4.empty:
        for _, row in df_d4.iterrows():
            sid = _safe_str(row.get(d4_id_col, ""))
            if sid:
                d4_index[sid] = row

    d3_id_col = _D3_STUDENT_COL if _D3_STUDENT_COL in df.columns else None

    students: list[dict] = []
    for _, row in df.iterrows():
        sid   = _safe_str(row.get(d3_id_col, "")) if d3_id_col else ""
        d4_row = d4_index.get(sid)

        enc       = row.get("_m_label", "M?")
        role_val  = row.get("_role", "")

        cc_name  = _safe_str(row.get(real_name  or "", ""))
        team_val = _safe_str(row.get(real_group or "", ""))

        # D4 fallback 姓名/团队
        if not cc_name and d4_row is not None:
            d4_name_col = {
                "CC": "末次（当前）分配CC员工姓名",
                "SS": "末次（当前）分配SS员工姓名",
            }.get(_role_key, "末次（当前）分配CC员工姓名")
            cc_name = _safe_str(d4_row.get(d4_name_col, ""))

        if not team_val and d4_row is not None:
            d4_group_col = {
                "CC": "末次（当前）分配CC员工组名称",
                "SS": "末次（当前）分配SS员工组名称",
            }.get(_role_key, "末次（当前）分配CC员工组名称")
            team_val = _safe_str(d4_row.get(d4_group_col, ""))

        # CC 末次拨打日期
        cc_last_call = None
        if d4_row is not None:
            raw = d4_row.get("CC末次拨打日期(day)")
            if raw is not None:
                s = str(raw)
                if s.startswith("1970"):
                    cc_last_call = None
                else:
                    cc_last_call = s[:10] if len(s) >= 10 else s

        card_days = _safe(d4_row.get("次卡距到期天数")) if d4_row is not None else None
        quality_score = _calc_quality_score(row, d4_row)

        extra: dict[str, Any] = {}
        if d4_row is not None:
            for col in d4_row.index:
                extra[col] = _safe(d4_row[col])

        students.append({
            "student_id":              sid,
            "enclosure":               str(enc),
            "role":                    str(role_val),
            "cc_name":                 cc_name,
            "team":                    team_val,
            "quality_score":          quality_score,
            "lesson_consumption_3m":  (
                _safe(d4_row.get("本月课耗")) if d4_row is not None else None
            ),
            "referral_registrations": (
                _safe(
                    d4_row.get("当月推荐注册人数")
                    or d4_row.get("总推荐注册人数")
                )
                if d4_row is not None
                else None
            ),
            "referral_payments": (
                _safe(d4_row.get("本月推荐付费数")) if d4_row is not None else None
            ),
            "cc_last_call_date":       cc_last_call,
            "card_days_remaining":     card_days,
            "extra":                   extra,
        })

    students.sort(key=lambda s: s["quality_score"], reverse=True)
    return students


# ── API 端点 ──────────────────────────────────────────────────────────────────

@router.get(
    "/checkin/summary",
    summary="打卡汇总（Tab1）— D3 明细表，按角色 / 团队 / 围场分组",
)
def get_checkin_summary(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    role_config: str | None = Query(default=None, description="前端宽口径配置 JSON"),
) -> dict:
    """
    全部从 D3 明细表聚合。优先使用前端传来的 role_config（Settings 宽口径配置），
    否则 fallback 到 config.json enclosure_role_wide（动态加载）。
    """
    d3: pd.DataFrame = dm.load_all().get("detail", pd.DataFrame())

    roles = list(_get_wide_role().keys())
    if role_config:
        try:
            parsed = json.loads(role_config)
            roles = list(parsed.keys()) or roles
        except (json.JSONDecodeError, AttributeError):
            pass

    by_role: dict[str, Any] = {}
    for role in roles:
        override = _parse_role_enclosures(role_config, role)
        if role == "运营":
            d4: pd.DataFrame = dm.load_all().get("students", pd.DataFrame())
            by_role[role] = _aggregate_ops_channels(
                d3, d4, enclosures_override=override
            )
        else:
            by_role[role] = _aggregate_role(d3, role, enclosures_override=override)

    return {"by_role": by_role}


@router.get(
    "/checkin/team-detail",
    summary="团队打卡明细（Tab2）— D3 明细表，按团队查询每个销售的打卡情况",
)
def get_checkin_team_detail(
    request: Request,
    team: str = Query(..., description="团队名称，例如 TH-CC01Team"),
    role_config: str | None = Query(default=None, description="前端宽口径配置 JSON"),
    dm: DataManager = Depends(get_data_manager),
) -> dict:
    """
    根据 team 名前缀判断岗位：
      TH-CC* / CC* → CC，用 last_cc_group_name 匹配，按 last_cc_name 分组
      TH-SS* / SS* → SS，用 last_ss_group_name 匹配，按 last_ss_name 分组
      其他          → LP，用 last_lp_group_name 匹配，按 last_lp_name 分组

    每个人的打卡率 = 该人负责学员中有效打卡数 / 总学员数
    """
    d3: pd.DataFrame = dm.load_all().get("detail", pd.DataFrame())
    role = _detect_role_from_team(team)
    enclosures = _parse_role_enclosures(role_config, role)
    if enclosures and _D3_ENCLOSURE_COL in d3.columns:
        d3 = d3[d3[_D3_ENCLOSURE_COL].isin(enclosures)]
    members = _aggregate_team_members(d3, team, role)
    return {"team": team, "role": role, "members": members}


@router.get(
    "/checkin/followup",
    summary="未打卡跟进名单（Tab3）— D3 JOIN D4，按质量评分降序",
)
def get_checkin_followup(
    request: Request,
    role:  str | None = Query(default=None, description="角色筛选：CC / SS / LP"),
    team:  str | None = Query(default=None, description="团队筛选，例如 TH-CC01Team"),
    sales: str | None = Query(default=None, description="销售姓名筛选，例如 thcc-Zen"),
    enclosure: str | None = Query(
        default=None, description="围场筛选，逗号分隔，例如 M0,M1"
    ),
    role_config: str | None = Query(default=None, description="前端宽口径配置 JSON"),
    dm: DataManager = Depends(get_data_manager),
) -> dict:
    """
    筛选 D3 中 有效打卡==0 的行，按 role/team/sales/enclosure 过滤，
    JOIN D4 获取质量评分字段，降序返回。
    """
    data  = dm.load_all()
    df_d3: pd.DataFrame = data.get("detail",   pd.DataFrame())
    df_d4: pd.DataFrame = data.get("students", pd.DataFrame())

    # 围场筛选：前端传 M 标签（M0,M3），转为 D3 原始值（0~30,91~120）
    if enclosure and _D3_ENCLOSURE_COL in df_d3.columns:
        m_to_raw = {v: k for k, v in _M_MAP.items()}
        enc_list = [e.strip() for e in enclosure.split(",") if e.strip()]
        raw_encs = [m_to_raw.get(e, e) for e in enc_list]
        df_d3 = df_d3[df_d3[_D3_ENCLOSURE_COL].isin(raw_encs)]

    # role_config 围场过滤：按 role 指定的宽口径范围进一步筛选
    if role_config and role and role not in ("全部", ""):
        enc_override = _parse_role_enclosures(role_config, role)
        if enc_override and _D3_ENCLOSURE_COL in df_d3.columns:
            df_d3 = df_d3[df_d3[_D3_ENCLOSURE_COL].isin(enc_override)]

    students = _build_followup_students(df_d3, df_d4, role, team, sales)
    return {
        "students":     students,
        "total":        len(students),
        "score_formula": "课耗(40%) + 推荐活跃(30%) + 付费贡献(20%) + 围场加权(10%)",
    }


@router.get(
    "/checkin/followup/tsv",
    summary="未打卡学员 TSV — 纯文本 tab 分隔，供复制粘贴到表格",
)
def get_checkin_followup_tsv(
    request: Request,
    cc_name: str | None = Query(default=None, description="CC 姓名筛选"),
    team: str | None = Query(default=None, description="团队筛选"),
    role: str = Query(default="CC", description="角色"),
    dm: DataManager = Depends(get_data_manager),
) -> Response:
    """返回纯文本 TSV 格式的未打卡学员列表，浏览器可直接复制粘贴到 Excel。"""
    data = dm.load_all()
    df_d3: pd.DataFrame = data.get("detail", pd.DataFrame())
    df_d4: pd.DataFrame = data.get("students", pd.DataFrame())

    students = _build_followup_students(df_d3, df_d4, role, team, cc_name)

    # 构建 TSV：学员ID\t围场\t评分\t末次拨打\t课耗
    lines = ["学员ID\t围场\t评分\t末次拨打\t课耗"]
    for s in students:
        sid = s.get("student_id", "")
        enc = s.get("enclosure", "")
        score = int(s.get("quality_score", 0) or 0)
        last_call = (s.get("cc_last_call_date") or "—")[:10]
        lesson = s.get("lesson_consumption_3m")
        lesson_str = str(int(lesson)) if lesson is not None else "—"
        lines.append(f"{sid}\t{enc}\t{score}\t{last_call}\t{lesson_str}")

    tsv_text = "\n".join(lines)
    return Response(
        content=tsv_text,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": "inline"},
    )


@router.get(
    "/checkin/ranking",
    summary="打卡排行（Tab2）— 按角色展示小组+个人排名",
)
def get_checkin_ranking(
    request: Request,
    role_config: str | None = Query(default=None, description="前端宽口径配置 JSON"),
    dm: DataManager = Depends(get_data_manager),
) -> dict:
    """按角色返回打卡排行，小组+个人双维度，按打卡率降序→同率按已打卡人数降序。"""
    d3: pd.DataFrame = dm.load_all().get("detail", pd.DataFrame())

    # 确定角色列表
    _wide_role_map = _get_wide_role()
    _role_cols_map = _get_role_cols()
    roles = list(_wide_role_map.keys())
    if role_config:
        try:
            parsed = json.loads(role_config)
            roles = list(parsed.keys()) or roles
        except (json.JSONDecodeError, AttributeError):
            pass

    by_role: dict[str, Any] = {}
    for role in roles:
        override = _parse_role_enclosures(role_config, role)

        # 运营角色：返回渠道推荐数据，不做 by_group/by_person 个人聚合
        if role == "运营":
            d4_ops: pd.DataFrame = dm.load_all().get("students", pd.DataFrame())
            by_role[role] = _aggregate_ops_channels(
                d3, d4_ops, enclosures_override=override
            )
            continue

        name_col, group_col = _role_cols_map.get(
            role, ("last_cc_name", "last_cc_group_name")
        )
        enclosures = override if override else _wide_role_map.get(role, [])

        # 按围场筛选
        if _D3_ENCLOSURE_COL in d3.columns:
            subset = d3[d3[_D3_ENCLOSURE_COL].isin(enclosures)].copy()
        else:
            subset = d3.copy()

        # 过滤无效行
        if name_col in subset.columns:
            gc = group_col if group_col in subset.columns else None
            subset = _clean_names(subset, name_col, gc)

        total = len(subset)
        checked = 0
        rate = 0.0
        if total > 0 and _D3_CHECKIN_COL in subset.columns:
            subset["_ck"] = pd.to_numeric(
                subset[_D3_CHECKIN_COL], errors="coerce"
            ).fillna(0)
            checked = int(subset["_ck"].sum())
            rate = checked / total
        else:
            subset["_ck"] = 0

        # by_group — 按 group_col 聚合
        by_group: list[dict] = []
        if total > 0 and group_col in subset.columns:
            for grp, g in subset.groupby(group_col, sort=False):
                grp_str = _safe_str(grp)
                if grp_str.lower() in _get_invalid_names():
                    continue
                t = len(g)
                c = int(g["_ck"].sum())
                by_group.append({
                    "group": grp_str,
                    "students": t,
                    "checked_in": c,
                    "rate": round(c / t, 4) if t > 0 else 0.0,
                })
            # 排序：① rate DESC ② checked_in DESC
            by_group.sort(key=lambda x: (-x["rate"], -x["checked_in"]))
            for i, g in enumerate(by_group):
                g["rank"] = i + 1

        # by_person — 按 name_col 聚合
        by_person: list[dict] = []
        if total > 0 and name_col in subset.columns:
            for name, pf in subset.groupby(name_col, sort=False):
                name_str = _safe_str(name)
                if name_str.lower() in _get_invalid_names():
                    continue
                t = len(pf)
                c = int(pf["_ck"].sum())
                grp_val = ""
                if group_col in pf.columns:
                    grp_val = _safe_str(pf[group_col].iloc[0])
                by_person.append({
                    "name": name_str,
                    "group": grp_val,
                    "students": t,
                    "checked_in": c,
                    "rate": round(c / t, 4) if t > 0 else 0.0,
                })
            by_person.sort(key=lambda x: (-x["rate"], -x["checked_in"]))
            for i, p in enumerate(by_person):
                p["rank"] = i + 1

        by_role[role] = {
            "total_students": total,
            "checked_in": checked,
            "checkin_rate": round(rate, 4),
            "by_group": by_group,
            "by_person": by_person,
        }

    return {"by_role": by_role}

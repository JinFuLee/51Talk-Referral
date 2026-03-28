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
  运营: 6M, 7M, 8M, 9M, 10M, 11M, 12M, 12M+

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
    "6M":      "M6",
    "7M":      "M7",
    "8M":      "M8",
    "9M":      "M9",
    "10M":     "M10",
    "11M":     "M11",
    "12M":     "M12",
    "12M+":    "M12+",
    # 旧数据兼容
    "M6+":     "M6+",
    "181+":    "M6+",
}

# 围场段 → 天数映射（与前端 M_TO_DAYS 对齐）
_M_TO_DAYS: dict[str, tuple[int, int]] = {
    "0~30": (0, 30), "31~60": (31, 60), "61~90": (61, 90),
    "91~120": (91, 120), "121~150": (121, 150), "151~180": (151, 180),
    "6M": (181, 210), "7M": (211, 240), "8M": (241, 270),
    "9M": (271, 300), "10M": (301, 330), "11M": (331, 360),
    "12M": (361, 390), "12M+": (391, 9999),
    "M6+": (181, 9999),  # 旧数据兼容
}

# ── 硬编码 fallback（当 config.json 读取失败时使用）─────────────────────────

_WIDE_ROLE_FALLBACK: dict[str, list[str]] = {
    "CC": ["0~30", "31~60", "61~90", "0M", "1M", "2M"],
    "SS": ["91~120", "3M"],
    "LP": ["121~150", "151~180", "4M", "5M"],
    "运营": ["6M", "7M", "8M", "9M", "10M", "11M", "12M", "12M+", "M6+", "181+"],
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
        "M3": "91~120", "M4": "121~150", "M5": "151~180",
        "M6": "6M", "M7": "7M", "M8": "8M", "M9": "9M",
        "M10": "10M", "M11": "11M", "M12": "12M", "M12+": "12M+",
        "M6+": "M6+",
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
    """M0→0, M1→1, ... M12→12, M12+→13, M6+→6"""
    s = m_label.lstrip("M")
    if s.endswith("+"):
        # M12+ → 13, M6+ → 6
        try:
            base = int(s.rstrip("+"))
            return base + 1 if base == 12 else base
        except ValueError:
            return 99
    try:
        return int(s)
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

    lesson_max = float(qsc.get("lesson_max", 15)) or 15.0
    lesson_weight = float(qsc.get("lesson_weight", 40))
    referral_max = float(qsc.get("referral_max", 3)) or 3.0
    referral_weight = float(qsc.get("referral_weight", 30))
    payment_max = float(qsc.get("payment_max", 2)) or 2.0
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
        "target_criteria": "全部 6M+ 未打卡",
        "estimated_contact_rate": 0.18,
    },
    {
        "channel_id": "email",
        "channel_name": "邮件",
        "priority": "low",
        "cost_level": "lowest",
        "description": "兜底广撒网",
        "target_criteria": "全部 6M+ 未打卡",
        "estimated_contact_rate": 0.10,
    },
]


def _aggregate_ops_channels(
    df_d3: pd.DataFrame,
    df_d4: pd.DataFrame,
    enclosures_override: list[str] | None = None,
) -> dict[str, Any]:
    """运营角色聚合：按渠道推荐 + 围场子段，不使用 CC/SS/LP 人员列。"""
    enclosures = enclosures_override or [
        "6M", "7M", "8M", "9M", "10M", "11M", "12M", "12M+", "M6+", "181+",
    ]

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
                "segment": "M6~M12+",
                "label": "181天+围场",
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

        # ── 新增字段：SS/LP 负责人 ────────────────────────────────────────────
        ss_name = (
            _safe_str(d4_row.get("末次（当前）分配SS员工姓名", ""))
            if d4_row is not None else ""
        )
        ss_group = (
            _safe_str(d4_row.get("末次（当前）分配SS员工组名称", ""))
            if d4_row is not None else ""
        )
        lp_name  = _safe_str(row.get("last_lp_name",  ""))
        lp_group = _safe_str(row.get("last_lp_group_name", ""))

        # ── 本月/上月打卡天数（extra 中已有，同步到顶层字段）─────────────────
        days_this_month = int(_safe(extra.get("本月打卡天数")) or 0)

        # ── 本周打卡天数 ──────────────────────────────────────────────────────
        from datetime import date as _date
        _today = _date.today()
        _week_of_month = min(4, (_today.day - 1) // 7 + 1)
        _week_col = f"第{_week_of_month}周转码"
        days_this_week = (
            int(_safe(extra.get(_week_col)) or 0) if d4_row is not None else 0
        )

        # ── 活跃周数 0-4 ──────────────────────────────────────────────────────
        weeks_active = sum(
            1 for w in range(1, 5)
            if int(_safe(extra.get(f"第{w}周转码")) or 0) > 0
        ) if d4_row is not None else 0

        # ── CC/SS/LP 接通状态（D3 行级字段）─────────────────────────────────
        cc_connected = int(_safe(row.get("CC接通")) or 0)
        ss_connected = int(_safe(row.get("SS接通")) or 0)
        lp_connected = int(_safe(row.get("LP接通")) or 0)

        # ── CC 末次备注 ───────────────────────────────────────────────────────
        cc_last_note_date = (
            _safe_str(d4_row.get("CC末次备注日期(day)", ""))
            if d4_row is not None else ""
        )
        cc_last_note_content = (
            _safe_str(d4_row.get("CC末次备注内容", ""))
            if d4_row is not None else ""
        )

        # ── 续费距今天数 ─────────────────────────────────────────────────────
        renewal_days_ago = (
            _safe(d4_row.get("末次续费日期距今天数")) if d4_row is not None else None
        )

        # ── 激励状态 ─────────────────────────────────────────────────────────
        incentive_raw = (
            d4_row.get("推荐奖励领取状态") if d4_row is not None else None
        )
        incentive_status = (
            _safe_str(incentive_raw)
            if incentive_raw is not None
            and str(incentive_raw).strip().lower() not in ("nan", "")
            else None
        )

        # ── 行动优先级评分（0-100）───────────────────────────────────────────
        if d4_row is not None:
            _reg_raw = (
                d4_row.get("当月推荐注册人数")
                or d4_row.get("总推荐注册人数")
                or 0
            )
            referral_reg_val = int(_safe(_reg_raw) or 0)
            referral_pay_val = int(_safe(d4_row.get("本月推荐付费数") or 0) or 0)
            referral_att_val = int(_safe(d4_row.get("本月推荐出席数") or 0) or 0)
            cc_dial_count    = int(_safe(d4_row.get("总CC拨打次数")   or 0) or 0)
        else:
            referral_reg_val = referral_pay_val = referral_att_val = cc_dial_count = 0

        _prio = 0
        if card_days is not None and card_days <= 15:
            _prio += 30
        elif card_days is not None and card_days <= 30:
            _prio += 20
        if days_this_month > 0 and days_this_week == 0:
            _prio += 20
        if days_this_month >= 4 and referral_reg_val == 0:
            _prio += 15
        if referral_reg_val > 0 and referral_pay_val == 0:
            _prio += 20
        if cc_dial_count >= 5 and cc_connected == 0:
            _prio += 15
        action_priority_score = min(_prio, 100)

        # ── 推荐联系渠道 ─────────────────────────────────────────────────────
        cc_last_call_days_ago: int | None = None
        if cc_last_call:
            try:
                from datetime import datetime as _dt
                _last = _dt.strptime(cc_last_call[:10], "%Y-%m-%d").date()
                cc_last_call_days_ago = (_date.today() - _last).days
            except Exception:
                cc_last_call_days_ago = None

        cc_last_call_duration = (
            _safe(d4_row.get("CC末次接通时长")) if d4_row is not None else None
        )

        _long_no_contact = (
            cc_connected == 1
            and cc_last_call_days_ago is not None
            and cc_last_call_days_ago > 14
        )
        if cc_dial_count >= 3 and cc_connected == 0:
            recommended_channel = "line"
        elif cc_last_call_duration is not None and cc_last_call_duration <= 30:
            recommended_channel = "sms"
        elif _long_no_contact:
            recommended_channel = "phone"
        else:
            recommended_channel = "app"

        # ── 黄金窗口标签 ─────────────────────────────────────────────────────
        golden_window: list[str] = []
        if days_this_month == 1:
            golden_window.append("first_checkin")
        if referral_reg_val > 0 and referral_att_val == 0:
            golden_window.append("lead_no_show")
        if card_days is not None and 15 <= card_days <= 45:
            golden_window.append("renewal_window")

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
            "referral_registrations": referral_reg_val if referral_reg_val else None,
            "referral_payments": (
                _safe(d4_row.get("本月推荐付费数")) if d4_row is not None else None
            ),
            "cc_last_call_date":       cc_last_call,
            "card_days_remaining":     card_days,
            "extra":                   extra,
            # ── 新增字段 ──────────────────────────────────────────────────────
            "ss_name":                 ss_name or None,
            "ss_group":                ss_group or None,
            "lp_name":                 lp_name or None,
            "lp_group":                lp_group or None,
            "weeks_active":            weeks_active,
            "days_this_week":          days_this_week,
            "days_this_month":         days_this_month,
            "cc_connected":            cc_connected,
            "ss_connected":            ss_connected,
            "lp_connected":            lp_connected,
            "cc_last_note_date":       cc_last_note_date or None,
            "cc_last_note_content":    cc_last_note_content or None,
            "renewal_days_ago":        renewal_days_ago,
            "incentive_status":        incentive_status or None,
            "action_priority_score":   action_priority_score,
            "recommended_channel":     recommended_channel,
            "golden_window":           golden_window,
        })

    # 默认按 action_priority_score 降序（同分时 quality_score 次排）
    students.sort(
        key=lambda s: (s["action_priority_score"], s["quality_score"]),
        reverse=True,
    )
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
    enclosure: str | None = Query(
        default=None, description="围场过滤（M 标签，如 M0），为空时不过滤"
    ),
) -> dict:
    """
    全部从 D3 明细表聚合。优先使用前端传来的 role_config（Settings 宽口径配置），
    否则 fallback 到 config.json enclosure_role_wide（动态加载）。

    enclosure 参数：前端统一筛选栏传入的围场 M 标签（如 M0/M1/M2），
    用于在角色默认围场范围内进一步交叉过滤，不影响无参数时的行为。
    """
    d3: pd.DataFrame = dm.load_all().get("detail", pd.DataFrame())

    # 解析围场过滤：将 M 标签转回原始围场值，对 d3 做全局交叉过滤
    if enclosure and _D3_ENCLOSURE_COL in d3.columns:
        m_to_raw = {v: k for k, v in _M_MAP.items()}
        enc_labels = [e.strip() for e in enclosure.split(",") if e.strip()]
        enc_filter_raws = [m_to_raw[m] for m in enc_labels if m in m_to_raw]
        if enc_filter_raws:
            d3 = d3[d3[_D3_ENCLOSURE_COL].isin(enc_filter_raws)].copy()

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
    enclosure: str | None = Query(
        default=None, description="围场过滤（M 标签，如 M0），为空时不过滤"
    ),
    dm: DataManager = Depends(get_data_manager),
) -> dict:
    """按角色返回打卡排行，小组+个人双维度，按打卡率降序→同率按已打卡人数降序。

    enclosure 参数：前端统一筛选栏传入的围场 M 标签（如 M0/M1/M2），
    用于在角色默认围场范围内进一步交叉过滤，不影响无参数时的行为。
    """
    d3: pd.DataFrame = dm.load_all().get("detail", pd.DataFrame())

    # 解析围场过滤：将 M 标签转回原始围场值列表
    enc_filter_raws: list[str] | None = None
    if enclosure and _D3_ENCLOSURE_COL in d3.columns:
        m_to_raw = {v: k for k, v in _M_MAP.items()}
        enc_labels = [e.strip() for e in enclosure.split(",") if e.strip()]
        enc_filter_raws = [m_to_raw[m] for m in enc_labels if m in m_to_raw]

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

        # 运营角色：返回渠道推荐数据，不做 by_group/by_person 个人聚合。
        # 运营负责 M6+（181天+）围场，属于固定范围，不响应前端 enclosure 筛选栏
        # 的交叉过滤（enc_filter_raws）——运营视图看全局 M6+ 而非单个围场切片，
        # 围场徽章仅对 CC/SS/LP 有语义。如需单围场过滤，传 enclosures_override。
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

        # 按角色默认围场筛选
        if _D3_ENCLOSURE_COL in d3.columns:
            subset = d3[d3[_D3_ENCLOSURE_COL].isin(enclosures)].copy()
        else:
            subset = d3.copy()

        # 额外围场交叉过滤（来自前端统一筛选栏 enclosure 参数）
        if enc_filter_raws and _D3_ENCLOSURE_COL in subset.columns:
            subset = subset[subset[_D3_ENCLOSURE_COL].isin(enc_filter_raws)].copy()

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


# ── 学员维度分析 ───────────────────────────────────────────────────────────────

_CHECKIN_STUDENT_TAGS_FALLBACK: dict = {
    "superfan_min": 6,
    "active_min": 4,
    "improver_delta": 2,
    "declining_delta": -2,
    "sleeping_hp_days_max": 0,
    "sleeping_hp_lesson_min": 10,
    "super_converter_days_min": 4,
    "super_converter_referrals_min": 2,
}


def _get_student_tags_config() -> dict:
    """从 config.json checkin_student_tags 读取标签阈值，fallback 到硬编码。"""
    return _get_config().get("checkin_student_tags", _CHECKIN_STUDENT_TAGS_FALLBACK)


def _compute_student_tags(
    days_this: int,
    days_last: int,
    lesson: float,
    registrations: int,
    cfg: dict,
) -> list[str]:
    """根据打卡数据计算学员标签列表。"""
    tags: list[str] = []
    delta = days_this - days_last

    superfan_min = int(cfg.get("superfan_min", 6))
    active_min = int(cfg.get("active_min", 4))
    improver_delta = int(cfg.get("improver_delta", 2))
    declining_delta = int(cfg.get("declining_delta", -2))
    sleeping_hp_days_max = int(cfg.get("sleeping_hp_days_max", 0))
    sleeping_hp_lesson_min = float(cfg.get("sleeping_hp_lesson_min", 10))
    super_converter_days_min = int(cfg.get("super_converter_days_min", 4))
    super_converter_referrals_min = int(cfg.get("super_converter_referrals_min", 2))

    if days_this >= superfan_min:
        tags.append("满勤")
    elif days_this >= active_min:
        tags.append("活跃")

    if delta >= improver_delta and days_last > 0:
        tags.append("进步明显")

    if delta <= declining_delta:
        tags.append("在退步")

    if days_this <= sleeping_hp_days_max and lesson >= sleeping_hp_lesson_min:
        tags.append("沉睡高潜")

    if (
        days_this >= super_converter_days_min
        and registrations >= super_converter_referrals_min
    ):
        tags.append("超级转化")

    return tags


def _band_for_days(days: int) -> str:
    """将打卡天数映射到 4 段分组标签。"""
    if days == 0:
        return "0次"
    if days <= 2:
        return "1-2次"
    if days <= 4:
        return "3-4次"
    return "5-6次"


_BAND_ORDER = ["0次", "1-2次", "3-4次", "5-6次"]


@router.get(
    "/checkin/student-analysis",
    summary="学员维度打卡分析 — D4 学员打卡分布/标签/转化相关性",
)
async def student_analysis(
    request: Request,
    role_config: str | None = Query(default=None, description="前端宽口径配置 JSON"),
    cc: str | None = Query(default=None, description="按 CC 姓名筛选"),
    team: str | None = Query(default=None, description="按团队名称筛选"),
    enclosure: str | None = Query(
        default=None, description="按围场 M 标签筛选，逗号分隔"
    ),
    limit: int = Query(default=200, description="top_students 返回条数上限"),
    dm: DataManager = Depends(get_data_manager),
) -> dict:
    """
    基于 D4（已付费学员明细）提供学员维度打卡分析：
    - 本月/上月打卡频次分布（0-6 次精确 + 4 段分组）
    - 月度对比（满勤/活跃/参与率）
    - 打卡×转化漏斗交叉
    - 围场打卡分布
    - 学员标签汇总（满勤/活跃/进步明显/在退步/沉睡高潜/超级转化）
    - 课耗×打卡交叉（学习行为 vs 打卡行为）
    - 联系频次×打卡响应
    - 续费×打卡相关性
    - Top 学员列表（按本月打卡降序）
    - 进步榜（按 delta 降序，仅 delta>0）
    """
    from datetime import date

    data = dm.load_all()
    df_d4: pd.DataFrame = data.get("students", pd.DataFrame())
    df_d3: pd.DataFrame = data.get("detail", pd.DataFrame())

    _empty_band_list = [{"band": b, "students": 0, "pct": 0.0} for b in _BAND_ORDER]
    _empty_result: dict = {
        "frequency_distribution": [
            {"count": i, "students": 0, "pct": 0.0} for i in range(7)
        ],
        "frequency_bands": _empty_band_list,
        "month_comparison": {
            "avg_days_this": 0.0, "avg_days_last": 0.0,
            "zero_this": 0, "zero_last": 0,
            "superfan_this": 0, "superfan_last": 0,
            "active_this": 0, "active_last": 0,
            "total_students": 0,
            "participation_rate_this": 0.0,
            "participation_rate_last": 0.0,
        },
        "conversion_funnel": [],
        "by_enclosure": [],
        "tags_summary": {
            "满勤": 0, "活跃": 0, "进步明显": 0,
            "在退步": 0, "沉睡高潜": 0, "超级转化": 0,
        },
        "lesson_checkin_cross": {
            "has_lesson_no_checkin": 0,
            "has_lesson_has_checkin": 0,
            "no_lesson_has_checkin": 0,
            "no_lesson_no_checkin": 0,
            "by_band": [],
        },
        "contact_checkin_response": {
            "contacted_7d": {
                "students": 0, "avg_days": 0.0, "participation_rate": 0.0
            },
            "contacted_14d": {
                "students": 0, "avg_days": 0.0, "participation_rate": 0.0
            },
            "contacted_14d_plus": {
                "students": 0, "avg_days": 0.0, "participation_rate": 0.0
            },
            "never_contacted": {
                "students": 0, "avg_days": 0.0, "participation_rate": 0.0
            },
        },
        "renewal_checkin_correlation": {"by_band": []},
        "top_students": [],
        "improvement_ranking": [],
    }

    if df_d4.empty:
        return _empty_result

    # ── D4 列名探查 ──────────────────────────────────────────────────────────
    d4_id_col = _find_d4_id_col(df_d4)

    # ── 字段常量 ─────────────────────────────────────────────────────────────
    _CC_NAME_COL = "末次（当前）分配CC员工姓名"
    _TEAM_COL = "末次（当前）分配CC员工组名称"
    _COL_DAYS_THIS = "本月打卡天数"
    _COL_DAYS_LAST = "上月打卡天数"
    _COL_LESSON = "本月课耗"
    _COL_REG_MONTHLY = "当月推荐注册人数"
    _COL_REG_TOTAL = "总推荐注册人数"
    _COL_PAY_MONTHLY = "本月推荐付费数"
    _COL_RENEWALS = "总续费订单数"
    _COL_CC_CALL_DATE = "CC末次拨打日期(day)"
    _COL_CARD_DAYS = "次卡距到期天数"

    # ── 筛选 ─────────────────────────────────────────────────────────────────
    df = df_d4.copy()
    if cc and _CC_NAME_COL in df.columns:
        df = df[df[_CC_NAME_COL].astype(str).str.strip() == cc.strip()]
    if team and _TEAM_COL in df.columns:
        df = df[df[_TEAM_COL].astype(str).str.strip() == team.strip()]

    if enclosure and _D4_LIFECYCLE_COL in df.columns:
        enc_list = [e.strip() for e in enclosure.split(",") if e.strip()]
        df["_m_filter"] = df[_D4_LIFECYCLE_COL].apply(
            lambda v: _M_MAP.get(_safe_str(v), _safe_str(v))
        )
        df = df[df["_m_filter"].isin(enc_list)]

    if role_config and _D4_LIFECYCLE_COL in df.columns:
        try:
            parsed_rc = json.loads(role_config)
            all_m_labels: list[str] = []
            for _rk in parsed_rc:
                bands = _parse_role_enclosures(role_config, _rk)
                if bands:
                    all_m_labels.extend(_M_MAP.get(b, b) for b in bands)
            if all_m_labels:
                df["_rc_filter"] = df[_D4_LIFECYCLE_COL].apply(
                    lambda v: _M_MAP.get(_safe_str(v), _safe_str(v))
                )
                df = df[df["_rc_filter"].isin(all_m_labels)]
        except (json.JSONDecodeError, AttributeError):
            pass

    if df.empty:
        return _empty_result

    # ── 辅助函数 ─────────────────────────────────────────────────────────────
    def _int_col(row: pd.Series, col: str, default: int = 0) -> int:
        v = row.get(col)
        if v is None:
            return default
        try:
            if pd.isna(v):
                return default
        except (TypeError, ValueError):
            pass
        try:
            return max(0, int(float(v)))
        except (ValueError, TypeError):
            return default

    def _float_col(row: pd.Series, col: str, default: float = 0.0) -> float:
        v = row.get(col)
        if v is None:
            return default
        try:
            if pd.isna(v):
                return default
        except (TypeError, ValueError):
            pass
        try:
            f = float(v)
            return default if (f != f) else f  # NaN guard
        except (ValueError, TypeError):
            return default

    today = date.today()

    def _cc_call_days_ago(row: pd.Series) -> int | None:
        raw = row.get(_COL_CC_CALL_DATE)
        if raw is None:
            return None
        s = str(raw).strip()
        if not s or s.startswith("1970") or s == "nan":
            return None
        date_str = s[:10] if len(s) >= 10 else s
        try:
            call_date = date.fromisoformat(date_str)
            return max(0, (today - call_date).days)
        except ValueError:
            return None

    # ── D3 今日打卡索引 ──────────────────────────────────────────────────────
    d3_today_index: dict[str, int] = {}
    if (
        not df_d3.empty
        and _D3_STUDENT_COL in df_d3.columns
        and _D3_CHECKIN_COL in df_d3.columns
    ):
        for _, r in df_d3.iterrows():
            sid_d3 = _safe_str(r.get(_D3_STUDENT_COL, ""))
            if sid_d3:
                val_d3 = pd.to_numeric(r.get(_D3_CHECKIN_COL, 0), errors="coerce")
                d3_today_index[sid_d3] = 0 if (val_d3 != val_d3) else int(val_d3)

    # ── 遍历行，构建学员列表 ─────────────────────────────────────────────────
    tags_cfg = _get_student_tags_config()
    students_data: list[dict] = []

    for _, row in df.iterrows():
        sid = _safe_str(row.get(d4_id_col, "")) if d4_id_col else ""
        enc_raw = _safe_str(row.get(_D4_LIFECYCLE_COL, ""))
        enc_m = _M_MAP.get(enc_raw, enc_raw) if enc_raw else "M?"

        days_this = _int_col(row, _COL_DAYS_THIS)
        days_last = _int_col(row, _COL_DAYS_LAST)
        lesson = _float_col(row, _COL_LESSON)
        reg = _int_col(row, _COL_REG_MONTHLY) or _int_col(row, _COL_REG_TOTAL)
        pay = _int_col(row, _COL_PAY_MONTHLY)
        renewals = _int_col(row, _COL_RENEWALS)
        cc_days_ago = _cc_call_days_ago(row)
        card_days_raw = _safe(row.get(_COL_CARD_DAYS))
        card_days_int: int | None = (
            int(card_days_raw) if card_days_raw is not None else None
        )

        cc_name_val = _safe_str(row.get(_CC_NAME_COL, ""))
        team_val = _safe_str(row.get(_TEAM_COL, ""))
        today_checked = d3_today_index.get(sid, 0)

        tags = _compute_student_tags(days_this, days_last, lesson, reg, tags_cfg)

        students_data.append({
            "student_id": sid,
            "enclosure": enc_m,
            "cc_name": cc_name_val,
            "team": team_val,
            "days_this_month": days_this,
            "days_last_month": days_last,
            "delta": days_this - days_last,
            "lesson_this_month": lesson if lesson > 0 else None,
            "referral_registrations": reg,
            "referral_payments": pay,
            "total_renewals": renewals,
            "cc_last_call_days_ago": cc_days_ago,
            "card_days_remaining": card_days_int,
            "today_checked_in": today_checked,
            "tags": tags,
        })

    n = len(students_data)

    # ── frequency_distribution ───────────────────────────────────────────────
    freq_count: dict[int, int] = {i: 0 for i in range(7)}
    for s in students_data:
        d = min(max(s["days_this_month"], 0), 6)
        freq_count[d] += 1

    frequency_distribution = [
        {
            "count": i,
            "students": freq_count[i],
            "pct": round(freq_count[i] / n, 4) if n > 0 else 0.0,
        }
        for i in range(7)
    ]

    # ── frequency_bands ──────────────────────────────────────────────────────
    band_count: dict[str, int] = {b: 0 for b in _BAND_ORDER}
    for s in students_data:
        band_count[_band_for_days(s["days_this_month"])] += 1

    frequency_bands = [
        {
            "band": b,
            "students": band_count[b],
            "pct": round(band_count[b] / n, 4) if n > 0 else 0.0,
        }
        for b in _BAND_ORDER
    ]

    # ── month_comparison ─────────────────────────────────────────────────────
    superfan_min_v = int(tags_cfg.get("superfan_min", 6))
    active_min_v = int(tags_cfg.get("active_min", 4))

    avg_days_this = (
        round(sum(s["days_this_month"] for s in students_data) / n, 4)
        if n > 0
        else 0.0
    )
    avg_days_last = (
        round(sum(s["days_last_month"] for s in students_data) / n, 4)
        if n > 0
        else 0.0
    )
    zero_this = freq_count.get(0, 0)
    zero_last = sum(1 for s in students_data if s["days_last_month"] == 0)
    superfan_this = sum(
        1 for s in students_data if s["days_this_month"] >= superfan_min_v
    )
    superfan_last = sum(
        1 for s in students_data if s["days_last_month"] >= superfan_min_v
    )
    active_this = sum(
        1 for s in students_data
        if active_min_v <= s["days_this_month"] < superfan_min_v
    )
    active_last = sum(
        1 for s in students_data
        if active_min_v <= s["days_last_month"] < superfan_min_v
    )
    participation_this = sum(1 for s in students_data if s["days_this_month"] > 0)
    participation_last = sum(1 for s in students_data if s["days_last_month"] > 0)

    month_comparison = {
        "avg_days_this": avg_days_this,
        "avg_days_last": avg_days_last,
        "zero_this": zero_this,
        "zero_last": zero_last,
        "superfan_this": superfan_this,
        "superfan_last": superfan_last,
        "active_this": active_this,
        "active_last": active_last,
        "total_students": n,
        "participation_rate_this": round(participation_this / n, 4) if n > 0 else 0.0,
        "participation_rate_last": round(participation_last / n, 4) if n > 0 else 0.0,
    }

    # ── band_groups（各分析共享） ─────────────────────────────────────────────
    band_groups: dict[str, list[dict]] = {b: [] for b in _BAND_ORDER}
    for s in students_data:
        band_groups[_band_for_days(s["days_this_month"])].append(s)

    # ── conversion_funnel ────────────────────────────────────────────────────
    conversion_funnel: list[dict] = []
    for b in _BAND_ORDER:
        grp = band_groups[b]
        cnt = len(grp)
        has_reg = sum(1 for s in grp if s["referral_registrations"] > 0)
        has_pay = sum(1 for s in grp if s["referral_payments"] > 0)
        avg_reg = (
            round(sum(s["referral_registrations"] for s in grp) / cnt, 4)
            if cnt > 0
            else 0.0
        )
        avg_pay = (
            round(sum(s["referral_payments"] for s in grp) / cnt, 4)
            if cnt > 0
            else 0.0
        )
        conversion_funnel.append({
            "band": b,
            "students": cnt,
            "has_registration_pct": round(has_reg / cnt, 4) if cnt > 0 else 0.0,
            "has_payment_pct": round(has_pay / cnt, 4) if cnt > 0 else 0.0,
            "avg_registrations": avg_reg,
            "avg_payments": avg_pay,
        })

    # ── by_enclosure ─────────────────────────────────────────────────────────
    enc_groups: dict[str, list[dict]] = {}
    for s in students_data:
        enc_groups.setdefault(s["enclosure"], []).append(s)

    by_enclosure: list[dict] = []
    for enc_label, grp in sorted(
        enc_groups.items(), key=lambda x: _m_label_to_index(x[0])
    ):
        cnt = len(grp)
        avg_days = (
            round(sum(s["days_this_month"] for s in grp) / cnt, 4)
            if cnt > 0
            else 0.0
        )
        participation = sum(1 for s in grp if s["days_this_month"] > 0)
        enc_dist: dict[int, int] = {i: 0 for i in range(7)}
        for s in grp:
            enc_dist[min(max(s["days_this_month"], 0), 6)] += 1
        by_enclosure.append({
            "enclosure": enc_label,
            "total": cnt,
            "avg_days": avg_days,
            "participation_rate": round(participation / cnt, 4) if cnt > 0 else 0.0,
            "distribution": [{"count": i, "students": enc_dist[i]} for i in range(7)],
        })

    # ── tags_summary ─────────────────────────────────────────────────────────
    tags_summary: dict[str, int] = {
        "满勤": 0, "活跃": 0, "进步明显": 0,
        "在退步": 0, "沉睡高潜": 0, "超级转化": 0,
    }
    for s in students_data:
        for tag in s["tags"]:
            if tag in tags_summary:
                tags_summary[tag] += 1

    # ── lesson_checkin_cross ─────────────────────────────────────────────────
    has_lesson_no_checkin = sum(
        1 for s in students_data
        if (s["lesson_this_month"] or 0) > 0 and s["days_this_month"] == 0
    )
    has_lesson_has_checkin = sum(
        1 for s in students_data
        if (s["lesson_this_month"] or 0) > 0 and s["days_this_month"] > 0
    )
    no_lesson_has_checkin = sum(
        1 for s in students_data
        if (s["lesson_this_month"] or 0) == 0 and s["days_this_month"] > 0
    )
    no_lesson_no_checkin = sum(
        1 for s in students_data
        if (s["lesson_this_month"] or 0) == 0 and s["days_this_month"] == 0
    )
    lesson_by_band: list[dict] = [
        {
            "band": b,
            "avg_lesson": (
                round(
                    sum((s["lesson_this_month"] or 0.0) for s in band_groups[b])
                    / len(band_groups[b]),
                    4,
                )
                if band_groups[b]
                else 0.0
            ),
            "students": len(band_groups[b]),
        }
        for b in _BAND_ORDER
    ]

    lesson_checkin_cross = {
        "has_lesson_no_checkin": has_lesson_no_checkin,
        "has_lesson_has_checkin": has_lesson_has_checkin,
        "no_lesson_has_checkin": no_lesson_has_checkin,
        "no_lesson_no_checkin": no_lesson_no_checkin,
        "by_band": lesson_by_band,
    }

    # ── contact_checkin_response ─────────────────────────────────────────────
    def _cg_stats(grp_list: list[dict]) -> dict:
        cnt = len(grp_list)
        if cnt == 0:
            return {"students": 0, "avg_days": 0.0, "participation_rate": 0.0}
        avg_d = round(sum(s["days_this_month"] for s in grp_list) / cnt, 4)
        part = sum(1 for s in grp_list if s["days_this_month"] > 0)
        return {
            "students": cnt,
            "avg_days": avg_d,
            "participation_rate": round(part / cnt, 4),
        }

    c7 = [
        s for s in students_data
        if s["cc_last_call_days_ago"] is not None and s["cc_last_call_days_ago"] <= 7
    ]
    c14 = [
        s for s in students_data
        if s["cc_last_call_days_ago"] is not None
        and 8 <= s["cc_last_call_days_ago"] <= 14
    ]
    c14p = [
        s for s in students_data
        if s["cc_last_call_days_ago"] is not None and s["cc_last_call_days_ago"] > 14
    ]
    cnever = [s for s in students_data if s["cc_last_call_days_ago"] is None]

    contact_checkin_response = {
        "contacted_7d": _cg_stats(c7),
        "contacted_14d": _cg_stats(c14),
        "contacted_14d_plus": _cg_stats(c14p),
        "never_contacted": _cg_stats(cnever),
    }

    # ── renewal_checkin_correlation ──────────────────────────────────────────
    renewal_by_band: list[dict] = []
    for b in _BAND_ORDER:
        grp = band_groups[b]
        cnt = len(grp)
        avg_renewals = (
            round(sum(s["total_renewals"] for s in grp) / cnt, 4) if cnt > 0 else 0.0
        )
        has_renewal = sum(1 for s in grp if s["total_renewals"] > 0)
        renewal_by_band.append({
            "band": b,
            "avg_renewals": avg_renewals,
            "has_renewal_pct": round(has_renewal / cnt, 4) if cnt > 0 else 0.0,
            "students": cnt,
        })

    renewal_checkin_correlation = {"by_band": renewal_by_band}

    # ── top_students ─────────────────────────────────────────────────────────
    top_students = sorted(
        students_data,
        key=lambda s: (-s["days_this_month"], -s["referral_registrations"]),
    )[:max(1, limit)]

    # ── improvement_ranking ──────────────────────────────────────────────────
    improvement_ranking = sorted(
        [s for s in students_data if s["delta"] > 0],
        key=lambda s: (-s["delta"], -s["days_this_month"]),
    )

    return {
        "frequency_distribution": frequency_distribution,
        "frequency_bands": frequency_bands,
        "month_comparison": month_comparison,
        "conversion_funnel": conversion_funnel,
        "by_enclosure": by_enclosure,
        "tags_summary": tags_summary,
        "lesson_checkin_cross": lesson_checkin_cross,
        "contact_checkin_response": contact_checkin_response,
        "renewal_checkin_correlation": renewal_checkin_correlation,
        "top_students": top_students,
        "improvement_ranking": improvement_ranking,
    }


# ── 围场动态阈值 ──────────────────────────────────────────────────────────────

_THRESHOLDS_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "config" / "checkin_thresholds.json"
)


def _load_checkin_thresholds_config() -> dict:
    """读取 config/checkin_thresholds.json，返回其内容。失败时返回空 dict。"""
    try:
        return json.loads(_THRESHOLDS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


@router.get(
    "/checkin/enclosure-thresholds",
    summary="围场动态打卡阈值 — M0/M1/M2 读 config，M3+ 动态计算 P75/P50/P25",
)
def get_enclosure_thresholds(
    dm: DataManager = Depends(get_data_manager),
) -> dict:
    """
    返回各围场打卡率阈值：
    - M0/M1/M2：来自 config/checkin_thresholds.json cc_warning_by_enclosure
    - M3+：从 D4（本月打卡天数/6）计算参与率，取 P75/P50/P25

    响应格式：
    {
      "thresholds": {
        "M0": {"good": 0.90, "warning": 0.80, "source": "config"},
        "M3": {"good": 0.45, "warning": 0.30, "bad_below": 0.15,
               "source": "dynamic", "method": "percentile", "sample_size": 431}
      }
    }
    """
    import numpy as np

    # 读取 config 中已配置的阈值（M0/M1/M2）
    thresholds_cfg = _load_checkin_thresholds_config()
    config_by_enc: dict[str, float] = thresholds_cfg.get("cc_warning_by_enclosure", {})

    # 加载 D4 学员数据
    df_d4: pd.DataFrame = dm.load_all().get("students", pd.DataFrame())

    thresholds: dict[str, dict] = {}

    # M 标签顺序
    m_labels_ordered = [
        "M0", "M1", "M2", "M3", "M4", "M5",
        "M6", "M7", "M8", "M9", "M10", "M11", "M12", "M12+",
    ]

    for m_label in m_labels_ordered:
        # 已有 config 配置的围场
        if m_label in config_by_enc:
            warning_val = float(config_by_enc[m_label])
            # good ≈ warning + 0.1（向上取整一档）
            good_val = min(warning_val + 0.10, 1.0)
            thresholds[m_label] = {
                "good": round(good_val, 4),
                "warning": round(warning_val, 4),
                "source": "config",
            }
            continue

        # 动态计算：从 D4 拿该围场学员的打卡天数
        if df_d4.empty or _D4_LIFECYCLE_COL not in df_d4.columns:
            continue

        # 找出该围场对应的原始围场值（D4 生命周期列存的是原始 band，如 "0~30"）
        # 先获取所有 D4 中能映射到此 m_label 的原始值
        target_raws = [
            raw for raw, mapped in _M_MAP.items() if mapped == m_label
        ]
        if not target_raws:
            # M 标签直接存在于 D4（部分数据源）
            target_raws = [m_label]

        mask = df_d4[_D4_LIFECYCLE_COL].astype(str).str.strip().isin(
            set(target_raws) | {m_label}
        )
        subset_d4 = df_d4[mask]

        if subset_d4.empty or "本月打卡天数" not in subset_d4.columns:
            continue

        days_series = (
            pd.to_numeric(subset_d4["本月打卡天数"], errors="coerce").fillna(0)
        )
        n = len(days_series)
        if n < 5:
            # 样本量太小，跳过动态计算
            continue

        # 参与率 = 打卡天数 / 6（上限 1.0）
        rates = (days_series / 6.0).clip(0.0, 1.0).values

        p75 = float(np.percentile(rates, 75))
        p50 = float(np.percentile(rates, 50))
        p25 = float(np.percentile(rates, 25))

        thresholds[m_label] = {
            "good": round(p75, 4),
            "warning": round(p50, 4),
            "bad_below": round(p25, 4),
            "source": "dynamic",
            "method": "percentile",
            "sample_size": n,
        }

    return {"thresholds": thresholds}


# ── 运营学员排行 ──────────────────────────────────────────────────────────────

_OPS_ENCLOSURES = ["6M", "7M", "8M", "9M", "10M", "11M", "12M", "12M+", "M6+", "181+"]

# 14 维度定义：(排序字段, 是否需要计算)
_RANKING_DIMENSIONS: dict[str, str] = {
    "checkin_days":        "days_this_month",
    "checkin_consistency": "engagement_stability",
    "quality_score":       "quality_score",
    "referral_bindings":   "referral_registrations",
    "referral_attendance": "referral_attendance",
    "referral_payments":   "referral_payments",
    "conversion_rate":     "conversion_rate",
    "secondary_referrals": "secondary_referrals",
    "improvement":         "delta",
    "cc_dial_depth":       "cc_dial_count",
    "role_split_new":      "_role_split_new",
    "role_split_paid":     "_role_split_paid",
    "d3_funnel":           "d3_invitations",
    "historical_total":    "_historical_total",
}


@router.get(
    "/checkin/ops-student-ranking",
    summary="运营学员排行（14 维度 + 二级裂变）— D4 + D3 数据源",
)
def get_ops_student_ranking(
    request: Request,
    role_config: str | None = Query(default=None, description="前端围场配置 JSON"),
    enclosure: str | None = Query(default=None, description="围场过滤（M 标签，如 M6）"),
    dimension: str = Query(default="checkin_days", description="排行维度"),
    limit: int = Query(default=50, description="返回条数上限"),
    dm: DataManager = Depends(get_data_manager),
) -> dict:
    """
    从 D4（students）聚合运营围场学员的 14 维度排行数据。
    支持二级裂变计算：查找 D4 中推荐人学员 ID 指向当前学员的其他学员。
    """
    data = dm.load_all()
    df_d4: pd.DataFrame = data.get("students", pd.DataFrame())
    df_d3: pd.DataFrame = data.get("detail", pd.DataFrame())

    if df_d4.empty:
        return {
            "dimension": dimension,
            "total_students": 0,
            "students": [],
        }

    # 确定运营围场范围
    wide_role = _get_wide_role()
    ops_enclosures = wide_role.get("运营", _OPS_ENCLOSURES)
    # 解析前端 role_config 覆盖
    if role_config:
        override = _parse_role_enclosures(role_config, "运营")
        if override:
            ops_enclosures = override

    # 找 D4 学员 ID 列
    d4_id_col = _find_d4_id_col(df_d4)
    if d4_id_col is None:
        return {
            "dimension": dimension,
            "total_students": 0,
            "students": [],
        }

    # 找 D4 生命周期列（围场）
    lifecycle_col = None
    for c in (_D4_LIFECYCLE_COL, "围场", "生命周期"):
        if c in df_d4.columns:
            lifecycle_col = c
            break

    # 筛选运营围场学员（D4）
    if lifecycle_col:
        # D4 围场值可能是原始 band（6M）或 M 标签（M6），两者都支持
        # 同时支持两种格式
        all_ops_values: set[str] = set()
        for enc in ops_enclosures:
            all_ops_values.add(enc)
            # enc 可能本身是 M 标签（M6 → 6M）
            for raw_k, mapped_v in _M_MAP.items():
                if mapped_v == enc:
                    all_ops_values.add(raw_k)
        df_ops = df_d4[
            df_d4[lifecycle_col].astype(str).str.strip().isin(all_ops_values)
        ].copy()
    else:
        df_ops = df_d4.copy()

    # 围场标签过滤（前端参数 enclosure=M6,...）
    if enclosure and lifecycle_col:
        enc_labels = [e.strip() for e in enclosure.split(",") if e.strip()]
        # 展开每个 M 标签对应的原始 band 值
        enc_raws: set[str] = set()
        for el in enc_labels:
            enc_raws.add(el)
            for raw_k, mapped_v in _M_MAP.items():
                if mapped_v == el:
                    enc_raws.add(raw_k)
        df_ops = df_ops[
            df_ops[lifecycle_col].astype(str).str.strip().isin(enc_raws)
        ].copy()

    if df_ops.empty:
        return {
            "dimension": dimension,
            "total_students": 0,
            "students": [],
        }

    # ── 列名安全读取工具 ─────────────────────────────────────────────────────

    def _col(col_name: str, row: pd.Series) -> Any:
        """安全读取行中的列值，返回 None 如果不存在。"""
        return row.get(col_name)

    def _int_col(col_name: str, row: pd.Series) -> int:
        v = _safe(row.get(col_name))
        return int(v) if v is not None else 0

    def _float_col(col_name: str, row: pd.Series) -> float:
        v = _safe(row.get(col_name))
        return float(v) if v is not None else 0.0

    # ── D3 数据：建立 D3 打卡天数补充索引 ────────────────────────────────────
    # D4 col.12 = 本月打卡天数，col.11 = 上月打卡天数，优先从 D4 读
    # D3 按 stdt_id 聚合每周打卡次数（周活跃天数）
    d3_student_data: dict[str, dict[str, Any]] = {}
    if not df_d3.empty and _D3_STUDENT_COL in df_d3.columns:
        for _, d3row in df_d3.iterrows():
            sid = _safe_str(d3row.get(_D3_STUDENT_COL, ""))
            if not sid:
                continue
            # 聚合 D3 的打卡信息（仅用作补充，有效打卡列）
            ck = pd.to_numeric(d3row.get(_D3_CHECKIN_COL, 0), errors="coerce") or 0
            if sid not in d3_student_data:
                d3_student_data[sid] = {"d3_checkin": 0}
            d3_student_data[sid]["d3_checkin"] += int(ck)

    # ── D3 明细表：构建邀约/出席/付费索引（D3 有专用列）─────────────────────
    # D3 列名参考：邀约数(col.12), 出席数(col.13), 转介绍付费数(col.14), stdt_id(col.1)
    d3_funnel_index: dict[str, dict[str, int]] = {}
    # 通过 D3 列名探测
    _D3_INVITE_CANDIDATES = ["邀约数", "本月邀约数"]
    _D3_ATTEND_CANDIDATES = ["出席数", "本月出席数"]
    _D3_D3PAY_CANDIDATES  = ["转介绍付费数", "本月转介绍付费数"]

    d3_invite_col = next((c for c in _D3_INVITE_CANDIDATES if c in df_d3.columns), None)
    d3_attend_col = next((c for c in _D3_ATTEND_CANDIDATES if c in df_d3.columns), None)
    d3_d3pay_col  = next((c for c in _D3_D3PAY_CANDIDATES  if c in df_d3.columns), None)

    if not df_d3.empty and _D3_STUDENT_COL in df_d3.columns:
        for _, d3row in df_d3.iterrows():
            sid = _safe_str(d3row.get(_D3_STUDENT_COL, ""))
            if not sid:
                continue
            inv = int(_safe(d3row.get(d3_invite_col, 0) if d3_invite_col else 0) or 0)
            att = int(_safe(d3row.get(d3_attend_col, 0) if d3_attend_col else 0) or 0)
            pay = int(_safe(d3row.get(d3_d3pay_col, 0)  if d3_d3pay_col  else 0) or 0)
            if sid not in d3_funnel_index:
                d3_funnel_index[sid] = {"invitations": 0, "attendance": 0, "payments": 0}
            d3_funnel_index[sid]["invitations"] += inv
            d3_funnel_index[sid]["attendance"]  += att
            d3_funnel_index[sid]["payments"]    += pay

    # ── 二级裂变索引：推荐人学员 ID → 被推荐学员行列表 ──────────────────────
    # D4 col.10 = 推荐人学员ID
    _D4_REFERRER_CANDIDATES = ["推荐人学员ID", "推荐人id", "推荐人学员id"]
    d4_referrer_col = next(
        (c for c in _D4_REFERRER_CANDIDATES if c in df_d4.columns), None
    )

    # D4 当月推荐注册人数列（判断二级裂变活跃）
    _D4_MONTHLY_REG_CANDIDATES = ["当月推荐注册人数", "本月推荐注册人数"]
    d4_monthly_reg_col = next(
        (c for c in _D4_MONTHLY_REG_CANDIDATES if c in df_d4.columns), None
    )

    # 构建：推荐人ID → [被推荐学员ID, ...]
    referrer_to_referred: dict[str, list[str]] = {}
    referred_monthly_regs: dict[str, int] = {}  # 被推荐学员 ID → 当月注册数
    referred_monthly_pays: dict[str, int] = {}  # 被推荐学员 ID → 当月付费数

    _D4_PAY_COL_CANDIDATES = ["本月推荐付费数", "当月推荐付费数"]
    d4_pay_col = next(
        (c for c in _D4_PAY_COL_CANDIDATES if c in df_d4.columns), None
    )

    if d4_referrer_col:
        for _, row in df_d4.iterrows():
            sid = _safe_str(row.get(d4_id_col, ""))
            ref_id = _safe_str(row.get(d4_referrer_col, ""))
            if sid and ref_id:
                referrer_to_referred.setdefault(ref_id, []).append(sid)
            # 记录每个学员当月推荐注册数（用于二级裂变判断）
            if sid and d4_monthly_reg_col:
                monthly_reg = int(
                    _safe(row.get(d4_monthly_reg_col)) or 0
                )
                referred_monthly_regs[sid] = monthly_reg
            # 记录每个学员当月推荐付费数（用于 B 付费判断）
            if sid and d4_pay_col:
                monthly_pay = int(_safe(row.get(d4_pay_col)) or 0)
                referred_monthly_pays[sid] = monthly_pay

    # ── 主循环：构建每个运营学员的排行数据 ──────────────────────────────────

    # D4 列名候选（按任务规范）
    _D4_CHECKIN_THIS  = "本月打卡天数"
    _D4_CHECKIN_LAST  = "上月打卡天数"
    _D4_CC_DIAL       = "总CC拨打次数"
    _D4_MONTHLY_REG   = d4_monthly_reg_col or "当月推荐注册人数"
    _D4_MONTHLY_ATT   = "当月推荐出席人数"
    _D4_TOTAL_REG     = "总推荐注册人数"
    _D4_TOTAL_PAY     = "总推荐1v1付费人数"
    _D4_MONTHLY_PAY   = "本月推荐付费数"
    _D4_CC_NEW        = "CC带新人数"
    _D4_SS_NEW        = "SS带新人数"
    _D4_LP_NEW        = "LP带新人数"
    _D4_WIDE_NEW      = "宽口径带新人数"
    _D4_CC_NEW_PAID   = "CC带新付费数"
    _D4_SS_NEW_PAID   = "SS带新付费数"
    _D4_LP_NEW_PAID   = "LP带新付费数"
    _D4_WIDE_NEW_PAID = "宽口径带新付费数"
    _D4_CC_NAME       = "末次（当前）分配CC员工姓名"
    _D4_CC_GROUP      = "末次（当前）分配CC员工组名称"
    # 周打卡数列（用于 weeks_active 计算）
    _D4_WEEK_COLS     = ["第1周转码", "第2周转码", "第3周转码", "第4周转码"]

    students_list: list[dict[str, Any]] = []

    for _, row in df_ops.iterrows():
        sid = _safe_str(row.get(d4_id_col, ""))
        if not sid:
            continue

        # 围场标签
        enc_raw = _safe_str(row.get(lifecycle_col, "")) if lifecycle_col else ""
        enc_label = _M_MAP.get(enc_raw, enc_raw) if enc_raw else "M?"

        # 基础打卡数据
        days_this = int(_safe(row.get(_D4_CHECKIN_THIS)) or 0)
        days_last = int(_safe(row.get(_D4_CHECKIN_LAST)) or 0)
        delta = days_this - days_last

        # 参与稳定性 = min(this, last) / max(this, last)，均 0 时为 0
        _max_days = max(days_this, days_last)
        engagement_stability = (
            round(min(days_this, days_last) / _max_days, 4) if _max_days > 0 else 0.0
        )

        # 周活跃数（几周有过打卡）
        weeks_active = 0
        for wc in _D4_WEEK_COLS:
            if wc in df_d4.columns:
                wv = int(_safe(row.get(wc)) or 0)
                if wv > 0:
                    weeks_active += 1

        # 推荐数据
        referral_registrations = int(_safe(row.get(_D4_MONTHLY_REG)) or 0)
        referral_attendance     = int(_safe(row.get(_D4_MONTHLY_ATT)) or 0)
        referral_payments       = int(_safe(row.get(_D4_MONTHLY_PAY)) or 0)
        total_hist_reg          = int(_safe(row.get(_D4_TOTAL_REG)) or 0)
        total_hist_pay          = int(_safe(row.get(_D4_TOTAL_PAY)) or 0)

        # 转化率（除零保护）
        conversion_rate = (
            round(referral_payments / referral_registrations, 4)
            if referral_registrations > 0
            else 0.0
        )

        # 二级裂变数 + B 付费数 + C 数量
        referred_ids = referrer_to_referred.get(sid, [])
        secondary_referrals = sum(
            1 for rid in referred_ids
            if referred_monthly_regs.get(rid, 0) > 0
        )
        # B 中付费了的数量
        secondary_b_paid = sum(
            1 for rid in referred_ids
            if referred_monthly_pays.get(rid, 0) > 0
        )
        # B 又推荐了 C 的总数量（B 的被推荐人数）
        secondary_c_count = sum(
            len(referrer_to_referred.get(rid, []))
            for rid in referred_ids
        )

        # CC 拨打次数
        cc_dial_count = int(_safe(row.get(_D4_CC_DIAL)) or 0)

        # 角色分拆带新人数
        cc_new_count   = int(_safe(row.get(_D4_CC_NEW))   or 0)
        ss_new_count   = int(_safe(row.get(_D4_SS_NEW))   or 0)
        lp_new_count   = int(_safe(row.get(_D4_LP_NEW))   or 0)
        wide_new_count = int(_safe(row.get(_D4_WIDE_NEW)) or 0)
        cc_new_paid    = int(_safe(row.get(_D4_CC_NEW_PAID))   or 0)
        ss_new_paid    = int(_safe(row.get(_D4_SS_NEW_PAID))   or 0)
        lp_new_paid    = int(_safe(row.get(_D4_LP_NEW_PAID))   or 0)
        wide_new_paid  = int(_safe(row.get(_D4_WIDE_NEW_PAID)) or 0)

        # D3 漏斗数据（邀约/出席/付费）
        d3f = d3_funnel_index.get(sid, {})
        d3_invitations = d3f.get("invitations", 0)
        d3_attendance  = d3f.get("attendance", 0)
        d3_payments    = d3f.get("payments", 0)

        # 负责人姓名 & 团队
        cc_name  = _safe_str(row.get(_D4_CC_NAME, ""))
        team_val = _safe_str(row.get(_D4_CC_GROUP, ""))

        # 质量评分（复用已有函数，传 D4 行作为 d4_row）
        quality_score = _calc_quality_score(pd.Series(dtype=object), row)

        # 派生排序字段
        _role_split_new  = cc_new_count + ss_new_count + lp_new_count
        _role_split_paid = cc_new_paid  + ss_new_paid  + lp_new_paid
        _historical_total = total_hist_reg + total_hist_pay

        students_list.append({
            "student_id":                   sid,
            "enclosure":                    enc_label,
            "cc_name":                      cc_name,
            "team":                         team_val,
            "days_this_month":              days_this,
            "days_last_month":              days_last,
            "delta":                        delta,
            "quality_score":                quality_score,
            "referral_registrations":       referral_registrations,
            "referral_attendance":          referral_attendance,
            "referral_payments":            referral_payments,
            "conversion_rate":              conversion_rate,
            "secondary_referrals":          secondary_referrals,
            "secondary_b_paid":             secondary_b_paid,
            "secondary_c_count":            secondary_c_count,
            "cc_dial_count":                cc_dial_count,
            "cc_new_count":                 cc_new_count,
            "ss_new_count":                 ss_new_count,
            "lp_new_count":                 lp_new_count,
            "wide_new_count":               wide_new_count,
            "cc_new_paid":                  cc_new_paid,
            "ss_new_paid":                  ss_new_paid,
            "lp_new_paid":                  lp_new_paid,
            "wide_new_paid":                wide_new_paid,
            "d3_invitations":               d3_invitations,
            "d3_attendance":                d3_attendance,
            "d3_payments":                  d3_payments,
            "total_historical_registrations": total_hist_reg,
            "total_historical_payments":    total_hist_pay,
            "engagement_stability":         engagement_stability,
            "weeks_active":                 weeks_active,
            # 派生字段（仅排序用，不暴露给前端）
            "_role_split_new":              _role_split_new,
            "_role_split_paid":             _role_split_paid,
            "_historical_total":            _historical_total,
        })

    # ── 排序 ────────────────────────────────────────────────────────────────
    sort_key = _RANKING_DIMENSIONS.get(dimension, "days_this_month")
    students_list.sort(key=lambda s: -(s.get(sort_key) or 0))

    # 加 rank 字段，移除内部派生字段
    result_students: list[dict[str, Any]] = []
    for i, s in enumerate(students_list[:max(1, limit)]):
        row_out = {k: v for k, v in s.items() if not k.startswith("_")}
        row_out["rank"] = i + 1
        result_students.append(row_out)

    return {
        "dimension": dimension,
        "total_students": len(students_list),
        "students": result_students,
    }

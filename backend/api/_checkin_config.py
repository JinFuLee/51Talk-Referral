"""打卡模块 — 配置加载 + 业务工具函数

所有 checkin_*.py 子模块共用的配置读取、常量定义、工具函数。
共享类型转换工具在 _checkin_shared.py。
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from backend.api._checkin_shared import (
    M_MAP as _M_MAP,
)
from backend.api._checkin_shared import (
    M_TO_DAYS as _M_TO_DAYS,
)
from backend.api._checkin_shared import (
    m_label_to_index as _m_label_to_index,
)
from backend.api._checkin_shared import (
    safe as _safe,
)
from backend.api._checkin_shared import (
    safe_str as _safe_str,
)

# ── Config 动态加载 ─────────────────────────────────────────────────────────

_CONFIG_CACHE: dict | None = None
_CONFIG_MTIME: float = 0.0
_CONFIG_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "projects"
    / "referral"
    / "config.json"
)
_OVERRIDE_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "config"
    / "enclosure_role_override.json"
)
_PRIORITY_RULES_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "config"
    / "priority_rules.json"
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


_PRIO_CACHE: list[dict] | None = None
_PRIO_MTIME: float = 0.0

# 硬编码 fallback（config/priority_rules.json 读取失败时使用）
_PRIORITY_RULES_FALLBACK: list[dict] = [
    {"id": "card_expiry_urgent", "score": 30},
    {"id": "card_expiry_soon", "score": 20},
    {"id": "lapsed_this_week", "score": 20},
    {"id": "active_no_referral", "score": 15},
    {"id": "lead_no_payment", "score": 20},
    {"id": "unreachable", "score": 15},
]


def _get_priority_rules() -> dict[str, int]:
    """从 config/priority_rules.json 读取优先级规则分值映射。
    返回 {rule_id: score} dict。"""
    global _PRIO_CACHE, _PRIO_MTIME
    try:
        mtime = _PRIORITY_RULES_PATH.stat().st_mtime
    except OSError:
        mtime = 0.0
    if _PRIO_CACHE is None or mtime != _PRIO_MTIME:
        try:
            with open(_PRIORITY_RULES_PATH, encoding="utf-8") as f:
                data = json.load(f)
            _PRIO_CACHE = data.get("rules", _PRIORITY_RULES_FALLBACK)
            _PRIO_MTIME = mtime
        except Exception:
            _PRIO_CACHE = _PRIORITY_RULES_FALLBACK
    return {r["id"]: r["score"] for r in (_PRIO_CACHE or _PRIORITY_RULES_FALLBACK)}


# ── 常量（共享常量从 _checkin_shared 导入，见文件顶部）─────────────────────

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
    "lesson_max": 15,
    "lesson_weight": 40,
    "referral_max": 3,
    "referral_weight": 30,
    "payment_max": 2,
    "payment_weight": 20,
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
        "M0": "0~30",
        "M1": "31~60",
        "M2": "61~90",
        "M3": "91~120",
        "M4": "121~150",
        "M5": "151~180",
        "M6": "6M",
        "M7": "7M",
        "M8": "8M",
        "M9": "9M",
        "M10": "10M",
        "M11": "11M",
        "M12": "12M",
        "M12+": "12M+",
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
            band for band, (lo, hi) in _M_TO_DAYS.items() if lo >= min_d and hi <= max_d
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
            band for band, (lo, hi) in _M_TO_DAYS.items() if lo >= min_d and hi <= max_d
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
_D3_CHECKIN_COL = "有效打卡"
_D3_STUDENT_COL = "stdt_id"
_D3_ENCLOSURE_COL = "围场"
_D4_LIFECYCLE_COL = "生命周期"


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
    enc_raw = (
        enc_raw
        if enc_raw is not None
        else (row_d3.get("生命周期") or row_d3.get("围场"))
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


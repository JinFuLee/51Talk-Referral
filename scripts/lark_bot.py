#!/usr/bin/env python3
"""Lark Bot — CC 未打卡名单推送（图片 + 文本摘要）

用法：
  uv run python scripts/lark_bot.py followup              # 发送未打卡跟进名单（CC）
  uv run python scripts/lark_bot.py followup --channel cc_all  # 指定通道
  uv run python scripts/lark_bot.py followup --dry-run     # 只生成图片不发送
  uv run python scripts/lark_bot.py --test                 # Lark webhook 连通性测试

图片通过外部图床（freeimage.host → sm.ms fallback）上传。
Lark 群发文本摘要 + 可点击图片链接。
后续配置 app_id/app_secret 后可切换为 Lark 原生图片发送。
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import io
import json
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.patches as mpatches  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402

# ── 路径 ─────────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CRED_PATH = PROJECT_ROOT / "key" / "lark-channels.json"
OUTPUT_DIR = PROJECT_ROOT / "output"
OUTPUT_DIR.mkdir(exist_ok=True)
_ENC_OVERRIDE = PROJECT_ROOT / "config" / "enclosure_role_override.json"

# ── 围场-角色映射（从 Settings 读取）────────────────────────────────────────

_ROLE_ENC_FALLBACK: dict[str, list[str]] = {
    "CC": ["M0", "M1", "M2"],
    "LP": ["M3", "M4", "M5"],
    "SS": ["M3"],
    "运营": ["M6+"],
}


def _get_role_enclosures(role: str) -> list[str]:
    """从 Settings 配置读取角色对应的围场列表。
    读 config/enclosure_role_override.json 的 wide 字段（格式：{"M0": ["CC"], ...}），
    反转为 role→[M标签] 映射。fallback 到硬编码默认值。
    """
    try:
        if _ENC_OVERRIDE.exists():
            data = json.loads(_ENC_OVERRIDE.read_text("utf-8"))
            wide = data.get("wide", {})
            if wide:
                # 反转：{M标签: [角色]} → {角色: [M标签]}
                role_map: dict[str, list[str]] = {}
                for m_tag, roles in wide.items():
                    for r in roles:
                        role_map.setdefault(r, []).append(m_tag)
                if role in role_map:
                    # 按 M 数字排序
                    return sorted(
                        role_map[role],
                        key=lambda x: int(x[1:].replace("+", "99"))
                        if x[1:].replace("+", "99").isdigit()
                        else 99,
                    )
    except Exception:
        pass
    return _ROLE_ENC_FALLBACK.get(role, ["M0", "M1", "M2"])


# ── 日缓存（同日多群推送复用图片 + URL）─────────────────────────────────────

def _url_cache_path(date_str_short: str) -> Path:
    """URL 缓存文件路径：output/lark-url-cache-YYYYMMDD.json"""
    return OUTPUT_DIR / f"lark-url-cache-{date_str_short}.json"


def load_url_cache(date_str_short: str) -> dict[str, str]:
    """加载当天 URL 缓存（{filename: url}），无则返回空 dict"""
    p = _url_cache_path(date_str_short)
    if p.exists():
        try:
            return json.loads(p.read_text("utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def save_url_cache(date_str_short: str, cache: dict[str, str]) -> None:
    """保存 URL 缓存到 JSON 文件"""
    p = _url_cache_path(date_str_short)
    p.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def cached_upload(
    img_bytes: bytes,
    filename: str,
    url_cache: dict[str, str],
) -> str | None:
    """上传图片，优先使用缓存 URL。上传成功后写入缓存。"""
    if filename in url_cache:
        print(f"  ✓ [缓存] {filename}")
        return url_cache[filename]
    url = upload_image(img_bytes, filename)
    if url:
        url_cache[filename] = url
    return url


def upload_paste(text: str, title: str = "followup") -> str | None:
    """上传文本到 bytebin（lucko.me），返回可直接访问的 raw URL"""
    data = text.encode("utf-8")
    req = urllib.request.Request(
        "https://bytebin.lucko.me/post",
        data=data,
        headers={
            "Content-Type": "text/plain; charset=utf-8",
            "User-Agent": "ref-ops-engine/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            key = result.get("key")
            if key:
                return f"https://bytebin.lucko.me/{key}"
    except Exception as e:
        print(f"  ✗ [bytebin] 上传失败: {e}")
        # 429 限频时等待后重试一次
        if "429" in str(e):
            time.sleep(3)
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    result = json.loads(resp.read().decode("utf-8"))
                    key = result.get("key")
                    if key:
                        return f"https://bytebin.lucko.me/{key}"
            except Exception:
                pass
    return None


def cached_paste(
    text: str,
    cache_key: str,
    url_cache: dict[str, str],
    title: str = "followup",
) -> str | None:
    """上传文本到 paste 服务，优先使用缓存 URL。"""
    if cache_key in url_cache:
        print(f"  ✓ [缓存] {cache_key}")
        return url_cache[cache_key]
    url = upload_paste(text, title)
    if url:
        url_cache[cache_key] = url
        print(f"  ✓ [bytebin] {cache_key}")
    return url


# ── 色板（SEE Design System — Warm Neutral）─────────────────────────────────

C_BG = "#FAFAF9"
C_SURFACE = "#F5F5F4"
C_ELEVATED = "#E7E5E4"
C_BORDER = "#E7E5E4"
C_MUTED = "#78716C"
C_TEXT2 = "#57534E"
C_TEXT = "#1C1917"
C_HEADER = "#1C1917"
C_N800 = "#292524"
C_SUCCESS = "#059669"
C_WARNING = "#D97706"
C_DANGER = "#DC2626"
C_GREEN_BG = "#ECFDF5"
C_YELLOW_BG = "#FFFBEB"
C_RED_BG = "#FEF2F2"
C_BRAND_P1 = "#92400E"

# 字体 fallback（中泰英全覆盖）
CJK_FONTS = ["Arial Unicode MS", "Heiti TC", "Songti SC", "Tahoma", "DejaVu Sans"]

# ── 泰中双语文案（泰文主行 + 中文副行，单一信源）────────────────────────────────
TH = {
    "followup_title": {"th": "รายชื่อยังไม่เช็คอิน", "zh": "未打卡跟进"},
    "not_checked": {"th": "ยังไม่เช็คอิน", "zh": "未打卡"},
    "persons": {"th": "คน", "zh": "人"},
    "responsible": {"th": "ผู้รับผิดชอบ", "zh": "负责人"},
    "col_rank": {"th": "#", "zh": "#"},
    "col_score": {"th": "★", "zh": "★"},
    "col_student_id": {"th": "รหัส", "zh": "学员ID"},
    "col_enclosure": {"th": "คอก", "zh": "围场"},
    "col_owner": {"th": "ผู้รับผิดชอบ", "zh": "负责人"},
    "col_last_call": {"th": "โทรล่าสุด", "zh": "末次拨打"},
    "col_lesson": {"th": "คลาส", "zh": "课耗"},
    "unassigned": {"th": "ไม่ระบุ", "zh": "未分配"},
    "unknown": {"th": "ไม่ทราบ", "zh": "未知"},
    "data_label": {"th": "ข้อมูล T-1", "zh": "T-1 数据"},
    "view_list": {"th": "ดูรายชื่อ", "zh": "查看名单"},
    "total_summary": {"th": "รวมยังไม่เช็คอิน", "zh": "共未打卡"},
    "teams": {"th": "ทีม", "zh": "个小组"},
    "overview_title": {"th": "ภาพรวม ยังไม่เช็คอิน", "zh": "未打卡总览"},
    "cc_count": {"th": "CC", "zh": "CC数"},
    "avg_per_cc": {"th": "เฉลี่ย/CC", "zh": "人均"},
    "col_team": {"th": "ทีม", "zh": "团队"},
    "col_not_checked": {"th": "ยังไม่เช็คอิน", "zh": "未打卡"},
    "total_row": {"th": "รวม", "zh": "合计"},
    "checkin_rate": {"th": "อัตราเช็คอิน", "zh": "打卡率"},
    "total_rate": {"th": "รวม", "zh": "总"},
    "col_rate": {"th": "เช็คอิน%", "zh": "打卡率"},
    "col_not_checked_count": {"th": "ยังไม่เช็คอิน", "zh": "未打卡"},
}


def _th(key: str) -> str:
    return TH[key]["th"]


def _zh(key: str) -> str:
    return TH[key]["zh"]


def _bi(key: str) -> str:
    """双语括号格式：'泰文(中文)'"""
    v = TH[key]
    if v["th"] == v["zh"]:
        return v["th"]
    return f"{v['th']}({v['zh']})"


# ── 凭证 ─────────────────────────────────────────────────────────────────────


def load_config() -> dict:
    if not CRED_PATH.exists():
        print(f"[错误] 凭证文件不存在: {CRED_PATH}")
        sys.exit(1)
    return json.loads(CRED_PATH.read_text("utf-8"))


def get_channel(config: dict, name: str) -> dict:
    ch = config.get("channels", {}).get(name)
    if not ch:
        available = list(config.get("channels", {}).keys())
        print(f"[错误] 通道 '{name}' 不存在，可用: {available}")
        sys.exit(1)
    return ch


# ── API 数据获取 ──────────────────────────────────────────────────────────────


def fetch_followup(api_base: str, role: str = "CC") -> list[dict]:
    """调用后端 /api/checkin/followup 获取未打卡学员列表"""
    url = f"{api_base}/api/checkin/followup?role={role}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("students", [])
    except Exception as e:
        print(f"[错误] 获取未打卡数据失败: {e}")
        return []


def fetch_team_detail(api_base: str, team: str) -> list[dict]:
    """调用后端 /api/checkin/team-detail 获取团队内每个 CC 的 per-围场打卡率
    返回 members 列表，每项含 name/total_students/checked_in/rate/by_enclosure
    """
    encoded_team = urllib.parse.quote(team)
    url = f"{api_base}/api/checkin/team-detail?team={encoded_team}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("members", [])
    except Exception as e:
        print(f"[警告] 获取团队详情失败 ({team}): {e}")
        return []


def fetch_summary(api_base: str) -> dict:
    """调用后端 /api/checkin/summary 获取角色级别打卡率汇总

    返回 by_role dict，含 CC/SS/LP 各角色的
    total_students/checked_in/checkin_rate/by_enclosure
    """
    url = f"{api_base}/api/checkin/summary"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("by_role", {})
    except Exception as e:
        print(f"[警告] 获取打卡汇总失败: {e}")
        return {}


def group_students_by_cc(students: list[dict]) -> dict[str, list[dict]]:
    """按 cc_name 字段分组，空/None 归入 unknown 组"""
    groups: dict[str, list[dict]] = defaultdict(list)
    for s in students:
        cc = (s.get("cc_name") or "").strip()
        if not cc:
            cc = _bi("unknown")
        groups[cc].append(s)
    return dict(sorted(groups.items()))


def group_students_by_team(students: list[dict]) -> dict[str, list[dict]]:
    """按团队分组，团队名为空的归入"未分配"组"""
    groups: dict[str, list[dict]] = defaultdict(list)
    for s in students:
        team = (s.get("team") or "").strip()
        if not team:
            team = _bi("unassigned")
        groups[team].append(s)
    # 按团队名排序
    return dict(sorted(groups.items()))


# ── 图片生成 ──────────────────────────────────────────────────────────────────


def _score_color(score: float) -> str:
    if score >= 7:
        return C_SUCCESS
    if score >= 4:
        return C_WARNING
    return C_DANGER


def generate_followup_image(
    team_name: str,
    students: list[dict],
    date_str: str,
) -> bytes:
    """生成单个小组的未打卡学员列表图片（matplotlib 绘制）"""
    short_name = team_name.replace("TH-", "").replace("Team", "")

    plt.rcParams["font.family"] = CJK_FONTS
    plt.rcParams["font.size"] = 10

    # 列定义: x位置, 宽度, 标题（双语）, 对齐
    cols = [
        (0.2, 0.5, _bi("col_rank"), "center"),
        (0.7, 0.5, _bi("col_score"), "center"),
        (1.2, 1.5, _bi("col_student_id"), "left"),
        (2.8, 0.7, _bi("col_enclosure"), "center"),
        (3.6, 2.0, _bi("col_owner"), "left"),
        (5.7, 1.6, _bi("col_last_call"), "center"),
        (7.4, 0.8, _bi("col_lesson"), "center"),
    ]
    table_width = 8.4

    n = len(students)
    row_h = 0.35
    header_h = 2.1  # 标题区（双行）+ 汇总条 + 表头
    table_h = n * row_h
    total_h = header_h + table_h + 0.4  # 底部留白
    total_h = max(total_h, 3.5)

    fig, ax = plt.subplots(figsize=(table_width + 0.4, total_h), dpi=150)
    fig.patch.set_facecolor(C_BG)
    ax.set_xlim(0, table_width + 0.4)
    ax.set_ylim(0, total_h)
    ax.set_aspect("equal")
    ax.axis("off")

    y = total_h

    # ── 标题区（泰文主行 + 中文副行）──
    y -= 0.25
    # 左侧竖条
    ax.add_patch(
        plt.Rectangle(
            (0.15, y - 0.45),
            0.07,
            0.45,
            facecolor=C_DANGER,
            edgecolor="none",
        )
    )
    ax.text(
        0.35,
        y,
        f"{short_name}  {_th('followup_title')}",
        fontsize=15,
        fontweight="bold",
        color=C_HEADER,
        va="top",
    )
    y -= 0.25
    ax.text(
        0.35,
        y,
        f"{short_name}  {_zh('followup_title')}",
        fontsize=8,
        color=C_MUTED,
        va="top",
    )
    y -= 0.2
    ax.text(
        0.35,
        y,
        f"{date_str}  |  {_th('data_label')}",
        fontsize=8,
        color=C_MUTED,
        va="top",
    )

    # ── 汇总条 ──
    y -= 0.5
    # 统计负责人分布
    owner_counts: dict[str, int] = defaultdict(int)
    for s in students:
        name = s.get("cc_name") or "未知"
        owner_counts[name] += 1
    owner_sorted = sorted(owner_counts.items(), key=lambda x: -x[1])

    ax.add_patch(
        mpatches.FancyBboxPatch(
            (0.15, y - 0.45),
            table_width,
            0.45,
            boxstyle="round,pad=0.06",
            facecolor=C_RED_BG,
            edgecolor=C_BORDER,
            linewidth=0.8,
        )
    )
    ax.text(
        0.35,
        y - 0.12,
        f"{_th('not_checked')} {n} {_th('persons')}",
        fontsize=13,
        fontweight="bold",
        color=C_DANGER,
        va="center",
    )
    # 负责人分布（右侧）
    owner_text = "  ".join(f"{name}({cnt})" for name, cnt in owner_sorted[:5])
    if len(owner_sorted) > 5:
        owner_text += f"  +{len(owner_sorted) - 5}{_th('persons')}"
    ax.text(
        table_width,
        y - 0.12,
        owner_text,
        fontsize=8,
        color=C_TEXT2,
        va="center",
        ha="right",
    )

    # ── 表头 ──
    y -= 0.65
    ax.add_patch(
        plt.Rectangle(
            (0.15, y - row_h),
            table_width,
            row_h,
            facecolor=C_N800,
            edgecolor="none",
        )
    )
    for cx, _cw, title, align in cols:
        ha = "center" if align == "center" else "left"
        ax.text(
            cx + 0.05,
            y - row_h / 2,
            title,
            fontsize=9,
            fontweight="bold",
            color="white",
            va="center",
            ha=ha,
        )
    y -= row_h

    # ── 数据行 ──
    for i, s in enumerate(students):
        bg = C_SURFACE if i % 2 == 0 else C_BG
        ax.add_patch(
            plt.Rectangle(
                (0.15, y - row_h),
                table_width,
                row_h,
                facecolor=bg,
                edgecolor="none",
            )
        )
        # 底部细线
        ax.plot(
            [0.15, 0.15 + table_width],
            [y - row_h, y - row_h],
            color=C_BORDER,
            linewidth=0.3,
        )

        ym = y - row_h / 2
        score = s.get("quality_score", 0) or 0
        sid = s.get("student_id", "")
        enc = s.get("enclosure", "")
        owner = s.get("cc_name", "")
        last_call = s.get("cc_last_call_date") or "—"
        lesson = s.get("lesson_consumption_3m")
        lesson_str = str(int(lesson)) if lesson is not None else "—"

        row_data = [
            (cols[0][0], str(i + 1), "center", C_MUTED, "normal"),
            (cols[1][0], str(int(score)), "center", _score_color(score), "bold"),
            (cols[2][0], str(sid), "left", C_TEXT, "normal"),
            (cols[3][0], enc, "center", C_TEXT2, "normal"),
            (cols[4][0], owner, "left", C_TEXT, "normal"),
            (
                cols[5][0],
                last_call[:10] if len(last_call) > 10 else last_call,
                "center",
                C_MUTED,
                "normal",
            ),
            (cols[6][0], lesson_str, "center", C_TEXT2, "normal"),
        ]

        for cx, val, align, color, weight in row_data:
            ha = "center" if align == "center" else "left"
            ax.text(
                cx + 0.05,
                ym,
                val,
                fontsize=8.5,
                color=color,
                fontweight=weight,
                va="center",
                ha=ha,
            )
        y -= row_h

    # ── 保存 ──
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", pad_inches=0.1)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def _rate_bg_color(rate: float) -> str:
    """根据打卡率返回背景色（≥60% 绿，40-60% 黄，<40% 红）"""
    if rate >= 0.60:
        return C_GREEN_BG
    if rate >= 0.40:
        return C_YELLOW_BG
    return C_RED_BG


def _rate_text_color(rate: float) -> str:
    """根据打卡率返回文字色（≥60% 绿，40-60% 黄，<40% 红）"""
    if rate >= 0.60:
        return C_SUCCESS
    if rate >= 0.40:
        return C_WARNING
    return C_DANGER


def _truncate_name(name: str, max_len: int = 20) -> str:
    """截断超长名字，超过 max_len 字符时末尾加省略号"""
    if len(name) <= max_len:
        return name
    return name[:max_len - 1] + "…"


def generate_cc_image(
    cc_name: str,
    team_name: str,
    students_by_enc: dict[str, list[dict]],
    cc_rate_info: dict,
    date_str: str,
    enclosure_order: list[str] | None = None,
) -> bytes:
    """生成单个 CC 负责学员的未打卡图片（按围场分段，含打卡率汇总条）

    Args:
        cc_name: CC 姓名
        team_name: 团队名
        students_by_enc: {"M0": [...], "M1": [...]} 按围场分组的未打卡学员
        cc_rate_info: 来自 /api/checkin/team-detail 的打卡率详情
                      含 total_students/checked_in/rate/by_enclosure，无数据传 {}
        date_str: 显示日期
        enclosure_order: 围场顺序，默认 ["M0", "M1", "M2"]
    """
    if enclosure_order is None:
        enclosure_order = ["M0", "M1", "M2"]

    plt.rcParams["font.family"] = CJK_FONTS
    plt.rcParams["font.size"] = 10

    # 列定义（去掉围场列，共 5 列：#/★/学员ID/末次拨打/课耗）
    cols = [
        (0.2, 0.5, _bi("col_rank"), "center"),
        (0.7, 0.5, _bi("col_score"), "center"),
        (1.2, 2.0, _bi("col_student_id"), "left"),
        (3.3, 2.2, _bi("col_last_call"), "center"),
        (5.6, 1.0, _bi("col_lesson"), "center"),
    ]
    table_width = 6.8

    # 计算总行数（含各围场分段标题行 + 表头行 + 数据行）
    active_encs = [enc for enc in enclosure_order if students_by_enc.get(enc)]
    total_data_rows = sum(len(students_by_enc.get(enc, [])) for enc in active_encs)
    # 每个围场段：1 分段标题 + 1 表头 + N 数据行
    segment_overhead = len(active_encs) * 2
    total_rows = total_data_rows + segment_overhead

    # 超 30 行时缩小行高防止图片过高
    row_h = 0.30 if total_data_rows > 30 else 0.35
    # 标题区 + 打卡率汇总条（含两行）
    header_h = 3.2  # 增加标题区高度确保三行不重叠
    table_h = total_rows * row_h
    total_h = header_h + table_h + 0.4
    total_h = max(total_h, 4.0)

    fig, ax = plt.subplots(figsize=(table_width + 0.4, total_h), dpi=150)
    fig.patch.set_facecolor(C_BG)
    ax.set_xlim(0, table_width + 0.4)
    ax.set_ylim(0, total_h)
    ax.set_aspect("equal")
    ax.axis("off")

    y = total_h

    # CC 名超长时自适应字号
    display_cc_name = _truncate_name(cc_name, 22)
    cc_title_fontsize = 13 if len(cc_name) > 18 else 15

    # ── 标题区 ──
    y -= 0.28
    ax.add_patch(
        plt.Rectangle(
            (0.15, y - 0.50),
            0.07,
            0.50,
            facecolor=C_DANGER,
            edgecolor="none",
        )
    )
    ax.text(
        0.35,
        y,
        f"{display_cc_name}  {_th('followup_title')}",
        fontsize=cc_title_fontsize,
        fontweight="bold",
        color=C_HEADER,
        va="top",
    )
    y -= 0.50  # 泰文主标题需要足够间距（15pt 约 0.45 单位高）
    ax.text(
        0.35,
        y,
        f"{display_cc_name}  {_zh('followup_title')}",
        fontsize=8,
        color=C_MUTED,
        va="top",
    )
    y -= 0.28  # 中文副标题到日期行的间距
    ax.text(
        0.35,
        y,
        f"{date_str[:10]}  |  {team_name}",
        fontsize=8,
        color=C_MUTED,
        va="top",
    )

    # ── 打卡率汇总条（只算角色对应围场）──
    y -= 0.60  # 汇总条与日期行之间留足间距
    by_enclosure = cc_rate_info.get("by_enclosure", [])
    enc_rate_map = {item["enclosure"]: item for item in by_enclosure}
    total_students = sum(
        enc_rate_map.get(e, {}).get("students", 0) for e in enclosure_order
    )
    checked_in = sum(
        enc_rate_map.get(e, {}).get("checked_in", 0) for e in enclosure_order
    )
    overall_rate = checked_in / total_students if total_students > 0 else 0.0
    not_checked_total = total_data_rows  # 未打卡学员数即各围场行数之和

    rate_bg = _rate_bg_color(overall_rate)
    rate_fg = _rate_text_color(overall_rate)

    ax.add_patch(
        mpatches.FancyBboxPatch(
            (0.15, y - 0.75),
            table_width,
            0.75,
            boxstyle="round,pad=0.06",
            facecolor=rate_bg,
            edgecolor=C_BORDER,
            linewidth=0.8,
        )
    )

    # 第一行：总打卡率
    if total_students > 0:
        rate_text = (
            f"{_th('total_rate')}({_zh('total_rate')}) "
            f"{_th('checkin_rate')}({_zh('checkin_rate')}) "
            f"{overall_rate:.1%}  ({checked_in}/{total_students})"
        )
    else:
        rate_text = (
            f"{_th('not_checked')} {not_checked_total} {_th('persons')}"
            f"  /  {_zh('not_checked')} {not_checked_total} {_zh('persons')}"
        )
    ax.text(
        0.35,
        y - 0.18,
        rate_text,
        fontsize=11,
        fontweight="bold",
        color=rate_fg,
        va="center",
    )

    # 第二行：各围场打卡率
    by_enclosure = cc_rate_info.get("by_enclosure", [])
    enc_rate_map = {item["enclosure"]: item for item in by_enclosure}
    enc_parts = []
    for enc in enclosure_order:
        if enc in enc_rate_map:
            ei = enc_rate_map[enc]
            enc_parts.append(
                f"{enc}: {ei['rate']:.1%} ({ei['checked_in']}/{ei['students']})"
            )
    if enc_parts:
        ax.text(
            0.35,
            y - 0.52,
            "  |  ".join(enc_parts),
            fontsize=8,
            color=C_TEXT2,
            va="center",
        )
    y -= 0.90  # 汇总条结束 + 与第一围场段之间的间距

    # ── 围场分段 ──
    global_row_idx = 0
    for enc in enclosure_order:
        enc_students = students_by_enc.get(enc, [])
        if not enc_students:
            continue

        # 分段标题（深灰背景）
        enc_count = len(enc_students)
        enc_info = enc_rate_map.get(enc, {})
        enc_rate_val = enc_info.get("rate", 0.0) or 0.0
        enc_rate_str = f"{enc_rate_val:.1%}" if enc_info else "—"

        # 分段标题行高固定 0.35（视觉需要比数据行稍大）
        seg_row_h = 0.35
        ax.add_patch(
            plt.Rectangle(
                (0.15, y - seg_row_h),
                table_width,
                seg_row_h,
                facecolor="#44403C",
                edgecolor="none",
            )
        )
        seg_title = (
            f"{enc}  "
            f"{_th('not_checked')} {enc_count} {_th('persons')}"
            f" / 未打卡 {enc_count} 人"
            f"  ({_th('checkin_rate')} {enc_rate_str})"
        )
        ax.text(
            0.35,
            y - seg_row_h / 2,
            seg_title,
            fontsize=9,
            fontweight="bold",
            color="white",
            va="center",
        )
        y -= seg_row_h

        # 表头（黑色背景）
        ax.add_patch(
            plt.Rectangle(
                (0.15, y - row_h),
                table_width,
                row_h,
                facecolor=C_N800,
                edgecolor="none",
            )
        )
        # 表头字号随行高自适应
        header_fontsize = 7.5 if row_h < 0.33 else 8.5
        for cx, _cw, title, align in cols:
            ha = "center" if align == "center" else "left"
            ax.text(
                cx + 0.05,
                y - row_h / 2,
                title,
                fontsize=header_fontsize,
                fontweight="bold",
                color="white",
                va="center",
                ha=ha,
            )
        y -= row_h

        # 数据行
        data_fontsize = 7.5 if row_h < 0.33 else 8.5
        for i, s in enumerate(enc_students):
            bg = C_SURFACE if i % 2 == 0 else C_BG
            ax.add_patch(
                plt.Rectangle(
                    (0.15, y - row_h),
                    table_width,
                    row_h,
                    facecolor=bg,
                    edgecolor="none",
                )
            )
            ax.plot(
                [0.15, 0.15 + table_width],
                [y - row_h, y - row_h],
                color=C_BORDER,
                linewidth=0.3,
            )

            ym = y - row_h / 2
            score = s.get("quality_score", 0) or 0
            sid = str(s.get("student_id", ""))[:12]  # 学员ID固定最多12字符
            last_call = s.get("cc_last_call_date") or "—"
            # 日期列固定10字符（YYYY-MM-DD 格式）
            last_call_disp = last_call[:10] if last_call != "—" else "—"
            lesson = s.get("lesson_consumption_3m")
            lesson_str = str(int(lesson)) if lesson is not None else "—"

            global_row_idx += 1
            row_data = [
                (cols[0][0], str(global_row_idx), "center", C_MUTED, "normal"),
                (cols[1][0], str(int(score)), "center", _score_color(score), "bold"),
                (cols[2][0], sid, "left", C_TEXT, "normal"),
                (cols[3][0], last_call_disp, "center", C_MUTED, "normal"),
                (cols[4][0], lesson_str, "center", C_TEXT2, "normal"),
            ]

            for cx, val, align, color, weight in row_data:
                ha = "center" if align == "center" else "left"
                ax.text(
                    cx + 0.05,
                    ym,
                    val,
                    fontsize=data_fontsize,
                    color=color,
                    fontweight=weight,
                    va="center",
                    ha=ha,
                )
            y -= row_h

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", pad_inches=0.1)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def generate_overview_image(
    team_summary: list[dict],
    role_summary: dict,
    date_str: str,
    role: str = "CC",
    enclosure_order: list[str] | None = None,
) -> bytes:
    """生成各团队汇总总览图片（含打卡率列）

    Args:
        team_summary: [{"team": str, "count": int, "cc_count": int, "avg": float,
                        "rate": float, "by_enc": {"M0": rate, "M1": rate, ...}}]
        role_summary: {total_students, checked_in, checkin_rate, by_enclosure: [...]}
                      来自 /api/checkin/summary，无数据时传 {}
        date_str: 显示日期
        role: 角色名（CC/SS/LP）
        enclosure_order: 围场顺序，默认 ["M0", "M1", "M2"]
    """
    if enclosure_order is None:
        enclosure_order = ["M0", "M1", "M2"]

    plt.rcParams["font.family"] = CJK_FONTS
    plt.rcParams["font.size"] = 10

    # 动态列：ทีม | 打卡率 | 未打卡 | CC | M0 | M1 | M2
    # 固定前4列 + 每个围场1列
    enc_col_width = 0.85
    base_cols = [
        (0.2,  2.5, f"{_th('col_team')}({_zh('col_team')})", "left"),
        (2.8,  1.1, f"{_th('col_rate')}({_zh('col_rate')})", "center"),
        (4.0,  1.0, f"{_th('col_not_checked_count')}"
                   f"({_zh('col_not_checked_count')})", "center"),
        (5.1,  0.7, f"{_th('cc_count')}({_zh('cc_count')})", "center"),
    ]
    enc_start_x = 5.9
    enc_cols = [
        (enc_start_x + i * enc_col_width, enc_col_width, enc, "center")
        for i, enc in enumerate(enclosure_order)
    ]
    cols = base_cols + enc_cols
    table_width = enc_start_x + len(enclosure_order) * enc_col_width + 0.1

    n = len(team_summary)
    row_h = 0.38
    # 标题区 + 角色打卡率条（0.28 + 0.50 + 0.28 + 0.60 + 0.75 + 0.85 = 3.26，向上取整）
    header_h = 3.3
    table_h = (n + 1) * row_h  # +1 for totals row
    total_h = header_h + table_h + 0.4
    total_h = max(total_h, 4.0)

    fig, ax = plt.subplots(figsize=(table_width + 0.4, total_h), dpi=150)
    fig.patch.set_facecolor(C_BG)
    ax.set_xlim(0, table_width + 0.4)
    ax.set_ylim(0, total_h)
    ax.set_aspect("equal")
    ax.axis("off")

    y = total_h

    # ── 标题区 ──
    y -= 0.28
    ax.add_patch(
        plt.Rectangle(
            (0.15, y - 0.50),
            0.07,
            0.50,
            facecolor=C_DANGER,
            edgecolor="none",
        )
    )
    ax.text(
        0.35,
        y,
        f"{role} {_th('overview_title')}",
        fontsize=15,
        fontweight="bold",
        color=C_HEADER,
        va="top",
    )
    y -= 0.50  # 泰文 15pt 主标题需要充足间距
    ax.text(
        0.35,
        y,
        f"{role} {_zh('overview_title')}",
        fontsize=8,
        color=C_MUTED,
        va="top",
    )
    y -= 0.28  # 中文副标题到日期行的间距
    ax.text(
        0.35,
        y,
        f"{date_str[:10]}  |  {_th('data_label')}",
        fontsize=8,
        color=C_MUTED,
        va="top",
    )

    # ── 角色总打卡率条 ──
    y -= 0.60  # 日期行与汇总条之间留足间距
    role_total = role_summary.get("total_students", 0)
    role_checked = role_summary.get("checked_in", 0)
    role_rate = role_summary.get("checkin_rate", 0.0) or 0.0
    role_by_enc = {
        item["enclosure"]: item
        for item in role_summary.get("by_enclosure", [])
    }

    rate_bg = _rate_bg_color(role_rate)
    rate_fg = _rate_text_color(role_rate)

    ax.add_patch(
        mpatches.FancyBboxPatch(
            (0.15, y - 0.75),
            table_width,
            0.75,
            boxstyle="round,pad=0.06",
            facecolor=rate_bg,
            edgecolor=C_BORDER,
            linewidth=0.8,
        )
    )

    if role_total > 0:
        role_rate_text = (
            f"{_th('total_rate')}({_zh('total_rate')}) "
            f"{_th('checkin_rate')}({_zh('checkin_rate')}) "
            f"{role_rate:.1%}  ({role_checked}/{role_total})"
        )
    else:
        total_not_checked = sum(r["count"] for r in team_summary)
        role_rate_text = (
            f"{_th('not_checked')} {total_not_checked} {_th('persons')}"
            f"  /  {_zh('not_checked')} {total_not_checked} {_zh('persons')}"
        )
    ax.text(
        0.35,
        y - 0.18,
        role_rate_text,
        fontsize=11,
        fontweight="bold",
        color=rate_fg,
        va="center",
    )

    enc_parts = []
    for enc in enclosure_order:
        if enc in role_by_enc:
            ei = role_by_enc[enc]
            enc_parts.append(
                f"{enc}: {ei['rate']:.1%} ({ei['checked_in']}/{ei['students']})"
            )
    if enc_parts:
        ax.text(
            0.35,
            y - 0.52,
            "  |  ".join(enc_parts),
            fontsize=8,
            color=C_TEXT2,
            va="center",
        )
    y -= 0.85

    # ── 表头 ──
    ax.add_patch(
        plt.Rectangle(
            (0.15, y - row_h),
            table_width,
            row_h,
            facecolor=C_N800,
            edgecolor="none",
        )
    )
    for cx, _cw, title, align in cols:
        ha = "center" if align == "center" else "left"
        ax.text(
            cx + 0.05,
            y - row_h / 2,
            title,
            fontsize=8,
            fontweight="bold",
            color="white",
            va="center",
            ha=ha,
        )
    y -= row_h

    # ── 数据行 ──
    total_count = sum(r["count"] for r in team_summary)
    total_cc = sum(r["cc_count"] for r in team_summary)

    # 计算加权平均打卡率
    total_students_all = sum(r.get("total_students", 0) for r in team_summary)
    total_checked_all = sum(r.get("checked_in_count", 0) for r in team_summary)
    overall_rate_all = total_checked_all / max(total_students_all, 1)

    for i, r in enumerate(team_summary):
        bg = C_SURFACE if i % 2 == 0 else C_BG
        ax.add_patch(
            plt.Rectangle(
                (0.15, y - row_h),
                table_width,
                row_h,
                facecolor=bg,
                edgecolor="none",
            )
        )
        ax.plot(
            [0.15, 0.15 + table_width],
            [y - row_h, y - row_h],
            color=C_BORDER,
            linewidth=0.3,
        )
        ym = y - row_h / 2
        team_rate = r.get("rate", 0.0) or 0.0
        rate_color = _rate_text_color(team_rate)
        rate_display = f"{team_rate:.1%}" if r.get("total_students", 0) > 0 else "—"

        row_data = [
            (cols[0][0], r["team"], "left", C_TEXT, "normal"),
            (cols[1][0], rate_display, "center", rate_color, "bold"),
            (cols[2][0], str(r["count"]), "center", C_DANGER, "bold"),
            (cols[3][0], str(r["cc_count"]), "center", C_TEXT2, "normal"),
        ]
        # 各围场打卡率列
        by_enc = r.get("by_enc", {})
        for j, enc in enumerate(enclosure_order):
            enc_rate = by_enc.get(enc)
            enc_display = f"{enc_rate:.1%}" if enc_rate is not None else "—"
            enc_color = (
                _rate_text_color(enc_rate) if enc_rate is not None else C_MUTED
            )
            row_data.append(
                (enc_cols[j][0], enc_display, "center", enc_color, "normal")
            )

        for cx, val, align, color, weight in row_data:
            ha = "center" if align == "center" else "left"
            ax.text(
                cx + 0.05,
                ym,
                val,
                fontsize=8.5,
                color=color,
                fontweight=weight,
                va="center",
                ha=ha,
            )
        y -= row_h

    # ── 合计行（深色背景）──
    ax.add_patch(
        plt.Rectangle(
            (0.15, y - row_h),
            table_width,
            row_h,
            facecolor=C_N800,
            edgecolor="none",
        )
    )
    ym = y - row_h / 2
    overall_rate_display = f"{overall_rate_all:.1%}" if total_students_all > 0 else "—"
    total_row_data: list[tuple] = [
        (
            cols[0][0],
            f"{_th('total_row')}({_zh('total_row')})",
            "left",
            "white",
            "bold",
        ),
        (cols[1][0], overall_rate_display, "center", "white", "bold"),
        (cols[2][0], str(total_count), "center", C_DANGER, "bold"),
        (cols[3][0], str(total_cc), "center", "white", "normal"),
    ]
    # 合计行各围场汇总（从 role_summary 取）
    for j, enc in enumerate(enclosure_order):
        if enc in role_by_enc:
            ei = role_by_enc[enc]
            enc_total_rate = f"{ei['rate']:.1%}"
        else:
            enc_total_rate = "—"
        total_row_data.append(
            (enc_cols[j][0], enc_total_rate, "center", "white", "normal")
        )

    for cx, val, align, color, weight in total_row_data:
        ha = "center" if align == "center" else "left"
        ax.text(
            cx + 0.05,
            ym,
            val,
            fontsize=8.5,
            color=color,
            fontweight=weight,
            va="center",
            ha=ha,
        )

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", pad_inches=0.1)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


# ── 图片上传（双图床 fallback） ───────────────────────────────────────────────


def _upload_freeimage(img_bytes: bytes, filename: str) -> str | None:
    encoded = base64.b64encode(img_bytes).decode("utf-8")
    data = urllib.parse.urlencode(
        {
            "key": "6d207e02198a847aa98d0a2a901485a5",
            "source": encoded,
            "format": "json",
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://freeimage.host/api/1/upload",
        data=data,
        headers={"User-Agent": "ref-ops-engine/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        if result.get("status_code") == 200:
            return result["image"]["url"]
    return None


def _upload_smms(img_bytes: bytes, filename: str) -> str | None:
    boundary = f"----Py{int(time.time())}"
    body = (
        (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="smfile"; filename="{filename}"\r\n'
            f"Content-Type: image/png\r\n\r\n"
        ).encode()
        + img_bytes
        + f"\r\n--{boundary}--\r\n".encode()
    )
    req = urllib.request.Request(
        "https://s.ee/api/v1/file/upload",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": "ref-ops-engine/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        if result.get("success"):
            return result["data"]["url"]
        if "images" in str(result.get("message", "")):
            return result.get("images")
    return None


def upload_image(img_bytes: bytes, filename: str = "report.png") -> str | None:
    """双图床 fallback：freeimage.host → sm.ms(s.ee)"""
    providers = [
        ("freeimage.host", _upload_freeimage),
        ("sm.ms(s.ee)", _upload_smms),
    ]
    for name, fn in providers:
        try:
            url = fn(img_bytes, filename)
            if url:
                print(f"  ✓ [{name}] 上传成功")
                return url
        except Exception as e:
            print(f"  ✗ [{name}] 失败: {e}")
    return None


# ── Lark Webhook 签名 + 发送 ──────────────────────────────────────────────────


def _lark_sign(secret: str) -> tuple[str, str]:
    """生成 Lark webhook 签名：返回 (timestamp, sign)
    Lark 官方算法：HMAC-SHA256(key=timestamp+"\\n"+secret, msg="")
    参考：https://open.larksuite.com/document/client-docs/bot-v3/add-custom-bot
    """
    timestamp = str(int(time.time()))
    string_to_sign = f"{timestamp}\n{secret}"
    hmac_val = hmac.new(string_to_sign.encode("utf-8"), b"", hashlib.sha256).digest()
    sign = base64.b64encode(hmac_val).decode("utf-8")
    return timestamp, sign


def _send_lark(webhook: str, payload: dict, secret: str | None = None) -> bool:
    """发送 Lark webhook 消息（自动附加签名）"""
    if secret:
        ts, sign = _lark_sign(secret)
        payload["timestamp"] = ts
        payload["sign"] = sign

    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        webhook,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            ok = result.get("StatusCode") == 0 or result.get("code") == 0
            if not ok:
                print(f"  ✗ Lark 发送失败: {result}")
            return ok
    except Exception as e:
        print(f"  ✗ Lark 发送异常: {e}")
        return False


def send_lark_text(
    webhook: str,
    title: str,
    content_blocks: list[list[dict]],
    secret: str | None = None,
) -> bool:
    """发送 Lark post（富文本）消息"""
    payload = {
        "msg_type": "post",
        "content": {
            "post": {
                "zh_cn": {
                    "title": title,
                    "content": content_blocks,
                }
            }
        },
    }
    return _send_lark(webhook, payload, secret)


def send_lark_test(webhook: str, secret: str | None = None) -> bool:
    """连通性测试"""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    payload = {
        "msg_type": "text",
        "content": {"text": f"🔔 Lark Bot 连通测试 — {ts}"},
    }
    ok = _send_lark(webhook, payload, secret)
    print(f"{'✓' if ok else '✗'} 连通测试 {'成功' if ok else '失败'}")
    return ok


# ── 主流程：未打卡跟进 ────────────────────────────────────────────────────────


def cmd_followup(args: argparse.Namespace) -> None:
    config = load_config()
    channel = get_channel(config, args.channel)
    api_base = config.get("defaults", {}).get("api_base", "http://localhost:8100")
    webhook = channel["webhook"]
    secret = channel.get("secret") or None

    # ── 安全防线：非 test 通道 + 非 dry-run 必须 --confirm ──
    if args.channel != "test" and not args.confirm and not args.dry_run:
        ch_name = args.channel
        print(f"[拦截] 通道 '{ch_name}' 非测试群，需要 --confirm 标志才能发送。")
        print("       安全模式：先用 --channel test 验证，确认后加 --confirm 发送。")
        print(
            f"       示例：uv run python scripts/lark_bot.py followup"
            f" --channel {ch_name} --confirm"
        )
        return

    today = datetime.now()
    date_display = f"{today.strftime('%Y年%m月%d日')} T-1"

    # ── 角色配置（从 Settings 读取围场映射）──
    role = args.role.upper()
    enc_order = _get_role_enclosures(role)
    # LP 排除 Region 团队
    team_exclude = {"LP": {"TH-LP01Region"}}

    print(f"📋 Lark Bot — {role} 未打卡跟进 ({date_display})")
    print(f"   通道: {channel.get('name', args.channel)}")
    print(f"   围场: {', '.join(enc_order)}")
    print()

    # 获取数据
    print("1. 获取未打卡数据...")
    students = fetch_followup(api_base, role=role)
    if not students:
        print("   ⚠ 无未打卡学员数据（可能后端未启动或无数据）")
        return

    # 过滤：只保留角色对应围场的学员
    valid_encs = set(enc_order)
    students = [s for s in students if s.get("enclosure") in valid_encs]
    print(f"   ✓ 共 {len(students)} 名未打卡学员（{role} 围场）")

    # 获取打卡率汇总数据
    print("   获取打卡率汇总...")
    summary_by_role = fetch_summary(api_base)
    role_summary = summary_by_role.get(role, {})
    if role_summary:
        role_rate = role_summary.get("checkin_rate", 0.0) or 0.0
        print(f"   ✓ {role} 打卡率: {role_rate:.1%}")
    else:
        print("   ⚠ 无打卡率汇总数据（API 可能不支持）")

    # 按团队分组 + 过滤排除团队
    teams = group_students_by_team(students)
    exclude = team_exclude.get(role, set())
    if exclude:
        teams = {k: v for k, v in teams.items() if k not in exclude}
    print(f"   ✓ {len(teams)} 个小组: {', '.join(teams.keys())}")

    # 获取各团队 per-CC 打卡率详情
    print("   获取各团队打卡率详情...")
    team_details: dict[str, dict[str, dict]] = {}
    for team_name in teams:
        detail_members = fetch_team_detail(api_base, team_name)
        if detail_members:
            team_details[team_name] = {m["name"]: m for m in detail_members}
            print(f"   ✓ [{team_name}] {len(detail_members)} 个 CC 的打卡率已获取")
        else:
            team_details[team_name] = {}

    print()

    # ── 阶段 2：生成图片（同日已存在则跳过）────────────────────────────────────
    print("2. 生成图片...")
    date_short = today.strftime("%Y%m%d")

    # 2a. 构建 team_summary（用于总览图，含打卡率）
    team_summary: list[dict] = []
    for team_name, members in teams.items():
        ccs = group_students_by_cc(members)
        cc_details = team_details.get(team_name, {})

        # 汇总团队打卡率（从各 CC 详情聚合）
        team_total_students = sum(
            cc_details.get(cc_name, {}).get("total_students", 0)
            for cc_name in ccs
        )
        team_checked_in = sum(
            cc_details.get(cc_name, {}).get("checked_in", 0)
            for cc_name in ccs
        )
        team_rate = (
            team_checked_in / max(team_total_students, 1)
            if team_total_students > 0
            else 0.0
        )

        # 各围场打卡率（聚合）
        enc_students_agg: dict[str, int] = defaultdict(int)
        enc_checked_agg: dict[str, int] = defaultdict(int)
        for cc_name in ccs:
            cc_detail = cc_details.get(cc_name, {})
            for enc_item in cc_detail.get("by_enclosure", []):
                enc = enc_item["enclosure"]
                enc_students_agg[enc] += enc_item.get("students", 0)
                enc_checked_agg[enc] += enc_item.get("checked_in", 0)

        by_enc_rates = {
            enc: enc_checked_agg[enc] / max(enc_students_agg[enc], 1)
            for enc in enc_students_agg
            if enc_students_agg[enc] > 0
        }

        team_summary.append(
            {
                "team": team_name,
                "count": len(members),
                "cc_count": len(ccs),
                "avg": round(len(members) / max(len(ccs), 1), 1),
                "rate": team_rate,
                "total_students": team_total_students,
                "checked_in_count": team_checked_in,
                "by_enc": by_enc_rates,
            }
        )

    # 2b. 总览图（缓存：同日文件已存在则读取而非重新生成）
    overview_filename = f"lark-overview-{role}-{date_short}.png"
    overview_path = OUTPUT_DIR / overview_filename
    if overview_path.exists():
        overview_bytes = overview_path.read_bytes()
        kb_ov = len(overview_bytes) // 1024
        print(f"   [总览] 使用缓存: output/{overview_filename} ({kb_ov}KB)")
    else:
        overview_bytes = generate_overview_image(
            team_summary, role_summary, date_display, role=role,
            enclosure_order=enc_order
        )
        overview_path.write_bytes(overview_bytes)
        kb_ov = len(overview_bytes) // 1024
        print(f"   [总览] 新生成: output/{overview_filename} ({kb_ov}KB)")

    # 2c. per-CC 图片（缓存：同日文件已存在则读取）
    team_cc_results: list[dict] = []
    for ts_row in team_summary:
        team_name = ts_row["team"]
        members = teams[team_name]
        ccs = group_students_by_cc(members)
        cc_details_map = team_details.get(team_name, {})
        cc_list = []
        for cc_name, cc_students_flat in ccs.items():
            # 按围场分组未打卡学员
            students_by_enc: dict[str, list[dict]] = defaultdict(list)
            for s in cc_students_flat:
                enc_key = s.get("enclosure", "?")
                students_by_enc[enc_key].append(s)

            # 获取该 CC 的打卡率详情
            cc_rate_info = cc_details_map.get(cc_name, {})

            team_safe = team_name.replace("/", "-").replace(" ", "_")
            cc_safe = cc_name.replace("/", "-").replace(" ", "_")
            cc_filename = f"lark-followup-{team_safe}-{cc_safe}-{date_short}.png"
            cc_path = OUTPUT_DIR / cc_filename
            if cc_path.exists():
                cc_bytes = cc_path.read_bytes()
                kb_cc = len(cc_bytes) // 1024
                print(f"   [{team_name}/{cc_name}] 缓存 ({kb_cc}KB)")
            else:
                cc_bytes = generate_cc_image(
                    cc_name, team_name,
                    dict(students_by_enc), cc_rate_info,
                    date_display, enclosure_order=enc_order
                )
                cc_path.write_bytes(cc_bytes)
                kb_cc = len(cc_bytes) // 1024
                print(f"   [{team_name}/{cc_name}] 新生成 ({kb_cc}KB)")

            # 收集学员 ID（内嵌到消息中供复制）
            student_ids = [
                str(s.get("student_id", "")) for s in cc_students_flat
            ]
            cc_list.append(
                {
                    "cc": cc_name,
                    "count": len(cc_students_flat),
                    "rate": cc_rate_info.get("rate", 0.0) or 0.0,
                    "by_enclosure": cc_rate_info.get("by_enclosure", []),
                    "students_by_enc": dict(students_by_enc),
                    "img_url": None,
                    "student_ids": student_ids,
                    "filename": cc_filename,
                    "img_bytes": cc_bytes,
                }
            )
        # 从 team_summary 取该团队的打卡率+围场率
        ts_match = next(
            (t for t in team_summary if t["team"] == team_name), {}
        )
        team_cc_results.append(
            {
                "team": team_name,
                "count": len(members),
                "cc_count": len(ccs),
                "rate": ts_match.get("rate", 0.0),
                "by_enc": ts_match.get("by_enc", {}),
                "ccs": cc_list,
            }
        )

    print()

    if args.dry_run:
        print("3. [dry-run] 跳过发送，图片已保存到 output/")
        return

    # 发送到 Lark
    if not webhook:
        print("3. [跳过] 通道 webhook 为空（test 通道仅支持 --dry-run）")
        return

    # ── 阶段 3：上传图片 + TSV（缓存：同日已上传则复用 URL）──────────────────
    print("3. 上传图片 + 数据...")
    url_cache = load_url_cache(date_short)
    cache_hits_before = len(url_cache)

    overview_url = cached_upload(overview_bytes, overview_filename, url_cache)
    if not overview_url:
        print("   ⚠ 总览图上传失败，将只发文本")

    for tr in team_cc_results:
        # 上传 per-CC 图片
        for cc_entry in tr["ccs"]:
            cc_entry["img_url"] = cached_upload(
                cc_entry["img_bytes"], cc_entry["filename"], url_cache
            )
            if not cc_entry["img_url"]:
                print(f"   ⚠ [{tr['team']}/{cc_entry['cc']}] 图片上传失败")

    # 持久化 URL 缓存
    save_url_cache(date_short, url_cache)
    cache_hits_after = len(url_cache)
    new_uploads = cache_hits_after - cache_hits_before
    cached_count = cache_hits_after - new_uploads
    if cached_count > 0:
        print(f"   ✓ 缓存命中 {cached_count}，新上传 {new_uploads}")
    else:
        print(f"   ✓ 全部新上传 {new_uploads}")

    print()

    # ── 阶段 4：发送 8 条 Lark 消息 ──────────────────────────────────────────
    print("4. 发送 Lark 消息...")

    total_count = sum(tr["count"] for tr in team_cc_results)

    # 消息 1：总览 card（泰文主 + 中文辅 + 围场率）
    overview_elements: list[dict] = []

    # 角色总打卡率 + 各围场率
    role_enc_rates = []
    role_by_enc = role_summary.get("by_enclosure", [])
    role_enc_map = {e["enclosure"]: e for e in role_by_enc}
    r_total = sum(role_enc_map.get(e, {}).get("students", 0) for e in enc_order)
    r_checked = sum(role_enc_map.get(e, {}).get("checked_in", 0) for e in enc_order)
    r_rate = f"{r_checked / r_total:.1%}" if r_total > 0 else "—"
    for enc in enc_order:
        ei = role_enc_map.get(enc, {})
        if ei.get("students", 0) > 0:
            role_enc_rates.append(f"{enc}: **{ei['rate']:.1%}**")

    summary_md = (
        f"{_th('total_summary')} **{total_count}** {_th('persons')}"
        f"  ({len(team_cc_results)} {_th('teams')})"
        f"  ▸ **{r_rate}**\n"
        f"{_zh('total_summary')} **{total_count}** {_zh('persons')}"
        f"  ({len(team_cc_results)} {_zh('teams')})"
    )
    if role_enc_rates:
        summary_md += "\n" + "  |  ".join(role_enc_rates)

    overview_elements.append({"tag": "markdown", "content": summary_md})
    overview_elements.append({"tag": "hr"})

    for tr in team_cc_results:
        # 团队围场率
        team_enc_parts = []
        for enc in enc_order:
            te = tr.get("by_enc", {}).get(enc)
            if te and te > 0:
                team_enc_parts.append(f"{enc}: **{te:.1%}**")
        md = (
            f"📊 **{tr['team']}**"
            f"  ▸ **{tr.get('rate', 0):.1%}**\n"
            f"{_th('not_checked')} **{tr['count']}** {_th('persons')}"
            f"  |  {role} {tr['cc_count']}"
        )
        if team_enc_parts:
            md += "\n" + "  |  ".join(team_enc_parts)
        overview_elements.append({"tag": "markdown", "content": md})
    if overview_url:
        overview_elements.append(
            {
                "tag": "markdown",
                "content": (
                    f"📷 [{role} {_th('overview_title')}]({overview_url})\n"
                    f"      {role} {_zh('overview_title')}"
                ),
            }
        )

    overview_title = (
        f"{role} {_th('overview_title')} — {date_display}\n"
        f"{role} {_zh('overview_title')}"
    )
    _send_lark(
        webhook,
        {
            "msg_type": "interactive",
            "card": {
                "header": {
                    "title": {"tag": "plain_text", "content": overview_title},
                    "template": "red",
                },
                "elements": overview_elements,
            },
        },
        secret,
    )
    print(f"   ✓ 消息 1/{1 + len(team_cc_results)} 已发送（总览）")
    time.sleep(3)

    # --overview-only：只发总览，跳过小组明细
    if args.overview_only:
        return

    # 消息 2-N：每团队 card（泰文主 + 中文辅，每 CC 一段）
    for idx, tr in enumerate(team_cc_results, start=2):
        team_elements: list[dict] = []
        # 团队头部：打卡率 + 围场率
        t_rate = f"{tr.get('rate', 0):.1%}"
        t_enc_parts = []
        for enc in enc_order:
            te = tr.get("by_enc", {}).get(enc)
            if te is not None and te > 0:
                t_enc_parts.append(f"{enc}: **{te:.1%}**")
        team_hdr = (
            f"{_th('not_checked')} **{tr['count']}** {_th('persons')}"
            f"  |  {role} {tr['cc_count']}"
            f"  ▸ **{t_rate}**"
        )
        if t_enc_parts:
            team_hdr += "\n" + "  |  ".join(t_enc_parts)
        team_elements.append({"tag": "markdown", "content": team_hdr})
        team_elements.append({"tag": "hr"})

        # 围场过滤：只显示该角色对应的围场
        # enc_order 已在函数顶部按 role 动态设置

        for cc_entry in tr["ccs"]:
            # 只算角色对应围场的打卡率（CC=M0+M1+M2）
            by_enc = cc_entry.get("by_enclosure", [])
            enc_map = {ei["enclosure"]: ei for ei in by_enc}
            role_total = sum(
                enc_map.get(e, {}).get("students", 0)
                for e in enc_order
            )
            role_checked = sum(
                enc_map.get(e, {}).get("checked_in", 0)
                for e in enc_order
            )
            rate_pct = (
                f"{role_checked / role_total:.1%}"
                if role_total > 0
                else "—"
            )

            # ── 名字 + 打卡率 ──
            cc_md = f"👤 **{cc_entry['cc']}**  ▸ **{rate_pct}**"
            if cc_entry["img_url"]:
                cc_md += (
                    f"\n📷 [{_th('view_list')}"
                    f" {cc_entry['cc']}]"
                    f"({cc_entry['img_url']})"
                )

            # ── Mx + ID（每围场一组）──
            by_enc = cc_entry.get("by_enclosure", [])
            enc_map = {ei["enclosure"]: ei for ei in by_enc}
            s_by_enc = cc_entry.get("students_by_enc", {})
            for enc in enc_order:
                ei = enc_map.get(enc, {})
                enc_students = s_by_enc.get(enc, [])
                n = len(enc_students)
                if ei.get("students", 0) > 0 or n > 0:
                    r = (
                        f"{ei['rate']:.1%}"
                        if ei.get("rate") is not None
                        else "—"
                    )
                    cc_md += f"\n\n**{enc}** · {n} {_th('persons')} ({r})"
                    if enc_students:
                        ids = [
                            str(s.get("student_id", ""))
                            for s in enc_students
                        ]
                        chunks = [
                            ", ".join(ids[i:i + 8])
                            for i in range(0, len(ids), 8)
                        ]
                        cc_md += "\n" + "\n".join(chunks)

            team_elements.append(
                {"tag": "markdown", "content": cc_md}
            )

        team_title = (
            f"{tr['team']} {_th('followup_title')} — {date_display}\n"
            f"{_zh('followup_title')}"
        )
        ok = _send_lark(
            webhook,
            {
                "msg_type": "interactive",
                "card": {
                    "header": {
                        "title": {"tag": "plain_text", "content": team_title},
                        "template": "red",
                    },
                    "elements": team_elements,
                },
            },
            secret,
        )
        status = "✓" if ok else "✗"
        print(
            f"   {status} 消息 {idx}/{1 + len(team_cc_results)} 已发送（{tr['team']}）"
        )
        time.sleep(3)


# ── CLI ───────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(description="Lark Bot — CC 运营推送")
    sub = parser.add_subparsers(dest="command")

    # followup 子命令
    p_followup = sub.add_parser("followup", help="发送未打卡跟进名单")
    p_followup.add_argument(
        "--channel",
        default="test",
        help="Lark 通道名 (default: test，安全模式)",
    )
    p_followup.add_argument(
        "--confirm",
        action="store_true",
        help="确认发送到正式群（非 test 通道必须加此标志）",
    )
    p_followup.add_argument("--dry-run", action="store_true", help="只生成图片不发送")
    p_followup.add_argument(
        "--role", default="CC",
        help="角色：CC / LP (default: CC)",
    )
    p_followup.add_argument(
        "--overview-only", action="store_true",
        help="只发总览，不发小组明细（适用于管理层群）",
    )

    # test 连通性
    parser.add_argument("--test", action="store_true", help="Lark webhook 连通性测试")
    parser.add_argument("--test-channel", default="cc_all", help="测试通道名")

    args = parser.parse_args()

    if args.test:
        config = load_config()
        ch = get_channel(config, args.test_channel)
        send_lark_test(ch["webhook"], secret=ch.get("secret") or None)
        return

    if args.command == "followup":
        cmd_followup(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

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
    "followup_title":  {"th": "รายชื่อยังไม่เช็คอิน", "zh": "未打卡跟进"},
    "not_checked":     {"th": "ยังไม่เช็คอิน",        "zh": "未打卡"},
    "persons":         {"th": "คน",                    "zh": "人"},
    "responsible":     {"th": "ผู้รับผิดชอบ",          "zh": "负责人"},
    "col_rank":        {"th": "#",                     "zh": "#"},
    "col_score":       {"th": "★",                     "zh": "★"},
    "col_student_id":  {"th": "รหัส",                  "zh": "学员ID"},
    "col_enclosure":   {"th": "คอก",                   "zh": "围场"},
    "col_owner":       {"th": "ผู้รับผิดชอบ",          "zh": "负责人"},
    "col_last_call":   {"th": "โทรล่าสุด",             "zh": "末次拨打"},
    "col_lesson":      {"th": "คลาส",                  "zh": "课耗"},
    "unassigned":      {"th": "ไม่ระบุ",               "zh": "未分配"},
    "unknown":         {"th": "ไม่ทราบ",               "zh": "未知"},
    "data_label":      {"th": "ข้อมูล T-1",            "zh": "T-1 数据"},
    "view_list":       {"th": "ดูรายชื่อ",              "zh": "查看名单"},
    "total_summary":   {"th": "รวมยังไม่เช็คอิน",      "zh": "共未打卡"},
    "teams":           {"th": "ทีม",                    "zh": "个小组"},
    "overview_title":  {"th": "ภาพรวม CC ยังไม่เช็คอิน", "zh": "CC 未打卡总览"},
    "cc_count":        {"th": "CC",                       "zh": "CC数"},
    "avg_per_cc":      {"th": "เฉลี่ย/CC",                "zh": "人均"},
    "col_team":        {"th": "ทีม",                       "zh": "团队"},
    "col_not_checked": {"th": "ยังไม่เช็คอิน",              "zh": "未打卡"},
    "total_row":       {"th": "รวม",                       "zh": "合计"},
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
        (0.2,  0.5,  _bi("col_rank"),       "center"),
        (0.7,  0.5,  _bi("col_score"),      "center"),
        (1.2,  1.5,  _bi("col_student_id"), "left"),
        (2.8,  0.7,  _bi("col_enclosure"),  "center"),
        (3.6,  2.0,  _bi("col_owner"),      "left"),
        (5.7,  1.6,  _bi("col_last_call"),  "center"),
        (7.4,  0.8,  _bi("col_lesson"),     "center"),
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
    ax.add_patch(plt.Rectangle(
        (0.15, y - 0.45), 0.07, 0.45,
        facecolor=C_DANGER, edgecolor="none",
    ))
    ax.text(
        0.35, y, f"{short_name}  {_th('followup_title')}",
        fontsize=15, fontweight="bold", color=C_HEADER, va="top",
    )
    y -= 0.25
    ax.text(
        0.35, y, f"{short_name}  {_zh('followup_title')}",
        fontsize=8, color=C_MUTED, va="top",
    )
    y -= 0.2
    ax.text(
        0.35, y, f"{date_str}  |  {_th('data_label')}",
        fontsize=8, color=C_MUTED, va="top",
    )

    # ── 汇总条 ──
    y -= 0.5
    # 统计负责人分布
    owner_counts: dict[str, int] = defaultdict(int)
    for s in students:
        name = s.get("cc_name") or "未知"
        owner_counts[name] += 1
    owner_sorted = sorted(owner_counts.items(), key=lambda x: -x[1])

    ax.add_patch(mpatches.FancyBboxPatch(
        (0.15, y - 0.45), table_width, 0.45,
        boxstyle="round,pad=0.06",
        facecolor=C_RED_BG, edgecolor=C_BORDER, linewidth=0.8,
    ))
    ax.text(
        0.35, y - 0.12,
        f"{_th('not_checked')} {n} {_th('persons')}",
        fontsize=13, fontweight="bold", color=C_DANGER, va="center",
    )
    # 负责人分布（右侧）
    owner_text = "  ".join(f"{name}({cnt})" for name, cnt in owner_sorted[:5])
    if len(owner_sorted) > 5:
        owner_text += f"  +{len(owner_sorted) - 5}{_th('persons')}"
    ax.text(
        table_width, y - 0.12,
        owner_text,
        fontsize=8, color=C_TEXT2, va="center", ha="right",
    )

    # ── 表头 ──
    y -= 0.65
    ax.add_patch(plt.Rectangle(
        (0.15, y - row_h), table_width, row_h,
        facecolor=C_N800, edgecolor="none",
    ))
    for cx, _cw, title, align in cols:
        ha = "center" if align == "center" else "left"
        ax.text(
            cx + 0.05, y - row_h / 2,
            title,
            fontsize=9, fontweight="bold", color="white",
            va="center", ha=ha,
        )
    y -= row_h

    # ── 数据行 ──
    for i, s in enumerate(students):
        bg = C_SURFACE if i % 2 == 0 else C_BG
        ax.add_patch(plt.Rectangle(
            (0.15, y - row_h), table_width, row_h,
            facecolor=bg, edgecolor="none",
        ))
        # 底部细线
        ax.plot(
            [0.15, 0.15 + table_width], [y - row_h, y - row_h],
            color=C_BORDER, linewidth=0.3,
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
            (cols[0][0], str(i + 1),     "center", C_MUTED, "normal"),
            (cols[1][0], str(int(score)), "center", _score_color(score), "bold"),
            (cols[2][0], str(sid),        "left",   C_TEXT,  "normal"),
            (cols[3][0], enc,             "center", C_TEXT2, "normal"),
            (cols[4][0], owner,           "left",   C_TEXT,  "normal"),
            (cols[5][0], last_call[:10] if len(last_call) > 10 else last_call,
             "center", C_MUTED, "normal"),
            (cols[6][0], lesson_str,      "center", C_TEXT2, "normal"),
        ]

        for cx, val, align, color, weight in row_data:
            ha = "center" if align == "center" else "left"
            ax.text(
                cx + 0.05, ym, val,
                fontsize=8.5, color=color, fontweight=weight,
                va="center", ha=ha,
            )
        y -= row_h

    # ── 保存 ──
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", pad_inches=0.1)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def generate_cc_image(
    cc_name: str,
    team_name: str,
    students: list[dict],
    date_str: str,
) -> bytes:
    """生成单个 CC 负责学员的未打卡图片（去掉负责人列）"""
    plt.rcParams["font.family"] = CJK_FONTS
    plt.rcParams["font.size"] = 10

    # 列定义（去掉 col_owner，共 6 列）
    cols = [
        (0.2,  0.5,  _bi("col_rank"),       "center"),
        (0.7,  0.5,  _bi("col_score"),      "center"),
        (1.2,  1.8,  _bi("col_student_id"), "left"),
        (3.1,  0.8,  _bi("col_enclosure"),  "center"),
        (4.0,  2.0,  _bi("col_last_call"),  "center"),
        (6.1,  0.9,  _bi("col_lesson"),     "center"),
    ]
    table_width = 7.2

    n = len(students)
    row_h = 0.35
    header_h = 2.1
    table_h = n * row_h
    total_h = header_h + table_h + 0.4
    total_h = max(total_h, 3.5)

    fig, ax = plt.subplots(figsize=(table_width + 0.4, total_h), dpi=150)
    fig.patch.set_facecolor(C_BG)
    ax.set_xlim(0, table_width + 0.4)
    ax.set_ylim(0, total_h)
    ax.set_aspect("equal")
    ax.axis("off")

    y = total_h

    # ── 标题区 ──
    y -= 0.25
    ax.add_patch(plt.Rectangle(
        (0.15, y - 0.45), 0.07, 0.45,
        facecolor=C_DANGER, edgecolor="none",
    ))
    ax.text(
        0.35, y, f"{cc_name}  {_th('followup_title')}",
        fontsize=15, fontweight="bold", color=C_HEADER, va="top",
    )
    y -= 0.25
    ax.text(
        0.35, y, f"{cc_name}  {_zh('followup_title')}",
        fontsize=8, color=C_MUTED, va="top",
    )
    y -= 0.2
    ax.text(
        0.35, y, f"{date_str}  |  {team_name}",
        fontsize=8, color=C_MUTED, va="top",
    )

    # ── 汇总条（只显示未打卡数，无负责人分布）──
    y -= 0.5
    ax.add_patch(mpatches.FancyBboxPatch(
        (0.15, y - 0.45), table_width, 0.45,
        boxstyle="round,pad=0.06",
        facecolor=C_RED_BG, edgecolor=C_BORDER, linewidth=0.8,
    ))
    ax.text(
        0.35, y - 0.12,
        f"{_th('not_checked')} {n} {_th('persons')}",
        fontsize=13, fontweight="bold", color=C_DANGER, va="center",
    )

    # ── 表头 ──
    y -= 0.65
    ax.add_patch(plt.Rectangle(
        (0.15, y - row_h), table_width, row_h,
        facecolor=C_N800, edgecolor="none",
    ))
    for cx, _cw, title, align in cols:
        ha = "center" if align == "center" else "left"
        ax.text(
            cx + 0.05, y - row_h / 2,
            title,
            fontsize=9, fontweight="bold", color="white",
            va="center", ha=ha,
        )
    y -= row_h

    # ── 数据行 ──
    for i, s in enumerate(students):
        bg = C_SURFACE if i % 2 == 0 else C_BG
        ax.add_patch(plt.Rectangle(
            (0.15, y - row_h), table_width, row_h,
            facecolor=bg, edgecolor="none",
        ))
        ax.plot(
            [0.15, 0.15 + table_width], [y - row_h, y - row_h],
            color=C_BORDER, linewidth=0.3,
        )

        ym = y - row_h / 2
        score = s.get("quality_score", 0) or 0
        sid = s.get("student_id", "")
        enc = s.get("enclosure", "")
        last_call = s.get("cc_last_call_date") or "—"
        lesson = s.get("lesson_consumption_3m")
        lesson_str = str(int(lesson)) if lesson is not None else "—"

        row_data = [
            (cols[0][0], str(i + 1),     "center", C_MUTED,  "normal"),
            (cols[1][0], str(int(score)), "center", _score_color(score), "bold"),
            (cols[2][0], str(sid),        "left",   C_TEXT,   "normal"),
            (cols[3][0], enc,             "center", C_TEXT2,  "normal"),
            (cols[4][0], last_call[:10] if len(last_call) > 10 else last_call,
             "center", C_MUTED, "normal"),
            (cols[5][0], lesson_str,      "center", C_TEXT2,  "normal"),
        ]

        for cx, val, align, color, weight in row_data:
            ha = "center" if align == "center" else "left"
            ax.text(
                cx + 0.05, ym, val,
                fontsize=8.5, color=color, fontweight=weight,
                va="center", ha=ha,
            )
        y -= row_h

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", pad_inches=0.1)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def generate_overview_image(
    team_summary: list[dict],
    date_str: str,
) -> bytes:
    """生成各团队汇总总览图片
    team_summary: [{"team": str, "count": int, "cc_count": int, "avg": float}]
    """
    plt.rcParams["font.family"] = CJK_FONTS
    plt.rcParams["font.size"] = 10

    # 4 列：ทีม | ยังไม่เช็คอิน | CC | เฉลี่ย/CC
    cols = [
        (0.2,  2.8,  f"{_th('col_team')}({_zh('col_team')})",               "left"),
        (3.1,  1.3,  f"{_th('col_not_checked')}({_zh('col_not_checked')})", "center"),
        (4.5,  0.8,  f"{_th('cc_count')}({_zh('cc_count')})",               "center"),
        (5.4,  1.4,  f"{_th('avg_per_cc')}({_zh('avg_per_cc')})",           "center"),
    ]
    table_width = 7.0

    n = len(team_summary)
    row_h = 0.38
    header_h = 1.8
    table_h = (n + 1) * row_h  # +1 for totals row
    total_h = header_h + table_h + 0.4
    total_h = max(total_h, 3.5)

    fig, ax = plt.subplots(figsize=(table_width + 0.4, total_h), dpi=150)
    fig.patch.set_facecolor(C_BG)
    ax.set_xlim(0, table_width + 0.4)
    ax.set_ylim(0, total_h)
    ax.set_aspect("equal")
    ax.axis("off")

    y = total_h

    # ── 标题区 ──
    y -= 0.25
    ax.add_patch(plt.Rectangle(
        (0.15, y - 0.45), 0.07, 0.45,
        facecolor=C_DANGER, edgecolor="none",
    ))
    ax.text(
        0.35, y, _th("overview_title"),
        fontsize=15, fontweight="bold", color=C_HEADER, va="top",
    )
    y -= 0.25
    ax.text(
        0.35, y, _zh("overview_title"),
        fontsize=8, color=C_MUTED, va="top",
    )
    y -= 0.2
    ax.text(
        0.35, y, f"{date_str}  |  {_th('data_label')}",
        fontsize=8, color=C_MUTED, va="top",
    )

    # ── 表头 ──
    y -= 0.55
    ax.add_patch(plt.Rectangle(
        (0.15, y - row_h), table_width, row_h,
        facecolor=C_N800, edgecolor="none",
    ))
    for cx, _cw, title, align in cols:
        ha = "center" if align == "center" else "left"
        ax.text(
            cx + 0.05, y - row_h / 2,
            title,
            fontsize=8.5, fontweight="bold", color="white",
            va="center", ha=ha,
        )
    y -= row_h

    # ── 数据行 ──
    total_count = sum(r["count"] for r in team_summary)
    total_cc = sum(r["cc_count"] for r in team_summary)
    avg_total = round(total_count / max(total_cc, 1), 1)

    for i, r in enumerate(team_summary):
        bg = C_SURFACE if i % 2 == 0 else C_BG
        ax.add_patch(plt.Rectangle(
            (0.15, y - row_h), table_width, row_h,
            facecolor=bg, edgecolor="none",
        ))
        ax.plot(
            [0.15, 0.15 + table_width], [y - row_h, y - row_h],
            color=C_BORDER, linewidth=0.3,
        )
        ym = y - row_h / 2
        row_data = [
            (cols[0][0], r["team"],           "left",   C_TEXT,   "normal"),
            (cols[1][0], str(r["count"]),      "center", C_DANGER, "bold"),
            (cols[2][0], str(r["cc_count"]),   "center", C_TEXT2,  "normal"),
            (cols[3][0], str(r["avg"]),        "center", C_TEXT2,  "normal"),
        ]
        for cx, val, align, color, weight in row_data:
            ha = "center" if align == "center" else "left"
            ax.text(cx + 0.05, ym, val, fontsize=8.5, color=color,
                    fontweight=weight, va="center", ha=ha)
        y -= row_h

    # ── 合计行（深色背景）──
    ax.add_patch(plt.Rectangle(
        (0.15, y - row_h), table_width, row_h,
        facecolor=C_N800, edgecolor="none",
    ))
    ym = y - row_h / 2
    total_row_data = [
        (cols[0][0], f"{_th('total_row')}({_zh('total_row')})", "left",   "white", "bold"),
        (cols[1][0], str(total_count),                           "center", C_DANGER, "bold"),
        (cols[2][0], str(total_cc),                              "center", "white", "normal"),
        (cols[3][0], str(avg_total),                             "center", "white", "normal"),
    ]
    for cx, val, align, color, weight in total_row_data:
        ha = "center" if align == "center" else "left"
        ax.text(cx + 0.05, ym, val, fontsize=8.5, color=color,
                fontweight=weight, va="center", ha=ha)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", pad_inches=0.1)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


# ── 图片上传（双图床 fallback） ───────────────────────────────────────────────

def _upload_freeimage(img_bytes: bytes, filename: str) -> str | None:
    encoded = base64.b64encode(img_bytes).decode("utf-8")
    data = urllib.parse.urlencode({
        "key": "6d207e02198a847aa98d0a2a901485a5",
        "source": encoded,
        "format": "json",
    }).encode("utf-8")
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
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="smfile"; filename="{filename}"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode() + img_bytes + f"\r\n--{boundary}--\r\n".encode()
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
    hmac_val = hmac.new(
        string_to_sign.encode("utf-8"), b"", hashlib.sha256
    ).digest()
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
    webhook: str, title: str, content_blocks: list[list[dict]],
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

    print(f"📋 Lark Bot — CC 未打卡跟进 ({date_display})")
    print(f"   通道: {channel.get('name', args.channel)}")
    print()

    # 获取数据
    print("1. 获取未打卡数据...")
    students = fetch_followup(api_base, role="CC")
    if not students:
        print("   ⚠ 无未打卡学员数据（可能后端未启动或无数据）")
        return

    print(f"   ✓ 共 {len(students)} 名未打卡学员")

    # 按团队分组
    teams = group_students_by_team(students)
    print(f"   ✓ {len(teams)} 个小组: {', '.join(teams.keys())}")
    print()

    # ── 阶段 2：生成图片 ─────────────────────────────────────────────────────
    print("2. 生成图片...")

    # 2a. 构建 team_summary（用于总览图）
    team_summary: list[dict] = []
    for team_name, members in teams.items():
        ccs = group_students_by_cc(members)
        team_summary.append({
            "team": team_name,
            "count": len(members),
            "cc_count": len(ccs),
            "avg": round(len(members) / max(len(ccs), 1), 1),
        })

    # 2b. 总览图
    overview_filename = f"lark-overview-{today.strftime('%Y%m%d')}.png"
    overview_bytes = generate_overview_image(team_summary, date_display)
    overview_path = OUTPUT_DIR / overview_filename
    overview_path.write_bytes(overview_bytes)
    print(f"   [总览] 图片已保存: output/{overview_filename} ({len(overview_bytes)//1024}KB)")

    # 2c. per-CC 图片（按团队→CC）
    # team_cc_results: [{team, count, cc_count, team_img: None, ccs: [{cc, count, img_url, img_bytes, filename}]}]
    team_cc_results: list[dict] = []
    for ts_row in team_summary:
        team_name = ts_row["team"]
        members = teams[team_name]
        ccs = group_students_by_cc(members)
        cc_list = []
        for cc_name, cc_students in ccs.items():
            team_safe = team_name.replace("/", "-").replace(" ", "_")
            cc_safe = cc_name.replace("/", "-").replace(" ", "_")
            cc_filename = f"lark-followup-{team_safe}-{cc_safe}-{today.strftime('%Y%m%d')}.png"
            cc_bytes = generate_cc_image(cc_name, team_name, cc_students, date_display)
            cc_path = OUTPUT_DIR / cc_filename
            cc_path.write_bytes(cc_bytes)
            print(f"   [{team_name}/{cc_name}] output/{cc_filename} ({len(cc_bytes)//1024}KB)")
            cc_list.append({
                "cc": cc_name,
                "count": len(cc_students),
                "img_url": None,
                "filename": cc_filename,
                "img_bytes": cc_bytes,
            })
        team_cc_results.append({
            "team": team_name,
            "count": len(members),
            "cc_count": len(ccs),
            "ccs": cc_list,
        })

    print()

    if args.dry_run:
        print("3. [dry-run] 跳过发送，图片已保存到 output/")
        return

    # 发送到 Lark
    if not webhook:
        print("3. [跳过] 通道 webhook 为空（test 通道仅支持 --dry-run）")
        return

    # ── 阶段 3：上传图片 ─────────────────────────────────────────────────────
    print("3. 上传图片...")

    overview_url = upload_image(overview_bytes, overview_filename)
    if not overview_url:
        print("   ⚠ 总览图上传失败，将只发文本")

    for tr in team_cc_results:
        for cc_entry in tr["ccs"]:
            cc_entry["img_url"] = upload_image(cc_entry["img_bytes"], cc_entry["filename"])
            if not cc_entry["img_url"]:
                print(f"   ⚠ [{tr['team']}/{cc_entry['cc']}] 图片上传失败")

    print()

    # ── 阶段 4：发送 8 条 Lark 消息 ──────────────────────────────────────────
    print("4. 发送 Lark 消息...")

    total_count = sum(tr["count"] for tr in team_cc_results)

    # 消息 1：总览 card
    overview_elements: list[dict] = []
    overview_elements.append({
        "tag": "markdown",
        "content": (
            f"{_th('total_summary')} **{total_count}** {_th('persons')}  "
            f"({len(team_cc_results)} {_th('teams')})"
        ),
    })
    overview_elements.append({"tag": "hr"})
    for tr in team_cc_results:
        md = (
            f"📊 **{tr['team']}**：{_th('not_checked')} **{tr['count']}** {_th('persons')}"
            f"  |  {_th('cc_count')} {tr['cc_count']}"
        )
        overview_elements.append({"tag": "markdown", "content": md})
    if overview_url:
        overview_elements.append({
            "tag": "markdown",
            "content": f"📷 [{_th('overview_title')}]({overview_url})",
        })

    overview_title = f"{_th('overview_title')} — {date_display}"
    _send_lark(webhook, {
        "msg_type": "interactive",
        "card": {
            "header": {
                "title": {"tag": "plain_text", "content": overview_title},
                "template": "red",
            },
            "elements": overview_elements,
        },
    }, secret)
    print(f"   ✓ 消息 1/{ 1 + len(team_cc_results)} 已发送（总览）")
    time.sleep(3)

    # 消息 2-N：每团队 card（每 CC 一段）
    for idx, tr in enumerate(team_cc_results, start=2):
        team_elements: list[dict] = []
        team_elements.append({
            "tag": "markdown",
            "content": (
                f"{_th('not_checked')} **{tr['count']}** {_th('persons')}"
                f"  |  {_th('cc_count')} {tr['cc_count']}"
            ),
        })
        team_elements.append({"tag": "hr"})

        for cc_entry in tr["ccs"]:
            cc_md = (
                f"👤 **{cc_entry['cc']}**: "
                f"{_th('not_checked')} **{cc_entry['count']}** {_th('persons')}"
            )
            if cc_entry["img_url"]:
                cc_md += f"\n📷 [{_th('view_list')} {cc_entry['cc']}]({cc_entry['img_url']})"
            team_elements.append({"tag": "markdown", "content": cc_md})

        team_title = f"{tr['team']} {_th('followup_title')} — {date_display}"
        ok = _send_lark(webhook, {
            "msg_type": "interactive",
            "card": {
                "header": {
                    "title": {"tag": "plain_text", "content": team_title},
                    "template": "red",
                },
                "elements": team_elements,
            },
        }, secret)
        status = "✓" if ok else "✗"
        print(f"   {status} 消息 {idx}/{1 + len(team_cc_results)} 已发送（{tr['team']}）")
        time.sleep(3)


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Lark Bot — CC 运营推送")
    sub = parser.add_subparsers(dest="command")

    # followup 子命令
    p_followup = sub.add_parser("followup", help="发送未打卡跟进名单")
    p_followup.add_argument(
        "--channel", default="test",
        help="Lark 通道名 (default: test，安全模式)",
    )
    p_followup.add_argument(
        "--confirm", action="store_true",
        help="确认发送到正式群（非 test 通道必须加此标志）",
    )
    p_followup.add_argument("--dry-run", action="store_true", help="只生成图片不发送")

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

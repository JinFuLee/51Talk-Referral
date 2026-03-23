#!/usr/bin/env python3
"""钉钉 CC 打卡日报推送（泰文 + 图片版）

用法：
  uv run python scripts/dingtalk_daily.py          # 发送图片日报
  uv run python scripts/dingtalk_daily.py --text    # 发送纯文本版（Markdown）
  uv run python scripts/dingtalk_daily.py --test    # 连通性测试
  uv run python scripts/dingtalk_daily.py --dry-run # 只生成图片不发送

数据源：localhost:8100/api/checkin/ranking（仅 CC）
目标：钉钉群 Referral Must Win · 加签模式
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import io
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import colormaps  # noqa: E402
import matplotlib.patches as mpatches  # noqa: E402

# ── 配置 ──────────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CRED_PATH = PROJECT_ROOT / "key" / "dingtalk.json"
API_BASE = "http://localhost:8100"
OUTPUT_DIR = PROJECT_ROOT / "output"

GOOD_RATE = 0.6
WARN_RATE = 0.4

# SEE Design System — Warm Neutral 色板
C_BG       = "#FAFAF9"   # --n-50  bg-primary
C_SURFACE  = "#F5F5F4"   # --n-100 bg-surface
C_ELEVATED = "#E7E5E4"   # --n-200 bg-elevated / border-subtle
C_BORDER   = "#E7E5E4"   # --border-subtle
C_BORDER_H = "#D6D3D1"   # --n-300 border-hover
C_MUTED    = "#78716C"    # --n-500 text-muted
C_TEXT2    = "#57534E"    # --n-600 text-secondary
C_TEXT     = "#1C1917"    # --n-900 text-primary
C_HEADER   = "#1C1917"   # --n-900
C_N800     = "#292524"    # --n-800 表头背景
C_BRAND_P1 = "#92400E"   # --brand-p1 品牌棕
C_BRAND_P2 = "#3730A3"   # --brand-p2 操作蓝
C_ACCENT   = "#F59E0B"   # --accent-spark
C_SUCCESS  = "#059669"   # --success
C_WARNING  = "#D97706"   # --warning
C_DANGER   = "#DC2626"   # --danger
# 状态浅底
C_GREEN_BG  = "#ECFDF5"
C_YELLOW_BG = "#FFFBEB"
C_RED_BG    = "#FEF2F2"
# 奖牌
C_GOLD   = "#D4AF37"
C_SILVER = "#A0A0A0"
C_BRONZE = "#CD7F32"

# 泰文字体 fallback
THAI_FONTS = [
    "Tahoma", "Angsana New", "Browallia New", "Cordia New",
    "TH Sarabun New", "Leelawadee", "Arial Unicode MS",
    "DejaVu Sans", "sans-serif",
]


def load_credentials() -> dict:
    with open(CRED_PATH) as f:
        return json.load(f)


def sign_url(webhook: str, secret: str) -> str:
    timestamp = str(int(time.time() * 1000))
    string_to_sign = f"{timestamp}\n{secret}"
    hmac_code = hmac.new(
        secret.encode("utf-8"),
        string_to_sign.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    sign = urllib.parse.quote_plus(base64.b64encode(hmac_code).decode("utf-8"))
    return f"{webhook}&timestamp={timestamp}&sign={sign}"


# ── 数据获取 ──────────────────────────────────────────────────────────────────


def fetch_ranking() -> dict:
    url = f"{API_BASE}/api/checkin/ranking"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ── 图片生成 ──────────────────────────────────────────────────────────────────


def rate_color(rate: float) -> str:
    if rate >= GOOD_RATE:
        return C_SUCCESS
    if rate >= WARN_RATE:
        return C_WARNING
    return C_DANGER


def rate_bg(rate: float) -> str:
    if rate >= GOOD_RATE:
        return C_GREEN_BG
    if rate >= WARN_RATE:
        return C_YELLOW_BG
    return C_RED_BG


def fmt_pct(rate: float) -> str:
    return f"{rate * 100:.1f}%"


def _draw_circle(ax, x: float, y: float, r: float, color: str, *, zorder: int = 5):
    """绘制实心圆"""
    c = plt.Circle((x, y), r, facecolor=color, edgecolor="none", zorder=zorder)
    ax.add_patch(c)


def _draw_medal(ax, x: float, y: float, rank: int):
    """绘制奖牌圆（金/银/铜）或普通排名数字"""
    medal_colors = {1: C_GOLD, 2: C_SILVER, 3: C_BRONZE}
    if rank in medal_colors:
        _draw_circle(ax, x + 0.25, y, 0.12, medal_colors[rank])
        ax.text(x + 0.25, y, str(rank), fontsize=8, fontweight="bold",
                color="white", va="center", ha="center", zorder=6)
    else:
        ax.text(x + 0.25, y, str(rank), fontsize=10,
                color=C_TEXT2, va="center", ha="center")


def _draw_status_dot(ax, x: float, y: float, rate: float):
    """绘制状态小圆点（绿/黄/红）"""
    _draw_circle(ax, x, y, 0.07, rate_color(rate))


def generate_report_image(data: dict) -> bytes:
    """生成 CC 打卡日报 PNG 图片（纯矢量图形，无 emoji）"""
    cc = data.get("by_role", {}).get("CC", {})
    total = cc.get("total_students", 0)
    checked = cc.get("checked_in", 0)
    rate = cc.get("checkin_rate", 0)
    groups = cc.get("by_group", [])
    persons = cc.get("by_person", [])[:10]

    today = datetime.now().strftime("%d/%m/%Y")
    now_time = datetime.now().strftime("%H:%M")

    plt.rcParams["font.family"] = THAI_FONTS
    plt.rcParams["font.size"] = 11

    n_groups = len(groups)
    n_persons = len(persons)
    table_h = max(n_groups, 1) * 0.35 + 1.2
    person_h = max(n_persons, 1) * 0.35 + 1.2
    total_h = 3.5 + table_h + person_h + 1.5

    fig, ax = plt.subplots(figsize=(8, total_h), dpi=150)
    fig.patch.set_facecolor(C_BG)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, total_h)
    ax.set_aspect("equal")
    ax.axis("off")

    y = total_h

    # ── 标题区 ──
    y -= 0.3
    # 品牌竖条
    ax.add_patch(plt.Rectangle((0.2, y - 0.35), 0.08, 0.35,
                               facecolor=C_BRAND_P2, edgecolor="none"))
    ax.text(0.45, y, "CC Check-in Report", fontsize=18, fontweight="bold",
            color=C_HEADER, va="top")
    y -= 0.45
    ax.text(0.45, y, f"{today}  |  {now_time}  |  T-1",
            fontsize=10, color=C_TEXT2, va="top")

    # ── 总览卡片 ──
    y -= 0.7
    card_h = 1.2
    ax.add_patch(mpatches.FancyBboxPatch(
        (0.2, y - card_h), 9.6, card_h,
        boxstyle="round,pad=0.1",
        facecolor="white", edgecolor=C_BORDER, linewidth=1.2,
    ))

    cy = y - 0.3
    # 状态圆点 + 标题
    _draw_status_dot(ax, 0.55, cy, rate)
    ax.text(0.75, cy, "CC Overview", fontsize=13, fontweight="bold",
            color=C_HEADER, va="center")
    ax.text(3.8, cy, f"{checked:,} / {total:,}", fontsize=12,
            color=C_TEXT2, va="center")

    ax.text(7.0, cy, fmt_pct(rate), fontsize=22, fontweight="bold",
            color=rate_color(rate), va="center", ha="center")

    # 进度条
    bar_y = cy - 0.45
    bar_w = 6.0
    ax.add_patch(mpatches.FancyBboxPatch(
        (0.6, bar_y - 0.08), bar_w, 0.16,
        boxstyle="round,pad=0.04",
        facecolor=C_ELEVATED, edgecolor="none",
    ))
    fill_w = bar_w * min(rate, 1.0)
    if fill_w > 0.05:
        ax.add_patch(mpatches.FancyBboxPatch(
            (0.6, bar_y - 0.08), fill_w, 0.16,
            boxstyle="round,pad=0.04",
            facecolor=rate_color(rate), edgecolor="none",
        ))
    # 阈值标记线
    for threshold, lbl in [(GOOD_RATE, f"{int(GOOD_RATE*100)}%"), (WARN_RATE, "")]:
        tx = 0.6 + bar_w * threshold
        ax.plot([tx, tx], [bar_y - 0.1, bar_y + 0.1], color=C_MUTED,
                linewidth=0.8, linestyle="--", zorder=4)

    y -= card_h + 0.4

    # ── 团队排行表 ──
    # 节标题竖条
    ax.add_patch(plt.Rectangle((0.2, y - 0.25), 0.06, 0.25,
                               facecolor=C_ACCENT, edgecolor="none"))
    ax.text(0.4, y, "Team Ranking", fontsize=13, fontweight="bold",
            color=C_HEADER, va="top")
    y -= 0.45

    cols_x = [0.3, 1.2, 3.5, 5.0, 6.5, 8.0]
    headers = ["#", "Team", "Students", "Check-in", "Rate", ""]
    for i, h in enumerate(headers[:-1]):
        ha = "right" if i >= 2 else "left"
        ax.text(cols_x[i], y, h, fontsize=9, fontweight="bold",
                color=C_TEXT2, va="center", ha=ha)

    y -= 0.15
    ax.plot([0.2, 9.8], [y, y], color=C_BORDER, linewidth=0.8)
    y -= 0.15

    for g in groups:
        rank = g.get("rank", 0)
        name = g.get("group", "").replace("TH-", "").replace("Team", "")
        students = g.get("students", 0)
        ck = g.get("checked_in", 0)
        gr = g.get("rate", 0)

        row_bg = rate_bg(gr) if gr < WARN_RATE else (C_BG if rank % 2 == 0 else "white")
        ax.add_patch(plt.Rectangle(
            (0.2, y - 0.15), 9.6, 0.32,
            facecolor=row_bg, edgecolor="none",
        ))

        _draw_medal(ax, cols_x[0], y, rank)
        ax.text(cols_x[1], y, name, fontsize=10, fontweight="semibold",
                color=C_TEXT, va="center")
        ax.text(cols_x[2], y, str(students), fontsize=10,
                color=C_TEXT2, va="center", ha="right")
        ax.text(cols_x[3], y, str(ck), fontsize=10,
                color=C_TEXT2, va="center", ha="right")

        # 打卡率 + 状态圆点
        _draw_status_dot(ax, cols_x[4] + 0.2, y, gr)
        ax.text(cols_x[4], y, fmt_pct(gr), fontsize=10, fontweight="bold",
                color=rate_color(gr), va="center", ha="right")

        # 迷你进度条
        mini_x = cols_x[5]
        mini_w = 1.6
        ax.add_patch(plt.Rectangle(
            (mini_x, y - 0.06), mini_w, 0.12,
            facecolor=C_ELEVATED, edgecolor="none", zorder=2,
        ))
        fill = mini_w * min(gr, 1.0)
        if fill > 0.02:
            ax.add_patch(plt.Rectangle(
                (mini_x, y - 0.06), fill, 0.12,
                facecolor=rate_color(gr), edgecolor="none", zorder=3,
            ))

        y -= 0.35

    y -= 0.3

    # ── Top 10 个人 ──
    if persons:
        ax.add_patch(plt.Rectangle((0.2, y - 0.25), 0.06, 0.25,
                                   facecolor=C_BRAND_P2, edgecolor="none"))
        ax.text(0.4, y, "Top 10 Individuals", fontsize=13, fontweight="bold",
                color=C_HEADER, va="top")
        y -= 0.45

        p_cols = [0.3, 1.2, 4.5, 6.0, 7.5]
        p_headers = ["#", "Name", "Team", "Students", "Rate"]
        for i, h in enumerate(p_headers):
            ha = "right" if i >= 3 else "left"
            ax.text(p_cols[i], y, h, fontsize=9, fontweight="bold",
                    color=C_TEXT2, va="center", ha=ha)
        y -= 0.15
        ax.plot([0.2, 9.8], [y, y], color=C_BORDER, linewidth=0.8)
        y -= 0.15

        for p in persons:
            rank = p.get("rank", 0)
            name = p.get("name", "")
            team = p.get("group", "").replace("TH-", "").replace("Team", "")
            students = p.get("students", 0)
            pr = p.get("rate", 0)

            if rank % 2 == 0:
                ax.add_patch(plt.Rectangle(
                    (0.2, y - 0.15), 9.6, 0.32,
                    facecolor=C_BG, edgecolor="none",
                ))

            _draw_medal(ax, p_cols[0], y, rank)
            ax.text(p_cols[1], y, name, fontsize=9,
                    color=C_TEXT, va="center")
            ax.text(p_cols[2], y, team, fontsize=9,
                    color=C_TEXT2, va="center")
            ax.text(p_cols[3], y, str(students), fontsize=9,
                    color=C_TEXT2, va="center", ha="right")

            _draw_status_dot(ax, p_cols[4] + 0.2, y, pr)
            ax.text(p_cols[4], y, fmt_pct(pr), fontsize=10, fontweight="bold",
                    color=rate_color(pr), va="center", ha="right")

            y -= 0.35

    # ── 图例 ──
    y -= 0.3
    legend_items = [
        (C_SUCCESS, f"  >= {int(GOOD_RATE*100)}%  Pass"),
        (C_WARNING, f"  {int(WARN_RATE*100)}-{int(GOOD_RATE*100)}%  Near"),
        (C_DANGER, f"  < {int(WARN_RATE*100)}%  Below"),
    ]
    lx = 0.5
    for color, label in legend_items:
        _draw_circle(ax, lx + 0.08, y, 0.07, color)
        ax.text(lx + 0.2, y, label, fontsize=8, color=C_TEXT2, va="center")
        lx += 3.0

    # ── 底部 ──
    y -= 0.4
    ax.plot([2.0, 8.0], [y + 0.15, y + 0.15], color=C_BORDER_H, linewidth=0.5)
    ax.text(5.0, y, "ref-ops-engine  |  T-1 Data",
            fontsize=8, color=C_MUTED, va="center", ha="center")

    plt.tight_layout(pad=0.3)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", facecolor=fig.get_facecolor(),
                bbox_inches="tight", dpi=150)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def generate_team_image(team_name: str, members: list[dict], team_total: int, team_checked: int) -> bytes:
    """生成单个小组的个人打卡排行图片"""
    short_name = team_name.replace("TH-", "").replace("Team", "")
    team_rate = team_checked / team_total if team_total > 0 else 0
    today = datetime.now().strftime("%d/%m/%Y")

    plt.rcParams["font.family"] = THAI_FONTS
    plt.rcParams["font.size"] = 11

    n = len(members)
    total_h = max(n * 0.38 + 2.8, 3.5)

    fig, ax = plt.subplots(figsize=(7, total_h), dpi=150)
    fig.patch.set_facecolor(C_BG)
    ax.set_xlim(0, 9)
    ax.set_ylim(0, total_h)
    ax.set_aspect("equal")
    ax.axis("off")

    y = total_h

    # ── 标题区 ──
    y -= 0.3
    ax.add_patch(plt.Rectangle((0.2, y - 0.35), 0.08, 0.35,
                               facecolor=rate_color(team_rate), edgecolor="none"))
    ax.text(0.45, y, f"{short_name}  Individual Report", fontsize=16, fontweight="bold",
            color=C_HEADER, va="top")
    y -= 0.4
    ax.text(0.45, y, f"{today}  |  T-1", fontsize=9, color=C_TEXT2, va="top")

    # ── 汇总条 ──
    y -= 0.55
    ax.add_patch(mpatches.FancyBboxPatch(
        (0.2, y - 0.5), 8.6, 0.5,
        boxstyle="round,pad=0.08",
        facecolor="white", edgecolor=C_BORDER, linewidth=1,
    ))

    _draw_status_dot(ax, 0.5, y - 0.25, team_rate)
    ax.text(0.7, y - 0.25, f"{team_checked}/{team_total}", fontsize=12,
            color=C_TEXT, va="center", fontweight="bold")
    ax.text(3.0, y - 0.25, fmt_pct(team_rate), fontsize=18, fontweight="bold",
            color=rate_color(team_rate), va="center")

    # 迷你进度条
    bx, bw = 4.5, 4.0
    ax.add_patch(mpatches.FancyBboxPatch(
        (bx, y - 0.32), bw, 0.14,
        boxstyle="round,pad=0.03", facecolor=C_ELEVATED, edgecolor="none",
    ))
    fw = bw * min(team_rate, 1.0)
    if fw > 0.03:
        ax.add_patch(mpatches.FancyBboxPatch(
            (bx, y - 0.32), fw, 0.14,
            boxstyle="round,pad=0.03", facecolor=rate_color(team_rate), edgecolor="none",
        ))

    y -= 0.7

    # ── 成员表 ──
    cols = [0.3, 1.1, 4.0, 5.3, 6.6, 7.8]
    hdrs = ["#", "Name", "Students", "Check-in", "Rate", ""]
    for i, h in enumerate(hdrs[:-1]):
        ha = "right" if i >= 2 else "left"
        ax.text(cols[i], y, h, fontsize=9, fontweight="bold",
                color=C_TEXT2, va="center", ha=ha)

    y -= 0.15
    ax.plot([0.2, 8.8], [y, y], color=C_BORDER, linewidth=0.8)
    y -= 0.15

    # 按 rate DESC → checked_in DESC 排序（后端已排，保险起见再排一次）
    sorted_members = sorted(members, key=lambda m: (-m.get("rate", 0), -m.get("checked_in", 0)))

    for idx, m in enumerate(sorted_members):
        rank = idx + 1
        name = m.get("name", "")
        students = m.get("students", 0)
        ck = m.get("checked_in", 0)
        mr = m.get("rate", 0)

        if rank % 2 == 0:
            ax.add_patch(plt.Rectangle(
                (0.2, y - 0.15), 8.6, 0.34,
                facecolor=C_SURFACE, edgecolor="none",
            ))

        # 落后行高亮
        if mr < WARN_RATE and students > 0:
            ax.add_patch(plt.Rectangle(
                (0.2, y - 0.15), 8.6, 0.34,
                facecolor=C_RED_BG, edgecolor="none",
            ))

        _draw_medal(ax, cols[0], y, rank)
        ax.text(cols[1], y, name, fontsize=10, color=C_TEXT, va="center")
        ax.text(cols[2], y, str(students), fontsize=10,
                color=C_TEXT2, va="center", ha="right")
        ax.text(cols[3], y, str(ck), fontsize=10,
                color=C_TEXT2, va="center", ha="right")

        _draw_status_dot(ax, cols[4] + 0.25, y, mr)
        ax.text(cols[4], y, fmt_pct(mr), fontsize=10, fontweight="bold",
                color=rate_color(mr), va="center", ha="right")

        # 迷你进度条
        mx, mw = cols[5], 1.0
        ax.add_patch(plt.Rectangle(
            (mx, y - 0.05), mw, 0.1,
            facecolor=C_ELEVATED, edgecolor="none", zorder=2,
        ))
        mf = mw * min(mr, 1.0)
        if mf > 0.02:
            ax.add_patch(plt.Rectangle(
                (mx, y - 0.05), mf, 0.1,
                facecolor=rate_color(mr), edgecolor="none", zorder=3,
            ))

        y -= 0.38

    # ── 图例 + 底部 ──
    y -= 0.25
    legend_items = [
        (C_SUCCESS, f">={int(GOOD_RATE*100)}% Pass"),
        (C_WARNING, f"{int(WARN_RATE*100)}-{int(GOOD_RATE*100)}% Near"),
        (C_DANGER, f"<{int(WARN_RATE*100)}% Below"),
    ]
    lx = 0.5
    for color, label in legend_items:
        _draw_circle(ax, lx + 0.08, y, 0.06, color)
        ax.text(lx + 0.2, y, label, fontsize=7, color=C_TEXT2, va="center")
        lx += 2.8

    plt.tight_layout(pad=0.3)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", facecolor=fig.get_facecolor(),
                bbox_inches="tight", dpi=150)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


# ── 图片上传（sm.ms 免费图床）──────────────────────────────────────────────


def upload_image(image_bytes: bytes) -> str | None:
    """上传图片到 sm.ms，返回公网 URL"""
    boundary = f"----PythonBoundary{int(time.time())}"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="smfile"; filename="report.png"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode("utf-8") + image_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        "https://sm.ms/api/v2/upload",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": "ref-ops-engine/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            if result.get("success"):
                return result["data"]["url"]
            # 图片已存在（重复上传）
            if "images" in str(result.get("message", "")):
                return result.get("images")
    except Exception as e:
        print(f"sm.ms 上传失败: {e}")

    return None


# ── Markdown 纯文本（备用）──────────────────────────────────────────────────


def rate_icon(rate: float) -> str:
    if rate >= GOOD_RATE:
        return "🟢"
    if rate >= WARN_RATE:
        return "🟡"
    return "🔴"


def build_text_markdown(data: dict) -> str:
    cc = data.get("by_role", {}).get("CC", {})
    total = cc.get("total_students", 0)
    checked = cc.get("checked_in", 0)
    rate = cc.get("checkin_rate", 0)
    groups = cc.get("by_group", [])
    persons = cc.get("by_person", [])[:10]
    today = datetime.now().strftime("%d/%m/%Y")
    now_time = datetime.now().strftime("%H:%M")

    lines = [
        f"## 📋 CC Check-in Report",
        f"",
        f"📅 **{today}**　⏰ {now_time}",
        f"",
        f"---",
        f"",
        f"### {rate_icon(rate)} ภาพรวม CC　**{fmt_pct(rate)}**",
        f"",
        f"- 👥 นักเรียนทั้งหมด: **{total:,}** คน",
        f"- ✅ Check-in แล้ว: **{checked:,}** คน",
        f"",
    ]

    if groups:
        lines += [f"---", f"", f"### 🏆 อันดับทีม", f"",
                  f"| อันดับ | ทีม | นร. | เช็คอิน | อัตรา |",
                  f"|:---:|------|:---:|:---:|------:|"]
        medals = {1: "🥇", 2: "🥈", 3: "🥉"}
        for g in groups:
            r = g.get("rank", 0)
            n = g.get("group", "").replace("TH-", "").replace("Team", "")
            lines.append(
                f"| {medals.get(r, str(r))} | {n} | {g['students']} | {g['checked_in']} | {rate_icon(g['rate'])} {fmt_pct(g['rate'])} |"
            )
        lines.append("")

    if persons:
        lines += [f"---", f"", f"### 🌟 Top 10 พนักงาน", f"",
                  f"| อันดับ | ชื่อ | ทีม | อัตรา |",
                  f"|:---:|------|------|------:|"]
        medals = {1: "🥇", 2: "🥈", 3: "🥉"}
        for p in persons:
            r = p.get("rank", 0)
            t = p.get("group", "").replace("TH-", "").replace("Team", "")
            lines.append(
                f"| {medals.get(r, str(r))} | {p['name']} | {t} | {rate_icon(p['rate'])} {fmt_pct(p['rate'])} |"
            )
        lines.append("")

    behind = [g["group"].replace("TH-", "").replace("Team", "")
              for g in groups if g.get("rate", 0) < WARN_RATE]
    if behind:
        lines += [f"---", f"", f"⚠️ **ทีมที่ต้องปรับปรุง**: {'、'.join(behind)}", f""]

    lines += [
        f"---",
        f"",
        f"🟢 ≥{int(GOOD_RATE*100)}% ผ่านเกณฑ์　🟡 {int(WARN_RATE*100)}-{int(GOOD_RATE*100)}% ใกล้เกณฑ์　🔴 <{int(WARN_RATE*100)}% ต่ำกว่าเกณฑ์",
        f"",
        f"> ข้อมูล T-1 · ref-ops-engine",
    ]
    return "\n".join(lines)


# ── 发送 ──────────────────────────────────────────────────────────────────────


def send_dingtalk(title: str, markdown_text: str, cred: dict) -> dict:
    url = sign_url(cred["webhook"], cred["secret"])
    payload = json.dumps({
        "msgtype": "markdown",
        "markdown": {"title": title, "text": markdown_text},
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload,
                                headers={"Content-Type": "application/json"},
                                method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ── 入口 ──────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="钉钉 CC 打卡日报（泰文图片版）")
    parser.add_argument("--test", action="store_true", help="连通性测试")
    parser.add_argument("--text", action="store_true", help="纯文本 Markdown 模式")
    parser.add_argument("--dry-run", action="store_true", help="只生成不发送")
    args = parser.parse_args()

    cred = load_credentials()

    if args.test:
        md = (f"## 🔔 ทดสอบระบบ\n\n"
              f"ระบบรายงาน Check-in ทำงานปกติ ✅\n\n"
              f"> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        if not args.dry_run:
            r = send_dingtalk("ทดสอบ", md, cred)
            print(f"结果: {json.dumps(r, ensure_ascii=False)}")
        else:
            print(md)
        return

    try:
        data = fetch_ranking()
    except Exception as e:
        print(f"API 失败: {e}")
        return

    today_str = datetime.now().strftime("%d/%m")

    if args.text:
        md = build_text_markdown(data)
        if args.dry_run:
            print(md)
        else:
            r = send_dingtalk(f"CC Check-in {today_str}", md, cred)
            print("✅ 文本发送成功" if r.get("errcode") == 0 else f"❌ {r}")
        return

    # 图片模式
    OUTPUT_DIR.mkdir(exist_ok=True)
    date_tag = datetime.now().strftime("%Y%m%d")
    cc = data.get("by_role", {}).get("CC", {})
    persons = cc.get("by_person", [])
    groups = cc.get("by_group", [])

    # ── 1) 总览图 ──
    print("生成总览图…")
    overview_bytes = generate_report_image(data)
    overview_path = OUTPUT_DIR / f"checkin-overview-{date_tag}.png"
    overview_path.write_bytes(overview_bytes)
    print(f"  总览: {overview_path} ({len(overview_bytes) / 1024:.0f} KB)")

    # ── 2) 每个小组的个人图 ──
    # 按 group 分桶
    group_members: dict[str, list[dict]] = {}
    for p in persons:
        g = p.get("group", "") or "Unknown"
        if g not in group_members:
            group_members[g] = []
        group_members[g].append(p)

    # 按 groups 排序（打卡率降序，与总览一致）
    group_order = [g.get("group", "") for g in groups]
    ordered_teams = [t for t in group_order if t in group_members]
    # 补充不在 by_group 中的团队
    ordered_teams += [t for t in group_members if t not in ordered_teams]

    team_images: list[tuple[str, bytes, Path]] = []
    for team_name in ordered_teams:
        members = group_members[team_name]
        if not members:
            continue
        t_total = sum(m.get("students", 0) for m in members)
        t_checked = sum(m.get("checked_in", 0) for m in members)
        short = team_name.replace("TH-", "").replace("Team", "")

        print(f"生成 {short} 个人图…")
        img = generate_team_image(team_name, members, t_total, t_checked)
        path = OUTPUT_DIR / f"checkin-{short}-{date_tag}.png"
        path.write_bytes(img)
        team_images.append((short, img, path))
        print(f"  {short}: {path} ({len(img) / 1024:.0f} KB)")

    if args.dry_run:
        print(f"\n共 {1 + len(team_images)} 张图片（dry-run，不上传不发送）")
        return

    # ── 发送流程 ──
    def upload_and_send(img_bytes: bytes, title: str, fallback_text: str = "") -> bool:
        img_url = upload_image(img_bytes)
        if img_url:
            md = f"## {title}\n\n![report]({img_url})"
            r = send_dingtalk(title, md, cred)
            if r.get("errcode") == 0:
                print(f"  ✅ {title}")
                return True
            print(f"  ❌ {title}: {r}")
        else:
            print(f"  ⚠️ {title} 图床失败")
        # 回退文本
        if fallback_text:
            send_dingtalk(title, fallback_text, cred)
            print(f"  ↩ {title} 文本回退")
        return False

    # 发总览
    print("\n上传+发送…")
    upload_and_send(
        overview_bytes,
        f"CC Check-in Overview {today_str}",
        fallback_text=build_text_markdown(data),
    )

    # 发每个小组（间隔 1.5s 避免触发钉钉频率限制）
    for short, img, _ in team_images:
        time.sleep(1.5)
        upload_and_send(img, f"{short} Check-in {today_str}")

    print(f"\n全部完成：1 张总览 + {len(team_images)} 张小组")


if __name__ == "__main__":
    main()

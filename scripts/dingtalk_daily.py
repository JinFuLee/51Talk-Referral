#!/usr/bin/env python3
"""钉钉 CC 打卡日报推送（泰文版）

用法：
  uv run python scripts/dingtalk_daily.py          # 发送日报
  uv run python scripts/dingtalk_daily.py --test    # 发送测试消息
  uv run python scripts/dingtalk_daily.py --dry-run # 只打印不发送

数据源：localhost:8100/api/checkin/ranking（仅取 CC 数据）
目标：钉钉群 Referral Must Win · 加签模式
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

# ── 配置 ──────────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CRED_PATH = PROJECT_ROOT / "key" / "dingtalk.json"
API_BASE = "http://localhost:8100"

# 阈值（与前端 useCheckinThresholds 默认值对齐）
GOOD_RATE = 0.6
WARN_RATE = 0.4


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


# ── 泰文 Markdown 格式化 ─────────────────────────────────────────────────────


def rate_icon(rate: float) -> str:
    if rate >= GOOD_RATE:
        return "🟢"
    if rate >= WARN_RATE:
        return "🟡"
    return "🔴"


def fmt_pct(rate: float) -> str:
    return f"{rate * 100:.1f}%"


def build_markdown(data: dict) -> str:
    """构建泰文 CC 打卡日报"""
    today = datetime.now().strftime("%d/%m/%Y")
    now_time = datetime.now().strftime("%H:%M")

    by_role = data.get("by_role", {})
    cc = by_role.get("CC")

    if not cc or cc.get("total_students", 0) == 0:
        return (
            f"## 📋 รายงาน Check-in ประจำวัน\n\n"
            f"📅 {today}\n\n"
            f"ไม่มีข้อมูล Check-in สำหรับวันนี้"
        )

    total = cc["total_students"]
    checked = cc["checked_in"]
    rate = cc["checkin_rate"]
    groups = cc.get("by_group", [])
    persons = cc.get("by_person", [])

    icon = rate_icon(rate)
    lines: list[str] = []

    # ── 标题区 ──
    lines.append(f"## 📋 CC Check-in Report")
    lines.append(f"")
    lines.append(f"📅 **{today}**　⏰ {now_time}")
    lines.append(f"")

    # ── 总览卡片 ──
    lines.append(f"---")
    lines.append(f"")
    lines.append(f"### {icon} ภาพรวม CC　**{fmt_pct(rate)}**")
    lines.append(f"")
    lines.append(f"- 👥 นักเรียนทั้งหมด: **{total:,}** คน")
    lines.append(f"- ✅ Check-in แล้ว: **{checked:,}** คน")
    lines.append(f"- 📊 อัตรา Check-in: **{fmt_pct(rate)}**")
    lines.append(f"")

    # ── 团队排行 ──
    if groups:
        lines.append(f"---")
        lines.append(f"")
        lines.append(f"### 🏆 อันดับทีม")
        lines.append(f"")
        lines.append(f"| อันดับ | ทีม | นร. | เช็คอิน | อัตรา |")
        lines.append(f"|:---:|------|:---:|:---:|------:|")

        for g in groups:
            rank = g.get("rank", 0)
            name = g.get("group", "").replace("TH-", "").replace("Team", "")
            students = g.get("students", 0)
            ck = g.get("checked_in", 0)
            gr = g.get("rate", 0)
            gi = rate_icon(gr)

            # 排名奖牌
            medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(rank, str(rank))

            lines.append(
                f"| {medal} | {name} | {students} | {ck} | {gi} {fmt_pct(gr)} |"
            )

        lines.append(f"")

    # ── Top 10 个人 ──
    if persons:
        top_n = persons[:10]
        lines.append(f"---")
        lines.append(f"")
        lines.append(f"### 🌟 Top 10 พนักงาน")
        lines.append(f"")
        lines.append(f"| อันดับ | ชื่อ | ทีม | นร. | อัตรา |")
        lines.append(f"|:---:|------|------|:---:|------:|")

        for p in top_n:
            rank = p.get("rank", 0)
            name = p.get("name", "")
            team = p.get("group", "").replace("TH-", "").replace("Team", "")
            students = p.get("students", 0)
            pr = p.get("rate", 0)
            pi = rate_icon(pr)

            medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(rank, str(rank))

            lines.append(
                f"| {medal} | {name} | {team} | {students} | {pi} {fmt_pct(pr)} |"
            )

        lines.append(f"")

    # ── 落后预警 ──
    behind = [
        g.get("group", "").replace("TH-", "").replace("Team", "")
        for g in groups
        if g.get("rate", 0) < WARN_RATE
    ]
    if behind:
        lines.append(f"---")
        lines.append(f"")
        lines.append(
            f"### ⚠️ ทีมที่ต้องปรับปรุง (<{int(WARN_RATE * 100)}%)"
        )
        lines.append(f"")
        for t in behind:
            lines.append(f"- 🔴 **{t}**")
        lines.append(f"")

    # ── 图例 ──
    lines.append(f"---")
    lines.append(f"")
    lines.append(
        f"🟢 ≥{int(GOOD_RATE * 100)}% ผ่านเกณฑ์　"
        f"🟡 {int(WARN_RATE * 100)}-{int(GOOD_RATE * 100)}% ใกล้เกณฑ์　"
        f"🔴 <{int(WARN_RATE * 100)}% ต่ำกว่าเกณฑ์"
    )
    lines.append(f"")
    lines.append(f"> ข้อมูล T-1 · ref-ops-engine")

    return "\n".join(lines)


# ── 发送 ──────────────────────────────────────────────────────────────────────


def send_dingtalk(title: str, markdown_text: str, cred: dict) -> dict:
    url = sign_url(cred["webhook"], cred["secret"])
    payload = json.dumps(
        {
            "msgtype": "markdown",
            "markdown": {"title": title, "text": markdown_text},
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ── 入口 ──────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="钉钉 CC 打卡日报（泰文）")
    parser.add_argument("--test", action="store_true", help="发送测试消息")
    parser.add_argument("--dry-run", action="store_true", help="只打印不发送")
    args = parser.parse_args()

    cred = load_credentials()

    if args.test:
        md = (
            f"## 🔔 ทดสอบระบบ\n\n"
            f"ระบบรายงาน Check-in ประจำวันทำงานปกติ ✅\n\n"
            f"> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )
        if args.dry_run:
            print(md)
            return
        result = send_dingtalk("ทดสอบระบบ", md, cred)
        print(f"结果: {json.dumps(result, ensure_ascii=False)}")
        return

    try:
        data = fetch_ranking()
    except Exception as e:
        print(f"API 请求失败: {e}")
        return

    md = build_markdown(data)

    if args.dry_run:
        print(md)
        return

    today = datetime.now().strftime("%d/%m")
    result = send_dingtalk(f"CC Check-in {today}", md, cred)
    errcode = result.get("errcode", -1)
    if errcode == 0:
        print("✅ ส่งสำเร็จ")
    else:
        print(f"❌ ส่งไม่สำเร็จ: {json.dumps(result, ensure_ascii=False)}")


if __name__ == "__main__":
    main()

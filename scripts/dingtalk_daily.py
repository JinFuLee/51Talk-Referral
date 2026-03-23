#!/usr/bin/env python3
"""钉钉打卡日报推送脚本

用法：
  uv run python scripts/dingtalk_daily.py          # 发送日报
  uv run python scripts/dingtalk_daily.py --test    # 发送测试消息
  uv run python scripts/dingtalk_daily.py --dry-run # 只打印不发送

数据源：localhost:8100/api/checkin/ranking
目标：钉钉群机器人 Webhook（加签模式）
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


def load_credentials() -> dict:
    with open(CRED_PATH) as f:
        return json.load(f)


def sign_url(webhook: str, secret: str) -> str:
    """钉钉加签：timestamp + HMAC-SHA256 + Base64"""
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
    """从后端 API 获取打卡排行数据"""
    url = f"{API_BASE}/api/checkin/ranking"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ── Markdown 格式化 ──────────────────────────────────────────────────────────


def rate_icon(rate: float) -> str:
    if rate >= 0.6:
        return "✅"
    if rate >= 0.4:
        return "⚠️"
    return "❌"


def fmt_pct(rate: float) -> str:
    return f"{rate * 100:.1f}%"


def build_markdown(data: dict) -> str:
    """构建钉钉 Markdown 消息体"""
    today = datetime.now().strftime("%Y-%m-%d")
    lines = [f"## 📊 打卡日报 {today}\n"]

    by_role = data.get("by_role", {})
    behind_teams: list[str] = []

    for role in ["CC", "SS", "LP", "运营"]:
        if role not in by_role:
            continue
        r = by_role[role]
        total = r.get("total_students", 0)
        checked = r.get("checked_in", 0)
        rate = r.get("checkin_rate", 0)

        if total == 0:
            continue

        icon = rate_icon(rate)
        lines.append(
            f"### {icon} {role}　{checked}/{total} = **{fmt_pct(rate)}**\n"
        )

        # 小组排行表
        groups = r.get("by_group", [])
        if groups:
            lines.append("| # | 团队 | 学员 | 打卡 | 打卡率 |")
            lines.append("|---|------|------|------|--------|")
            for g in groups:
                rank = g.get("rank", "")
                name = (
                    g.get("group", "")
                    .replace("TH-", "")
                    .replace("Team", "")
                )
                students = g.get("students", 0)
                ck = g.get("checked_in", 0)
                gr = g.get("rate", 0)
                flag = rate_icon(gr)
                lines.append(
                    f"| {rank} | {name} | {students} | {ck} | {flag} {fmt_pct(gr)} |"
                )
                if gr < 0.4:
                    behind_teams.append(name)
            lines.append("")

    # 落后预警
    if behind_teams:
        lines.append(
            f"---\n\n⚠️ **落后团队**（<40%）：{'、'.join(behind_teams)}\n"
        )

    lines.append(f"> 数据来源：ref-ops-engine T-1 · 生成时间 {datetime.now().strftime('%H:%M')}")

    return "\n".join(lines)


# ── 发送 ──────────────────────────────────────────────────────────────────────


def send_dingtalk(title: str, markdown_text: str, cred: dict) -> dict:
    """发送钉钉 Markdown 消息"""
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
    parser = argparse.ArgumentParser(description="钉钉打卡日报推送")
    parser.add_argument("--test", action="store_true", help="发送测试消息")
    parser.add_argument("--dry-run", action="store_true", help="只打印不发送")
    args = parser.parse_args()

    cred = load_credentials()

    if args.test:
        # 测试消息
        md = f"## 🔔 测试消息\n\n打卡日报机器人连通性测试 ✅\n\n> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        if args.dry_run:
            print(md)
            return
        result = send_dingtalk("测试消息", md, cred)
        print(f"发送结果: {json.dumps(result, ensure_ascii=False)}")
        return

    # 正式日报
    try:
        data = fetch_ranking()
    except Exception as e:
        print(f"API 请求失败（后端是否运行？）: {e}")
        return

    md = build_markdown(data)

    if args.dry_run:
        print(md)
        return

    today = datetime.now().strftime("%m-%d")
    result = send_dingtalk(f"打卡日报 {today}", md, cred)
    errcode = result.get("errcode", -1)
    if errcode == 0:
        print(f"✅ 发送成功")
    else:
        print(f"❌ 发送失败: {json.dumps(result, ensure_ascii=False)}")


if __name__ == "__main__":
    main()

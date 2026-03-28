#!/usr/bin/env python3
"""转介绍日报钉钉推送脚本

调用 GET /api/report/summary 获取核心摘要，格式化为钉钉 Markdown 后推送。

用法：
  uv run python scripts/dingtalk_report.py --dry-run          # 只打印消息不发送
  uv run python scripts/dingtalk_report.py --test             # 连通性测试
  uv run python scripts/dingtalk_report.py --channel test     # 指定通道（默认 test）
  uv run python scripts/dingtalk_report.py --channel cc_all --confirm  # 发正式群
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CHANNELS_PATH = PROJECT_ROOT / "key" / "dingtalk-channels.json"
API_BASE = "http://localhost:8100"


# ── 凭证加载 ──────────────────────────────────────────────────────────────────

def _load_channels() -> dict:
    if not CHANNELS_PATH.exists():
        print(f"[错误] 找不到凭证文件：{CHANNELS_PATH}")
        sys.exit(1)
    with open(CHANNELS_PATH, encoding="utf-8") as f:
        return json.load(f)


def _get_channel(channels_data: dict, channel_id: str) -> dict:
    channels = channels_data.get("channels", {})
    ch = channels.get(channel_id)
    if not ch:
        available = list(channels.keys())
        print(f"[错误] 通道 {channel_id!r} 不存在，可用通道：{available}")
        sys.exit(1)
    return ch


# ── 数据获取 ──────────────────────────────────────────────────────────────────

def _fetch_summary() -> dict:
    """调用 /api/report/summary 获取核心摘要数据"""
    url = f"{API_BASE}/api/report/summary"
    last_exc: Exception | None = None
    for attempt in range(3):
        if attempt > 0:
            time.sleep(attempt * 2)
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            last_exc = exc
            print(f"fetch_summary 第 {attempt + 1} 次尝试失败: {exc}")
    raise RuntimeError("fetch_summary 重试 3 次仍失败") from last_exc


# ── 消息格式化 ────────────────────────────────────────────────────────────────

def _pct(value: float | None) -> str:
    """格式化百分比，None 返回 —"""
    if value is None:
        return "—"
    return f"{value * 100:.1f}%"


def _fmt_num(value: float | None, decimals: int = 0) -> str:
    """格式化数值，None 返回 —"""
    if value is None:
        return "—"
    if decimals == 0:
        return f"{int(round(value)):,}"
    return f"{value:,.{decimals}f}"


def _progress_bar(pct: float | None, width: int = 10) -> str:
    """生成简单文字进度条"""
    if pct is None:
        return "——————————"
    filled = min(width, int(round(pct * width)))
    return "█" * filled + "░" * (width - filled)


def _status_icon(pct: float | None) -> str:
    """根据进度百分比返回状态 emoji"""
    if pct is None:
        return "⬜"
    if pct >= 1.0:
        return "✅"
    if pct >= 0.8:
        return "🟡"
    return "🔴"


def _comp_arrow(comp: dict | None) -> str:
    """从环比 dict 返回方向箭头 + 变化量"""
    if not comp:
        return ""
    delta_pct = comp.get("delta_pct")
    if delta_pct is None:
        return ""
    sign = "+" if delta_pct >= 0 else ""
    icon = "↑" if delta_pct > 0 else ("↓" if delta_pct < 0 else "→")
    return f"{icon}{sign}{delta_pct * 100:.1f}%"


def _format_markdown(summary: dict) -> tuple[str, str]:
    """将 summary dict 格式化为 (title, markdown_body)"""
    ref_date = summary.get("date", datetime.now().strftime("%Y-%m-%d"))
    bm_pct = summary.get("bm_pct")
    reg_progress = summary.get("reg_progress")
    pay_progress = summary.get("payment_progress")
    rev_progress = summary.get("revenue_progress")
    rev_usd = summary.get("revenue_usd")
    rev_target = summary.get("revenue_target")
    bottleneck_text = summary.get("top_bottleneck_text", "暂无数据")
    day_comp = summary.get("day_comparison") or {}

    title = f"📊 转介绍日报 | {ref_date} (BM {_pct(bm_pct)})"

    lines: list[str] = [
        f"## 📊 转介绍日报 | {ref_date}",
        f"> 工作日进度 BM: **{_pct(bm_pct)}** {_progress_bar(bm_pct)}",
        "",
        "### 📈 月度进度",
        "| 指标 | 进度 | 状态 |",
        "| --- | --- | --- |",
        f"| 注册 | {_pct(reg_progress)} | {_status_icon(reg_progress)} |",
        f"| 付费 | {_pct(pay_progress)} | {_status_icon(pay_progress)} |",
        (
            f"| 业绩 | {_pct(rev_progress)}"
            f" ({_fmt_num(rev_usd)}/${_fmt_num(rev_target)})"
            f" | {_status_icon(rev_progress)} |"
        ),
        "",
        "### 📋 日维度环比（业绩）",
        f"> {_comp_arrow(day_comp) or '暂无对比数据'}",
        "",
        "### 🔍 瓶颈 TOP1",
        f"> {bottleneck_text}",
        "",
        "👉 [完整报告](http://localhost:3100/analytics)",
        "",
        f"> *{datetime.now().strftime('%H:%M')} 自动推送 · ref-ops-engine*",
    ]

    return title, "\n".join(lines)


# ── 钉钉发送 ──────────────────────────────────────────────────────────────────

def _sign_and_send(title: str, markdown_body: str, channel: dict) -> dict:
    """加签并发送 Markdown 消息到指定通道"""
    webhook: str = channel["webhook"]
    secret: str = channel["secret"]

    for attempt in range(3):
        timestamp = str(int(time.time() * 1000))
        sign_str = f"{timestamp}\n{secret}"
        hmac_code = hmac.new(
            secret.encode("utf-8"),
            sign_str.encode("utf-8"),
            digestmod=hashlib.sha256,
        ).digest()
        sign = urllib.parse.quote_plus(base64.b64encode(hmac_code).decode("utf-8"))
        url = f"{webhook}&timestamp={timestamp}&sign={sign}"

        payload = json.dumps(
            {
                "msgtype": "markdown",
                "markdown": {"title": title, "text": markdown_body},
            },
            ensure_ascii=False,
        ).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        errcode = result.get("errcode", 0)
        if errcode == 0:
            return result
        if errcode == -1 and attempt < 2:
            wait = 5 * (attempt + 1)
            print(f"    [重试 {attempt + 1}/2] 系统繁忙，等 {wait}s...")
            time.sleep(wait)
            continue
        return result

    return {"errcode": -1, "errmsg": "重试耗尽"}


def _send_test(channel: dict) -> None:
    """连通性测试消息"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    md = (
        f"## ทดสอบ / 日报推送连通测试\n\n"
        f"ระบบรายงานทำงานปกติ / 报告推送系统运行正常\n\n"
        f"- 通道: {channel.get('group_name', '?')}\n"
        f"- 脚本: dingtalk_report.py\n\n"
        f"> {now}"
    )
    result = _sign_and_send("连通测试", md, channel)
    status = "✅ 成功" if result.get("errcode") == 0 else f"❌ 失败: {result}"
    print(f"测试结果: {status}")


# ── 主入口 ────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="转介绍日报钉钉推送")
    parser.add_argument(
        "--channel",
        default="test",
        help="推送通道 ID（默认 test；正式群需加 --confirm）",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="确认发送正式群（不加此参数时仅允许 test 通道）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只打印消息内容，不实际发送",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="发送连通性测试消息",
    )
    args = parser.parse_args()

    channels_data = _load_channels()
    channel_id = args.channel
    channel = _get_channel(channels_data, channel_id)

    # 正式群防护：非 test 通道必须加 --confirm
    is_test_channel = channel_id == "test" or channel.get("is_test", False)
    if not is_test_channel and not args.confirm:
        print(
            f"[拦截] 通道 {channel_id!r} 是正式群，需加 --confirm 才可发送。\n"
            f"当前仅允许 --dry-run 或 --test 模式预览内容。\n"
            f"如确认发送，请追加 --confirm 参数。"
        )
        # 降级为 dry-run 展示内容
        args.dry_run = True

    group_name = channel.get("group_name", channel_id)
    print(f"\n通道: {channel_id} ({group_name})")

    # 连通性测试
    if args.test:
        print("发送连通性测试消息...")
        _send_test(channel)
        return

    # 获取摘要数据
    print("获取报告摘要...")
    try:
        summary = _fetch_summary()
    except RuntimeError as exc:
        print(f"[错误] 无法获取摘要：{exc}")
        print("请确认后端服务已启动：uvicorn backend.main:app --port 8100")
        sys.exit(1)

    # ── 数据验收门控 ────────────────────────────────────────────────────
    _pr = str(Path(__file__).resolve().parent.parent)
    if _pr not in sys.path:
        sys.path.insert(0, _pr)
    from backend.core.notification_validator import NotificationValidator
    _validator = NotificationValidator()
    _vr = _validator.validate_pre_send("report", summary)
    if not _vr.passed:
        print("\n[BLOCKED] 报告数据验收未通过:")
        for v in _vr.violations:
            print(f"  ✗ {v}")
        _validator.log_failure(_vr, f"dingtalk_report.main channel={args.channel}")
        if not args.dry_run:
            sys.exit(2)
        print("[DRY-RUN] 继续显示内容（不发送）")
    else:
        print("✓ 报告数据验收通过")

    title, markdown_body = _format_markdown(summary)

    if args.dry_run:
        print("\n===== [DRY RUN] 消息内容 =====")
        print(f"标题: {title}")
        print("---")
        print(markdown_body)
        print("===== [DRY RUN 结束] =====\n")
        return

    # 实际发送
    print(f"发送日报到 [{group_name}]...")
    result = _sign_and_send(title, markdown_body, channel)
    if result.get("errcode") == 0:
        print(f"✅ 发送成功 → {group_name}")
    else:
        print(f"❌ 发送失败: {json.dumps(result, ensure_ascii=False)}")
        sys.exit(1)


if __name__ == "__main__":
    main()

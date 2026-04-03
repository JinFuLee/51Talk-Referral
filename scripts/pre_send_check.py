#!/usr/bin/env python3
"""发送前数据验收脚本

两阶段验收：
  Stage 1: 数据源层（DataManager → D1/D2/D3 DataFrame）
  Stage 2: API 输出层（/api/overview, /api/report/summary）

用法：
  uv run python scripts/pre_send_check.py
  uv run python scripts/pre_send_check.py --api-base http://localhost:8100

退出码：
  0 = 全部通过
  1 = 有警告（数据可用但需注意）
  2 = 有违规（不可发送）

嵌入自动化链：
  uv run python scripts/pre_send_check.py && uv run python scripts/lark_bot.py followup --confirm
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# 确保项目根目录在 sys.path 中
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from backend.core.notification_validator import NotificationValidator

# ── ANSI 颜色 ────────────────────────────────────────────────────────────────
C_GREEN = "\033[32m"
C_RED = "\033[31m"
C_YELLOW = "\033[33m"
C_BOLD = "\033[1m"
C_RESET = "\033[0m"


def _ok(msg: str) -> None:
    print(f"  {C_GREEN}✓{C_RESET} {msg}")


def _fail(msg: str) -> None:
    print(f"  {C_RED}✗{C_RESET} {msg}")


def _warn(msg: str) -> None:
    print(f"  {C_YELLOW}⚠{C_RESET} {msg}")


def stage1_data_source() -> tuple[int, int]:
    """Stage 1: 验收 DataManager 数据源"""
    print(f"\n{C_BOLD}━━━ Stage 1: 数据源层验收 ━━━{C_RESET}")

    try:
        from backend.core.data_manager import DataManager

        data_dir = os.environ.get(
            "DATA_SOURCE_DIR",
            str(_PROJECT_ROOT / "input"),
        )
        dm = DataManager(data_dir=Path(data_dir))
        data = dm.load_all()
    except Exception as e:
        _fail(f"DataManager 加载失败: {e}")
        return 0, 1

    validator = NotificationValidator()
    result = validator.validate_pre_generate(data)

    for v in result.violations:
        _fail(v)
    for w in result.warnings:
        _warn(w)

    if result.passed:
        _ok("数据源层验收通过")
        regions = result.metadata.get("d1_regions", [])
        if regions:
            _ok(f"D1 区域: {regions}")

    if not result.passed:
        validator.log_failure(result, "pre_send_check.stage1")

    return len(result.warnings), len(result.violations)


def stage2_api_output(api_base: str) -> tuple[int, int]:
    """Stage 2: 验收 API 输出层"""
    print(f"\n{C_BOLD}━━━ Stage 2: API 输出层验收 ━━━{C_RESET}")

    import urllib.error
    import urllib.request

    validator = NotificationValidator()
    total_warnings = 0
    total_violations = 0

    endpoints = [
        ("overview", f"{api_base}/api/overview", "overview"),
        ("report", f"{api_base}/api/report/summary", "report"),
    ]

    for label, url, payload_type in endpoints:
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.URLError as e:
            _warn(f"[{label}] API 无法连接: {e}")
            total_warnings += 1
            continue
        except Exception as e:
            _warn(f"[{label}] API 错误: {e}")
            total_warnings += 1
            continue

        result = validator.validate_pre_send(payload_type, data)
        for v in result.violations:
            _fail(f"[{label}] {v}")
        for w in result.warnings:
            _warn(f"[{label}] {w}")

        if result.passed:
            # 提取关键数字给用户确认
            metrics = data.get("metrics", data)
            region = metrics.get("区域", "?")
            reg = metrics.get("转介绍注册数", "?")
            paid = metrics.get("转介绍付费数", "?")
            rev = metrics.get("总带新付费金额USD", "?")
            date_val = metrics.get("统计日期(day)", "?")
            _ok(
                f"[{label}] 通过 — 区域={region} 日期={date_val} "
                f"注册={reg} 付费={paid} 业绩={rev}"
            )
        else:
            validator.log_failure(result, f"pre_send_check.stage2.{label}")

        total_warnings += len(result.warnings)
        total_violations += len(result.violations)

    return total_warnings, total_violations


def main() -> None:
    parser = argparse.ArgumentParser(description="通知推送发送前数据验收")
    parser.add_argument(
        "--api-base",
        default="http://localhost:8100",
        help="后端 API 地址（默认 http://localhost:8100）",
    )
    args = parser.parse_args()

    print(f"{C_BOLD}通知推送数据验收{C_RESET}")
    print(f"API: {args.api_base}")

    w1, v1 = stage1_data_source()
    w2, v2 = stage2_api_output(args.api_base)

    total_w = w1 + w2
    total_v = v1 + v2

    print(f"\n{C_BOLD}━━━ 验收结果 ━━━{C_RESET}")
    if total_v > 0:
        _fail(f"{total_v} 项违规 — 不可发送")
        if total_w > 0:
            _warn(f"{total_w} 项警告")
        sys.exit(2)
    elif total_w > 0:
        _warn(f"{total_w} 项警告 — 数据可用但需注意")
        _ok("无违规项")
        sys.exit(1)
    else:
        _ok("全部通过 — 可以发送")
        sys.exit(0)


if __name__ == "__main__":
    main()

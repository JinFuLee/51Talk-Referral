"""数据口径守卫 — 统一告警路由与审计日志

写入 output/data-caliber-audit.jsonl
P0 级告警额外写入 output/error-log.jsonl（复用前端崩溃日志管道）
"""

from __future__ import annotations

import json
import logging
import os
from datetime import UTC, datetime
from pathlib import Path

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_AUDIT_LOG = _PROJECT_ROOT / "output" / "data-caliber-audit.jsonl"
_ERROR_LOG = _PROJECT_ROOT / "output" / "error-log.jsonl"


def emit_caliber_alert(source: str, alerts: list[dict]) -> None:
    """将校验告警写入审计 JSONL。

    - P0 → 同时写入 error-log.jsonl + 尝试钉钉 test 群推送
    - P1 → 仅写审计 JSONL
    - advisory → 仅写审计 JSONL
    """
    if not alerts:
        return

    _AUDIT_LOG.parent.mkdir(parents=True, exist_ok=True)
    session_id = os.getenv("CLAUDE_SESSION_ID", "manual")
    ts = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

    for alert in alerts:
        record = {
            "ts": ts,
            "session_id": session_id,
            "source": source,
            "level": alert.get("level", "advisory"),
            "type": alert.get("type", "unknown"),
            "detail": alert.get("detail", ""),
        }
        # 补充数值字段（层 2/3 告警可能有）
        for key in ("metric", "d1", "d2", "diff_pct", "coverage", "entropy", "hhi",
                    "excluded_revenue"):
            if key in alert:
                record[key] = alert[key]

        line = json.dumps(record, ensure_ascii=False)

        with _AUDIT_LOG.open("a", encoding="utf-8") as f:
            f.write(line + "\n")

        if alert.get("level") == "P0":
            # P0 同时追加到 error-log.jsonl
            _write_error_log(record)
            # 尝试钉钉推送（失败不阻断）
            _try_dingtalk(record, channel="test")

        logger.warning("口径守卫 [%s] %s: %s", source, record["type"], record["detail"])


def _write_error_log(record: dict) -> None:
    """将 P0 告警写入 error-log.jsonl（前端崩溃日志同格式）"""
    try:
        _ERROR_LOG.parent.mkdir(parents=True, exist_ok=True)
        entry = {
            "ts": record["ts"],
            "source_file": "caliber_guard",
            "error_type": record["type"],
            "message": record["detail"],
            "level": record["level"],
            "fingerprint": f"caliber-{record['type']}-{record['source']}",
        }
        with _ERROR_LOG.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as exc:
        logger.debug("写入 error-log.jsonl 失败（非致命）: %s", exc)


def _try_dingtalk(record: dict, channel: str = "test") -> None:
    """尝试发钉钉告警，失败不阻断主流程。

    注意：根据通知防错规则，钉钉推送默认走 test 群。
    正式群推送需 --confirm，此处仅 test 群无人工确认。
    """
    try:
        from scripts.dingtalk_engine import DingTalkEngine  # type: ignore[import]

        engine = DingTalkEngine()
        level = record.get("level", "P1")
        text = f"[{level} 口径告警] {record['type']}: {record['detail']}"
        engine.send_text_message(channel=channel, text=text)
    except Exception as exc:
        logger.debug("钉钉告警发送失败（非致命）: %s", exc)


def read_recent_alerts(limit: int = 50) -> list[dict]:
    """读取最近 N 条审计记录（按时间倒序）"""
    if not _AUDIT_LOG.exists():
        return []
    try:
        lines = _AUDIT_LOG.read_text(encoding="utf-8").splitlines()
        records = []
        for line in reversed(lines):
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
            if len(records) >= limit:
                break
        return records
    except Exception as exc:
        logger.warning("读取审计日志失败: %s", exc)
        return []


def derive_overall_status(alerts: list[dict]) -> str:
    """从告警列表推导整体健康状态"""
    levels = {r.get("level") for r in alerts}
    if "P0" in levels:
        return "critical"
    if "P1" in levels:
        return "warning"
    return "healthy"

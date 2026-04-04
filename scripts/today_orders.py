"""今日转介绍订单累加器

当日数据独立于 T-1 BI 数据，仅用于机器人实时反馈。
每天自动 reset（文件按日期命名，隔天自然失效）。

存储：output/today-orders-YYYYMMDD.json
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger("today-orders")

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"


def _today_path() -> Path:
    """当日订单文件路径"""
    return OUTPUT_DIR / f"today-orders-{datetime.now().strftime('%Y%m%d')}.json"


def _load() -> dict:
    """加载当日订单数据"""
    path = _today_path()
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"date": datetime.now().strftime("%Y-%m-%d"), "orders": [], "total_thb": 0}


def _save(data: dict) -> None:
    """保存当日订单数据"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    _today_path().write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def add_order(
    cc_name: str,
    team: str,
    student: str,
    product: str,
    amount_thb: float | None,
) -> dict:
    """新增一笔订单，返回更新后的统计摘要。

    Returns:
        {
            "today_count": 8,         # 今日总单数
            "today_total_thb": 245000, # 今日总金额（THB，仅含已确认金额）
            "cc_month_count": 3,       # 该 CC 本月单数（从 JSONL 统计）
            "cc_today_count": 2,       # 该 CC 今日单数
            "cc_today_thb": 65000,     # 该 CC 今日金额
        }
    """
    data = _load()
    order = {
        "ts": datetime.now().isoformat(),
        "cc_name": cc_name,
        "team": team,
        "student": student,
        "product": product,
        "amount_thb": amount_thb,
    }
    data["orders"].append(order)

    # 重算汇总
    confirmed = [o for o in data["orders"] if o.get("amount_thb")]
    data["total_thb"] = sum(o["amount_thb"] for o in confirmed)
    _save(data)

    # 统计
    today_count = len(data["orders"])
    cc_today = [o for o in data["orders"] if _cc_match(o.get("cc_name", ""), cc_name)]
    cc_today_confirmed = [o for o in cc_today if o.get("amount_thb")]

    return {
        "today_count": today_count,
        "today_total_thb": data["total_thb"],
        "today_confirmed_count": len(confirmed),
        "cc_today_count": len(cc_today),
        "cc_today_thb": sum(o["amount_thb"] for o in cc_today_confirmed),
    }


def get_today_summary() -> dict:
    """获取当日订单汇总（不新增）"""
    data = _load()
    confirmed = [o for o in data["orders"] if o.get("amount_thb")]
    return {
        "date": data.get("date", ""),
        "today_count": len(data["orders"]),
        "today_total_thb": sum(o["amount_thb"] for o in confirmed),
        "today_confirmed_count": len(confirmed),
        "orders": data["orders"],
    }


def _cc_match(a: str, b: str) -> bool:
    """CC 名字模糊匹配"""
    return a.lower().strip() == b.lower().strip()

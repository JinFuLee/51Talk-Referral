"""今日实时成交 API

管理 Bot 捕获的当日转介绍订单。
数据存储：output/today-orders-YYYYMMDD.json（每日自动 reset）。
与 T-1 BI 数据完全分离。
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
OUTPUT_DIR = PROJECT_ROOT / "output"
LOG_PATH = OUTPUT_DIR / "order-bot-log.jsonl"

router = APIRouter()


def _today_path() -> Path:
    return OUTPUT_DIR / f"today-orders-{datetime.now().strftime('%Y%m%d')}.json"


def _load_today() -> dict:
    path = _today_path()
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"date": datetime.now().strftime("%Y-%m-%d"), "orders": [], "total_thb": 0}


def _save_today(data: dict) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    _today_path().write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _load_exchange_rate() -> float:
    rate_path = PROJECT_ROOT / "config" / "exchange_rate.json"
    try:
        d = json.loads(rate_path.read_text())
        return float(d.get("usd_to_thb", 34))
    except Exception:
        return 34.0


# ── GET 今日订单汇总 ──────────────────────────────────────────────────────────


@router.get("/live-orders")
def get_live_orders() -> dict:
    """今日实时成交数据 — 全维度"""
    data = _load_today()
    orders = data.get("orders", [])

    # 按 CC 聚合
    cc_map: dict[str, dict] = {}
    for i, o in enumerate(orders):
        cc = o.get("cc_name", "Unknown")
        if cc not in cc_map:
            cc_map[cc] = {
                "cc_name": cc,
                "team": o.get("team", ""),
                "count": 0,
                "confirmed_count": 0,
                "total_thb": 0.0,
                "order_indices": [],
            }
        cc_map[cc]["count"] += 1
        cc_map[cc]["order_indices"].append(i)
        amt = o.get("amount_thb")
        if amt:
            cc_map[cc]["confirmed_count"] += 1
            cc_map[cc]["total_thb"] += amt

    # 排序：金额降序
    cc_list = sorted(cc_map.values(), key=lambda x: x["total_thb"], reverse=True)

    # 总计
    confirmed = [o for o in orders if o.get("amount_thb")]
    total_thb = sum(o["amount_thb"] for o in confirmed)
    total_count = len(orders)
    confirmed_count = len(confirmed)

    # T-1 数据（从后端 API 获取）
    t1_actual_thb = 0.0
    target_thb = 0.0
    bm_pct = 0.0
    try:
        import urllib.request
        req = urllib.request.Request(
            "http://localhost:8100/api/report/summary",
            headers={"Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            summary = json.loads(resp.read().decode("utf-8"))
            rate = _load_exchange_rate()
            t1_actual_thb = (summary.get("revenue_usd", 0) or 0) * rate
            target_thb = (summary.get("revenue_target", 0) or 0) * rate
            bm_pct = summary.get("bm_pct", 0) or 0
    except Exception:
        pass

    realtime_thb = t1_actual_thb + total_thb
    bm_target_thb = target_thb * bm_pct
    bm_gap_thb = realtime_thb - bm_target_thb
    month_gap_thb = realtime_thb - target_thb

    return {
        "date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
        "summary": {
            "total_orders": total_count,
            "confirmed_orders": confirmed_count,
            "unconfirmed_orders": total_count - confirmed_count,
            "total_thb": total_thb,
            "t1_actual_thb": t1_actual_thb,
            "realtime_thb": realtime_thb,
            "target_thb": target_thb,
            "bm_pct": bm_pct,
            "bm_gap_thb": bm_gap_thb,
            "month_gap_thb": month_gap_thb,
        },
        "by_cc": cc_list,
        "orders": [
            {
                "index": i,
                "ts": o.get("ts", ""),
                "cc_name": o.get("cc_name", ""),
                "team": o.get("team", ""),
                "student": o.get("student", ""),
                "product": o.get("product", ""),
                "amount_thb": o.get("amount_thb"),
            }
            for i, o in enumerate(orders)
        ],
    }


# ── 编辑订单金额 ──────────────────────────────────────────────────────────────


class AmountUpdate(BaseModel):
    amount_thb: float | None


@router.put("/live-orders/{order_index}/amount")
def update_order_amount(order_index: int, body: AmountUpdate) -> dict:
    """修改指定订单的金额"""
    data = _load_today()
    orders = data.get("orders", [])

    if order_index < 0 or order_index >= len(orders):
        raise HTTPException(status_code=404, detail=f"订单 #{order_index} 不存在")

    orders[order_index]["amount_thb"] = body.amount_thb
    # 重算汇总
    confirmed = [o for o in orders if o.get("amount_thb")]
    data["total_thb"] = sum(o["amount_thb"] for o in confirmed)
    _save_today(data)

    return {
        "ok": True,
        "index": order_index,
        "amount_thb": body.amount_thb,
        "new_total": data["total_thb"],
    }


# ── 删除订单 ──────────────────────────────────────────────────────────────────


@router.delete("/live-orders/{order_index}")
def delete_order(order_index: int) -> dict:
    """删除指定订单"""
    data = _load_today()
    orders = data.get("orders", [])

    if order_index < 0 or order_index >= len(orders):
        raise HTTPException(status_code=404, detail=f"订单 #{order_index} 不存在")

    removed = orders.pop(order_index)
    confirmed = [o for o in orders if o.get("amount_thb")]
    data["total_thb"] = sum(o["amount_thb"] for o in confirmed)
    _save_today(data)

    return {
        "ok": True,
        "deleted_index": order_index,
        "deleted_cc": removed.get("cc_name", ""),
        "remaining": len(orders),
        "new_total": data["total_thb"],
    }


# ── 一键清算（重置今日数据）────────────────────────────────────────────────────


@router.post("/live-orders/reset")
def reset_today() -> dict:
    """一键清算：归零今日所有订单"""
    path = _today_path()
    old_count = 0
    old_total = 0.0

    if path.exists():
        try:
            old = json.loads(path.read_text(encoding="utf-8"))
            old_count = len(old.get("orders", []))
            old_total = old.get("total_thb", 0)
        except Exception:
            pass
        path.unlink()

    return {
        "ok": True,
        "cleared_orders": old_count,
        "cleared_thb": old_total,
        "date": datetime.now().strftime("%Y-%m-%d"),
    }

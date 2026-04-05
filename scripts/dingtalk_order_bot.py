#!/usr/bin/env python3
"""钉钉成交订单识别机器人（Stream 模式）

销售在群里 @机器人 发成交消息 → 自动识别转介绍 → 回复业绩确认。
Stream 模式无需公网 IP，本地运行即可。

用法：
  uv run python scripts/dingtalk_order_bot.py                # 正常启动
  uv run python scripts/dingtalk_order_bot.py --test-parse    # 测试解析（不连钉钉）

凭证：key/dingtalk-bot.json（AppKey + AppSecret）
日志：output/order-bot-log.jsonl
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import sys
import urllib.request
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

import dingtalk_stream
from dingtalk_stream import AckMessage

# ── 路径 ──────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
CREDENTIALS_PATH = PROJECT_ROOT / "key" / "dingtalk-bot.json"
LOG_PATH = PROJECT_ROOT / "output" / "order-bot-log.jsonl"
EXCHANGE_RATE_PATH = PROJECT_ROOT / "config" / "exchange_rate.json"

logger = logging.getLogger("order-bot")

# ── 汇率 ──────────────────────────────────────────────────────────────────────
def _load_exchange_rate() -> float:
    """USD → THB 汇率，默认 34"""
    try:
        data = json.loads(EXCHANGE_RATE_PATH.read_text())
        return float(data.get("usd_to_thb", 34))
    except Exception:
        return 34.0


# ── 订单消息数据结构 ──────────────────────────────────────────────────────────
@dataclass
class ParsedOrder:
    """从群消息中解析出的订单信息"""

    is_order: bool = False           # 是否为成交消息
    is_referral: bool = False        # 是否转介绍
    lead_source: str = ""            # 线索来源原文（Refer / Market / ...）
    amount_usd: float | None = None  # 金额（美元）
    amount_thb: float | None = None  # 金额（泰铢）
    student_name: str = ""           # 学员名
    product: str = ""                # 产品/套餐
    cc_name: str = ""                # CC 销售名
    team_code: str = ""              # 团队代码（THCC / THCC-A / ...）
    team_number: str = ""            # Team 编号
    order_type: str = ""             # 新单 / 续费（如消息中有）
    raw_text: str = ""               # 原始消息文本
    parse_errors: list[str] | None = None  # 解析时的缺失字段


# ── 消息解析器 ────────────────────────────────────────────────────────────────
# 适配格式：
#   CAN DO IT , Congratulations!!!
#   [奖杯] ⭐️12-So light ⭐️[奖杯]
#   Source of leads : Refer @Felix @Q (Intern)
#   ...
#   Student Name : Winner
#   Amount : $1200
#   [双手合十][爱心]  THCC NIRUT TEAM 5 [爱心][双手合十]

# 成交消息关键词（任一命中 = 认定为成交消息）
_ORDER_KEYWORDS = [
    r"congratulations",
    r"can\s*do\s*it",
    r"成交",
    r"成单",
    r"closed",
    r"won",
]
_ORDER_PATTERN = re.compile(
    "|".join(_ORDER_KEYWORDS), re.IGNORECASE
)

# Source of leads（REF / ReF / Refer / Referral 全匹配）
_SOURCE_PATTERN = re.compile(
    r"source\s+of\s+leads?\s*[:\-：]\s*(.+)", re.IGNORECASE
)

# Student Name
_STUDENT_PATTERN = re.compile(
    r"student\s+name\s*[:\-：]\s*(.+)", re.IGNORECASE
)

# Amount（可选字段 — 真实成交消息大多不含金额）
_AMOUNT_PATTERN = re.compile(
    r"(?:amount|revenue|金额|业绩)\s*[:\-：]\s*"
    r"[\$]?\s*([\d,]+(?:\.\d{1,2})?)"
    r"(?:\s*(?:usd|美[元金]))?",
    re.IGNORECASE,
)
# 备用：消息中独立出现的 $金额
_DOLLAR_PATTERN = re.compile(
    r"\$\s*([\d,]+(?:\.\d{1,2})?)"
)

# 产品名：⭐️...⭐️ 优先匹配
_PRODUCT_PATTERN = re.compile(
    r"⭐️\s*(.+?)\s*⭐️"
)
# 通用 emoji 清理（用于从产品行剥离装饰符）
_EMOJI_STRIP = re.compile(
    r"[\[\]][^\[\]]*[\[\]]"  # [emoji名] 格式
    r"|[\U0001F300-\U0001FAFF]"  # Unicode emoji
    r"|[⭐️❤️🏆🎁💸🍀🎂💝🔥💰🎊🎉🥇🥈🥉✨🌟💖💗🌹🎯📌✅☑️👑🏅]"
    r"|[^\x00-\x7F\u0E00-\u0E7F]"  # 非 ASCII 非泰文
)

# THCC 团队信息（THCC NIRUT TEAM 5 / THCC KooKKai Team 1）
# CC 名支持混合大小写、含数字
_TEAM_PATTERN = re.compile(
    r"(TH(?:CC|SS|LP)(?:-[A-Za-z])?)\s+"  # 团队代码（含小写后缀）
    r"([A-Za-z][A-Za-z0-9]+)\s+"           # CC 名字（混合大小写）
    r"(?:TEAM|team|Team)\s*(\d+)",         # Team 编号
    re.IGNORECASE,
)

# 新单/续费
_ORDER_TYPE_PATTERN = re.compile(
    r"(新单|续费|new\s*order|renewal|renew)",
    re.IGNORECASE,
)


def parse_order_message(text: str) -> ParsedOrder:
    """从群消息文本中提取订单信息。

    设计原则：宽松匹配，尽可能多提取，缺失字段记录到 parse_errors。
    """
    order = ParsedOrder(raw_text=text)
    errors: list[str] = []

    # 1. 是否成交消息
    if not _ORDER_PATTERN.search(text):
        order.is_order = False
        return order
    order.is_order = True

    # 2. 线索来源（REF / ReF / Refer / Referral / 转介绍）
    m = _SOURCE_PATTERN.search(text)
    if m:
        source_raw = m.group(1).strip()
        # 清理 @ 后面的人名和 emoji
        source_clean = re.split(r"\s*@", source_raw)[0].strip()
        order.lead_source = source_clean
        order.is_referral = bool(
            re.search(r"ref|rf|转介绍", source_clean, re.IGNORECASE)
        )
    else:
        errors.append("Source of leads 未找到")

    # 3. 金额（可选 — 大部分真实成交消息不含金额）
    m = _AMOUNT_PATTERN.search(text)
    if m:
        order.amount_usd = float(m.group(1).replace(",", ""))
    else:
        m = _DOLLAR_PATTERN.search(text)
        if m:
            order.amount_usd = float(m.group(1).replace(",", ""))
        # 无金额不报错 — 真实消息通常不含金额

    if order.amount_usd is not None:
        rate = _load_exchange_rate()
        order.amount_thb = round(order.amount_usd * rate, 0)

    # 4. 学员名
    m = _STUDENT_PATTERN.search(text)
    if m:
        order.student_name = m.group(1).strip()
    else:
        errors.append("Student Name 未找到")

    # 5. 产品（⭐️...⭐️ 优先，备用：Congratulations 与 Source 之间的行）
    m = _PRODUCT_PATTERN.search(text)
    if m:
        order.product = m.group(1).strip()
    else:
        # 通用提取：取 Congratulations 和 Source of leads 之间的内容行
        lines = text.split("\n")
        congrats_idx = -1
        source_idx = len(lines)
        for li, line in enumerate(lines):
            if re.search(r"congratulations", line, re.IGNORECASE):
                congrats_idx = li
            if re.search(r"source\s+of\s+leads", line, re.IGNORECASE):
                source_idx = li
                break
        if congrats_idx >= 0:
            for li in range(congrats_idx + 1, source_idx):
                cleaned = _EMOJI_STRIP.sub("", lines[li]).strip()
                cleaned = re.sub(r"^[\s\-–—]+", "", cleaned).strip()
                if cleaned and len(cleaned) > 1:
                    order.product = cleaned
                    break

    # 6. 团队 + CC 名
    m = _TEAM_PATTERN.search(text)
    if m:
        order.team_code = m.group(1).upper()
        order.cc_name = m.group(2).strip()
        order.team_number = m.group(3)
    else:
        errors.append("团队/CC信息 未找到")

    # 7. 新单/续费
    m = _ORDER_TYPE_PATTERN.search(text)
    if m:
        raw = m.group(1).lower()
        if raw in ("新单", "new order"):
            order.order_type = "新单"
        else:
            order.order_type = "续费"

    order.parse_errors = errors if errors else None
    return order


# ── 回复格式化 ────────────────────────────────────────────────────────────────

def _fetch_revenue_status() -> dict | None:
    """从后端获取当前业绩进度（T-1 数据）"""
    try:
        req = urllib.request.Request(
            "http://localhost:8100/api/report/summary",
            headers={"Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def _fetch_cc_ranking(cc_name: str) -> dict | None:
    """从后端获取 CC 个人业绩数据（T-1 数据）

    Returns: {
        "rank", "total", "revenue_thb", "team", "team_rank", "team_total",
        "target_thb", "bm_expected_thb"  ← 个人 BM / Target
    }
    """
    try:
        req = urllib.request.Request(
            "http://localhost:8100/api/cc-performance?detail=true",
            headers={"Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None

    rate = _load_exchange_rate()

    # Flatten all CC records
    all_ccs: list[dict] = []
    team_revenues: dict[str, float] = {}
    for t in data.get("teams", []):
        team_name = t.get("team", "")
        team_rev = (t.get("revenue", {}) or {}).get("actual", 0) or 0
        team_revenues[team_name] = team_rev
        for r in t.get("records", []):
            rev_obj = r.get("revenue", {}) or {}
            rev = rev_obj.get("actual", 0) or 0
            all_ccs.append({
                "cc": r.get("cc_name", ""),
                "team": r.get("team", ""),
                "revenue": rev,
                "target": rev_obj.get("target", 0) or 0,
                "bm_expected": rev_obj.get("bm_expected", 0) or 0,
            })

    if not all_ccs:
        return None

    # Sort by revenue descending → find rank
    all_ccs.sort(key=lambda x: x["revenue"], reverse=True)
    cc_rank = 0
    cc_rev = 0.0
    cc_target = 0.0
    cc_bm = 0.0
    cc_team = ""
    cc_lower = cc_name.lower().replace("thcc-", "").replace("thcc", "")
    for i, cc in enumerate(all_ccs, 1):
        name_clean = cc["cc"].lower().replace("thcc-", "").replace("thcc", "")
        if name_clean == cc_lower or cc_lower in name_clean:
            cc_rank = i
            cc_rev = cc["revenue"]
            cc_target = cc["target"]
            cc_bm = cc["bm_expected"]
            cc_team = cc["team"]
            break

    if cc_rank == 0:
        return None

    # Team ranking
    sorted_teams = sorted(
        team_revenues.items(), key=lambda x: x[1], reverse=True
    )
    team_rank = 0
    for i, (tn, _) in enumerate(sorted_teams, 1):
        if tn == cc_team:
            team_rank = i
            break

    return {
        "rank": cc_rank,
        "total": len(all_ccs),
        "revenue_thb": cc_rev * rate,
        "target_thb": cc_target * rate,
        "bm_expected_thb": cc_bm * rate,
        "team": cc_team,
        "team_rank": team_rank,
        "team_total": len(sorted_teams),
    }


def _count_orders(cc_name: str) -> tuple[int, int, int, float]:
    """从日志统计：(今日转介绍总单数, 该CC本月总单数, 全月转介绍总单数, 该CC今日累计THB)"""
    today_str = datetime.now().strftime("%Y-%m-%d")
    month_str = datetime.now().strftime("%Y-%m")
    today_total = 0
    cc_month_total = 0
    month_total = 0
    cc_today_thb = 0.0

    if not LOG_PATH.exists():
        return 0, 0, 0, 0.0

    try:
        with open(LOG_PATH, encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    entry = json.loads(line)
                    if not entry.get("is_referral"):
                        continue
                    ts = entry.get("ts", "")
                    entry_cc = entry.get("cc_name", "")
                    is_same_cc = entry_cc.lower() == cc_name.lower()
                    if ts[:10] == today_str:
                        today_total += 1
                        if is_same_cc:
                            cc_today_thb += entry.get("amount_thb", 0) or 0
                    if ts[:7] == month_str:
                        month_total += 1
                        if is_same_cc:
                            cc_month_total += 1
                except (json.JSONDecodeError, KeyError):
                    continue
    except OSError:
        pass

    return today_total, cc_month_total, month_total, cc_today_thb


def format_reply(
    order: ParsedOrder,
    today_stats: dict | None = None,
) -> str:
    """生成泰文回复（钉钉 Markdown 格式）

    Args:
        today_stats: 来自 today_orders.add_order() 的今日累计数据
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    if not order.is_order:
        return ""

    rate = _load_exchange_rate()

    # 单数统计（优先用累加器，fallback 用 JSONL）
    if today_stats:
        today_n = today_stats["today_count"]
        cc_today_n = today_stats["cc_today_count"]
        today_total_thb = today_stats["today_total_thb"]
    else:
        today_n_raw, _, _, _ = _count_orders(order.cc_name)
        today_n = today_n_raw
        cc_today_n = 0
        today_total_thb = 0.0

    _, cc_month_n, month_total_n, cc_today_thb = _count_orders(order.cc_name)

    lines: list[str] = []

    # ── 金额预处理 ──
    if order.amount_usd is not None:
        thb = order.amount_thb or (order.amount_usd * rate)
    elif order.amount_thb is not None:
        thb = order.amount_thb
    else:
        thb = None

    # ── 标题：Bill Referral NNN in YYYYMM ──
    ym = datetime.now().strftime("%Y%m")
    bill_num = f"{month_total_n:03d}"
    lines.append(f"### ✔ Bill Referral {bill_num} in {ym}")
    lines.append("")
    lines.append("---")
    lines.append("")

    # ── 随机话术库 ──
    import random  # noqa: PLC0415

    _PRAISE_BM = [
        "เริ่ดเลย! นำหน้า BM แล้ว รักษาจังหวะไว้นะ",
        "ฉ่ำมาก! BM ผ่านฉลุย ลุยต่อเลย",
        "ปังสุด! เกิน BM แล้ว ไม่หยุดแน่นอน",
        "แรงส์! นำ BM อยู่ ไปต่อได้เลย",
        "เยี่ยมไปเลย! BM ไม่ใช่ปัญหา ไปต่อ!",
        "ดีงาม! ทำได้เกิน BM เก่งมาก",
    ]
    _ENCOURAGE_BM = [
        "เหลือนิดเดียว สู้ต่อไปนะ!",
        "ยังไหว ค่อยๆ ไล่ ทีละบิล!",
        "อีกแค่นิดเดียว พยายามต่อไป!",
        "ไม่ไกลแล้ว ลุยต่อเลย!",
        "BM ไม่ได้ไกล ปิดอีกนิดก็ถึง!",
        "ไฟยังลุก! อีกนิดเดียวถึง BM",
    ]
    _PRAISE_TARGET = [
        "ทะลุเป้าแล้ว! ปังสุดๆ!",
        "ฉ่ำ! เกินเป้าเดือนแล้ว เก่งมาก!",
        "เป้าเดือนพังทลาย! แรงส์จริงๆ!",
        "เหนือเป้าไปแล้ว ไม่มีใครหยุดได้!",
    ]
    _ENCOURAGE_TARGET = [
        "ทีละก้าว ค่อยๆ ไป ไม่หยุด!",
        "ยังมีเวลา ปิดทีละบิล ไปถึงแน่!",
        "สู้ต่อไปนะ ทุกบิลนับ!",
        "อีกหลายบิลก็ถึง สู้ๆ!",
        "ยังไม่จบ ลุยต่อได้เลย!",
        "เป้าอยู่ไม่ไกล ทำต่อไปนะ!",
    ]

    # ── 订单详情 ──
    cc_display = order.cc_name or "—"
    lines.append(f"CC: **{cc_display}**")
    lines.append("")

    amt_str = f"฿{thb:,.0f}" if thb else "รอยืนยัน"
    lines.append(f"ยอด: **{amt_str}**")
    lines.append("")

    if cc_month_n > 0:
        lines.append(f"บิลที่ **{cc_month_n}** ของเดือน")
        lines.append("")

    # ── CC 个人业绩（BM / Target 是个人的）──
    cc_info = _fetch_cc_ranking(order.cc_name) if order.cc_name else None
    if cc_info:
        cc_rev_thb = cc_info["revenue_thb"]
        # 个人累计 = T-1 个人业绩 + 该 CC 今日全部订单 THB（含当笔）
        cc_realtime = cc_rev_thb + cc_today_thb

        lines.append(f"ยอดรวม: **฿{cc_realtime:,.0f}**")
        lines.append("")
        lines.append("---")
        lines.append("")

        # vs BM（个人）
        bm_thb = cc_info["bm_expected_thb"]
        bm_gap = cc_realtime - bm_thb
        if bm_gap >= 0:
            lines.append(f"vs BM: เกิน **฿{bm_gap:,.0f}** \U0001f4aa")
            lines.append("")
            lines.append(random.choice(_PRAISE_BM))
        else:
            lines.append(f"vs BM: ขาด **฿{abs(bm_gap):,.0f}**")
            lines.append("")
            lines.append(random.choice(_ENCOURAGE_BM))
        lines.append("")
        lines.append("---")
        lines.append("")

        # vs Target（个人）
        tgt_thb = cc_info["target_thb"]
        tgt_gap = cc_realtime - tgt_thb
        if tgt_gap >= 0:
            lines.append(f"vs Target: เกิน **฿{tgt_gap:,.0f}** \U0001f3c6")
            lines.append("")
            lines.append(random.choice(_PRAISE_TARGET))
        else:
            pct_done = (cc_realtime / tgt_thb * 100) if tgt_thb else 0
            lines.append(f"vs Target: ขาด **฿{abs(tgt_gap):,.0f}**")
            lines.append("")
            lines.append(
                f"ทำได้แล้ว {pct_done:.0f}% "
                + random.choice(_ENCOURAGE_TARGET)
            )
        lines.append("")

    lines.append("---")

    return "\n".join(lines)

    # ── 以下为旧格式，已被精简版替代（保留注释以备回滚参考）──
    # ① 今日转介绍第 N 单
    lines.append(
        f"📊  Referral วันนี้ ออเดอร์ที่ **#{today_n}**"
    )
    lines.append("")

    # ② CC 本月第 N 单
    if cc_month_n > 0 and order.cc_name:
        lines.append(
            f"🔢  {order.cc_name} ออเดอร์ Referral เดือนนี้ที่ **#{cc_month_n}**"
        )
        lines.append("")

    # 连击
    if today_n >= 3:
        lines.append(f"🔥🔥🔥  **{today_n} ออเดอร์ต่อเนื่อง!**")
        lines.append("")
    elif today_n >= 2:
        lines.append(f"🔥  **ต่อเนื่อง {today_n} ออเดอร์!**")
        lines.append("")

    # 排名
    if ranking:
        r = ranking
        medal = "🥇" if r["rank"] == 1 else "🥈" if r["rank"] == 2 else "🥉" if r["rank"] == 3 else "🏅"
        lines.append(
            f"{medal}  อันดับที่ **#{r['rank']}** จาก {r['total']} คน"
        )
        lines.append(
            f"ยอดเดือนนี้ ฿{r['revenue_thb']:,.0f}"
        )
        lines.append("")
        if r["team_rank"] > 0:
            lines.append(
                f"👥  {r['team']} อันดับทีม **#{r['team_rank']}/{r['team_total']}**"
            )
            lines.append("")

    lines.append("---")
    lines.append("")

    # CC 名 + 小组
    if order.cc_name:
        team_str = order.team_code or ""
        if order.team_number:
            team_str += f" Team {order.team_number}"
        lines.append(f"👤  **{order.cc_name}**  |  {team_str}")
        lines.append("")

    # 学员
    if order.student_name:
        lines.append(f"🎓  นักเรียน: {order.student_name}")
        lines.append("")

    # 产品
    if order.product:
        lines.append(f"📦  แพ็กเกจ: {order.product}")
        lines.append("")

    # ③ 金额（必须显示，没有就写 รอยืนยัน）
    if order.amount_usd is not None:
        thb = order.amount_thb or (order.amount_usd * rate)
        lines.append(f"💰  ยอดเงิน: **฿{thb:,.0f}**")
    elif order.amount_thb is not None:
        lines.append(f"💰  ยอดเงิน: **฿{order.amount_thb:,.0f}**")
    else:
        lines.append("💰  ยอดเงิน: รอยืนยันจากระบบ")
    lines.append("")

    # 时间
    lines.append(f"📅  {now}")
    lines.append("")

    # ④ BM + 月目标（T-1 actual + 今日累计 = 实时估算）
    summary = _fetch_revenue_status()
    if summary:
        t1_actual_usd = summary.get("revenue_usd", 0) or 0
        target_usd = summary.get("revenue_target", 0) or 0
        bm_pct = summary.get("bm_pct", 0) or 0

        t1_actual_thb = t1_actual_usd * rate
        target_thb = target_usd * rate

        # 实时合计 = T-1 + 今日已确认金额
        realtime_thb = t1_actual_thb + today_total_thb
        realtime_progress = realtime_thb / target_thb if target_thb else 0

        lines.append("---")
        lines.append("")

        # 数据说明
        if today_total_thb > 0:
            lines.append(
                f"💡  T-1 ฿{t1_actual_thb:,.0f}"
                f" + วันนี้ ฿{today_total_thb:,.0f}"
                f" = **฿{realtime_thb:,.0f}**"
            )
            lines.append("")

        # BM 差距
        bm_target_thb = target_thb * bm_pct
        bm_gap_thb = realtime_thb - bm_target_thb
        if bm_gap_thb >= 0:
            lines.append(f"📈  **BM วันนี้**")
            lines.append("")
            lines.append(f"เกินเป้า **฿{bm_gap_thb:,.0f}**")
        else:
            lines.append(f"📉  **BM วันนี้**")
            lines.append("")
            lines.append(f"ต่ำกว่าเป้า **฿{abs(bm_gap_thb):,.0f}**")
        lines.append("")
        lines.append(
            f"ความคืบหน้า {realtime_progress:.1%}  vs  BM {bm_pct:.1%}"
        )
        lines.append("")
        lines.append("")

        # 月目标差距
        month_gap_thb = realtime_thb - target_thb
        if month_gap_thb >= 0:
            lines.append(f"🎯  **เป้าเดือน**")
            lines.append("")
            lines.append(f"เกินเป้าแล้ว **฿{month_gap_thb:,.0f}**")
        else:
            lines.append(f"🎯  **เป้าเดือน**")
            lines.append("")
            lines.append(f"เหลืออีก **฿{abs(month_gap_thb):,.0f}**")
        lines.append("")
        lines.append(
            f"฿{realtime_thb:,.0f} / ฿{target_thb:,.0f}"
        )
        lines.append("")

    return "\n".join(lines)


# ── Webhook 回复（支持 richText 场景）────────────────────────────────────────

def _reply_via_webhook(webhook: str, text: str) -> None:
    """通过 sessionWebhook 直接回复（richText 消息无法用 reply_text）"""
    payload = json.dumps(
        {"msgtype": "markdown", "markdown": {"title": "Referral ✓", "text": text}},
        ensure_ascii=False,
    ).encode("utf-8")
    try:
        req = urllib.request.Request(
            webhook,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            if result.get("errcode") != 0:
                logger.warning("webhook 回复失败: %s", result)
    except Exception as e:
        logger.error("webhook 回复异常: %s", e)


# ── 日志持久化 ────────────────────────────────────────────────────────────────

def _log_order(order: ParsedOrder, sender: str = "", conversation_id: str = "") -> None:
    """将解析结果写入 JSONL 日志"""
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "ts": datetime.now().isoformat(),
        "sender": sender,
        "conversation_id": conversation_id,
        **{k: v for k, v in asdict(order).items() if k != "raw_text"},
        "raw_text_preview": order.raw_text[:200],
    }
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


# ── 钉钉 Stream Handler ──────────────────────────────────────────────────────

class OrderBotHandler(dingtalk_stream.ChatbotHandler):
    """接收 @机器人 消息 → 解析订单 → 回复确认"""

    async def process(
        self, callback: dingtalk_stream.CallbackMessage
    ) -> tuple[str, str]:
        try:
            # 详细日志：记录原始回调数据
            raw_data = callback.data
            msg_type = raw_data.get("msgtype", "unknown") if isinstance(raw_data, dict) else "?"
            logger.info("收到回调: msgtype=%s, keys=%s", msg_type, list(raw_data.keys()) if isinstance(raw_data, dict) else "N/A")

            # 提取文本 + 图片（支持 text 和 richText 两种格式）
            text: str = ""
            image_bytes_list: list[bytes] = []

            if msg_type == "text":
                incoming = dingtalk_stream.ChatbotMessage.from_dict(raw_data)
                if incoming.text and hasattr(incoming.text, "content"):
                    text = (incoming.text.content or "").strip()

            elif msg_type == "richText":
                # richText: content.richText 是数组，分离 text 和 picture
                content = raw_data.get("content", {})
                rich_parts = content.get("richText", [])
                text_parts = []
                for pi, part in enumerate(rich_parts):
                    if isinstance(part, dict):
                        logger.info("  richText[%d] keys=%s", pi, list(part.keys()))
                        if part.get("text"):
                            text_parts.append(part["text"])
                        # 图片检测
                        pic_code = part.get("downloadCode") or part.get("pictureDownloadCode") or ""
                        if pic_code:
                            logger.info("  发现图片 downloadCode=%s", pic_code[:30])
                            robot_code = raw_data.get("robotCode", "")
                            creds = _load_bot_creds()
                            if creds and robot_code:
                                from order_ocr import download_dingtalk_image
                                img = download_dingtalk_image(
                                    pic_code, robot_code,
                                    creds["app_key"], creds["app_secret"],
                                )
                                if img:
                                    image_bytes_list.append(img)
                                    logger.info("  下载图片成功: %d bytes", len(img))
                text = "\n".join(text_parts).strip()

            else:
                logger.info("跳过非文本消息: msgtype=%s", msg_type)
                return AckMessage.STATUS_OK, "OK"

            if not text:
                logger.info("空文本，跳过 (msgtype=%s)", msg_type)
                return AckMessage.STATUS_OK, "OK"

            logger.info("解析文本 (%s): %s", msg_type, text[:100])

            # OCR 图片提取金额
            ocr_amount_thb: float | None = None
            if image_bytes_list:
                from order_ocr import extract_thb_from_image
                for img_bytes in image_bytes_list:
                    amt = extract_thb_from_image(img_bytes)
                    if amt and amt > 100:
                        ocr_amount_thb = amt
                        logger.info("OCR 提取金额: ฿%.0f", amt)
                        break

        except Exception as e:
            logger.error("回调解析异常: %s (data keys: %s)", e, list(raw_data.keys()) if isinstance(raw_data, dict) else "N/A")
            return AckMessage.STATUS_OK, "OK"

        # 解析
        order = parse_order_message(text)

        if not order.is_order:
            logger.info("非成交消息，跳过: %s", text[:60])
            return AckMessage.STATUS_OK, "OK"

        if not order.is_referral:
            logger.info("非转介绍，跳过: source=%s", order.lead_source)
            return AckMessage.STATUS_OK, "OK"

        # 注入 OCR 金额（文本没金额但图片有）
        if ocr_amount_thb and order.amount_thb is None:
            order.amount_thb = ocr_amount_thb
            rate = _load_exchange_rate()
            order.amount_usd = ocr_amount_thb / rate

        # 写入今日累加器
        from today_orders import add_order as _add_today
        today_stats = _add_today(
            cc_name=order.cc_name,
            team=f"{order.team_code} Team {order.team_number}",
            student=order.student_name,
            product=order.product,
            amount_thb=order.amount_thb,
        )

        # 日志
        sender = raw_data.get("senderNick", "")
        conv_id = raw_data.get("conversationId", "")
        _log_order(order, sender=sender, conversation_id=conv_id)

        # 回复（含今日累计数据）
        reply = format_reply(order, today_stats=today_stats)
        if reply:
            webhook = raw_data.get("sessionWebhook", "")
            if webhook:
                _reply_via_webhook(webhook, reply)
            elif msg_type == "text":
                incoming = dingtalk_stream.ChatbotMessage.from_dict(raw_data)
                self.reply_text(reply, incoming)
            logger.info(
                "已回复: %s %s $%s",
                order.cc_name,
                "转介绍" if order.is_referral else order.lead_source,
                order.amount_usd,
            )

        return AckMessage.STATUS_OK, "OK"


# ── 启动 ──────────────────────────────────────────────────────────────────────

def _load_bot_creds() -> dict | None:
    """读取凭证（用于图片下载 API）"""
    if not CREDENTIALS_PATH.exists():
        return None
    try:
        return json.loads(CREDENTIALS_PATH.read_text())
    except Exception:
        return None


def _load_credentials() -> tuple[str, str]:
    """从 key/dingtalk-bot.json 读取凭证"""
    if not CREDENTIALS_PATH.exists():
        print(f"[错误] 凭证文件不存在: {CREDENTIALS_PATH}")
        print("请让 IT 在钉钉开放平台创建企业内部应用，获取 AppKey/AppSecret")
        print(f"然后填入 {CREDENTIALS_PATH}（参考 key/dingtalk-bot.example.json）")
        sys.exit(1)

    data = json.loads(CREDENTIALS_PATH.read_text())
    app_key = data.get("app_key", "")
    app_secret = data.get("app_secret", "")

    if not app_key or not app_secret:
        print("[错误] app_key 或 app_secret 为空")
        sys.exit(1)

    return app_key, app_secret


def start_bot() -> None:
    """启动 Stream 模式机器人"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    app_key, app_secret = _load_credentials()

    credential = dingtalk_stream.Credential(app_key, app_secret)
    client = dingtalk_stream.DingTalkStreamClient(credential)
    client.register_callback_handler(
        dingtalk_stream.chatbot.ChatbotMessage.TOPIC,
        OrderBotHandler(),
    )

    logger.info("订单识别机器人启动（Stream 模式）...")
    logger.info("在钉钉群里 @机器人 发送成交消息即可触发")
    logger.info("日志路径: %s", LOG_PATH)

    client.start_forever()


# ── 本地测试 ──────────────────────────────────────────────────────────────────

_TEST_MESSAGE = """CAN DO IT , Congratulations!!!
[奖杯] ⭐️12-So light ⭐️[奖杯]
Source of leads : Refer @Felix @Q (Intern)
Service as the cause, performance as the result！
SOP and Sales🍀[礼物]💸
Student Name : Winner
Amount : $1200
[双手合十][爱心]  THCC NIRUT TEAM 5 [爱心][双手合十]"""


def test_parse() -> None:
    """本地测试解析逻辑（不连钉钉）"""
    print("=" * 60)
    print("测试消息:")
    print(_TEST_MESSAGE)
    print("=" * 60)

    order = parse_order_message(_TEST_MESSAGE)
    print("\n解析结果:")
    print(f"  是成交消息: {order.is_order}")
    print(f"  是转介绍:   {order.is_referral}")
    print(f"  线索来源:   {order.lead_source}")
    print(f"  金额(USD):  {order.amount_usd}")
    print(f"  金额(THB):  {order.amount_thb}")
    print(f"  学员名:     {order.student_name}")
    print(f"  产品:       {order.product}")
    print(f"  CC:         {order.cc_name}")
    print(f"  团队:       {order.team_code}")
    print(f"  Team:       {order.team_number}")
    print(f"  订单类型:   {order.order_type}")
    print(f"  缺失字段:   {order.parse_errors}")

    print("\n回复预览:")
    print("-" * 40)
    print(format_reply(order))
    print("-" * 40)

    # 额外测试：非转介绍
    print("\n\n--- 测试非转介绍消息 ---")
    non_ref = _TEST_MESSAGE.replace(
        "Source of leads : Refer", "Source of leads : Market"
    )
    order2 = parse_order_message(non_ref)
    print(f"  是转介绍: {order2.is_referral}  来源: {order2.lead_source}")
    print(format_reply(order2))

    # 额外测试：非成交消息
    print("\n--- 测试非成交消息 ---")
    order3 = parse_order_message("大家早上好")
    print(f"  是成交消息: {order3.is_order}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="钉钉成交订单识别机器人")
    parser.add_argument(
        "--test-parse",
        action="store_true",
        help="测试解析逻辑（不连钉钉）",
    )
    args = parser.parse_args()

    if args.test_parse:
        test_parse()
    else:
        start_bot()

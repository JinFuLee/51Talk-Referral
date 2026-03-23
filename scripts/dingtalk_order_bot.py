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

# Source of leads
_SOURCE_PATTERN = re.compile(
    r"source\s+of\s+leads?\s*[:\-：]\s*(.+)", re.IGNORECASE
)

# Student Name
_STUDENT_PATTERN = re.compile(
    r"student\s+name\s*[:\-：]\s*(.+)", re.IGNORECASE
)

# Amount（支持 $1200 / $1,200 / 1200USD / ฿40800 / Amount: 1200）
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

# 产品名（⭐️...⭐️ 之间）
_PRODUCT_PATTERN = re.compile(
    r"⭐️\s*(.+?)\s*⭐️"
)

# THCC 团队信息（THCC NIRUT TEAM 5）
_TEAM_PATTERN = re.compile(
    r"(TH(?:CC|SS|LP)(?:-[A-Z])?)\s+"  # 团队代码
    r"([A-Z][A-Za-z]+)\s+"              # CC 名字
    r"(?:TEAM|team)\s*(\d+)",           # Team 编号
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

    # 2. 线索来源
    m = _SOURCE_PATTERN.search(text)
    if m:
        source_raw = m.group(1).strip()
        order.lead_source = source_raw
        # "Refer" / "Referral" / "转介绍" = 转介绍
        order.is_referral = bool(
            re.search(r"refer|转介绍", source_raw, re.IGNORECASE)
        )
    else:
        errors.append("Source of leads 未找到")

    # 3. 金额
    m = _AMOUNT_PATTERN.search(text)
    if m:
        order.amount_usd = float(m.group(1).replace(",", ""))
    else:
        # 备用：独立 $金额
        m = _DOLLAR_PATTERN.search(text)
        if m:
            order.amount_usd = float(m.group(1).replace(",", ""))
        else:
            errors.append("金额未找到")

    if order.amount_usd is not None:
        rate = _load_exchange_rate()
        order.amount_thb = round(order.amount_usd * rate, 0)

    # 4. 学员名
    m = _STUDENT_PATTERN.search(text)
    if m:
        order.student_name = m.group(1).strip()
    else:
        errors.append("Student Name 未找到")

    # 5. 产品
    m = _PRODUCT_PATTERN.search(text)
    if m:
        order.product = m.group(1).strip()

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

def format_reply(order: ParsedOrder) -> str:
    """生成回复文本（钉钉 Markdown 格式）"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    if not order.is_order:
        return ""  # 非成交消息不回复

    lines: list[str] = []

    if order.is_referral:
        lines.append("### ✓ 转介绍成交确认")
    else:
        source = order.lead_source or "未知"
        lines.append(f"### 成交确认（渠道：{source}）")

    lines.append("")
    lines.append("---")

    if order.student_name:
        lines.append(f"- 学员：**{order.student_name}**")

    if order.product:
        lines.append(f"- 产品：{order.product}")

    if order.amount_usd is not None:
        thb_str = f" (฿{order.amount_thb:,.0f})" if order.amount_thb else ""
        lines.append(f"- 金额：**${order.amount_usd:,.0f}{thb_str}**")

    if order.order_type:
        lines.append(f"- 类型：{order.order_type}")

    if order.cc_name:
        team_str = order.team_code
        if order.team_number:
            team_str += f" TEAM {order.team_number}"
        lines.append(f"- 销售：**{order.cc_name}** ({team_str})")

    if order.is_referral:
        lines.append("")
        lines.append("> 渠道：转介绍 ✓ 计入转介绍业绩")

    # 缺失字段提示
    if order.parse_errors:
        lines.append("")
        lines.append(f"⚠ 信息不完整：{', '.join(order.parse_errors)}")

    lines.append("")
    lines.append(f"⏱ {now}")

    return "\n".join(lines)


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
        incoming = dingtalk_stream.ChatbotMessage.from_dict(callback.data)
        text: str = (incoming.text.content or "").strip()

        if not text:
            return AckMessage.STATUS_OK, "OK"

        # 解析
        order = parse_order_message(text)

        if not order.is_order:
            # 非成交消息，不回复（静默）
            logger.debug("非成交消息，跳过: %s", text[:80])
            return AckMessage.STATUS_OK, "OK"

        # 日志
        sender = getattr(incoming, "sender_nick", "") or getattr(
            incoming, "senderNick", ""
        )
        conv_id = getattr(incoming, "conversation_id", "") or getattr(
            incoming, "conversationId", ""
        )
        _log_order(order, sender=sender, conversation_id=conv_id)

        # 回复
        reply = format_reply(order)
        if reply:
            self.reply_text(reply, incoming)
            logger.info(
                "已回复: %s %s $%s",
                order.cc_name,
                "转介绍" if order.is_referral else order.lead_source,
                order.amount_usd,
            )

        return AckMessage.STATUS_OK, "OK"


# ── 启动 ──────────────────────────────────────────────────────────────────────

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

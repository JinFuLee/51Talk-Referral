"""学员 360° 视图 Pydantic 模型"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class StudentSearchItem(BaseModel):
    """学员搜索列表项"""

    stdt_id: str | None = None
    region: str | None = None
    lifecycle: str | None = None
    cc_name: str | None = None
    paid_amount_usd: float | None = None
    referral_paid_count: float | None = None
    referral_revenue_usd: float | None = None
    is_high_potential: bool = False
    channel: str | None = None


class StudentSearchResult(BaseModel):
    """分页搜索结果"""

    items: list[StudentSearchItem] = []
    total: int = 0
    page: int = 1
    page_size: int = 20


class DailyRecord(BaseModel):
    """D3 日报单条记录"""

    date: str | None = None
    enclosure: str | None = None
    registrations: float | None = None
    invitations: float | None = None
    attendance: float | None = None
    paid_count: float | None = None
    revenue_usd: float | None = None
    checkin: float | None = None
    cc_contact: float | None = None
    ss_contact: float | None = None
    lp_contact: float | None = None


class StudentDetail(BaseModel):
    """学员完整360°画像"""

    stdt_id: str
    # D4 基本信息（关键字段，全量在 raw_d4 中）
    region: str | None = None
    lifecycle: str | None = None
    cc_name: str | None = None
    paid_amount_usd: float | None = None
    referral_paid_count: float | None = None
    referral_revenue_usd: float | None = None
    channel: str | None = None
    # D4 补全字段
    referral_reward_status: str | None = None
    avg_lesson_consumed_3m: float | None = None
    days_to_card_expiry: float | None = None
    days_since_last_renewal: float | None = None
    total_renewal_orders: float | None = None
    # D5 高潜标签
    is_high_potential: bool = False
    hp_info: dict[str, Any] = {}
    # D3 日报时间线
    timeline: list[DailyRecord] = []
    # D4 全量原始字段
    raw_d4: dict[str, Any] = {}


class ReferralNode(BaseModel):
    """推荐网络节点"""

    stdt_id: str
    cc_name: str | None = None
    lifecycle: str | None = None
    referral_paid_count: float | None = None
    depth: int = 0


class ReferralNetwork(BaseModel):
    """推荐链网络图"""

    root_id: str
    nodes: list[ReferralNode] = []
    edges: list[dict[str, str]] = []  # [{source, target}, ...]
    depth: int = 2

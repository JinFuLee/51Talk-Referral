from typing import Any, Dict, Optional

from pydantic import BaseModel


class PanelConfig(BaseModel):
    language: str = "zh"
    role: str = "ops"
    input_dir: str = "./input"
    output_dir: str = "./output"
    exchange_rate: float = 35.0
    selected_month: Optional[str] = None


class MonthlyTarget(BaseModel):
    month: str
    reg_target: int = 0
    paid_target: int = 0
    amount_target: float = 0.0
    conv_rate_target: float = 0.0


class ExchangeRateUpdate(BaseModel):
    rate: float


# ── MonthlyTarget V2 分层目标体系 ─────────────────────────────────────────────


class HardTarget(BaseModel):
    """L1 硬性目标"""

    total_revenue: float = 0.0  # HQ总业绩目标 (USD)
    referral_pct: float = 0.0  # 转介绍占比 (0~1)
    referral_revenue: float = 0.0  # 转介绍收入目标 (USD) = total × pct 或手动
    display_currency: str = "THB"  # 显示币种 THB | USD
    lock_field: str = "pct"  # "pct" | "amount" 标记手动输入项


class ChannelTarget(BaseModel):
    """单渠道目标"""

    user_count: int = 0  # leads注册目标
    asp: float = 0.0  # 客单价 (USD)
    conversion_rate: float = 0.0  # 注册→付费转化率
    reserve_rate: float = 0.0  # 预约转化率
    attend_rate: float = 0.0  # 出席转化率


class ChannelDecomposition(BaseModel):
    """L2 横向渠道拆解"""

    cc_narrow: ChannelTarget = ChannelTarget()
    ss_narrow: ChannelTarget = ChannelTarget()
    lp_narrow: ChannelTarget = ChannelTarget()
    wide: ChannelTarget = ChannelTarget()


class EnclosureTarget(BaseModel):
    """单围场目标"""

    reach_rate: float = 0.0  # 触达率目标
    participation_rate: float = 0.0  # 参与率目标
    conversion_rate: float = 0.0  # 转化率目标
    checkin_rate: float = 0.0  # 打卡率目标


class EnclosureDecomposition(BaseModel):
    """L2 纵向围场拆解"""

    d0_30: EnclosureTarget = EnclosureTarget()
    d31_60: EnclosureTarget = EnclosureTarget()
    d61_90: EnclosureTarget = EnclosureTarget()
    d91_180: EnclosureTarget = EnclosureTarget()
    d181_plus: EnclosureTarget = EnclosureTarget()


class SOPTargets(BaseModel):
    """SOP 过程指标"""

    checkin_rate: float = 0.0  # 24H打卡率目标
    reach_rate: float = 0.0  # 触达率目标
    participation_rate: float = 0.0  # 参与率目标
    reserve_rate: float = 0.0  # 约课率目标
    attend_rate: float = 0.0  # 出席率目标
    outreach_calls_per_day: int = 0  # 日外呼目标


class MonthlyTargetV2(BaseModel):
    """V2 分层月度目标"""

    version: int = 2
    month: str = ""
    hard: HardTarget = HardTarget()
    channels: ChannelDecomposition = ChannelDecomposition()
    enclosures: EnclosureDecomposition = EnclosureDecomposition()
    sop: SOPTargets = SOPTargets()

    def flatten(self) -> dict:
        """输出与现有 MONTHLY_TARGETS 完全兼容的扁平 dict，引擎零改动即可消费"""
        ch = self.channels
        # 各渠道付费目标 = user_count × conversion_rate
        cc_paid = (
            int(ch.cc_narrow.user_count * ch.cc_narrow.conversion_rate)
            if ch.cc_narrow.conversion_rate
            else 0
        )
        ss_paid = (
            int(ch.ss_narrow.user_count * ch.ss_narrow.conversion_rate)
            if ch.ss_narrow.conversion_rate
            else 0
        )
        lp_paid = (
            int(ch.lp_narrow.user_count * ch.lp_narrow.conversion_rate)
            if ch.lp_narrow.conversion_rate
            else 0
        )
        wide_paid = (
            int(ch.wide.user_count * ch.wide.conversion_rate)
            if ch.wide.conversion_rate
            else 0
        )

        total_reg = (
            ch.cc_narrow.user_count
            + ch.ss_narrow.user_count
            + ch.lp_narrow.user_count
            + ch.wide.user_count
        )
        total_paid = cc_paid + ss_paid + lp_paid + wide_paid

        # 加权平均客单价
        total_user = total_reg or 1
        weighted_asp = (
            ch.cc_narrow.user_count * ch.cc_narrow.asp
            + ch.ss_narrow.user_count * ch.ss_narrow.asp
            + ch.lp_narrow.user_count * ch.lp_narrow.asp
            + ch.wide.user_count * ch.wide.asp
        ) / total_user

        total_conv = total_paid / total_reg if total_reg else 0.0

        return {
            "注册目标": total_reg,
            "付费目标": total_paid,
            "金额目标": self.hard.referral_revenue,
            "客单价": round(weighted_asp, 2),
            "目标转化率": round(total_conv, 4),
            "约课率目标": self.sop.reserve_rate,
            "出席率目标": self.sop.attend_rate,
            "子口径": {
                "CC窄口径": {"倒子目标": ch.cc_narrow.user_count},
                "SS窄口径": {"倒子目标": ch.ss_narrow.user_count},
                "LP窄口径": {"倒子目标": ch.lp_narrow.user_count},
                "宽口径": {"倒子目标": ch.wide.user_count},
            },
        }

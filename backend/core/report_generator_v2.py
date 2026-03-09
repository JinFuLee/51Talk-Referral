"""
金字塔报告引擎 V2
结论先行 → MECE拆解 → 数据论据 → 行动方案
基于 SCQ-A 框架 + 六步法
"""
from __future__ import annotations
from typing import Any, Optional

try:
    from backend.core.config import EXCHANGE_RATE_THB_USD
except ImportError:
    EXCHANGE_RATE_THB_USD = 34.0


def _pct(value) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _safe_get(d: dict, *keys, default=None) -> Any:
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k, default)
        if cur is None:
            return default
    return cur


def _fmt_usd(val: float) -> str:
    return f"${val:,.0f}"


def _fmt_thb(val: float) -> str:
    return f"฿{val:,.0f}"


def _fmt_both(usd: float) -> str:
    thb = usd * EXCHANGE_RATE_THB_USD
    return f"{_fmt_thb(thb)}({_fmt_usd(usd)})"


class PyramidReportGenerator:
    """
    金字塔结构报告生成器。
    接收完整分析缓存，生成结构化报告（结论先行，MECE拆解）。
    """

    def __init__(self, analysis_result: dict) -> None:
        self.data = analysis_result or {}
        self.summary = self.data.get("summary", {}) or {}
        self.funnel = self.data.get("funnel", {}) or {}
        self.meta = self.data.get("meta", {}) or {}
        self.targets = self.meta.get("targets", {}) or self.data.get("targets", {}) or {}
        self.channel = self.data.get("channel_comparison", {}) or {}
        self.outreach = self.data.get("outreach_analysis", {}) or {}

        self.time_progress = _pct(
            self.targets.get("时间进度")
            or _safe_get(self.summary, "time_progress")
        ) or 0.0

    # ── 核心数据提取 ────────────────────────────────────────────────────────────

    def _get_metric(self, key: str) -> dict:
        node = self.summary.get(key, {})
        return node if isinstance(node, dict) else {}

    def _reg(self) -> dict:
        return self._get_metric("registration")

    def _pay(self) -> dict:
        return self._get_metric("payment")

    def _rev(self) -> dict:
        return self._get_metric("revenue")

    def _checkin(self) -> dict:
        return self._get_metric("checkin_24h")

    # ── 结论 ────────────────────────────────────────────────────────────────────

    def _build_conclusion(self) -> str:
        reg = self._reg()
        pay = self._pay()
        rev = self._rev()
        checkin = self._checkin()

        rev_prog = _pct(rev.get("progress")) or 0.0
        tp = self.time_progress
        rev_target = _pct(rev.get("target_usd")) or 0
        rev_usd = _pct(rev.get("usd")) or 0

        checkin_rate = _pct(checkin.get("rate"))
        checkin_target = _pct(checkin.get("target")) or 0.60
        reg_gap = _pct(reg.get("gap"))
        pay_gap = _pct(pay.get("gap"))

        completion_pct = f"{rev_prog:.0%}"

        issues = []
        if reg_gap is not None and reg_gap < -0.05:
            issues.append("注册数落后")
        if pay_gap is not None and pay_gap < -0.05:
            issues.append("付费数落后")
        if checkin_rate is not None and checkin_rate < checkin_target:
            issues.append(f"打卡率偏低（{checkin_rate:.0%}）")

        if not issues:
            return f"本月转介绍业绩预计完成率{completion_pct}，整体进度健康，建议保持节奏并寻求超额机会"

        issue_str = "、".join(issues)
        return (
            f"本月转介绍业绩当前完成率{completion_pct}（时间进度{tp:.0%}），"
            f"需重点提升{issue_str}，预计收入差距{_fmt_both(max(0, rev_target - rev_usd))}"
        )

    # ── SCQA ────────────────────────────────────────────────────────────────────

    def _build_scqa(self) -> dict:
        rev = self._rev()
        reg = self._reg()
        pay = self._pay()

        rev_target = _pct(rev.get("target_usd")) or 0
        rev_usd = _pct(rev.get("usd")) or 0
        rev_prog = _pct(rev.get("progress")) or 0.0
        tp = self.time_progress
        remaining_days = _pct(rev.get("remaining_workdays")) or 0

        gap_points = tp - rev_prog
        gap_usd = max(0, rev_target * tp - rev_usd)

        # Answer：优先行动
        checkin = self._checkin()
        checkin_rate = _pct(checkin.get("rate"))
        checkin_target = _pct(checkin.get("target")) or 0.60

        levers = []
        if checkin_rate is not None and checkin_rate < checkin_target:
            levers.append(f"①打卡率从{checkin_rate:.0%}→{checkin_target:.0%}")

        reg_gap = _pct(reg.get("gap"))
        if reg_gap is not None and reg_gap < -0.03:
            levers.append("②新围场参与率提升")

        pay_gap = _pct(pay.get("gap"))
        if pay_gap is not None and pay_gap < -0.03:
            levers.append("③体验课出席率和跟进促单")

        if not levers:
            levers = ["①保持当前节奏", "②寻找超额机会"]

        answer = f"聚焦{len(levers)}个杠杆：{' / '.join(levers)}"

        return {
            "situation": (
                f"本月转介绍目标{_fmt_both(rev_target)}，"
                f"当前进度{rev_prog:.0%}（已完成{_fmt_both(rev_usd)}）"
            ),
            "complication": (
                f"时间进度已达{tp:.0%}，业绩落后{gap_points:.1%}个百分点，"
                f"差距约{_fmt_both(gap_usd)}，剩余{remaining_days:.0f}个工作日"
            ),
            "question": "如何在剩余时间追回差距并完成月度目标？",
            "answer": answer,
        }

    # ── Pillars（MECE三大杠杆）──────────────────────────────────────────────────

    def _build_pillars(self) -> list[dict]:
        """
        从影响链数据（try import）或 summary gap 排序生成3-5个支柱。
        每个支柱 MECE（互斥且完整）。
        """
        pillars = []

        # 尝试从 impact_chain 获取量化数据
        impact_data = {}
        try:
            from backend.core.impact_chain import ImpactChain  # type: ignore
            chain = ImpactChain(self.data)
            impact_data = chain.calculate() if hasattr(chain, "calculate") else {}
        except (ImportError, Exception):
            pass

        rev = self._rev()
        pay = self._pay()
        reg = self._reg()
        checkin = self._checkin()

        rev_target = _pct(rev.get("target_usd")) or 0

        # ── 杠杆1：打卡率提升（分享裂变）
        checkin_rate = _pct(checkin.get("rate"))
        checkin_target_val = _pct(checkin.get("target")) or 0.60
        if checkin_rate is not None:
            gap_pct = max(0.0, checkin_target_val - checkin_rate)
            # 每提升1%打卡率约带来 $13,360 增收（基于业务估算）
            impact_usd = impact_data.get("checkin_impact", round(gap_pct * 13360, 0))
            pillars.append({
                "title": "杠杆1: 打卡率提升（分享裂变驱动）",
                "priority": 1,
                "current": round(checkin_rate, 4),
                "target": round(checkin_target_val, 4),
                "expected_revenue_lift_usd": round(impact_usd, 0),
                "expected_revenue_gain_thb": round(impact_usd * EXCHANGE_RATE_THB_USD, 0),
                "actions": [
                    "优化打卡激励机制（积分/礼品激励分享）",
                    "增加打卡提醒频次（课后24小时内）",
                    "CC主动催促新围场0-30天学员完成打卡",
                ],
                "data_points": [
                    {"label": "当前打卡率", "value": f"{checkin_rate:.0%}"},
                    {"label": "目标打卡率", "value": f"{checkin_target_val:.0%}"},
                    {"label": "提升后预期增收", "value": _fmt_both(impact_usd)},
                ],
            })

        # ── 杠杆2：新围场参与率提升（注册转化驱动）
        reg_actual = _pct(reg.get("actual")) or 0
        reg_target = _pct(reg.get("target")) or 0
        reg_gap = _pct(reg.get("gap"))
        if reg_gap is not None and reg_gap < -0.02:
            gap_abs = max(0, reg_target - reg_actual)
            unit_price = _pct(self.targets.get("客单价")) or 850.0
            conversion = _pct(self.targets.get("目标转化率")) or 0.23
            impact_usd = impact_data.get("registration_impact", round(gap_abs * conversion * unit_price, 0))
            pillars.append({
                "title": "杠杆2: 新围场参与率提升（注册量补充）",
                "priority": 2,
                "current": int(reg_actual),
                "target": int(reg_target),
                "expected_revenue_lift_usd": round(impact_usd, 0),
                "expected_revenue_gain_thb": round(impact_usd * EXCHANGE_RATE_THB_USD, 0),
                "actions": [
                    f"增加CC对新围场（0-30天）学员的外呼频次，缺口约{gap_abs:.0f}人",
                    "强化带新激励：推荐注册奖励机制升级",
                    "SS/LP协同引流，扩大注册入口",
                ],
                "data_points": [
                    {"label": "当前注册数", "value": f"{reg_actual:.0f}"},
                    {"label": "目标注册数", "value": f"{reg_target:.0f}"},
                    {"label": "缺口", "value": f"{gap_abs:.0f}人"},
                    {"label": "预期增收", "value": _fmt_both(impact_usd)},
                ],
            })

        # ── 杠杆3：漏斗转化效率（出席→付费）
        pay_actual = _pct(pay.get("actual")) or 0
        pay_target = _pct(pay.get("target")) or 0
        pay_gap = _pct(pay.get("gap"))

        total_funnel = self.funnel.get("total", {}) or {}
        rates = total_funnel.get("rates", {}) if isinstance(total_funnel, dict) else {}
        attend_rate = _pct(rates.get("attend_rate"))
        attend_target_val = _pct(self.targets.get("出席率目标")) or 0.66

        if pay_gap is not None and pay_gap < -0.02:
            pay_gap_abs = max(0, pay_target - pay_actual)
            unit_price = _pct(self.targets.get("客单价")) or 850.0
            impact_usd = impact_data.get("payment_impact", round(pay_gap_abs * unit_price, 0))
            attend_info = f"当前出席率{attend_rate:.0%}" if attend_rate else "出席率数据待接入"
            pillars.append({
                "title": "杠杆3: 漏斗转化效率（出席到付费）",
                "priority": 3,
                "current": int(pay_actual),
                "target": int(pay_target),
                "expected_revenue_lift_usd": round(impact_usd, 0),
                "expected_revenue_gain_thb": round(impact_usd * EXCHANGE_RATE_THB_USD, 0),
                "actions": [
                    f"加强体验课邀约，{attend_info}（目标{attend_target_val:.0%}）",
                    "CC课后2小时内跟进促单，缩短决策周期",
                    f"对缺口{pay_gap_abs:.0f}单进行精准跟进",
                ],
                "data_points": [
                    {"label": "当前付费数", "value": f"{pay_actual:.0f}"},
                    {"label": "目标付费数", "value": f"{pay_target:.0f}"},
                    {"label": "缺口", "value": f"{pay_gap_abs:.0f}单"},
                    {"label": "预期增收", "value": _fmt_both(impact_usd)},
                ],
            })

        # 若无任何异常，生成一个"保持节奏"占位支柱
        if not pillars:
            rev_usd = _pct(rev.get("usd")) or 0
            pillars.append({
                "title": "杠杆1: 维持当前业绩节奏",
                "priority": 1,
                "current": _pct(rev.get("progress")) or 0,
                "target": 1.0,
                "expected_revenue_lift_usd": max(0, rev_target - rev_usd),
                "expected_revenue_gain_thb": max(0, (rev_target - rev_usd) * EXCHANGE_RATE_THB_USD),
                "actions": [
                    "保持当前外呼频次和质量",
                    "关注月末冲刺节奏，避免最后几天断档",
                ],
                "data_points": [
                    {"label": "当前收入", "value": _fmt_both(rev_usd)},
                    {"label": "目标收入", "value": _fmt_both(rev_target)},
                ],
            })

        return pillars

    # ── 六步法 ──────────────────────────────────────────────────────────────────

    def _build_six_steps(self, pillars: list[dict]) -> dict:
        rev = self._rev()
        pay = self._pay()
        reg = self._reg()
        checkin = self._checkin()

        rev_usd = _pct(rev.get("usd")) or 0
        rev_target = _pct(rev.get("target_usd")) or 0
        tp = self.time_progress

        checkin_rate = _pct(checkin.get("rate"))
        checkin_target_val = _pct(checkin.get("target")) or 0.60

        # 最大杠杆
        top_pillar = pillars[0] if pillars else {}
        top_impact = _pct(top_pillar.get("expected_revenue_gain_usd")) or 0

        # Insight: 打卡率影响估算
        insight_parts = []
        if checkin_rate is not None and checkin_rate < checkin_target_val:
            per_point = top_impact / max(
                1, abs(checkin_target_val - checkin_rate) * 100
            )
            insight_parts.append(
                f"打卡率是最大杠杆，每提升1%可增收约{_fmt_usd(per_point)}"
            )
        if not insight_parts:
            insight_parts.append("维持当前转化率节奏可实现目标")

        # Action: 前3个行动
        top_actions = []
        for i, p in enumerate(pillars[:3], 1):
            acts = p.get("actions", [])
            if acts:
                top_actions.append(f"{i}. {acts[0]}")

        return {
            "clarify": (
                f"本月目标：注册{int(_pct(reg.get('target')) or 0)}人，"
                f"付费{int(_pct(pay.get('target')) or 0)}单，"
                f"收入{_fmt_both(rev_target)}；"
                f"当前进度{_pct(rev.get('progress')) or 0:.0%}，时间进度{tp:.0%}"
            ),
            "metrics": ["注册数", "付费数", "收入", "打卡率", "参与率", "出席率", "触达率"],
            "data_source": "35源数据 + 历史快照（SQLite）",
            "method": "漏斗分析 + 影响链量化 + 5-Why根因归因",
            "insight": "；".join(insight_parts),
            "action": "；".join(top_actions) if top_actions else "保持当前节奏，关注月末冲刺",
        }

    # ── 主生成方法 ──────────────────────────────────────────────────────────────

    def generate(self) -> dict:
        """生成完整金字塔结构报告"""
        conclusion = self._build_conclusion()
        scqa = self._build_scqa()
        pillars = self._build_pillars()
        six_steps = self._build_six_steps(pillars)

        return {
            "conclusion": conclusion,
            "scqa": scqa,
            "pillars": pillars,
            "six_steps": six_steps,
        }

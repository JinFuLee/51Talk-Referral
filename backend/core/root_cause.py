"""
规则引擎 5-Why 自动归因分析
基于因果链模板，不依赖 LLM，全部规则引擎。
"""
from __future__ import annotations
from datetime import datetime
from typing import Any, Optional


def _safe_get(d: dict, *keys, default=None):
    """安全多级取值"""
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k, default)
        if cur is None:
            return default
    return cur


def _pct(value) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


class RootCauseEngine:
    """
    基于因果链模板的 5-Why 归因分析。
    因果链（硬编码业务规则）：
      注册数低 → 参与率低? → 打卡率低? → 触达率低? → CC外呼不足?
      付费数低 → 转化率低? → 出席率低? → 约课率低?
      收入低   → 付费数低? / 客单价低?
    """

    GAP_RED = -0.05     # 落后超过5%
    GAP_YELLOW = 0.0    # 0%以上持平

    # 预估每个指标每提升1%的收入影响系数（USD，粗略）
    IMPACT_PER_POINT = {
        "checkin_rate":        13360.0,
        "participation_rate":   8500.0,
        "outreach_rate":        5200.0,
        "attend_rate":          6000.0,
        "paid_rate":            4500.0,
    }

    def __init__(
        self,
        summary: dict,
        funnel: dict,
        targets: dict,
        outreach: dict = None,
        trial: dict = None,
    ):
        self.summary = summary or {}
        self.funnel = funnel or {}
        self.targets = targets or {}
        self.outreach = outreach or {}
        self.trial = trial or {}
        self.time_progress = _pct(targets.get("时间进度", 0.0)) or 0.0

    # ── 状态判断 ────────────────────────────────────────────────────────────────

    def _get_gap(self, metric_key: str) -> Optional[float]:
        """从 summary 取 gap 值"""
        node = self.summary.get(metric_key, {})
        if isinstance(node, dict):
            return _pct(node.get("gap"))
        return None

    def _get_status(self, metric_key: str) -> str:
        node = self.summary.get(metric_key, {})
        if isinstance(node, dict):
            return node.get("status", "gray")
        return "gray"

    def _is_anomalous(self, metric_key: str) -> bool:
        status = self._get_status(metric_key)
        return status in ("red", "yellow")

    # ── 数据安全取值 ────────────────────────────────────────────────────────────

    def _get_checkin_rate(self) -> Optional[float]:
        node = self.summary.get("checkin_24h", {})
        return _pct(node.get("rate")) if isinstance(node, dict) else None

    def _get_checkin_target(self) -> float:
        node = self.summary.get("checkin_24h", {})
        return _pct(node.get("target")) or 0.60

    def _get_participation_rate(self) -> Optional[float]:
        """参与率：funnel total paid_rate 作为近似，或从 outreach 取"""
        # 尝试从 outreach 取参与率（带新学员数/有效学员数）
        part = _safe_get(self.outreach, "participation_rate")
        if part is not None:
            return _pct(part)
        # fallback：funnel total register_paid_rate
        total = self.funnel.get("total", {})
        if isinstance(total, dict):
            rates = total.get("rates", {})
            return _pct(rates.get("register_paid_rate"))
        return None

    def _get_participation_target(self) -> float:
        return _pct(self.targets.get("目标参与率", 0.35)) or 0.35

    def _get_outreach_rate(self) -> Optional[float]:
        return _pct(_safe_get(self.outreach, "outreach_rate"))

    def _get_outreach_target(self) -> float:
        return _pct(self.targets.get("触达率目标", 0.70)) or 0.70

    def _get_attend_rate(self) -> Optional[float]:
        total = self.funnel.get("total", {})
        if isinstance(total, dict):
            rates = total.get("rates", {})
            return _pct(rates.get("attend_rate"))
        return None

    def _get_attend_target(self) -> float:
        return _pct(self.targets.get("出席率目标", 0.66)) or 0.66

    def _get_reserve_rate(self) -> Optional[float]:
        total = self.funnel.get("total", {})
        if isinstance(total, dict):
            rates = total.get("rates", {})
            return _pct(rates.get("reserve_rate"))
        return None

    def _get_reserve_target(self) -> float:
        return _pct(self.targets.get("约课率目标", 0.77)) or 0.77

    def _get_paid_rate(self) -> Optional[float]:
        total = self.funnel.get("total", {})
        if isinstance(total, dict):
            rates = total.get("rates", {})
            return _pct(rates.get("register_paid_rate"))
        return None

    def _get_paid_target(self) -> float:
        return _pct(self.targets.get("目标转化率", 0.23)) or 0.23

    def _get_unit_price(self) -> Optional[float]:
        rev_node = self.summary.get("revenue", {})
        paid_node = self.summary.get("payment", {})
        if isinstance(rev_node, dict) and isinstance(paid_node, dict):
            usd = _pct(rev_node.get("usd", 0)) or 0
            paid = _pct(paid_node.get("actual", 0)) or 0
            if paid > 0:
                return round(usd / paid, 2)
        return None

    def _get_unit_price_target(self) -> float:
        return _pct(self.targets.get("客单价", 850.0)) or 850.0

    # ── Why 链构建 ──────────────────────────────────────────────────────────────

    def _make_why(self, level: int, question: str, answer: str, data_support: Optional[dict], is_root: bool = False) -> dict:
        return {
            "level": level,
            "question": question,
            "answer": answer,
            "data_support": data_support,
            "is_root": is_root,
        }

    def _build_registration_chain(self, gap_pct: float) -> list[dict]:
        """注册数低 → 参与率 → 打卡率 → 触达率 → CC外呼"""
        chain = []
        gap_display = f"{abs(gap_pct):.1%}"

        # Why 1: 参与率
        part_rate = self._get_participation_rate()
        part_target = self._get_participation_target()
        if part_rate is None:
            chain.append(self._make_why(
                1,
                f"为什么注册数落后{gap_display}？",
                "参与率数据不可用，无法进一步分析",
                None,
                is_root=True,
            ))
            return chain

        if part_rate < part_target:
            chain.append(self._make_why(
                1,
                f"为什么注册数落后{gap_display}？",
                f"参与率仅{part_rate:.1%}（目标{part_target:.1%}），参与学员不足导致带新能力下降",
                {"metric": "participation_rate", "actual": round(part_rate, 4), "target": round(part_target, 4)},
            ))
        else:
            chain.append(self._make_why(
                1,
                f"为什么注册数落后{gap_display}？",
                f"参与率{part_rate:.1%}达标，问题在于带新转化效率（带货比/带新系数）",
                {"metric": "participation_rate", "actual": round(part_rate, 4), "target": round(part_target, 4)},
            ))

        # Why 2: 打卡率
        checkin = self._get_checkin_rate()
        checkin_target = self._get_checkin_target()
        if checkin is None:
            chain.append(self._make_why(
                2,
                "为什么参与率低？",
                "打卡率数据暂缺，待数据补充后分析",
                None,
                is_root=True,
            ))
            return chain

        if checkin < checkin_target:
            chain.append(self._make_why(
                2,
                "为什么参与率低？",
                f"打卡率仅{checkin:.1%}（目标{checkin_target:.1%}），分享裂变不足，学员带新积极性低",
                {"metric": "checkin_rate", "actual": round(checkin, 4), "target": round(checkin_target, 4)},
            ))
        else:
            chain.append(self._make_why(
                2,
                "为什么参与率低？",
                f"打卡率{checkin:.1%}达标，问题在于打卡后的带新转化路径",
                {"metric": "checkin_rate", "actual": round(checkin, 4), "target": round(checkin_target, 4)},
            ))

        # Why 3: 触达率
        outreach = self._get_outreach_rate()
        outreach_target = self._get_outreach_target()
        if outreach is None:
            chain.append(self._make_why(
                3,
                "为什么打卡率低？",
                "触达率数据暂缺（外呼数据未接入），待数据补充后分析",
                None,
                is_root=True,
            ))
            return chain

        if outreach < outreach_target:
            chain.append(self._make_why(
                3,
                "为什么打卡率低？",
                f"触达率仅{outreach:.1%}（目标{outreach_target:.1%}），有效外呼覆盖不足导致学员未被激活",
                {"metric": "outreach_rate", "actual": round(outreach, 4), "target": round(outreach_target, 4)},
            ))
        else:
            chain.append(self._make_why(
                3,
                "为什么打卡率低？",
                f"触达率{outreach:.1%}达标，问题在于外呼质量而非数量",
                {"metric": "outreach_rate", "actual": round(outreach, 4), "target": round(outreach_target, 4)},
            ))

        # Why 4: CC外呼不足
        chain.append(self._make_why(
            4,
            "为什么触达率低？",
            "CC外呼覆盖率不足，部分学员（尤其新围场0-30天）未被有效触达",
            None,
        ))

        # Why 5: 根源
        chain.append(self._make_why(
            5,
            "为什么CC外呼覆盖率不足？",
            "人力配置/培训质量/外呼工具效率不足，或学员总量增长超过外呼产能",
            None,
            is_root=True,
        ))

        return chain

    def _build_payment_chain(self, gap_pct: float) -> list[dict]:
        """付费数低 → 转化率 → 出席率 → 约课率"""
        chain = []
        gap_display = f"{abs(gap_pct):.1%}"

        # Why 1: 付费转化率
        paid_rate = self._get_paid_rate()
        paid_target = self._get_paid_target()
        if paid_rate is None:
            chain.append(self._make_why(
                1,
                f"为什么付费数落后{gap_display}？",
                "注册付费转化率数据暂缺，待数据补充后分析",
                None,
                is_root=True,
            ))
            return chain

        if paid_rate < paid_target:
            chain.append(self._make_why(
                1,
                f"为什么付费数落后{gap_display}？",
                f"注册付费转化率仅{paid_rate:.1%}（目标{paid_target:.1%}），漏斗效率低",
                {"metric": "paid_rate", "actual": round(paid_rate, 4), "target": round(paid_target, 4)},
            ))
        else:
            chain.append(self._make_why(
                1,
                f"为什么付费数落后{gap_display}？",
                f"转化率{paid_rate:.1%}达标，落后主要由注册数不足驱动",
                {"metric": "paid_rate", "actual": round(paid_rate, 4), "target": round(paid_target, 4)},
            ))

        # Why 2: 出席率
        attend_rate = self._get_attend_rate()
        attend_target = self._get_attend_target()
        if attend_rate is None:
            chain.append(self._make_why(
                2,
                "为什么转化率低？",
                "出席率数据暂缺，待数据补充后分析",
                None,
                is_root=True,
            ))
            return chain

        if attend_rate < attend_target:
            chain.append(self._make_why(
                2,
                "为什么转化率低？",
                f"出席率仅{attend_rate:.1%}（目标{attend_target:.1%}），体验课参与不足直接影响成交",
                {"metric": "attend_rate", "actual": round(attend_rate, 4), "target": round(attend_target, 4)},
            ))
        else:
            chain.append(self._make_why(
                2,
                "为什么转化率低？",
                f"出席率{attend_rate:.1%}达标，成交问题在课后跟进和促单环节",
                {"metric": "attend_rate", "actual": round(attend_rate, 4), "target": round(attend_target, 4)},
            ))

        # Why 3: 约课率
        reserve_rate = self._get_reserve_rate()
        reserve_target = self._get_reserve_target()
        if reserve_rate is None:
            chain.append(self._make_why(
                3,
                "为什么出席率低？",
                "约课率数据暂缺，待数据补充后分析",
                None,
                is_root=True,
            ))
            return chain

        if reserve_rate < reserve_target:
            chain.append(self._make_why(
                3,
                "为什么出席率低？",
                f"约课率仅{reserve_rate:.1%}（目标{reserve_target:.1%}），预约机制或CC引导不足",
                {"metric": "reserve_rate", "actual": round(reserve_rate, 4), "target": round(reserve_target, 4)},
            ))
        else:
            chain.append(self._make_why(
                3,
                "为什么出席率低？",
                f"约课率{reserve_rate:.1%}达标，出席问题在学员爽约率（到课提醒/课前跟进）",
                {"metric": "reserve_rate", "actual": round(reserve_rate, 4), "target": round(reserve_target, 4)},
            ))

        # Why 4
        chain.append(self._make_why(
            4,
            "为什么约课率低？",
            "CC对注册学员的预约引导不及时，或预约流程对学员摩擦较大",
            None,
            is_root=True,
        ))

        return chain

    def _build_revenue_chain(self, gap_pct: float) -> list[dict]:
        """收入低 → 付费数低? / 客单价低?"""
        chain = []
        gap_display = f"{abs(gap_pct):.1%}"

        # 判断是付费数问题还是客单价问题
        paid_node = self.summary.get("payment", {})
        paid_gap = _pct(paid_node.get("gap")) if isinstance(paid_node, dict) else None

        unit_price = self._get_unit_price()
        unit_target = self._get_unit_price_target()

        if paid_gap is not None and paid_gap < self.GAP_YELLOW:
            chain.append(self._make_why(
                1,
                f"为什么收入落后{gap_display}？",
                f"付费数落后时间进度{paid_gap:.1%}，收入不足主要由成交量驱动",
                {"metric": "payment_gap", "actual": round(paid_gap, 4)},
            ))
            # 接续付费数因果链（取前2层）
            sub_chain = self._build_payment_chain(paid_gap)
            for i, w in enumerate(sub_chain[:3], start=2):
                w["level"] = i
                chain.append(w)
        elif unit_price is not None and unit_price < unit_target * 0.95:
            chain.append(self._make_why(
                1,
                f"为什么收入落后{gap_display}？",
                f"客单价{unit_price:.0f}USD低于目标{unit_target:.0f}USD，产品结构偏向低客单",
                {"metric": "unit_price", "actual": round(unit_price, 2), "target": round(unit_target, 2)},
            ))
            chain.append(self._make_why(
                2,
                "为什么客单价低？",
                "购买课包结构偏小单（低于850USD阈值），SS/LP高价值产品推荐不足",
                None,
            ))
        else:
            chain.append(self._make_why(
                1,
                f"为什么收入落后{gap_display}？",
                "付费数和客单价均接近目标，落后主要来自时间节奏偏慢，需加速成交",
                {"metric": "revenue_gap", "actual": round(gap_pct, 4)},
            ))

        return chain

    # ── 行动建议 ────────────────────────────────────────────────────────────────

    def _get_action_and_impact(self, metric_key: str, gap_pct: float) -> tuple[str, float]:
        """返回 (行动建议, 预估损失USD)"""
        impact_per_point = self.IMPACT_PER_POINT

        if metric_key == "registration":
            checkin = self._get_checkin_rate()
            checkin_target = self._get_checkin_target()
            gap_points = abs((checkin or checkin_target) - checkin_target)
            impact = round(gap_points * impact_per_point.get("checkin_rate", 0), 0)
            return "增加CC外呼频次，优先覆盖新围场0-30天学员；优化打卡激励机制提升分享裂变", impact

        if metric_key == "payment":
            attend = self._get_attend_rate()
            attend_target = self._get_attend_target()
            gap_points = abs((attend or attend_target) - attend_target)
            impact = round(gap_points * impact_per_point.get("attend_rate", 0), 0)
            return "强化体验课邀约，提升约课率和到课率；CC课后2小时内跟进促单", impact

        if metric_key == "revenue":
            rev_node = self.summary.get("revenue", {})
            abs_gap = abs(_pct(rev_node.get("absolute_gap", 0)) or 0)
            return "同步提升付费数量和客单价：推荐高价套餐，缩短成交周期", abs_gap

        return "根据业务优先级制定行动计划", 0.0

    # ── 主分析方法 ──────────────────────────────────────────────────────────────

    def analyze(self) -> dict:
        """对所有异常指标（落后时间进度>5%或yellow/red）执行 5-Why 分析"""
        analyses = []

        metric_config = [
            {
                "key": "registration",
                "label": "注册数",
                "chain_fn": self._build_registration_chain,
            },
            {
                "key": "payment",
                "label": "付费数",
                "chain_fn": self._build_payment_chain,
            },
            {
                "key": "revenue",
                "label": "收入",
                "chain_fn": self._build_revenue_chain,
            },
        ]

        total_loss = 0.0

        for m in metric_config:
            key = m["key"]
            node = self.summary.get(key, {})
            if not isinstance(node, dict):
                continue

            gap = _pct(node.get("gap"))
            status = node.get("status", "gray")

            if status not in ("red", "yellow"):
                continue
            if gap is None:
                continue

            gap_display = f"{abs(gap):.1%}"
            why_chain = m["chain_fn"](gap)
            action, impact = self._get_action_and_impact(key, gap)
            total_loss += impact

            # 推断 root_cause 文本
            if why_chain:
                deepest = why_chain[-1]
                root_cause = deepest.get("answer", "根因待深入分析")
            else:
                root_cause = "数据不足，无法完成完整因果链"

            analyses.append({
                "trigger": f"{m['label']}低于时间进度 {gap_display}",
                "trigger_metric": key,
                "trigger_label": m["label"],
                "trigger_description": f"{m['label']}低于时间进度 {gap_display}",
                "severity": status,
                "why_chain": why_chain,
                "root_cause": root_cause,
                "action": action,
                "expected_impact_usd": impact,
            })

        anomaly_count = len(analyses)
        if anomaly_count == 0:
            summary_text = "所有核心指标均达时间进度，无需5-Why归因"
        else:
            top = max(analyses, key=lambda x: x["expected_impact_usd"], default=None)
            top_label = top["trigger_label"] if top else "未知"
            top_impact = top["expected_impact_usd"] if top else 0
            summary_text = (
                f"发现{anomaly_count}个异常指标，"
                f"最大根因：{top_label}不足"
                f"（预计损失${top_impact:,.0f}），"
                f"合计预估损失${total_loss:,.0f}"
            )

        return {
            "analyses": analyses,
            "summary_text": summary_text,
            "generated_at": datetime.now().isoformat(),
        }

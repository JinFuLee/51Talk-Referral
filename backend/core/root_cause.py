"""
规则引擎 5-Why 自动归因分析
基于因果链模板，不依赖 LLM，全部规则引擎。
扩展版：支持渠道/围场/人效/打卡转化四类维度。
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
      渠道注册付费率低 → 约课率? → 出席率? → CC跟进?
      围场ROI低 → 触达率? → 外呼覆盖? → 打卡激活?
      CC人效低 → 日均外呼? → 有效通话率? → 话术/工具?
      打卡带新效率低 → 打卡率? → 激励机制? → 次卡成本?
    """

    GAP_RED = -0.05     # 落后超过5%
    GAP_YELLOW = 0.0    # 0%以上持平

    def __init__(
        self,
        summary: dict,
        funnel: dict,
        targets: dict,
        outreach: dict = None,
        trial: dict = None,
        # 新增维度数据
        channel_comparison: dict = None,
        enclosure_cross: dict = None,
        checkin_impact: dict = None,
        productivity: dict = None,
        # 新增：产品/定价/季节性/渠道ROI/CC个人效率
        package_mix: dict = None,
        channel_roi: dict = None,
        cc_individual: list = None,
        seasonal_data: dict = None,
    ):
        self.summary = summary or {}
        self.funnel = funnel or {}
        self.targets = targets or {}
        self.outreach = outreach or {}
        self.trial = trial or {}
        self.channel_comparison = channel_comparison or {}
        self.enclosure_cross = enclosure_cross or {}
        self.checkin_impact = checkin_impact or {}
        self.productivity = productivity or {}
        self.package_mix = package_mix or {}
        self.channel_roi = channel_roi or {}
        self.cc_individual = cc_individual or []
        self.seasonal_data = seasonal_data or {}
        self.time_progress = _pct(targets.get("时间进度", 0.0)) or 0.0

    # ── 动态影响计算 ──────────────────────────────────────────────────────────────

    def _calc_impact_per_point(self, metric: str) -> float:
        """基于实际收入计算每1%改善的预估收入影响（USD）"""
        rev_node = self.summary.get("revenue", {})
        rev = _pct(rev_node.get("usd")) if isinstance(rev_node, dict) else None
        if rev is None or rev <= 0:
            # fallback 到历史硬编码值
            fallback = {
                "checkin_rate":       13360.0,
                "participation_rate":  8500.0,
                "outreach_rate":       5200.0,
                "attend_rate":         6000.0,
                "paid_rate":           4500.0,
                "channel_paid_rate":   3500.0,
                "enclosure_roi":       2800.0,
                "productivity":        1500.0,
                "checkin_conversion":  2000.0,
            }
            return fallback.get(metric, 1000.0)

        base_impacts = {
            "checkin_rate":       rev * 0.08,
            "participation_rate": rev * 0.05,
            "outreach_rate":      rev * 0.04,
            "attend_rate":        rev * 0.045,
            "paid_rate":          rev * 0.035,
            "channel_paid_rate":  rev * 0.025,
            "enclosure_roi":      rev * 0.02,
            "productivity":       rev * 0.012,
            "checkin_conversion": rev * 0.015,
            # 新增维度
            "unit_price":         rev * 0.06,   # 客单价每1%改善影响
            "channel_roi":        rev * 0.018,  # 渠道ROI每1%优化
            "cc_individual":      rev * 0.010,  # CC个人效率分散度
            "seasonality":        rev * 0.008,  # 季节性准备度
        }
        return base_impacts.get(metric, rev * 0.02)

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
        part = _safe_get(self.outreach, "participation_rate")
        if part is not None:
            return _pct(part)
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

    # ── Why 链构建工具 ──────────────────────────────────────────────────────────

    def _make_why(self, level: int, question: str, answer: str, data_support: Optional[dict], is_root: bool = False) -> dict:
        return {
            "level": level,
            "question": question,
            "answer": answer,
            "data_support": data_support,
            "is_root": is_root,
        }

    # ── 原有三条总量级触发链 ─────────────────────────────────────────────────────

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

    # ── 新增：渠道注册付费链 ──────────────────────────────────────────────────────

    def _get_anomalous_channels(self) -> list[dict]:
        """从 channel_comparison 提取异常渠道（register_paid_rate 低于目标90%）"""
        channels_data = self.channel_comparison
        if not channels_data:
            return []

        paid_target = self._get_paid_target()
        threshold = paid_target * 0.9

        # channel_comparison 可能直接是列表，也可能是 {"channels": [...]}
        channels = channels_data if isinstance(channels_data, list) else channels_data.get("channels", [])
        if not isinstance(channels, list):
            return []

        anomalous = []
        for ch in channels:
            if not isinstance(ch, dict):
                continue
            rates = ch.get("rates", {})
            if not isinstance(rates, dict):
                # 兼容平铺结构
                rate = _pct(ch.get("register_paid_rate"))
            else:
                rate = _pct(rates.get("register_paid_rate"))

            if rate is not None and rate < threshold:
                anomalous.append({**ch, "_paid_rate": rate, "_paid_target": paid_target})

        return anomalous

    def _build_channel_registration_chain(self, channel_name: str, channel_data: dict) -> list[dict]:
        """渠道注册付费率低 → 约课率? → 出席率? → CC跟进及时性?"""
        chain = []
        paid_rate = channel_data.get("_paid_rate")
        paid_target = channel_data.get("_paid_target", self._get_paid_target())

        if paid_rate is None:
            return chain

        gap_display = f"{abs(paid_rate - paid_target):.1%}"

        # Why 1
        chain.append(self._make_why(
            1,
            f"为什么{channel_name}渠道注册付费率低？",
            f"该渠道注册付费率仅{paid_rate:.1%}（目标{paid_target:.1%}），落后{gap_display}",
            {"metric": "register_paid_rate", "actual": round(paid_rate, 4), "target": round(paid_target, 4)},
        ))

        # Why 2: 约课率
        rates = channel_data.get("rates", {})
        reserve_rate = _pct(rates.get("reserve_rate")) if isinstance(rates, dict) else None
        reserve_target = self._get_reserve_target()
        if reserve_rate is not None:
            if reserve_rate < reserve_target:
                chain.append(self._make_why(
                    2,
                    f"为什么{channel_name}渠道付费转化低？",
                    f"该渠道约课率{reserve_rate:.1%}低于目标{reserve_target:.1%}，学员预约体验课意愿不足",
                    {"metric": "reserve_rate", "actual": round(reserve_rate, 4), "target": round(reserve_target, 4)},
                ))
            else:
                chain.append(self._make_why(
                    2,
                    f"为什么{channel_name}渠道付费转化低？",
                    f"约课率{reserve_rate:.1%}达标，问题在体验课出席或课后成交",
                    {"metric": "reserve_rate", "actual": round(reserve_rate, 4), "target": round(reserve_target, 4)},
                ))
        else:
            chain.append(self._make_why(
                2,
                f"为什么{channel_name}渠道付费转化低？",
                "约课率数据暂缺，推测该渠道CC引导预约不足",
                None,
            ))

        # Why 3: 出席率
        attend_rate = _pct(rates.get("attend_rate")) if isinstance(rates, dict) else None
        attend_target = self._get_attend_target()
        if attend_rate is not None:
            if attend_rate < attend_target:
                chain.append(self._make_why(
                    3,
                    "为什么约课后仍未成交？",
                    f"出席率仅{attend_rate:.1%}（目标{attend_target:.1%}），已预约学员爽约率高",
                    {"metric": "attend_rate", "actual": round(attend_rate, 4), "target": round(attend_target, 4)},
                ))
            else:
                chain.append(self._make_why(
                    3,
                    "为什么约课后仍未成交？",
                    f"出席率{attend_rate:.1%}达标，成交失败在课后促单话术或跟进时效",
                    {"metric": "attend_rate", "actual": round(attend_rate, 4), "target": round(attend_target, 4)},
                ))

        # Why 4: 根因
        chain.append(self._make_why(
            4,
            f"为什么CC对{channel_name}渠道跟进效果差？",
            f"该渠道学员质量或CC专属话术未针对{channel_name}特点优化，需制定渠道专属跟进SOP",
            None,
            is_root=True,
        ))

        return chain[:5]  # 最多5层

    # ── 新增：围场效率链 ──────────────────────────────────────────────────────────

    def _get_anomalous_enclosures(self) -> list[dict]:
        """从 enclosure_cross 提取异常围场（ROI<0.8 或触达率<平均*0.7）"""
        enc_data = self.enclosure_cross
        if not enc_data:
            return []

        # 兼容 enclosure_cross / cohort_analysis 两种字段名
        segments = enc_data if isinstance(enc_data, list) else (
            enc_data.get("by_enclosure") or enc_data.get("segments", [])
        )
        if not isinstance(segments, list) or len(segments) == 0:
            return []

        # 计算平均触达率
        reach_rates = [_pct(e.get("reach_rate")) for e in segments if _pct(e.get("reach_rate")) is not None]
        avg_reach = sum(reach_rates) / len(reach_rates) if reach_rates else 0.0

        anomalous = []
        for enc in segments:
            if not isinstance(enc, dict):
                continue
            roi = _pct(enc.get("roi_index"))
            reach = _pct(enc.get("reach_rate"))

            is_low_roi = roi is not None and roi < 0.8
            is_low_reach = reach is not None and avg_reach > 0 and reach < avg_reach * 0.7

            if is_low_roi or is_low_reach:
                anomalous.append({**enc, "_avg_reach": avg_reach})

        return anomalous

    def _build_enclosure_chain(self, enclosure_name: str, enc_data: dict) -> list[dict]:
        """围场ROI低 → 触达率? → 外呼覆盖? → 打卡激活? → SOP执行?"""
        chain = []
        roi = _pct(enc_data.get("roi_index"))
        reach = _pct(enc_data.get("reach_rate"))
        avg_reach = enc_data.get("_avg_reach", 0.0)

        # Why 1
        if roi is not None and roi < 0.8:
            chain.append(self._make_why(
                1,
                f"为什么{enclosure_name}围场投资回报低？",
                f"该围场ROI指数{roi:.2f}低于基准值0.8，资源投入未带来对应产出",
                {"metric": "roi_index", "actual": round(roi, 3), "target": 0.8},
            ))
        else:
            chain.append(self._make_why(
                1,
                f"为什么{enclosure_name}围场触达率异常偏低？",
                f"触达率{reach:.1%}仅为全局平均{avg_reach:.1%}的{(reach / avg_reach):.0%}，该围场学员未被有效覆盖",
                {"metric": "reach_rate", "actual": round(reach or 0, 4), "target": round(avg_reach, 4)},
            ))

        # Why 2: 触达率
        reach_target = self._get_outreach_target()
        if reach is not None:
            if reach < reach_target:
                chain.append(self._make_why(
                    2,
                    f"为什么{enclosure_name}围场ROI低？",
                    f"触达率仅{reach:.1%}（目标{reach_target:.1%}），CC外呼对该围场学员覆盖严重不足",
                    {"metric": "reach_rate", "actual": round(reach, 4), "target": round(reach_target, 4)},
                ))
            else:
                chain.append(self._make_why(
                    2,
                    f"为什么{enclosure_name}围场ROI低？",
                    f"触达率{reach:.1%}达标，问题在外呼有效性（接通率/有效通话时长）",
                    {"metric": "reach_rate", "actual": round(reach, 4), "target": round(reach_target, 4)},
                ))

        # Why 3: 外呼覆盖
        participation = _pct(enc_data.get("participation_rate"))
        if participation is not None:
            part_target = self._get_participation_target()
            if participation < part_target:
                chain.append(self._make_why(
                    3,
                    "为什么外呼覆盖率低？",
                    f"该围场参与率{participation:.1%}低于目标{part_target:.1%}，学员激活转化不足",
                    {"metric": "participation_rate", "actual": round(participation, 4), "target": round(part_target, 4)},
                ))
            else:
                chain.append(self._make_why(
                    3,
                    "为什么外呼覆盖率低？",
                    "CC外呼名单排期未优先覆盖该围场，建议按围场优先级重排工作列表",
                    None,
                ))
        else:
            chain.append(self._make_why(
                3,
                "为什么外呼覆盖率低？",
                "CC日均外呼任务量超负荷，或名单分配未按围场优先级排序",
                None,
            ))

        # Why 4: 打卡激活
        checkin = _pct(enc_data.get("checkin_rate"))
        checkin_target = self._get_checkin_target()
        if checkin is not None:
            chain.append(self._make_why(
                4,
                "为什么该围场学员激活率低？",
                f"打卡率{checkin:.1%}（目标{checkin_target:.1%}），学员分享积极性低，缺乏针对性激励机制",
                {"metric": "checkin_rate", "actual": round(checkin, 4), "target": round(checkin_target, 4)},
            ))

        # Why 5: 根因
        chain.append(self._make_why(
            5,
            f"为什么{enclosure_name}围场SOP执行薄弱？",
            f"针对{enclosure_name}围场的差异化运营SOP缺失，建议制定围场专属外呼话术+激励方案，按ROI排序分配CC资源",
            None,
            is_root=True,
        ))

        return chain[:5]

    # ── 新增：CC人效链 ────────────────────────────────────────────────────────────

    def _is_productivity_anomalous(self) -> bool:
        """人效异常：日均外呼<目标 或 有效通话率<0.3"""
        if not self.productivity:
            return False
        avg_calls = _pct(self.productivity.get("avg_calls_per_day"))
        avg_effective = _pct(self.productivity.get("avg_effective_rate"))
        calls_target = _pct(self.targets.get("outreach_calls_per_day", 30)) or 30

        if avg_calls is not None and avg_calls < calls_target * 0.85:
            return True
        if avg_effective is not None and avg_effective < 0.3:
            return True
        return False

    def _build_productivity_chain(self) -> list[dict]:
        """CC人效低 → 日均外呼? → 有效通话率? → 话术/工具? → 培训+系统优化"""
        chain = []
        prod = self.productivity
        avg_calls = _pct(prod.get("avg_calls_per_day"))
        avg_effective = _pct(prod.get("avg_effective_rate"))
        cc_count = _pct(prod.get("cc_count"))
        calls_target = _pct(self.targets.get("outreach_calls_per_day", 30)) or 30

        # Why 1
        desc_parts = []
        if avg_calls is not None:
            desc_parts.append(f"日均外呼{avg_calls:.1f}次（目标{calls_target:.0f}次）")
        if avg_effective is not None:
            desc_parts.append(f"有效通话率{avg_effective:.1%}")
        if cc_count is not None:
            desc_parts.append(f"CC共{cc_count:.0f}人")
        summary_desc = "，".join(desc_parts) if desc_parts else "人效指标异常"

        chain.append(self._make_why(
            1,
            "为什么整体CC人效偏低？",
            summary_desc + "，整体外呼产能低于预期",
            {
                "metric": "avg_calls_per_day",
                "actual": round(avg_calls, 1) if avg_calls is not None else None,
                "target": round(calls_target, 0),
            } if avg_calls is not None else None,
        ))

        # Why 2: 日均外呼
        if avg_calls is not None and avg_calls < calls_target:
            chain.append(self._make_why(
                2,
                "为什么日均外呼次数不足？",
                f"实际日均{avg_calls:.1f}次低于目标{calls_target:.0f}次，CC有效工作时长或名单准备不足",
                {"metric": "avg_calls_per_day", "actual": round(avg_calls, 1), "target": round(calls_target, 0)},
            ))
        else:
            chain.append(self._make_why(
                2,
                "为什么外呼量足但人效低？",
                "日均外呼量达标，问题在于接通率和有效通话转化，外呼质量需提升",
                None,
            ))

        # Why 3: 有效通话率
        if avg_effective is not None and avg_effective < 0.3:
            chain.append(self._make_why(
                3,
                "为什么有效通话率低？",
                f"有效通话率仅{avg_effective:.1%}（基准30%），接通后120秒以上有效对话占比不足",
                {"metric": "avg_effective_rate", "actual": round(avg_effective, 4), "target": 0.30},
            ))
        else:
            chain.append(self._make_why(
                3,
                "为什么外呼效率低？",
                "话术质量参差不齐，CC间最佳实践未系统化沉淀和传播",
                None,
            ))

        # Why 4: 根因
        chain.append(self._make_why(
            4,
            "为什么话术和工具效率不足？",
            "CC培训体系不完善，高效话术库未建立；外呼系统自动拨号/CRM工具利用率低。建议：① 提取Top CC话术录音形成SOP ② 引入自动拨号系统 ③ 每周话术复盘会",
            None,
            is_root=True,
        ))

        return chain[:5]

    # ── 新增：打卡-注册转化链 ────────────────────────────────────────────────────

    def _is_checkin_anomalous(self) -> bool:
        """打卡转化异常：impact为负 或 overall_rate < 0.5"""
        if not self.checkin_impact:
            return False
        overall = _pct(self.checkin_impact.get("overall_rate"))
        impact = _pct(self.checkin_impact.get("impact"))

        if overall is not None and overall < 0.5:
            return True
        if impact is not None and impact < 0:
            return True
        return False

    def _build_checkin_conversion_chain(self) -> list[dict]:
        """打卡带新效率低 → 打卡率? → 激励机制? → 次卡成本?"""
        chain = []
        ci = self.checkin_impact
        overall_rate = _pct(ci.get("overall_rate"))
        impact = _pct(ci.get("impact"))
        checkin_target = self._get_checkin_target()

        # Why 1
        desc = []
        if overall_rate is not None:
            desc.append(f"打卡率{overall_rate:.1%}（目标{checkin_target:.1%}）")
        if impact is not None:
            desc.append(f"打卡带新影响系数{impact:.2f}")
        chain.append(self._make_why(
            1,
            "为什么打卡带新效率低？",
            "，".join(desc) + "，打卡分享未有效转化为注册" if desc else "打卡带新转化率偏低",
            {
                "metric": "overall_rate",
                "actual": round(overall_rate, 4) if overall_rate is not None else None,
                "target": round(checkin_target, 4),
            } if overall_rate is not None else None,
        ))

        # Why 2: 打卡率
        if overall_rate is not None and overall_rate < checkin_target:
            chain.append(self._make_why(
                2,
                "为什么打卡率低？",
                f"实际打卡率{overall_rate:.1%}低于目标{checkin_target:.1%}，学员分享行为激活不足，打卡 SOP 执行不到位",
                {"metric": "checkin_rate", "actual": round(overall_rate, 4), "target": round(checkin_target, 4)},
            ))
        else:
            chain.append(self._make_why(
                2,
                "为什么打卡后带新转化低？",
                "打卡率达标，但打卡内容对新用户吸引力不足，或分享链路存在摩擦（二维码失效/落地页体验差）",
                None,
            ))

        # Why 3: 激励机制
        chain.append(self._make_why(
            3,
            "为什么学员打卡积极性低？",
            "激励体系未形成持续驱动力：一次性奖励吸引力有限，缺乏阶梯式/长期激励机制",
            None,
        ))

        # Why 4: 根因
        chain.append(self._make_why(
            4,
            "为什么激励成本过高或效果衰减？",
            "次卡成本结构未与激励ROI挂钩。建议：① 设计阶梯激励（带来1/3/5人分别对应不同奖励）② 减少一次性奖励，改为连续性奖励 ③ 测试低成本高感知激励品（排行榜荣誉/专属社群）",
            None,
            is_root=True,
        ))

        return chain[:5]

    # ── 新增：产品维度链（客单价下降）────────────────────────────────────────────

    def _is_unit_price_anomalous(self) -> bool:
        """客单价异常：实际客单价 < 目标 * 0.93"""
        unit_price = self._get_unit_price()
        unit_target = self._get_unit_price_target()
        if unit_price is None:
            return False
        return unit_price < unit_target * 0.93

    def _build_unit_price_chain(self) -> list[dict]:
        """客单价下降 → 低价套餐占比↑ → 新用户首购偏好 → 捆绑升级策略"""
        chain = []
        unit_price = self._get_unit_price()
        unit_target = self._get_unit_price_target()
        if unit_price is None:
            return chain

        gap_display = f"{abs(unit_price - unit_target):.0f}USD"

        # Why 1: 客单价低于目标
        chain.append(self._make_why(
            1,
            f"为什么客单价低于目标？",
            f"实际客单价{unit_price:.0f}USD，目标{unit_target:.0f}USD，差距{gap_display}，整体成交偏低价套餐",
            {"metric": "unit_price", "actual": round(unit_price, 2), "target": round(unit_target, 2)},
        ))

        # Why 2: 低价套餐占比
        low_pkg_pct = _pct(self.package_mix.get("low_tier_ratio"))
        if low_pkg_pct is not None:
            chain.append(self._make_why(
                2,
                "为什么成交集中在低价套餐？",
                f"低价套餐成交占比{low_pkg_pct:.1%}，超出合理阈值（建议≤50%），高价值套餐推荐不足",
                {"metric": "low_tier_ratio", "actual": round(low_pkg_pct, 4), "threshold": 0.50},
            ))
        else:
            chain.append(self._make_why(
                2,
                "为什么成交集中在低价套餐？",
                "套餐结构数据暂缺，推测转介绍新用户首购偏好短期低成本课包（≤12节），高价套餐转化路径不清晰",
                None,
            ))

        # Why 3: 新用户首购偏好
        chain.append(self._make_why(
            3,
            "为什么新用户倾向低价首购？",
            "转介绍用户信任感较强但决策谨慎，CC未系统引导学员从低价升级到高价套餐；缺乏首购后的升级跟进SOP",
            None,
        ))

        # Why 4: 缺乏升级路径
        chain.append(self._make_why(
            4,
            "为什么没有有效的套餐升级引导？",
            "CC话术以成交为终点，未设计付费后72小时升级窗口；激励政策按单量而非金额计算，CC缺乏推高价套餐动力",
            None,
        ))

        # Why 5: 根因
        chain.append(self._make_why(
            5,
            "为什么激励与高价套餐脱钩？",
            "绩效体系以付费单量为核心KPI，高价套餐贡献未被充分激励。建议：①引入金额权重系数进入CC绩效 ②设计捆绑升级策略（首购+续费承诺折扣）③付费后72h升级话术SOP",
            None,
            is_root=True,
        ))

        return chain[:5]

    # ── 新增：季节性维度链（月度波动）────────────────────────────────────────────

    def _is_seasonal_anomalous(self) -> bool:
        """季节性异常：实际低于时间进度且季节性因子 > 0.1（当前月处于低谷期）"""
        if not self.seasonal_data:
            return False
        seasonal_factor = _pct(self.seasonal_data.get("seasonal_factor"))
        yoy_gap = _pct(self.seasonal_data.get("yoy_gap"))
        # 如果季节性因子异常偏低或同比缺口明显
        if seasonal_factor is not None and seasonal_factor < 0.85:
            return True
        if yoy_gap is not None and yoy_gap < -0.10:
            return True
        return False

    def _build_seasonality_chain(self) -> list[dict]:
        """月度波动 → 泰国节假日/学期影响 → 历史同期对比 → 提前备战期建议"""
        chain = []
        seasonal_factor = _pct(self.seasonal_data.get("seasonal_factor"))
        yoy_gap = _pct(self.seasonal_data.get("yoy_gap"))
        low_period = self.seasonal_data.get("period_label", "当前月")
        holiday_names = self.seasonal_data.get("upcoming_holidays", [])
        holiday_str = "、".join(holiday_names[:3]) if holiday_names else "泰国节假日/学校假期"

        # Why 1
        desc = []
        if seasonal_factor is not None:
            desc.append(f"季节性指数{seasonal_factor:.2f}（1.0为基准，低于0.85为低谷期）")
        if yoy_gap is not None:
            desc.append(f"同比去年同期下滑{abs(yoy_gap):.1%}")
        chain.append(self._make_why(
            1,
            f"为什么{low_period}业绩明显波动？",
            "、".join(desc) + f"，{low_period}处于季节性低谷" if desc else f"{low_period}处于历史低谷区间",
            {
                "metric": "seasonal_factor",
                "actual": round(seasonal_factor, 3) if seasonal_factor is not None else None,
                "benchmark": 1.0,
            } if seasonal_factor is not None else None,
        ))

        # Why 2: 节假日/学期影响
        chain.append(self._make_why(
            2,
            "为什么该时期是低谷？",
            f"{holiday_str}期间，家长/学生注意力分散，体验课预约出席率下降，学员带新积极性降低",
            {"metric": "holiday_impact", "holidays": holiday_names},
        ))

        # Why 3: 历史同期对比
        hist_avg = _pct(self.seasonal_data.get("historical_avg"))
        if hist_avg is not None:
            chain.append(self._make_why(
                3,
                "历史同期表现如何？",
                f"历史同期日均{hist_avg:.0f}笔付费，本期节奏偏慢，与历史规律吻合（季节性正常波动，非异常衰退）",
                {"metric": "historical_avg", "actual": round(hist_avg, 2)},
            ))
        else:
            chain.append(self._make_why(
                3,
                "历史同期表现如何？",
                "历史同期数据暂缺（需积累≥2个周期快照），当前判断基于季节性指数估算",
                None,
            ))

        # Why 4: 未提前备战
        chain.append(self._make_why(
            4,
            "为什么低谷期前未提前储备pipeline？",
            "运营计划未将季节性低谷纳入月度规划，低谷前4-6周未集中外呼提升参与率储备，导致低谷期无缓冲",
            None,
        ))

        # Why 5: 根因
        chain.append(self._make_why(
            5,
            "为什么缺乏季节性应对机制？",
            f"运营SOP缺少季节性应对预案。建议：①每年初梳理泰国节假日/学期节点 ②低谷前6周启动冲刺储备计划（增加外呼/激励双倍）③低谷期转向维护存量质量（打卡/社群活跃度）",
            None,
            is_root=True,
        ))

        return chain[:5]

    # ── 新增：渠道ROI效率链（渠道成本与转化对比）────────────────────────────────

    def _get_low_roi_channels(self) -> list[dict]:
        """从 channel_roi 提取高成本低转化渠道"""
        roi_data = self.channel_roi
        if not roi_data:
            # 尝试从 channel_comparison 计算简单贡献率
            return []

        channels = roi_data if isinstance(roi_data, list) else roi_data.get("channels", [])
        if not isinstance(channels, list):
            return []

        avg_roi = None
        roi_values = [_pct(c.get("roi")) for c in channels if _pct(c.get("roi")) is not None]
        if roi_values:
            avg_roi = sum(roi_values) / len(roi_values)

        anomalous = []
        for ch in channels:
            if not isinstance(ch, dict):
                continue
            roi = _pct(ch.get("roi"))
            cost_pct = _pct(ch.get("cost_ratio"))
            paid_pct = _pct(ch.get("paid_ratio"))

            # 高成本低产出：ROI < 0.7×平均，或成本占比 > 2×付费占比
            is_low = False
            if roi is not None and avg_roi is not None and roi < avg_roi * 0.7:
                is_low = True
            if cost_pct is not None and paid_pct is not None and paid_pct > 0 and cost_pct > paid_pct * 2.0:
                is_low = True
            if is_low:
                anomalous.append({**ch, "_avg_roi": avg_roi})

        return anomalous

    def _build_channel_roi_chain(self, channel_name: str, ch_data: dict) -> list[dict]:
        """渠道ROI差异 → 高成本低转化渠道识别 → 资源重分配建议"""
        chain = []
        roi = _pct(ch_data.get("roi"))
        avg_roi = ch_data.get("_avg_roi")
        cost_pct = _pct(ch_data.get("cost_ratio"))
        paid_pct = _pct(ch_data.get("paid_ratio"))

        # Why 1
        if roi is not None and avg_roi is not None:
            chain.append(self._make_why(
                1,
                f"为什么{channel_name}渠道ROI低于平均水平？",
                f"该渠道ROI{roi:.2f}，低于全渠道均值{avg_roi:.2f}（偏低{(avg_roi - roi) / avg_roi:.1%}），投入产出不对等",
                {"metric": "channel_roi", "actual": round(roi, 3), "avg": round(avg_roi, 3)},
            ))
        else:
            chain.append(self._make_why(
                1,
                f"为什么{channel_name}渠道存在资源错配？",
                f"成本占比{cost_pct:.1%}，付费贡献{paid_pct:.1%}，成本显著高于产出" if cost_pct and paid_pct else f"{channel_name}渠道成本效益异常",
                {"metric": "cost_paid_ratio", "cost_pct": cost_pct, "paid_pct": paid_pct},
            ))

        # Why 2: 转化漏斗分析
        reg_rate = _pct(ch_data.get("register_paid_rate"))
        paid_target = self._get_paid_target()
        if reg_rate is not None:
            if reg_rate < paid_target:
                chain.append(self._make_why(
                    2,
                    f"为什么{channel_name}渠道成本高但转化低？",
                    f"注册付费转化率{reg_rate:.1%}（目标{paid_target:.1%}），注册量变付费的漏斗损耗严重",
                    {"metric": "register_paid_rate", "actual": round(reg_rate, 4), "target": round(paid_target, 4)},
                ))
            else:
                chain.append(self._make_why(
                    2,
                    f"为什么{channel_name}渠道成本高？",
                    f"转化率{reg_rate:.1%}达标，成本高在获客阶段（CPR偏高），需优化广告投放或合作方案",
                    {"metric": "register_paid_rate", "actual": round(reg_rate, 4), "target": round(paid_target, 4)},
                ))
        else:
            chain.append(self._make_why(
                2,
                f"为什么{channel_name}渠道转化低？",
                "该渠道获客质量参差（用户意图不明确），CC跟进投入大但成单率低",
                None,
            ))

        # Why 3: 获客质量
        chain.append(self._make_why(
            3,
            f"为什么{channel_name}渠道获客质量低？",
            "该渠道用户画像与目标学员（有付费能力的家长/成人学习者）匹配度低，或渠道触达场景与购买决策脱节",
            None,
        ))

        # Why 4: 资源重分配
        chain.append(self._make_why(
            4,
            f"为什么未及时调整{channel_name}渠道资源投入？",
            "渠道ROI监控未建立月度复盘机制，高ROI渠道未获得更多资源倾斜，形成资源错配惯性",
            None,
        ))

        # Why 5: 根因
        chain.append(self._make_why(
            5,
            "为什么渠道资源分配缺乏ROI导向？",
            f"资源分配依赖历史惯例而非数据驱动。建议：①建立渠道ROI月报（CPR/CPA/ROAS三维）②每月按ROI重排渠道预算优先级 ③{channel_name}渠道暂停或缩减投入，资源向ROI前2渠道集中",
            None,
            is_root=True,
        ))

        return chain[:5]

    # ── 新增：CC个人效率差异链（高低效对比）────────────────────────────────────

    def _get_cc_efficiency_gap(self) -> Optional[dict]:
        """从 cc_individual 计算高效/低效 CC 的效率差异"""
        if not self.cc_individual or not isinstance(self.cc_individual, list):
            return None

        scores = [_pct(cc.get("composite_score")) for cc in self.cc_individual
                  if _pct(cc.get("composite_score")) is not None]
        if len(scores) < 2:
            return None

        scores_sorted = sorted(scores, reverse=True)
        top_avg = sum(scores_sorted[:max(1, len(scores_sorted) // 4)]) / max(1, len(scores_sorted) // 4)
        bottom_avg = sum(scores_sorted[-max(1, len(scores_sorted) // 4):]) / max(1, len(scores_sorted) // 4)

        if top_avg <= 0 or bottom_avg >= top_avg * 0.75:
            return None  # 差距不显著

        gap_ratio = (top_avg - bottom_avg) / top_avg
        top_cc_count = max(1, len(scores_sorted) // 4)
        bottom_cc_count = max(1, len(scores_sorted) // 4)

        return {
            "top_avg_score": round(top_avg, 3),
            "bottom_avg_score": round(bottom_avg, 3),
            "gap_ratio": round(gap_ratio, 3),
            "top_cc_count": top_cc_count,
            "bottom_cc_count": bottom_cc_count,
            "total_cc": len(scores),
        }

    def _build_cc_individual_chain(self, gap_info: dict) -> list[dict]:
        """人均产出差异 → 高/低效CC特征 → 培训/激励建议"""
        chain = []
        top_avg = gap_info["top_avg_score"]
        bottom_avg = gap_info["bottom_avg_score"]
        gap_ratio = gap_info["gap_ratio"]
        top_n = gap_info["top_cc_count"]
        bottom_n = gap_info["bottom_cc_count"]
        total_n = gap_info["total_cc"]

        # Why 1: 效率差距
        chain.append(self._make_why(
            1,
            "为什么CC团队内部效率差距悬殊？",
            f"综合得分：高效CC（前{top_n}名）均值{top_avg:.3f}，低效CC（后{bottom_n}名）均值{bottom_avg:.3f}，差距{gap_ratio:.1%}。团队整体被低效CC拉低",
            {"metric": "cc_score_gap", "top_avg": top_avg, "bottom_avg": bottom_avg, "gap_ratio": gap_ratio},
        ))

        # Why 2: 低效CC特征分析
        low_cc_chars = []
        for cc in self.cc_individual:
            score = _pct(cc.get("composite_score"))
            if score is not None and score <= bottom_avg * 1.1:
                process = _pct(cc.get("process_score"))
                result = _pct(cc.get("result_score"))
                if process is not None and result is not None and process < result * 0.7:
                    low_cc_chars.append("过程指标（外呼/跟进）弱于结果指标")
                elif process is not None and result is not None and result < process * 0.7:
                    low_cc_chars.append("结果指标（注册/付费）弱于过程投入")

        char_desc = "、".join(set(low_cc_chars[:2])) if low_cc_chars else "过程执行力弱（外呼量不足/跟进不及时）或转化能力低（话术不达标）"
        chain.append(self._make_why(
            2,
            "低效CC的共同特征是什么？",
            f"低效CC主要表现：{char_desc}。高效与低效CC差距主要来自过程执行一致性，而非资源差异",
            {"metric": "low_cc_characteristics", "chars": list(set(low_cc_chars))},
        ))

        # Why 3: 培训体系
        chain.append(self._make_why(
            3,
            "为什么低效CC无法快速追赶？",
            f"团队共{total_n}名CC，但高效话术和跟进SOP未被系统化传递：①无标准化录音库 ②师带徒机制缺失 ③低效CC缺乏个性化辅导计划",
            None,
        ))

        # Why 4: 激励机制
        chain.append(self._make_why(
            4,
            "为什么激励机制未能拉平效率差距？",
            "激励体系以团队结果为主，个人差异化激励不足；高效CC缺乏向团队分享动力（分享最佳实践等于培养竞争对手）",
            None,
        ))

        # Why 5: 根因
        chain.append(self._make_why(
            5,
            "为什么CC能力提升体系不健全？",
            f"缺乏数据驱动的CC成长路径。建议：①每月发布CC能力雷达图 ②Top CC话术录音提取为SOP，纳入新人培训 ③设计知识分享激励（分享加分/认证勋章）④对后{bottom_n}名CC制定90天改进计划",
            None,
            is_root=True,
        ))

        return chain[:5]

    # ── 原有行动建议 ─────────────────────────────────────────────────────────────

    def _get_action_and_impact(self, metric_key: str, gap_pct: float) -> tuple[str, float]:
        """返回 (行动建议, 预估损失USD)"""
        if metric_key == "registration":
            checkin = self._get_checkin_rate()
            checkin_target = self._get_checkin_target()
            gap_points = abs((checkin or checkin_target) - checkin_target)
            impact = round(gap_points * self._calc_impact_per_point("checkin_rate"), 0)
            return "增加CC外呼频次，优先覆盖新围场0-30天学员；优化打卡激励机制提升分享裂变", impact

        if metric_key == "payment":
            attend = self._get_attend_rate()
            attend_target = self._get_attend_target()
            gap_points = abs((attend or attend_target) - attend_target)
            impact = round(gap_points * self._calc_impact_per_point("attend_rate"), 0)
            return "强化体验课邀约，提升约课率和到课率；CC课后2小时内跟进促单", impact

        if metric_key == "revenue":
            rev_node = self.summary.get("revenue", {})
            abs_gap = abs(_pct(rev_node.get("absolute_gap", 0)) or 0)
            return "同步提升付费数量和客单价：推荐高价套餐，缩短成交周期", abs_gap

        return "根据业务优先级制定行动计划", 0.0

    # ── 主分析方法 ───────────────────────────────────────────────────────────────

    def analyze(self) -> dict:
        """对所有异常指标执行 5-Why 分析，支持总量/渠道/围场/人效四个维度"""
        analyses = []

        # ── 1. 总量级三条链 ──────────────────────────────────────────────────────
        metric_config = [
            {"key": "registration", "label": "注册数", "chain_fn": self._build_registration_chain},
            {"key": "payment",      "label": "付费数", "chain_fn": self._build_payment_chain},
            {"key": "revenue",      "label": "收入",   "chain_fn": self._build_revenue_chain},
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

            root_cause = why_chain[-1].get("answer", "根因待深入分析") if why_chain else "数据不足，无法完成完整因果链"

            analyses.append({
                "trigger": f"{m['label']}低于时间进度 {gap_display}",
                "trigger_metric": key,
                "trigger_label": m["label"],
                "trigger_description": f"{m['label']}低于时间进度 {gap_display}",
                "severity": status,
                "category": "total",
                "why_chain": why_chain,
                "root_cause": root_cause,
                "action": action,
                "expected_impact_usd": impact,
            })

        # ── 2. 渠道维度 ──────────────────────────────────────────────────────────
        for ch in self._get_anomalous_channels():
            name = ch.get("name") or ch.get("channel") or "未知渠道"
            chain = self._build_channel_registration_chain(name, ch)
            if not chain:
                continue
            paid_rate = ch.get("_paid_rate", 0)
            paid_target = ch.get("_paid_target", self._get_paid_target())
            gap_pts = abs(paid_rate - paid_target)
            impact = round(gap_pts * self._calc_impact_per_point("channel_paid_rate"), 0)
            total_loss += impact
            root_cause = chain[-1].get("answer", "渠道专属SOP待建立")

            analyses.append({
                "trigger": f"{name}渠道注册付费率低于目标 {gap_pts:.1%}",
                "trigger_metric": f"channel_{name}",
                "trigger_label": f"{name}渠道",
                "trigger_description": f"{name}渠道注册付费率{paid_rate:.1%}，低于目标{paid_target:.1%}",
                "severity": "red" if gap_pts > 0.05 else "yellow",
                "category": "channel",
                "why_chain": chain,
                "root_cause": root_cause,
                "action": f"针对{name}渠道制定专属跟进SOP，重点提升约课率和出席率；CC资源向该渠道倾斜",
                "expected_impact_usd": impact,
            })

        # ── 3. 围场维度 ──────────────────────────────────────────────────────────
        for enc in self._get_anomalous_enclosures():
            enc_name = enc.get("enclosure") or enc.get("range") or enc.get("segment") or "未知围场"
            chain = self._build_enclosure_chain(enc_name, enc)
            if not chain:
                continue
            roi = _pct(enc.get("roi_index")) or 0
            gap_pts = max(0.0, 1.0 - roi)
            impact = round(gap_pts * self._calc_impact_per_point("enclosure_roi"), 0)
            total_loss += impact
            root_cause = chain[-1].get("answer", "围场SOP待建立")

            analyses.append({
                "trigger": f"{enc_name}围场ROI指数{roi:.2f}低于基准",
                "trigger_metric": f"enclosure_{enc_name}",
                "trigger_label": f"{enc_name}围场",
                "trigger_description": f"{enc_name}围场ROI{roi:.2f}，触达率{enc.get('reach_rate', 0):.1%}",
                "severity": "red" if roi < 0.6 else "yellow",
                "category": "enclosure",
                "why_chain": chain,
                "root_cause": root_cause,
                "action": f"优先在{enc_name}围场增加CC外呼覆盖，制定差异化激励方案；按ROI重新分配CC资源优先级",
                "expected_impact_usd": impact,
            })

        # ── 4. 人效维度 ──────────────────────────────────────────────────────────
        if self._is_productivity_anomalous():
            chain = self._build_productivity_chain()
            avg_calls = _pct(self.productivity.get("avg_calls_per_day"))
            calls_target = _pct(self.targets.get("outreach_calls_per_day", 30)) or 30
            gap_pts = max(0.0, (calls_target - (avg_calls or calls_target)) / calls_target)
            impact = round(gap_pts * self._calc_impact_per_point("productivity"), 0)
            total_loss += impact
            root_cause = chain[-1].get("answer", "培训和工具效率待提升") if chain else "CC人效待优化"

            analyses.append({
                "trigger": f"CC日均外呼{avg_calls:.1f}次，低于目标{calls_target:.0f}次" if avg_calls is not None else "CC人效指标异常",
                "trigger_metric": "cc_productivity",
                "trigger_label": "CC人效",
                "trigger_description": "日均外呼或有效通话率低于基准",
                "severity": "red" if gap_pts > 0.15 else "yellow",
                "category": "efficiency",
                "why_chain": chain,
                "root_cause": root_cause,
                "action": "提取Top CC话术形成SOP；引入自动拨号工具；每周话术复盘会；按围场优先级排序CC工作列表",
                "expected_impact_usd": impact,
            })

        # ── 5. 打卡转化维度 ───────────────────────────────────────────────────────
        if self._is_checkin_anomalous():
            chain = self._build_checkin_conversion_chain()
            overall = _pct(self.checkin_impact.get("overall_rate")) or 0
            gap_pts = max(0.0, self._get_checkin_target() - overall)
            impact = round(gap_pts * self._calc_impact_per_point("checkin_conversion"), 0)
            total_loss += impact
            root_cause = chain[-1].get("answer", "激励体系待优化") if chain else "打卡转化待改善"

            analyses.append({
                "trigger": f"打卡带新效率低，打卡率{overall:.1%}（目标{self._get_checkin_target():.1%}）",
                "trigger_metric": "checkin_conversion",
                "trigger_label": "打卡带新",
                "trigger_description": f"打卡率{overall:.1%}，带新转化影响系数{self.checkin_impact.get('impact', 'N/A')}",
                "severity": "red" if gap_pts > 0.1 else "yellow",
                "category": "efficiency",
                "why_chain": chain,
                "root_cause": root_cause,
                "action": "设计阶梯激励体系（带来1/3/5人对应不同奖励）；优化打卡分享链路减少摩擦；测试非物质激励（排行榜/社群荣誉）",
                "expected_impact_usd": impact,
            })

        # ── 6. 产品维度：客单价下降 ──────────────────────────────────────────────
        if self._is_unit_price_anomalous():
            chain = self._build_unit_price_chain()
            unit_price = self._get_unit_price() or self._get_unit_price_target()
            unit_target = self._get_unit_price_target()
            gap_pts = max(0.0, (unit_target - unit_price) / unit_target)
            impact = round(gap_pts * self._calc_impact_per_point("unit_price"), 0)
            total_loss += impact
            root_cause = chain[-1].get("answer", "套餐升级机制待建立") if chain else "客单价结构待优化"

            analyses.append({
                "trigger": f"客单价{unit_price:.0f}USD低于目标{unit_target:.0f}USD",
                "trigger_metric": "unit_price",
                "trigger_label": "客单价",
                "trigger_description": f"客单价{unit_price:.0f}USD（目标{unit_target:.0f}USD），低价套餐占比偏高",
                "severity": "red" if gap_pts > 0.1 else "yellow",
                "category": "product",
                "why_chain": chain,
                "root_cause": root_cause,
                "action": "引入金额权重绩效系数；设计首购+升级承诺折扣捆绑策略；制定付费后72小时升级话术SOP",
                "expected_impact_usd": impact,
            })

        # ── 7. 季节性维度：月度波动 ──────────────────────────────────────────────
        if self._is_seasonal_anomalous():
            chain = self._build_seasonality_chain()
            seasonal_factor = _pct(self.seasonal_data.get("seasonal_factor")) or 0.85
            gap_pts = max(0.0, 1.0 - seasonal_factor)
            impact = round(gap_pts * self._calc_impact_per_point("seasonality"), 0)
            total_loss += impact
            root_cause = chain[-1].get("answer", "季节性应对机制待建立") if chain else "季节性低谷期应对不足"
            period_label = self.seasonal_data.get("period_label", "当前月")

            analyses.append({
                "trigger": f"{period_label}季节性低谷，季节性指数{seasonal_factor:.2f}",
                "trigger_metric": "seasonality",
                "trigger_label": "季节性波动",
                "trigger_description": f"{period_label}处于季节性低谷期（指数{seasonal_factor:.2f}，基准1.0），节假日/学期影响",
                "severity": "yellow",
                "category": "seasonality",
                "why_chain": chain,
                "root_cause": root_cause,
                "action": "梳理全年泰国节假日/学期节点；低谷前6周启动冲刺储备；低谷期重点维护存量活跃度",
                "expected_impact_usd": impact,
            })

        # ── 8. 渠道ROI效率维度 ───────────────────────────────────────────────────
        for ch_data in self._get_low_roi_channels():
            ch_name = ch_data.get("name") or ch_data.get("channel") or "未知渠道"
            chain = self._build_channel_roi_chain(ch_name, ch_data)
            if not chain:
                continue
            roi = _pct(ch_data.get("roi")) or 0
            avg_roi = ch_data.get("_avg_roi") or 1.0
            gap_pts = max(0.0, (avg_roi - roi) / avg_roi)
            impact = round(gap_pts * self._calc_impact_per_point("channel_roi"), 0)
            total_loss += impact
            root_cause = chain[-1].get("answer", "渠道ROI复盘机制待建立") if chain else "渠道资源错配"

            analyses.append({
                "trigger": f"{ch_name}渠道ROI{roi:.2f}低于均值{avg_roi:.2f}",
                "trigger_metric": f"channel_roi_{ch_name}",
                "trigger_label": f"{ch_name}渠道ROI",
                "trigger_description": f"{ch_name}渠道ROI{roi:.2f}，低于全渠道均值{avg_roi:.2f}，高成本低产出",
                "severity": "red" if gap_pts > 0.3 else "yellow",
                "category": "channel_roi",
                "why_chain": chain,
                "root_cause": root_cause,
                "action": f"建立渠道ROI月报；暂减{ch_name}渠道预算，向ROI最高渠道集中；优化{ch_name}渠道获客质量筛选标准",
                "expected_impact_usd": impact,
            })

        # ── 9. CC个人效率差异维度 ────────────────────────────────────────────────
        cc_gap_info = self._get_cc_efficiency_gap()
        if cc_gap_info is not None:
            chain = self._build_cc_individual_chain(cc_gap_info)
            gap_ratio = cc_gap_info["gap_ratio"]
            impact = round(gap_ratio * self._calc_impact_per_point("cc_individual"), 0)
            total_loss += impact
            root_cause = chain[-1].get("answer", "CC能力提升体系待建立") if chain else "团队效率分化"

            analyses.append({
                "trigger": f"CC效率差距{gap_ratio:.1%}，高效/低效CC得分差距显著",
                "trigger_metric": "cc_individual_gap",
                "trigger_label": "CC效率差距",
                "trigger_description": f"高效CC均分{cc_gap_info['top_avg_score']:.3f}，低效CC均分{cc_gap_info['bottom_avg_score']:.3f}，差距{gap_ratio:.1%}",
                "severity": "yellow" if gap_ratio < 0.3 else "red",
                "category": "cc_individual",
                "why_chain": chain,
                "root_cause": root_cause,
                "action": "提取Top CC话术录音形成SOP；建立师带徒辅导机制；引入CC能力雷达图月度可视化；对后25%CC制定90天改进计划",
                "expected_impact_usd": impact,
            })

        # ── 汇总文本 ──────────────────────────────────────────────────────────────
        anomaly_count = len(analyses)
        if anomaly_count == 0:
            summary_text = "所有核心指标均达时间进度，无需5-Why归因"
        else:
            top = max(analyses, key=lambda x: x["expected_impact_usd"], default=None)
            top_label = top["trigger_label"] if top else "未知"
            top_impact = top["expected_impact_usd"] if top else 0

            # 按 category 统计
            cat_counts: dict[str, int] = {}
            for a in analyses:
                cat = a.get("category", "total")
                cat_counts[cat] = cat_counts.get(cat, 0) + 1

            cat_labels = {
                "total": "总量指标", "channel": "渠道", "enclosure": "围场", "efficiency": "人效",
                "product": "产品定价", "seasonality": "季节性", "channel_roi": "渠道ROI", "cc_individual": "CC个人效率",
            }
            cat_summary = "、".join(
                f"{cat_labels.get(k, k)}{v}项" for k, v in cat_counts.items()
            )
            summary_text = (
                f"发现{anomaly_count}个异常（{cat_summary}），"
                f"最大根因：{top_label}不足"
                f"（预计损失${top_impact:,.0f}），"
                f"合计预估损失${total_loss:,.0f}"
            )

        return {
            "analyses": analyses,
            "summary_text": summary_text,
            "generated_at": datetime.now().isoformat(),
        }

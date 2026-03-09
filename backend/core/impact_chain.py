"""
M13 影响链计算引擎
每个效率指标的 gap → 学员损失 → 注册损失 → 付费损失 → $损失

6条因果链：
- reach_rate (触达率): gap → 未触达学员 → 损失参与 → 损失注册 → 损失付费 → $损失
- participation_rate (参与率): gap → 损失参与学员 → 损失注册 → 损失付费 → $损失
- checkin_rate (打卡率): gap → 未打卡分享学员 → 损失裂变注册 → 损失付费 → $损失
- reserve_rate (约课率): gap → 未约课学员 → 损失出席 → 损失付费 → $损失
- attend_rate (出席率): gap → 缺席学员 → 损失付费 → $损失
- conversion_rate (转化率): gap → 损失付费 → $损失
"""

from __future__ import annotations

from typing import Optional

from backend.core.config import EXCHANGE_RATE_THB_USD

# 默认参数
_DEFAULT_ASP_USD = 850.0
_DEFAULT_CONVERSION = 0.23

# 指标元数据
_METRIC_META = {
    "reach_rate": {
        "label": "触达率",
        "steps": [
            ("lost_unreached_students", "未触达学员"),
            ("lost_active_students", "损失活跃学员"),
            ("lost_registrations", "损失注册"),
            ("lost_payments", "损失付费"),
            ("lost_revenue_usd", "损失收入($)"),
            ("lost_revenue_thb", "损失收入(฿)"),
        ],
    },
    "participation_rate": {
        "label": "参与率",
        "steps": [
            ("lost_active_students", "损失参与学员"),
            ("lost_registrations", "损失注册"),
            ("lost_payments", "损失付费"),
            ("lost_revenue_usd", "损失收入($)"),
            ("lost_revenue_thb", "损失收入(฿)"),
        ],
    },
    "checkin_rate": {
        "label": "打卡率",
        "steps": [
            ("lost_active_students", "损失活跃学员"),
            ("lost_registrations", "损失裂变注册"),
            ("lost_payments", "损失付费"),
            ("lost_revenue_usd", "损失收入($)"),
            ("lost_revenue_thb", "损失收入(฿)"),
        ],
    },
    "reserve_rate": {
        "label": "约课率",
        "steps": [
            ("lost_unreserved_students", "未约课学员"),
            ("lost_attended_students", "损失出席学员"),
            ("lost_payments", "损失付费"),
            ("lost_revenue_usd", "损失收入($)"),
            ("lost_revenue_thb", "损失收入(฿)"),
        ],
    },
    "attend_rate": {
        "label": "出席率",
        "steps": [
            ("lost_attended_students", "缺席学员"),
            ("lost_payments", "损失付费"),
            ("lost_revenue_usd", "损失收入($)"),
            ("lost_revenue_thb", "损失收入(฿)"),
        ],
    },
    "conversion_rate": {
        "label": "转化率",
        "steps": [
            ("lost_payments", "损失付费"),
            ("lost_revenue_usd", "损失收入($)"),
            ("lost_revenue_thb", "损失收入(฿)"),
        ],
    },
}


def _safe_float(v) -> Optional[float]:
    """安全转 float，None / 0 / 空字符串都返回 None"""
    if v is None:
        return None
    try:
        f = float(v)
        return f if f > 0 else None
    except (TypeError, ValueError):
        return None


def _safe_pct(a, b) -> Optional[float]:
    try:
        if b is None or float(b) == 0:
            return None
        return float(a or 0) / float(b)
    except (TypeError, ZeroDivisionError):
        return None


class ImpactChainEngine:
    """影响链计算引擎：从分析缓存中提取效率指标，量化 gap 的下游业务损失"""

    def __init__(self, summary: dict, targets: dict, funnel: dict) -> None:
        self.summary = summary or {}
        self.targets = targets or {}
        self.funnel = funnel or {}

        # 从 funnel 取 total 通道（已经由 _adapt_funnel 适配为前端格式）
        # 兼容原始引擎格式（total.rates.*）和适配后格式（total.*）
        total = self.funnel.get("total") or {}
        rates = total.get("rates") or total  # 兼容两种结构

        # 有效学员数（valid_students）
        self._valid_students: float = float(total.get("valid_students") or 0)

        # 各漏斗指标实际值
        self._actual_reach: Optional[float] = _safe_float(
            rates.get("contact_rate") or total.get("contact_rate")
        )
        self._actual_participation: Optional[float] = _safe_float(
            rates.get("participation_rate") or total.get("participation_rate")
        )
        self._actual_checkin: Optional[float] = _safe_float(
            rates.get("checkin_rate") or total.get("checkin_rate")
        )
        self._actual_reserve: Optional[float] = _safe_float(rates.get("reserve_rate"))
        self._actual_attend: Optional[float] = _safe_float(rates.get("attend_rate"))
        self._actual_conversion: Optional[float] = _safe_float(
            rates.get("register_paid_rate")
            or rates.get("conversion_rate")
            or total.get("conversion_rate")
        )

        # 也从 summary 尝试补充（checkin 从 summary 更可靠）
        checkin_block = self.summary.get("checkin_24h") or {}
        if self._actual_checkin is None:
            raw_rate = checkin_block.get("rate")
            self._actual_checkin = _safe_float(raw_rate)

        # 注册数、约课数、出席数（用于约课率/出席率的 upstream_base）
        total_reg = float(total.get("register") or total.get("registrations") or 0)
        total_reserve = float(total.get("reserve") or 0)

        # 目标值
        asp = _safe_float(self.targets.get("客单价")) or _DEFAULT_ASP_USD
        self._asp_usd = asp
        self._target_conversion = (
            _safe_float(self.targets.get("目标转化率")) or _DEFAULT_CONVERSION
        )
        self._target_reserve = _safe_float(self.targets.get("约课率目标")) or 0.77
        self._target_attend = _safe_float(self.targets.get("出席率目标")) or 0.66
        self._target_checkin: float = float(checkin_block.get("target") or 0.60)
        # 触达率、参与率目标没有显式配置，用相对基准
        # 触达率目标：参考业内典型值 0.80（若无配置）
        self._target_reach = _safe_float(self.targets.get("触达率目标")) or 0.80
        # 参与率目标：参考 0.50（若无配置）
        self._target_participation = _safe_float(self.targets.get("参与率目标")) or 0.50

        # 漏斗基数
        self._reg_base = (
            total_reg
            if total_reg > 0
            else float(
                (
                    self.summary.get("registration")
                    or self.summary.get("registrations")
                    or {}
                ).get("actual")
                or 0
            )
        )
        self._reserve_base = total_reserve

    # ── 核心计算方法 ──────────────────────────────────────────────────────────

    def _compute_chain(
        self,
        metric: str,
        actual_rate: Optional[float],
        target_rate: Optional[float],
        upstream_base: float,
    ) -> Optional[dict]:
        """
        计算单条影响链。
        仅当 target_rate > actual_rate（存在负向 gap）时才有损失。
        """
        if actual_rate is None or target_rate is None:
            return None
        if upstream_base <= 0:
            return None
        if target_rate <= actual_rate:
            return None  # 已达标，无损失

        gap = actual_rate - target_rate  # 负数
        meta = _METRIC_META.get(metric, {})
        label = meta.get("label", metric)
        step_defs = meta.get("steps", [])

        # ── 各条链的因果计算 ──────────────────────────────────────────────────
        lost_payments: float = 0.0
        lost_revenue_usd: float = 0.0
        step_values: dict[str, float] = {}

        abs_gap = abs(gap)

        if metric == "reach_rate":
            lost_unreached = round(abs_gap * upstream_base)
            # 未触达 → 参与损失（按参与率折算）
            par_rate = self._actual_participation or self._target_participation
            lost_active = round(lost_unreached * par_rate)
            lost_reg = round(lost_active)  # 参与≈注册（简化）
            lost_payments = round(lost_reg * self._target_conversion)
            lost_revenue_usd = round(lost_payments * self._asp_usd, 2)
            step_values = {
                "lost_unreached_students": lost_unreached,
                "lost_active_students": lost_active,
                "lost_registrations": lost_reg,
                "lost_payments": lost_payments,
                "lost_revenue_usd": lost_revenue_usd,
                "lost_revenue_thb": round(lost_revenue_usd * EXCHANGE_RATE_THB_USD),
            }

        elif metric == "participation_rate":
            lost_active = round(abs_gap * upstream_base)
            lost_reg = lost_active  # 参与=注册（简化）
            lost_payments = round(lost_reg * self._target_conversion)
            lost_revenue_usd = round(lost_payments * self._asp_usd, 2)
            step_values = {
                "lost_active_students": lost_active,
                "lost_registrations": lost_reg,
                "lost_payments": lost_payments,
                "lost_revenue_usd": lost_revenue_usd,
                "lost_revenue_thb": round(lost_revenue_usd * EXCHANGE_RATE_THB_USD),
            }

        elif metric == "checkin_rate":
            lost_active = round(abs_gap * upstream_base)
            # 打卡裂变：每个打卡学员带新系数约 0.25（简化默认，无数据时）
            new_coeff = float(
                (self.funnel.get("total") or {}).get("new_coefficient") or 0.25
            )
            lost_reg = round(lost_active * new_coeff)
            lost_payments = round(lost_reg * self._target_conversion)
            lost_revenue_usd = round(lost_payments * self._asp_usd, 2)
            step_values = {
                "lost_active_students": lost_active,
                "lost_registrations": lost_reg,
                "lost_payments": lost_payments,
                "lost_revenue_usd": lost_revenue_usd,
                "lost_revenue_thb": round(lost_revenue_usd * EXCHANGE_RATE_THB_USD),
            }

        elif metric == "reserve_rate":
            lost_unreserved = round(abs_gap * upstream_base)
            # 未约课 → 未出席（出席率折算）
            att_rate = self._actual_attend or self._target_attend
            lost_attended = round(lost_unreserved * att_rate)
            lost_payments = round(lost_attended * self._target_conversion)
            lost_revenue_usd = round(lost_payments * self._asp_usd, 2)
            step_values = {
                "lost_unreserved_students": lost_unreserved,
                "lost_attended_students": lost_attended,
                "lost_payments": lost_payments,
                "lost_revenue_usd": lost_revenue_usd,
                "lost_revenue_thb": round(lost_revenue_usd * EXCHANGE_RATE_THB_USD),
            }

        elif metric == "attend_rate":
            lost_attended = round(abs_gap * upstream_base)
            lost_payments = round(lost_attended * self._target_conversion)
            lost_revenue_usd = round(lost_payments * self._asp_usd, 2)
            step_values = {
                "lost_attended_students": lost_attended,
                "lost_payments": lost_payments,
                "lost_revenue_usd": lost_revenue_usd,
                "lost_revenue_thb": round(lost_revenue_usd * EXCHANGE_RATE_THB_USD),
            }

        elif metric == "conversion_rate":
            lost_payments = round(abs_gap * upstream_base)
            lost_revenue_usd = round(lost_payments * self._asp_usd, 2)
            step_values = {
                "lost_payments": lost_payments,
                "lost_revenue_usd": lost_revenue_usd,
                "lost_revenue_thb": round(lost_revenue_usd * EXCHANGE_RATE_THB_USD),
            }

        else:
            return None

        # ── 组装 impact_steps ──────────────────────────────────────────────────
        impact_steps = [
            {
                "step": step_key,
                "value": step_values.get(step_key, 0),
                "label": step_label,
            }
            for step_key, step_label in step_defs
        ]

        lost_revenue_usd_val = step_values.get("lost_revenue_usd", 0.0)
        lost_revenue_thb_val = step_values.get("lost_revenue_thb", 0.0)

        return {
            "metric": metric,
            "metric_key": metric,
            "label": label,
            "actual": round(actual_rate, 4),
            "target": round(target_rate, 4),
            "gap": round(gap, 4),
            "impact_steps": impact_steps,
            "lost_payments": round(step_values.get("lost_payments", 0)),
            "lost_revenue_usd": round(lost_revenue_usd_val, 2),
            "lost_revenue_thb": round(lost_revenue_thb_val),
        }

    def compute_all_chains(self) -> dict:
        """计算所有效率指标的影响链，返回完整结构"""

        # 各指标的 (actual, target, upstream_base)
        metric_configs = [
            (
                "reach_rate",
                self._actual_reach,
                self._target_reach,
                self._valid_students,
            ),
            (
                "participation_rate",
                self._actual_participation,
                self._target_participation,
                self._valid_students,
            ),
            (
                "checkin_rate",
                self._actual_checkin,
                self._target_checkin,
                self._valid_students,
            ),
            (
                "reserve_rate",
                self._actual_reserve,
                self._target_reserve,
                self._reg_base,
            ),
            (
                "attend_rate",
                self._actual_attend,
                self._target_attend,
                self._reserve_base if self._reserve_base > 0 else self._reg_base,
            ),
            (
                "conversion_rate",
                self._actual_conversion,
                self._target_conversion,
                self._reg_base,
            ),
        ]

        chains = []
        for metric, actual, target, base in metric_configs:
            try:
                chain = self._compute_chain(metric, actual, target, base)
                if chain is not None:
                    chains.append(chain)
            except Exception:
                continue

        total_usd = sum(c.get("lost_revenue_usd", 0) for c in chains)
        total_thb = round(total_usd * EXCHANGE_RATE_THB_USD)

        # 找损失最大的指标
        top_lever = None
        top_lever_label = None
        if chains:
            top = max(chains, key=lambda c: c.get("lost_revenue_usd", 0))
            top_lever = top["metric"]
            top_lever_label = top["label"]

        return {
            "chains": chains,
            "total_lost_revenue_usd": round(total_usd, 2),
            "total_lost_revenue_thb": total_thb,
            "top_lever": top_lever,
            "top_lever_label": top_lever_label,
        }

    def what_if(self, metric: str, new_value: float) -> dict:
        """模拟某指标提升到 new_value 后的全链收益变化"""
        meta = _METRIC_META.get(metric)
        if meta is None:
            raise ValueError(f"未知指标: {metric}，支持: {list(_METRIC_META.keys())}")

        label = meta["label"]

        # 当前值
        current_map = {
            "reach_rate": self._actual_reach,
            "participation_rate": self._actual_participation,
            "checkin_rate": self._actual_checkin,
            "reserve_rate": self._actual_reserve,
            "attend_rate": self._actual_attend,
            "conversion_rate": self._actual_conversion,
        }
        target_map = {
            "reach_rate": self._target_reach,
            "participation_rate": self._target_participation,
            "checkin_rate": self._target_checkin,
            "reserve_rate": self._target_reserve,
            "attend_rate": self._target_attend,
            "conversion_rate": self._target_conversion,
        }
        base_map = {
            "reach_rate": self._valid_students,
            "participation_rate": self._valid_students,
            "checkin_rate": self._valid_students,
            "reserve_rate": self._reg_base,
            "attend_rate": self._reserve_base
            if self._reserve_base > 0
            else self._reg_base,
            "conversion_rate": self._reg_base,
        }

        current_value = current_map.get(metric)
        target_value = target_map.get(metric)
        upstream_base = base_map.get(metric, 0)

        # 当前值缺失时用 fallback 0.0，避免返回全 0 delta
        effective_current = current_value if current_value is not None else 0.0

        # 当前损失（current_value → target）
        current_chain = self._compute_chain(
            metric, effective_current, target_value, upstream_base
        )
        # 模拟后损失（new_value → target）
        simulated_chain = self._compute_chain(
            metric, new_value, target_value, upstream_base
        )

        current_payments = current_chain["lost_payments"] if current_chain else 0
        current_usd = current_chain["lost_revenue_usd"] if current_chain else 0.0

        sim_payments = simulated_chain["lost_payments"] if simulated_chain else 0
        sim_usd = simulated_chain["lost_revenue_usd"] if simulated_chain else 0.0

        delta_payments = current_payments - sim_payments  # 减少的损失=增加的付费
        delta_usd = round(current_usd - sim_usd, 2)
        delta_thb = round(delta_usd * EXCHANGE_RATE_THB_USD)

        sim_pct = round(new_value * 100, 1)
        message = (
            f"如果{label}提升到{sim_pct}%，"
            f"预计多获得{delta_payments}个付费用户，"
            f"增收${delta_usd:,.0f}(฿{delta_thb:,.0f})"
        )

        return {
            "metric": metric,
            "label": label,
            "current_value": round(current_value, 4)
            if current_value is not None
            else None,
            "simulated_value": round(new_value, 4),
            "delta_payments": delta_payments,
            "delta_revenue_usd": delta_usd,
            "delta_revenue_thb": delta_thb,
            "message": message,
        }

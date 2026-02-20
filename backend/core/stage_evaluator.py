"""
转介绍阶段评估器
基于运营数据判断当前处于3个阶段中的哪个：
  1. 基础启动 — 以激励为主驱动，工具能力建设期
  2. 科学运营 — 公式化运营，转介绍公式 = 活跃用户 × 参与率 × 获客率 × 转化率
  3. 系统思维 — 两大存量经营（活跃满意用户 + 用户人脉池）
"""
from __future__ import annotations
from typing import Any, Optional


def _pct(value) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _safe_get(d: dict, *keys, default=None):
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k, default)
        if cur is None:
            return default
    return cur


class StageEvaluator:
    """
    评估转介绍运营成熟度阶段。
    接收完整分析缓存（analysis cache dict）。
    """

    STAGE_NAMES = {
        1: "基础启动",
        2: "科学运营",
        3: "系统思维",
    }

    STAGE_DESCRIPTIONS = {
        1: "以激励为主驱动，工具能力建设期",
        2: "公式化运营：活跃用户 × 参与率 × 获客率 × 转化率",
        3: "两大存量经营：活跃满意用户 + 用户人脉池",
    }

    # 升至下一阶段的关键要求
    UPGRADE_REQUIREMENTS = {
        2: {
            "name": "科学运营",
            "key_requirements": [
                "激励体系得分≥0.6（付费率≥15%）",
                "渠道精细化得分≥0.6（CC/SS/LP三渠道独立数据）",
                "数据驱动得分≥0.5（至少有周报追踪）",
            ],
        },
        3: {
            "name": "系统思维",
            "key_requirements": [
                "存量经营得分≥0.6（围场策略+生命周期管理）",
                "用户满意度追踪得分≥0.6（NPS或续费率数据）",
                "数据驱动得分≥0.8（日级数据+异常检测）",
            ],
        },
    }

    def __init__(self, cache: dict):
        self.cache = cache or {}
        self.summary = cache.get("summary", {}) or {}
        self.funnel = cache.get("funnel", {}) or {}
        self.outreach = cache.get("outreach_analysis", {}) or {}
        self.channel_comparison = cache.get("channel_comparison", {}) or {}
        self.meta = cache.get("meta", {}) or {}

    # ── 维度评分 ────────────────────────────────────────────────────────────────

    def _score_incentive(self) -> tuple[float, int, str]:
        """激励体系完善度：付费率 > 0.20 = 0.8, > 0.15 = 0.5, else = 0.3"""
        paid_node = self.summary.get("payment", {})
        reg_node = self.summary.get("registration", {})

        paid_actual = _pct(_safe_get(paid_node, "actual", default=0)) or 0
        reg_actual = _pct(_safe_get(reg_node, "actual", default=0)) or 0

        paid_rate = paid_actual / reg_actual if reg_actual > 0 else None

        if paid_rate is None:
            return 0.3, 1, "付费率数据不可用，假设基础启动水平"

        if paid_rate > 0.20:
            return 0.8, 3, f"付费率{paid_rate:.1%}，达到系统思维标准（>20%）"
        elif paid_rate > 0.15:
            return 0.5, 2, f"付费率{paid_rate:.1%}，达到科学运营标准（>15%）"
        else:
            return 0.3, 1, f"付费率{paid_rate:.1%}，处于基础启动水平（<15%）"

    def _score_channel_granularity(self) -> tuple[float, int, str]:
        """渠道精细化：CC/SS/LP三渠道独立数据 = 0.8, 两渠道 = 0.5, 单渠道 = 0.3"""
        channels_with_data = []
        for label, key in [("CC窄口径", "cc_narrow"), ("SS窄口径", "ss_narrow"), ("LP窄口径", "lp_narrow")]:
            node = self.funnel.get(key, {})
            if isinstance(node, dict) and (node.get("register", 0) or 0) > 0:
                channels_with_data.append(label)

        # 也检查 channel_comparison
        for label in ["CC窄口径", "SS窄口径", "LP窄口径"]:
            if label not in channels_with_data:
                node = self.channel_comparison.get(label, {})
                if isinstance(node, dict) and (node.get("register", 0) or 0) > 0:
                    channels_with_data.append(label)

        count = len(set(channels_with_data))
        if count >= 3:
            return 0.8, 3, f"CC/SS/LP三渠道均有独立数据，渠道精细化完善"
        elif count == 2:
            return 0.5, 2, f"已有{count}个渠道独立数据，科学运营水平"
        else:
            return 0.3, 1, f"仅{max(count, 1)}个渠道独立数据，渠道精细化待完善"

    def _score_data_driven(self) -> tuple[float, int, str]:
        """数据驱动：日级数据追踪+异常检测 = 0.8, 仅周报 = 0.5, 无 = 0.3"""
        # 检查是否有异常检测模块数据
        anomaly_data = self.cache.get("anomaly_detection", {})
        has_anomaly = bool(anomaly_data and isinstance(anomaly_data, dict) and anomaly_data)

        # 检查是否有历史快照（日级追踪）
        snapshots = self.cache.get("snapshots", []) or []
        has_daily = len(snapshots) > 0

        # 检查 summary 中是否有时间进度（说明有基础数据驱动）
        time_prog = _pct(self.summary.get("time_progress", None))
        has_basic = time_prog is not None

        if has_daily and has_anomaly:
            return 0.8, 3, "有日级数据追踪 + 异常检测，数据驱动完善"
        elif has_basic:
            return 0.5, 2, "有月度数据追踪，达科学运营水平，建议升级至日级+异常检测"
        else:
            return 0.3, 1, "数据追踪机制尚在建设中"

    def _score_process_management(self) -> tuple[float, int, str]:
        """过程管理：外呼/触达/打卡完整链路 = 0.8, 部分 = 0.5, 无 = 0.3"""
        has_outreach = bool(self.outreach and isinstance(self.outreach, dict) and self.outreach)
        has_checkin = bool(
            isinstance(self.summary.get("checkin_24h", None), dict)
            and self.summary["checkin_24h"].get("rate") is not None
        )
        has_funnel = bool(
            isinstance(self.funnel.get("total", None), dict)
            and (self.funnel["total"].get("register", 0) or 0) > 0
        )

        score_parts = sum([has_outreach, has_checkin, has_funnel])

        if score_parts == 3:
            return 0.8, 3, "外呼/触达/打卡/漏斗完整链路均有数据"
        elif score_parts >= 2:
            missing = []
            if not has_outreach:
                missing.append("外呼/触达")
            if not has_checkin:
                missing.append("打卡率")
            if not has_funnel:
                missing.append("漏斗")
            return 0.5, 2, f"过程管理部分完善，缺失：{'/'.join(missing) or '无'}"
        else:
            return 0.3, 1, "过程管理链路尚不完整，仅有基础数据"

    def _score_retention_management(self) -> tuple[float, int, str]:
        """存量经营：围场策略+生命周期管理 = 0.8, 仅围场 = 0.5, 无 = 0.3"""
        # 检查围场数据（student_journey 中围场分层）
        journey = self.cache.get("student_journey", {})
        has_enclosure = bool(
            isinstance(journey, dict)
            and journey.get("enclosure_analysis")
        )

        # 检查 LTV/生命周期数据
        ltv_data = self.cache.get("ltv_analysis", {})
        has_lifecycle = bool(ltv_data and isinstance(ltv_data, dict) and ltv_data)

        if has_enclosure and has_lifecycle:
            return 0.8, 3, "有围场策略数据 + 生命周期管理，存量经营完善"
        elif has_enclosure:
            return 0.5, 2, "有围场分层策略，缺少生命周期/LTV管理"
        else:
            return 0.3, 1, "围场和生命周期管理尚未建立"

    def _score_satisfaction_tracking(self) -> tuple[float, int, str]:
        """用户满意度追踪：NPS/续费率数据 = 0.8, 仅续费 = 0.5, 无 = 0.3"""
        # 检查NPS或续费率相关数据
        ltv_data = self.cache.get("ltv_analysis", {}) or {}
        has_renewal = bool(
            isinstance(ltv_data, dict)
            and (ltv_data.get("renewal_rate") or ltv_data.get("ltv"))
        )

        # 检查 NPS 数据（通常在 user_satisfaction 中）
        nps_data = self.cache.get("user_satisfaction", {})
        has_nps = bool(nps_data and isinstance(nps_data, dict) and nps_data.get("nps"))

        if has_nps and has_renewal:
            return 0.8, 3, "有NPS + 续费率数据，用户满意度追踪完善"
        elif has_renewal:
            return 0.5, 2, "有续费率数据，建议补充NPS调研"
        else:
            return 0.3, 1, "用户满意度数据尚未建立（缺NPS/续费率）"

    # ── 主评估方法 ──────────────────────────────────────────────────────────────

    def evaluate(self) -> dict:
        """执行阶段评估，返回完整结果"""
        dimensions = [
            ("激励体系", self._score_incentive),
            ("渠道精细化", self._score_channel_granularity),
            ("数据驱动", self._score_data_driven),
            ("过程管理", self._score_process_management),
            ("存量经营", self._score_retention_management),
            ("用户满意度追踪", self._score_satisfaction_tracking),
        ]

        evidence = []
        total_score = 0.0
        low_score_dims = []

        for dim_name, score_fn in dimensions:
            try:
                score, stage_indicator, detail = score_fn()
            except Exception:
                score, stage_indicator, detail = 0.3, 1, "评估失败，使用默认值"

            evidence.append({
                "dimension": dim_name,
                "score": round(score, 2),
                "stage_indicator": stage_indicator,
                "detail": detail,
            })
            total_score += score

            if score <= 0.3:
                low_score_dims.append((dim_name, score))

        overall_score = round(total_score / len(dimensions), 4)

        # 判断阶段
        if overall_score >= 0.7:
            current_stage = 3
        elif overall_score >= 0.45:
            current_stage = 2
        else:
            current_stage = 1

        # 置信度：基于各维度一致性（方差越低越高）
        scores = [e["score"] for e in evidence]
        mean = sum(scores) / len(scores)
        variance = sum((s - mean) ** 2 for s in scores) / len(scores)
        confidence = round(max(0.5, 1.0 - variance * 4), 2)

        # 升级建议
        upgrade_suggestions = []
        for dim_name, score in low_score_dims:
            upgrade_suggestions.append(
                f"{dim_name}维度得分偏低({score:.1f})，是升入下一阶段的关键障碍"
            )

        # 下一阶段信息
        next_stage_key = current_stage + 1
        next_stage_info = self.UPGRADE_REQUIREMENTS.get(next_stage_key)
        if next_stage_info is None and current_stage < 3:
            next_stage_info = self.UPGRADE_REQUIREMENTS.get(3)

        return {
            "current_stage": current_stage,
            "stage_name": self.STAGE_NAMES[current_stage],
            "stage_description": self.STAGE_DESCRIPTIONS[current_stage],
            "confidence": confidence,
            "evidence": evidence,
            "overall_score": overall_score,
            "upgrade_suggestions": upgrade_suggestions,
            "next_stage": next_stage_info,
        }

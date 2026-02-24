"""
AnalyzerContext — 所有 Analyzer 共享的状态容器
从 analysis_engine_v2.py 的实例属性和 helper 方法提取。
"""
from __future__ import annotations

import calendar
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, List, Optional

from .utils import _safe_div, _safe_pct

logger = logging.getLogger(__name__)


@dataclass
class AnalyzerContext:
    data: dict
    targets: dict
    report_date: datetime
    snapshot_store: Any = None
    project_config: Any = None

    # 计算属性（__post_init__ 赋值）
    data_date: datetime = field(init=False)
    GAP_GREEN: float = field(init=False)
    GAP_YELLOW: float = field(init=False)
    _channel_labels: List[str] = field(init=False)

    def __post_init__(self) -> None:
        self.data_date = self.report_date - timedelta(days=1)

        if self.project_config is not None:
            thresholds = self.project_config.gap_thresholds
            self.GAP_GREEN = float(thresholds.get("green", 0.0))
            self.GAP_YELLOW = float(thresholds.get("yellow", -0.05))
            self._channel_labels = list(self.project_config.channel_labels)
        else:
            self.GAP_GREEN = 0.0
            self.GAP_YELLOW = -0.05
            self._channel_labels = ["CC窄口径", "SS窄口径", "LP窄口径", "宽口径"]

    # ── helper methods（从 engine 搬迁）────────────────────────────────────────

    def calc_workdays(self) -> tuple[int, int]:
        """
        计算当月已过工作日和剩余工作日。
        有 project_config 时从 work_schedule.rest_weekdays 读取休息日；
        否则沿用硬编码（泰国排班：每周仅周三休息，周六周日正常上班）。
        T-1 数据：data_date 为实际数据日期。
        返回 (elapsed_workdays, remaining_workdays)
        """
        dd = self.data_date
        year, month = dd.year, dd.month
        days_in_month = calendar.monthrange(year, month)[1]
        current_day = dd.day

        if self.project_config is not None:
            rest_days = set(self.project_config.work_schedule.rest_weekdays)
        else:
            rest_days = {2}  # 周三（向后兼容硬编码）

        def _is_workday(d: int) -> bool:
            return datetime(year, month, d).weekday() not in rest_days

        elapsed = sum(1 for d in range(1, current_day + 1) if _is_workday(d))
        remaining = sum(1 for d in range(current_day + 1, days_in_month + 1) if _is_workday(d))
        return elapsed, remaining

    def get_real_asp_and_conversion(self) -> tuple[float, float]:
        """
        从已加载数据中获取真实 ASP 和注册→付费转化率。
        fallback 到保守默认值（仅当数据不可用时）。
        """
        _default_asp = 850.0
        _default_conv = 0.23

        # 真实 ASP：从 order_detail.summary.avg_order_value 读取
        order_detail = self.data.get("order", {}).get("order_detail", {})
        order_summary = order_detail.get("summary", {})
        real_asp = order_summary.get("avg_order_value") or order_summary.get("avg_order_value_usd")
        if real_asp and isinstance(real_asp, (int, float)) and real_asp > 0:
            asp_usd = float(real_asp)
        else:
            asp_usd = _default_asp

        # 真实转化率：注册→付费，从 A1 leads_achievement 总计中计算
        a1 = self.data.get("leads", {}).get("leads_achievement", {})
        total = a1.get("by_channel", {}).get("总计", {}) or a1.get("total", {})
        reg = total.get("注册") or 0
        paid = total.get("付费") or 0
        if reg > 0 and paid > 0:
            conversion_rate = min(paid / reg, 1.0)  # 上限 100%
        else:
            conversion_rate = _default_conv

        return asp_usd, conversion_rate

    def calc_efficiency_impact(
        self,
        metric_name: str,
        actual_rate: Optional[float],
        target_rate: Optional[float],
        upstream_base: float,
        asp_usd: Optional[float] = None,
        conversion_rate: Optional[float] = None,
    ) -> Optional[dict]:
        """
        计算效率 gap 对下游的量化影响。
        因果链：打卡率 → 参与学员损失 → 注册损失 → 付费损失 → $损失
        优先使用真实 ASP 和转化率，仅当传入 None 时从数据中动态获取。
        """
        if actual_rate is None or target_rate is None or upstream_base <= 0:
            return None
        if target_rate <= actual_rate:
            return None

        # 动态获取真实参数（调用方未显式传入时）
        if asp_usd is None or conversion_rate is None:
            real_asp, real_conv = self.get_real_asp_and_conversion()
            if asp_usd is None:
                asp_usd = real_asp
            if conversion_rate is None:
                conversion_rate = real_conv

        gap = actual_rate - target_rate  # 负数表示落后
        lost_students = abs(gap) * upstream_base
        lost_payments = lost_students * conversion_rate
        lost_revenue_usd = lost_payments * asp_usd
        return {
            "gap": round(gap, 4),
            "lost_students": round(lost_students),
            "lost_payments": round(lost_payments),
            "lost_revenue_usd": round(lost_revenue_usd, 2),
        }

    def build_meta(self) -> dict:
        """构建 meta 元数据"""
        dd = self.data_date
        return {
            "report_date": self.report_date.strftime("%Y-%m-%d"),
            "data_date": dd.strftime("%Y-%m-%d"),
            "current_month": dd.strftime("%Y%m"),
            "days_in_month": calendar.monthrange(dd.year, dd.month)[1],
            "current_day": dd.day,
            "time_progress": self.targets.get("时间进度", 0.0),
        }

    def get_peak_valley(self, metric: str) -> dict:
        """
        从历史快照查询指定指标的巅峰/谷底。
        若无 SnapshotStore 或无历史数据，返回 None。
        """
        if self.snapshot_store is None:
            return {"peak": None, "valley": None}
        try:
            return self.snapshot_store.get_peak_valley(metric)
        except Exception as e:
            logger.warning(f"[get_peak_valley] metric={metric} 查询失败: {e}")
            return {"peak": None, "valley": None}

"""
51Talk 转介绍周报自动生成 - 数据分析引擎
核心职责：接收 DataProcessor 处理后的结构化数据 + 目标配置，输出分析结果字典
"""
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import calendar
from .data_processor import DataProcessor


class AnalysisEngine:
    """数据分析引擎，输出结构化分析结果"""

    # 风险阈值定义
    GAP_THRESHOLD_GREEN = 0.0      # 缺口 > 0% = 持平
    GAP_THRESHOLD_YELLOW = -0.05   # -5% ~ 0% = 落后
    # < -5% = 严重

    DECLINE_THRESHOLD_YELLOW = 0.10   # 环比下降 10% = 黄色预警
    DECLINE_THRESHOLD_RED = 0.15      # 环比下降 15% = 红色预警

    def __init__(self, processor: DataProcessor):
        self.processor = processor
        self.monthly_summaries = processor.get_monthly_summaries()
        self.all_rows = processor.all_rows

    def analyze(self, targets: dict, report_date: datetime) -> dict:
        """
        主分析函数，返回结构化分析结果

        Args:
            targets: 月度目标配置字典（来自 config.get_targets()）
            report_date: 报告生成日期

        Returns:
            包含全部分析结果的字典
        """
        # 计算数据日期（T-1）
        data_date = report_date - timedelta(days=1)
        current_month = data_date.strftime("%Y%m")

        # 获取当月汇总数据
        if current_month not in self.monthly_summaries:
            raise ValueError(f"未找到 {current_month} 的月度汇总数据")

        current_data = self.monthly_summaries[current_month]

        # 获取时间进度
        time_progress = targets.get("时间进度", 0.0)

        # 执行各项分析
        return {
            "summary": self._analyze_summary(current_data, targets, time_progress),
            "funnel": self._analyze_funnel(current_month),
            "trend": self._analyze_trend(current_month, limit=6),
            "channel_comparison": self._analyze_channel_comparison(current_data, targets),
            "team_data": self._analyze_team_data(current_month),
            "unit_price": self._analyze_unit_price(current_data, targets),
            "risk_alerts": self._analyze_risk_alerts(current_data, current_month, targets, time_progress),
            "time_progress": time_progress,
            "roi_estimate": self._analyze_roi_estimate(current_data),
            "meta": {
                "report_date": report_date,
                "data_date": data_date,
                "current_month": current_month,
                "days_in_month": calendar.monthrange(data_date.year, data_date.month)[1],
                "current_day": data_date.day,
            }
        }

    def _analyze_summary(self, current_data: Dict, targets: Dict, time_progress: float) -> Dict:
        """整体进度看板分析"""
        summary = {}

        # 关键指标列表
        indicators = [
            ("注册", "总计_注册", "注册目标"),
            ("预约", "总计_预约", None),  # 预约目标需要通过注册*约课率计算
            ("出席", "总计_出席", None),
            ("付费", "总计_付费", "付费目标"),
            ("金额", "总计_美金金额", "金额目标"),
            ("转化率", "总计_注册付费率", "目标转化率"),
        ]

        # 计算预约、出席目标
        targets_derived = {
            "预约": targets.get("注册目标", 0) * targets.get("约课率目标", 0.77),
            "出席": targets.get("注册目标", 0) * targets.get("约课率目标", 0.77) * targets.get("出席率目标", 0.66),
        }

        for label, data_key, target_key in indicators:
            actual = current_data.get(data_key) or 0

            if target_key:
                target = targets.get(target_key, 0)
            elif label in targets_derived:
                target = targets_derived[label]
            else:
                target = 0

            # 计算效率进度和目标缺口
            if target > 0:
                efficiency_progress = actual / target
                gap = efficiency_progress - time_progress
            else:
                efficiency_progress = 0.0
                gap = 0.0

            # 状态判定
            status = self._get_status_label(gap)

            summary[label] = {
                "actual": actual,
                "target": target,
                "efficiency_progress": efficiency_progress,
                "gap": gap,
                "status": status,
            }

        return summary

    def _analyze_funnel(self, current_month: str) -> Dict:
        """漏斗诊断分析（各口径的转化率）"""
        if current_month not in self.monthly_summaries:
            return {}

        current_data = self.monthly_summaries[current_month]

        # 计算各口径漏斗数据
        channels = ["总计", "CC窄口径", "SS窄口径", "其它"]
        funnel = {}

        for channel in channels:
            funnel[channel] = {
                "注册": current_data.get(f"{channel}_注册") or 0,
                "预约": current_data.get(f"{channel}_预约") or 0,
                "出席": current_data.get(f"{channel}_出席") or 0,
                "付费": current_data.get(f"{channel}_付费") or 0,
                "金额": current_data.get(f"{channel}_美金金额") or 0,
                "注册付费率": current_data.get(f"{channel}_注册付费率") or 0.0,
                "预约率": current_data.get(f"{channel}_预约率") or 0.0,
                "出席率": current_data.get(f"{channel}_预约出席率") or 0.0,
                "出席付费率": current_data.get(f"{channel}_出席付费率") or 0.0,
            }

        return funnel

    def _analyze_trend(self, current_month: str, limit: int = 6) -> Dict:
        """趋势数据分析（最近N个月）"""
        months = self.processor.get_sorted_months()

        # 找到当前月份的索引
        if current_month in months:
            idx = months.index(current_month)
            # 获取最近N个月（包括当前月）
            recent_months = months[max(0, idx - limit + 1):idx + 1]
        else:
            recent_months = months[-limit:] if len(months) >= limit else months

        trend_data = {
            "months": recent_months,
            "总计_出席付费率": [],
            "CC窄口径_出席付费率": [],
            "其它_出席付费率": [],
            "总计_付费": [],
            "总计_金额": [],
            "总计_注册付费率": [],
        }

        for month in recent_months:
            data = self.monthly_summaries.get(month, {})
            trend_data["总计_出席付费率"].append(data.get("总计_出席付费率") or 0.0)
            trend_data["CC窄口径_出席付费率"].append(data.get("CC窄口径_出席付费率") or 0.0)
            trend_data["其它_出席付费率"].append(data.get("其它_出席付费率") or 0.0)
            trend_data["总计_付费"].append(data.get("总计_付费") or 0)
            trend_data["总计_金额"].append(data.get("总计_美金金额") or 0)
            trend_data["总计_注册付费率"].append(data.get("总计_注册付费率") or 0.0)

        return trend_data

    def _analyze_channel_comparison(self, current_data: Dict, targets: Dict) -> Dict:
        """渠道对比分析（效能指数计算）"""
        total_reg = current_data.get("总计_注册") or 1  # 避免除零
        total_paid = current_data.get("总计_付费") or 1

        channels = [
            ("CC窄口径", "CC窄口径_注册", "CC窄口径_付费", "CC窄口径_美金金额"),
            ("SS窄口径", "SS窄口径_注册", "SS窄口径_付费", "SS窄口径_美金金额"),
            ("其它", "其它_注册", "其它_付费", "其它_美金金额"),
        ]

        comparison = {}

        for name, reg_key, paid_key, amount_key in channels:
            reg = current_data.get(reg_key) or 0
            paid = current_data.get(paid_key) or 0
            amount = current_data.get(amount_key) or 0

            reg_ratio = reg / total_reg if total_reg > 0 else 0.0
            paid_ratio = paid / total_paid if total_paid > 0 else 0.0

            # 效能指数 = 付费占比 / 注册占比
            efficiency_index = paid_ratio / reg_ratio if reg_ratio > 0 else 0.0

            # 计算进度（仅当有子口径目标时）
            sub_targets = targets.get("子口径", {})
            channel_target = sub_targets.get(name, {}).get("倒子目标", 0)

            if channel_target > 0:
                efficiency_progress = reg / channel_target
                gap = efficiency_progress - targets.get("时间进度", 0.0)
            else:
                efficiency_progress = 0.0
                gap = 0.0

            comparison[name] = {
                "注册": reg,
                "注册占比": reg_ratio,
                "付费": paid,
                "付费占比": paid_ratio,
                "金额": amount,
                "效能指数": efficiency_index,
                "目标": channel_target,
                "效率进度": efficiency_progress,
                "目标缺口": gap,
            }

        return comparison

    def _analyze_team_data(self, current_month: str) -> List[Dict]:
        """CC团队数据分析（从all_rows提取各CC组）"""
        team_data = []

        for row in self.all_rows:
            # 只处理当前月份的数据
            if row.get("月份") != current_month:
                continue

            cc_group = row.get("CC组", "")

            # 跳过小计行和空行
            if cc_group == "小计" or not cc_group:
                continue

            # 提取CC组数据
            data = self.processor._extract_row_data(row)
            team_data.append({
                "CC组": cc_group,
                "注册": data.get("总计_注册") or 0,
                "预约": data.get("总计_预约") or 0,
                "出席": data.get("总计_出席") or 0,
                "付费": data.get("总计_付费") or 0,
                "金额": data.get("总计_美金金额") or 0,
                "注册付费率": data.get("总计_注册付费率") or 0.0,
                "预约率": data.get("总计_预约率") or 0.0,
                "出席率": data.get("总计_预约出席率") or 0.0,
                "出席付费率": data.get("总计_出席付费率") or 0.0,
            })

        # 按转化率降序排序
        team_data.sort(key=lambda x: x["注册付费率"], reverse=True)

        return team_data

    def _analyze_unit_price(self, current_data: Dict, targets: Dict) -> Dict:
        """客单价分析"""
        channels = [
            ("总体", "总计_付费", "总计_美金金额"),
            ("CC窄口径", "CC窄口径_付费", "CC窄口径_美金金额"),
            ("SS窄口径", "SS窄口径_付费", "SS窄口径_美金金额"),
            ("其它", "其它_付费", "其它_美金金额"),
        ]

        target_price = targets.get("客单价", 850)
        unit_prices = {}

        for name, paid_key, amount_key in channels:
            paid = current_data.get(paid_key) or 0
            amount = current_data.get(amount_key) or 0

            unit_price = amount / paid if paid > 0 else 0.0
            vs_target = (unit_price - target_price) / target_price if target_price > 0 else 0.0

            unit_prices[name] = {
                "客单价": unit_price,
                "目标客单价": target_price,
                "对比目标": vs_target,
            }

        return unit_prices

    def _analyze_risk_alerts(self, current_data: Dict, current_month: str, targets: Dict, time_progress: float) -> List[Dict]:
        """风险预警分析"""
        alerts = []

        # 1. 出席付费率下滑预警
        months = self.processor.get_sorted_months()
        if current_month in months:
            idx = months.index(current_month)
            if idx > 0:
                prev_month = months[idx - 1]
                prev_data = self.monthly_summaries[prev_month]

                current_rate = current_data.get("总计_出席付费率") or 0.0
                prev_rate = prev_data.get("总计_出席付费率") or 0.0

                if prev_rate > 0:
                    decline = (prev_rate - current_rate) / prev_rate

                    if decline >= self.DECLINE_THRESHOLD_RED:
                        alerts.append({
                            "风险项": "出席付费率连续下滑",
                            "级别": "🔴 高",
                            "量化影响": f"出席付费率从上月 {prev_rate*100:.1f}% 降至 {current_rate*100:.1f}%（-{decline*100:.1f}%）",
                            "应对方案": "分层触达已出席未付费用户；优化跟进话术；推限时优惠",
                        })
                    elif decline >= self.DECLINE_THRESHOLD_YELLOW:
                        alerts.append({
                            "风险项": "出席付费率下滑",
                            "级别": "🟡 中",
                            "量化影响": f"出席付费率环比下降 {decline*100:.1f}%",
                            "应对方案": "监控跟进质量；加强培训",
                        })

        # 2. 各渠道进度预警
        channel_comparison = self._analyze_channel_comparison(current_data, targets)
        for channel_name, channel_data in channel_comparison.items():
            gap = channel_data.get("目标缺口", 0.0)
            target = channel_data.get("目标", 0)

            if target > 0:  # 只对有目标的渠道预警
                if gap < -0.15:
                    alerts.append({
                        "风险项": f"{channel_name}开源严重滞后",
                        "级别": "🔴 高",
                        "量化影响": f"进度缺口 {gap*100:.1f}%",
                        "应对方案": f"加大 {channel_name} 推广频次；提高奖励",
                    })
                elif gap < -0.05:
                    alerts.append({
                        "风险项": f"{channel_name}开源落后",
                        "级别": "🟡 中",
                        "量化影响": f"进度缺口 {gap*100:.1f}%",
                        "应对方案": f"优化 {channel_name} 开源策略",
                    })

        # 3. 付费目标缺口预警
        paid_actual = current_data.get("总计_付费") or 0
        paid_target = targets.get("付费目标", 0)

        if paid_target > 0:
            paid_progress = paid_actual / paid_target
            paid_gap = paid_progress - time_progress

            if paid_gap < -0.20:
                alerts.append({
                    "风险项": "付费目标严重滞后",
                    "级别": "🔴 高",
                    "量化影响": f"付费缺口 {paid_gap*100:.1f}%，预计月末仅完成 {paid_actual + int((1-time_progress)*paid_actual/time_progress) if time_progress > 0 else paid_actual} 单",
                    "应对方案": "紧急分层触达；限流低质量开源；推限时优惠",
                })

        return alerts

    def _analyze_roi_estimate(self, current_data: Dict) -> Dict:
        """ROI预估分析（基于假设成本）"""
        # 预估成本（待财务确认）
        ESTIMATED_COSTS = {
            "CC窄口径": {"比例": 0.40, "单位成本": 37},  # 40% 成本占比
            "SS窄口径": {"比例": 0.15, "单位成本": 44},
            "其它": {"比例": 0.45, "单位成本": 21},
        }

        roi_data = {}
        total_amount = current_data.get("总计_美金金额") or 0
        total_cost_estimate = total_amount * 0.08  # 假设总成本为收入的8%

        for channel, config in ESTIMATED_COSTS.items():
            amount = current_data.get(f"{channel}_美金金额") or 0
            paid = current_data.get(f"{channel}_付费") or 0

            cost = paid * config["单位成本"] if paid > 0 else 0
            roi = amount / cost if cost > 0 else 0.0

            roi_data[channel] = {
                "金额": amount,
                "成本": cost,
                "ROI": roi,
                "数据可信度": "🟡 中（基于预估）",
            }

        return roi_data

    def _get_status_label(self, gap: float) -> str:
        """根据缺口值返回状态标签"""
        if gap >= self.GAP_THRESHOLD_GREEN:
            return "🟢 持平"
        elif gap >= self.GAP_THRESHOLD_YELLOW:
            return "🟡 落后"
        else:
            return "🔴 严重"

    def get_max_gap_indicator(self, summary: Dict) -> Tuple[str, float]:
        """获取最大缺口指标（用于智能文案生成）"""
        max_gap = 0.0
        max_gap_name = ""

        for name, data in summary.items():
            gap = data.get("gap", 0.0)
            if gap < max_gap:  # 负值最大即缺口最大
                max_gap = gap
                max_gap_name = name

        return max_gap_name, max_gap

    def get_max_decline_indicator(self, current_month: str) -> Tuple[str, float]:
        """获取最大环比下降指标（用于智能文案生成）"""
        months = self.processor.get_sorted_months()
        if current_month not in months:
            return "", 0.0

        idx = months.index(current_month)
        if idx == 0:
            return "", 0.0

        prev_month = months[idx - 1]
        current_data = self.monthly_summaries[current_month]
        prev_data = self.monthly_summaries[prev_month]

        max_decline = 0.0
        max_decline_name = ""

        # 检查关键指标的环比变化
        indicators = [
            ("出席付费率", "总计_出席付费率"),
            ("CC窄口径出席付费率", "CC窄口径_出席付费率"),
            ("注册付费率", "总计_注册付费率"),
        ]

        for name, key in indicators:
            current_val = current_data.get(key) or 0.0
            prev_val = prev_data.get(key) or 0.0

            if prev_val > 0:
                decline = (prev_val - current_val) / prev_val
                if decline > max_decline:
                    max_decline = decline
                    max_decline_name = name

        return max_decline_name, max_decline

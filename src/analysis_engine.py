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

    def analyze(self, targets: dict, report_date: datetime, multi_source_data: dict = None) -> dict:
        """
        主分析函数，返回结构化分析结果

        Args:
            targets: 月度目标配置字典（来自 config.get_targets()）
            report_date: 报告生成日期
            multi_source_data: 多数据源数据（可选）

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
        result = {
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

        # 新增：多数据源分析
        if multi_source_data:
            result["cohort_analysis"] = self._analyze_cohort(multi_source_data)
            result["checkin_analysis"] = self._analyze_checkin(multi_source_data)
            result["leads_achievement"] = self._analyze_leads_achievement(multi_source_data)
            result["followup_analysis"] = self._analyze_followup(multi_source_data)
            result["order_analysis"] = self._analyze_orders(multi_source_data)
            result["mom_trend"] = self._analyze_mom_trend(multi_source_data)
            result["yoy_trend"] = self._analyze_yoy_trend(multi_source_data)
            result["cc_ranking"] = self._analyze_cc_ranking(multi_source_data, report_date)
            result["attended_not_paid"] = self._analyze_attended_not_paid(multi_source_data, report_date)

            # AI 增强分析（Gemini API，优雅降级）
            try:
                from .ai_client import GeminiClient
                ai_client = GeminiClient()
                result["ai_root_cause"] = self._ai_root_cause_diagnosis(
                    result.get("risk_alerts", []), multi_source_data, ai_client
                )
                result["ai_insights"] = self._ai_generate_insights(result, ai_client)
            except ImportError:
                pass  # google-generativeai 未安装，跳过
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"AI 分析跳过: {e}")

        return result

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
            # all_rows 存的是原始列名（A/B/C...），不是提取后的字段名
            month = row.get("A", "")
            cc_group = row.get("B", "")

            # 只处理当前月份的数据
            if month != current_month:
                continue

            # 跳过小计行和空行
            if cc_group == "小计" or not cc_group:
                continue

            # 提取CC组数据（从原始列转换为命名字段）
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

    def _analyze_cohort(self, multi_source_data: dict) -> dict:
        """围场生命周期分析"""
        cohort_summary = multi_source_data.get("围场汇总", {})
        channel_cohort = multi_source_data.get("当月效率", {})
        cohort_outreach = multi_source_data.get("围场跟进", {})

        if not cohort_summary:
            return {}

        analysis = {
            "summary": cohort_summary.get("summary", {}),
            "by_cohort": [],
            "insights": []
        }

        # 合并围场数据
        by_cohort = cohort_summary.get("by_cohort", [])
        for cohort_data in by_cohort:
            cohort_name = cohort_data.get("围场", "")

            # 基础数据
            result = {
                "围场": cohort_name,
                "参与率": cohort_data.get("参与率"),
                "带货比": cohort_data.get("带货比"),
                "围场转率": cohort_data.get("围场转率"),
                "有效学员": cohort_data.get("有效学员"),
                "B注册": cohort_data.get("B注册"),
                "B付费": cohort_data.get("B付费"),
            }

            # 添加触达覆盖率（从围场跟进）
            for outreach_cohort in cohort_outreach.get("by_cohort", []):
                if outreach_cohort.get("围场", "").startswith(cohort_name.split("至")[0]):
                    result["拨打覆盖率"] = outreach_cohort.get("拨打覆盖率")
                    result["有效接通覆盖率"] = outreach_cohort.get("有效接通覆盖率")
                    break

            analysis["by_cohort"].append(result)

        # 识别最高/最低围场
        if by_cohort:
            max_participation = max(by_cohort, key=lambda x: x.get("参与率") or 0)
            min_participation = min(by_cohort, key=lambda x: x.get("参与率") or 0)

            analysis["insights"].append({
                "类型": "最高参与率围场",
                "围场": max_participation.get("围场"),
                "参与率": max_participation.get("参与率"),
                "建议": "重点维护该围场用户，提高触达频次"
            })

            if min_participation.get("参与率", 0) < 0.05:
                analysis["insights"].append({
                    "类型": "低参与率预警",
                    "围场": min_participation.get("围场"),
                    "参与率": min_participation.get("参与率"),
                    "建议": "增加激励措施，优化触达话术"
                })

        return analysis

    def _analyze_checkin(self, multi_source_data: dict) -> dict:
        """转介绍参与行为分析"""
        checkin_data = multi_source_data.get("打卡率", {})

        if not checkin_data:
            return {}

        summary = checkin_data.get("summary", {})
        by_team = checkin_data.get("by_team", [])

        analysis = {
            "summary": summary,
            "team_ranking": [],
            "insights": []
        }

        # 团队排名（按打卡参与率）
        if by_team:
            sorted_teams = sorted(by_team, key=lambda x: x.get("打卡参与率") or 0, reverse=True)
            analysis["team_ranking"] = sorted_teams[:10]

            # 打卡倍率分析
            avg_multiplier = summary.get("打卡倍率", 1.0)
            if avg_multiplier and avg_multiplier > 1.5:
                analysis["insights"].append({
                    "类型": "打卡效果显著",
                    "打卡倍率": avg_multiplier,
                    "建议": f"打卡用户参与率是未打卡的{avg_multiplier:.1f}倍，建议加大打卡推广力度"
                })

            # 识别低打卡率团队
            low_teams = [t for t in by_team if (t.get("打卡参与率") or 0) < 0.3]
            if low_teams:
                analysis["insights"].append({
                    "类型": "低打卡率团队",
                    "团队数": len(low_teams),
                    "团队": [t.get("团队") for t in low_teams[:5]],
                    "建议": "加强打卡培训，优化打卡流程"
                })

        return analysis

    def _analyze_leads_achievement(self, multi_source_data: dict) -> dict:
        """全团队 Leads 对标分析"""
        leads_data = multi_source_data.get("leads达成", {})

        if not leads_data:
            return {}

        teams = leads_data.get("teams", [])

        analysis = {
            "by_channel": {},
            "team_ranking": {},
            "insights": []
        }

        # 按渠道分组
        channels = ["总计", "CC窄口径", "SS窄口径", "LP窄口径", "宽口径"]
        for channel in channels:
            channel_teams = []
            for team in teams:
                channel_data = team.get(channel, {})
                if channel_data.get("注册"):
                    channel_teams.append({
                        "团队": team.get("团队"),
                        "注册": channel_data.get("注册"),
                        "预约": channel_data.get("预约"),
                        "出席": channel_data.get("出席"),
                        "付费": channel_data.get("付费"),
                        "注册付费率": channel_data.get("注册付费率"),
                    })

            # 按注册付费率排名
            if channel_teams:
                sorted_teams = sorted(
                    channel_teams,
                    key=lambda x: x.get("注册付费率") or 0,
                    reverse=True
                )
                analysis["team_ranking"][channel] = sorted_teams

        # 识别优秀团队和待提升团队
        if teams:
            # 找到总计口径的最佳团队
            best_team = max(
                [t for t in teams if t.get("总计", {}).get("注册")],
                key=lambda x: x.get("总计", {}).get("注册付费率") or 0,
                default=None
            )

            if best_team:
                analysis["insights"].append({
                    "类型": "最佳转化团队",
                    "团队": best_team.get("团队"),
                    "注册付费率": best_team.get("总计", {}).get("注册付费率"),
                    "建议": "推广该团队的跟进话术和转化策略"
                })

        return analysis

    def _analyze_followup(self, multi_source_data: dict) -> dict:
        """跟进效率分析"""
        trial_followup = multi_source_data.get("课前课后", {})
        cohort_outreach = multi_source_data.get("围场跟进", {})

        analysis = {
            "trial_followup": {},
            "cohort_outreach": {},
            "insights": []
        }

        # 课前课后跟进分析
        if trial_followup:
            summary = trial_followup.get("summary", {})
            by_team = trial_followup.get("by_team", [])

            analysis["trial_followup"]["summary"] = summary

            # 团队排名
            if by_team:
                # 课前有效接通率排名
                pre_ranking = sorted(
                    by_team,
                    key=lambda x: x.get("课前有效接通率") or 0,
                    reverse=True
                )[:5]

                # 课后有效接通率排名
                post_ranking = sorted(
                    by_team,
                    key=lambda x: x.get("课后有效接通率") or 0,
                    reverse=True
                )[:5]

                analysis["trial_followup"]["课前TOP5"] = pre_ranking
                analysis["trial_followup"]["课后TOP5"] = post_ranking

                # 识别跟进不足的团队
                low_pre = [t for t in by_team if (t.get("课前有效接通率") or 0) < 0.4]
                if low_pre:
                    analysis["insights"].append({
                        "类型": "课前跟进不足",
                        "团队数": len(low_pre),
                        "建议": "加强课前拨打培训，提高接通率"
                    })

        # 围场触达分析
        if cohort_outreach:
            summary = cohort_outreach.get("summary", {})
            by_cohort = cohort_outreach.get("by_cohort", [])

            analysis["cohort_outreach"]["summary"] = summary
            analysis["cohort_outreach"]["by_cohort"] = by_cohort

            # 识别触达率低的围场
            if by_cohort:
                low_outreach = [c for c in by_cohort if (c.get("有效接通覆盖率") or 0) < 0.1]
                if low_outreach:
                    analysis["insights"].append({
                        "类型": "长尾围场触达不足",
                        "围场数": len(low_outreach),
                        "建议": "针对长尾围场制定专项触达计划"
                    })

        return analysis

    def _analyze_orders(self, multi_source_data: dict) -> dict:
        """订单分析"""
        order_data = multi_source_data.get("订单明细", {})

        if not order_data:
            return {}

        total_orders = order_data.get("total_orders", 0)
        total_amount = order_data.get("total_amount", 0)
        referral_orders = order_data.get("referral_orders", 0)

        analysis = {
            "summary": {
                "总订单数": total_orders,
                "总金额": total_amount,
                "转介绍订单数": referral_orders,
                "转介绍占比": referral_orders / total_orders if total_orders > 0 else 0,
                "平均客单价": order_data.get("avg_amount", 0),
            },
            "by_team": order_data.get("by_team", []),
            "by_product": order_data.get("by_product", []),
            "insights": []
        }

        # 产品分析
        by_product = order_data.get("by_product", [])
        if by_product:
            # 按金额排序
            sorted_products = sorted(
                by_product,
                key=lambda x: x.get("金额") or 0,
                reverse=True
            )
            analysis["top_products"] = sorted_products[:5]

        # 团队贡献分析
        by_team = order_data.get("by_team", [])
        if by_team:
            # 按金额排序
            sorted_teams = sorted(
                by_team,
                key=lambda x: x.get("金额") or 0,
                reverse=True
            )
            analysis["top_teams"] = sorted_teams[:5]

        return analysis

    def _analyze_mom_trend(self, multi_source_data: dict) -> dict:
        """月度环比趋势分析"""
        mom_data = multi_source_data.get("月度环比", {})

        if not mom_data:
            return {}

        months = mom_data.get("months", [])
        by_channel = mom_data.get("by_channel", [])

        analysis = {
            "months": months,
            "trends": [],
            "insights": []
        }

        # 计算环比变化
        for channel_data in by_channel:
            channel = channel_data.get("渠道", "")
            trends = {}

            for metric in ["注册", "注册付费率", "客单价", "预约率", "出席付费率"]:
                values = channel_data.get(metric, [])
                if len(values) >= 2:
                    # 计算最近一个月的环比
                    latest = values[-1] if values[-1] is not None else 0
                    previous = values[-2] if values[-2] is not None else 0

                    if previous != 0:
                        mom_change = (latest - previous) / previous
                        trends[metric] = {
                            "当前值": latest,
                            "上月值": previous,
                            "环比": mom_change,
                            "趋势": "上升" if mom_change > 0 else "下降"
                        }

            if trends:
                analysis["trends"].append({
                    "渠道": channel,
                    "指标变化": trends
                })

                # 识别显著变化
                for metric, data in trends.items():
                    if abs(data.get("环比", 0)) > 0.1:  # 变化超过10%
                        analysis["insights"].append({
                            "渠道": channel,
                            "指标": metric,
                            "变化": data.get("环比"),
                            "趋势": data.get("趋势"),
                            "建议": f"{channel} {metric} {data.get('趋势')} {abs(data.get('环比', 0))*100:.1f}%"
                        })

        return analysis

    def _analyze_yoy_trend(self, multi_source_data: dict) -> dict:
        """年度同比趋势分析"""
        yoy_data = multi_source_data.get("月度同期", {})

        if not yoy_data:
            return {}

        channels = yoy_data.get("channels", [])
        months = yoy_data.get("months", [])
        by_channel = yoy_data.get("by_channel", [])

        analysis = {
            "months": months,
            "channels": channels,
            "trends": [],
            "insights": []
        }

        # 分析每个渠道的趋势
        for channel_data in by_channel:
            channel = channel_data.get("渠道类型", "")
            indicators = channel_data.get("指标", {})

            channel_trends = {
                "渠道": channel,
                "指标": {}
            }

            for indicator_name, values in indicators.items():
                if values and len(values) >= 2:
                    # 计算同比变化（假设最后两个值是去年和今年同期）
                    if len(values) >= 2:
                        current = values[-1] if values[-1] is not None else 0
                        previous = values[-2] if values[-2] is not None else 0

                        if previous != 0:
                            yoy_change = (current - previous) / previous
                            channel_trends["指标"][indicator_name] = {
                                "当前值": current,
                                "去年同期": previous,
                                "同比": yoy_change,
                                "趋势": "增长" if yoy_change > 0 else "下降"
                            }

            if channel_trends["指标"]:
                analysis["trends"].append(channel_trends)

        # 识别转介绍渠道的关键变化
        for trend in analysis["trends"]:
            if trend.get("渠道") == "转介绍":
                for metric, data in trend.get("指标", {}).items():
                    yoy = data.get("同比", 0)
                    if abs(yoy) > 0.15:  # 同比变化超过15%
                        analysis["insights"].append({
                            "指标": metric,
                            "变化": yoy,
                            "趋势": data.get("趋势"),
                            "建议": f"转介绍{metric}同比{data.get('趋势')}{abs(yoy)*100:.1f}%，需关注"
                        })

        return analysis

    def _analyze_cc_ranking(self, multi_source_data: dict, report_date: datetime) -> dict:
        """CC 个人排名分析"""
        cc_individual = multi_source_data.get("cc_individual", {})
        if not cc_individual:
            return {}

        leads_by_cc = cc_individual.get("leads_by_cc", {})
        followup_by_cc = cc_individual.get("followup_by_cc", []) or []
        checkin_by_cc = cc_individual.get("checkin_by_cc", []) or []
        outreach_by_cc = cc_individual.get("outreach_by_cc", {})

        if not leads_by_cc:
            return {}

        # 构建 CC 综合数据
        cc_profiles = []

        for cc_std, cc_data in leads_by_cc.items():
            leads = cc_data.get("leads", 0)
            paid = cc_data.get("付费", 0)
            amount = cc_data.get("金额", 0)
            team = cc_data.get("团队", "")
            cc_name = cc_data.get("CC", cc_std)

            # 转化率
            conversion_rate = paid / leads if leads > 0 else 0.0

            # 跟进质量（课前+课后有效接通率平均）
            followup_quality = 0.0
            for f in followup_by_cc:
                if f.get("CC_标准") == cc_std:
                    pre_connect = f.get("课前有效接通率") or 0.0
                    post_connect = f.get("课后有效接通率") or 0.0
                    followup_quality = (pre_connect + post_connect) / 2
                    break

            # 打卡参与率
            checkin_rate = 0.0
            for c in checkin_by_cc:
                if c.get("CC_标准") == cc_std:
                    checkin_rate = c.get("参与率") or 0.0
                    break

            # 围场触达（各围场有效接通覆盖率平均）
            outreach_score = 0.0
            if cc_std in outreach_by_cc:
                cohorts = outreach_by_cc[cc_std].get("cohorts", [])
                if cohorts:
                    total_effective = sum(
                        ch.get("effective_connect_coverage") or 0.0
                        for ch in cohorts
                    )
                    outreach_score = total_effective / len(cohorts)

            cc_profiles.append({
                "cc": cc_name,
                "cc_std": cc_std,
                "team": team,
                "leads": leads,
                "paid": paid,
                "amount": amount,
                "conversion_rate": conversion_rate,
                "followup_quality": followup_quality,
                "checkin_rate": checkin_rate,
                "outreach_score": outreach_score,
            })

        # 过滤掉 leads < 5 的 CC（用于转化率排名）
        cc_qualified = [p for p in cc_profiles if p["leads"] >= 5]

        # 计算综合得分（归一化）
        def normalize(values, profiles, key):
            """Min-Max 归一化"""
            vals = [p[key] for p in profiles]
            min_val = min(vals) if vals else 0
            max_val = max(vals) if vals else 1
            denominator = max_val - min_val if max_val > min_val else 1
            return [(v - min_val) / denominator * 100 for v in vals]

        if cc_profiles:
            conversion_scores = normalize(None, cc_profiles, "conversion_rate")
            followup_scores = normalize(None, cc_profiles, "followup_quality")
            checkin_scores = normalize(None, cc_profiles, "checkin_rate")
            outreach_scores = normalize(None, cc_profiles, "outreach_score")
            leads_scores = normalize(None, cc_profiles, "leads")

            for i, p in enumerate(cc_profiles):
                p["composite"] = (
                    conversion_scores[i] * 0.30 +
                    followup_scores[i] * 0.25 +
                    checkin_scores[i] * 0.15 +
                    outreach_scores[i] * 0.15 +
                    leads_scores[i] * 0.15
                )

        # 排名
        by_paid = sorted(cc_profiles, key=lambda x: x["paid"], reverse=True)[:20]
        by_amount = sorted(cc_profiles, key=lambda x: x["amount"], reverse=True)[:20]
        by_conversion = sorted(cc_qualified, key=lambda x: x["conversion_rate"], reverse=True)[:20]
        by_composite = sorted(cc_profiles, key=lambda x: x["composite"], reverse=True)[:20]

        # 综合得分后5名（≥5 leads）
        bottom_5 = sorted(cc_qualified, key=lambda x: x["composite"])[:5]

        # 添加排名
        for i, p in enumerate(by_paid):
            p["rank"] = i + 1
        for i, p in enumerate(by_amount):
            p["rank"] = i + 1
        for i, p in enumerate(by_conversion):
            p["rank"] = i + 1
        for i, p in enumerate(by_composite):
            p["rank"] = i + 1

        # 团队平均值
        team_stats = {}
        for p in cc_profiles:
            team = p["team"]
            if not team:
                continue
            if team not in team_stats:
                team_stats[team] = {
                    "paid": [],
                    "amount": [],
                    "conversion": []
                }
            team_stats[team]["paid"].append(p["paid"])
            team_stats[team]["amount"].append(p["amount"])
            team_stats[team]["conversion"].append(p["conversion_rate"])

        team_avg = {}
        for team, stats in team_stats.items():
            team_avg[team] = {
                "avg_paid": sum(stats["paid"]) / len(stats["paid"]) if stats["paid"] else 0,
                "avg_amount": sum(stats["amount"]) / len(stats["amount"]) if stats["amount"] else 0,
                "avg_conversion": sum(stats["conversion"]) / len(stats["conversion"]) if stats["conversion"] else 0,
            }

        # 洞察
        insights = []
        if by_paid:
            top_cc = by_paid[0]
            insights.append(f"付费王：{top_cc['cc']}（{top_cc['team']}）{top_cc['paid']}单，金额 ${top_cc['amount']:.0f}")

        if by_conversion:
            top_conv = by_conversion[0]
            insights.append(f"转化王：{top_conv['cc']}（{top_conv['team']}）转化率 {top_conv['conversion_rate']*100:.1f}%")

        if bottom_5:
            insights.append(f"综合得分后5名需重点关注，包括{', '.join([b['cc'] for b in bottom_5[:3]])}")

        return {
            "by_paid": by_paid,
            "by_amount": by_amount,
            "by_conversion": by_conversion,
            "by_composite": by_composite,
            "bottom_5": bottom_5,
            "team_avg": team_avg,
            "insights": insights,
        }

    def _analyze_attended_not_paid(self, multi_source_data: dict, report_date: datetime) -> dict:
        """已出席未付费用户分析"""
        leads_detail = multi_source_data.get("leads明细", {})
        rows = leads_detail.get("rows", [])

        if not rows:
            return {}

        # 筛选：首次出席日期非空 且 首次付费日期为空
        attended_not_paid = []
        for row in rows:
            first_attend_date = row.get("O")  # O列 = 首次出席日期
            first_paid_date = row.get("R")   # R列 = 首次付费日期

            if first_attend_date and not first_paid_date:
                attended_not_paid.append(row)

        total_count = len(attended_not_paid)

        # 统计
        by_team = {}
        by_cc = {}
        by_days = {"0-3天": 0, "4-7天": 0, "8-14天": 0, "15+天": 0}
        high_priority = []

        for row in attended_not_paid:
            # 团队
            team = row.get("Y", "")
            if team:
                by_team[team] = by_team.get(team, 0) + 1

            # CC
            cc_raw = row.get("Z", "")
            if cc_raw:
                # 使用 multi_source_loader 的标准化方法（简化版）
                cc_name = cc_raw.strip().lower()
                by_cc[cc_name] = by_cc.get(cc_name, 0) + 1

            # 天数分组
            attend_date_val = row.get("O")
            if attend_date_val:
                # 解析日期
                try:
                    if isinstance(attend_date_val, str):
                        attend_date = datetime.strptime(attend_date_val, "%Y-%m-%d")
                    elif isinstance(attend_date_val, int):
                        # Excel serial date
                        base = datetime(1899, 12, 30)
                        attend_date = base + timedelta(days=int(attend_date_val))
                    else:
                        attend_date = attend_date_val

                    days_since = (report_date - attend_date).days

                    if days_since <= 3:
                        by_days["0-3天"] += 1
                        # 高优先级
                        student_id = row.get("A", "")
                        high_priority.append({
                            "学员ID": student_id,
                            "CC": cc_raw,
                            "团队": team,
                            "出席日期": attend_date.strftime("%Y-%m-%d") if hasattr(attend_date, 'strftime') else str(attend_date_val),
                            "天数": days_since,
                        })
                    elif days_since <= 7:
                        by_days["4-7天"] += 1
                    elif days_since <= 14:
                        by_days["8-14天"] += 1
                    else:
                        by_days["15+天"] += 1
                except:
                    pass

        # 预估回收
        conversion_opportunity = f"预估可回收 {int(total_count * 0.15)} 单"

        # 洞察
        insights = []
        insights.append(f"共 {total_count} 个已出席未付费用户，其中 {by_days['0-3天']} 个在0-3天（高优先级）")

        if by_team:
            top_team = max(by_team.items(), key=lambda x: x[1])
            insights.append(f"{top_team[0]} 团队待跟进最多（{top_team[1]}人）")

        if by_days["0-3天"] > 0:
            insights.append(f"建议立即分层触达0-3天用户，推限时优惠")

        return {
            "total_count": total_count,
            "by_team": by_team,
            "by_cc": by_cc,
            "by_days_since_attend": by_days,
            "high_priority": high_priority[:50],  # 限制50条
            "conversion_opportunity": conversion_opportunity,
            "insights": insights,
        }

    def _ai_root_cause_diagnosis(self, alerts: list, multi_source_data: dict, ai_client) -> Optional[list]:
        """AI 根因诊断：基于预警数据 + 多源数据推理根因"""
        import logging
        logger = logging.getLogger(__name__)

        # 仅当有 🔴 高级别 alert 时才调用 AI（节省额度）
        high_alerts = [a for a in alerts if "🔴" in a.get("级别", "")]
        if not high_alerts:
            return None

        # 构建预警文本
        alerts_text = "\n".join([
            f"- {a.get('风险项')}: {a.get('量化影响')}"
            for a in high_alerts
        ])

        # 提取关联指标
        checkin_summary = multi_source_data.get("打卡率", {}).get("summary", {})
        checkin_rate = checkin_summary.get("打卡参与率", "N/A")

        outreach_summary = multi_source_data.get("围场跟进", {}).get("summary", {})
        outreach_coverage = outreach_summary.get("有效接通覆盖率", "N/A")

        # 开源质量（从 channel_comparison 计算）
        total_reg = self.monthly_summaries.get(
            list(self.monthly_summaries.keys())[-1], {}
        ).get("总计_注册", 1)
        wide_reg = self.monthly_summaries.get(
            list(self.monthly_summaries.keys())[-1], {}
        ).get("其它_注册", 0)
        wide_ratio = wide_reg / total_reg if total_reg > 0 else 0.0

        wide_paid = self.monthly_summaries.get(
            list(self.monthly_summaries.keys())[-1], {}
        ).get("其它_付费", 0)
        wide_conversion = wide_paid / wide_reg if wide_reg > 0 else 0.0

        # CC 综合得分后 5 名
        cc_ranking = multi_source_data.get("cc_individual", {})
        bottom_cc_text = "N/A"
        if cc_ranking:
            leads_by_cc = cc_ranking.get("leads_by_cc", {})
            if leads_by_cc:
                # 简化版：只取前3个
                bottom_cc_text = ", ".join(
                    list(leads_by_cc.keys())[:3]
                )

        # 构建 prompt
        prompt = f"""你是 51Talk 泰国转介绍业务的数据分析专家。

以下预警需要根因分析：
{alerts_text}

关联数据：
- 打卡参与率: {checkin_rate}
- 围场有效接通覆盖率: {outreach_coverage}
- 宽口径注册占比: {wide_ratio:.1%}，宽口径转化率: {wide_conversion:.1%}
- CC 代表样本: {bottom_cc_text}

请推理 2-3 个最可能的根因（按影响程度排序）。

输出 JSON 数组格式：
[{{"root_cause": "根因", "impact_weight": 权重(0-1总和=1), "evidence": "数据证据", "action": "可执行方案"}}]

要求：
- evidence 必须引用具体数据
- action 必须具体可执行（不要空话如"优化策略"）
- 不要超过 3 个根因
"""

        try:
            result = ai_client.generate_json(prompt)
            if result is None:
                return None

            # 验证和归一化 impact_weight
            if isinstance(result, list):
                total_weight = sum(item.get("impact_weight", 0) for item in result)
                if total_weight > 0 and abs(total_weight - 1.0) > 0.1:
                    # 归一化
                    for item in result:
                        item["impact_weight"] = item.get("impact_weight", 0) / total_weight
                return result
            else:
                logger.warning("AI 根因诊断返回格式错误，预期 list")
                return None
        except Exception as e:
            logger.warning(f"AI 根因诊断失败: {e}")
            return None

    def _ai_generate_insights(self, analysis_result: dict, ai_client) -> Optional[dict]:
        """AI 生成管理层洞察摘要"""
        import logging
        logger = logging.getLogger(__name__)

        # 提取关键数字
        summary = analysis_result.get("summary", {})
        risk_alerts = analysis_result.get("risk_alerts", [])
        channel_comparison = analysis_result.get("channel_comparison", {})
        cc_ranking = analysis_result.get("cc_ranking", {})

        # 构建摘要数据
        paid_actual = summary.get("付费", {}).get("actual", 0)
        paid_target = summary.get("付费", {}).get("target", 0)
        paid_gap = summary.get("付费", {}).get("gap", 0.0)

        amount_actual = summary.get("金额", {}).get("actual", 0)
        amount_target = summary.get("金额", {}).get("target", 0)

        conversion_actual = summary.get("转化率", {}).get("actual", 0.0)

        alerts_count = len(risk_alerts)
        high_alerts_count = len([a for a in risk_alerts if "🔴" in a.get("级别", "")])

        # 渠道效能指数
        channel_text = ", ".join([
            f"{ch}: {data.get('效能指数', 0):.2f}"
            for ch, data in channel_comparison.items()
        ])

        # CC TOP/BOTTOM
        top_cc_text = "N/A"
        bottom_cc_text = "N/A"
        if cc_ranking:
            by_composite = cc_ranking.get("by_composite", [])
            bottom_5 = cc_ranking.get("bottom_5", [])
            if by_composite:
                top_cc_text = f"{by_composite[0].get('cc')} (得分: {by_composite[0].get('composite', 0):.1f})"
            if bottom_5:
                bottom_cc_text = ", ".join([b.get('cc') for b in bottom_5[:3]])

        # 构建 prompt
        prompt = f"""你是 51Talk 泰国转介绍业务的高管助理，需要为管理层生成简明扼要的数据洞察。

数据概览：
- 付费进度: {paid_actual}/{paid_target} (缺口 {paid_gap:.1%})
- 金额进度: ${amount_actual:.0f}/${amount_target:.0f}
- 转化率: {conversion_actual:.1%}
- 预警数量: {alerts_count} 个（其中 🔴高级别 {high_alerts_count} 个）
- 渠道效能指数: {channel_text}
- CC TOP1: {top_cc_text}
- CC 综合得分后5名: {bottom_cc_text}

请输出 JSON 格式：
{{
  "executive_summary": "3句话管理层摘要（说白了风格，数据具体）",
  "key_actions": ["行动1", "行动2", "行动3"],
  "outlook": "本月预测一句话"
}}

要求：
- executive_summary 必须包含具体数字，不要模糊表述
- key_actions 必须具体可执行（不要空话）
- outlook 基于当前进度和预警给出月末预测
"""

        try:
            result = ai_client.generate_json(prompt)
            if result and isinstance(result, dict):
                return result
            else:
                logger.warning("AI 洞察生成返回格式错误，预期 dict")
                return None
        except Exception as e:
            logger.warning(f"AI 洞察生成失败: {e}")
            return None

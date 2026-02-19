"""
51Talk 转介绍周报自动生成 - 多数据源加载器
负责加载 input/ 目录下所有 11 个数据源子目录
"""
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from .data_processor import XlsxReader


class MultiSourceLoader:
    """多数据源加载器"""

    # 别名映射
    ALIAS_MAP = {
        "EA": "SS",
        "ea": "SS",
        "CM": "LP",
        "cm": "LP",
    }

    def __init__(self, input_dir: str):
        self.input_dir = Path(input_dir)
        self.sources = {}

    def load_all(self) -> dict:
        """加载所有数据源，返回结构化字典"""
        self.sources = {
            "口径对比": {},  # 由 DataProcessor 处理，这里不加载
            "leads达成": self._load_leads_achievement(),
            "打卡率": self._load_checkin_rate(),
            "围场汇总": self._load_cohort_summary(),
            "当月效率": self._load_channel_cohort_efficiency(),
            "课前课后": self._load_trial_followup(),
            "围场跟进": self._load_cohort_outreach(),
            "leads明细": self._load_leads_detail(),
            "订单明细": self._load_order_detail(),
            "月度环比": self._load_mom_comparison(),
            "月度同期": self._load_yoy_comparison(),
        }
        return self.sources

    def _find_xlsx(self, subdir: str) -> Optional[Path]:
        """在子目录中找到第一个 xlsx 文件"""
        dir_path = self.input_dir / subdir
        if not dir_path.exists():
            return None

        xlsx_files = list(dir_path.glob("*.xlsx"))
        if not xlsx_files:
            return None

        return xlsx_files[0]

    def _safe_float(self, val) -> Optional[float]:
        """安全转换为浮点数"""
        if val is None or val == '-' or val == '' or val == 'NaN':
            return None
        try:
            f = float(val)
            # 处理 Infinity
            if f == float('inf') or f == float('-inf'):
                return None
            return f
        except (ValueError, TypeError):
            return None

    def _safe_int(self, val) -> Optional[int]:
        """安全转换为整数"""
        if val is None or val == '-' or val == '':
            return None
        try:
            f = float(val)
            # 处理 Infinity
            if f == float('inf') or f == float('-inf'):
                return None
            return int(f)
        except (ValueError, TypeError):
            return None

    def _map_alias(self, name: str) -> str:
        """映射别名: EA→SS, CM→LP"""
        if not name:
            return name

        for old, new in self.ALIAS_MAP.items():
            if old in name:
                name = name.replace(old, new)

        return name

    def _excel_date_to_str(self, serial: int) -> str:
        """将 Excel serial date 转换为 YYYY-MM-DD 字符串"""
        try:
            # Excel 的日期起始于 1900-01-01，但有 1900-02-29 bug
            # Python datetime(1899, 12, 30) + serial days
            base = datetime(1899, 12, 30)
            date = base + timedelta(days=int(serial))
            return date.strftime("%Y-%m-%d")
        except:
            return str(serial)

    def _load_leads_achievement(self) -> dict:
        """加载 转介绍leads达成 数据"""
        xlsx_path = self._find_xlsx("转介绍leads达成")
        if not xlsx_path:
            return {}

        try:
            reader = XlsxReader(str(xlsx_path))
            rows = reader.get_sheet_data("转介绍leads达成_by_CM_EA_宽口径")

            if not rows:
                return {}

            teams = []

            # 跳过前2行表头，从第3行开始
            for row in rows:
                if row.get('_row', 0) < 3:
                    continue

                region = row.get('A', '')
                dept = self._map_alias(row.get('B', ''))
                team_name = row.get('C', '')

                # 跳过空行
                if not team_name:
                    continue

                # 每5列一组：总计/CC窄口径/EA窄口径/CM窄口径/宽口径
                # 每组: 注册付费率(col0), 注册(col1), 预约(col2), 出席(col3), 付费(col4)
                team_data = {
                    "部门": dept,
                    "团队": team_name,
                    "总计": {
                        "注册付费率": self._safe_float(row.get('D')),
                        "注册": self._safe_int(row.get('E')),
                        "预约": self._safe_int(row.get('F')),
                        "出席": self._safe_int(row.get('G')),
                        "付费": self._safe_int(row.get('H')),
                    },
                    "CC窄口径": {
                        "注册付费率": self._safe_float(row.get('I')),
                        "注册": self._safe_int(row.get('J')),
                        "预约": self._safe_int(row.get('K')),
                        "出席": self._safe_int(row.get('L')),
                        "付费": self._safe_int(row.get('M')),
                    },
                    "SS窄口径": {  # EA mapped
                        "注册付费率": self._safe_float(row.get('N')),
                        "注册": self._safe_int(row.get('O')),
                        "预约": self._safe_int(row.get('P')),
                        "出席": self._safe_int(row.get('Q')),
                        "付费": self._safe_int(row.get('R')),
                    },
                    "LP窄口径": {  # CM mapped
                        "注册付费率": self._safe_float(row.get('S')),
                        "注册": self._safe_int(row.get('T')),
                        "预约": self._safe_int(row.get('U')),
                        "出席": self._safe_int(row.get('V')),
                        "付费": self._safe_int(row.get('W')),
                    },
                    "宽口径": {
                        "注册付费率": self._safe_float(row.get('X')),
                        "注册": self._safe_int(row.get('Y')),
                        "预约": self._safe_int(row.get('Z')),
                        "出席": self._safe_int(row.get('AA')),
                        "付费": self._safe_int(row.get('AB')),
                    },
                }

                teams.append(team_data)

            return {"teams": teams}

        except Exception as e:
            print(f"加载 leads达成 数据失败: {e}")
            return {}

    def _load_checkin_rate(self) -> dict:
        """加载 当月转介绍打卡率 数据"""
        xlsx_path = self._find_xlsx("当月转介绍打卡率")
        if not xlsx_path:
            return {}

        try:
            reader = XlsxReader(str(xlsx_path))
            rows = reader.get_sheet_data("当月转介绍打卡率_Current_Month_Refer")

            if not rows:
                return {}

            summary = {}
            by_team = []
            by_cc = []

            for idx, row in enumerate(rows):
                region = row.get('A', '')
                team = row.get('B', '')
                cc = row.get('C', '')

                # Row 1 = 总计
                if idx == 0 or team == '总计':
                    summary = {
                        "打卡参与率": self._safe_float(row.get('D')),
                        "参与率": self._safe_float(row.get('E')),
                        "参与率_已打卡": self._safe_float(row.get('F')),
                        "参与率_未打卡": self._safe_float(row.get('G')),
                        "打卡倍率": self._safe_float(row.get('H')),
                        "带新系数": self._safe_float(row.get('I')),
                        "带新系数_已打卡": self._safe_float(row.get('J')),
                        "带新系数_未打卡": self._safe_float(row.get('K')),
                        "打卡倍率2": self._safe_float(row.get('L')),
                        "带货比": self._safe_float(row.get('M')),
                    }
                    continue

                # Row 2 = 泰国小计
                if team == '泰国' or team == '小计':
                    continue

                # 团队级数据（cc 为空）
                if not cc:
                    by_team.append({
                        "团队": team,
                        "打卡参与率": self._safe_float(row.get('D')),
                        "参与率": self._safe_float(row.get('E')),
                        "参与率_已打卡": self._safe_float(row.get('F')),
                        "参与率_未打卡": self._safe_float(row.get('G')),
                        "打卡倍率": self._safe_float(row.get('H')),
                        "带新系数": self._safe_float(row.get('I')),
                        "带货比": self._safe_float(row.get('M')),
                    })
                else:
                    # 个人级数据
                    by_cc.append({
                        "团队": team,
                        "CC": cc,
                        "打卡参与率": self._safe_float(row.get('D')),
                        "参与率": self._safe_float(row.get('E')),
                        "参与率_已打卡": self._safe_float(row.get('F')),
                        "参与率_未打卡": self._safe_float(row.get('G')),
                        "打卡倍率": self._safe_float(row.get('H')),
                        "带新系数": self._safe_float(row.get('I')),
                        "带货比": self._safe_float(row.get('M')),
                    })

            return {
                "summary": summary,
                "by_team": by_team,
                "by_cc": by_cc,
            }

        except Exception as e:
            print(f"加载 打卡率 数据失败: {e}")
            return {}

    def _load_cohort_summary(self) -> dict:
        """加载 本月围场数据汇总 数据"""
        xlsx_path = self._find_xlsx("本月围场数据汇总")
        if not xlsx_path:
            return {}

        try:
            reader = XlsxReader(str(xlsx_path))
            rows = reader.get_sheet_data("本月围场数据汇总")

            if not rows:
                return {}

            summary = {}
            by_cohort = []

            for idx, row in enumerate(rows):
                region = row.get('A', '')
                cohort = row.get('B', '')

                # Row 1 = 小计
                if idx == 0 or cohort == '小计':
                    summary = {
                        "围场转率": self._safe_float(row.get('C')),
                        "参与率": self._safe_float(row.get('D')),
                        "带货比": self._safe_float(row.get('E')),
                        "有效学员": self._safe_int(row.get('F')),
                        "B注册": self._safe_int(row.get('G')),
                        "B付费": self._safe_int(row.get('H')),
                    }
                    continue

                # 围场数据
                if cohort:
                    by_cohort.append({
                        "围场": cohort,
                        "围场转率": self._safe_float(row.get('C')),
                        "参与率": self._safe_float(row.get('D')),
                        "带货比": self._safe_float(row.get('E')),
                        "有效学员": self._safe_int(row.get('F')),
                        "B注册": self._safe_int(row.get('G')),
                        "B付费": self._safe_int(row.get('H')),
                    })

            return {
                "summary": summary,
                "by_cohort": by_cohort,
            }

        except Exception as e:
            print(f"加载 围场汇总 数据失败: {e}")
            return {}

    def _load_channel_cohort_efficiency(self) -> dict:
        """加载 CC:CM:EA:宽口径转介绍类型-当月效率 数据"""
        xlsx_path = self._find_xlsx("CC:CM:EA:宽口径转介绍类型-当月效率")
        if not xlsx_path:
            return {}

        try:
            reader = XlsxReader(str(xlsx_path))
            rows = reader.get_sheet_data("CC_CM_EA_宽口径转介绍类型_当月效率")

            if not rows:
                return {}

            by_cohort = []

            # 跳过前2行表头，从第3行开始
            for row in rows:
                if row.get('_row', 0) < 3:
                    continue

                region = row.get('A', '')
                cohort = row.get('B', '')

                if not cohort:
                    continue

                # 每6列一组：总计/CC窄口径/CM窄口径/EA窄口径/宽口径
                # 每组: 带货比(col0), 参与率(col1), 围场转率(col2), A学员数(col3), B注册(col4), B付费(col5)
                cohort_data = {
                    "围场": cohort,
                    "总计": {
                        "带货比": self._safe_float(row.get('C')),
                        "参与率": self._safe_float(row.get('D')),
                        "围场转率": self._safe_float(row.get('E')),
                        "A学员数": self._safe_int(row.get('F')),
                        "B注册": self._safe_int(row.get('G')),
                        "B付费": self._safe_int(row.get('H')),
                    },
                    "CC窄口径": {
                        "带货比": self._safe_float(row.get('I')),
                        "参与率": self._safe_float(row.get('J')),
                        "围场转率": self._safe_float(row.get('K')),
                        "A学员数": self._safe_int(row.get('L')),
                        "B注册": self._safe_int(row.get('M')),
                        "B付费": self._safe_int(row.get('N')),
                    },
                    "LP窄口径": {  # CM mapped
                        "带货比": self._safe_float(row.get('O')),
                        "参与率": self._safe_float(row.get('P')),
                        "围场转率": self._safe_float(row.get('Q')),
                        "A学员数": self._safe_int(row.get('R')),
                        "B注册": self._safe_int(row.get('S')),
                        "B付费": self._safe_int(row.get('T')),
                    },
                    "SS窄口径": {  # EA mapped
                        "带货比": self._safe_float(row.get('U')),
                        "参与率": self._safe_float(row.get('V')),
                        "围场转率": self._safe_float(row.get('W')),
                        "A学员数": self._safe_int(row.get('X')),
                        "B注册": self._safe_int(row.get('Y')),
                        "B付费": self._safe_int(row.get('Z')),
                    },
                    "宽口径": {
                        "带货比": self._safe_float(row.get('AA')),
                        "参与率": self._safe_float(row.get('AB')),
                        "围场转率": self._safe_float(row.get('AC')),
                        "A学员数": self._safe_int(row.get('AD')),
                        "B注册": self._safe_int(row.get('AE')),
                        "B付费": self._safe_int(row.get('AF')),
                    },
                }

                by_cohort.append(cohort_data)

            return {"by_cohort": by_cohort}

        except Exception as e:
            print(f"加载 当月效率 数据失败: {e}")
            return {}

    def _load_trial_followup(self) -> dict:
        """加载 首次体验课课前课后跟进 数据"""
        xlsx_path = self._find_xlsx("首次体验课课前课后跟进")
        if not xlsx_path:
            return {}

        try:
            reader = XlsxReader(str(xlsx_path))
            rows = reader.get_sheet_data("首次体验课课前课后跟进")

            if not rows:
                return {}

            summary = {}
            by_team = []
            by_cc = []

            for idx, row in enumerate(rows):
                channel = row.get('A', '')
                team = row.get('B', '')
                cc = row.get('C', '')

                # Row 1 = MKT小计
                if idx == 0 or team == 'MKT' or team == '小计':
                    summary = {
                        "体验课量": self._safe_int(row.get('D')),
                        "出席数": self._safe_int(row.get('E')),
                        "课前拨打率": self._safe_float(row.get('L')),
                        "课前接通率": self._safe_float(row.get('M')),
                        "课前有效接通率": self._safe_float(row.get('N')),
                        "课后拨打率": self._safe_float(row.get('O')),
                        "课后接通率": self._safe_float(row.get('P')),
                        "课后有效接通率": self._safe_float(row.get('Q')),
                    }
                    continue

                # 团队级数据（cc 为空）
                if team and not cc:
                    by_team.append({
                        "团队": team,
                        "体验课量": self._safe_int(row.get('D')),
                        "出席数": self._safe_int(row.get('E')),
                        "课前拨打率": self._safe_float(row.get('L')),
                        "课前接通率": self._safe_float(row.get('M')),
                        "课前有效接通率": self._safe_float(row.get('N')),
                        "课后拨打率": self._safe_float(row.get('O')),
                        "课后接通率": self._safe_float(row.get('P')),
                        "课后有效接通率": self._safe_float(row.get('Q')),
                    })
                elif cc:
                    # 个人级数据
                    by_cc.append({
                        "团队": team,
                        "CC": cc,
                        "体验课量": self._safe_int(row.get('D')),
                        "出席数": self._safe_int(row.get('E')),
                        "课前拨打率": self._safe_float(row.get('L')),
                        "课前接通率": self._safe_float(row.get('M')),
                        "课前有效接通率": self._safe_float(row.get('N')),
                        "课后拨打率": self._safe_float(row.get('O')),
                        "课后接通率": self._safe_float(row.get('P')),
                        "课后有效接通率": self._safe_float(row.get('Q')),
                    })

            return {
                "summary": summary,
                "by_team": by_team,
                "by_cc": by_cc,
            }

        except Exception as e:
            print(f"加载 课前课后 数据失败: {e}")
            return {}

    def _load_cohort_outreach(self) -> dict:
        """加载 不同围场月度付费用户跟进 数据"""
        xlsx_path = self._find_xlsx("不同围场月度付费用户跟进")
        if not xlsx_path:
            return {}

        try:
            reader = XlsxReader(str(xlsx_path))
            rows = reader.get_sheet_data("不同围场月度付费用户跟进")

            if not rows:
                return {}

            summary = {}
            by_cohort = []
            current_cohort = None

            for idx, row in enumerate(rows):
                cohort = row.get('A', '')
                team = row.get('B', '')
                cc = row.get('C', '')
                student_id = row.get('D', '')

                # Row 1 = 总计
                if idx == 0 or cohort == '总计':
                    summary = {
                        "学员数": self._safe_int(row.get('H')),
                        "拨打覆盖率": self._safe_float(row.get('H')),
                        "接通覆盖率": self._safe_float(row.get('I')),
                        "有效接通覆盖率": self._safe_float(row.get('J')),
                    }
                    continue

                # 围场分组
                if cohort and cohort != current_cohort:
                    current_cohort = cohort
                    by_cohort.append({
                        "围场": cohort,
                        "学员数": 0,
                        "拨打覆盖率": None,
                        "接通覆盖率": None,
                        "有效接通覆盖率": None,
                        "by_team": []
                    })

                # 团队级数据
                if team and not cc and current_cohort:
                    # 找到当前围场的数据
                    for c in by_cohort:
                        if c["围场"] == current_cohort:
                            c["by_team"].append({
                                "团队": team,
                                "学员数": self._safe_int(row.get('H')),
                                "拨打覆盖率": self._safe_float(row.get('H')),
                                "接通覆盖率": self._safe_float(row.get('I')),
                                "有效接通覆盖率": self._safe_float(row.get('J')),
                            })
                            break

            return {
                "summary": summary,
                "by_cohort": by_cohort,
            }

        except Exception as e:
            print(f"加载 围场跟进 数据失败: {e}")
            return {}

    def _load_leads_detail(self) -> dict:
        """加载 转介绍leads明细表 数据"""
        xlsx_path = self._find_xlsx("转介绍leads明细表")
        if not xlsx_path:
            return {}

        try:
            reader = XlsxReader(str(xlsx_path))
            rows = reader.get_sheet_data("CM_EA转介绍leads明细表")

            if not rows:
                return {}

            total_leads = len(rows)
            by_channel = {}
            by_team = {}
            conversion_funnel = {
                "注册": 0,
                "预约": 0,
                "出席": 0,
                "付费": 0,
            }
            by_cohort = {}

            for row in rows:
                # 统计渠道
                channel = self._map_alias(row.get('U', ''))
                if channel:
                    by_channel[channel] = by_channel.get(channel, 0) + 1

                # 统计团队
                team = row.get('Y', '')
                if team:
                    if team not in by_team:
                        by_team[team] = {
                            "团队": team,
                            "leads": 0,
                            "预约": 0,
                            "出席": 0,
                            "付费": 0,
                            "金额": 0,
                        }
                    by_team[team]["leads"] += 1

                    # 预约
                    if row.get('L'):
                        by_team[team]["预约"] += 1
                        conversion_funnel["预约"] += 1

                    # 出席
                    if row.get('O'):
                        by_team[team]["出席"] += 1
                        conversion_funnel["出席"] += 1

                    # 付费
                    if row.get('R'):
                        by_team[team]["付费"] += 1
                        conversion_funnel["付费"] += 1

                        # 金额
                        amount = self._safe_float(row.get('AS'))
                        if amount:
                            by_team[team]["金额"] += amount

                # 统计围场
                cohort = row.get('AY', '')
                if cohort:
                    by_cohort[cohort] = by_cohort.get(cohort, 0) + 1

            conversion_funnel["注册"] = total_leads

            return {
                "total_leads": total_leads,
                "by_channel": by_channel,
                "by_team": list(by_team.values()),
                "conversion_funnel": conversion_funnel,
                "by_cohort": by_cohort,
            }

        except Exception as e:
            print(f"加载 leads明细 数据失败: {e}")
            return {}

    def _load_order_detail(self) -> dict:
        """加载 实时订单明细数据 数据"""
        xlsx_path = self._find_xlsx("实时订单明细数据")
        if not xlsx_path:
            return {}

        try:
            reader = XlsxReader(str(xlsx_path))
            rows = reader.get_sheet_data("订单明细数据_实时")

            if not rows:
                return {}

            total_orders = len(rows)
            total_amount = 0
            referral_orders = 0
            by_team = {}
            by_product = {}

            for row in rows:
                # 金额
                amount = self._safe_float(row.get('T'))
                if amount:
                    total_amount += amount

                # 转介绍订单
                channel = row.get('G', '')
                if '转介绍' in channel:
                    referral_orders += 1

                # 团队统计
                team = row.get('P', '')
                if team:
                    if team not in by_team:
                        by_team[team] = {
                            "团队": team,
                            "订单数": 0,
                            "金额": 0,
                            "新单数": 0,
                        }
                    by_team[team]["订单数"] += 1
                    if amount:
                        by_team[team]["金额"] += amount

                    # 新单
                    is_new = row.get('Q', '')
                    if is_new == '是':
                        by_team[team]["新单数"] += 1

                # 产品统计
                product = row.get('O', '')
                if product:
                    if product not in by_product:
                        by_product[product] = {
                            "产品": product,
                            "订单数": 0,
                            "金额": 0,
                        }
                    by_product[product]["订单数"] += 1
                    if amount:
                        by_product[product]["金额"] += amount

            avg_amount = total_amount / total_orders if total_orders > 0 else 0

            return {
                "total_orders": total_orders,
                "total_amount": total_amount,
                "referral_orders": referral_orders,
                "by_team": list(by_team.values()),
                "by_product": list(by_product.values()),
                "avg_amount": avg_amount,
            }

        except Exception as e:
            print(f"加载 订单明细 数据失败: {e}")
            return {}

    def _load_mom_comparison(self) -> dict:
        """加载 转介绍渠道月度环比 数据"""
        xlsx_path = self._find_xlsx("转介绍渠道月度环比")
        if not xlsx_path:
            return {}

        try:
            reader = XlsxReader(str(xlsx_path))
            rows = reader.get_sheet_data("截面跟进效率副本")

            if not rows:
                return {}

            # Row 4 包含月份信息（每个指标3个月）
            months = []
            by_channel = []

            # 提取月份（从 Row 4）
            month_row = None
            for row in rows:
                if row.get('_row', 0) == 4:
                    month_row = row
                    break

            if month_row:
                # 从列B开始提取前3个月份（注册的3个月）
                for col in ['B', 'C', 'D']:
                    val = month_row.get(col, '')
                    if val and str(val).isdigit():
                        months.append(str(val))

            # 默认月份
            if not months:
                months = ["202512", "202601", "202602"]

            # 从 Row 5+ 提取数据
            for row in rows:
                if row.get('_row', 0) < 5:
                    continue

                channel = row.get('A', '')
                if not channel:
                    continue

                channel_data = {
                    "渠道": channel,
                    "注册": [
                        self._safe_int(row.get('B')),
                        self._safe_int(row.get('C')),
                        self._safe_int(row.get('D')),
                    ],
                    "注册占比": [
                        self._safe_float(row.get('E')),
                        self._safe_float(row.get('F')),
                        self._safe_float(row.get('G')),
                    ],
                    "注册付费率": [
                        self._safe_float(row.get('H')),
                        self._safe_float(row.get('I')),
                        self._safe_float(row.get('J')),
                    ],
                    "客单价": [
                        self._safe_float(row.get('K')),
                        self._safe_float(row.get('L')),
                        self._safe_float(row.get('M')),
                    ],
                    "预约率": [
                        self._safe_float(row.get('N')),
                        self._safe_float(row.get('O')),
                        self._safe_float(row.get('P')),
                    ],
                    "预约出席率": [
                        self._safe_float(row.get('Q')),
                        self._safe_float(row.get('R')),
                        self._safe_float(row.get('S')),
                    ],
                    "出席付费率": [
                        self._safe_float(row.get('T')),
                        self._safe_float(row.get('U')),
                        self._safe_float(row.get('V')),
                    ],
                }

                by_channel.append(channel_data)

            return {
                "months": months,
                "by_channel": by_channel,
            }

        except Exception as e:
            print(f"加载 月度环比 数据失败: {e}")
            return {}

    def _load_yoy_comparison(self) -> dict:
        """加载 截面跟进效率月度同期 数据"""
        xlsx_path = self._find_xlsx("截面跟进效率月度同期")
        if not xlsx_path:
            return {}

        try:
            reader = XlsxReader(str(xlsx_path))
            rows = reader.get_sheet_data("截面跟进效率_月度同期")

            if not rows:
                return {}

            # 按渠道类型分组数据
            market_data = []  # 市场渠道数据
            referral_data = []  # 转介绍渠道数据

            # 从 Row 5+ 提取数据
            for row in rows:
                if row.get('_row', 0) < 5:
                    continue

                channel_type = row.get('A', '')
                month = str(row.get('B', ''))

                if not channel_type or not month:
                    continue

                # 每行是一个月的完整数据
                month_data = {
                    "月份": month,
                    "预约率": self._safe_float(row.get('C')),
                    "预约出席率": self._safe_float(row.get('D')),
                    "出席付费率": self._safe_float(row.get('E')),
                    "注册付费率": self._safe_float(row.get('F')),
                    "注册": self._safe_int(row.get('G')),
                    "预约": self._safe_int(row.get('H')),
                    "出席": self._safe_int(row.get('I')),
                    "付费": self._safe_int(row.get('J')),
                    "美金金额": self._safe_float(row.get('K')),
                }

                if channel_type == '市场':
                    market_data.append(month_data)
                elif channel_type == '转介绍':
                    referral_data.append(month_data)

            # 提取所有月份列表（去重、排序）
            all_months = set()
            for data in market_data + referral_data:
                all_months.add(data["月份"])
            months = sorted(list(all_months))

            return {
                "months": months,
                "market": market_data,
                "referral": referral_data,
            }

        except Exception as e:
            print(f"加载 月度同期 数据失败: {e}")
            return {}


def load_all_sources(input_dir: str) -> Dict[str, Any]:
    """加载所有数据源的便捷函数"""
    loader = MultiSourceLoader(input_dir)
    return loader.load_all()


if __name__ == "__main__":
    # 测试代码
    import sys
    if len(sys.argv) > 1:
        input_dir = sys.argv[1]
    else:
        input_dir = "/Users/felixmacbookairm4/Desktop/ref-ops-engine/input"

    sources = load_all_sources(input_dir)
    print("=== 已加载数据源 ===")
    for name, data in sources.items():
        if data:
            print(f"{name}: ✓")
        else:
            print(f"{name}: ✗ (未找到或加载失败)")

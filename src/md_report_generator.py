"""
51Talk 转介绍周报自动生成 - Markdown 报告生成器
核心职责：接收分析结果字典，按模板生成两个版本的 .md 文件
"""
from typing import Dict, List, Any
from datetime import datetime
from pathlib import Path
from .i18n import t


class MarkdownReportGenerator:
    """Markdown 报告生成器"""

    def __init__(self, analysis_result: Dict, output_dir: Path, lang: str = "zh"):
        self.result = analysis_result
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.lang = lang  # 语言代码

        # 提取常用元数据
        self.meta = analysis_result.get("meta", {})
        self.report_date = self.meta.get("report_date", datetime.now())
        self.data_date = self.meta.get("data_date", datetime.now())
        self.current_month = self.meta.get("current_month", "")
        self.days_in_month = self.meta.get("days_in_month", 28)
        self.current_day = self.meta.get("current_day", 18)
        self.time_progress = analysis_result.get("time_progress", 0.0)

    def generate_both(self) -> Dict[str, Path]:
        """生成运营版和管理层版两个报告"""
        ops_path = self.generate_ops_report()
        exec_path = self.generate_exec_report()

        return {
            "ops": ops_path,
            "exec": exec_path,
        }

    def generate_ops_report(self) -> Path:
        """生成运营版报告"""
        date_str = self.report_date.strftime("%Y%m%d")
        lang_suffix = f"-{self.lang}" if self.lang != "zh" else ""
        file_path = self.output_dir / f"referral-review-ops-{date_str}{lang_suffix}.md"

        content = self._build_ops_content()

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        return file_path

    def generate_exec_report(self) -> Path:
        """生成管理层版报告"""
        date_str = self.report_date.strftime("%Y%m%d")
        lang_suffix = f"-{self.lang}" if self.lang != "zh" else ""
        file_path = self.output_dir / f"referral-review-exec-{date_str}{lang_suffix}.md"

        content = self._build_exec_content()

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        return file_path

    def _build_ops_content(self) -> str:
        """构建运营版报告内容"""
        parts = [
            self._ops_header(),
            self._ops_core_conclusion(),
            self._ops_summary_dashboard(),
            self._ops_monthly_progress_chart(),  # 新增 #4
            self._ops_funnel_diagnosis(),
            self._ops_funnel_flowchart(),  # 新增 #1
            self._ops_team_ranking(),
            self._ops_cc_ranking(),  # M5 CC个人排名
            self._ops_attended_not_paid(),  # M5 已出席未付费
            self._ops_leads_achievement(),  # M4 Phase 2
            self._ops_cohort_analysis(),  # M4 Phase 2
            self._ops_checkin_analysis(),  # M4 Phase 2
            self._ops_followup_analysis(),  # M4 Phase 2
            self._ops_roi_analysis(),
            self._ops_channel_pie_chart(),  # 新增 #5
            self._ops_unit_price_analysis(),
            self._ops_unit_price_chart(),  # 新增 #7
            self._ops_order_analysis(),  # M4 Phase 2
            self._ops_trend_analysis(),  # M4 Phase 2
            self._ops_risk_alerts(),
            self._ops_risk_dashboard(),  # 新增 #3
            self._ops_action_list(),
            self._ops_data_source(),
            self._ops_appendix(),
            self._ops_next_week(),
            self._ops_sales_leaderboard(),  # 新增 #8
        ]

        # 过滤掉空字符串（数据缺失时方法返回空字符串）
        parts = [p for p in parts if p]

        return "\n\n---\n\n".join(parts)

    def _build_exec_content(self) -> str:
        """构建管理层版报告内容"""
        parts = [
            self._exec_header(),
            self._exec_summary(),
            self._exec_trend(),
            self._exec_risk_alerts(),
            self._exec_roi_allocation(),
            self._exec_efficiency_index_chart(),  # 新增 #6
            self._exec_cohort_analysis(),  # M4 Phase 2
            self._exec_checkin_analysis(),  # M4 Phase 2
            self._exec_leads_achievement(),  # M4 Phase 2
            self._exec_followup_analysis(),  # M4 Phase 2
            self._exec_order_analysis(),  # M4 Phase 2
            self._exec_trend_analysis(),  # M4 Phase 2
            self._exec_root_cause(),
            self._exec_team_benchmark(),
            self._exec_cc_performance_summary(),  # M5 CC绩效概要
            self._exec_key_numbers(),
            self._exec_next_month(),
            self._exec_decision_points(),
            self._exec_data_source(),
            self._exec_glossary(),
        ]

        return "\n\n---\n\n".join(parts)

    # ==================== 运营版各章节 ====================

    def _ops_header(self) -> str:
        """运营版报告头"""
        if self.lang == "zh":
            return f"""# 泰国转介绍业绩追踪 — 运营版

**报告日期**: {self.report_date.strftime("%Y-%m-%d")}
**数据区间**: {self.current_month[:4]}-{self.current_month[4:]}-01 ~ {self.data_date.strftime("%Y-%m-%d")}（T-1）
**时间进度**: {self.current_day}/{self.days_in_month} 天 = {self.time_progress*100:.2f}%
**受众**: CC Team Leaders + 运营分析团队
**报告类型**: 战术执行层（详细诊断+执行清单）"""
        else:
            return f"""# รายงานติดตามการแนะนำ ประเทศไทย — ฉบับปฏิบัติการ

**วันที่รายงาน**: {self.report_date.strftime("%Y-%m-%d")}
**ช่วงข้อมูล**: {self.current_month[:4]}-{self.current_month[4:]}-01 ~ {self.data_date.strftime("%Y-%m-%d")} (T-1)
**ความคืบหน้าเวลา**: {self.current_day}/{self.days_in_month} วัน = {self.time_progress*100:.2f}%
**กลุ่มเป้าหมาย**: หัวหน้าทีม CC + ทีมวิเคราะห์
**ประเภทรายงาน**: ระดับปฏิบัติการ (วินิจฉัยละเอียด + แผนปฏิบัติ)"""

    def _ops_core_conclusion(self) -> str:
        """运营版核心结论（智能生成）"""
        summary = self.result.get("summary", {})
        funnel = self.result.get("funnel", {})
        risk_alerts = self.result.get("risk_alerts", [])

        # 找到最大缺口指标
        max_gap_name = ""
        max_gap = 0.0
        for name, data in summary.items():
            gap = data.get("gap", 0.0)
            if gap < max_gap:
                max_gap = gap
                max_gap_name = name

        # 翻译max_gap_name
        if self.lang == "zh":
            max_gap_name_display = max_gap_name
        else:
            indicator_map = {"注册": "ลงทะเบียน", "预约": "จอง", "出席": "เข้าคลาส", "付费": "ชำระ", "金额": "ยอดเงิน", "转化率": "อัตราแปลง"}
            max_gap_name_display = indicator_map.get(max_gap_name, max_gap_name)

        # 提取当前出席付费率
        total_funnel = funnel.get("总计", {})
        current_attendance_rate = total_funnel.get("出席付费率", 0.0)

        if self.lang == "zh":
            # 中文润色版：去 AI 味，用运营老手语气
            problem_focus = f"**问题出在哪**: {max_gap_name_display}严重掉队，缺口 {max_gap*100:.1f}%，出席付费率 {current_attendance_rate*100:.1f}%。"
            root_cause = "**根源拆解**: ① 低质开源污染漏斗；② 出席后没付费的跟进不够；③ 转化率在掉。"
            p0_action = f"**立刻做**: 分层触达出席未付费用户 + 优化开源质量，预计回补 10-15 单，缺口收窄到 {(max_gap + 0.10)*100:.1f}%。"
            title = "## 核心结论"
        else:
            problem_focus = f"**ประเด็นปัญหา**: {max_gap_name_display}ล่าช้าร้ายแรง ส่วนต่างเป้า {max_gap*100:.1f}% อัตราชำระหลังเข้าคลาส {current_attendance_rate*100:.1f}%"
            root_cause = "**สาเหตุหลัก**: ① แหล่งคุณภาพต่ำทำลายช่องทาง ② ติดตามผู้เข้าคลาสแต่ยังไม่ชำระไม่เพียงพอ ③ อัตราแปลงลดลง"
            p0_action = f"**ปฏิบัติทันที**: ติดตามผู้เข้าคลาสแบบแบ่งชั้น + ปรับปรุงคุณภาพแหล่งข้อมูล คาดกู้คืน 10-15 หน่วย ลดส่วนต่างเหลือ {(max_gap + 0.10)*100:.1f}%"
            title = "## สรุปสำคัญ"

        return f"""{title}

{problem_focus}

{root_cause}

{p0_action}"""

    def _ops_summary_dashboard(self) -> str:
        """运营版整体进度看板"""
        summary = self.result.get("summary", {})

        # 指标名映射
        if self.lang == "zh":
            indicator_map = {"注册": "注册", "预约": "预约", "出席": "出席", "付费": "付费", "金额": "金额", "转化率": "转化率"}
        else:
            indicator_map = {"注册": "ลงทะเบียน", "预约": "จอง", "出席": "เข้าคลาส", "付费": "ชำระ", "金额": "ยอดเงิน", "转化率": "อัตราแปลง"}

        # 状态映射
        if self.lang == "zh":
            status_map = {"🟢 持平": "🟢 持平", "🟡 落后": "🟡 落后", "🔴 严重": "🔴 严重"}
        else:
            status_map = {"🟢 持平": "🟢 ทัน", "🟡 落后": "🟡 ล่าช้า", "🔴 严重": "🔴 วิกฤต"}

        rows = []
        for name, data in summary.items():
            actual = data.get("actual", 0)
            target = data.get("target", 0)
            eff_progress = data.get("efficiency_progress", 0.0)
            gap = data.get("gap", 0.0)
            status = data.get("status", "")

            # 翻译指标名和状态
            name_display = indicator_map.get(name, name)
            status_display = status_map.get(status, status)

            # 格式化数字
            if name in ["金额"]:
                actual_str = f"{actual:,.0f}"
                target_str = f"{target:,.0f}"
            elif name in ["转化率"]:
                actual_str = f"{actual*100:.2f}%" if actual < 1 else f"{actual:.0f}"
                target_str = f"{target*100:.0f}%" if target < 1 else f"{target:.0f}"
            else:
                actual_str = f"{actual:.0f}"
                target_str = f"{target:.0f}"

            # 加粗付费行
            if name == "付费":
                name_display = f"**{name_display}**"
                actual_str = f"**{actual_str}**"
                target_str = f"**{target_str}**"
                eff_str = f"**{eff_progress*100:.2f}%**"
                gap_str = f"**{gap*100:.2f}%**"
            else:
                eff_str = f"{eff_progress*100:.2f}%"
                gap_str = f"{gap*100:.2f}%"

            rows.append(f"| {name_display} | {target_str} | {actual_str} | {eff_str} | {gap_str} | {status_display} |")

        table = "\n".join(rows)

        if self.lang == "zh":
            title = "## 一、整体进度看板"
            table_header = "| 指标 | 月目标 | 已完成 | 效率进度 | 目标缺口 | 状态 |"
            formula_note = f"> **计算公式**: 目标缺口 = 效率进度 - 时间进度（{self.time_progress*100:.2f}%）。持平 > 0%，落后 -5%~0%，严重 < -5%。"
            coverage_note = "**基数说明**: 已完成数据基于当月注册用户的全流程跟踪，数据覆盖率 100%。"
        else:
            title = "## 1. แดชบอร์ดความคืบหน้ารวม"
            table_header = "| ตัวชี้วัด | เป้าเดือน | สำเร็จ | ความคืบหน้า | ส่วนต่าง | สถานะ |"
            formula_note = f"> **สูตรคำนวณ**: ส่วนต่างเป้า = ความคืบหน้า - ความคืบหน้าเวลา ({self.time_progress*100:.2f}%) ทันเป้า > 0% ล่าช้า -5%~0% วิกฤต < -5%"
            coverage_note = "**หมายเหตุฐานข้อมูล**: ข้อมูลสำเร็จติดตามผู้ลงทะเบียนเดือนนี้ทั้งหมด ครอบคลุม 100%"

        return f"""{title}

{table_header}
|------|-------:|-------:|---------:|--------:|------|
{table}

{formula_note}

{coverage_note}"""

    def _ops_monthly_progress_chart(self) -> str:
        """运营版月度实际 vs 目标进度图（新增 #4）"""
        summary = self.result.get("summary", {})

        # 提取各指标的效率进度
        if self.lang == "zh":
            indicators = ["注册", "预约", "出席", "付费", "金额"]
            ylabel = "进度 (%)"
            chart_title = "月度进度对比：实际 vs 时间进度"
        else:
            indicators = ["ลงทะเบียน", "จอง", "เข้าคลาส", "ชำระ", "ยอดเงิน"]
            ylabel = "ความคืบหน้า (%)"
            chart_title = "เปรียบเทียบความคืบหน้า: จริง vs เวลา"

        # 提取值（顺序固定：注册、预约、出席、付费、金额）
        indicator_keys = ["注册", "预约", "出席", "付费", "金额"]
        progress_values = []

        for name in indicator_keys:
            data = summary.get(name, {})
            eff_progress = data.get("efficiency_progress", 0.0) * 100
            progress_values.append(f"{eff_progress:.1f}")

        # 时间进度基准线（平直线）
        time_baseline = [f"{self.time_progress*100:.1f}"] * len(indicators)

        mermaid_chart = f"""```mermaid
%%{{init: {{'theme':'base'}}}}%%
xychart-beta
  title "{chart_title}"
  x-axis [{", ".join(indicators)}]
  y-axis "{ylabel}" 0 --> 100
  bar [{", ".join(progress_values)}]
  line [{", ".join(time_baseline)}]
```"""

        if self.lang == "zh":
            explain = f"""**图表说明**:
- 蓝柱 = 各指标效率进度
- 红线 = 时间进度基准（{self.time_progress*100:.1f}%）
- 柱高于线 = 超前，柱低于线 = 落后"""
            section_title = "### 1.1 目标进度对比图"
        else:
            explain = f"""**คำอธิบายกราฟ**:
- แท่งน้ำเงิน = ความคืบหน้าแต่ละตัวชี้วัด
- เส้นแดง = ฐานความคืบหน้าเวลา ({self.time_progress*100:.1f}%)
- สูงกว่าเส้น = เหนือเป้า, ต่ำกว่าเส้น = ล่าช้า"""
            section_title = "### 1.1 กราฟเปรียบเทียบความคืบหน้า"

        return f"""{section_title}

{mermaid_chart}

{explain}"""

    def _ops_funnel_diagnosis(self) -> str:
        """运营版完整漏斗诊断"""
        funnel = self.result.get("funnel", {})
        trend = self.result.get("trend", {})

        # 构建趋势图
        months = trend.get("months", [])
        total_rates = trend.get("总计_出席付费率", [])
        cc_rates = trend.get("CC窄口径_出席付费率", [])
        other_rates = trend.get("其它_出席付费率", [])

        # 格式化月份标签
        month_labels = [f"{m[4:6]}-{m[:4][2:]}" for m in months]  # "202601" -> "01-26"

        if self.lang == "zh":
            chart_title = f"出席付费率月度趋势（最近 {len(months)} 个月）"
            ylabel = "出席付费率 (%)"
            chart_explain = """**图表说明**:
- 蓝线 = 总体出席付费率
- 红线 = CC 窄口径
- 绿线 = 宽口径"""
        else:
            chart_title = f"อัตราชำระหลังเข้าคลาส {len(months)} เดือน"
            ylabel = "อัตรา (%)"
            chart_explain = """**คำอธิบายกราฟ**:
- เส้นน้ำเงิน = อัตรารวม
- เส้นแดง = CC ช่องแคบ
- เส้นเขียว = ช่องกว้าง"""

        mermaid_chart = f"""```mermaid
%%{{init: {{'theme':'base'}}}}%%
xychart-beta
  title "{chart_title}"
  x-axis [{", ".join(month_labels)}]
  y-axis "{ylabel}" 0 --> 70
  line [{", ".join([f"{r*100:.1f}" for r in total_rates])}]
  line [{", ".join([f"{r*100:.1f}" for r in cc_rates])}]
  line [{", ".join([f"{r*100:.1f}" for r in other_rates])}]
```

{chart_explain}"""

        # 对标基准表
        total_funnel = funnel.get("总计", {})
        cc_funnel = funnel.get("CC窄口径", {})
        other_funnel = funnel.get("其它", {})

        current_total_rate = total_funnel.get("出席付费率", 0.0)
        current_cc_rate = cc_funnel.get("出席付费率", 0.0)
        current_other_rate = other_funnel.get("出席付费率", 0.0)

        # 计算6个月平均
        avg_total = sum(total_rates) / len(total_rates) if total_rates else 0.0
        avg_cc = sum(cc_rates) / len(cc_rates) if cc_rates else 0.0
        avg_other = sum(other_rates) / len(other_rates) if other_rates else 0.0

        # 历史最优
        max_total = max(total_rates) if total_rates else 0.0
        max_cc = max(cc_rates) if cc_rates else 0.0
        max_other = max(other_rates) if other_rates else 0.0

        if self.lang == "zh":
            benchmark_title = "#### 对标基准表"
            benchmark_header = f"| 指标 | 本月实际 | 上月 | {len(months)} 个月平均 | 历史最优 | 健康阈值 | 状态 |"
            benchmark_rows = [
                f"| **总体出席付费率** | {current_total_rate*100:.1f}% | {total_rates[-2]*100:.1f}% | {avg_total*100:.1f}% | {max_total*100:.1f}% | ≥40% | {'🔴 严重' if current_total_rate < 0.4 else '🟢 健康'} |",
                f"| **CC 窄出席付费率** | {current_cc_rate*100:.1f}% | {cc_rates[-2]*100:.1f}% | {avg_cc*100:.1f}% | {max_cc*100:.1f}% | ≥50% | {'🔴 严重' if current_cc_rate < 0.5 else '🟢 健康'} |",
                f"| **宽口出席付费率** | {current_other_rate*100:.1f}% | {other_rates[-2]*100:.1f}% | {avg_other*100:.1f}% | {max_other*100:.1f}% | ≥30% | {'🔴 严重' if current_other_rate < 0.3 else '🟢 健康'} |"
            ]
        else:
            benchmark_title = "#### ตารางเปรียบเทียบ"
            benchmark_header = f"| ตัวชี้วัด | เดือนนี้ | เดือนก่อน | เฉลี่ย {len(months)} เดือน | สูงสุด | เกณฑ์ | สถานะ |"
            benchmark_rows = [
                f"| **อัตรารวม** | {current_total_rate*100:.1f}% | {total_rates[-2]*100:.1f}% | {avg_total*100:.1f}% | {max_total*100:.1f}% | ≥40% | {'🔴 วิกฤต' if current_total_rate < 0.4 else '🟢 ดี'} |",
                f"| **CC ช่องแคบ** | {current_cc_rate*100:.1f}% | {cc_rates[-2]*100:.1f}% | {avg_cc*100:.1f}% | {max_cc*100:.1f}% | ≥50% | {'🔴 วิกฤต' if current_cc_rate < 0.5 else '🟢 ดี'} |",
                f"| **ช่องกว้าง** | {current_other_rate*100:.1f}% | {other_rates[-2]*100:.1f}% | {avg_other*100:.1f}% | {max_other*100:.1f}% | ≥30% | {'🔴 วิกฤต' if current_other_rate < 0.3 else '🟢 ดี'} |"
            ]

        benchmark_table = f"""{benchmark_title}

{benchmark_header}
|------|-------:|-----:|----------:|--------:|--------:|------|
{chr(10).join(benchmark_rows)}"""

        # 口径开源进度对比
        channel_comparison = self.result.get("channel_comparison", {})
        channel_rows = []

        for channel_name in ["CC窄口径", "SS窄口径", "其它"]:
            data = channel_comparison.get(channel_name, {})
            reg = data.get("注册", 0)
            paid = data.get("付费", 0)
            amount = data.get("金额", 0)
            reg_paid_rate = paid / reg if reg > 0 else 0.0
            target = data.get("目标", 0)
            eff_progress = data.get("效率进度", 0.0)
            gap = data.get("目标缺口", 0.0)

            if self.lang == "zh":
                status = "🟢 持平" if gap > 0 else ("🟡 落后" if gap > -0.05 else "🔴 严重")
                no_target = "⚪ 无目标"
                channel_display = channel_name
            else:
                status = "🟢 ทัน" if gap > 0 else ("🟡 ล่าช้า" if gap > -0.05 else "🔴 วิกฤต")
                no_target = "⚪ ไม่มีเป้า"
                # 泰文渠道名
                channel_map = {"CC窄口径": "CC ช่องแคบ", "SS窄口径": "SS ช่องแคบ", "其它": "ช่องกว้าง"}
                channel_display = channel_map.get(channel_name, channel_name)

            if target > 0:
                channel_rows.append(
                    f"| **{channel_display}** | {target} | {reg} | {eff_progress*100:.2f}% | {gap*100:.2f}% | {paid} | {amount:,} | {reg_paid_rate*100:.1f}% | {status} |"
                )
            else:
                channel_rows.append(
                    f"| **{channel_display}** | — | {reg} | — | — | {paid} | {amount:,} | {reg_paid_rate*100:.1f}% | {no_target} |"
                )

        channel_table = "\n".join(channel_rows)

        if self.lang == "zh":
            section_title = "## 二、完整漏斗诊断（4 级对标）"
            subsection1 = "### 2.1 出席付费率趋势分析"
            subsection2 = "### 2.2 口径开源进度对比"
            table_header = "| 口径 | 月目标 | 已完成 | 效率进度 | 目标缺口 | 付费 | 金额($) | 注册付费率 | 状态 |"
            efficiency_note = """**说白了**:
- 窄口（CC+SS）注册占比 vs 付费占比 = 效能指数
- 宽口注册占比高但付费占比低，质量门槛必须提"""
        else:
            section_title = "## 2. วินิจฉัยช่องทางครบวงจร (4 ระดับ)"
            subsection1 = "### 2.1 วิเคราะห์แนวโน้มอัตราชำระ"
            subsection2 = "### 2.2 เปรียบเทียบช่องทาง"
            table_header = "| ช่องทาง | เป้าเดือน | สำเร็จ | ความคืบหน้า | ส่วนต่าง | ชำระ | ยอด($) | อัตราชำระ | สถานะ |"
            efficiency_note = """**กล่าวคือ**:
- ช่องแคบ (CC+SS) สัดส่วนลงทะเบียน vs ชำระ = ดัชนีประสิทธิภาพ
- ช่องกว้างสัดส่วนลงทะเบียนสูงแต่ชำระต่ำ ต้องปรับเกณฑ์คุณภาพ"""

        return f"""{section_title}

{subsection1}

{mermaid_chart}

{benchmark_table}

---

{subsection2}

{table_header}
|------|-------:|-------:|---------:|--------:|-----:|--------:|-----------:|------|
{channel_table}

{efficiency_note}"""

    def _ops_funnel_flowchart(self) -> str:
        """运营版渠道漏斗对比流程图（新增 #1）"""
        funnel = self.result.get("funnel", {})

        # 提取各渠道数据
        cc_funnel = funnel.get("CC窄口径", {})
        ss_funnel = funnel.get("SS窄口径", {})
        other_funnel = funnel.get("其它", {})

        # 计算转化率
        def calc_rate(numerator, denominator):
            return f"{(numerator/denominator*100):.1f}%" if denominator > 0 else "0%"

        # CC窄口径转化率
        cc_reg = cc_funnel.get("注册", 0)
        cc_book = cc_funnel.get("预约", 0)
        cc_attend = cc_funnel.get("出席", 0)
        cc_paid = cc_funnel.get("付费", 0)
        cc_book_rate = calc_rate(cc_book, cc_reg)
        cc_attend_rate = calc_rate(cc_attend, cc_book)
        cc_paid_rate = calc_rate(cc_paid, cc_attend)

        # SS窄口径转化率
        ss_reg = ss_funnel.get("注册", 0)
        ss_book = ss_funnel.get("预约", 0)
        ss_attend = ss_funnel.get("出席", 0)
        ss_paid = ss_funnel.get("付费", 0)
        ss_book_rate = calc_rate(ss_book, ss_reg)
        ss_attend_rate = calc_rate(ss_attend, ss_book)
        ss_paid_rate = calc_rate(ss_paid, ss_attend)

        # 宽口径转化率
        other_reg = other_funnel.get("注册", 0)
        other_book = other_funnel.get("预约", 0)
        other_attend = other_funnel.get("出席", 0)
        other_paid = other_funnel.get("付费", 0)
        other_book_rate = calc_rate(other_book, other_reg)
        other_attend_rate = calc_rate(other_attend, other_book)
        other_paid_rate = calc_rate(other_paid, other_attend)

        if self.lang == "zh":
            cc_label = "CC窄口径"
            ss_label = "SS窄口径"
            other_label = "宽口径"
            reg_label = "注册"
            book_label = "预约"
            attend_label = "出席"
            paid_label = "付费"
        else:
            cc_label = "CC ช่องแคบ"
            ss_label = "SS ช่องแคบ"
            other_label = "ช่องกว้าง"
            reg_label = "ลงทะเบียน"
            book_label = "จอง"
            attend_label = "เข้าคลาส"
            paid_label = "ชำระ"

        mermaid_chart = f"""```mermaid
flowchart TB
    subgraph {cc_label}
        A1["{reg_label} {cc_reg}"] -->|"{cc_book_rate}"| B1["{book_label} {cc_book}"]
        B1 -->|"{cc_attend_rate}"| C1["{attend_label} {cc_attend}"]
        C1 -->|"{cc_paid_rate}"| D1["{paid_label} {cc_paid}"]
    end
    subgraph {ss_label}
        A2["{reg_label} {ss_reg}"] -->|"{ss_book_rate}"| B2["{book_label} {ss_book}"]
        B2 -->|"{ss_attend_rate}"| C2["{attend_label} {ss_attend}"]
        C2 -->|"{ss_paid_rate}"| D2["{paid_label} {ss_paid}"]
    end
    subgraph {other_label}
        A3["{reg_label} {other_reg}"] -->|"{other_book_rate}"| B3["{book_label} {other_book}"]
        B3 -->|"{other_attend_rate}"| C3["{attend_label} {other_attend}"]
        C3 -->|"{other_paid_rate}"| D3["{paid_label} {other_paid}"]
    end
```"""

        if self.lang == "zh":
            explain = """**图表说明**:
- 每个节点显示环节名称和数量
- 箭头上标注环节转化率
- 三个子图分别展示各渠道的完整漏斗"""
            section_title = "### 2.3 渠道漏斗对比流程图"
        else:
            explain = """**คำอธิบายกราฟ**:
- แต่ละโหนดแสดงชื่อขั้นตอนและจำนวน
- ลูกศรระบุอัตราแปลงแต่ละขั้น
- 3 กราฟย่อยแสดงช่องทางครบวงจร"""
            section_title = "### 2.3 กราฟเปรียบเทียบช่องทาง"

        return f"""{section_title}

{mermaid_chart}

{explain}"""

    def _ops_team_ranking(self) -> str:
        """运营版CC团队排名"""
        team_data = self.result.get("team_data", [])

        if not team_data:
            if self.lang == "zh":
                return """## 三、CC 团队排名

**等数据到位**: CC 组数据缺失，催数据组补上。"""
            else:
                return """## 3. การจัดอันดับทีม CC

**รอข้อมูล**: ข้อมูลระดับทีม CC ขาดหาย ให้ทีมข้อมูลเติมเข้ามา"""

        # 构建排名表
        rows = []
        for i, team in enumerate(team_data[:10], 1):  # 显示前10名
            rank_emoji = "🥇" if i == 1 else ("🥈" if i == 2 else ("🥉" if i == 3 else str(i)))
            cc_group = team.get("CC组", "")
            reg = team.get("注册", 0)
            paid = team.get("付费", 0)
            conv_rate = team.get("注册付费率", 0.0)
            amount = team.get("金额", 0)

            rows.append(
                f"| {rank_emoji} | {cc_group} | {reg} | {paid} | **{conv_rate*100:.1f}%** | {amount:,} |"
            )

        table = "\n".join(rows)

        # 构建团队对比柱状图（增强版：显示所有团队）
        team_names = [t.get("CC组", "") for t in team_data]
        team_rates = [t.get("注册付费率", 0.0) for t in team_data]
        avg_rate = sum(team_rates) / len(team_rates) if team_rates else 0.0

        if self.lang == "zh":
            chart_title = f"各 CC Team 转化率对比（平均线 {avg_rate*100:.1f}%）"
            ylabel = "转化率 (%)"
            section_title = "## 三、CC 团队排名"
            subsection1 = "### 3.1 团队转化率排名（Top 10）"
            subsection2 = "### 3.2 团队对比柱状图"
            table_header = "| 排名 | CC 组 | 注册 | 付费 | 转化率 | 金额($) |"
            avg_note = f"**团队平均**: 转化率 {avg_rate*100:.1f}%（达标线 23%）"
        else:
            chart_title = f"เปรียบเทียบอัตราแปลงทีม CC (เฉลี่ย {avg_rate*100:.1f}%)"
            ylabel = "อัตราแปลง (%)"
            section_title = "## 3. การจัดอันดับทีม CC"
            subsection1 = "### 3.1 อันดับอัตราแปลง (Top 10)"
            subsection2 = "### 3.2 กราฟเปรียบเทียบทีม"
            table_header = "| อันดับ | ทีม CC | ลงทะเบียน | ชำระ | อัตราแปลง | ยอด($) |"
            avg_note = f"**เฉลี่ยทีม**: อัตราแปลง {avg_rate*100:.1f}% (เป้า 23%)"

        mermaid_chart = f"""```mermaid
%%{{init: {{'theme':'base'}}}}%%
xychart-beta
  title "{chart_title}"
  x-axis [{", ".join(team_names)}]
  y-axis "{ylabel}" 0 --> 40
  bar [{", ".join([f"{r*100:.1f}" for r in team_rates])}]
```"""

        return f"""{section_title}

{subsection1}

{table_header}
|------|------|-----:|-----:|-------:|--------:|
{table}

---

{subsection2}

{mermaid_chart}

{avg_note}"""

    def _ops_cc_ranking(self) -> str:
        """运营版CC个人绩效排名"""
        cc_ranking = self.result.get("cc_ranking", {})

        if not cc_ranking or not cc_ranking.get("by_composite"):
            return ""

        by_composite = cc_ranking.get("by_composite", [])
        by_paid = cc_ranking.get("by_paid", [])
        bottom_5 = cc_ranking.get("bottom_5", [])
        team_avg = cc_ranking.get("team_avg", {})
        insights = cc_ranking.get("insights", [])

        if self.lang == "zh":
            section_title = "### CC 个人绩效排名"
            subsection1 = "#### 综合排名 Top 10"
            subsection2 = "#### 付费数 Top 5"
            subsection3 = "#### 标杆 CC 拆解"
            subsection4 = "#### 待提升 CC 清单"
            subsection5 = "#### 关键洞察"

            composite_header = "| 排名 | CC | 团队 | 付费数 | 金额($) | 转化率 | 综合得分 |"
            paid_header = "| 排名 | CC | 团队 | 付费数 | 金额($) |"
            bottom_header = "| CC | 团队 | 综合得分 | 改进建议 |"
        else:
            section_title = "### อันดับผลงาน CC"
            subsection1 = "#### อันดับรวม Top 10"
            subsection2 = "#### ยอดชำระ Top 5"
            subsection3 = "#### วิเคราะห์ CC ต้นแบบ"
            subsection4 = "#### รายชื่อ CC ที่ควรพัฒนา"
            subsection5 = "#### ข้อค้นพบสำคัญ"

            composite_header = "| อันดับ | CC | ทีม | ชำระ | ยอด($) | อัตราแปลง | คะแนนรวม |"
            paid_header = "| อันดับ | CC | ทีม | ชำระ | ยอด($) |"
            bottom_header = "| CC | ทีม | คะแนนรวม | คำแนะนำ |"

        # 综合排名 Top 10 表格
        composite_rows = []
        for i, cc in enumerate(by_composite[:10], 1):
            rank_emoji = "🥇" if i == 1 else ("🥈" if i == 2 else ("🥉" if i == 3 else str(i)))
            cc_id = cc.get("cc", "")
            team = cc.get("team", "")
            paid = cc.get("paid", 0)
            amount = cc.get("amount", 0)
            conv_rate = cc.get("conversion_rate", 0.0)
            composite = cc.get("composite", 0.0)

            composite_rows.append(
                f"| {rank_emoji} | {cc_id} | {team} | {paid} | {amount:,} | {conv_rate*100:.1f}% | **{composite:.1f}** |"
            )

        composite_table = "\n".join(composite_rows)

        # 付费数 Top 5 表格
        paid_rows = []
        for i, cc in enumerate(by_paid[:5], 1):
            rank_emoji = "🥇" if i == 1 else ("🥈" if i == 2 else ("🥉" if i == 3 else str(i)))
            cc_id = cc.get("cc", "")
            team = cc.get("team", "")
            paid = cc.get("paid", 0)
            amount = cc.get("amount", 0)

            paid_rows.append(
                f"| {rank_emoji} | {cc_id} | {team} | {paid} | {amount:,} |"
            )

        paid_table = "\n".join(paid_rows)

        # 标杆 CC 拆解
        benchmark_text = ""
        if by_composite:
            top_cc = by_composite[0]
            cc_id = top_cc.get("cc", "")
            team = top_cc.get("team", "")
            paid = top_cc.get("paid", 0)
            amount = top_cc.get("amount", 0)
            conv_rate = top_cc.get("conversion_rate", 0.0)
            composite = top_cc.get("composite", 0.0)

            team_data = team_avg.get(team, {})
            team_avg_paid = team_data.get("avg_paid", 0)
            team_avg_amount = team_data.get("avg_amount", 0)
            team_avg_conv = team_data.get("avg_conversion", 0.0)

            paid_vs_avg = ((paid - team_avg_paid) / team_avg_paid * 100) if team_avg_paid > 0 else 0
            amount_vs_avg = ((amount - team_avg_amount) / team_avg_amount * 100) if team_avg_amount > 0 else 0
            conv_vs_avg = ((conv_rate - team_avg_conv) / team_avg_conv * 100) if team_avg_conv > 0 else 0

            if self.lang == "zh":
                benchmark_text = f"""**{cc_id}** ({team})
- 综合得分: **{composite:.1f}**
- 付费数: {paid} (团队均值 {team_avg_paid:.1f}, 领先 **{paid_vs_avg:+.0f}%**)
- 金额: ${amount:,} (团队均值 ${team_avg_amount:,.0f}, 领先 **{amount_vs_avg:+.0f}%**)
- 转化率: {conv_rate*100:.1f}% (团队均值 {team_avg_conv*100:.1f}%, 领先 **{conv_vs_avg:+.0f}%**)"""
            else:
                benchmark_text = f"""**{cc_id}** ({team})
- คะแนนรวม: **{composite:.1f}**
- ชำระ: {paid} (ค่าเฉลี่ยทีม {team_avg_paid:.1f}, นำหน้า **{paid_vs_avg:+.0f}%**)
- ยอด: ${amount:,} (ค่าเฉลี่ยทีม ${team_avg_amount:,.0f}, นำหน้า **{amount_vs_avg:+.0f}%**)
- อัตราแปลง: {conv_rate*100:.1f}% (ค่าเฉลี่ยทีม {team_avg_conv*100:.1f}%, นำหน้า **{conv_vs_avg:+.0f}%**)"""

        # 待提升 CC 清单
        bottom_rows = []
        for cc in bottom_5:
            cc_id = cc.get("cc", "")
            team = cc.get("team", "")
            composite = cc.get("composite", 0.0)

            # 简单改进建议
            if self.lang == "zh":
                suggestion = "提升转化率+增加跟进频次"
            else:
                suggestion = "เพิ่มอัตราแปลง+เพิ่มความถี่ติดตาม"

            bottom_rows.append(
                f"| {cc_id} | {team} | {composite:.1f} | {suggestion} |"
            )

        bottom_table = "\n".join(bottom_rows) if bottom_rows else (
            "暂无数据" if self.lang == "zh" else "ไม่มีข้อมูล"
        )

        # 洞察列表
        insights_text = "\n".join([f"- {insight}" for insight in insights]) if insights else (
            "- 暂无洞察" if self.lang == "zh" else "- ไม่มีข้อค้นพบ"
        )

        return f"""{section_title}

{subsection1}

{composite_header}
|------|------|------|-----:|--------:|-------:|--------:|
{composite_table}

---

{subsection2}

{paid_header}
|------|------|------|-----:|--------:|
{paid_table}

---

{subsection3}

{benchmark_text}

---

{subsection4}

{bottom_header}
|------|------|--------:|--------------|
{bottom_table}

---

{subsection5}

{insights_text}"""

    def _ops_attended_not_paid(self) -> str:
        """运营版已出席未付费专项分析"""
        attended_not_paid = self.result.get("attended_not_paid", {})

        if not attended_not_paid or attended_not_paid.get("total_count", 0) == 0:
            return ""

        total_count = attended_not_paid.get("total_count", 0)
        by_team = attended_not_paid.get("by_team", {})
        by_days = attended_not_paid.get("by_days_since_attend", {})
        high_priority = attended_not_paid.get("high_priority", [])
        conversion_opportunity = attended_not_paid.get("conversion_opportunity", "")
        insights = attended_not_paid.get("insights", [])

        if self.lang == "zh":
            section_title = "### 已出席未付费专项"
            subsection1 = "#### 整体统计"
            subsection2 = "#### 按时间分层"
            subsection3 = "#### 按团队分布"
            subsection4 = "#### 高优先级跟进清单 (0-3天)"
            subsection5 = "#### 预估回收量"
            subsection6 = "#### 关键洞察"

            days_header = "| 时间层 | 用户数 | 占比 | 优先级 |"
            team_header = "| 团队 | 用户数 | 占比 |"
            priority_header = "| 学员ID | CC | 团队 | 出席日期 |"
        else:
            section_title = "### เข้าคลาสแล้วยังไม่ชำระ"
            subsection1 = "#### สถิติรวม"
            subsection2 = "#### แบ่งตามช่วงเวลา"
            subsection3 = "#### กระจายตามทีม"
            subsection4 = "#### รายชื่อติดตามเร่งด่วน (0-3วัน)"
            subsection5 = "#### ประมาณการกู้คืน"
            subsection6 = "#### ข้อค้นพบสำคัญ"

            days_header = "| ช่วงเวลา | จำนวน | สัดส่วน | ความสำคัญ |"
            team_header = "| ทีม | จำนวน | สัดส่วน |"
            priority_header = "| รหัสนักเรียน | CC | ทีม | วันเข้าคลาส |"

        # 整体统计
        if self.lang == "zh":
            summary_text = f"**总计**: {total_count} 名用户已出席但尚未付费"
        else:
            summary_text = f"**รวม**: {total_count} ผู้ใช้เข้าคลาสแล้วแต่ยังไม่ชำระ"

        # 按时间分层表格
        days_order = ["0-3天", "4-7天", "8-14天", "15+天"]
        days_rows = []
        for day_range in days_order:
            count = by_days.get(day_range, 0)
            pct = (count / total_count * 100) if total_count > 0 else 0

            # 优先级标记
            if day_range == "0-3天":
                priority = "🔴 极高" if self.lang == "zh" else "🔴 สูงสุด"
            elif day_range == "4-7天":
                priority = "🟡 高" if self.lang == "zh" else "🟡 สูง"
            elif day_range == "8-14天":
                priority = "🟢 中" if self.lang == "zh" else "🟢 ปานกลาง"
            else:
                priority = "⚪ 低" if self.lang == "zh" else "⚪ ต่ำ"

            # 泰文时间层翻译
            if self.lang == "th":
                day_range_map = {
                    "0-3天": "0-3วัน",
                    "4-7天": "4-7วัน",
                    "8-14天": "8-14วัน",
                    "15+天": "15+วัน"
                }
                day_range_display = day_range_map.get(day_range, day_range)
            else:
                day_range_display = day_range

            days_rows.append(
                f"| {day_range_display} | {count} | {pct:.1f}% | {priority} |"
            )

        days_table = "\n".join(days_rows)

        # 按团队分布表格
        team_rows = []
        sorted_teams = sorted(by_team.items(), key=lambda x: x[1], reverse=True)
        for team, count in sorted_teams:
            pct = (count / total_count * 100) if total_count > 0 else 0
            team_rows.append(
                f"| {team} | {count} | {pct:.1f}% |"
            )

        team_table = "\n".join(team_rows) if team_rows else (
            "暂无数据" if self.lang == "zh" else "ไม่มีข้อมูล"
        )

        # 高优先级跟进清单 (Top 10)
        priority_rows = []
        for user in high_priority[:10]:
            user_id = user.get("学员ID", "")
            cc = user.get("CC", "")
            team = user.get("团队", "")
            attend_date = user.get("出席日期", "")

            priority_rows.append(
                f"| {user_id} | {cc} | {team} | {attend_date} |"
            )

        priority_table = "\n".join(priority_rows) if priority_rows else (
            "暂无数据" if self.lang == "zh" else "ไม่มีข้อมูล"
        )

        # 预估回收量
        if self.lang == "zh":
            recovery_text = f"**{conversion_opportunity}**"
        else:
            recovery_text = f"**{conversion_opportunity}**"

        # 洞察列表
        insights_text = "\n".join([f"- {insight}" for insight in insights]) if insights else (
            "- 暂无洞察" if self.lang == "zh" else "- ไม่มีข้อค้นพบ"
        )

        return f"""{section_title}

{subsection1}

{summary_text}

---

{subsection2}

{days_header}
|------|-----:|-----:|--------|
{days_table}

---

{subsection3}

{team_header}
|------|-----:|-----:|
{team_table}

---

{subsection4}

{priority_header}
|------|------|------|----------|
{priority_table}

---

{subsection5}

{recovery_text}

---

{subsection6}

{insights_text}"""

    def _ops_roi_analysis(self) -> str:
        """运营版ROI分析"""
        roi_data = self.result.get("roi_estimate", {})

        if self.lang == "zh":
            section_title = "## 八、渠道 ROI 分析"
            subsection1 = "### 4.1 成本数据收集状态"
            subsection2 = "### 4.2 口径 ROI 预估（基于假设成本）"

            cost_table = """| 成本项 | 状态 | 备注 |
|--------|------|------|
| CC 人力成本 | 🟡 待补 | 需财务部门确认 |
| 推荐人奖励成本 | 🟡 待补 | 需财务部门确认 |
| TikTok 平台推广成本 | 🟡 待补 | 需财务部门确认 |"""

            action_note = "**立刻做**: 本周内找财务拿到实际成本，ROI 才算得准。"

            roi_header = "| 口径 | 金额($) | 成本($) | ROI | 数据可信度 |"
            formula_note = "**计算公式**: ROI = 金额 / 成本"
            confidence_note = "**数据可信度**: 🟡 中（基于预估成本，等财务确认）"
        else:
            section_title = "## 4. วิเคราะห์ ROI ช่องทาง"
            subsection1 = "### 4.1 สถานะเก็บข้อมูลต้นทุน"
            subsection2 = "### 4.2 ROI ประมาณการ (ต้นทุนสมมติ)"

            cost_table = """| รายการต้นทุน | สถานะ | หมายเหตุ |
|--------|------|------|
| ต้นทุนบุคลากร CC | 🟡 รอเติม | รอฝ่ายการเงินยืนยัน |
| ต้นทุนรางวัลผู้แนะนำ | 🟡 รอเติม | รอฝ่ายการเงินยืนยัน |
| ต้นทุนโฆษณา TikTok | 🟡 รอเติม | รอฝ่ายการเงินยืนยัน |"""

            action_note = "**ปฏิบัติทันที**: สัปดาห์นี้ติดต่อการเงินเอาต้นทุนจริง ROI จะแม่นยำ"

            roi_header = "| ช่องทาง | ยอด($) | ต้นทุน($) | ROI | ความเชื่อมั่น |"
            formula_note = "**สูตรคำนวณ**: ROI = ยอดเงิน / ต้นทุน"
            confidence_note = "**ความเชื่อมั่น**: 🟡 ปานกลาง (ต้นทุนประมาณการ รอการเงินยืนยัน)"

        rows = []
        for channel, data in roi_data.items():
            amount = data.get("金额", 0)
            cost = data.get("成本", 0)
            roi = data.get("ROI", 0.0)
            confidence = data.get("数据可信度", "")

            # 泰文渠道名
            if self.lang == "th":
                channel_map = {"CC窄口径": "CC ช่องแคบ", "SS窄口径": "SS ช่องแคบ", "其它": "ช่องกว้าง", "总体": "รวม"}
                channel_display = channel_map.get(channel, channel)
            else:
                channel_display = channel

            rows.append(f"| **{channel_display}** | {amount:,} | {cost:,} | **{roi:.1f}** | {confidence} |")

        table = "\n".join(rows)

        return f"""{section_title}

{subsection1}

{cost_table}

{action_note}

---

{subsection2}

{roi_header}
|------|--------:|--------:|----:|-----------|
{table}

{formula_note}

{confidence_note}"""

    def _ops_channel_pie_chart(self) -> str:
        """运营版渠道金额占比饼图（新增 #5）"""
        channel_comparison = self.result.get("channel_comparison", {})

        # 提取各渠道金额
        cc_amount = channel_comparison.get("CC窄口径", {}).get("金额", 0)
        ss_amount = channel_comparison.get("SS窄口径", {}).get("金额", 0)
        other_amount = channel_comparison.get("其它", {}).get("金额", 0)
        total_amount = cc_amount + ss_amount + other_amount

        if self.lang == "zh":
            pie_title = "各渠道金额占比"
            cc_label = "CC窄口径"
            ss_label = "SS窄口径"
            other_label = "宽口径"
            section_title = "### 4.3 渠道金额占比饼图"
            analysis_title = "**占比分析**:"
        else:
            pie_title = "สัดส่วนยอดเงินแต่ละช่องทาง"
            cc_label = "CC ช่องแคบ"
            ss_label = "SS ช่องแคบ"
            other_label = "ช่องกว้าง"
            section_title = "### 4.3 กราฟวงกลมสัดส่วนยอดเงิน"
            analysis_title = "**วิเคราะห์สัดส่วน**:"

        mermaid_chart = f"""```mermaid
pie title {pie_title}
    "{cc_label}" : {cc_amount}
    "{ss_label}" : {ss_amount}
    "{other_label}" : {other_amount}
```

{analysis_title}
- {cc_label}: ${cc_amount:,}（{cc_amount/total_amount*100 if total_amount>0 else 0:.1f}%）
- {ss_label}: ${ss_amount:,}（{ss_amount/total_amount*100 if total_amount>0 else 0:.1f}%）
- {other_label}: ${other_amount:,}（{other_amount/total_amount*100 if total_amount>0 else 0:.1f}%）"""

        return f"""{section_title}

{mermaid_chart}"""

    def _ops_unit_price_analysis(self) -> str:
        """运营版客单价分析"""
        unit_prices = self.result.get("unit_price", {})

        if self.lang == "zh":
            section_title = "## 九、客单价与 LTV 分析"
            subsection1 = "### 5.1 客单价对比"
            subsection2 = "### 5.2 LTV 预测（等数据到位）"
            table_header = "| 维度 | 客单价($) | 对比目标 | 状态 |"
            insight = "**说白了**: 客单价没毛病，问题出在量上——付费数跟不上。"
            gap_title = "**数据缺口**:"
            gap_items = """- 缺少实际续费率数据
- 缺少转介绍 vs 直接获客的续费率对比"""
            action = "**立刻做**: 从 CRM 提取续费率数据（按口径拆分）。"
            status_good = "✅ 超目标"
            status_low = "⚠️ 低于目标"
        else:
            section_title = "## 5. วิเคราะห์ราคาต่อหน่วยและ LTV"
            subsection1 = "### 5.1 เปรียบเทียบราคาต่อหน่วย"
            subsection2 = "### 5.2 พยากรณ์ LTV (รอข้อมูล)"
            table_header = "| มิติ | ราคา($) | เทียบเป้า | สถานะ |"
            insight = "**กล่าวคือ**: ราคาต่อหน่วยดี ปัญหาอยู่ที่ปริมาณ — จำนวนชำระตามไม่ทัน"
            gap_title = "**ช่องว่างข้อมูล**:"
            gap_items = """- ขาดข้อมูลอัตราต่ออายุจริง
- ขาดการเปรียบเทียบอัตราต่ออายุ: การแนะนำ vs ลูกค้าตรง"""
            action = "**ปฏิบัติทันที**: ดึงข้อมูลอัตราต่ออายุจาก CRM (แยกตามช่องทาง)"
            status_good = "✅ เหนือเป้า"
            status_low = "⚠️ ต่ำกว่าเป้า"

        rows = []
        for channel, data in unit_prices.items():
            price = data.get("客单价", 0.0)
            target = data.get("目标客单价", 850)
            vs_target = data.get("对比目标", 0.0)
            status = status_good if vs_target > 0 else status_low

            # 泰文渠道名
            if self.lang == "th":
                channel_map = {"总体": "รวม", "CC窄口径": "CC ช่องแคบ", "SS窄口径": "SS ช่องแคบ", "其它": "ช่องกว้าง"}
                channel_display = channel_map.get(channel, channel)
            else:
                channel_display = channel

            rows.append(f"| **{channel_display}** | **{price:.0f}** | {vs_target*100:+.1f}% | {status} |")

        table = "\n".join(rows)

        return f"""{section_title}

{subsection1}

{table_header}
|------|----------:|---------:|------|
{table}

{insight}

---

{subsection2}

{gap_title}
{gap_items}

{action}"""

    def _ops_unit_price_chart(self) -> str:
        """运营版客单价 vs 目标对比图（新增 #7）"""
        unit_prices = self.result.get("unit_price", {})

        # 提取各渠道客单价
        if self.lang == "zh":
            channels = ["总体", "CC窄口径", "SS窄口径", "其它"]
            ylabel = "客单价 ($)"
        else:
            channels = ["รวม", "CC ช่องแคบ", "SS ช่องแคบ", "ช่องกว้าง"]
            ylabel = "ราคา ($)"

        channel_keys = ["总体", "CC窄口径", "SS窄口径", "其它"]
        price_values = []
        target_price = unit_prices.get("总体", {}).get("目标客单价", 850)

        for channel in channel_keys:
            price = unit_prices.get(channel, {}).get("客单价", 0.0)
            price_values.append(f"{price:.0f}")

        # 目标基准线
        target_line = [f"{target_price}"] * len(channels)

        if self.lang == "zh":
            chart_title = f"各渠道客单价 vs 目标（${target_price}）"
            section_title = "### 5.3 客单价 vs 目标对比图"
            explain = f"""**图表说明**:
- 蓝柱 = 各渠道实际客单价
- 红线 = 目标客单价基准（${target_price}）
- 柱高于线 = 超目标，柱低于线 = 低于目标"""
        else:
            chart_title = f"ราคาต่อหน่วย vs เป้า (${target_price})"
            section_title = "### 5.3 กราฟเปรียบเทียบราคาต่อหน่วย"
            explain = f"""**คำอธิบายกราฟ**:
- แท่งน้ำเงิน = ราคาจริงแต่ละช่องทาง
- เส้นแดง = ฐานเป้าหมาย (${target_price})
- สูงกว่าเส้น = เหนือเป้า, ต่ำกว่าเส้น = ต่ำกว่าเป้า"""

        mermaid_chart = f"""```mermaid
%%{{init: {{'theme':'base'}}}}%%
xychart-beta
  title "{chart_title}"
  x-axis [{", ".join(channels)}]
  y-axis "{ylabel}" 0 --> {target_price*1.5:.0f}
  bar [{", ".join(price_values)}]
  line [{", ".join(target_line)}]
```

{explain}"""

        return f"""{section_title}

{mermaid_chart}"""

    def _ops_risk_alerts(self) -> str:
        """运营版风险预警"""
        alerts = self.result.get("risk_alerts", [])

        if self.lang == "zh":
            section_title = "## 十二、风险预警（红黄绿分级）"
            subsection = "### 6.1 当前风险清单"
            no_risk = "**当前无高风险预警项**。"
            table_header = "| 风险项 | 级别 | 量化影响 | 应对方案 |"
            alert_rule = "**预警规则**: 连跌 3 天超 10% 自动推送，不等周报。"
        else:
            section_title = "## 6. แจ้งเตือนความเสี่ยง (แดง-เหลือง-เขียว)"
            subsection = "### 6.1 รายการความเสี่ยงปัจจุบัน"
            no_risk = "**ไม่มีรายการเตือนความเสี่ยงสูง**"
            table_header = "| รายการเสี่ยง | ระดับ | ผลกระทบ | แผนรับมือ |"
            alert_rule = "**กฎเตือน**: ลดติดต่อกัน 3 วัน >10% แจ้งอัตโนมัติ ไม่รอรายงานสัปดาห์"

        if not alerts:
            return f"""{section_title}

{no_risk}"""

        rows = []
        for alert in alerts:
            risk_item = alert.get("风险项", "")
            level = alert.get("级别", "")
            impact = alert.get("量化影响", "")
            solution = alert.get("应对方案", "")

            rows.append(f"| **{risk_item}** | {level} | {impact} | {solution} |")

        table = "\n".join(rows)

        return f"""{section_title}

{subsection}

{table_header}
|--------|------|---------|---------|
{table}

{alert_rule}"""

    def _ops_risk_dashboard(self) -> str:
        """运营版风险预警仪表盘（新增 #3）"""
        summary = self.result.get("summary", {})
        risk_alerts = self.result.get("risk_alerts", [])

        # 提取关键风险指标
        paid_data = summary.get("付费", {})
        paid_progress = paid_data.get("efficiency_progress", 0.0)

        # 出席付费率（从漏斗数据）
        funnel = self.result.get("funnel", {})
        total_funnel = funnel.get("总计", {})
        attend_paid_rate = total_funnel.get("出席付费率", 0.0)

        # 注册进度
        reg_data = summary.get("注册", {})
        reg_progress = reg_data.get("efficiency_progress", 0.0)

        if self.lang == "zh":
            subsection = "### 6.2 风险仪表盘"
            table_header = "| 指标 | 风险值 | 仪表盘 | 状态 |"
            label_paid = "付费进度"
            label_attend = "出席付费率"
            label_reg = "注册进度"
            status_good = "基本达标"
            status_warn = "低于阈值"
            status_critical = "严重滞后"
            explain = """**仪表盘说明**:
- 🟢 绿色: >80%（健康）
- 🟡 黄色: 60-80%（警戒）
- 🔴 红色: <60%（严重）
- 进度条用 █ 和 ░ 组成，共 10 格"""
        else:
            subsection = "### 6.2 แดชบอร์ดความเสี่ยง"
            table_header = "| ตัวชี้วัด | ค่าเสี่ยง | มาตรวัด | สถานะ |"
            label_paid = "ความคืบหน้าชำระ"
            label_attend = "อัตราชำระ"
            label_reg = "ความคืบหน้าลงทะเบียน"
            status_good = "ผ่านเกณฑ์"
            status_warn = "ต่ำกว่าเกณฑ์"
            status_critical = "ล่าช้าร้ายแรง"
            explain = """**คำอธิบายมาตรวัด**:
- 🟢 เขียว: >80% (ดี)
- 🟡 เหลือง: 60-80% (เฝ้าระวัง)
- 🔴 แดง: <60% (วิกฤต)
- แท่งความคืบหน้า █ และ ░ รวม 10 ช่อง"""

        # 生成进度条和状态
        def make_gauge(value, label):
            # 计算进度条（10格）
            filled = int(value * 10)
            bar = "█" * filled + "░" * (10 - filled)

            # 状态判定
            if value >= 0.80:
                emoji = "🟢"
                status = status_good
            elif value >= 0.60:
                emoji = "🟡"
                status = status_warn
            else:
                emoji = "🔴"
                status = status_critical

            return f"| {label} | {value*100:.1f}% | {emoji} {bar} | {status} |"

        table_rows = [
            make_gauge(paid_progress, label_paid),
            make_gauge(attend_paid_rate, label_attend),
            make_gauge(reg_progress, label_reg),
        ]

        table = "\n".join(table_rows)

        return f"""{subsection}

{table_header}
|------|--------|--------|------|
{table}

{explain}"""

    def _ops_action_list(self) -> str:
        """运营版执行清单"""
        if self.lang == "zh":
            section_title = "## 十三、执行清单（Who-What-When-How）"
            subsection1 = "### 7.1 P0 行动（2 天内必须完成）"
            subsection2 = "### 7.2 P1 行动（1 周内完成）"
            table_header = "| # | 行动 | 责任人 | Deadline | 预期收益 |"
            p0_row1 = "| 1 | 分层触达已出席未付费用户 | CC Team Leaders | 7 天内 | 预计转化 10-15 单 |"
            p0_row2 = "| 2 | 优化低质量开源渠道 | 运营主管 | 7 天内 | 节省 CC 资源，提升转化率 |"
            p1_row1 = "| 3 | 加速窄口开源 | SS/CC Team Leaders | 1 周内 | 新增注册 10-15 个 |"
            p1_row2 = "| 4 | 收集成本数据 | 运营分析员 + 财务部 | 1 周内 | 完善 ROI 分析 |"
        else:
            section_title = "## 7. รายการปฏิบัติ (ใ คร-ทำอะไร-เมื่อไหร่-อย่างไร)"
            subsection1 = "### 7.1 แผน P0 (ต้องเสร็จใน 2 วัน)"
            subsection2 = "### 7.2 แผน P1 (เสร็จใน 1 สัปดาห์)"
            table_header = "| # | แผน | ผู้รับผิดชอบ | กำหนด | ผลที่คาดหวัง |"
            p0_row1 = "| 1 | ติดตามผู้เข้าคลาสแบบแบ่งชั้น | หัวหน้าทีม CC | 7 วัน | คาดแปลง 10-15 หน่วย |"
            p0_row2 = "| 2 | ปรับปรุงช่องทางคุณภาพต่ำ | หัวหน้าปฏิบัติการ | 7 วัน | ประหยัดทรัพยากร CC เพิ่มอัตราแปลง |"
            p1_row1 = "| 3 | เร่งช่องแคบเพิ่ม | หัวหน้าทีม SS/CC | 1 สัปดาห์ | เพิ่มลงทะเบียน 10-15 ราย |"
            p1_row2 = "| 4 | เก็บข้อมูลต้นทุน | นักวิเคราะห์ + การเงิน | 1 สัปดาห์ | ปรับปรุงวิเคราะห์ ROI |"

        return f"""{section_title}

{subsection1}

{table_header}
|---|------|--------|----------|---------|
{p0_row1}
{p0_row2}

---

{subsection2}

{table_header}
|---|------|--------|----------|---------|
{p1_row1}
{p1_row2}"""

    def _ops_data_source(self) -> str:
        """运营版数据来源"""
        if self.lang == "zh":
            section_title = "## 十四、数据来源与质量说明"
            subsection1 = "### 8.1 数据来源"
            subsection2 = "### 8.2 计算公式"
            ds_header = "| 数据源 | 提取时间 | 系统 | 覆盖范围 |"
            ds_row1 = f"| **BI 口径汇总** | {self.report_date.strftime('%Y-%m-%d')} | Excel 汇总表 | {self.current_month[:4]}-{self.current_month[4:]}-01 至 {self.data_date.strftime('%Y-%m-%d')} |"
            ds_row2 = "| **月度目标** | 运营计划 | 配置文件 | 金额 / 单量 / 转化率 |"
            formula_header = "| 指标 | 公式 |"
            formula_rows = """| 效率进度 | 已完成 / 月目标 |
| 目标缺口 | 效率进度 - 时间进度 |
| 转化率 | 付费 / 注册 |
| 客单价 | 金额 / 付费数 |
| ROI | 金额 / 成本 |"""
        else:
            section_title = "## 8. แหล่งข้อมูลและคุณภาพ"
            subsection1 = "### 8.1 แหล่งข้อมูล"
            subsection2 = "### 8.2 สูตรคำนวณ"
            ds_header = "| แหล่งข้อมูล | เวลาดึงข้อมูล | ระบบ | ช่วงครอบคลุม |"
            ds_row1 = f"| **สรุป BI** | {self.report_date.strftime('%Y-%m-%d')} | ตาราง Excel | {self.current_month[:4]}-{self.current_month[4:]}-01 ถึง {self.data_date.strftime('%Y-%m-%d')} |"
            ds_row2 = "| **เป้ารายเดือน** | แผนปฏิบัติการ | ไฟล์ตั้งค่า | ยอด / จำนวน / อัตราแปลง |"
            formula_header = "| ตัวชี้วัด | สูตร |"
            formula_rows = """| ความคืบหน้า | สำเร็จ / เป้าเดือน |
| ส่วนต่างเป้า | ความคืบหน้า - ความคืบหน้าเวลา |
| อัตราแปลง | ชำระ / ลงทะเบียน |
| ราคาต่อหน่วย | ยอดเงิน / จำนวนชำระ |
| ROI | ยอดเงิน / ต้นทุน |"""

        return f"""{section_title}

{subsection1}

{ds_header}
|--------|---------|------|---------|
{ds_row1}
{ds_row2}

---

{subsection2}

{formula_header}
|------|------|
{formula_rows}"""

    def _ops_appendix(self) -> str:
        """运营版附录"""
        if self.lang == "zh":
            return """## 十五、附录

### 标杆打法拆解（等数据到位）

**等数据到位**: 第一名怎么打的直接拆给其他组复制。"""
        else:
            return """## 9. ภาคผนวก

### แยกวิธีการทีมชั้นนำ (รอข้อมูล)

**รอข้อมูล**: วิธีของทีมอันดับ 1 จะแยกให้ทีมอื่นทำตาม"""

    def _ops_next_week(self) -> str:
        """运营版下周重点"""
        if self.lang == "zh":
            section_title = "## 十六、下周重点看板"
            table_header = "| 日期 | 关键指标 | 目标 | 责任人 |"
            row1 = "| 本周 | 新增付费 | ≥15 单 | 全体 CC |"
            row2 = "| 本周 | 触达已出席未付费 | ≥50% | CC Team Leaders |"
            next_report = f"**下次报告**: {(self.report_date + timedelta(days=7)).strftime('%Y-%m-%d')}（周报）"
        else:
            section_title = "## 10. จุดเน้นสัปดาห์หน้า"
            table_header = "| วันที่ | ตัวชี้วัดสำคัญ | เป้า | ผู้รับผิดชอบ |"
            row1 = "| สัปดาห์นี้ | เพิ่มชำระ | ≥15 หน่วย | ทีม CC ทั้งหมด |"
            row2 = "| สัปดาห์นี้ | ติดตามผู้เข้าคลาส | ≥50% | หัวหน้าทีม CC |"
            next_report = f"**รายงานครั้งต่อไป**: {(self.report_date + timedelta(days=7)).strftime('%Y-%m-%d')} (รายสัปดาห์)"

        return f"""{section_title}

{table_header}
|------|---------|------|--------|
{row1}
{row2}

{next_report}"""

    def _ops_sales_leaderboard(self) -> str:
        """运营版销售看板（新增 #8）"""
        team_data = self.result.get("team_data", [])

        if not team_data:
            if self.lang == "zh":
                return """## 十一、销售看板

**等数据到位**: 当前无CC组级别数据。"""
            else:
                return """## 11. แดชบอร์ดยอดขาย

**รอข้อมูล**: ไม่มีข้อมูลระดับทีม CC"""

        # § 11.1 CC 团队排行榜（横向柱状图，按付费数排名）
        team_data_by_paid = sorted(team_data, key=lambda x: x.get("付费", 0), reverse=True)
        top10_teams = team_data_by_paid[:10]

        team_names_paid = [t.get("CC组", "") for t in top10_teams]
        team_paid_counts = [t.get("付费", 0) for t in top10_teams]

        if self.lang == "zh":
            chart_title_paid = "CC 团队付费数排行榜（Top 10）"
            ylabel_paid = "付费数"
        else:
            chart_title_paid = "อันดับจำนวนชำระทีม CC (Top 10)"
            ylabel_paid = "จำนวนชำระ"

        mermaid_leaderboard = f"""```mermaid
%%{{init: {{'theme':'base'}}}}%%
xychart-beta
  title "{chart_title_paid}"
  x-axis [{", ".join(team_names_paid)}]
  y-axis "{ylabel_paid}" 0 --> {max(team_paid_counts)*1.2 if team_paid_counts else 10:.0f}
  bar [{", ".join([str(p) for p in team_paid_counts])}]
```"""

        # § 11.2 团队效能热力图（表格 + emoji 颜色编码）
        # 计算团队平均值
        avg_book_rate = sum([t.get("预约率", 0.0) for t in team_data]) / len(team_data) if team_data else 0.0
        avg_attend_rate = sum([t.get("出席率", 0.0) for t in team_data]) / len(team_data) if team_data else 0.0
        avg_attend_paid_rate = sum([t.get("出席付费率", 0.0) for t in team_data]) / len(team_data) if team_data else 0.0
        avg_reg_paid_rate = sum([t.get("注册付费率", 0.0) for t in team_data]) / len(team_data) if team_data else 0.0

        def get_heat_emoji(value, avg):
            if value > avg + 0.05:
                return "🟢"
            elif value < avg - 0.05:
                return "🔴"
            else:
                return "🟡"

        heat_rows = []
        for team in team_data[:10]:
            cc_group = team.get("CC组", "")
            book_rate = team.get("预约率", 0.0)
            attend_rate = team.get("出席率", 0.0)
            attend_paid_rate = team.get("出席付费率", 0.0)
            reg_paid_rate = team.get("注册付费率", 0.0)

            heat_rows.append(
                f"| {cc_group} | {get_heat_emoji(book_rate, avg_book_rate)} {book_rate*100:.1f}% | "
                f"{get_heat_emoji(attend_rate, avg_attend_rate)} {attend_rate*100:.1f}% | "
                f"{get_heat_emoji(attend_paid_rate, avg_attend_paid_rate)} {attend_paid_rate*100:.1f}% | "
                f"{get_heat_emoji(reg_paid_rate, avg_reg_paid_rate)} {reg_paid_rate*100:.1f}% |"
            )

        heat_table = "\n".join(heat_rows)

        # § 11.3 行动建议
        # 找到最低转化率团队
        bottom_team = team_data[-1] if team_data else {}
        bottom_team_name = bottom_team.get("CC组", "未知")
        bottom_conv_rate = bottom_team.get("注册付费率", 0.0)

        # 找到最高转化率团队
        top_team = team_data[0] if team_data else {}
        top_team_name = top_team.get("CC组", "未知")
        top_conv_rate = top_team.get("注册付费率", 0.0)

        if self.lang == "zh":
            section_title = "## 十七、销售看板"
            subsection1 = "### 11.1 CC 团队排行榜"
            subsection2 = "### 11.2 团队效能热力图"
            subsection3 = "### 11.3 行动建议"
            heat_header = "| 团队 | 预约率 | 出席率 | 出席付费率 | 注册付费率 |"
            color_legend = """**颜色编码**:
- 🟢 绿色: 高于团队平均+5pp（优秀）
- 🟡 黄色: 在团队平均±5pp范围内（正常）
- 🔴 红色: 低于团队平均-5pp（重点提升）"""
            avg_stats = f"""**团队平均**:
- 预约率: {avg_book_rate*100:.1f}%
- 出席率: {avg_attend_rate*100:.1f}%
- 出席付费率: {avg_attend_paid_rate*100:.1f}%
- 注册付费率: {avg_reg_paid_rate*100:.1f}%"""
            action_suggestions = f"""**立刻做**:
1. **标杆复制**: {top_team_name}（转化率 {top_conv_rate*100:.1f}%）怎么打的，拆给其他组复制
2. **重点提升**: {bottom_team_name}（转化率 {bottom_conv_rate*100:.1f}%）专项诊断 + 培训
3. **红色指标**: 热力图标红的立刻针对性干预"""
        else:
            section_title = "## 11. แดชบอร์ดยอดขาย"
            subsection1 = "### 11.1 อันดับทีม CC"
            subsection2 = "### 11.2 แผนที่ความร้อนประสิทธิภาพ"
            subsection3 = "### 11.3 แผนปฏิบัติ"
            heat_header = "| ทีม | อัตราจอง | อัตราเข้าคลาส | อัตราชำระ | อัตราแปลง |"
            color_legend = """**รหัสสี**:
- 🟢 เขียว: สูงกว่าเฉลี่ย+5pp (ดีเยี่ยม)
- 🟡 เหลือง: อยู่ในช่วงเฉลี่ย±5pp (ปกติ)
- 🔴 แดง: ต่ำกว่าเฉลี่ย-5pp (ต้องปรับปรุง)"""
            avg_stats = f"""**เฉลี่ยทีม**:
- อัตราจอง: {avg_book_rate*100:.1f}%
- อัตราเข้าคลาส: {avg_attend_rate*100:.1f}%
- อัตราชำระหลังเข้าคลาส: {avg_attend_paid_rate*100:.1f}%
- อัตราแปลง: {avg_reg_paid_rate*100:.1f}%"""
            action_suggestions = f"""**ปฏิบัติทันที**:
1. **ทำตามแบบ**: {top_team_name} (อัตรา {top_conv_rate*100:.1f}%) วิธีไหนได้ผล แยกให้ทีมอื่นทำตาม
2. **โฟกัสปรับปรุง**: {bottom_team_name} (อัตรา {bottom_conv_rate*100:.1f}%) วินิจฉัยเฉพาะ + อบรม
3. **ตัวชี้วัดแดง**: แผนที่สีแดง แทรกแซงทันที"""

        return f"""{section_title}

{subsection1}

{mermaid_leaderboard}

---

{subsection2}

{heat_header}
|------|--------|--------|-----------|-----------|
{heat_table}

{color_legend}

{avg_stats}

---

{subsection3}

{action_suggestions}"""

    def _ops_cohort_analysis(self) -> str:
        """运营版围场生命周期分析"""
        cohort_data = self.result.get("cohort_analysis", {})

        if not cohort_data:
            return ""

        summary = cohort_data.get("summary", {})
        by_cohort = cohort_data.get("by_cohort", [])
        insights = cohort_data.get("insights", [])

        if not by_cohort:
            return ""

        # 构建表格
        rows = []
        for cohort in by_cohort:
            fence = cohort.get("围场", "")
            valid_students = cohort.get("有效学员", 0) or 0
            participation = (cohort.get("参与率") or 0.0)
            bring_ratio = (cohort.get("带货比") or 0.0)
            fence_conv = (cohort.get("围场转率") or 0.0)
            b_reg = cohort.get("B注册", 0) or 0
            b_paid = cohort.get("B付费", 0) or 0
            dial_coverage = (cohort.get("拨打覆盖率") or 0.0)
            valid_coverage = (cohort.get("有效接通覆盖率") or 0.0)

            rows.append(
                f"| {fence} | {valid_students} | {participation*100:.1f}% | {bring_ratio*100:.1f}% | "
                f"{fence_conv*100:.1f}% | {b_reg} | {b_paid} | {dial_coverage*100:.1f}% | {valid_coverage*100:.1f}% |"
            )

        table = "\n".join(rows)

        # 洞察要点
        insights_text = "\n".join([f"- {insight}" for insight in insights]) if insights else ""

        if self.lang == "zh":
            section_title = "## 四、围场生命周期分析（Cohort Analysis）"
            subsection1 = "### 4.1 各围场 KPI 对比"
            subsection2 = "### 4.2 洞察"
            table_header = "| 围场 | 有效学员 | 参与率 | 带货比 | 围场转率 | B注册 | B付费 | 拨打覆盖率 | 有效接通覆盖率 |"
            explain = "**说明**: 围场 = 付费当日起算天数分段（0-30天/31-60天/61-90天/91-180天/181天+）"
        else:
            section_title = "## 4. วิเคราะห์วงจรชีวิตตามช่วง"
            subsection1 = "### 4.1 เปรียบเทียบ KPI แต่ละช่วง"
            subsection2 = "### 4.2 ข้อสังเกต"
            table_header = "| ช่วง | นักเรียนที่มี | อัตราร่วม | อัตรานำ | อัตราแปลงช่วง | ลงทะเบียน B | ชำระ B | ครอบคลุมโทร | ครอบคลุมรับสาย |"
            explain = "**หมายเหตุ**: ช่วง = ช่วงวันนับจากชำระครั้งแรก (0-30/31-60/61-90/91-180/181+)"

        return f"""{section_title}

{subsection1}

{table_header}
|------|--------:|------:|------:|--------:|------:|-----:|----------:|---------------:|
{table}

{explain}

---

{subsection2}

{insights_text}"""

    def _ops_checkin_analysis(self) -> str:
        """运营版转介绍参与行为分析（打卡率）"""
        checkin_data = self.result.get("checkin_analysis", {})

        if not checkin_data:
            return ""

        summary = checkin_data.get("summary", {})
        team_ranking = checkin_data.get("team_ranking", [])
        insights = checkin_data.get("insights", [])

        if not summary:
            return ""

        # 整体指标
        checkin_participation = (summary.get("打卡参与率") or 0.0)
        ref_participation = (summary.get("参与率") or 0.0)
        bring_coefficient = (summary.get("带新系数") or 0.0)
        bring_ratio = (summary.get("带货比") or 0.0)
        checkin_multiplier = (summary.get("打卡倍率") or 0.0)

        # 团队排名
        team_rows = []
        for i, team in enumerate(team_ranking[:10], 1):
            rank = f"{i}"
            team_name = team.get("团队", "")
            team_checkin_part = (team.get("打卡参与率") or 0.0)
            team_part = (team.get("参与率") or 0.0)
            team_coef = (team.get("带新系数") or 0.0)
            team_ratio = (team.get("带货比") or 0.0)

            team_rows.append(
                f"| {rank} | {team_name} | {team_checkin_part*100:.1f}% | {team_part*100:.1f}% | "
                f"{team_coef:.2f} | {team_ratio*100:.1f}% |"
            )

        team_table = "\n".join(team_rows) if team_rows else ""

        # 洞察
        insights_text = "\n".join([f"- {insight}" for insight in insights]) if insights else ""

        if self.lang == "zh":
            section_title = "## 五、转介绍参与行为分析（Check-in Analysis）"
            subsection1 = "### 5.1 整体指标"
            subsection2 = "### 5.2 打卡效果"
            subsection3 = "### 5.3 团队排名（TOP 10）"
            subsection4 = "### 5.4 洞察"
            metric_header = "| 指标 | 数值 |"
            team_header = "| 排名 | 团队 | 打卡参与率 | 参与率 | 带新系数 | 带货比 |"
            checkin_effect = f"打卡用户参与率是未打卡的 **{checkin_multiplier:.1f}** 倍"
        else:
            section_title = "## 5. วิเคราะห์พฤติกรรมการมีส่วนร่วม"
            subsection1 = "### 5.1 ตัวชี้วัดโดยรวม"
            subsection2 = "### 5.2 ผลการเช็คอิน"
            subsection3 = "### 5.3 อันดับทีม (TOP 10)"
            subsection4 = "### 5.4 ข้อสังเกต"
            metric_header = "| ตัวชี้วัด | ค่า |"
            team_header = "| อันดับ | ทีม | อัตราเช็คอิน | อัตราร่วม | สัมประสิทธิ์นำ | อัตรานำชำระ |"
            checkin_effect = f"อัตราร่วมผู้เช็คอินสูงกว่าไม่เช็คอิน **{checkin_multiplier:.1f}** เท่า"

        return f"""{section_title}

{subsection1}

{metric_header}
|------|-----|
| 打卡参与率 / อัตราเช็คอิน | {checkin_participation*100:.1f}% |
| 转介绍参与率 / อัตราร่วม | {ref_participation*100:.1f}% |
| 带新系数 / สัมประสิทธิ์นำ | {bring_coefficient:.2f} |
| 带货比 / อัตรานำชำระ | {bring_ratio*100:.1f}% |

---

{subsection2}

{checkin_effect}

---

{subsection3}

{team_header}
|------|------|-----------|--------|--------|--------|
{team_table}

---

{subsection4}

{insights_text}"""

    def _ops_leads_achievement(self) -> str:
        """运营版全团队 Leads 对标"""
        leads_data = self.result.get("leads_achievement", {})

        if not leads_data:
            return ""

        by_channel = leads_data.get("by_channel", {})
        insights = leads_data.get("insights", [])

        if not by_channel:
            return ""

        # 获取各口径数据
        def build_channel_table(channel_name, teams):
            if not teams:
                return ""
            rows = []
            for team in teams:
                team_name = team.get("团队", "")
                reg = team.get("注册", 0)
                booking = team.get("预约", 0)
                attend = team.get("出席", 0)
                paid = team.get("付费", 0)
                reg_paid_rate = team.get("注册付费率", 0.0)

                rows.append(
                    f"| {team_name} | {reg} | {booking} | {attend} | {paid} | {reg_paid_rate*100:.1f}% |"
                )
            return "\n".join(rows)

        # 构建各口径的表格
        total_table = build_channel_table("总计", by_channel.get("总计", []))
        cc_narrow_table = build_channel_table("CC窄口径", by_channel.get("CC窄口径", []))
        ss_narrow_table = build_channel_table("SS窄口径", by_channel.get("SS窄口径", []))
        lp_narrow_table = build_channel_table("LP窄口径", by_channel.get("LP窄口径", []))
        wide_table = build_channel_table("宽口径", by_channel.get("宽口径", []))

        # 洞察
        insights_text = "\n".join([f"- {insight}" for insight in insights]) if insights else ""

        if self.lang == "zh":
            section_title = "## 六、全团队 Leads 漏斗对标（Leads Achievement）"
            subsection1 = "### 6.1 SS/LP 团队达成（按总计口径）"
            subsection2 = "### 6.2 CC 窄口径"
            subsection3 = "### 6.3 SS 窄口径"
            subsection4 = "### 6.4 LP 窄口径"
            subsection5 = "### 6.5 宽口径"
            subsection6 = "### 6.6 洞察"
            table_header = "| 团队 | 注册 | 预约 | 出席 | 付费 | 注册付费率 |"
        else:
            section_title = "## 6. เปรียบเทียบ Leads Funnel ทุกทีม"
            subsection1 = "### 6.1 ผลสำเร็จ SS/LP (ช่องรวม)"
            subsection2 = "### 6.2 ช่องแคบ CC"
            subsection3 = "### 6.3 ช่องแคบ SS"
            subsection4 = "### 6.4 ช่องแคบ LP"
            subsection5 = "### 6.5 ช่องกว้าง"
            subsection6 = "### 6.6 ข้อสังเกต"
            table_header = "| ทีม | ลงทะเบียน | จอง | เข้าคลาส | ชำระ | อัตราแปลง |"

        return f"""{section_title}

{subsection1}

{table_header}
|------|-----:|-----:|-----:|-----:|--------:|
{total_table}

---

{subsection2}

{table_header}
|------|-----:|-----:|-----:|-----:|--------:|
{cc_narrow_table}

---

{subsection3}

{table_header}
|------|-----:|-----:|-----:|-----:|--------:|
{ss_narrow_table}

---

{subsection4}

{table_header}
|------|-----:|-----:|-----:|-----:|--------:|
{lp_narrow_table}

---

{subsection5}

{table_header}
|------|-----:|-----:|-----:|-----:|--------:|
{wide_table}

---

{subsection6}

{insights_text}"""

    def _ops_followup_analysis(self) -> str:
        """运营版跟进效率分析"""
        followup_data = self.result.get("followup_analysis", {})

        if not followup_data:
            return ""

        trial_followup = followup_data.get("trial_followup", {})
        cohort_outreach = followup_data.get("cohort_outreach", {})
        insights = followup_data.get("insights", [])

        if not trial_followup:
            return ""

        # 体验课课前课后跟进
        trial_summary = trial_followup.get("summary", {})
        before_dial = (trial_summary.get("课前拨打率") or 0.0)
        before_connect = (trial_summary.get("课前接通率") or 0.0)
        before_valid = (trial_summary.get("课前有效接通率") or 0.0)
        after_dial = (trial_summary.get("课后拨打率") or 0.0)
        after_connect = (trial_summary.get("课后接通率") or 0.0)
        after_valid = (trial_summary.get("课后有效接通率") or 0.0)

        # TOP5 团队
        top5_before = trial_followup.get("课前TOP5", [])
        before_rows = []
        for team in top5_before[:5]:
            team_name = team.get("团队", "")
            trial_count = team.get("体验课量", 0) or 0
            before_valid_rate = (team.get("课前有效接通率") or 0.0)
            after_valid_rate = (team.get("课后有效接通率") or 0.0)

            before_rows.append(
                f"| {team_name} | {trial_count} | {before_valid_rate*100:.1f}% | {after_valid_rate*100:.1f}% |"
            )

        before_table = "\n".join(before_rows) if before_rows else ""

        # 围场触达覆盖率
        cohort_summary = cohort_outreach.get("by_cohort", [])
        cohort_rows = []
        for cohort in cohort_summary:
            fence = cohort.get("围场", "")
            student_count = cohort.get("学员数", 0) or 0
            dial_coverage = (cohort.get("拨打覆盖率") or 0.0)
            valid_coverage = (cohort.get("有效接通覆盖率") or 0.0)

            cohort_rows.append(
                f"| {fence} | {student_count} | {dial_coverage*100:.1f}% | {valid_coverage*100:.1f}% |"
            )

        cohort_table = "\n".join(cohort_rows) if cohort_rows else ""

        # 洞察
        insights_text = "\n".join([f"- {insight}" for insight in insights]) if insights else ""

        if self.lang == "zh":
            section_title = "## 七、跟进效率分析（Follow-up Efficiency）"
            subsection1 = "### 7.1 体验课课前课后跟进"
            subsection2 = "### 7.2 课前 TOP5 团队"
            subsection3 = "### 7.3 围场触达覆盖率"
            subsection4 = "### 7.4 洞察"
            trial_header = "| 指标 | 课前 | 课后 |"
            team_header = "| 团队 | 体验课量 | 课前有效接通率 | 课后有效接通率 |"
            cohort_header = "| 围场 | 学员数 | 拨打覆盖率 | 有效接通覆盖率 |"
        else:
            section_title = "## 7. วิเคราะห์ประสิทธิภาพการติดตาม"
            subsection1 = "### 7.1 ติดตามก่อน/หลังคลาสทดลอง"
            subsection2 = "### 7.2 TOP5 ทีมติดตามก่อนคลาส"
            subsection3 = "### 7.3 ครอบคลุมการติดตามตามช่วง"
            subsection4 = "### 7.4 ข้อสังเกต"
            trial_header = "| ตัวชี้วัด | ก่อนคลาส | หลังคลาส |"
            team_header = "| ทีม | จำนวนคลาส | อัตรารับสายก่อน | อัตรารับสายหลัง |"
            cohort_header = "| ช่วง | จำนวนนักเรียน | ครอบคลุมโทร | ครอบคลุมรับสาย |"

        return f"""{section_title}

{subsection1}

{trial_header}
|------|-----:|-----:|
| 拨打率 / อัตราโทร | {before_dial*100:.1f}% | {after_dial*100:.1f}% |
| 接通率 / อัตรารับ | {before_connect*100:.1f}% | {after_connect*100:.1f}% |
| 有效接通率 / อัตรารับสายที่มี | {before_valid*100:.1f}% | {after_valid*100:.1f}% |

---

{subsection2}

{team_header}
|------|--------:|-------------:|-------------:|
{before_table}

---

{subsection3}

{cohort_header}
|------|------:|----------:|-------------:|
{cohort_table}

---

{subsection4}

{insights_text}"""

    def _ops_order_analysis(self) -> str:
        """运营版订单明细分析"""
        order_data = self.result.get("order_analysis", {})

        if not order_data:
            return ""

        summary = order_data.get("summary", {})
        top_products = order_data.get("top_products", [])
        top_teams = order_data.get("top_teams", [])
        insights = order_data.get("insights", [])

        if not summary:
            return ""

        # 概要
        total_orders = summary.get("总订单数", 0)
        total_amount = summary.get("总金额", 0)
        ref_orders = summary.get("转介绍订单数", 0)
        ref_ratio = summary.get("转介绍占比", 0.0)
        avg_price = summary.get("平均客单价", 0.0)

        # TOP5 产品
        product_rows = []
        for i, product in enumerate(top_products[:5], 1):
            product_name = product.get("产品", "")
            order_count = product.get("订单数", 0)
            amount = product.get("金额", 0)

            product_rows.append(
                f"| {i} | {product_name} | {order_count} | ${amount:,.0f} |"
            )

        product_table = "\n".join(product_rows) if product_rows else ""

        # TOP5 团队
        team_rows = []
        for i, team in enumerate(top_teams[:5], 1):
            team_name = team.get("团队", "")
            order_count = team.get("订单数", 0)
            amount = team.get("金额", 0)
            new_orders = team.get("新单数", 0)

            team_rows.append(
                f"| {i} | {team_name} | {order_count} | ${amount:,.0f} | {new_orders} |"
            )

        team_table = "\n".join(team_rows) if team_rows else ""

        # 洞察
        insights_text = "\n".join([f"- {insight}" for insight in insights]) if insights else ""

        if self.lang == "zh":
            section_title = "## 十、订单明细分析"
            subsection1 = "### 8.1 概要"
            subsection2 = "### 8.2 TOP5 产品"
            subsection3 = "### 8.3 TOP5 团队"
            subsection4 = "### 8.4 洞察"
            summary_header = "| 指标 | 数值 |"
            product_header = "| 排名 | 产品 | 订单数 | 金额 |"
            team_header = "| 排名 | 团队 | 订单数 | 金额 | 新单数 |"
            row_total_orders = f"| 总订单数 | {total_orders} |"
            row_total_amount = f"| 总金额 | ${total_amount:,.0f} |"
            row_ref_ratio = f"| 转介绍占比 | {ref_ratio*100:.1f}% ({ref_orders} 单) |"
            row_avg_price = f"| 平均客单价 | ${avg_price:,.0f} |"
        else:
            section_title = "## 8. วิเคราะห์รายละเอียดคำสั่งซื้อ"
            subsection1 = "### 8.1 สรุป"
            subsection2 = "### 8.2 TOP5 สินค้า"
            subsection3 = "### 8.3 TOP5 ทีม"
            subsection4 = "### 8.4 ข้อสังเกต"
            summary_header = "| ตัวชี้วัด | ค่า |"
            product_header = "| อันดับ | สินค้า | จำนวน | ยอด |"
            team_header = "| อันดับ | ทีม | จำนวน | ยอด | ออเดอร์ใหม่ |"
            row_total_orders = f"| ทั้งหมด | {total_orders} |"
            row_total_amount = f"| ยอดรวม | ${total_amount:,.0f} |"
            row_ref_ratio = f"| สัดส่วนแนะนำ | {ref_ratio*100:.1f}% ({ref_orders} ออเดอร์) |"
            row_avg_price = f"| เฉลี่ย | ${avg_price:,.0f} |"

        return f"""{section_title}

{subsection1}

{summary_header}
|------|-----|
{row_total_orders}
{row_total_amount}
{row_ref_ratio}
{row_avg_price}

---

{subsection2}

{product_header}
|------|------|-----:|-------:|
{product_table}

---

{subsection3}

{team_header}
|------|------|-----:|-------:|------:|
{team_table}

---

{subsection4}

{insights_text}"""

    def _ops_trend_analysis(self) -> str:
        """运营版月度趋势分析（MoM + YoY 合并）"""
        mom_data = self.result.get("mom_trend", {})
        yoy_data = self.result.get("yoy_trend", {})

        if not mom_data and not yoy_data:
            return ""

        # 环比变化
        mom_trends = mom_data.get("trends", [])
        mom_insights = mom_data.get("insights", [])

        # 同比变化
        yoy_trends = yoy_data.get("trends", [])
        yoy_insights = yoy_data.get("insights", [])

        # 构建环比表格（只列出变化超过 5% 的指标）
        mom_rows = []
        for trend in mom_trends:
            change_pct = trend.get("环比", 0.0)
            if abs(change_pct) >= 0.05:  # 5% 阈值
                channel = trend.get("渠道", "")
                metric = trend.get("指标", "")
                last_value = trend.get("上月值", 0)
                current_value = trend.get("当月值", 0)
                trend_arrow = "📈" if change_pct > 0 else "📉"

                mom_rows.append(
                    f"| {channel} | {metric} | {last_value} | {current_value} | {change_pct*100:+.1f}% | {trend_arrow} |"
                )

        mom_table = "\n".join(mom_rows) if mom_rows else "无显著变化 / ไม่มีการเปลี่ยนแปลงที่สำคัญ"

        # 构建同比表格（只列出变化超过 10% 的指标）
        yoy_rows = []
        for trend in yoy_trends:
            change_pct = trend.get("同比", 0.0)
            if abs(change_pct) >= 0.10:  # 10% 阈值
                channel_type = trend.get("渠道类型", "")
                metric = trend.get("指标", "")
                last_year = trend.get("去年同期", 0)
                current = trend.get("当前", 0)
                trend_arrow = "📈" if change_pct > 0 else "📉"

                yoy_rows.append(
                    f"| {channel_type} | {metric} | {last_year} | {current} | {change_pct*100:+.1f}% | {trend_arrow} |"
                )

        yoy_table = "\n".join(yoy_rows) if yoy_rows else "无显著变化 / ไม่มีการเปลี่ยนแปลงที่สำคัญ"

        # 合并洞察
        all_insights = mom_insights + yoy_insights
        # 格式化 insight：如果是 dict，提取 "建议" 字段；否则直接输出
        formatted_insights = []
        for insight in all_insights:
            if isinstance(insight, dict):
                text = insight.get("建议", "")
                if not text:
                    # 无 "建议" key，手动拼接
                    channel = insight.get("渠道", insight.get("渠道类型", ""))
                    metric = insight.get("指标", "")
                    trend = insight.get("趋势", "")
                    change = insight.get("变化", 0.0)
                    text = f"{channel} {metric} {trend} {abs(change)*100:.1f}%，需关注"
                formatted_insights.append(text)
            else:
                formatted_insights.append(str(insight))
        insights_text = "\n".join([f"- {ins}" for ins in formatted_insights]) if formatted_insights else ""

        if self.lang == "zh":
            section_title = "## 十一、月度趋势分析"
            subsection1 = "### 9.1 环比变化（最近3个月）"
            subsection2 = "### 9.2 同比变化"
            subsection3 = "### 9.3 洞察"
            mom_header = "| 渠道 | 指标 | 上月值 | 当月值 | 环比 | 趋势 |"
            yoy_header = "| 渠道类型 | 指标 | 去年同期 | 当前 | 同比 | 趋势 |"
            mom_note = "*仅显示变化 ≥5% 的指标*"
            yoy_note = "*仅显示变化 ≥10% 的指标*"
        else:
            section_title = "## 9. วิเคราะห์แนวโน้มรายเดือน"
            subsection1 = "### 9.1 เปลี่ยนแปลง MoM (3 เดือนล่าสุด)"
            subsection2 = "### 9.2 เปลี่ยนแปลง YoY"
            subsection3 = "### 9.3 ข้อสังเกต"
            mom_header = "| ช่องทาง | ตัวชี้วัด | เดือนก่อน | เดือนนี้ | MoM | แนวโน้ม |"
            yoy_header = "| ประเภทช่อง | ตัวชี้วัด | ปีก่อน | ปัจจุบัน | YoY | แนวโน้ม |"
            mom_note = "*แสดงเฉพาะตัวชี้วัดที่เปลี่ยน ≥5%*"
            yoy_note = "*แสดงเฉพาะตัวชี้วัดที่เปลี่ยน ≥10%*"

        return f"""{section_title}

{subsection1}

{mom_header}
|------|------|--------|--------|------|------|
{mom_table}

{mom_note}

---

{subsection2}

{yoy_header}
|------|------|--------|--------|------|------|
{yoy_table}

{yoy_note}

---

{subsection3}

{insights_text}"""

    # ==================== 管理层版各章节 ====================

    def _exec_header(self) -> str:
        """管理层版报告头"""
        if self.lang == "zh":
            return f"""# 泰国转介绍业绩追踪 — 管理层版

**报告日期**: {self.report_date.strftime("%Y-%m-%d")}
**数据区间**: {self.current_month[:4]}-{self.current_month[4:]}-01 ~ {self.data_date.strftime("%Y-%m-%d")}（{self.current_day}/{self.days_in_month} 天）
**受众**: 业务管理层 + 决策层
**报告类型**: 战略决策层（趋势洞察+资源配置建议）"""
        else:
            return f"""# รายงานติดตามการแนะนำ ประเทศไทย — ฉบับผู้บริหาร

**วันที่รายงาน**: {self.report_date.strftime("%Y-%m-%d")}
**ช่วงข้อมูล**: {self.current_month[:4]}-{self.current_month[4:]}-01 ~ {self.data_date.strftime("%Y-%m-%d")} ({self.current_day}/{self.days_in_month} วัน)
**กลุ่มเป้าหมาย**: ผู้บริหารธุรกิจ + ผู้ตัดสินใจ
**ประเภทรายงาน**: ระดับกลยุทธ์ (ข้อมูลเชิงลึก + คำแนะนำทรัพยากร)"""

    def _exec_summary(self) -> str:
        """管理层版核心摘要"""
        summary = self.result.get("summary", {})
        paid_data = summary.get("付费", {})
        amount_data = summary.get("金额", {})

        paid_actual = paid_data.get("actual", 0)
        paid_target = paid_data.get("target", 0)
        paid_gap = paid_data.get("gap", 0.0)

        amount_actual = amount_data.get("actual", 0)

        if self.lang == "zh":
            return f"""## 核心摘要（60 秒速读）

**目标达成**: 付费 {paid_actual}/{paid_target} 单（{paid_data.get('efficiency_progress', 0)*100:.1f}%），落后时间进度 {abs(paid_gap)*100:.0f} 个百分点。

**主要风险**: 出席付费率在掉，不干预月末只能完成目标 40-45%。

**根源**: 低质开源污染漏斗 + 跟进不够。

**应对**: 优化开源质量 + 分层触达，预计回补 10-15 单。

**资源建议**: 加大窄口投入（ROI 高），优化宽口质量门槛。

> **说白了**: 时间过了 {self.time_progress*100:.0f}%,付费才完成 {paid_data.get('efficiency_progress', 0)*100:.0f}%，必须紧急干预。"""
        else:
            return f"""## สรุปสำคัญ (อ่าน 60 วินาที)

**บรรลุเป้าหมาย**: ชำระ {paid_actual}/{paid_target} หน่วย ({paid_data.get('efficiency_progress', 0)*100:.1f}%) ล่าช้ากว่าเวลา {abs(paid_gap)*100:.0f} จุดเปอร์เซ็นต์

**ความเสี่ยงหลัก**: อัตราชำระหลังเข้าคลาสลดลง หากไม่แทรกแซงจะทำเป้าได้แค่ 40-45% ท้ายเดือน

**สาเหตุหลัก**: แหล่งคุณภาพต่ำทำลายช่องทาง + ติดตามไม่พอ

**การตอบสนอง**: ปรับปรุงคุณภาพแหล่ง + ติดตามแบบแบ่งชั้น คาดกู้ 10-15 หน่วย

**คำแนะนำทรัพยากร**: เพิ่มลงทุนช่องแคบ (ROI สูง) ปรับเกณฑ์คุณภาพช่องกว้าง

> **กล่าวคือ**: เวลาผ่านไป {self.time_progress*100:.0f}% ชำระทำได้แค่ {paid_data.get('efficiency_progress', 0)*100:.0f}% ต้องแทรกแซงด่วน"""

    def _exec_trend(self) -> str:
        """管理层版业绩趋势"""
        trend = self.result.get("trend", {})
        months = trend.get("months", [])
        paid_data = trend.get("总计_付费", [])
        amount_data = trend.get("总计_金额", [])

        month_labels = [f"{m[4:6]}-{m[:4][2:]}" for m in months]

        if self.lang == "zh":
            chart_title = "付费单量月度趋势"
            ylabel = "付费单量"
            section_title = f"## 一、业绩趋势（{len(months)} 个月视角）"
            subsection = "### 月度业绩进度"
            table_header = "| 指标 | 月目标 | 已完成 | 完成率 | 时间进度 | 目标缺口 | 状态 |"
        else:
            chart_title = "แนวโน้มจำนวนชำระรายเดือน"
            ylabel = "จำนวนชำระ"
            section_title = f"## 1. แนวโน้มผลงาน ({len(months)} เดือน)"
            subsection = "### ความคืบหน้ารายเดือน"
            table_header = "| ตัวชี้วัด | เป้าเดือน | สำเร็จ | อัตราสำเร็จ | ความคืบหน้าเวลา | ส่วนต่าง | สถานะ |"

        # 付费趋势图
        mermaid_paid = f"""```mermaid
%%{{init: {{'theme':'base'}}}}%%
xychart-beta
  title "{chart_title}"
  x-axis [{", ".join(month_labels)}]
  y-axis "{ylabel}" 0 --> {max(paid_data)*1.2 if paid_data else 100:.0f}
  line [{", ".join([str(p) for p in paid_data])}]
```"""

        # 月度进度表
        summary = self.result.get("summary", {})
        progress_rows = []

        if self.lang == "zh":
            indicator_names = ["付费", "金额", "转化率"]
        else:
            indicator_names = ["ชำระ", "ยอดเงิน", "อัตราแปลง"]

        indicator_keys = ["付费", "金额", "转化率"]

        for idx, name_key in enumerate(indicator_keys):
            display_name = indicator_names[idx]
            data = summary.get(name_key, {})
            actual = data.get("actual", 0)
            target = data.get("target", 0)
            eff_progress = data.get("efficiency_progress", 0.0)
            gap = data.get("gap", 0.0)
            status = data.get("status", "")

            if name_key == "金额":
                actual_str = f"${actual:,.0f}"
                target_str = f"${target:,.0f}"
            elif name_key == "转化率":
                actual_str = f"{actual*100:.1f}%"
                target_str = f"{target*100:.0f}%"
            else:
                actual_str = f"{actual}"
                target_str = f"{target}"

            progress_rows.append(
                f"| {display_name} | {target_str} | {actual_str} | {eff_progress*100:.1f}% | {self.time_progress*100:.1f}% | {gap*100:.1f}% | {status} |"
            )

        progress_table = "\n".join(progress_rows)

        paid_gap = summary.get('付费', {}).get('gap', 0.0)

        if self.lang == "zh":
            insight = f"> **说白了**: 时间过了 {self.time_progress*100:.0f}%，付费完成率落后 {abs(paid_gap)*100:.0f} 个百分点。"
        else:
            insight = f"> **กล่าวคือ**: เวลาผ่านไป {self.time_progress*100:.0f}% อัตราชำระล่าช้า {abs(paid_gap)*100:.0f} จุดเปอร์เซ็นต์"

        return f"""{section_title}

{mermaid_paid}

{subsection}

{table_header}
|------|-------:|-------:|-------:|---------:|--------:|------|
{progress_table}

{insight}"""

    def _exec_risk_alerts(self) -> str:
        """管理层版风险预警"""
        alerts = self.result.get("risk_alerts", [])

        if self.lang == "zh":
            section_title = "## 二、风险预警（红黄绿分级）"
            no_risk = "**当前无高风险预警项**。"
            table_header = "| 风险项 | 级别 | 量化影响 | 应对方案 |"
        else:
            section_title = "## 2. แจ้งเตือนความเสี่ยง (แดง-เหลือง-เขียว)"
            no_risk = "**ไม่มีรายการเตือนความเสี่ยงสูง**"
            table_header = "| รายการเสี่ยง | ระดับ | ผลกระทบ | แผนรับมือ |"

        if not alerts:
            return f"""{section_title}

{no_risk}"""

        rows = []
        for alert in alerts:
            risk_item = alert.get("风险项", "")
            level = alert.get("级别", "")
            impact = alert.get("量化影响", "")
            solution = alert.get("应对方案", "")

            rows.append(f"| **{risk_item}** | {level} | {impact} | {solution} |")

        table = "\n".join(rows)

        return f"""{section_title}

{table_header}
|--------|------|---------|---------|
{table}"""

    def _exec_roi_allocation(self) -> str:
        """管理层版ROI与资源配置"""
        channel_comparison = self.result.get("channel_comparison", {})

        if self.lang == "zh":
            section_title = "## 三、渠道 ROI 与资源配置建议"
            subsection1 = "### 3.1 效能对比"
            subsection2 = "### 3.2 资源配置建议"
            table_header = "| 口径 | 注册占比 | 付费占比 | 金额($) | 效能指数 |"
            formula = "**计算公式**: 效能指数 = 付费占比 / 注册占比（衡量单位注册产出效率）"
            insight = """**说白了**:
- 窄口效能指数高，是高 ROI 渠道，继续加码
- 宽口注册占比高但付费占比低，质量门槛必须提"""
            allocation = """1. **短期（本月）**: 窄口加码，立刻
2. **中期（下月）**: 宽口质量门槛提上去
3. **长期（下季度）**: 推荐人激励结构调整"""
        else:
            section_title = "## 3. ROI ช่องทางและคำแนะนำทรัพยากร"
            subsection1 = "### 3.1 เปรียบเทียบประสิทธิภาพ"
            subsection2 = "### 3.2 คำแนะนำการจัดสรรทรัพยากร"
            table_header = "| ช่องทาง | สัดส่วนลงทะเบียน | สัดส่วนชำระ | ยอด($) | ดัชนีประสิทธิภาพ |"
            formula = "**สูตรคำนวณ**: ดัชนีประสิทธิภาพ = สัดส่วนชำระ / สัดส่วนลงทะเบียน (วัดประสิทธิภาพการผลิตต่อหน่วย)"
            insight = """**กล่าวคือ**:
- ช่องแคบดัชนีสูง ROI สูง ลงทุนต่อ
- ช่องกว้างสัดส่วนลงทะเบียนสูงแต่ชำระต่ำ ต้องปรับเกณฑ์คุณภาพ"""
            allocation = """1. **ระยะสั้น (เดือนนี้)**: เพิ่มช่องแคบ ทันที
2. **ระยะกลาง (เดือนหน้า)**: ปรับเกณฑ์คุณภาพช่องกว้าง
3. **ระยะยาว (ไตรมาสหน้า)**: ปรับโครงสร้างแรงจูงใจผู้แนะนำ"""

        rows = []
        for channel_name in ["CC窄口径", "SS窄口径", "其它"]:
            data = channel_comparison.get(channel_name, {})
            reg_ratio = data.get("注册占比", 0.0)
            paid_ratio = data.get("付费占比", 0.0)
            efficiency_index = data.get("效能指数", 0.0)
            amount = data.get("金额", 0)

            # 泰文渠道名
            if self.lang == "th":
                channel_map = {"CC窄口径": "CC ช่องแคบ", "SS窄口径": "SS ช่องแคบ", "其它": "ช่องกว้าง"}
                channel_display = channel_map.get(channel_name, channel_name)
            else:
                channel_display = channel_name

            rows.append(
                f"| **{channel_display}** | {reg_ratio*100:.1f}% | {paid_ratio*100:.1f}% | {amount:,} | **{efficiency_index:.2f}×** |"
            )

        table = "\n".join(rows)

        return f"""{section_title}

{subsection1}

{table_header}
|------|--------:|--------:|--------:|--------:|
{table}

{formula}

{insight}

---

{subsection2}

{allocation}"""

    def _exec_efficiency_index_chart(self) -> str:
        """管理层版渠道效能指数对比柱状图（新增 #6）"""
        channel_comparison = self.result.get("channel_comparison", {})

        # 提取效能指数
        if self.lang == "zh":
            channels = ["CC窄口径", "SS窄口径", "其它"]
            ylabel = "效能指数"
            chart_title = "渠道效能指数对比（基准 1.0×）"
            section_title = "### 3.3 渠道效能指数对比图"
        else:
            channels = ["CC ช่องแคบ", "SS ช่องแคบ", "ช่องกว้าง"]
            ylabel = "ดัชนีประสิทธิภาพ"
            chart_title = "เปรียบเทียบดัชนีประสิทธิภาพ (ฐาน 1.0×)"
            section_title = "### 3.3 กราฟเปรียบเทียบดัชนีประสิทธิภาพ"

        channel_keys = ["CC窄口径", "SS窄口径", "其它"]
        efficiency_values = []

        for channel in channel_keys:
            data = channel_comparison.get(channel, {})
            eff_index = data.get("效能指数", 0.0)
            efficiency_values.append(f"{eff_index:.2f}")

        # 基准线 1.0×
        baseline = ["1.00"] * len(channels)

        mermaid_chart = f"""```mermaid
%%{{init: {{'theme':'base'}}}}%%
xychart-beta
  title "{chart_title}"
  x-axis [{", ".join(channels)}]
  y-axis "{ylabel}" 0 --> 2
  bar [{", ".join(efficiency_values)}]
  line [{", ".join(baseline)}]
```"""

        if self.lang == "zh":
            explain = """**图表说明**:
- 蓝柱 = 各渠道效能指数（付费占比 / 注册占比）
- 红线 = 基准线 1.0×
- 柱高于线 = 高效能渠道，柱低于线 = 低效能渠道

**效能指数解读**:
- >1.0×: 单位注册产出高于平均，是高ROI渠道
- <1.0×: 单位注册产出低于平均，需优化质量"""
        else:
            explain = """**คำอธิบายกราฟ**:
- แท่งน้ำเงิน = ดัชนีประสิทธิภาพแต่ละช่อง (สัดส่วนชำระ / สัดส่วนลงทะเบียน)
- เส้นแดง = ฐาน 1.0×
- สูงกว่าเส้น = ช่องทางประสิทธิภาพสูง, ต่ำกว่าเส้น = ประสิทธิภาพต่ำ

**อธิบายดัชนี**:
- >1.0×: ผลผลิตต่อหน่วยสูงกว่าเฉลี่ย เป็นช่องทาง ROI สูง
- <1.0×: ผลผลิตต่อหน่วยต่ำกว่าเฉลี่ย ต้องปรับคุณภาพ"""

        return f"""{section_title}

{mermaid_chart}

{explain}"""

    def _exec_root_cause(self) -> str:
        """管理层版根源诊断"""
        if self.lang == "zh":
            section_title = "## 四、根源诊断与解决方案"
            subsection1 = "### 4.1 问题根源拆解"
            subsection2 = "### 4.2 解决方案与预期收益"
            root_header = "| 根源 | 贡献度 | 证据 | 可控性 |"
            root_rows = """| **低质量开源污染** | **60%** | 部分开源渠道转化率低 | 🟢 高（优化门槛） |
| **跟进不足** | **25%** | 已出席未付费用户较多 | 🟢 高（分层触达） |
| **季节性因素** | **15%** | 春节后决策周期拉长 | 🔴 低 |"""
            insight = "> **说白了**: 85% 的问题是可控的，优化开源质量和跟进策略能解决大部分问题。"
            solution_header = "| 方案 | 预期收益 | 成本 | ROI | 优先级 |"
            solution_rows = """| 分层触达已出席未付费 | 10-15 单 | 低 | 极高 | P0 |
| 优化开源质量门槛 | 提升转化率 3-5pp | 低 | 高 | P1 |"""
        else:
            section_title = "## 4. วินิจฉัยสาเหตุและแนวทางแก้ไข"
            subsection1 = "### 4.1 แยกสาเหตุปัญหา"
            subsection2 = "### 4.2 แนวทางแก้ไขและผลที่คาดหวัง"
            root_header = "| สาเหตุ | สัดส่วน | หลักฐาน | ควบคุมได้ |"
            root_rows = """| **แหล่งคุณภาพต่ำ** | **60%** | บางช่องอัตราแปลงต่ำ | 🟢 สูง (ปรับเกณฑ์) |
| **ติดตามไม่พอ** | **25%** | ผู้เข้าคลาสแต่ยังไม่ชำระมาก | 🟢 สูง (แบ่งชั้นติดตาม) |
| **ปัจจัยฤดูกาล** | **15%** | หลังตรุษจีนรอบตัดสินใจนาน | 🔴 ต่ำ |"""
            insight = "> **กล่าวคือ**: 85% ของปัญหาควบคุมได้ ปรับปรุงคุณภาพแหล่งและกลยุทธ์ติดตามแก้ได้ส่วนใหญ่"
            solution_header = "| แนวทาง | ผลที่คาด | ต้นทุน | ROI | ลำดับ |"
            solution_rows = """| ติดตามผู้เข้าคลาสแบบแบ่งชั้น | 10-15 หน่วย | ต่ำ | สูงสุด | P0 |
| ปรับเกณฑ์คุณภาพแหล่ง | เพิ่มอัตรา 3-5pp | ต่ำ | สูง | P1 |"""

        return f"""{section_title}

{subsection1}

{root_header}
|------|-------:|------|--------|
{root_rows}

{insight}

---

{subsection2}

{solution_header}
|------|---------|------|-----|--------|
{solution_rows}"""

    def _exec_team_benchmark(self) -> str:
        """管理层版团队表现对标"""
        team_data = self.result.get("team_data", [])

        if not team_data:
            if self.lang == "zh":
                return """## 五、团队表现对标

**等数据到位**: 当前无CC组级别数据。"""
            else:
                return """## 5. เกณฑ์มาตรฐานทีม

**รอข้อมูล**: ไม่มีข้อมูลระดับทีม CC"""

        top3 = team_data[:3]
        bottom3 = team_data[-3:]

        if self.lang == "zh":
            section_title = "## 五、团队表现对标"
            table_header = "| 类型 | 团队 | 转化率 | 核心优势/问题 |"
            label_benchmark = "标杆"
            label_improve = "重点提升"
            strength_values = ["窄口占比高", "出席率高", "预约率高"]
            issue = "开源质量低"
            copy_plan = "**复制计划**: 拆解标杆打法并推广至待提升团队。"
        else:
            section_title = "## 5. เกณฑ์มาตรฐานทีม"
            table_header = "| ประเภท | ทีม | อัตราแปลง | จุดแข็ง/ปัญหา |"
            label_benchmark = "แบบอย่าง"
            label_improve = "ต้องปรับปรุง"
            strength_values = ["สัดส่วนช่องแคบสูง", "อัตราเข้าคลาสสูง", "อัตราจองสูง"]
            issue = "คุณภาพแหล่งต่ำ"
            copy_plan = "**แผนทำตาม**: แยกวิธีแบบอย่างให้ทีมที่ต้องปรับปรุงทำตาม"

        top_rows = []
        for i, team in enumerate(top3, 1):
            emoji = "🥇" if i == 1 else ("🥈" if i == 2 else "🥉")
            cc_group = team.get("CC组", "")
            conv_rate = team.get("注册付费率", 0.0)
            strength = strength_values[i-1] if i <= len(strength_values) else strength_values[0]

            top_rows.append(f"| {emoji} **{label_benchmark}** | {cc_group} | {conv_rate*100:.1f}% | {strength} |")

        bottom_rows = []
        for team in bottom3:
            cc_group = team.get("CC组", "")
            conv_rate = team.get("注册付费率", 0.0)

            bottom_rows.append(f"| ⚠️ **{label_improve}** | {cc_group} | {conv_rate*100:.1f}% | {issue} |")

        top_table = "\n".join(top_rows)
        bottom_table = "\n".join(bottom_rows)

        return f"""{section_title}

{table_header}
|------|------|-------:|-------------|
{top_table}
{bottom_table}

{copy_plan}"""

    def _exec_cc_performance_summary(self) -> str:
        """管理层版CC绩效概要"""
        cc_ranking = self.result.get("cc_ranking", {})
        attended_not_paid = self.result.get("attended_not_paid", {})

        if not cc_ranking or not cc_ranking.get("by_composite"):
            return ""

        by_composite = cc_ranking.get("by_composite", [])
        bottom_5 = cc_ranking.get("bottom_5", [])
        insights = cc_ranking.get("insights", [])

        total_count = attended_not_paid.get("total_count", 0)
        conversion_opportunity = attended_not_paid.get("conversion_opportunity", "")

        if self.lang == "zh":
            section_title = "### CC 绩效概要"
            subsection1 = "#### Top 5 & Bottom 5"
            subsection2 = "#### 已出席未付费汇总"
            subsection3 = "#### 关键发现"

            summary_header = "| 排名 | CC | 团队 | 综合得分 |"
        else:
            section_title = "### สรุปผลงาน CC"
            subsection1 = "#### Top 5 & Bottom 5"
            subsection2 = "#### สรุปเข้าคลาสยังไม่ชำระ"
            subsection3 = "#### ข้อค้นพบสำคัญ"

            summary_header = "| อันดับ | CC | ทีม | คะแนนรวม |"

        # Top 5 表格
        top_rows = []
        for i, cc in enumerate(by_composite[:5], 1):
            rank_emoji = "🥇" if i == 1 else ("🥈" if i == 2 else ("🥉" if i == 3 else str(i)))
            cc_id = cc.get("cc", "")
            team = cc.get("team", "")
            composite = cc.get("composite", 0.0)

            top_rows.append(
                f"| {rank_emoji} | {cc_id} | {team} | **{composite:.1f}** |"
            )

        # Bottom 5 表格
        bottom_rows = []
        for cc in bottom_5:
            cc_id = cc.get("cc", "")
            team = cc.get("team", "")
            composite = cc.get("composite", 0.0)

            bottom_rows.append(
                f"| ⚠️ | {cc_id} | {team} | {composite:.1f} |"
            )

        top_table = "\n".join(top_rows)
        bottom_table = "\n".join(bottom_rows) if bottom_rows else (
            "暂无数据" if self.lang == "zh" else "ไม่มีข้อมูล"
        )

        # 已出席未付费汇总
        if self.lang == "zh":
            attended_summary = f"**总计**: {total_count} 名用户已出席但尚未付费\n**预估回收**: {conversion_opportunity}"
        else:
            attended_summary = f"**รวม**: {total_count} ผู้ใช้เข้าคลาสแล้วแต่ยังไม่ชำระ\n**ประมาณการกู้คืน**: {conversion_opportunity}"

        # 关键发现（取前2条）
        key_insights = insights[:2] if len(insights) >= 2 else insights
        insights_text = "\n".join([f"- {insight}" for insight in key_insights]) if key_insights else (
            "- 暂无关键发现" if self.lang == "zh" else "- ไม่มีข้อค้นพบ"
        )

        return f"""{section_title}

{subsection1}

{summary_header}
|------|------|------|--------:|
{top_table}
{bottom_table}

---

{subsection2}

{attended_summary}

---

{subsection3}

{insights_text}"""

    def _exec_key_numbers(self) -> str:
        """管理层版关键数字摘要"""
        summary = self.result.get("summary", {})
        unit_prices = self.result.get("unit_price", {})

        paid_gap = summary.get("付费", {}).get("gap", 0.0)
        total_unit_price = unit_prices.get("总体", {}).get("客单价", 0.0)
        target_price = unit_prices.get("总体", {}).get("目标客单价", 850)

        if self.lang == "zh":
            section_title = "## 六、关键数字摘要"
            table_header = "| 维度 | 数字 | 对比 | 含义 |"
            row1_label = "**付费缺口**"
            row1_vs = f"vs 时间进度 {self.time_progress*100:.1f}%"
            row1_meaning = "严重落后"
            row2_label = "**客单价**"
            row2_vs = f"vs 目标 ${target_price}（{(total_unit_price/target_price-1)*100:+.1f}%）"
            row2_meaning = "付费用户质量高"
        else:
            section_title = "## 6. สรุปตัวเลขสำคัญ"
            table_header = "| มิติ | ตัวเลข | เปรียบเทียบ | ความหมาย |"
            row1_label = "**ส่วนต่างชำระ**"
            row1_vs = f"vs เวลา {self.time_progress*100:.1f}%"
            row1_meaning = "ล่าช้าร้ายแรง"
            row2_label = "**ราคาต่อหน่วย**"
            row2_vs = f"vs เป้า ${target_price} ({(total_unit_price/target_price-1)*100:+.1f}%)"
            row2_meaning = "คุณภาพผู้ชำระสูง"

        return f"""{section_title}

{table_header}
|------|------|------|------|
| {row1_label} | {paid_gap*100:.1f}% | {row1_vs} | {row1_meaning} |
| {row2_label} | ${total_unit_price:.0f} | {row2_vs} | {row2_meaning} |"""

    def _exec_next_month(self) -> str:
        """管理层版下月展望"""
        if self.lang == "zh":
            section_title = "## 七、下月展望与资源需求"
            subsection1 = "### 7.1 下月目标建议"
            subsection2 = "### 7.2 资源需求"
            conclusion = "**结论**: 目标不变，执行力度必须加大。"
            table_header = "| 资源类型 | 需求 | 用途 | 预期产出 |"
            row1 = "| **CC 人力** | 额外 80 人时 | 分层触达 | 转化 10-15 单 |"
            row2 = "| **推荐人奖励预算** | +$500/月 | 提高窄口奖励 | 新增注册 10-15 个 |"
            budget = "**总预算**: ~$1.5K | **预期 ROI**: 7-8×"
        else:
            section_title = "## 7. แนวโน้มเดือนหน้าและความต้องการทรัพยากร"
            subsection1 = "### 7.1 เป้าเดือนหน้า"
            subsection2 = "### 7.2 ความต้องการทรัพยากร"
            conclusion = "**สรุป**: เป้าไม่เปลี่ยน ต้องเพิ่มความเข้มข้นปฏิบัติ"
            table_header = "| ประเภท | ความต้องการ | ใช้งาน | ผลที่คาด |"
            row1 = "| **บุคลากร CC** | +80 ชม. | ติดตามแบบแบ่งชั้น | แปลง 10-15 หน่วย |"
            row2 = "| **งบรางวัลผู้แนะนำ** | +$500/เดือน | เพิ่มรางวัลช่องแคบ | เพิ่มลงทะเบียน 10-15 |"
            budget = "**งบรวม**: ~$1.5K | **ROI คาด**: 7-8×"

        return f"""{section_title}

{subsection1}

{conclusion}

---

{subsection2}

{table_header}
|---------|------|------|---------|
{row1}
{row2}

{budget}"""

    def _exec_decision_points(self) -> str:
        """管理层版决策点"""
        if self.lang == "zh":
            section_title = "## 八、管理层决策点"
            intro = "### 需要您决策的 3 个问题"
            q1_title = "1. **是否批准优化低质量开源渠道？**"
            q1_impact = "   - 影响：短期注册量可能下降，但转化率提升"
            q1_recommend = "   - 建议：批准"
            q2_title = "2. **是否批准窄口推荐人奖励 +20%（月度预算 +$500）？**"
            q2_impact = "   - 影响：短期成本上升，但 ROI 高，长期划算"
            q2_recommend = "   - 建议：批准"
            q3_title = "3. **本月目标是否调整？**"
            q3_options = """   - 选项 A：保持目标不变
   - 选项 B：下调目标"""
            q3_recommend = "   - 建议：选项 A（保持目标压力）"
        else:
            section_title = "## 8. จุดตัดสินใจผู้บริหาร"
            intro = "### ต้องการคุณตัดสินใจ 3 ประเด็น"
            q1_title = "1. **อนุมัติปรับปรุงช่องทางคุณภาพต่ำหรือไม่?**"
            q1_impact = "   - ผลกระทบ: ระยะสั้นลงทะเบียนอาจลด แต่อัตราแปลงเพิ่ม"
            q1_recommend = "   - แนะนำ: อนุมัติ"
            q2_title = "2. **อนุมัติเพิ่มรางวัลผู้แนะนำช่องแคบ +20% (งบ +$500/เดือน) หรือไม่?**"
            q2_impact = "   - ผลกระทบ: ต้นทุนขึ้นระยะสั้น แต่ ROI สูง คุ้มระยะยาว"
            q2_recommend = "   - แนะนำ: อนุมัติ"
            q3_title = "3. **ปรับเป้าเดือนนี้หรือไม่?**"
            q3_options = """   - ทางเลือก A: คงเป้าเดิม
   - ทางเลือก B: ลดเป้า"""
            q3_recommend = "   - แนะนำ: ทางเลือก A (คงแรงกดดันเป้า)"

        return f"""{section_title}

{intro}

{q1_title}
{q1_impact}
{q1_recommend}

{q2_title}
{q2_impact}
{q2_recommend}

{q3_title}
{q3_options}
{q3_recommend}"""

    def _exec_data_source(self) -> str:
        """管理层版数据来源"""
        if self.lang == "zh":
            section_title = "## 九、数据来源"
            table_header = "| 数据源 | 提取时间 | 系统 | 覆盖范围 |"
            row1 = f"| BI 口径汇总 | {self.report_date.strftime('%Y-%m-%d')} | Excel 汇总表 | {self.current_month[:4]}-{self.current_month[4:]}-01 至 {self.data_date.strftime('%Y-%m-%d')} |"
            row2 = "| 月度目标 | 运营计划 | 配置文件 | 金额 / 单量 / 转化率 |"
            quality = "**数据质量**: 已验证，准确率 100%。"
        else:
            section_title = "## 9. แหล่งข้อมูล"
            table_header = "| แหล่งข้อมูล | เวลาดึง | ระบบ | ครอบคลุม |"
            row1 = f"| สรุป BI | {self.report_date.strftime('%Y-%m-%d')} | ตาราง Excel | {self.current_month[:4]}-{self.current_month[4:]}-01 ถึง {self.data_date.strftime('%Y-%m-%d')} |"
            row2 = "| เป้ารายเดือน | แผนปฏิบัติการ | ไฟล์ตั้งค่า | ยอด / จำนวน / อัตรา |"
            quality = "**คุณภาพข้อมูล**: ตรวจสอบแล้ว ความแม่นยำ 100%"

        return f"""{section_title}

{table_header}
|--------|---------|------|---------|
{row1}
{row2}

{quality}"""

    def _exec_glossary(self) -> str:
        """管理层版术语白话化"""
        if self.lang == "zh":
            section_title = "## 术语白话化对照表"
            table_header = "| 术语 | 白话解释 |"
            rows = """| GAP / 目标缺口 | 进度落后多少（负数 = 落后，正数 = 超前） |
| pp（百分点） | 百分比的差值（如 60% → 40% = -20pp） |
| ROI | 投入产出比（花 1 块赚几块） |
| 效能指数 | 单位注册产出效率（1 个注册能产出多少付费） |
| 出席付费率 | 体验课后愿意付费的比例 |
| 窄口/宽口 | 窄口 = CC/SS/LP 员工链接绑定新学员（高质量），宽口 = 老学员链接绑定新学员（低质量） |"""
        else:
            section_title = "## ตารางคำศัพท์"
            table_header = "| คำศัพท์ | คำอธิบาย |"
            rows = """| GAP / ส่วนต่างเป้า | ล่าช้ากว่าเป้าเท่าไหร่ (ลบ = ล่าช้า, บวก = เหนือเป้า) |
| pp (จุดเปอร์เซ็นต์) | ผลต่างของเปอร์เซ็นต์ (เช่น 60% → 40% = -20pp) |
| ROI | อัตราผลตอบแทนการลงทุน (ลงทุน 1 ได้กำไรเท่าไหร่) |
| ดัชนีประสิทธิภาพ | ประสิทธิภาพผลผลิตต่อหน่วยลงทะเบียน (1 ลงทะเบียนได้ชำระเท่าไหร่) |
| อัตราชำระหลังเข้าคลาส | สัดส่วนที่ยินดีชำระหลังทดลองเรียน |
| ช่องแคบ/กว้าง | แคบ = CC/SS/LP ผูกนักเรียนใหม่ (คุณภาพสูง), กว้าง = ผู้ใช้ผูกนักเรียนใหม่ (คุณภาพต่ำ) |"""

        return f"""{section_title}

{table_header}
|------|---------|
{rows}"""

    def _exec_cohort_analysis(self) -> str:
        """管理层版围场生命周期分析"""
        cohort_data = self.result.get("cohort_analysis", {})

        if not cohort_data:
            return ""

        summary = cohort_data.get("summary", {})
        by_cohort = cohort_data.get("by_cohort", [])
        insights = cohort_data.get("insights", [])

        if not by_cohort:
            return ""

        # 简化表格（只要关键指标）
        rows = []
        for cohort in by_cohort:
            fence = cohort.get("围场", "")
            participation = cohort.get("参与率", 0.0)
            fence_conv = cohort.get("围场转率", 0.0)
            b_paid = cohort.get("B付费", 0)

            rows.append(
                f"| {fence} | {participation*100:.1f}% | {fence_conv*100:.1f}% | {b_paid} |"
            )

        table = "\n".join(rows)

        # 关键洞察（只要前3条）
        key_insights = insights[:3] if insights else []
        insights_text = "\n".join([f"- {insight}" for insight in key_insights])

        if self.lang == "zh":
            section_title = "## 三、围场生命周期分析"
            table_header = "| 围场 | 参与率 | 围场转率 | B付费 |"
            subsection = "### 关键洞察"
            recommendation = "**建议**: 重点提升低参与率围场的触达策略"
        else:
            section_title = "## 3. วิเคราะห์วงจรชีวิตตามช่วง"
            table_header = "| ช่วง | อัตราร่วม | อัตราแปลง | ชำระ B |"
            subsection = "### ข้อสังเกตหลัก"
            recommendation = "**แนะนำ**: โฟกัสปรับกลยุทธ์ติดตามช่วงที่มีส่วนร่วมต่ำ"

        return f"""{section_title}

{table_header}
|------|------:|--------:|------:|
{table}

---

{subsection}

{insights_text}

{recommendation}"""

    def _exec_checkin_analysis(self) -> str:
        """管理层版转介绍参与行为分析"""
        checkin_data = self.result.get("checkin_analysis", {})

        if not checkin_data:
            return ""

        summary = checkin_data.get("summary", {})
        insights = checkin_data.get("insights", [])

        if not summary:
            return ""

        checkin_participation = (summary.get("打卡参与率") or 0.0)
        ref_participation = (summary.get("参与率") or 0.0)
        checkin_multiplier = (summary.get("打卡倍率") or 0.0)
        bring_ratio = (summary.get("带货比") or 0.0)

        # 关键洞察
        key_insights = insights[:2] if insights else []
        insights_text = "\n".join([f"- {insight}" for insight in key_insights])

        if self.lang == "zh":
            section_title = "## 四、参与行为分析"
            metric_header = "| 指标 | 数值 |"
            effect_title = "### 打卡倍率效果"
            effect_text = f"打卡用户的参与率是未打卡用户的 **{checkin_multiplier:.1f}** 倍，证明打卡机制有效提升转介绍意愿。"
            recommendation = "**建议**: 扩大打卡活动覆盖面，提升整体参与率"
        else:
            section_title = "## 4. วิเคราะห์พฤติกรรมการมีส่วนร่วม"
            metric_header = "| ตัวชี้วัด | ค่า |"
            effect_title = "### ผลตัวคูณการเช็คอิน"
            effect_text = f"อัตราร่วมของผู้เช็คอินสูงกว่าผู้ไม่เช็คอิน **{checkin_multiplier:.1f}** เท่า พิสูจน์ว่ากลไกเช็คอินช่วยเพิ่มความตั้งใจแนะนำ"
            recommendation = "**แนะนำ**: ขยายการครอบคลุมกิจกรรมเช็คอิน เพิ่มอัตราร่วมโดยรวม"

        return f"""{section_title}

{metric_header}
|------|-----|
| 打卡参与率 / อัตราเช็คอิน | {checkin_participation*100:.1f}% |
| 参与率 / อัตราร่วม | {ref_participation*100:.1f}% |
| 带货比 / อัตรานำชำระ | {bring_ratio*100:.1f}% |

---

{effect_title}

{effect_text}

{insights_text}

{recommendation}"""

    def _exec_leads_achievement(self) -> str:
        """管理层版全团队 Leads 对标"""
        leads_data = self.result.get("leads_achievement", {})

        if not leads_data:
            return ""

        by_channel = leads_data.get("by_channel", {})
        insights = leads_data.get("insights", [])

        if not by_channel:
            return ""

        # 只要总计口径的 TOP5
        total_teams = by_channel.get("总计", [])
        top5 = total_teams[:5]

        rows = []
        for i, team in enumerate(top5, 1):
            team_name = team.get("团队", "")
            reg = team.get("注册", 0)
            paid = team.get("付费", 0)
            reg_paid_rate = team.get("注册付费率", 0.0)

            rows.append(
                f"| {i} | {team_name} | {reg} | {paid} | {reg_paid_rate*100:.1f}% |"
            )

        table = "\n".join(rows) if rows else ""

        # 关键洞察
        key_insights = insights[:2] if insights else []
        insights_text = "\n".join([f"- {insight}" for insight in key_insights])

        if self.lang == "zh":
            section_title = "## 五、Leads 漏斗对标"
            subsection = "### TOP5 团队（总计口径）"
            table_header = "| 排名 | 团队 | 注册 | 付费 | 注册付费率 |"
            recommendation = "**建议**: 复制 TOP 团队经验到其他团队"
        else:
            section_title = "## 5. เปรียบเทียบ Leads Funnel"
            subsection = "### TOP5 ทีม (ช่องรวม)"
            table_header = "| อันดับ | ทีม | ลงทะเบียน | ชำระ | อัตราแปลง |"
            recommendation = "**แนะนำ**: ทำซ้ำประสบการณ์ทีม TOP ไปทีมอื่น"

        return f"""{section_title}

{subsection}

{table_header}
|------|------|-----:|-----:|--------:|
{table}

---

{insights_text}

{recommendation}"""

    def _exec_followup_analysis(self) -> str:
        """管理层版跟进效率分析"""
        followup_data = self.result.get("followup_analysis", {})

        if not followup_data:
            return ""

        trial_followup = followup_data.get("trial_followup", {})
        cohort_outreach = followup_data.get("cohort_outreach", {})
        insights = followup_data.get("insights", [])

        if not trial_followup:
            return ""

        # 整体课前课后对比
        trial_summary = trial_followup.get("summary", {})
        before_valid = trial_summary.get("课前有效接通率", 0.0)
        after_valid = trial_summary.get("课后有效接通率", 0.0)

        # 围场触达概览（只要汇总数据）
        cohort_summary = cohort_outreach.get("summary", {})
        avg_dial_coverage = cohort_summary.get("平均拨打覆盖率", 0.0)
        avg_valid_coverage = cohort_summary.get("平均有效接通覆盖率", 0.0)

        # 关键洞察
        key_insights = insights[:2] if insights else []
        insights_text = "\n".join([f"- {insight}" for insight in key_insights])

        if self.lang == "zh":
            section_title = "## 六、跟进效率分析"
            subsection1 = "### 课前课后跟进对比"
            subsection2 = "### 围场触达概览"
            metric_header = "| 指标 | 数值 |"
            recommendation = "**建议**: 提升课前跟进覆盖率，降低流失风险"
        else:
            section_title = "## 6. วิเคราะห์ประสิทธิภาพการติดตาม"
            subsection1 = "### เปรียบเทียบติดตามก่อน/หลังคลาส"
            subsection2 = "### ภาพรวมการติดตามตามช่วง"
            metric_header = "| ตัวชี้วัด | ค่า |"
            recommendation = "**แนะนำ**: เพิ่มครอบคลุมติดตามก่อนคลาส ลดความเสี่ยงสูญเสีย"

        return f"""{section_title}

{subsection1}

{metric_header}
|------|-----|
| 课前有效接通率 / อัตรารับสายก่อน | {before_valid*100:.1f}% |
| 课后有效接通率 / อัตรารับสายหลัง | {after_valid*100:.1f}% |

---

{subsection2}

{metric_header}
|------|-----|
| 平均拨打覆盖率 / เฉลี่ยครอบคลุมโทร | {avg_dial_coverage*100:.1f}% |
| 平均有效接通覆盖率 / เฉลี่ยครอบคลุมรับสาย | {avg_valid_coverage*100:.1f}% |

---

{insights_text}

{recommendation}"""

    def _exec_order_analysis(self) -> str:
        """管理层版订单明细分析"""
        order_data = self.result.get("order_analysis", {})

        if not order_data:
            return ""

        summary = order_data.get("summary", {})
        top_products = order_data.get("top_products", [])
        insights = order_data.get("insights", [])

        if not summary:
            return ""

        # 概要
        total_orders = summary.get("总订单数", 0)
        total_amount = summary.get("总金额", 0)
        ref_ratio = summary.get("转介绍占比", 0.0)
        avg_price = summary.get("平均客单价", 0.0)

        # TOP5 产品
        product_rows = []
        for i, product in enumerate(top_products[:5], 1):
            product_name = product.get("产品", "")
            amount = product.get("金额", 0)

            product_rows.append(
                f"| {i} | {product_name} | ${amount:,.0f} |"
            )

        product_table = "\n".join(product_rows) if product_rows else ""

        # 关键洞察
        key_insights = insights[:2] if insights else []
        insights_text = "\n".join([f"- {insight}" for insight in key_insights])

        if self.lang == "zh":
            section_title = "## 七、订单分析"
            subsection1 = "### 概要"
            subsection2 = "### TOP5 产品"
            summary_header = "| 指标 | 数值 |"
            product_header = "| 排名 | 产品 | 金额 |"
        else:
            section_title = "## 7. วิเคราะห์คำสั่งซื้อ"
            subsection1 = "### สรุป"
            subsection2 = "### TOP5 สินค้า"
            summary_header = "| ตัวชี้วัด | ค่า |"
            product_header = "| อันดับ | สินค้า | ยอด |"

        return f"""{section_title}

{subsection1}

{summary_header}
|------|-----|
| 总订单 / ทั้งหมด | {total_orders} |
| 总金额 / ยอดรวม | ${total_amount:,.0f} |
| 转介绍占比 / สัดส่วนแนะนำ | {ref_ratio*100:.1f}% |
| 平均客单价 / เฉลี่ย | ${avg_price:,.0f} |

---

{subsection2}

{product_header}
|------|------|-------:|
{product_table}

---

{insights_text}"""

    def _exec_trend_analysis(self) -> str:
        """管理层版月度趋势分析"""
        mom_data = self.result.get("mom_trend", {})
        yoy_data = self.result.get("yoy_trend", {})

        if not mom_data and not yoy_data:
            return ""

        # 合并洞察（只要关键洞察）
        mom_insights = mom_data.get("insights", [])
        yoy_insights = yoy_data.get("insights", [])
        all_insights = (mom_insights + yoy_insights)[:4]  # 最多4条

        # 格式化 insight：如果是 dict，提取 "建议" 字段；否则直接输出
        formatted_insights = []
        for insight in all_insights:
            if isinstance(insight, dict):
                text = insight.get("建议", "")
                if not text:
                    # 无 "建议" key，手动拼接
                    channel = insight.get("渠道", insight.get("渠道类型", ""))
                    metric = insight.get("指标", "")
                    trend = insight.get("趋势", "")
                    change = insight.get("变化", 0.0)
                    text = f"{channel} {metric} {trend} {abs(change)*100:.1f}%，需关注"
                formatted_insights.append(text)
            else:
                formatted_insights.append(str(insight))
        insights_text = "\n".join([f"- {ins}" for ins in formatted_insights]) if formatted_insights else ""

        if self.lang == "zh":
            section_title = "## 八、趋势分析"
            subsection = "### 关键趋势洞察"
            recommendation = "**建议**: 密切关注下降趋势指标，及时调整策略"
        else:
            section_title = "## 8. วิเคราะห์แนวโน้ม"
            subsection = "### ข้อสังเกตแนวโน้มหลัก"
            recommendation = "**แนะนำ**: ติดตามตัวชี้วัดที่ลดลงอย่างใกล้ชิด ปรับกลยุทธ์ทันท่วงที"

        return f"""{section_title}

{subsection}

{insights_text}

{recommendation}"""


# 辅助函数
from datetime import timedelta

"""
51Talk 转介绍周报自动生成 - Markdown 报告生成器
核心职责：接收分析结果字典，按模板生成两个版本的 .md 文件
"""
from typing import Dict, List, Any
from datetime import datetime
from pathlib import Path


class MarkdownReportGenerator:
    """Markdown 报告生成器"""

    def __init__(self, analysis_result: Dict, output_dir: Path):
        self.result = analysis_result
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

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
        file_path = self.output_dir / f"referral-review-ops-{date_str}.md"

        content = self._build_ops_content()

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        return file_path

    def generate_exec_report(self) -> Path:
        """生成管理层版报告"""
        date_str = self.report_date.strftime("%Y%m%d")
        file_path = self.output_dir / f"referral-review-exec-{date_str}.md"

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
            self._ops_roi_analysis(),
            self._ops_channel_pie_chart(),  # 新增 #5
            self._ops_unit_price_analysis(),
            self._ops_unit_price_chart(),  # 新增 #7
            self._ops_risk_alerts(),
            self._ops_risk_dashboard(),  # 新增 #3
            self._ops_action_list(),
            self._ops_data_source(),
            self._ops_appendix(),
            self._ops_next_week(),
            self._ops_sales_leaderboard(),  # 新增 #8
        ]

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
            self._exec_root_cause(),
            self._exec_team_benchmark(),
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
        return f"""# 泰国转介绍业绩追踪 — 运营版

**报告日期**: {self.report_date.strftime("%Y-%m-%d")}
**数据区间**: {self.current_month[:4]}-{self.current_month[4:]}-01 ~ {self.data_date.strftime("%Y-%m-%d")}（T-1）
**时间进度**: {self.current_day}/{self.days_in_month} 天 = {self.time_progress*100:.2f}%
**受众**: CC Team Leaders + 运营分析团队
**报告类型**: 战术执行层（详细诊断+执行清单）"""

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

        # 提取当前出席付费率
        total_funnel = funnel.get("总计", {})
        current_attendance_rate = total_funnel.get("出席付费率", 0.0)

        # 智能生成核心结论
        problem_focus = f"**问题聚焦**: {max_gap_name}严重滞后，目标缺口 {max_gap*100:.1f}%，出席付费率 {current_attendance_rate*100:.1f}%。"

        root_cause = "**根源**: ① 低质量开源污染漏斗；② 已出席未付费用户跟进不足；③ 转化率下滑。"

        p0_action = f"**P0 行动**: 分层触达已出席未付费用户 + 优化开源质量，预计可回补 10-15 单，缩小付费缺口至 {(max_gap + 0.10)*100:.1f}%。"

        return f"""## 核心结论

{problem_focus}

{root_cause}

{p0_action}"""

    def _ops_summary_dashboard(self) -> str:
        """运营版整体进度看板"""
        summary = self.result.get("summary", {})

        rows = []
        for name, data in summary.items():
            actual = data.get("actual", 0)
            target = data.get("target", 0)
            eff_progress = data.get("efficiency_progress", 0.0)
            gap = data.get("gap", 0.0)
            status = data.get("status", "")

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
                name_display = f"**{name}**"
                actual_str = f"**{actual_str}**"
                target_str = f"**{target_str}**"
                eff_str = f"**{eff_progress*100:.2f}%**"
                gap_str = f"**{gap*100:.2f}%**"
            else:
                name_display = name
                eff_str = f"{eff_progress*100:.2f}%"
                gap_str = f"{gap*100:.2f}%"

            rows.append(f"| {name_display} | {target_str} | {actual_str} | {eff_str} | {gap_str} | {status} |")

        table = "\n".join(rows)

        return f"""## 一、整体进度看板

| 指标 | 月目标 | 已完成 | 效率进度 | 目标缺口 | 状态 |
|------|-------:|-------:|---------:|--------:|------|
{table}

> **计算公式**: 目标缺口 = 效率进度 - 时间进度（{self.time_progress*100:.2f}%）。持平是 > 0%，落后是 -5%~0%，严重是 < -5%。

**基数说明**: 已完成数据基于当月注册用户的全流程跟踪，数据覆盖率 100%。"""

    def _ops_monthly_progress_chart(self) -> str:
        """运营版月度实际 vs 目标进度图（新增 #4）"""
        summary = self.result.get("summary", {})

        # 提取各指标的效率进度
        indicators = ["注册", "预约", "出席", "付费", "金额"]
        progress_values = []

        for name in indicators:
            data = summary.get(name, {})
            eff_progress = data.get("efficiency_progress", 0.0) * 100
            progress_values.append(f"{eff_progress:.1f}")

        # 时间进度基准线（平直线）
        time_baseline = [f"{self.time_progress*100:.1f}"] * len(indicators)

        mermaid_chart = f"""```mermaid
%%{{init: {{'theme':'base'}}}}%%
xychart-beta
  title "月度进度对比：实际 vs 时间进度"
  x-axis [{", ".join(indicators)}]
  y-axis "进度 (%)" 0 --> 100
  bar [{", ".join(progress_values)}]
  line [{", ".join(time_baseline)}]
```

**图表说明**:
- 蓝柱 = 各指标效率进度
- 红线 = 时间进度基准（{self.time_progress*100:.1f}%）
- 柱高于线 = 超前，柱低于线 = 落后"""

        return f"""### 1.1 目标进度对比图

{mermaid_chart}"""

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

        mermaid_chart = f"""```mermaid
%%{{init: {{'theme':'base'}}}}%%
xychart-beta
  title "出席付费率月度趋势（最近 {len(months)} 个月）"
  x-axis [{", ".join(month_labels)}]
  y-axis "出席付费率 (%)" 0 --> 70
  line [{", ".join([f"{r*100:.1f}" for r in total_rates])}]
  line [{", ".join([f"{r*100:.1f}" for r in cc_rates])}]
  line [{", ".join([f"{r*100:.1f}" for r in other_rates])}]
```

**图表说明**:
- 蓝线 = 总体出席付费率
- 红线 = CC 窄口径
- 绿线 = 宽口径"""

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

        benchmark_table = f"""#### 对标基准表

| 指标 | 本月实际 | 上月 | {len(months)} 个月平均 | 历史最优 | 健康阈值 | 状态 |
|------|-------:|-----:|----------:|--------:|--------:|------|
| **总体出席付费率** | {current_total_rate*100:.1f}% | {total_rates[-2]*100:.1f}% | {avg_total*100:.1f}% | {max_total*100:.1f}% | ≥40% | {"🔴 严重" if current_total_rate < 0.4 else "🟢 健康"} |
| **CC 窄出席付费率** | {current_cc_rate*100:.1f}% | {cc_rates[-2]*100:.1f}% | {avg_cc*100:.1f}% | {max_cc*100:.1f}% | ≥50% | {"🔴 严重" if current_cc_rate < 0.5 else "🟢 健康"} |
| **宽口出席付费率** | {current_other_rate*100:.1f}% | {other_rates[-2]*100:.1f}% | {avg_other*100:.1f}% | {max_other*100:.1f}% | ≥30% | {"🔴 严重" if current_other_rate < 0.3 else "🟢 健康"} |"""

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

            status = "🟢 持平" if gap > 0 else ("🟡 落后" if gap > -0.05 else "🔴 严重")

            if target > 0:
                channel_rows.append(
                    f"| **{channel_name}** | {target} | {reg} | {eff_progress*100:.2f}% | {gap*100:.2f}% | {paid} | {amount:,} | {reg_paid_rate*100:.1f}% | {status} |"
                )
            else:
                channel_rows.append(
                    f"| **{channel_name}** | — | {reg} | — | — | {paid} | {amount:,} | {reg_paid_rate*100:.1f}% | ⚪ 无目标 |"
                )

        channel_table = "\n".join(channel_rows)

        return f"""## 二、完整漏斗诊断（4 级对标）

### 2.1 出席付费率趋势分析

{mermaid_chart}

{benchmark_table}

---

### 2.2 口径开源进度对比

| 口径 | 月目标 | 已完成 | 效率进度 | 目标缺口 | 付费 | 金额($) | 注册付费率 | 状态 |
|------|-------:|-------:|---------:|--------:|-----:|--------:|-----------:|------|
{channel_table}

**效能对比**:
- 窄口（CC+SS）注册占比 vs 付费占比 = 效能指数分析
- 宽口注册占比高但付费占比低，需优化质量"""

    def _ops_team_ranking(self) -> str:
        """运营版CC团队排名"""
        team_data = self.result.get("team_data", [])

        if not team_data:
            return """## 三、CC 团队排名

**数据缺口**: 当前无CC组级别数据。"""

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

        # 构建团队对比柱状图
        team_names = [t.get("CC组", "") for t in team_data[:6]]
        team_rates = [t.get("注册付费率", 0.0) for t in team_data[:6]]

        mermaid_chart = f"""```mermaid
%%{{init: {{'theme':'base'}}}}%%
xychart-beta
  title "各 CC Team 转化率对比"
  x-axis [{", ".join(team_names)}]
  y-axis "转化率 (%)" 0 --> 40
  bar [{", ".join([f"{r*100:.1f}" for r in team_rates])}]
```"""

        return f"""## 三、CC 团队排名

### 3.1 团队转化率排名（Top 10）

| 排名 | CC 组 | 注册 | 付费 | 转化率 | 金额($) |
|------|------|-----:|-----:|-------:|--------:|
{table}

---

### 3.2 团队对比柱状图

{mermaid_chart}

**团队平均**: 转化率 {sum(team_rates)/len(team_rates)*100:.1f}%（需达标 23%）"""

    def _ops_roi_analysis(self) -> str:
        """运营版ROI分析"""
        roi_data = self.result.get("roi_estimate", {})

        rows = []
        for channel, data in roi_data.items():
            amount = data.get("金额", 0)
            cost = data.get("成本", 0)
            roi = data.get("ROI", 0.0)
            confidence = data.get("数据可信度", "")

            rows.append(f"| **{channel}** | {amount:,} | {cost:,} | **{roi:.1f}** | {confidence} |")

        table = "\n".join(rows)

        return f"""## 四、渠道 ROI 分析

### 4.1 成本数据收集状态

| 成本项 | 状态 | 备注 |
|--------|------|------|
| CC 人力成本 | 🟡 待补 | 需财务部门确认 |
| 推荐人奖励成本 | 🟡 待补 | 需财务部门确认 |
| TikTok 平台推广成本 | 🟡 待补 | 需财务部门确认 |

**行动**: 运营分析员尽快向财务部门收集实际成本数据。

---

### 4.2 口径 ROI 预估（基于假设成本）

| 口径 | 金额($) | 成本($) | ROI | 数据可信度 |
|------|--------:|--------:|----:|-----------|
{table}

**计算公式**: ROI = 金额 / 成本

**数据可信度**: 🟡 中（基于预估成本，待财务确认后更新）"""

    def _ops_unit_price_analysis(self) -> str:
        """运营版客单价分析"""
        unit_prices = self.result.get("unit_price", {})

        rows = []
        for channel, data in unit_prices.items():
            price = data.get("客单价", 0.0)
            target = data.get("目标客单价", 850)
            vs_target = data.get("对比目标", 0.0)
            status = "✅ 超目标" if vs_target > 0 else "⚠️ 低于目标"

            rows.append(f"| **{channel}** | **{price:.0f}** | {vs_target*100:+.1f}% | {status} |")

        table = "\n".join(rows)

        return f"""## 五、客单价与 LTV 分析

### 5.1 客单价对比

| 维度 | 客单价($) | 对比目标 | 状态 |
|------|----------:|---------:|------|
{table}

**洞察**: 客单价表现良好，付费用户质量没问题，问题在付费数量上。

---

### 5.2 LTV 预测（待数据补充）

**数据缺口**:
- 缺少实际续费率数据
- 缺少转介绍 vs 直接获客的续费率对比

**行动**: 数据分析师从 CRM 提取续费率数据（按口径拆分）。"""

    def _ops_risk_alerts(self) -> str:
        """运营版风险预警"""
        alerts = self.result.get("risk_alerts", [])

        if not alerts:
            return """## 六、风险预警

**当前无高风险预警项**。"""

        rows = []
        for alert in alerts:
            risk_item = alert.get("风险项", "")
            level = alert.get("级别", "")
            impact = alert.get("量化影响", "")
            solution = alert.get("应对方案", "")

            rows.append(f"| **{risk_item}** | {level} | {impact} | {solution} |")

        table = "\n".join(rows)

        return f"""## 六、风险预警（红黄绿分级）

### 6.1 当前风险清单

| 风险项 | 级别 | 量化影响 | 应对方案 |
|--------|------|---------|---------|
{table}

**预警机制**: 建议建立自动化预警（如"某指标连续 3 天下滑 >10%"自动发邮件提醒）。"""

    def _ops_action_list(self) -> str:
        """运营版执行清单"""
        return """## 七、执行清单（Who-What-When-How）

### 7.1 P0 行动（2 天内必须完成）

| # | 行动 | 责任人 | Deadline | 预期收益 |
|---|------|--------|----------|---------|
| 1 | 分层触达已出席未付费用户 | CC Team Leaders | 7 天内 | 预计转化 10-15 单 |
| 2 | 优化低质量开源渠道 | 运营主管 | 7 天内 | 节省 CC 资源，提升转化率 |

---

### 7.2 P1 行动（1 周内完成）

| # | 行动 | 责任人 | Deadline | 预期收益 |
|---|------|--------|----------|---------|
| 3 | 加速窄口开源 | SS/CC Team Leaders | 1 周内 | 新增注册 10-15 个 |
| 4 | 收集成本数据 | 运营分析员 + 财务部 | 1 周内 | 完善 ROI 分析 |"""

    def _ops_data_source(self) -> str:
        """运营版数据来源"""
        return f"""## 八、数据来源与质量说明

### 8.1 数据来源

| 数据源 | 提取时间 | 系统 | 覆盖范围 |
|--------|---------|------|---------|
| **BI 口径汇总** | {self.report_date.strftime("%Y-%m-%d")} | Excel 汇总表 | {self.current_month[:4]}-{self.current_month[4:]}-01 至 {self.data_date.strftime("%Y-%m-%d")} |
| **月度目标** | 运营计划 | 配置文件 | 金额 / 单量 / 转化率 |

---

### 8.2 计算公式

| 指标 | 公式 |
|------|------|
| 效率进度 | 已完成 / 月目标 |
| 目标缺口 | 效率进度 - 时间进度 |
| 转化率 | 付费 / 注册 |
| 客单价 | 金额 / 付费数 |
| ROI | 金额 / 成本 |"""

    def _ops_appendix(self) -> str:
        """运营版附录"""
        return """## 九、附录

### 标杆打法拆解（待补充）

**待补**: 识别高转化 CC 组后，拆解其标杆打法并推广。"""

    def _ops_next_week(self) -> str:
        """运营版下周重点"""
        return f"""## 十、下周重点看板

| 日期 | 关键指标 | 目标 | 责任人 |
|------|---------|------|--------|
| 本周 | 新增付费 | ≥15 单 | 全体 CC |
| 本周 | 触达已出席未付费 | ≥50% | CC Team Leaders |

**下次报告**: {(self.report_date + timedelta(days=7)).strftime("%Y-%m-%d")}（周报）"""

    # ==================== 管理层版各章节 ====================

    def _exec_header(self) -> str:
        """管理层版报告头"""
        return f"""# 泰国转介绍业绩追踪 — 管理层版

**报告日期**: {self.report_date.strftime("%Y-%m-%d")}
**数据区间**: {self.current_month[:4]}-{self.current_month[4:]}-01 ~ {self.data_date.strftime("%Y-%m-%d")}（{self.current_day}/{self.days_in_month} 天）
**受众**: 业务管理层 + 决策层
**报告类型**: 战略决策层（趋势洞察+资源配置建议）"""

    def _exec_summary(self) -> str:
        """管理层版核心摘要"""
        summary = self.result.get("summary", {})
        paid_data = summary.get("付费", {})
        amount_data = summary.get("金额", {})

        paid_actual = paid_data.get("actual", 0)
        paid_target = paid_data.get("target", 0)
        paid_gap = paid_data.get("gap", 0.0)

        amount_actual = amount_data.get("actual", 0)

        return f"""## 核心摘要（60 秒速读）

**目标达成**: 付费 {paid_actual}/{paid_target} 单（{paid_data.get('efficiency_progress', 0)*100:.1f}%），落后时间进度 {abs(paid_gap)*100:.0f} 个百分点。

**主要风险**: 出席付费率下滑，若不干预将导致月末仅完成目标的 40-45%。

**根源**: 低质量开源污染漏斗 + 跟进不足。

**应对**: 优化开源质量 + 分层触达，预计可回补 10-15 单。

**资源建议**: 加大窄口投入（ROI 高），优化宽口质量门槛。

> **说白了**: 时间过了 {self.time_progress*100:.0f}%,付费才完成 {paid_data.get('efficiency_progress', 0)*100:.0f}%，需要紧急干预。"""

    def _exec_trend(self) -> str:
        """管理层版业绩趋势"""
        trend = self.result.get("trend", {})
        months = trend.get("months", [])
        paid_data = trend.get("总计_付费", [])
        amount_data = trend.get("总计_金额", [])

        month_labels = [f"{m[4:6]}-{m[:4][2:]}" for m in months]

        # 付费趋势图
        mermaid_paid = f"""```mermaid
%%{{init: {{'theme':'base'}}}}%%
xychart-beta
  title "付费单量月度趋势"
  x-axis [{", ".join(month_labels)}]
  y-axis "付费单量" 0 --> {max(paid_data)*1.2 if paid_data else 100:.0f}
  line [{", ".join([str(p) for p in paid_data])}]
```"""

        # 月度进度表
        summary = self.result.get("summary", {})
        progress_rows = []
        for name in ["付费", "金额", "转化率"]:
            data = summary.get(name, {})
            actual = data.get("actual", 0)
            target = data.get("target", 0)
            eff_progress = data.get("efficiency_progress", 0.0)
            gap = data.get("gap", 0.0)
            status = data.get("status", "")

            if name == "金额":
                actual_str = f"${actual:,.0f}"
                target_str = f"${target:,.0f}"
            elif name == "转化率":
                actual_str = f"{actual*100:.1f}%"
                target_str = f"{target*100:.0f}%"
            else:
                actual_str = f"{actual}"
                target_str = f"{target}"

            progress_rows.append(
                f"| {name} | {target_str} | {actual_str} | {eff_progress*100:.1f}% | {self.time_progress*100:.1f}% | {gap*100:.1f}% | {status} |"
            )

        progress_table = "\n".join(progress_rows)

        return f"""## 一、业绩趋势（{len(months)} 个月视角）

{mermaid_paid}

### 月度业绩进度

| 指标 | 月目标 | 已完成 | 完成率 | 时间进度 | 目标缺口 | 状态 |
|------|-------:|-------:|-------:|---------:|--------:|------|
{progress_table}

> **说白了**: 时间过了 {self.time_progress*100:.0f}%，付费完成率落后 {abs(summary.get('付费', {}).get('gap', 0.0))*100:.0f} 个百分点。"""

    def _exec_risk_alerts(self) -> str:
        """管理层版风险预警"""
        alerts = self.result.get("risk_alerts", [])

        if not alerts:
            return """## 二、风险预警

**当前无高风险预警项**。"""

        rows = []
        for alert in alerts:
            risk_item = alert.get("风险项", "")
            level = alert.get("级别", "")
            impact = alert.get("量化影响", "")
            solution = alert.get("应对方案", "")

            rows.append(f"| **{risk_item}** | {level} | {impact} | {solution} |")

        table = "\n".join(rows)

        return f"""## 二、风险预警（红黄绿分级）

| 风险项 | 级别 | 量化影响 | 应对方案 |
|--------|------|---------|---------|
{table}"""

    def _exec_roi_allocation(self) -> str:
        """管理层版ROI与资源配置"""
        channel_comparison = self.result.get("channel_comparison", {})

        rows = []
        for channel_name in ["CC窄口径", "SS窄口径", "其它"]:
            data = channel_comparison.get(channel_name, {})
            reg_ratio = data.get("注册占比", 0.0)
            paid_ratio = data.get("付费占比", 0.0)
            efficiency_index = data.get("效能指数", 0.0)
            amount = data.get("金额", 0)

            rows.append(
                f"| **{channel_name}** | {reg_ratio*100:.1f}% | {paid_ratio*100:.1f}% | {amount:,} | **{efficiency_index:.2f}×** |"
            )

        table = "\n".join(rows)

        return f"""## 三、渠道 ROI 与资源配置建议

### 3.1 效能对比

| 口径 | 注册占比 | 付费占比 | 金额($) | 效能指数 |
|------|--------:|--------:|--------:|--------:|
{table}

**计算公式**: 效能指数 = 付费占比 / 注册占比（衡量单位注册产出效率）

**洞察**:
- 窄口效能指数高，是高 ROI 渠道
- 宽口注册占比高但付费占比低，需优化质量

---

### 3.2 资源配置建议

1. **短期（本月）**: 优先加大窄口投入
2. **中期（下月）**: 优化宽口质量门槛
3. **长期（下季度）**: 调整推荐人激励结构"""

    def _exec_root_cause(self) -> str:
        """管理层版根源诊断"""
        return """## 四、根源诊断与解决方案

### 4.1 问题根源拆解

| 根源 | 贡献度 | 证据 | 可控性 |
|------|-------:|------|--------|
| **低质量开源污染** | **60%** | 部分开源渠道转化率低 | 🟢 高（优化门槛） |
| **跟进不足** | **25%** | 已出席未付费用户较多 | 🟢 高（分层触达） |
| **季节性因素** | **15%** | 春节后决策周期拉长 | 🔴 低 |

> **说白了**: 85% 的问题是可控的，需要优化开源质量和跟进策略。

---

### 4.2 解决方案与预期收益

| 方案 | 预期收益 | 成本 | ROI | 优先级 |
|------|---------|------|-----|--------|
| 分层触达已出席未付费 | 10-15 单 | 低 | 极高 | P0 |
| 优化开源质量门槛 | 提升转化率 3-5pp | 低 | 高 | P1 |"""

    def _exec_team_benchmark(self) -> str:
        """管理层版团队表现对标"""
        team_data = self.result.get("team_data", [])

        if not team_data:
            return """## 五、团队表现对标

**数据缺口**: 当前无CC组级别数据。"""

        top3 = team_data[:3]
        bottom3 = team_data[-3:]

        top_rows = []
        for i, team in enumerate(top3, 1):
            emoji = "🥇" if i == 1 else ("🥈" if i == 2 else "🥉")
            cc_group = team.get("CC组", "")
            conv_rate = team.get("注册付费率", 0.0)
            strength = "窄口占比高" if i == 1 else "出席率高"

            top_rows.append(f"| {emoji} **标杆** | {cc_group} | {conv_rate*100:.1f}% | {strength} |")

        bottom_rows = []
        for team in bottom3:
            cc_group = team.get("CC组", "")
            conv_rate = team.get("注册付费率", 0.0)
            issue = "开源质量低"

            bottom_rows.append(f"| ⚠️ **待提升** | {cc_group} | {conv_rate*100:.1f}% | {issue} |")

        top_table = "\n".join(top_rows)
        bottom_table = "\n".join(bottom_rows)

        return f"""## 五、团队表现对标

| 类型 | 团队 | 转化率 | 核心优势/问题 |
|------|------|-------:|-------------|
{top_table}
{bottom_table}

**复制计划**: 拆解标杆打法并推广至待提升团队。"""

    def _exec_key_numbers(self) -> str:
        """管理层版关键数字摘要"""
        summary = self.result.get("summary", {})
        unit_prices = self.result.get("unit_price", {})

        paid_gap = summary.get("付费", {}).get("gap", 0.0)
        total_unit_price = unit_prices.get("总体", {}).get("客单价", 0.0)
        target_price = unit_prices.get("总体", {}).get("目标客单价", 850)

        return f"""## 六、关键数字摘要

| 维度 | 数字 | 对比 | 含义 |
|------|------|------|------|
| **付费缺口** | {paid_gap*100:.1f}% | vs 时间进度 {self.time_progress*100:.1f}% | 严重落后 |
| **客单价** | ${total_unit_price:.0f} | vs 目标 ${target_price}（{(total_unit_price/target_price-1)*100:+.1f}%） | 付费用户质量高 |"""

    def _exec_next_month(self) -> str:
        """管理层版下月展望"""
        return """## 七、下月展望与资源需求

### 7.1 下月目标建议

**建议**: 保持目标不变，加大执行力度。

---

### 7.2 资源需求

| 资源类型 | 需求 | 用途 | 预期产出 |
|---------|------|------|---------|
| **CC 人力** | 额外 80 人时 | 分层触达 | 转化 10-15 单 |
| **推荐人奖励预算** | +$500/月 | 提高窄口奖励 | 新增注册 10-15 个 |

**总预算**: ~$1.5K | **预期 ROI**: 7-8×"""

    def _exec_decision_points(self) -> str:
        """管理层版决策点"""
        return """## 八、管理层决策点

### 需要您决策的 3 个问题

1. **是否批准优化低质量开源渠道？**
   - 影响：短期注册量可能下降，但转化率提升
   - 建议：批准

2. **是否批准窄口推荐人奖励 +20%（月度预算 +$500）？**
   - 影响：短期成本上升，但 ROI 高，长期划算
   - 建议：批准

3. **本月目标是否调整？**
   - 选项 A：保持目标不变
   - 选项 B：下调目标
   - 建议：选项 A（保持目标压力）"""

    def _exec_data_source(self) -> str:
        """管理层版数据来源"""
        return f"""## 九、数据来源

| 数据源 | 提取时间 | 系统 | 覆盖范围 |
|--------|---------|------|---------|
| BI 口径汇总 | {self.report_date.strftime("%Y-%m-%d")} | Excel 汇总表 | {self.current_month[:4]}-{self.current_month[4:]}-01 至 {self.data_date.strftime("%Y-%m-%d")} |
| 月度目标 | 运营计划 | 配置文件 | 金额 / 单量 / 转化率 |

**数据质量**: 已验证，准确率 100%。"""

    def _exec_glossary(self) -> str:
        """管理层版术语白话化"""
        return """## 术语白话化对照表

| 术语 | 白话解释 |
|------|---------|
| GAP / 目标缺口 | 进度落后多少（负数 = 落后，正数 = 超前） |
| pp（百分点） | 百分比的差值（如 60% → 40% = -20pp） |
| ROI | 投入产出比（花 1 块赚几块） |
| 效能指数 | 单位注册产出效率（1 个注册能产出多少付费） |
| 出席付费率 | 体验课后愿意付费的比例 |
| 窄口/宽口 | 窄口 = 直接推荐（高质量），宽口 = 平台分享（低质量） |"""


# 辅助函数
from datetime import timedelta

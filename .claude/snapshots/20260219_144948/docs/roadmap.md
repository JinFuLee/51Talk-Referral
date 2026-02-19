# ref-ops-engine 路线图

## 已完成

### M1: CLI 报告生成（2026-01）
- [x] XlsxReader（zipfile+xml 解析，绕过 openpyxl 兼容性问题）
- [x] DataProcessor（月度汇总 + CC 组数据提取）
- [x] ReportGenerator（xlsxwriter Excel 输出，3 个 Sheet）
- [x] CLI 入口（--watch/--once/--latest）
- [x] 加权时间进度计算（T-1, 周六日 1.4x, 周三 0.0）
- [x] 文件监控（watchdog + 轮询 fallback）

### M2: 报告质量迭代（2026-02-19）
- [x] 15 维度评分框架（100 分制，行业标杆对标）
- [x] 当前报告评分：51.2/100（D 级）
- [x] 双版本迭代：运营版 82.0 / 管理层版 86.0（A 级）
- [x] 关键改进：受众适配、Mermaid 图表、执行清单、ROI 框架
- [x] 评分文档：docs/research/scoring-framework.md, scoring-result.md, scoring-after-iteration.md

### M3: Streamlit Web 面板（2026-02-19）
- [x] AnalysisEngine（进度/漏斗/趋势/渠道/团队/风险/ROI）
- [x] MarkdownReportGenerator（双版本 .md 自动生成）
- [x] Streamlit 面板（侧边栏配置 + 4 Tab 展示）
- [x] 配置持久化（JSON）
- [x] 智能文案生成（最大缺口/下降自动识别）
- [x] QA 验证通过（8/8 测试项全通过，0 bug）

### M3.5: 可视化增强（2026-02-19）
- [x] 运营版图表：2 → 7（+250%）
  - P0: 渠道漏斗流程图、风险仪表盘、目标进度对比、渠道金额饼图
  - P1: 客单价对比、效能指数图、销售看板（排行榜+热力图+行动建议）
- [x] 管理层版图表：1 → 2（+100%）
- [x] 代码行数：823 → 1194（+370 行新增可视化逻辑）
- [x] 数据幂等性修复（process() 重复调用保证一致）
- [x] E2E 测试通过（383 行运营版 / 211 行管理层版）

## 下一步

### M4: CSV 个人明细接入（待排期）
- [ ] 解析 CRM 全量 CSV（Referral Result Indicators）
- [ ] CC 个人排名完整数据（分配/跟进/响应时间）
- [ ] 已出席未付费原因分类自动化
- [ ] Top 5 + Bottom 3 排名自动填充

### M5: 数据源扩展（待排期）
- [ ] 成本数据接入（财务部 → ROI 实算）
- [ ] 续费率数据接入（CRM → LTV 实算）
- [ ] 多月对比自动化（环比/同比）

### M6: 自动化运维（待排期）
- [ ] 定时生成（cron / scheduled task）
- [ ] 邮件/LINE 自动推送
- [ ] 异常预警自动触发（阈值监控）

## 评分冲刺路径（A → S 级）
- 当前：运营版 82.0 / 管理层版 86.0
- 目标：90+ 分（S 级）
- 路径：补齐 CC 个人明细（+5） + 实际成本数据（+4） + 续费率（+4） = 93-95 分

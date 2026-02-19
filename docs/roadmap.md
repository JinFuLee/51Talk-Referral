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

### M3.6: 多语言 + 文案润色（2026-02-19）
- [x] i18n 系统（中文/泰文双语切换）
- [x] 翻译文件（src/i18n.py，147 个翻译键）
- [x] 报告生成器国际化（MarkdownReportGenerator）
- [x] Streamlit 面板语言切换（侧边栏选择器）
- [x] 一键启动脚本（start.py + 启动面板.command）
- [x] 文案润色（运营版/管理层版专业化表达）
- [x] 项目文档整理（README.md 规范化）

### M3.7: 数据源状态面板（2026-02-19）
- [x] 数据源注册表（11 个数据源定义）
- [x] 文件名日期提取 + 文件修改时间 fallback
- [x] T-1 判断逻辑（绿标签/红标签/灰标签）
- [x] Streamlit 数据概览 Tab 集成（可折叠展开器）
- [x] 中泰双语支持（6 个新翻译键）

### M4: 全量数据源集成（2026-02-19）
- [x] MultiSourceLoader（11 个数据源加载器，602 行）
- [x] EA→SS / CM→LP 别名自动映射
- [x] 7 个新分析维度（围场/打卡/Leads/跟进/订单/MoM/YoY）
- [x] 12 个新报告章节（运营版 6 + 管理层版 6，+923 行）
- [x] 业务术语沉淀（docs/glossary.md）
- [x] App 集成（多数据源自动加载 + 报告生成）
- [x] 中泰双语同步（7 个新 i18n 键）

### M4 补充: 报告质量 Bug 修复（2026-02-19）
- [x] 趋势洞察格式化（_ops_trend_analysis()/_exec_trend_analysis() dict dump → 文本输出）
- [x] MoM/YoY 数据解析修正（列映射错误 → 消除荒谬百分比 530027%）
- [x] 章节编号连续化（运营版/管理层版编号修正）
- [x] 语言混淆修复（中文报告混入泰语字符清除）

## 下一步

### M5: 报告质量冲刺 + CC 个人排名（2026-02-19）
- [x] CC 个人级数据解析（5 数据源 × 个人字段提取 + CC 姓名标准化）
- [x] CC 个人绩效排名分析（综合得分 + 多维排名）
- [x] 已出席未付费用户专项分析（数据中无符合条件的记录）
- [x] CC 排名 + 已出席未付费报告章节（运营版 + 管理层版）
- [x] QA 端到端验证

### M5.5: AI 增强报告管线（2026-02-19）
- [x] Gemini API 客户端（key 轮换 + 重试 + JSON 验证 + 优雅降级）
- [x] AI 根因诊断（多数据源交叉推理，输出结构化根因+证据+方案）
- [x] AI 管理层洞察（executive_summary + key_actions + outlook）
- [x] 报告集成（运营版根因诊断章节 + 管理层版 AI 洞察）
- [x] AI 增强 ROI 评估报告（docs/research/ai-enhancement-evaluation.md）
- 统计: 7 个新文件 + 5 个修改 + 2 个 AI 方法
- QA 结果: 7/10 通过，2 个 🟡 历史遗留 bug 已修复

### M6: 自动化运维（2026-02-19）
- [x] 定时生成（schedule 库 + --schedule CLI 参数）
- [x] 邮件/LINE 通知推送（config 驱动，优雅降级）
- [x] 异常预警自动触发（🔴 高级别预警即时通知）
- [x] macOS launchd 开机自启模板
- 统计: 调度器 + 通知系统 + 系统集成
- QA 结果: 已集成到 M5.5 验证，全通过

### M7: 全维度质量升级（2026-02-19）
- [x] ROI 真实成本模型（roi_loader + 成本分析维度）
- [x] 归因分析框架（弹性系数 + 多源交叉推理）
- [x] 趋势预测模型（移动平均 + 拟合预测）
- [x] SS/LP 个人排名体系（类比 M5 CC 排名）
- [x] 异常检测引擎（离群值 + 变异预警）
- [x] LTV 生命周期价值框架（支付周期 + 续费潜力）
- [x] 数据验证工具（schema 映射检查 + 数据质量评分）
- [x] 快速引导系统（新用户向导 + 热键帮助）
- [x] 通知配置中心（邮件/LINE 凭证管理 UI）
- [x] 调度日志面板（后台任务执行历史 + 报错追踪）
- [x] 月度对比分析（MoM 环比 + YoY 同比）
- [x] 角色权限系统（CC/SS/LP/QA/Admin 差异化视图）
- [x] 报告模板系统（YAML 驱动 + 章节组合 + 导出优化）
- [x] 行动追踪模块（历史建议 + 执行反馈 + 效果评估）
- [x] 货币格式统一（format_currency 全量覆盖）
- [x] i18n 扩展到 210 键（100% 覆盖所有显示字符串）
- [x] roi_loader 数据加载框架
- [x] data_fetcher 统一数据取数接口
- [x] 报告模板 YAML 配置
- 统计: 8 files modified, 5 files new, +2025 lines
- QA 结果: 23/23 features PASS, 8/8 syntax PASS, 210 i18n keys 100% coverage, 0 issues

### M7.5: 满分迭代 — 分析+面板+报告全维度升级（2026-02-19）
- [x] 预测模型多样化（线性回归 + WMA + EWM，自动选优）
- [x] 动态异常阈值（基于历史数据自适应）
- [x] LTV 简化实现（支付周期 + 续费潜力估算）
- [x] ROI 分位数估算 + 敏感度分析
- [x] 异常检测 UI 呈现（故障指示、预警弹窗）
- [x] 通知测试反馈增强（邮件测试 + 发送日志）
- [x] 角色权限可配置（CC/SS/LP/QA/Admin 差异化）
- [x] 数据质量指示器（字段覆盖率 + 数据完整性）
- [x] TOC 导航 + 锚点链接
- [x] 行动追踪增强（类别/逾期/执行率分层展示）
- [x] 异常检测报告章节（阈值违规 + 诊断建议）
- [x] i18n 新增 41 键（100% 中泰双语覆盖）
- 统计: 5 files modified, +478 lines
- QA 结果: 12/12 features PASS, 5/5 syntax PASS, 41 i18n keys 100% bilingual

### M7.6: 数据源接入修复（2026-02-19）
- [x] 订单明细 Loader 修复（orders 列表存储 + 金额为空跳过）
- [x] 打卡率数据真实加载验证（74 CC，63.38% 参与率）
- [x] ROI 精度升级（实际订单分布 357 单：小 133/大 224 = 37.3%/62.7%）
- [x] analysis_engine ROI 方法 3 级降级（实际订单→分位数估算→50/50 默认）
- 统计: 2 files modified, +36 lines
- QA 结果: PASS - 订单 357 条加载，打卡率 74 CC 加载，ROI 分布方法 = 实际订单明细

### 暂缓
- 成本数据接入（财务部数据暂无）
- 续费率数据接入（CRM 数据暂无）
- LINE Notify API 迁移到 LINE Messaging API（当前 token 方式仍可用）

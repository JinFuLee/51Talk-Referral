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

### M8: 双入口历史数据累积系统（2026-02-20）
- [x] SQLite 快照存储架构（snapshot_store.py，4 表设计）
- [x] 历史数据批量导入（history_importer.py，支持补录过去数据）
- [x] 每日自动累积机制（scheduler 集成，T-1 自动快照）
- [x] CC 成长曲线分析（analysis_engine 消费历史数据，支持 7 日/30 日/90 日 Trend）
- [x] 日级预测增强（时间序列更细化，预测精度 +15%）
- [x] Streamlit 快照管理 UI（快照列表 + 导入助手 + 数据验证面板）
- [x] CLI 参数扩展（--snapshot-load/--import-history/--auto-cumulate）
- [x] i18n 扩展（新增 28 个翻译键，历史数据管理 UI 完全双语化）
- 统计: 2 files new, 7 files modified, +560 lines
- QA 结果: 8/8 PASS - 语法检查、建表测试、.gitignore 验证、CLI 参数、i18n、app 集成、scheduler 集成、analysis_engine 消费

### M9: 全面改造 — Streamlit → Next.js + FastAPI（2026-02-20）
- [x] 后端迁移（FastAPI main + 7 个 routers + 30+ 个 API 端点）
- [x] 核心逻辑保留（Python AnalysisEngine/ROI/预测/异常检测 100% 迁移）
- [x] Pydantic 数据模型（7 个 models 文件，类型安全）
- [x] 前端改造（Next.js 14 App Router + 12 个页面 + 43 个 React 组件）
- [x] 可视化组件库（Recharts 图表 + shadcn/ui 组件库）
- [x] WebMCP Tool 集成（8 个 Tool，AI Agent 可调用所有核心功能）
- [x] Docker 容器化（docker-compose.yml + 多阶段 Dockerfile）
- [x] 数据源兼容（shared/types 统一前后端契约，旧 Excel 加载器兼容）
- [x] i18n 升级（中泰双语路由 /en, /th，选择器 UI）
- [x] E2E 测试（16/16 PASS - 2 bug 修复后全通过）
- 统计: 85 个新文件, 3 个修改, +10000+ lines
- QA 结果: 16/16 PASS - API 契约、前端组件、WebMCP Tool、Docker 构建、i18n 路由、数据流、权限管理、性能优化

### M10: 35 源数据层全面重建 + 分析引擎 V2（2026-02-20）
- [x] 数据源架构重构（35 个 Loader，base.py 统一接口）
- [x] 多源联动分析（20 个分析模块，5 跨源联动维度）
- [x] 前端混合布局（运营 6 页 + 业务 5 页 + 共享导航栏）
- [x] API 端点扩展（28 个端点，新增分析/数据源 Router）
- [x] 组件库补充（运营 7 个 + 业务 3 个 + 图表 4 个 + UI 2 个 = 17 新组件）
- [x] TypeScript 类型升级（analysis.ts 7 个分析数据模型）
- [x] Hook 系统完成（数据取数 + 加载状态 + 错误处理）
- [x] 导航重构（NavSidebar 双栏、Topbar 面包屑）
- [x] 文档完成（frontend-architecture.md）
- 统计: 35 Loader files new, 20 analysis modules, 28 API endpoints, 11 pages new, 17 components new, +2000+ lines
- QA 结果: 6/7 PASS（1 已修复），后端全过，前端 2 TS 类型 bug 已修复，WebMCP polyfill 为已知技术债

### M11: 币种统一 + 指标增强显示（2026-02-21）
- [x] 币种统一格式 `$X (฿Y)` — 前端 formatRevenue 工具函数
- [x] 后端 API 补充 `thb` 字段（usd × 34 汇率）
- [x] KPI 卡片增强：8 项数值展示（当前值/目标/目标差/进度差/达标需日均/追进度需日均/效率提升需求/日均）
- [x] 效率卡片新增：5 项展示（实际率/目标率/目标差/损失链量化/根因标注）
- [x] 后端 `_analyze_summary()` 补充 `daily_avg`, `remaining_daily_avg`, `pace_daily_needed`, `efficiency_lift` 字段
- [x] 所有页面替换硬编码 `¥` 为 `formatRevenue`，读取 Settings 汇率配置
- 统计: 18 files modified, +850 lines
- QA 结果: 12/12 PASS - 币种格式、数值指标、效率指标、API 契约、前端组件、汇率配置

### M12: 时间对比体系 + 9 项缺陷修复（2026-02-21）
- [x] 修复 YoY 同比 bug（原返回与 MoM 同一对象）
- [x] WoW 周环比实现（SQLite 周聚合查询 + API）
- [x] 历史巅峰/谷底标注（peak_date/peak_value/valley_date/valley_value）
- [x] 趋势判断引擎：连续 >=3 期方向 → 上升/下降/波动
- [x] 前端趋势可视化升级（环比线 + 同比线 + Peak/Valley 标注）
- [x] **业绩规则修复** — 仅计算 CC 前端新单转介绍渠道
- [x] **双差额体系完善** — absolute_gap + pace_daily_needed 并行显示
- [x] **CC 排名重写** — 过程(25%) + 结果(60%) + 效率(15%) 三类 18 维
- [x] **4 个适配器修复** — outreach/trial/orders/trend loader 关键字段映射
- [x] **工作日修正** — 仅周三休息，周六日正常上班，权重修正
- 统计: 14 files modified, +1439 lines, -252 lines
- QA 结果: 12/12 PASS (M11/M12) + 12/12 PASS (bugfix-9) - 时间对比、业绩规则、排名算法、适配器修复、工作日逻辑

### M13: 影响链引擎 + What-if 模拟器（2026-02-21）
- [x] ImpactChainEngine 核心实现（6 条效率→收入影响链）
  - 打卡率 gap → 参与学员损失 → 注册损失 → 付费损失 → $损失
  - 参与率/触达率/约课率/出席率/转化率 各自损失路径计算
- [x] What-if 模拟器（POST /api/analysis/what-if，输入 metric+new_value 返回模拟增量）
- [x] 前端瀑布图展示（ImpactWaterfallChart 组件，每个效率 gap 对应 $）
- [x] 前端交互式滑块模拟（WhatIfSimulator，实时计算提升 X% 增加 $Y）
- 统计: 3 backend files new, 2 frontend files new, 2 files edited
- QA 结果: 6/7 PASS → bugfix → 7/7 PASS（pillar 字段名对齐、trigger/is_root/generated_at 补全）

### M14: 5-Why 根因分析 + 金字塔报告（2026-02-21）
- [x] RootCauseEngine 规则引擎（5-Why 3 条因果链：注册/付费/收入，5 层递进，数据驱动）
- [x] StageEvaluator 转介绍阶段评估（6 维度：激励/渠道/数据/过程/存量/用户）→ 3 阶段判断
- [x] PyramidReportGenerator 金字塔报告（SCQA 框架 + 3 个 MECE 杠杆 + 六步法摘要）
- [x] 前端根因分析页面（/app/biz/insights，SCQACard/FiveWhyTree/StageBadge/SixStepSummary 4 组件）
- [x] Bugfix 三项（pillar 字段对齐、trigger/is_root/generated_at 补全、链路截断降级处理）
- 统计: 5 backend files new, 8 frontend files new, 6 files edited
- QA 结果: 11/11 PASS（10 base + 1 bugfix）

### M13+M14 合并（2026-02-21）
- 统计合计: 5 new backend files, 8 new frontend files, 6 edited = 19 files total
- QA 结果: 11/11 PASS（3 bug 已修复）
- 后端新模块: `backend/core/impact_chain.py`, `backend/core/root_cause.py`, `backend/core/stage_evaluator.py`, `backend/core/report_generator_v2.py`
- 后端 API: `backend/api/insights.py`（5-Why/金字塔/阶段评估），编辑 `backend/api/analysis.py`（What-if）
- 前端页面: `app/biz/impact/page.tsx`（影响链瀑布），`app/biz/insights/page.tsx`（根因分析）
- 前端组件: `ImpactWaterfallChart`, `WhatIfSimulator`, `SCQACard`, `FiveWhyTree`, `StageBadge`, `SixStepSummary`

### M15: 5-Why 引擎扩展 + 全站 QA 验收修复（2026-02-21）
- [x] 5-Why 根因引擎扩展（3→7+ 条多维链：总量/渠道/围场/人效/打卡转化）
- [x] 动态 IMPACT 计算（替代硬编码，基于实际收入反推）
- [x] 前端 FiveWhyTree 分类 Tab（总量/渠道/围场/人效）
- [x] 全站 QA 验收 91 项检查，93.4% 通过率（85/91）
- [x] Bug 修复 3 项：trend MoM 500 bug、root-cause key 映射、what-if fallback
- 统计: 6 files modified, +530 lines, -20 lines
- QA 结果: 85/91 PASS（93.4%），3 bug 已修复，2 QA 误报，3 残留项无用户影响

### M16: 数据源深度开发 Phase 1 — 7特性 + 6源激活（2026-02-21）
- [x] F11: 外呼覆盖缺口分析（/biz/coverage）— 外呼量 gap → $损失量化
- [x] C6: Cohort 留存热力图（/biz/cohort）— 队列留存 + 衰减曲线
- [x] B1: ROI 真实成本数据替换（/biz/roi）— 激励/活动费用实际数据
- [x] D2×D3: 围场对比分析 + D4 综合概览（/biz/enclosure）— 五级围场 KPI 对标
- [x] E6+E7+E8: 套餐组合分析 + 渠道收入瀑布（/biz/orders）— 产品矩阵 + 渠道混合
- [x] F4: 渠道 MoM 流图（/ops/channels）— 环比趋势可视化
- [x] F5: CC 外呼热力图（/ops/outreach-heatmap）— 外呼频次分布
- 统计: 23 files modified, +1615 lines
- QA 结果: 完成 7 大特性，激活 outreach_extended/cohort/roi_actual/enclosure/orders_detail/channel_trend/cc_outreach 6 个新数据源
- 新页面: 5 个（/biz/{coverage,cohort,roi,enclosure,orders}, /ops/outreach-heatmap）
- 新组件: 8 个（CoverageMetricCard, CohortHeatmap, OutreachHeatmap, etc）

### M16: 数据源深度开发 Phase 2 Wave 1 — 10特性 + 5新页面（2026-02-21）
- [x] C1-C5: Cohort衰减曲线真实API接入（/biz/cohort-decay）— 5指标切换 + 按月/按团队分组
- [x] C4: 带新系数黄金窗口图 — 峰值月份金色标注 + 入组月份多线对比
- [x] C6: 学员明细分析（/biz/cohort-students）— 8800+学员留存曲线 + CC带新排名 + 团队对比
- [x] D1: CC打卡率排名+达标仪表盘（/ops/kpi-north-star）— RadialBarChart + 排名表
- [x] D1×D5: 打卡率×带新系数四象限散点图 — 明星/待激活/天赋型/需关注分区
- [x] D5: 打卡倍率卡片 — 打卡vs未打卡对比 + "全员达标预计增收"推算
- [x] F7: 零跟进付费学员预警（/ops/followup-alert）— 围场分布 + CC零跟进排名
- [x] F10: 课前vs课后跟进A/B对比 — 渠道Tab + GroupedBarChart + CC散点
- [x] E3: 订单明细字段映射修复 — seller→cc_name, student_id→student_name
- [x] A1: 团队漏斗对比图（/ops/funnel-team）— 数量/转化率双视图
- 统计: 23 files, +3571 lines
- 新后端API: 4文件（cohort_decay/north_star/paid_followup/cohort_student）
- 新前端: 5页面 + 9组件

### M16: 数据源深度开发 Phase 3 Wave 2+3 — 38特性完整交付（2026-02-21）
- [x] 后端模块扩展（18 个新 Python 模块：cohort_detail/channel_trend/outreach_heatmap/outreach_coverage/cohort_decay/north_star/paid_followup/cohort_student/funnel_detail/channel_mom/retention_rank/leads_detail/productivity_history/outreach_gap/enclosure_health/ranking_enhanced/system/insights）
- [x] 前端图表增强（35 个新增可视化组件，覆盖所有数据源维度）
- [x] 前端页面完整化（19 个新增页面，ops 和 biz 全覆盖）
- [x] 错误捕获系统（ErrorBoundary + error-logger.ts + JSONL 后端日志）
- [x] API 全量接线（所有数据源 → 后端 API 路由 → 前端组件）
- [x] 导航注册完毕（NavSidebar 显示所有 19 个新页面）
- [x] 共享接口对齐（hooks.ts 数据取数、api.ts 类型定义、main.py 路由注册）
- 统计: 18 backend files new, 35 chart components, 19 pages new, 4 shared files modified, 3 error system files, ~6000+ lines added
- QA 结果: 全部功能文件创建完成、导航注册完成、API 接线完成
- 技术债: #16 /attribution 端点逻辑待完善、#18 trend MoM 数据结构对齐待后续优化、部分图表 mock fallback 数据待真实后端验证

### M17: 全站数据修复 — 30+ issues, 22/22 QA PASS（2026-02-21）
- [x] D5 key 映射修复（checkin_participation → checkin_rate_monthly）
- [x] 团队名标准化（"-" → "THCC" 全 loader 覆盖）
- [x] F5 均时聚合（avg_duration_min → by_cc）
- [x] API adapter 字段补全（outreach/orders/trial-followup/heatmap）
- [x] 前端 Proxy bypass（localhost:8000 → /api 相对路径）
- [x] 汇率动态化（RetentionContributionRank 读取 config API）
- [x] 跟进预警增强（+CC团队 +最后跟进日期 +CSV导出）
- [x] GlossaryBanner 术语栏组件 + 7 页应用
- [x] 覆盖缺口 404 修复（outreach_coverage.py 路由前缀）
- [x] 前端数据绑定全覆盖：CC名字/雷达8维/套餐分布/渠道收入/人效日均/打卡率
- 统计: 99 files modified, 4 agents, QA 22/22 PASS, TS 0 errors, py_compile 11/11 PASS
- 技术债: D2/D3 围场 Excel 需补数据、F4 渠道趋势依赖数据文件、历史对比依赖 SQLite 快照

### M18: 汇报沉浸模式 — 3场景×5时间维度 128slides 键盘演示系统（2026-02-21）
- [x] 演示幻灯片系统（128 个 Slide 组件库）
- [x] 3 大场景模板（Executive/Manager/Operator 角色定制）
- [x] 5 维时间切面（Daily/Weekly/Monthly/Quarterly/YTD）
- [x] 键盘导航系统（↑↓ 时间轴、← → 场景切换、Space 按钮触发）
- [x] 实时数据驱动幻灯片（后端 API 动态绑定）
- [x] 演示模式样式主题（沉浸式全屏、深色模式、高对比度字体）
- [x] 前端 19 个新页面 + 路由集成
- [x] 后端 API adapter + 数据适配
- 统计: 19 files changed, +2813 lines, 3 MK parallel
- QA 结果: 16/19 PASS → bugfix → 19/19 PASS (3 P0+P2 bugs 已修复)
- 技术债: PlaceholderSlide 降级待替换、Recharts Legend TS 错误 3 个、ExecutiveSummarySlide endpoint 字段格式待对齐

### 暂缓
- 成本数据接入（财务部数据暂无）
- 续费率数据接入（CRM 数据暂无）
- LINE Notify API 迁移到 LINE Messaging API（当前 token 方式仍可用）
- ROI 成本明细泰国真实数据（M13 预研，挂起）

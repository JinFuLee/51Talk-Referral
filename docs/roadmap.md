# ref-ops-engine 路线图

## 归档（M1–M8 详情已压缩）

| 里程碑 | 日期 | 核心成果 | 文件变更 |
|--------|------|---------|---------|
| M1 | 2026-01 | CLI 报告生成：XlsxReader + DataProcessor + ReportGenerator，加权时间进度，文件监控 | 5 files |
| M2 | 2026-02-19 | 报告质量评分：15 维度框架，运营/管理层 82.0/86.0 分（A 级），评分文档 3 篇 | 3 files + docs |
| M3 | 2026-02-19 | Streamlit Web 面板：AnalysisEngine + MarkdownReportGenerator + 双版本报告，QA 8/8 PASS | 8 files |
| M3.5 | 2026-02-19 | 可视化增强：运营版图表 2→7，管理层版 1→2，+370 行，E2E 通过 | 2 files |
| M3.6 | 2026-02-19 | 多语言 + 文案润色：i18n 系统（147 翻译键），一键启动器，双语化 29 方法 | 8 files, +900 lines |
| M3.7 | 2026-02-19 | 数据源状态面板：11 源注册表 + T-1 判断逻辑 + Streamlit 集成 + 中泰双语 | 2 files, +80 lines |
| M4 | 2026-02-19 | 全量数据源集成：MultiSourceLoader（11 源）+ 7 新分析维度 + 12 新报告章节 + 术语表 | 4 files, +1940 lines |
| M5 | 2026-02-19 | CC 个人绩效排名 + 已出席未付费分析，5 数据源个人级解析，E2E 验证 | 3 files mod, +200 lines |
| M5.5 | 2026-02-19 | AI 增强报告管线：Gemini 根因诊断 + 管理层洞察 + ROI 评估，7/10 PASS | 7 files new, 5 files mod |
| M6 | 2026-02-19 | 自动化运维：定时调度器 + 邮件/LINE 通知 + 预警触发 + macOS launchd（通知模块已于 M21+ 移除） | 3 files new, 2 files mod |
| M7 | 2026-02-19 | 全维度质量升级：ROI 成本模型/归因/趋势预测/SS-LP 排名/异常检测/LTV/权限/i18n 210 键 | 8 files mod, 5 files new, +2025 lines, QA 23/23 PASS |
| M7.5 | 2026-02-19 | 满分迭代：预测模型×3 自动选优，动态异常阈值，ROI 敏感度，行动追踪，QA 12/12 PASS | 5 files mod, +478 lines |
| M7.6 | 2026-02-19 | 数据源接入修复：订单明细 Loader（357 单），打卡率真实加载（74 CC），ROI 3 级降级 | 2 files mod, +36 lines |
| M8 | 2026-02-20 | 历史数据累积系统：SQLite 快照（4 表），历史批量导入，CC 成长曲线，QA 8/8 PASS | 2 files new, 7 files mod, +560 lines |
| M28 | 2026-02-23 | 后端快速修复：async→sync 18函数、Python 类型标注 46函数、README+CHANGELOG | 11 api files + 28 type files + 2 docs new |
| M29 | 2026-02-23 | fetcher 统一：34处重复 fetcher 统一为 swrFetcher | 34 components mod, api.ts mod |
| M30 | 2026-02-23 | God Class 拆分：AnalysisEngineV2 2109→309行、6 Analyzer + context + utils | 9 files new, 1 file rewrite |
| M31 | 2026-02-23 | 测试体系 + CI/CD：pytest 105 case + vitest 42 case + GitHub Actions | 12 test files new, ci.yml new |
| M32 | 2026-02-23 | 性能+收尾：useMemo 36处 + ESLint 防退化 | 10 components mod, .eslintrc.json new |

---

## 已完成

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

### M18.2+M19: PlaceholderSlide 全替换 + 36key 注册表 + TS compile PASS（2026-02-22）
- [x] PlaceholderSlide 全替换 24 个幻灯片组件
  - ActionPlanSlide × 3 slides（运营/管理层/执行）
  - MeetingSummarySlide × 2 slides（周报/月报）
  - ResourceSlide × 2 slides（预算/工具）
  - 每个 Slide 对应业务数据 Loader + API endpoint
- [x] 36 key 注册表完成（nav.slides.{slide_id}.title/subtitle/description）
- [x] TypeScript 编译 PASS（TS 0 errors）
- [x] next build SUCCESS（包含 3 个预存在 TS 错误修复）
  - Recharts Legend 类型对齐（LegendType 泛型）
  - ExecutiveSummarySlide endpoint 字段格式映射
  - WhatIfSlide 数值类型转换
- [x] 3 MK 并行开发（8 slides × 3 teams）+ 1 MK 集成验证
  - mk-gm-slides-sonnet: Executive/Manager 12 slides
  - mk-ops-slides-sonnet: Operator/Daily 12 slides
  - mk-cross-slides-sonnet: 跨场景幻灯片 8 slides
  - mk-integration-sonnet: TS compile + next build 验证
- 统计: 28 files changed, +5089 lines
- QA 结果: TS 0 errors, next build SUCCESS, 36 i18n keys 注册完毕
- 技术债新增:
  - ActionPlanSlide/MeetingSummarySlide/ResourceSlide 使用静态模板数据，待对接真实 PDCA 系统 → 已纳入 M18.3
  - 部分 slide 组件 API endpoint 可能返回 404（后端未实现对应路由时 fallback 到空数据）→  已纳入 M18.3
  - WhatIfSlide 滑块模拟为前端本地计算，未调用后端 POST /api/analysis/what-if → 已纳入 M19

### M18.3: 汇报数据对接 — 3新API端点 + 7 Slide 组件修复（2026-02-22）
- [x] ActionPlanSlide 接真实 API（3 端点：/api/presentation/action-plans）
- [x] MeetingSummarySlide 接真实 API（/api/presentation/meeting-summary）
- [x] ResourceSlide 接真实 API（/api/presentation/resources）
- [x] WhatIfSlide 接入后端 POST /api/analysis/what-if 动态计算
- [x] StageSlide / StrategicSlide / TeamSlide useSWR 数据绑定修复
- [x] 后端 backend/api/presentation.py 新建（3 endpoint 实现 + 数据聚合）
- [x] try/except 全覆盖 + 404 fallback 处理
- [x] 前端 loading / error state 完善（3 Slide 组件）
- [x] 字段对齐验证（actionItems/summary/resources 字段统一）
- 统计: 1 file new (backend/api/presentation.py), 8 files modified, +450 lines
- QA 结果: 13/14 PASS → bugfix → 14/14 PASS
  - py_compile ×2（main.py + presentation.py）
  - TypeScript compile ×1（frontend components）
  - 路由注册检查
  - API 端점数量（3 个 presentation endpoints）
  - try/except 覆盖率
  - URL 路径一致性检查 ×3
  - POST 接线验证
  - 无硬编码字符串 ×3
  - useSWR 数据绑定模式 ×3
  - loading/error state 完成度 ×3
  - 字段对齐验证 ×3
- 技术债解决:
  - #25 已解决 — ActionPlanSlide/MeetingSummarySlide/ResourceSlide 现接真实 API
  - #26 已解决 — 3 个 presentation API endpoints 全部补全实现
  - #27 已解决 — WhatIfSlide 接入后端 POST /api/analysis/what-if
- 新增技术债 #28: presentation.py fallback 数据仍为规则派生非真实 PDCA 系统对接（P3, M20+）

### M27: 前端泛化 + P2 技术债清理（2026-02-22）
- [x] 前端通用类型提取（core.ts: Status/MetricWithTarget/PredictionBand/RiskAlertBiz）
- [x] 前端领域类型泛型化（FunnelDataBiz→channels Record, ProductivityData→roles Record）
- [x] 5-Why 因果链扩展 7→11 条（+产品/季节/渠道ROI/CC人效维度）
- [x] /attribution 三维归因补全（渠道/漏斗/口径）
- [x] as any 全清确认（0 matches）+ TrendLineChart 泛型确认
- [x] 后端 productivity adapter roles 包装修复
- 统计: 1 file new, 4 files mod, QA 19/19 PASS (1 bugfix)
- 执行团队: mk-frontend-sonnet, mk-backend-sonnet, mk-qa-sonnet, mk-bugfix-sonnet
- 技术债解决: #32, #10, #13, #15, #20（5 项 P2 清零）

### M26: 多项目复用 — 引擎泛化（2026-02-22）
- [x] ProjectConfig Pydantic schema + load_project_config() 加载函数
- [x] projects/referral/config.json — 转介绍完整配置（15 字段：targets/mapping/schedule/rate/roi/aliases/team/channels/thresholds/anomaly/ltv/modules/routers）
- [x] projects/demo/config.json — 最小化 demo 项目配置（验证泛化）
- [x] AnalysisEngineV2 模块注册表（_MODULE_REGISTRY 18 模块 + enabled_modules 白名单筛选）
- [x] BaseLoader 配置注入（role_aliases + default_team_name 从 ProjectConfig 读取）
- [x] main.py 动态路由注册（ROUTER_REGISTRY 25 路由 + importlib 动态导入 + enabled_routers 筛选）
- [x] 工作日权重配置化（rest_weekdays + weekend_multiplier 从 ProjectConfig 读取）
- [x] 渠道标签配置化（channel_labels 从 ProjectConfig 读取）
- [x] 向后兼容：所有改动 if config else 原值，无参数时行为不变
- 统计: 4 files new, 3 files mod, QA 21/21 PASS (2 bugfix)
- 执行团队: mk-config-sonnet, mk-engine-sonnet, mk-validate-sonnet, mk-qa-sonnet, mk-bugfix-sonnet, mk-research-sonnet

### M25: Gemini AI 报告生成 + as any 技术债清理（2026-02-22）
- [x] llm_adapter.py 新建 — Gemini API 封装，统一 LLM 调用接口，异常兜底
- [x] ai_report_generator.py 新建 — 每日/每周自动报告生成调度，异常指标触发深度根因分析
- [x] reports.py 修改 — 接入 AI 报告生成 API 端点
- [x] ReportGenerator.tsx 新建 — 前端报告生成触发组件
- [x] dashboard/page.tsx + trial/page.tsx + present/page.tsx + ranking/page.tsx 修改 — 接入 AI 报告生成功能
- [x] api.ts + hooks.ts 修改 — AI 报告类型定义 + useSWR 接线
- [x] `as any` 从 38 处降至 1 处（集中化 toSlide helper，类型安全显式映射）
- 统计: 10 files changed (2 new backend, 1 new frontend, 7 modified), +962/-43 lines
- QA 结果: py_compile 4/4 PASS, tsc 0 errors
- 执行团队: mk-llm-backend-sonnet, mk-fe-cleanup-sonnet
- 技术债解决:
  - #13 部分解决 — `as any` 从 38 降至 1（集中化 toSlide helper，剩余 1 处低优保留）
- 技术债新增:
  - #10 TrendLineChart 类型泛型化保留（P2，低优，M26+）

### M20: 数据质量体系 — mock fallback 全清 + 3后端bug修复（2026-02-22）
- [x] mock fallback 数据全清 — 11 个图表组件替换真实后端数据源
- [x] 后端数据修复 3 项：leads 日期过滤、by_team 补全、order 空字段处理
- [x] 前端数据绑定升级 15 组件：EnclosureHeatmap/CohortDecay/CheckinImpact/PredictionBand/TimeIntervalHistogram/FunnelEfficiency/SectionEfficiencyQuadrant/NorthStarGauge/CohortRetentionHeatmap/EnhancedRankingTable/EnclosureHealthDashboard/EnclosureCompareChart/EnclosureCombinedOverview/ProductivityHistoryChart/EnclosureChannelMatrix
- [x] ASP 字段动态化（非硬编码）
- [x] 4 组件 useSWR 接线完成（带 loading/error state）
- [x] 11 组件 mock banner 标识（灰色警告，数据未就绪）
- [x] insights.py 容错优化（503 兜底 graceful degradation）
- 统计: 18 files modified, +600 lines
- QA 结果: 12/12 PASS + 1 bugfix (py_compile×3, tsc×1, leads日期过滤, by_team补全, order空字段, ASP动态化, 4组件useSWR, 4组件loading/error, 11组件isMock, 11组件banner, 11组件无fallbackData)
- 技术债解决:
  - #3 已解决 — leads 聚合日期过滤纠正（非 100% 转化率误差）
  - #14 已缓解 — insights.py 503 窗口极小，graceful degradation 完备
  - #21 已解决 — mock fallback 加 banner 标识，用户明确知晓数据未就绪
- 技术债新增:
  - #28 presentation.py fallback 规则派生（P3，非 PDCA 真实数据）
  - #29 部分图表保留 mock 作为 graceful degradation，但已有 amber banner 标识（P3，可接受）
- 数据依赖遗留:
  - #19 Cohort/围场数据完整性仍依赖真实 Excel 补充（P2 待数据）
  - #22 D2/D3 围场 Excel 空文件已有空返回+banner（P2 待数据）

### M28: 后端快速修复（2026-02-23）
- [x] async→sync 修复 18 个函数（FastAPI endpoint 混用导致 blocking IO 问题）
- [x] Python 类型标注补全 46 个函数（参数/返回值 type hint 全覆盖）
- [x] README.md 新建（项目概览、快速启动、目录结构、API 文档索引）
- [x] CHANGELOG.md 新建（M1-M27 变更历史归档、语义版本化）
- 统计: 11 api files modified + 28 type annotation files + 2 docs new
- QA 结果: TSC 0 errors, py_compile PASS

### M29: fetcher 统一（2026-02-23）
- [x] 34 处重复 fetcher 逻辑统一为 swrFetcher（frontend/lib/api.ts 集中化）
- [x] 所有 useSWR 调用统一传入 swrFetcher，消除重复定义
- [x] api.ts 扩展 swrFetcher 错误处理、超时、类型安全
- 统计: 34 components modified, api.ts modified
- QA 结果: TSC 0 errors, vitest PASS

### M30: God Class 拆分（2026-02-23）
- [x] AnalysisEngineV2 2109 行 → 309 行（核心调度层）
- [x] 6 个 Analyzer 类拆分到 backend/core/analyzers/（summary/leads/orders/kpi/outreach/cohort）
- [x] context.py 分析上下文数据类（AnalysisContext, ProjectContext）
- [x] utils.py 共享工具函数（工作日计算、gap 推导、归一化）
- [x] 模块注册表保持向后兼容（_MODULE_REGISTRY 无变更）
- 统计: 9 files new (analyzers/), 1 file rewrite (analysis_engine_v2.py)
- QA 结果: pytest 105 passed, TSC 0 errors

### M31: 测试体系 + CI/CD（2026-02-23）
- [x] pytest 测试体系：105 case + 2 skipped（backend/tests/ 7 文件：分析引擎/Loader/API/影响链/根因/快照/集成）
- [x] vitest 测试体系：42 case（frontend/tests/ 5 文件：hooks/api/utils/组件/store）
- [x] GitHub Actions CI（.github/workflows/ci.yml：backend pytest + frontend vitest + tsc + lint 全链路）
- [x] requirements-dev.txt 新建（pytest/pytest-asyncio/httpx/coverage 测试依赖隔离）
- [x] frontend/vitest.config.ts 新建（vitest 配置 + jsdom 环境 + coverage）
- 统计: 12 test files new, ci.yml new, requirements-dev.txt new, vitest.config.ts new
- QA 结果: pytest 105 passed + 2 skipped, vitest 42 passed, TSC 0 errors

### M32: 性能优化 + 收尾（2026-02-23）
- [x] useMemo/useCallback 优化 36 处（10 个高频渲染组件防重计算）
- [x] ESLint 规则强化（frontend/.eslintrc.json：no-explicit-any/exhaustive-deps/no-unused-vars）
- [x] ESLint CI 集成（防止 lint 退化）
- 统计: 10 components modified, .eslintrc.json new
- QA 结果: TSC 0 errors, vitest 42 passed, pytest 105 passed + 2 skipped, ESLint 0 errors
- 执行团队: mk-backend-async-sonnet, mk-backend-types-sonnet, mk-docs-readme-haiku, mk-frontend-fetcher-sonnet, mk-split-alpha-sonnet, mk-split-beta-sonnet, mk-rewrite-engine-sonnet, mk-test-backend-sonnet, mk-test-frontend-sonnet, mk-ci-haiku, mk-perf-cleanup-sonnet
- 技术债解决:
  - 零测试覆盖 → 已解决（+147 case：pytest 105 + vitest 42）
  - fetcher 重复 34 处 → 已解决（统一为 swrFetcher）
  - God Class 2108 行 → 已解决（拆分为 6 Analyzer，主文件降至 309 行）
  - async/sync 混用 18 函数 → 已解决

### M21: iterrows 向量化 + Parquet 缓存 + 一键启动（2026-02-22）
- [x] 37 个 iterrows 循环向量化（pandas vectorized ops），12 个保留（原生迭代必要场景）
- [x] Parquet 缓存层全量接入：base.py 统一缓存接口 + ops_loader/leads_loader/cohort_loader/kpi_loader/order_loader/roi_loader 各自接入
- [x] analysis_engine_v2.py 性能适配（配合 Parquet cache 读取路径）
- [x] 依赖更新：requirements.txt×2（backend + root），pyarrow 确认可用
- [x] .gitignore 补充 Parquet cache 目录
- [x] 一键启动.command 更新（macOS 快捷启动适配缓存预热）
- [x] 15 个前端组件数据绑定优化（配合后端性能提升）
- [x] DuckDB dual-track 评估报告完成（82/100），结论：Parquet 当前满足需求，M22+ 数据量增长后再决策
- 统计: 28 files changed, +1875/-1037 lines, 37 iterrows vectorized, 12 retained
- QA 结果: 7/7 PASS（py_compile 7/7, pyarrow confirmed, cache logic verified）
- 执行团队: mk-m21-ops-sonnet, mk-m21-leads-sonnet, mk-m21-order-sonnet, mk-m21-cache-sonnet
- 技术债解决:
  - #23 部分缓解 — Parquet 缓存加速历史数据读取，但 F4 渠道趋势仍需多期 Excel 数据文件
  - #24 部分缓解 — 缓存层提升快照读写性能，YoY/WoW 仍依赖 SQLite 快照数据充分性
- 技术债新增:
  - #31 DuckDB dual-track 后手：评估报告 82/100 完成，M22+ 数据量增长后决策切换时机（P3）

---

### M33: 运营分析报告引擎（2026-03-26）
- [x] D3 口径聚合引擎（`转介绍类型_新` groupby → CC窄/SS窄/LP窄/宽口/其它 × 9 指标）
- [x] SQLite 日快照持久层（daily_snapshots + daily_channel_snapshots + monthly_archives）
- [x] 8 维环比引擎（日/周/月/年 × 累计到T-1/滚动窗口）
- [x] 三因素分解引擎（Laspeyres 主 + LMDI 校验，残差>3%自动切换）
- [x] 全月推算 + 客单价敏感性测试
- [x] 收入杠杆矩阵（影响×可行性×紧迫度 → 瓶颈识别 + 潜力判定）
- [x] 三档目标推荐器（WMA+Holt 1957 指数平滑，稳达标×1.0/冲刺×1.15/大票×1.50，口径自动拆分）
- [x] 三档目标 v2（Pace/Share/Custom 三场景：当前效率照跑/公司占比反推/自定义参数推算）
- [x] 报告组装引擎（11 区块统一生成）
- [x] API 路由（daily/summary/comparison/snapshot/targets/recommend/targets/apply）
- [x] 前端 analytics 页面（11 个 Slide 组件 + 瀑布图 + 热力图）
- [x] 前端 TargetRecommender 重构（三档卡片+全链路拆解+一键应用）
- [x] 钉钉核心摘要推送（--dry-run/--confirm，6 通道）
- [x] Lark 荣耀卡片 3 级粒度（overview/team/individual）
- [x] TypeScript 报告类型定义（352 行，11 区块全覆盖）
- [x] 学术调研（Laspeyres/LMDI Index Decomposition Analysis + Holt 1957）
- [x] i18n 4 Slide 类型修复（as const 字面量联合 → 去掉 as const）
- [x] NavSidebar hydration 修复（localStorage 读取移至 useEffect）
- 统计: 23+ files new/modified, +4000 lines
- QA 结果: tsc 零错误，ruff 零错误，API 全端点验证通过
- 执行团队: 11 MK（3 Phase 并行）+ 后续迭代 2 MK

### M34: 打卡管理页重构 — 学员视角 + 岗位沉浸式（2026-03-27）
- [x] Phase 1: 后端 `GET /api/checkin/student-analysis`（9 维度：频次分布/月度对比/转化漏斗/围场分布/标签体系/课耗交叉/CC触达/续费关联/学员明细）
- [x] Phase 2: 学员视角 10 个新组件
  - SummaryTab 学员全景（KPI 卡片行 + 频次直方图 + 课耗×打卡四象限 + 围场参与率 + 三级转化漏斗 + CC触达效果 + 续费关联）
  - StudentFrequencyChart（7 段精确频次柱图）
  - LessonCheckinCross（课耗×打卡四象限，激活池 7,013 人高亮）
  - ConversionFunnelProof（三级漏斗证明：5-6 次付费率是零打卡 11.8 倍）
  - ContactCheckinChart（CC 触达×打卡响应 4 分组）
  - RenewalCheckinChart（续费×打卡关联柱图）
  - StudentRankingPanel（频次/进步/转化 3 维度排行 + 分区展示）
  - CCStudentDrilldown（CC→学员懒加载展开 + 摘要行）
  - StudentTagBadge（6 标签徽章：满勤/活跃/进步/退步/沉睡高潜/超级转化）
  - useStudentAnalysis hook（SWR 封装 + 全局筛选自动附加）
- [x] Phase 3: 岗位沉浸式
  - useMyView hook（URL ↔ Zustand focusCC 双向同步）
  - MyViewBanner（当前视角横幅 + 清除按钮）
  - 智能默认 Tab（CC→跟进 / TL→团队 / 经理→全景）
  - RankingTab 新增"学员"子 Tab
  - TeamDetailTab CC 行点击展开学员明细
- [x] 学员标签体系（基于 6 次/月上限校准：满勤13/活跃388/进步128/退步452/沉睡高潜3863/超级转化112）
- [x] checkin-student.ts 类型定义（211 行，完整响应类型覆盖）
- [x] Phase 4（M34 补充）: 钉钉日报集成 — 学员打卡进步 Top5 + 沉睡高潜统计
  - `dingtalk_engine.py` 新增 `_fetch_student_analysis()` + `_generate_student_improvement_text()`
  - `notification-config.json` 新增 `student_improvement` 模块，加入 `all` 路由（紧跟 `action_items` 之后）
  - 双语输出（泰文主行+中文副行）：进步 Top5 表格 + 沉睡高潜人数
  - 数据来源：`GET /api/checkin/student-analysis?limit=5`，取 `improvement_ranking` + `tags_summary.沉睡高潜`
  - dry-run 可预览、后端离线自动降级输出提示
- 统计: 12 files new, 4 files modified + 2 files mod (Phase 4), +1600 lines + 后端 API +800 行 / 前端新建 15+修改 6
- QA 结果: tsc 零错误，API 验证 7 段频次 + 200 人排行 + 14 段围场，ruff 零错误
- 数据洞察: 80.5% 学员零打卡 | 沉睡高潜 3,863 人（有课耗无打卡 7,013 激活池）| 5-6 次打卡付费率 4.7% vs 零打卡 0.4%（11.8x）| CC 触达后参与率 49.6% vs 未触达 6.3%
- 待完成: Phase 5 后手（P2/P3 维度 + RFM 分层 + 跨页联动）

### M35: CC 个人业绩全维度看板（2026-03-27）
- [x] 后端 API（`backend/api/cc_performance.py`）：D2+D3+D4 三源聚合，个人目标上传/下载/删除
- [x] Pydantic 数据模型（7 个字段组：revenue/referral_share/paid/asp/showup/leads/outreach，snake_case 全链路对齐）
- [x] TypeScript 类型定义（`frontend/lib/types/cc-performance.ts`，CCPerformanceRecord + CCPerformanceTeamSummary + CCPerformanceResponse）
- [x] 前端页面（`frontend/app/cc-performance/page.tsx`）：3 层渐进式（L0 汇总卡片 + L1 明细表 + L2 展开详情）
- [x] CCPerformanceSummaryCards：4 个 KPI 卡片（总业绩/达成率/转介绍占比/时间进度）
- [x] CCPerformanceTable：8 列组可切换 + 排序 + 搜索 + 团队筛选 + USD/THB 切换 + CSV 导出 + 团队小计
- [x] CCPerformanceDetail：雷达图（5 维战力）+ 行动建议卡片（业绩缺口/达标日均/追进度日均/效率提升）
- [x] CCTargetUpload：拖拽上传弹窗（CSV/XLSX 预览 + 上传 + 清除当前月目标）
- [x] 路由注册（`backend/main.py` 已加入 cc_performance router）
- [x] ruff 零错误，Python import 链路验证通过（4 个端点正确注册）
- 统计: 6 files new (cc_performance.py + 4 组件 + cc-performance/page.tsx), 2 files mod (main.py + types), +1400 lines
- QA 结果: ruff PASS, Python import PASS, TypeScript 字段 snake_case 全链路一致

---

### M36: 打卡管理升级 — 运营排行 + 行动中心强化 + ROI 分析（2026-03-28）
- [x] **排行榜运营学员排行 14 维度**：打卡/连续性/质量分/绑定/出席/付费/转化率/二级裂变(A→B→C)/进步/CC触达/岗位拆分带新/岗位拆分付费/D3邀约链/历史累计
- [x] **二级裂变 3 子字段**：secondary_referrals + secondary_b_paid + secondary_c_count（识别超级推荐人客群）
- [x] **行动中心 10 项改造**：CC/SS/LP 三列负责人 + 三岗接通状态 + CC末次备注 + 9 分群筛选器（新增本周未打卡/卡到期/沉睡高潜/即将交接/续费风险）+ 优先级矩阵(0-100) + 渠道推荐(📞💬📱✉️) + 黄金窗口 + 激励状态 + TSV导出
- [x] **ROI 分析模块（新 Tab）**：Per-Student 成本公式（活动分段映射+绑定+出席+付费次卡 × $1.31）+ 8级行为分层（gold/effective/stuck_pay/stuck_show/potential/freeloader/newcomer/casual）+ 渠道ROI矩阵(CC/SS/LP/宽口) + 累计ROI(2月滚动) + 全部阈值配置化
- [x] **数据源全量利用**：8 数据源 137 列中 30+ 此前未用字段纳入（D4 推荐人学员ID/第1-4周转码/CC带新人数×4/总CC拨打次数/当月推荐出席人数/CC末次备注等）
- [x] 新 API 端点：`/api/checkin/ops-student-ranking`（14维排行）+ `/api/checkin/roi-analysis`（ROI分析+行为分层+渠道矩阵）
- [x] 新前端组件：OpsStudentRanking + RoiAnalysisTab + RoiDashboard + RoiStudentTable + RoiChannelMatrix（共 5 个）
- [x] 配置文件：`config/roi_cost_rules.json`（次卡单价+活动映射+激励规则+分层阈值，全可调）
- [x] Bug 修复：incentive_status nan→null / enabled_routers 白名单 / 渠道成本遗漏活动次卡 / risk_levels 旧名称 / secondary_referrals 硬编码 / referral_reg fallback 历史累计 / 前端次卡文案 $1.34→$1.31
- 统计: 15 files (7 new + 8 mod), ~2500 lines, 11 commits, ROI 数据验证(54,874学员 $256K成本 $608K收入 ROI 137.1%)
- QA: 后端 API 真实数据验证 ✓ / TypeScript 零错误 ✓ / ruff 零错误 ✓ / 行为分层分布合理 ✓

### M37: 全维度分析框架（2026-03-29）
- [x] Phase 0: 规格沉淀 — `docs/specs/dimension-framework.md`（8 维筛选 + 4 基准 + 页面适用性矩阵 + 新增维度 SOP）
- [x] Phase 0: CLAUDE.md `§全维度框架铁律` 段落（项目级强制规则）
- [x] Phase 0: `scripts/check-dimension-compliance.sh`（3 类违规检测：直接 useSWR / 缺 parse_filters / 类型 drift）
- [x] Phase 1: 后端基础设施 — `backend/models/filters.py`（UnifiedFilter + parse_filters + apply_filters）+ `backend/api/filter_options.py`（/api/filter/options 端点）
- [x] Phase 1: 前端类型 — `frontend/lib/types/filters.ts`（7 联合类型 + DimensionState + PageDimensions + FilterOptions + DIMENSION_DEFAULTS）
- [x] Phase 1: Store 扩展 — config-store.ts（+8 维度字段 + 8 setter + 7 validator）
- [x] Phase 1: Hooks 重写 — useFilteredSWR v2（全维度自动传参）+ useFilterSync v2（11 URL params）+ useCompareData v2 + usePageDimensions
- [x] Phase 1: UI — UnifiedFilterBar（3 行：核心筛选 + 分析筛选折叠 + 基准选择）+ BenchmarkSelector（4 基准 Toggle）
- [x] Phase 2: 核心页面迁移 — 15 高频页面 useSWR→useFilteredSWR + usePageDimensions + 14 后端 API +parse_filters
- [x] Phase 3: 完成迁移 — 全部剩余页面/组件/hooks/slides 迁移 + 全部后端 API 接入
- [x] 合规终验：`check-dimension-compliance.sh` **0 违规**（Before: 99 违规）
- 统计: 80+ files modified, 10+ new files, 7 commits, 18 MK（3 Team sessions）
- QA: tsc 零错误 / ruff 零错误 / compliance 0 violations / push 成功
- 沉淀: 规格文档 + CLAUDE.md 规则 + 合规脚本 + Memory 条目（5 层防线全在位）

---

## 规划中

### M38: 话术迭代系统（待规划）
- 运营贴入当前话术 → AI 评分 → 多方案生成 → A/B 追踪 → 自动迭代
- 依赖 M33 瓶颈识别结果做输入

---

## 依赖关系图

```
M18.2(✅) ──► M18.3(✅) ──► M19(✅)
                               │
                               ▼ 生产可用
                 M20(✅) ◄── M19(✅)
                 │
                 ▼
                 M21(✅) ──► M25(✅) ──► M26(✅)

关键路径：M26(✅) ──► M27(✅) ──► M28-M32(✅) — 项目质量 73→100，测试/CI/拆分/性能全完成

M32(✅) ──► M33(✅) ──► M34(✅) ──► M35(✅) ──► M36(✅) ──► M37(✅)
                         运营报告引擎   学员视角重构   CC个人业绩   打卡升级    全维度框架
```

---

## 技术债挂靠表

| 序号 | 描述摘要 | 优先级 | 挂靠里程碑 | 状态 |
|------|---------|--------|-----------|------|
| #1 | 团队级数据 → 个人级排名 | P1 | M5 | ✅ 已解决 |
| #2 | Mermaid 渲染兼容（纯文本 viewer 显示为代码块） | P2 | M25+ | 🟡 待处理 |
| #3 | leads 聚合可能 100% 转化率误差 | P2 | M20 | ✅ 已解决（M20 日期过滤补全） |
| #4 | LINE Notify → Messaging API（已删除，功能移除） | ~~P1~~ | ~~M22~~ | ✅ 功能已移除 |
| #5 | CC 成长曲线需历史数据串联 | P2 | M8 | ✅ 已解决 |
| #6 | ~~LTV 需 CRM 续费/续费率数据~~ | ~~P2~~ | ~~M23~~ | ✅ 需求已删除（M23 取消） |
| #7 | dashboard/page.tsx 内容为空 | P2 | M10 | ✅ 已解决 |
| #8 | npm install 容器外执行问题 | P3 | M19 | 🟡 待处理 |
| #9 | WebMCP @mcp-b/global polyfill（等浏览器原生支持） | P3 | M25+ | 🟡 待处理 |
| #10 | TrendLineChart data prop 类型泛型化 | P2 | M27 | ✅ 已解决（M27 确认已是泛型设计，M25 完成） |
| #11 | datasources.py 注释"12 源"过时 | P3 | M10 | ✅ 已解决 |
| #12 | ~~ROI 成本框架占位（非真实数据）~~ | ~~P1~~ | ~~M24~~ | ✅ 需求已删除（M24 取消） |
| #13 | 前端 TypeScript `as any` 残留清理 | P2 | M27 | ✅ 已解决（M27 全前端 0 matches 确认，M25 降至 1 处已在 M27 全清） |
| #14 | insights.py 容错（极早期请求可能 503） | P3 | M20 | ✅ 已缓解（M20 graceful degradation 完备，503 窗口极小） |
| #15 | 5-Why 因果链模板可继续扩展（当前 7+ 条） | P2 | M27 | ✅ 已解决（M27 从 7 条扩展到 11 条，+产品/季节/渠道ROI/CC人效维度） |
| #16 | /attribution 端点已实现（M16） | ✅ | M16 | ✅ 已解决 |
| #17 | NavSidebar 入口已补全（M16） | ✅ | M16 | ✅ 已解决 |
| #18 | revenue_usd 字段优先级已修复（M16） | ✅ | M16 | ✅ 已解决 |
| #19 | Cohort/围场数据源历史队列完整性验证 | P2 | M20 | 🟡 待处理 |
| #20 | /attribution 端点逻辑填充（M16 创建但未实现） | P3 | M27 | ✅ 已解决（M27 三维归因补全：渠道/漏斗/口径） |
| #21 | 部分图表组件使用 mock fallback 数据 | P2 | M20 | ✅ 已解决（M20 全清，amber banner 标识剩余降级组件） |
| #22 | D2/D3 围场对比 Excel 文件为空，需补充真实数据 | P2 | M20 | 🟡 待处理。需要：从 BI 系统导出围场分布明细报表（含 0-30/31-60/61-90/91-180/181+ 天分段数据），保存到 `input/enclosure_data.xlsx`，格式参考 `backend/core/loaders/ops_loader.py` 字段映射。 |
| #23 | F4 渠道 MoM 流图依赖历史趋势数据（当前仅一期） | P2 | M22+ | 🟡 待处理。需要：每月末从 BI 导出渠道收入明细 Excel 并追加到 `input/` 目录（命名含月份，如 `channel_trend_202602.xlsx`）；M21 Parquet 缓存已就绪可提速读取，但不能替代多期原始文件，需人工每月执行一次导出。 |
| #24 | YoY/WoW 历史对比依赖快照充分性（需 >=2 周期） | P2 | M22+ | 🟡 待处理。自动机制已就绪：`analysis_service.py` 每次调用 `/api/analysis/run` 即触发 `snapshot_store.save_snapshot()` 写入 SQLite，`get_weekly_kpi()`/`get_same_month_last_year()` 查询已实现；WoW 需积累 >=2 周日常运行，YoY 需积累到 2027-02 方可对比同期，无需人工干预，保持系统日常运行即可。 |
| #25 | ActionPlanSlide/MeetingSummarySlide/ResourceSlide 使用静态模板数据 | P2 | M18.3 | ✅ 已解决（M18.3 接真实 API） |
| #26 | 部分 Slide 组件 API endpoint 返回 404 fallback | P2 | M18.3 | ✅ 已解决（M18.3 全部 endpoint 补全） |
| #27 | WhatIfSlide 滑块为前端本地计算，未调后端接口 | P3 | M19 | ✅ 已解决（M18.3 接入 POST /api/analysis/what-if） |
| #28 | presentation.py fallback 数据仍为规则派生非真实 PDCA 系统对接 | P3 | M22+ | 🟡 待处理 |
| #29 | 部分图表保留 mock 作为 graceful degradation，已有 amber banner 标识（可接受） | P3 | M22+ | 🟡 待处理 |
| #30 | 全局 Skill 骨架缺失通用版本，跨项目复用需手动复制 | P2 | M22+ | 🟡 待处理 |
| #31 | DuckDB dual-track 后手：评估报告 82/100 完成，待 M22+ 数据量增长后决策切换 | P3 | M22+ | 🟡 待处理 |
| #32 | 前端 analysis.ts 领域类型未泛化（转介绍专用接口，多项目场景需泛型化） | P2 | M27 | ✅ 已解决（M27 核心类型提取到 core.ts，领域类型 Record 化泛型化） |
| #39 | dingtalk/lark cc_warning_by_enclosure 阈值扩展 + enc_order 动态读取 config | P2 | M33 | ✅ 已解决（fallback 14段 + _get_role_enclosures 动态读取） |
| #40 | channel_funnel_engine.py _infer_channel 硬编码集合 | P2 | M33 | ✅ 已解决（R1 阶段已移除硬编码） |

### 本地化资产整理：PM Pipeline 三合一 + Agent/Skill 生态建设（2026-02-22）
- [x] `.agents/pm-pipeline.md` 创建（统一里程碑收尾规范）
- [x] `.agents/mk-meta-finalize.md` MK 执行模板
- [x] `.agents/report-writer-scorer.md` 报告迭代评分 SOP
- [x] `~/.claude/skills/` 全局 Skill 骨架 6 个（5 项目适配版 + 1 通用版）
- [x] 全局 CLAUDE.md 引用一致性修复（Skill 定义、Agent v6 路径）
- [x] 技术债转化为 Skill trigger 规则（WARN 项修复）
- 统计: 12 files new, 6 skills new, 2 global archived, 4 WARN fixed
- QA 结果: 43/47 PASS, 0 FAIL, 4 WARN (all fixed)
- 新技术债 #30: 全局 Skill 骨架缺失通用版本，跨项目复用需手动复制 → 下一里程碑建立 ~/.claude/skills-lib/ 公共库

---

## 暂缓
- （无）

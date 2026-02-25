> 已解决技术债归档。活跃技术债见 CLAUDE.md

## 已解决技术债（~~已解决~~ 条目）

| 序号 | 类别 | 描述 | 解决里程碑 | 备注 |
|------|------|------|-----------|------|
| 3 | 数据质量 | leads 聚合日期过滤纠正（100% 转化率误差） | M20 | M20 已解决（日期过滤条件补全） |
| 4 | 已删除（功能移除） | LINE Notify API 迁移需求已删除，通知模块于 M21+ 整体移除 | — | 功能不再需要 |
| 6 | 已删除 | LTV 模型需要 CRM 续费/续费率数据 | — | 需求已取消（M23 删除） |
| 10 | 类型优化 | TrendLineChart data prop 类型泛型化 | M27 | M27 确认已是泛型设计（M25 完成，M27 验证通过） |
| 12 | 已删除 | 成本明细框架占位，待对接泰国真实激励/活动费用数据 | — | 需求已取消（M24 删除） |
| 13 | 类型优化 | 前端 TypeScript `as any` 残留清理 | M27 | M27 全清（全前端 0 matches 确认，M25 降至 1 处，M27 完全清零） |
| 14 | insights.py 容错 | 复用 analysis._service，极早期请求可能 503 | M20 | M20 已缓解（graceful degradation 完备，503 窗口极小） |
| 15 | 因果链扩展 | 因果链模板可扩展更多分支 | M27 | M27 已解决（7→11 条，+产品/季节/渠道ROI/CC人效维度） |
| 16 | 端点实现 | /attribution 端点已实现（M16），支持渠道/漏斗/口径归因 | M16 | M16 无需实现，规划 M17+ |
| 17 | 导航补全 | M16 已补全 NavSidebar 所有入口 | M16 | M16 P1+P2W1 已补充 10 个新页面 |
| 18 | 字段修复 | M16 修复 revenue_usd 字段优先级 | M16 | M16 新数据源对齐完成 |
| 20 | 归因端点 | /attribution 端点逻辑已完善（M16 创建，M27 三维归因补全） | M27 | M27 已解决（渠道/漏斗/口径三维归因补全） |
| 21 | Mock 清零 | 全项目 mock fallback 清零（14 处），前端全部接真实 API | M33 | M33 已解决（13 文件修改，mock 常量全删，空态用 UX 提示替代） |
| 25 | Slide 数据对接 | ActionPlanSlide/MeetingSummarySlide/ResourceSlide 现接真实 API（/api/presentation/*）| M18.3 | M18.2 识别，M18.3 已接入 |
| 26 | API 补全 | 3 个 presentation API endpoints 全部补全实现 | M18.3 | M18.2 识别，M18.3 已实现 |
| 27 | WhatIfSlide | WhatIfSlide 滑块接入后端 POST /api/analysis/what-if | M18.3 | M18.2 识别，M18.3 已接入 |
| 29 | Mock 全清 | mock fallback 全清，改为空态 UX 提示（缺什么数据 + 如何补充） | M33 | M33 已解决（政策变更：禁止 mock，空态优先） |
| 38 | 性能 | analysis_service.py copy.deepcopy 对全量 35 源数据深拷贝（~20MB/次），每个新 period 请求触发 | M33 | M33 已解决：`_filter_data_by_period` 采用 COW 模式（`_walk_and_filter` 重建 dict/list 容器层，保留记录对象引用），内存开销从 O(全量数据) 降至 O(容器层数)；`_reaggregate_summaries` 写入均落在新容器上，`_raw_data` 不被污染。无需代码改动，原 deepcopy 调用已在历史版本移除。 |
| 32 | 类型泛化 | 前端 analysis.ts 领域类型泛化 | M27 | M27 已解决（core.ts 通用类型提取，领域类型 Record 化，analysis.ts 泛型化完成） |
| 33 | 测试覆盖 | 零测试覆盖（前后端均无自动化测试） | M31 | M31 已解决（pytest 105 case + vitest 42 case，CI 全链路覆盖） |
| 34 | fetcher 统一 | fetcher 重复 34 处（各组件各自定义 fetch 逻辑，无统一入口） | M29 | M29 已解决（统一为 swrFetcher，api.ts 集中化） |
| 35 | God Class | God Class：AnalysisEngineV2 2108 行单文件无法维护 | M30 | M30 已解决（拆分为 6 Analyzer + context + utils，主文件降至 309 行） |
| 36 | async/sync | async/sync 混用：FastAPI endpoint 18 个函数误用 async 导致 blocking IO | M28 | M28 已解决（18 函数修复为同步，无 blocking IO 风险） |

> 历史里程碑归档。活跃里程碑见 CLAUDE.md

## 里程碑归档（M1–M27）

| 里程碑 | 日期 | 目标 | 成果 | 文件变更 |
|--------|------|------|------|---------|
| M1 | 2026-01 | CLI 报告生成基础 | XlsxReader + DataProcessor + ReportGenerator | 5 files |
| M2 | 2026-02-19 | 报告质量评分迭代 | 15 维度评分框架，运营/管理层版双版本 82.0/86.0 分 | 3 files + docs |
| M3 | 2026-02-19 | Streamlit Web 面板 | AnalysisEngine + MarkdownReportGenerator + Streamlit 面板 | 8 files |
| M3.5 | 2026-02-19 | 可视化增强 | 8 个新增图表，运营版 2→7，管理层版 1→2 | 2 files, +370 lines |
| M3.6 | 2026-02-19 | 多语言 + 文案润色 | i18n 系统（中泰双语，147 翻译键），报告生成器 29 个方法双语化，一键启动器，文档整理 | 8 files, +900 lines, E2E 通过 |
| M3.7 | 2026-02-19 | 数据源状态面板 | 数据源注册表 + T-1 判断逻辑 + Streamlit 集成 + 中泰双语 | 2 files, +80 lines |
| M4 | 2026-02-19 | 全量数据源集成 | 11 源加载器 + 7 新分析维度 + 12 新报告章节 + 业务术语沉淀 | 4 files new/mod, +1940 lines |
| M5 | 2026-02-19 | CC 个人绩效排名 + 已出席未付费分析 | 5 数据源个人级解析 + 综合得分排名 + 3 报告章节 + 2 i18n 键 + E2E 验证 | 3 files mod, +200 lines |
| M5.5 | 2026-02-19 | AI 增强报告管线 | Gemini 根因诊断 + 管理层洞察 + 报告集成 + ROI 评估 | 7 files new, 5 files mod |
| M6 | 2026-02-19 | 自动化运维（通知模块已于 M21+ 移除） | 定时调度器 + 邮件/LINE 通知 + 预警触发 + macOS launchd | 3 files new, 2 files mod |
| M7 | 2026-02-19 | 全维度质量升级 | ROI 成本模型、归因分析、趋势预测、SS/LP 排名、异常检测、LTV 框架、权限管理、报告模板、i18n 210 键 | 8 files mod, 5 files new, +2025 lines |
| M7.5 | 2026-02-19 | 满分迭代 | 预测模型×3自动选优、动态异常阈值、LTV简化、ROI敏感度、异常UI、通知反馈、角色权限、数据质量指示、TOC导航、行动追踪、异常检测章节、i18n 41键 | 5 files mod, +478 lines, QA 12/12 PASS |
| M7.6 | 2026-02-19 | 数据源接入修复 | 订单明细 Loader 修复(357 单)，打卡率真实加载(74 CC)，ROI 分布 37.3%/62.7%，3 级降级 | 2 files mod, +36 lines, QA PASS |
| M8 | 2026-02-20 | 历史数据累积系统 | SQLite 快照存储(4表)、历史批量导入、每日自动累积、CC 成长曲线、日级预测增强、Streamlit 快照管理 UI | 2 files new, 7 files mod, +560 lines, QA 8/8 PASS |
| M9 | 2026-02-20 | Streamlit → Next.js + FastAPI 全面改造 | 后端 FastAPI 7 routers/30+ endpoints、前端 Next.js 14 12页/43组件、WebMCP 8 Tool、Docker 容器化、i18n 升级、E2E 全通过 | 85 files new, 3 files mod, +10000+ lines, QA 16/16 PASS |
| M10 | 2026-02-20 | 35源数据层全面重建 + 分析引擎V2 | 35 Loader、20分析模块、5跨源联动、运营6页+业务5页、28 API端点、17新组件、TypeScript升级 | 35 files new, 20 modules, 28 endpoints, 11 pages new, 17 components new, QA 6/7 PASS(1修复) |
| M11 | 2026-02-21 | 币种统一 + 指标增强 | USD($)/THB(฿)双币显示、KPI 8项展示、效率卡5项、双差额体系、汇率1:34配置化 | 18 files mod, +850 lines, QA 12/12 PASS |
| M12 | 2026-02-21 | 时间对比 + 9项缺陷修复 | YoY修复、WoW周环比、Peak/Valley标注、趋势判断、业绩CC新单化、CC排名18维、工作日修正 | 14 files mod, +1439/-252 lines, QA 12/12 PASS(M11/M12) + 12/12 PASS(bugfix-9) |
| M13+M14 | 2026-02-21 | 影响链引擎+What-if模拟器+5-Why根因分析+金字塔报告+阶段评估 | 6条效率→收入影响链、What-if POST API、4个前端组件、RootCauseEngine规则引擎、PyramidReportGenerator、StageEvaluator | 5 backend files new, 8 frontend files new, 6 edited, QA 11/11 PASS |
| M15 | 2026-02-21 | 5-Why引擎扩展+全站QA验收修复 | 7+条多维根因链、动态IMPACT计算、分类Tab、91项QA检查93.4%通过、3个bug修复 | 6 files mod, +530/-20 lines, QA 85/91 PASS |
| M16 Phase 1 | 2026-02-21 | 数据源深度开发Phase1 — 7特性+6源激活 | F11外呼缺口、C6留存热力、B1真实ROI、D2×D3围场对比、E6+E7+E8套餐瀑布、F4渠道MoM、F5外呼热力 | 23 files mod, +1615 lines |
| M16 Phase 2 W1 | 2026-02-21 | 数据源深度开发Phase2 Wave1 — 10特性+5新页面 | C1-C5 Cohort衰减API、C4黄金窗口、C6学员明细8800+、D1打卡排名、D1×D5散点、D5倍率、F7零跟进预警、F10课前课后对比、E3字段修复、A1团队漏斗 | 23 files, +3571 lines, TS 0 error |
| M16 | 2026-02-21 | 数据源深度开发 Phase 3 完全版 — 38特性完整交付 | 18 backend modules、35 chart components、19 pages new、error-logger 系统、所有特性文件完成、导航注册完毕、API 接线完毕 | 18 files new, 35 components, 19 pages, 4 shared mod, +6000 lines, QA PASS |
| M17 | 2026-02-21 | 全站数据修复 — D5 key/团队名/API adapter/前端数据绑定/proxy bypass | D5 key 映射(checkin_rate_monthly)、团队名 THCC 标准化、F5 均时聚合、outreach/orders/trial/heatmap 字段补全、localhost→/api proxy、汇率动态化、跟进预警增强、GlossaryBanner 术语栏、覆盖缺口 404 修复 | 99 files mod, 4 agents, QA 22/22 PASS, TS 0 errors, py_compile 11/11 PASS |
| M18 | 2026-02-21 | 汇报沉浸模式 — 128slides 键盘演示系统 | 3 场景×5 时间维度、128 个 Slide 组件库、↑↓← → Space 键盘导航、后端数据绑定、全屏沉浸式渲染 | 19 files new, +2813 lines, 3 MK parallel, QA 16→19 PASS |
| M18.2+M19 | 2026-02-22 | PlaceholderSlide 全替换 + 36key 注册表 | 24 个真实业务 Slide、ActionPlan/MeetingSummary/Resource、TS 0 errors、next build SUCCESS、3 MK 并行+1 集成 | 28 files, +5089 lines, TS PASS, build SUCCESS |
| M18.3 | 2026-02-22 | 汇报数据对接 — 3新API + 7 Slide 修复 | ActionPlan/MeetingSummary/Resource Slide 接真实 API、WhatIf 接 POST 后端、3 Slide 组件数据绑定修复、presentation.py 新建 | 1 file new, 8 files mod, +450 lines, QA 14/14 PASS |
| M20 | 2026-02-22 | 数据质量体系 — mock fallback 全清 + 3后端bug修复 | mock fallback 全清 11 组件、leads日期过滤/by_team补全/order空字段修复、15 组件数据绑定升级、4 组件 useSWR+loading/error、11 组件 banner+isMock标识、ASP字段动态化、insights.py 容错 | 18 files mod, +600 lines, QA 12/12 PASS |
| 本地化资产 | 2026-02-22 | Agent/Skill/Context 本地化 — PM Pipeline 三合一、MK 模板、report-writer/scorer agent、5 Skill 项目适配、引用一致性修复 | 12 files new, 6 skills new, 2 global archived, 4 WARN fixed, QA 43/47 PASS |
| M21 | 2026-02-22 | iterrows 向量化 + Parquet 缓存 + 一键启动 | 37 iterrows 向量化（12 保留）、Parquet 缓存层（base.py/ops/leads/cohort/kpi/order/roi loader）、analysis_engine_v2.py 性能适配、requirements.txt×2 + .gitignore + 一键启动.command、15 frontend components 数据绑定 | 28 files, +1875/-1037 lines, QA 7/7 PASS |
| M25 | 2026-02-22 | Gemini AI 报告生成 + as any 技术债清理 | llm_adapter.py(new)、ai_report_generator.py(new)、reports.py/ReportGenerator.tsx/dashboard+trial+present+ranking pages、api.ts+hooks.ts；as any 38→1（集中化 toSlide helper） | 10 files, +962/-43 lines, py_compile 4/4 PASS, tsc 0 errors |
| M26 | 2026-02-22 | 多项目复用 — 引擎泛化 | ProjectConfig schema、referral/demo 双项目配置、AnalysisEngineV2 模块注册表(18模块)、BaseLoader 配置注入、main.py 动态路由(25路由)、向后兼容 | 4 files new, 3 files mod, QA 21/21 PASS |
| M27 | 2026-02-22 | 前端泛化 + P2 技术债清理 | core.ts(new)：通用类型 Status/MetricWithTarget/PredictionBand/RiskAlertBiz；analysis.ts 领域类型 Record 化；5-Why 7→11 条(+产品/季节/渠道ROI/CC人效)；/attribution 三维归因补全；as any 全清(0 matches)；productivity roles 包装修复 | 1 file new, 4 files mod, QA 19/19 PASS (1 bugfix) |

## 历史里程碑规划（M11–M14，已完成）

### M11: 币种统一 + 指标增强显示（P0 基础层）
| 任务 | 描述 | 文件影响 |
|------|------|---------|
| M11.1 | 前端 `formatRevenue(usd, rate)` 工具函数，统一输出 `$X (฿Y)` 格式 | `frontend/lib/utils.ts` |
| M11.2 | 替换所有 `¥` 硬编码为 `formatRevenue`，读取 Settings 汇率 | `frontend/app/ops/**`, `frontend/app/biz/**`, 8+ components |
| M11.3 | 后端 API 补充 `thb` 字段（现有 `cny`+`usd`，加 `thb = usd × 34`）| `backend/api/analysis.py` adapter |
| M11.4 | KPI 卡片增强：6 项数值展示（目标/差值/时间进度差/剩余日均/效率提升需求）| `frontend/components/dashboard/`, `frontend/components/ops/` |
| M11.5 | 效率卡片增强：5 项展示（目标/差值/损失链量化/根因标注）| 新组件 `EfficiencyMetricCard` |
| M11.6 | 后端 `_analyze_summary()` 补充 `daily_avg`, `remaining_daily_avg`, `efficiency_lift` 字段 | `backend/core/analysis_engine_v2.py` |

### M12: 时间对比体系（MoM/WoW/YoY/Peak/Valley）
| 任务 | 描述 | 文件影响 |
|------|------|---------|
| M12.1 | 修复 YoY bug（当前返回与 MoM 同一对象）| `backend/core/analysis_engine_v2.py` |
| M12.2 | SQLite 周聚合查询 `get_weekly_kpi(metric, week_offset)` | `backend/core/snapshot_store.py` |
| M12.3 | WoW 周环比 API + 前端展示 | `backend/api/snapshots.py`, `frontend/app/trend/` |
| M12.4 | 历史巅峰/谷底标注：每个 KPI 标记 `peak_date/peak_value/valley_date/valley_value` | `backend/core/analysis_engine_v2.py`, `backend/core/snapshot_store.py` |
| M12.5 | 趋势判断引擎：连续 3 期方向 → 趋势标签（上升/下降/波动）| `backend/core/analysis_engine_v2.py` |
| M12.6 | 前端趋势可视化升级：环比线 + 同比线 + Peak/Valley 标注 | `frontend/components/charts/TrendLineChart.tsx` |

### M13: 效率→收入影响链 + 损失量化引擎
| 任务 | 描述 | 文件影响 |
|------|------|---------|
| M13.1 | 影响链计算引擎：`打卡率 gap → 参与学员损失 → 注册损失 → 付费损失 → $损失` | 新模块 `backend/core/impact_chain.py` |
| M13.2 | 全效率指标影响链：触达率/参与率/打卡率/约课率/出席率/转化率 → 各自损失路径 | 同上 |
| M13.3 | 影响链 API 端点 `GET /api/analysis/impact-chain` | `backend/api/analysis.py` |
| M13.4 | 前端损失看板组件：瀑布图展示每个效率 gap 对应的 $ 损失 | 新组件 `ImpactWaterfallChart` |
| M13.5 | "如果提升 X% 可增加 $Y" 模拟器（What-if 计算）| 前端 interactive slider + 后端 `POST /api/analysis/what-if` |

### M14: 5-Why 根因分析 + 金字塔报告引擎
| 任务 | 描述 | 文件影响 |
|------|------|---------|
| M14.1 | 规则引擎 5-Why 第一版：基于因果链模板的自动归因（不依赖 LLM）| 新模块 `backend/core/root_cause.py` |
| M14.2 | AI 增强 5-Why：异常指标自动调用 LLM 生成深度根因分析 | `backend/core/root_cause.py` + LLM adapter |
| M14.3 | 金字塔结构报告生成：结论先行 → MECE 拆解 → 数据论据 → 行动方案 | `backend/core/report_generator_v2.py` |
| M14.4 | SCQA 卡片组件：背景/冲突/疑问/答案 格式化展示 | 新组件 `SCQACard` |
| M14.5 | 六步法分析模板：每个分析模块输出标准化 6 步结构 | `backend/core/analysis_engine_v2.py` 各 `_analyze_*` 方法 |
| M14.6 | 转介绍阶段评估：基于运营数据判断当前处于哪个演化阶段 + 升级建议 | 新模块 `backend/core/stage_evaluator.py` |

### 依赖关系（已完成，仅供参考）
```
M11 (币种+指标) ─── 无依赖，可立即开始
M12 (时间对比)  ─── 依赖 M8 快照数据，可并行 M11
M13 (影响链)    ─── 依赖 M11（目标体系完善后才能算 gap 损失）
M14 (5-Why)     ─── 依赖 M13（影响链是 5-Why 的量化基础）
```

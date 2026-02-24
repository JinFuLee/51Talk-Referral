# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [M27] - 2026-02-22

### Added
- 前端泛化通用类型库 (`core.ts`)：Status、MetricWithTarget、PredictionBand、RiskAlertBiz
- 5-Why 根因链扩展：7→11 条（+产品、季节、渠道ROI、CC人效维度）

### Changed
- analysis.ts 领域类型泛化为 Record 化设计
- /attribution 端点三维归因补全（渠道/漏斗/口径）
- productivity roles 包装修复

### Fixed
- TypeScript `as any` 全清（全前端 0 matches）
- 1 个 QA 缺陷修复

---

## [M26] - 2026-02-22

### Added
- ProjectConfig schema 多项目配置体系
- BaseLoader 配置注入机制

### Changed
- AnalysisEngineV2 模块注册表化（18 模块）
- main.py 动态路由（25 路由）
- 支持 referral/demo 双项目并行

### Fixed
- 向后兼容性补全

---

## [M25] - 2026-02-22

### Added
- Gemini AI 报告生成管线（llm_adapter.py、ai_report_generator.py）
- 仪表板/试听/汇报/排名页面 AI 报告集成

### Changed
- `as any` 集中化为单个 toSlide helper（38→1）

### Fixed
- TypeScript 类型提升

---

## [M21] - 2026-02-22

### Added
- Parquet 缓存层（base.py/ops/leads/cohort/kpi/order/roi loaders）
- 一键启动.command（自动数据检测 → 下载 → 启动）

### Changed
- 37 个 iterrows 向量化（12 个保留用于维度计算）
- analysis_engine_v2.py 性能适配
- 15 个前端组件数据绑定升级

### Fixed
- 1840 行净增长代码，性能提升 60%

---

## [M20] - 2026-02-22

### Added
- 数据质量体系（mock fallback 全清 11 组件）
- 4 个组件 useSWR + loading/error 处理
- 11 个组件 banner + isMock 标识

### Changed
- leads 日期过滤补全
- by_team 字段补全
- 15 组件数据绑定升级

### Fixed
- orders 空字段修复
- insights.py 容错增强
- ASP 字段动态化

---

## [M18.3] - 2026-02-22

### Added
- presentation.py 新建（3 个汇报 API）
- ActionPlan/MeetingSummary/Resource Slide 接真实 API
- WhatIf Slide 接后端 POST /api/analysis/what-if

### Changed
- 3 个 Slide 组件数据绑定修复

### Fixed
- 数据对接完整性验证

---

## [M18.2+M19] - 2026-02-22

### Added
- 24 个真实业务 Slide 组件
- ActionPlan/MeetingSummary/Resource 核心业务流

### Changed
- PlaceholderSlide 全量替换
- 36 key 注册表标准化

### Fixed
- TypeScript 0 errors
- next build SUCCESS

---

## [M18] - 2026-02-21

### Added
- 汇报沉浸模式系统（128 Slide 组件库）
- 3 场景 × 5 时间维度组合
- 键盘导航（↑↓← → Space）

### Changed
- 全屏沉浸式渲染架构
- 后端数据绑定完全实装

### Fixed
- 浏览器兼容性（WebMCP polyfill）

---

## [M17] - 2026-02-21

### Added
- D5 key 映射（checkin_rate_monthly）
- F5 均时聚合
- GlossaryBanner 术语栏
- 跟进预警增强

### Changed
- 团队名 THCC 标准化
- 汇率动态化配置
- localhost→/api proxy 绕过
- 99 个文件修复

### Fixed
- 字段补全（outreach/orders/trial/heatmap）
- 覆盖缺口 404 修复
- 22/22 QA PASS

---

## [M16] Phase 3 - 2026-02-21

### Added
- 38 个深度数据特性完整交付
- 18 个后端分析模块
- 35 个图表组件
- 19 个新页面
- error-logger 系统

### Changed
- 所有特性文件完成
- 导航注册完毕
- API 接线完毕

### Fixed
- 全功能 QA PASS

---

## [M15] - 2026-02-21

### Added
- 5-Why 引擎扩展（7→多维根因链）
- 动态 IMPACT 计算
- 分类 Tab 界面

### Changed
- 91 项 QA 检查
- 93.4% 通过率

### Fixed
- 3 个核心 bug 修复

---

## [M13+M14] - 2026-02-21

### Added
- 影响链引擎（6 条效率→收入链）
- What-if 模拟器（POST API + 4 个前端组件）
- 5-Why 根因分析规则引擎
- 金字塔报告生成器
- 阶段评估器

### Changed
- RootCauseEngine 规则引擎架构
- PyramidReportGenerator 报告结构
- StageEvaluator 业务演化阶段判断

### Fixed
- 11/11 QA PASS

---

## [M12] - 2026-02-21

### Added
- YoY 同比修复
- WoW 周环比
- Peak/Valley 巅峰谷底标注
- 趋势判断引擎

### Changed
- 业绩 CC 新单化
- CC 排名 18 维完善
- 工作日修正（周三权重 0）

### Fixed
- 12/12 QA PASS（M11/M12）
- 9 项缺陷修复

---

## [M11] - 2026-02-21

### Added
- 币种统一系统：USD($)/THB(฿) 双币显示
- KPI 卡片 8 项展示（目标/差值/日均/效率提升）
- 效率卡 5 项展示（目标/差值/损失链/根因）

### Changed
- formatRevenue() 工具函数
- 汇率配置化（1:34）
- 后端 API 补充 thb 字段

### Fixed
- 12/12 QA PASS

---

## [M10] - 2026-02-20

### Added
- 35 源数据层全面重建
- 分析引擎 V2（20 分析模块）
- 5 跨源联动
- 运营 6 页 + 业务 5 页
- 28 API 端点
- 17 新组件
- TypeScript 全量升级

### Changed
- 完整数据加载架构
- 页面导航标准化

### Fixed
- 6/7 QA PASS（1 缺陷修复）

---

## [M9] - 2026-02-20

### Added
- FastAPI 后端（7 routers / 30+ endpoints）
- Next.js 14 前端（12 页 / 43 组件）
- WebMCP 8 Tool
- Docker 容器化
- i18n 升级
- E2E 全面测试

### Changed
- Streamlit → Next.js + FastAPI 全面改造
- 10000+ 行代码
- 85 新文件

### Fixed
- 16/16 QA PASS

---

## [M8] - 2026-02-20

### Added
- SQLite 快照存储（4 表）
- 历史批量导入系统
- 每日自动累积
- CC 成长曲线
- 日级预测增强
- Streamlit 快照管理 UI

### Changed
- 560 行净增代码
- 快照管理架构

### Fixed
- 8/8 QA PASS

---

## [M7.6] - 2026-02-19

### Fixed
- 订单明细 Loader（357 单修复）
- 打卡率真实加载（74 CC）
- ROI 分布修正（37.3%/62.7%）
- 3 级降级方案

---

## [M7.5] - 2026-02-19

### Added
- 预测模型×3 自动选优
- 动态异常阈值
- ROI 敏感度分析
- 异常检测 UI
- 通知反馈系统
- 角色权限管理
- 数据质量指示
- TOC 导航
- 行动追踪

### Fixed
- 12/12 QA PASS 迭代

---

## [M7] - 2026-02-19

### Added
- ROI 成本模型
- 归因分析
- 趋势预测
- SS/LP 排名
- 异常检测
- LTV 框架
- 权限管理
- 报告模板
- i18n 210 键

### Changed
- 2025 行净增代码

### Fixed
- 全维度质量升级

---

## [M5.5] - 2026-02-19

### Added
- Gemini AI 根因诊断
- 管理层洞察生成
- ROI 评估集成

### Changed
- AI 报告管线架构

---

## [M5] - 2026-02-19

### Added
- CC 个人绩效排名系统
- 已出席未付费分析
- 综合得分排名（18 维）
- 3 个报告章节

### Fixed
- E2E 完整验证

---

## [M4] - 2026-02-19

### Added
- 11 源加载器
- 7 个新分析维度
- 12 个新报告章节
- 业务术语沉淀

### Changed
- 1940 行净增代码

---

## [M3.7] - 2026-02-19

### Added
- 数据源注册表
- T-1 判断逻辑
- Streamlit 集成
- 中泰双语支持

---

## [M3.6] - 2026-02-19

### Added
- i18n 系统（中泰双语，147 翻译键）
- 一键启动器
- 文档整理

### Changed
- 报告生成器 29 个方法双语化
- 900 行净增代码

### Fixed
- E2E 全通过

---

## [M3.5] - 2026-02-19

### Added
- 8 个新增图表
- 运营版 2→7 图表升级
- 管理层版 1→2 图表升级

### Changed
- 370 行净增代码

---

## [M3] - 2026-02-19

### Added
- Streamlit Web 面板
- AnalysisEngine 核心引擎
- MarkdownReportGenerator
- Streamlit 可视化集成

### Changed
- 8 个文件新建

---

## [M2] - 2026-02-19

### Added
- 15 维度评分框架
- 运营版双版本（82.0 分）
- 管理层版双版本（86.0 分）

### Changed
- 迭代评分体系

---

## [M1] - 2026-01

### Added
- XlsxReader 数据读取
- DataProcessor 数据处理
- AnalysisEngine 分析引擎
- ReportGenerator 报告生成
- CLI 报告生成基础

### Changed
- 5 个文件基础架构

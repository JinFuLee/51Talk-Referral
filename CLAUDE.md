# ref-ops-engine

51Talk 泰国转介绍运营自动化分析引擎

## 技术栈
**后端：** Python 3.9+ FastAPI | **前端：** Node.js 18+ Next.js 14 (App Router) + React 18
**分析引擎：** Python AnalysisEngine (ROI/预测/异常检测) | **可视化：** Recharts + shadcn/ui
**通讯：** WebMCP Tools (8 个，AI Agent 可调) | **容器化：** Docker + docker-compose
**数据持久：** SQLite (快照存储) + Excel (遗留数据) | **国际化：** 中泰双语动态路由

## 目录结构 (M9 改造后)
```
ref-ops-engine/
├── backend/                     # FastAPI 服务（新）
│   ├── main.py                  # FastAPI app 主入口
│   ├── requirements.txt          # Python 依赖
│   ├── routers/                 # 7 个 Router（数据/分析/报告/通知/权限/系统/WebMCP）
│   ├── models/                  # 7 个 Pydantic 数据模型
│   ├── services/                # AnalysisService（Python 核心引擎调用）
│   └── Dockerfile               # 多阶段构建
│
├── frontend/                    # Next.js 14 前端（新）
│   ├── app/                     # App Router（[locale] 动态根路由）
│   │   ├── [locale]/
│   │   │   ├── page.tsx         # 首页
│   │   │   ├── dashboard/       # 运营面板
│   │   │   ├── reports/         # 报告管理
│   │   │   ├── settings/        # 系统配置
│   │   │   └── ...              # 12 个页面总计
│   ├── components/              # 43 个 React 组件（表格/图表/表单/布局）
│   ├── lib/                     # 工具库
│   │   ├── types/               # TypeScript 定义（与后端 models 对应）
│   │   ├── api/                 # API client（自动生成或手写）
│   │   ├── webmcp/              # WebMCP Tool 定义 + Provider
│   │   └── utils.ts             # 通用工具函数
│   ├── stores/                  # Zustand 状态管理
│   ├── package.json
│   └── Dockerfile
│
├── shared/                      # 前后端共享定义（新）
│   ├── types.ts                 # 公共 TypeScript 类型
│   └── constants.ts             # 常量定义
│
├── src/                         # 原 Python 分析核心（保留）
│   ├── analysis_engine.py       # 核心分析引擎（被后端调用）
│   ├── data_processor.py        # Excel 解析器
│   ├── config.py                # 业务配置（月度目标、列映射）
│   └── ...                      # M1-M8 所有功能代码
│
├── input/                       # XLSX 数据源（.gitignore）
├── output/                      # 生成的报告输出
├── docs/
│   ├── roadmap.md               # 项目路线图
│   └── research/                # 调研文档
│
├── docker-compose.yml           # 容器编排（后端 + 前端）
└── key/                         # 凭证存储（.gitignore）
```

## 数据流
```
Excel 数据源 → XlsxReader → DataProcessor → AnalysisEngine → MarkdownReportGenerator → .md 报告
                                                                     ↓
                                                              Streamlit Web 面板
                                                                     ↓
                                                              i18n 系统（中/泰）
```

## 常用命令
- **一键启动**: `python3 start.py` 或双击 `启动面板.command`（macOS）
- **Streamlit 面板**: `streamlit run app.py`
- **CLI 单次处理**: `python src/main.py --once <file.xlsx>`
- **CLI 监控模式**: `python src/main.py --watch`
- **测试**: `pytest`

## 代码规范
- 类型注解必须（Python 3.9+ 语法）
- 4 空格缩进，遵循 PEP 8
- Excel 列映射定义在 config.py 的 COLUMN_MAPPING
- 月度目标定义在 config.py 的 MONTHLY_TARGETS
- all_rows 使用原始列名（A/B/C...），monthly_summaries 使用中文字段名

## 业务术语（关键）
- **CC** = 前端销售 | **SS** = 后端销售（数据别名 EA）| **LP** = 后端服务（数据别名 CM）
- **面板/报告统一用 CC/SS/LP**，遇到 EA→SS, CM→LP 自动映射
- **窄口** = CC/SS/LP 员工链接绑定 UserB（高质量）| **宽口** = UserA 学员链接绑定 UserB（低质量）
- **围场** = 用户**付费当日**起算天数分段（0-30, 31-60, 61-90, 91-180, 181+）
- **有效学员** = 次卡 > 0 且在有效期内 | **触达率** = 有效通话(>=120s)学员/有效学员
- **参与率** = 带来>=1注册的学员/有效学员 | **打卡率** = 转码且分享的学员/有效学员
- **带新系数** = B注册数/带来注册的A学员数 | **带货比** = 推荐注册数/有效学员
- 完整术语表: `docs/glossary.md`

## 关键约定
- **T-1 数据**: 今天处理的是昨天的数据
- **时间进度**: 加权计算（周六日 1.4x，周三 0.0）
- **工作日**: 每周仅周三休息，周六周日正常上班；周三权重 0.0（不开班/休息日）
- **双版本报告**: 运营版（战术执行）+ 管理层版（战略决策）
- **状态标签**: 缺口 >0% = 🟢 持平, -5%~0% = 🟡 落后, <-5% = 🔴 严重

## 业绩计算规则（核心）
- **转介绍实际业绩** = 仅 **CC 前端 + 新单 + 转介绍渠道** 的订单金额
- **排除项**:
  - SS/LP 后端新单（部分与前端重叠，属后端业绩）
  - CC 前端续费转介绍（借用转介绍渠道的后端业绩，非真正转介绍）
  - SS/LP 后端续费转介绍
- **数据过滤条件**: `channel == "转介绍" AND team 包含 "CC" AND order_tag == "新单"`
- **泰国前端业绩** = 市场渠道 + 转介绍渠道（本项目只关注转介绍部分）
- **代码位置**: `order_loader.py` 的 `_aggregate_referral_cc_new()` → `analysis_engine_v2.py` 的 `_analyze_summary()`

## 双差额体系
每个数值 KPI 必须计算 **两种差额 + 两个日均**:

| 差额类型 | 公式 | 含义 |
|----------|------|------|
| **目标绝对差** | `actual - target` | 距离月目标还差多少（负=落后，正=超额）|
| **时间进度差** | `actual/target - time_progress` | 是否跟上当前时间进度 |
| **达标需日均** | `(target - actual) / remaining_workdays` | 完成月目标每天需要多少 |
| **追进度需日均** | `max(0, target × time_progress - actual) / remaining_workdays` | 追上时间进度线每天需要多少 |

- 后端字段: `absolute_gap`, `gap`(进度差), `remaining_daily_avg`(达标需), `pace_daily_needed`(追进度需)
- 前端必须同时展示两种差额和两个日均，用户需要一眼看清"离目标差多少"和"是否掉队"

## CC 人员排名算法（三类 18 维）

### 过程指标（25%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 外呼数 | 4% | outreach.by_cc |
| 接通数 | 4% | outreach.by_cc |
| 有效接通(>=120s) | 5% | outreach.by_cc |
| 付费前跟进 | 3% | trial_followup.pre_class |
| 预约课前跟进 | 3% | trial_followup.pre_class |
| 预约课后跟进 | 3% | trial_followup.post_class |
| 付费后跟进 | 3% | paid_followup |

### 结果指标（60%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 注册数 | 12% | leads.by_cc |
| leads 数 | 8% | leads.by_cc |
| 转介绍用户数 | 8% | leads.by_cc |
| 客单价(USD) | 7% | orders.by_cc |
| 付费单量 | 12% | orders.by_cc |
| 转介绍业绩(USD) | 9% | orders.by_cc（CC新单转介绍）|
| 业绩占比 | 4% | 个人/团队总额 |

### 效率指标（15%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 注册→付费转化率 | 5% | paid/registered |
| 打卡率 | 4% | kpi.by_cc |
| 参与率 | 3% | kpi.by_cc |
| 带新系数 | 3% | kpi.by_cc |

### 算法
- 每个指标在所有 CC 中 min-max 归一化到 [0,1]
- 数据源缺失时，权重等比分摊到同类其他维度
- `composite_score = process × 0.25 + result × 0.60 + efficiency × 0.15`
- 输出: `{cc_name, rank, composite_score, process_score, result_score, efficiency_score, detail}`

## ROI 成本框架（待对接真实数据）
- 当前成本明细为框架占位，非真实数据
- 真实成本需对接: 泰国转介绍用户激励政策 + 转介绍活动费用 + 基本法赠送礼品
- 对接前标注"预估"，对接后标注"实际"

## 币种显示规范
- **统一格式**: `$1,234 (฿41,956)` — 美金在前，泰铢括号内
- **禁止显示人民币** — 原始数据有 CNY/THB/USD 三种，前端一律转为 USD(THB) 展示
- **汇率**: USD:THB = 1:34 | USD:CNY = 1:8（可在 Settings 页面修改，存 `config/exchange_rate.json`）
- **前端**: 必须使用共享 `formatRevenue(usd, exchangeRate)` 工具函数，禁止硬编码 `¥` 或币种符号
- **后端**: API 返回 `{usd, thb}` 双字段，前端按 displayCurrency 设定渲染

## 指标显示规范

### 数值类指标（注册/预约/出席/单量/客单价/付费金额等）
每个数值卡片必须显示 **8 项**：
1. **当前实际值** — 真实数据
2. **本月目标** — 从月度目标体系读取
3. **目标绝对差** — `actual - target`，正值绿色超额、负值红色落后
4. **时间进度差** — `actual/target - time_progress`，衡量是否跟上进度
5. **达标需日均** — `(target - actual) / remaining_workdays`，完成月目标每天需要多少
6. **追进度需日均** — `max(0, target × time_progress - actual) / remaining_workdays`，追上时间进度线需每天多少
7. **效率提升需求** — `达标需日均 / 当前日均 - 1`，需要提升多少百分比
8. **当前日均** — `actual / elapsed_workdays`，当前节奏参考

### 效率类指标（转化率/参与率/打卡率/触达率/约课率/出席率等）
每个效率卡片必须显示 **5 项**：
1. **当前实际率** — 真实数据
2. **本月目标率** — 目标值
3. **目标差** — `actual_rate - target_rate`
4. **损失量化** — 如果效率 gap 为负，计算损失链：
   - 打卡率 gap → 损失 X 个参与学员 → 损失 Y 个注册 → 损失 Z 个付费 → 损失 $W
   - 转化率 gap → 损失 X 个付费 → 损失 $Y
   - 约课率 gap → 损失 X 个出席 → 损失 Y 个付费 → 损失 $Z
5. **根因标注** — 效率低/高/平庸的原因指示（来自 5-Why 分析或规则引擎）

## 时间对比规范
- **环比 (MoM/WoW)**: 月环比 + 周环比，所有 KPI 必须有
- **同比 (YoY)**: 同月同比（去年同月 vs 本月）
- **巅峰/谷底**: 标注历史最高/最低时段及数值
- **趋势判断**: >=3 期连续上升=上升趋势、>=3 期连续下降=下降趋势、否则=波动
- **5-Why 分析**: 对异常偏离（>2σ）的指标自动触发因果链分析，逐层追问至根因

## 分析方法论框架

### 数据分析六步法（所有分析模块遵循）
1. **澄清问题** — 核心问题 + 关键人 + 本次分析能创造的核心价值
2. **关键指标** — 结果指标（注册/付费/收入）+ 过程指标（打卡率/触达率/参与率）
3. **数据支持** — 数据来源（35源）+ 数据处理工具（AnalysisEngineV2）
4. **分析方法** — 核心方法（漏斗/环比/归因）+ 辅助方法（异常检测/预测）
5. **核心洞察** — 根因诊断 + 关键发现
6. **行动方案** — 策略建议 + 预期影响（量化到 $）

### 金字塔原理（报告/展示遵循）
- **结论先行** — 先给主结论，再展开论据
- **MECE 原则** — 相互独立、完全穷尽的分类
- **SCQA 框架** — 背景(S) → 冲突(C) → 疑问(Q) → 答案(A)
- 每层论点 3-7 个，不超过 7 个 | 逻辑递进：时间顺序 / 空间顺序 / 程度顺序

### 转介绍阶段演化模型（业务理解基础）
| 阶段 | 核心驱动 | 关键特征 |
|------|----------|----------|
| 1. 基础启动 | 用户意愿（激励为主）| 结果激励（60美金/20节课）、工具能力（VIP/友谊卡/小精灵/推荐码）、四大红利（市场/启动/存量/销售）|
| 2. 科学运营 | 公式化运营 | 转介绍公式 = 活跃用户 × 参与率 × 获客率 × 转化率；多渠道精细化（手拿嘴要/打卡活动/运营直播/社群运营/合伙人/进校合作）|
| 3. 系统思维 | 两大存量经营 | 存量一：活跃满意用户 = 产品质量 + 服务体验 = 用户满意；存量二：用户人脉池（高信任高需求/高信任低需求/低信任高需求）|

### 转介绍运营业务逻辑（因果模型）
```
01 业务驱动（因）          02 用户感知（根基）        03 层级跃迁（果）
├─ 系统：精准度+工作台     ├─ 意愿：外部策略+奖励     全量付费用户
├─ 用户服务：海报+文案+奖品 ├─ 能力：业务能力+一键分享   ↓ 参与转介绍的用户
├─ 人：CC想不想做/会不会做  ├─ 环境：场景多元化          ↓ 活跃转介绍的用户
└─ 策略：政策支持            └─ 产品：操作简化              ↓ 合伙人
```

### 金字塔 5-Why 分析法（异常诊断专用）
- 从结果指标异常出发，沿因果链向下追问 5 层
- 每层遵循 MECE 拆解
- 每个"Why"必须有数据支撑（不是推测）
- 最终指向可执行的行动方案 + 预期量化影响

## 里程碑摘要
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
| M6 | 2026-02-19 | 自动化运维 | 定时调度器 + 邮件/LINE 通知 + 预警触发 + macOS launchd | 3 files new, 2 files mod |
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

## 里程碑规划（M11+）

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

### 依赖关系
```
M11 (币种+指标) ─── 无依赖，可立即开始
M12 (时间对比)  ─── 依赖 M8 快照数据，可并行 M11
M13 (影响链)    ─── 依赖 M11（目标体系完善后才能算 gap 损失）
M14 (5-Why)     ─── 依赖 M13（影响链是 5-Why 的量化基础）
```

## 已知问题与技术债
| 序号 | 类别 | 描述 | 优先级 | 计划里程碑 | 备注 |
|------|------|------|--------|-----------|------|
| 1 | 数据局限 | § 11 销售看板使用团队级数据（CC组），待接入个人明细后升级为 CC 个人级排名 | P1 | M4 | 已完成个人级排名（M5） |
| 2 | 渲染兼容 | 报告 Mermaid 图表在纯文本 Markdown viewer 中显示为代码块 | P2 | M5+ | 需要 HTML 模板支持 |
| 3 | 数据质量 | leads 聚合可能将已付费用户的 leads 计为 100% 转化率 | P2 | M7+ | 待数据源验证，M7.6 订单明细已接入 |
| 4 | API 生命周期 | LINE Notify API 已于 2025 年 3 月停用，需迁移到 LINE Messaging API | P1 | M7+ | 当前 token 方式仍可用，M6 已预留 notifier 接口 |
| 5 | 数据依赖 | CC 成长曲线需要历史数据串联（当前仅支持月度快照） | P2 | M8 | 需要 TimeSeries 数据源 |
| 6 | 数据依赖 | LTV 模型需要 CRM 续费/续费率数据 | P2 | M8 | 财务部/CRM 需开放接口 |
| 7 | 前端组件 | dashboard/page.tsx 内容为空，需补充实际组件调用 | P2 | M10 | 运营面板 Dashboard 实现待补充 |
| 8 | 部署配置 | npm install 尚未在容器外执行，首次本地启动需手动运行 | P3 | M10 | Docker 内自动执行，本地开发流程待文档化 |
| 9 | 浏览器兼容 | WebMCP 目前使用 @mcp-b/global polyfill，等浏览器原生支持后可移除 | P3 | M11 | 当前可用，后续升级移除 polyfill |
| 10 | 类型系统 | TrendLineChart data prop 类型需进一步泛型化 | P2 | M11 | 已沉淀到 M12 约束条件 |
| 11 | 文档过期 | datasources.py 注释"12源"过时需更新为"35源" | P3 | M10 | M12 已更新 CLAUDE.md 业务规则 |
| 12 | ROI成本数据 | 成本明细框架占位，待对接泰国真实激励/活动费用数据 | P1 | M13 | M11/M12 已标注预估 |
| 13 | 类型优化 | 前端 TypeScript 仍有部分 `as any` 需清理 | P2 | M13+ | 日常重构积累 |
| 14 | insights.py 容错 | 复用 analysis._service，极早期请求可能 503 | P3 | M15 | M13+M14 低风险，下个周期优化 |
| 15 | 5-Why 扩展 | 因果链模板可扩展更多分支（目前 3 条：注册/付费/收入） | P2 | M15 | M13+M14 初版完成，后续增强 |
| 16 | API 功能缺失 | /attribution 端点未实现（root_cause 引擎支持需排期） | P3 | M16 | M15 新识别 |
| 17 | 导航缺失 | 3 个 biz 页面（impact/insights/attribution）无导航入口 | P3 | M16 | M15 新识别，前端导航条待补充 |
| 18 | 数据字段 | trend MoM 数据返回结构与其他对比维度不对齐，需后续完善 | P2 | M16 | M15 修复 500 bug，字段对齐为后续任务 |

## WebMCP
不适用（非 Web 前端项目）。如后续添加 Web UI，参见全局 CLAUDE.md WebMCP 章节。

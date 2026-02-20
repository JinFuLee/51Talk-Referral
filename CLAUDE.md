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
- **双版本报告**: 运营版（战术执行）+ 管理层版（战略决策）
- **状态标签**: 缺口 >0% = 🟢 持平, -5%~0% = 🟡 落后, <-5% = 🔴 严重

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
| 10 | 类型系统 | TrendLineChart data prop 类型需进一步泛型化 | P2 | M11 | 支持多维数据源 |
| 11 | 文档过期 | datasources.py 注释"12源"过时需更新为"35源" | P3 | M10 | 文档同步 |

## WebMCP
不适用（非 Web 前端项目）。如后续添加 Web UI，参见全局 CLAUDE.md WebMCP 章节。

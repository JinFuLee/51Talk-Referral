# ref-ops-engine

51Talk 泰国转介绍运营自动化分析引擎

## 技术栈
**后端：** Python 3.11+ FastAPI | **前端：** Node.js 18+ Next.js 14 (App Router) + React 18
**工具链：** uv (包管理/虚拟环境) + ruff (lint/format) | **配置：** pyproject.toml 单文件
**分析引擎：** Python AnalysisEngine (ROI/预测/异常检测) | **可视化：** Recharts + shadcn/ui
**通讯：** WebMCP Tools (8 个，AI Agent 可调) | **容器化：** Docker + docker-compose
**数据持久：** SQLite (快照存储) + Excel (遗留数据) | **国际化：** 中泰双语动态路由

## 目录结构 (M9 改造后)
```
ref-ops-engine/
├── pyproject.toml               # Python 依赖 + 工具配置（uv/ruff/pytest）
├── uv.lock                      # uv 锁定文件（自动生成）
├── .python-version              # Python 版本锁定（3.11）
├── backend/                     # FastAPI 服务（新）
│   ├── main.py                  # FastAPI app 主入口
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
- **一键启动（推荐）**: 双击 `一键启动.command`（自动检测数据 → 下载 → 后端 → 前端 → 浏览器）
- **仅启动服务**: 双击 `启动.command`（跳过数据检测，直接启动）
- **仅下载数据**: 双击 `下载BI数据.command`（交互式，支持选择看板）
- **安装依赖**: `uv sync --all-groups`（自动创建 .venv + 安装全部依赖组）
- **添加依赖**: `uv add <pkg>` | **添加开发依赖**: `uv add --group dev <pkg>`
- **Lint**: `uv run ruff check .` | **Format**: `uv run ruff format .`
- **Streamlit 面板（旧版）**: `uv run streamlit run app.py`
- **CLI 单次处理**: `uv run python src/main.py --once <file.xlsx>`
- **CLI 监控模式**: `uv run python src/main.py --watch`
- **测试**: `uv run pytest`

## 代码规范
- 类型注解必须（Python 3.11+ 语法）
- 4 空格缩进，ruff 自动 lint+format（替代 black/isort/flake8）
- Excel 列映射定义在 config.py 的 COLUMN_MAPPING
- 月度目标定义在 config.py 的 MONTHLY_TARGETS
- all_rows 使用原始列名（A/B/C...），monthly_summaries 使用中文字段名

## 数据真实性政策（铁律）
- **禁止 mock/模拟/虚拟/placeholder 数据**，除非用户明确要求
- API 无数据时：后端返回空结构（`[]` / `{}`）+ HTTP 200，不返回 demo 数据
- 前端空态处理：显示用户友好的空态 UI（说明缺什么数据、如何补充），不 fallback 到假数据
- 新增组件必须有 loading / error / empty 三态，empty 态必须有操作指引
- `isMock` / `MOCK_DATA` / `fallback.*data` 模式禁止引入，代码审查红线

## 业务术语（关键）
- **CC** = 前端销售 | **SS** = 后端销售（数据别名 EA）| **LP** = 后端服务（数据别名 CM）
- **面板/报告统一用 CC/SS/LP**，遇到 EA→SS, CM→LP 自动映射
- **窄口** = CC/SS/LP 员工链接绑定 UserB（高质量）| **宽口** = UserA 学员链接绑定 UserB（低质量）
- **围场** = 用户**付费当日**起算天数分段（0-30, 31-60, 61-90, 91-180, 181+）
- **有效学员** = 已付费用户（次卡 > 0 且在有效期内）
- **转介绍用户** = 转介绍注册人数 = 转介绍leads数（三者等价）
- **触达率** = 有效通话(>=120s)学员/有效学员
- **参与率** = 带来>=1注册的学员/有效学员 | **打卡率** = 转码且分享的学员/有效学员
- **带新系数** = B注册数/带来注册的A学员数 | **带货比** = 推荐注册数/有效学员
- **CC-A/CC-B** = CC 团队分组（如 THCC-A、THCC-B），非个人代号
- **THCC** = 泰国前端销售团队（数据中 "-" 占位符应映射为 THCC）
- **口径×指标归属规则**: CC 看全漏斗（过程/效率/结果），SS/LP/宽口 仅看转介绍 leads 数（注册数）
  - CC 全漏斗 = 注册→预约→出席→付费→金额 + 预约率/出席率/付费率
  - SS/LP 唯一 KPI = 转介绍 leads 数（不参与预约→出席→付费转换阶段）
  - leads 数是唯一需要 4 口径拆分（CC/SS/LP/宽口）的指标
  - 配置位置: `projects/referral/config.json` 的 `channel_metric_scope`
- **数据源口径覆盖**: 仅 A1(当月快照) + A2(围场效率) 有 CC/SS/LP/宽口 4 口径齐全拆分
  - A5(历史月度趋势) LP+宽口合并为"其它"不可拆，CC/SS 可用
  - A3(明细表) 可通过"转介绍类型_新"列行级过滤口径
  - 配置位置: `projects/referral/config.json` 的 `data_source_registry`
- **工作日** = 每周除周三外均为工作日（周三权重 0.0），另扣除泰国国定假期
- **差额细化** = 目标差额可细化到：每人均摊/每日均摊/SKU 层面
- **页面术语说明** = 每个分析页面顶部须用小字展示该页涉及的代称/名词/定义/公式
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

## CC 人员排名算法

CC 排名算法详见 [docs/cc-ranking-spec.md](docs/cc-ranking-spec.md)（3类18维，composite_score = process×0.25 + result×0.60 + efficiency×0.15）

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

分析方法论框架详见 [docs/methodology.md](docs/methodology.md)（六步法 + 金字塔原理 + 转介绍演化模型 + 5-Why）

## 里程碑摘要

历史里程碑规划见 [docs/milestone-archive.md](docs/milestone-archive.md)

| 里程碑 | 日期 | 目标 | 成果 | 文件变更 |
|--------|------|------|------|---------|
| M28 | 2026-02-23 | 后端快速修复 | async→sync 18函数、Python 类型标注 46函数、README+CHANGELOG | 11 api files + 28 type files + 2 docs new |
| M29 | 2026-02-23 | fetcher 统一 | 34处重复 fetcher 统一为 swrFetcher | 34 components mod, api.ts mod |
| M30 | 2026-02-23 | God Class 拆分 | AnalysisEngineV2 2109→309行、6 Analyzer + context + utils | 9 files new, 1 file rewrite |
| M31 | 2026-02-23 | 测试体系 + CI/CD | pytest 105 case + vitest 42 case + GitHub Actions | 12 test files new, ci.yml new |
| M32 | 2026-02-23 | 性能+收尾 | useMemo 36处 + ESLint 防退化 + smoke 迁移 | 10 components mod, .eslintrc.json new |

## 已知问题与技术债

已解决条目见 [docs/tech-debt-archive.md](docs/tech-debt-archive.md)

| 序号 | 类别 | 描述 | 优先级 | 计划里程碑 | 备注 |
|------|------|------|--------|-----------|------|
| 2 | 渲染兼容 | 报告 Mermaid 图表在纯文本 Markdown viewer 中显示为代码块 | P2 | M5+ | 需要 HTML 模板支持 |
| 5 | 数据依赖 | CC 成长曲线需要历史数据串联（当前仅支持月度快照） | P2 | M8 | 需要 TimeSeries 数据源 |
| 7 | 前端组件 | dashboard/page.tsx 内容为空，需补充实际组件调用 | P2 | M10 | 运营面板 Dashboard 实现待补充 |
| 8 | 部署配置 | npm install 尚未在容器外执行，首次本地启动需手动运行 | P3 | M10 | Docker 内自动执行，本地开发流程待文档化 |
| 9 | 浏览器兼容 | WebMCP 目前使用 @mcp-b/global polyfill，等浏览器原生支持后可移除 | P3 | M11 | 当前可用，后续升级移除 polyfill |
| 11 | 文档过期 | datasources.py 注释"12源"过时需更新为"35源" | P3 | M10 | M12 已更新 CLAUDE.md 业务规则 |
| 19 | 新增技术债 | Cohort/Enclosure 数据源需要历史队列数据完整性验证 | P2 | M17 | M16 初版完成，数据质量优化 |
| 22 | 数据源补全 | D2/D3 围场对比 Excel 文件为空，需补充实际围场分布数据 | P2 | M18 | M17 发现，影响围场对比分析 |
| 23 | 数据依赖 | F4 渠道 MoM 流图依赖历史渠道趋势数据文件，当前仅一期数据 | P2 | M18 | M17 发现，需补充历史数据 |
| 24 | 数据依赖 | 历史对比体系（YoY/WoW）依赖 SQLite 快照数据充分性，需 >=2 周期数据 | P2 | M18 | M17 发现，需积累历史快照 |
| 28 | 新增技术债 | presentation.py fallback 数据仍为规则派生非真实 PDCA 系统对接 | P3 | M21+ | M18.3 新识别，影响汇报准确性（低优） |
| 30 | 全局 Skill 缺失 | 全局 Skill 骨架缺失通用版本，跨项目复用需手动复制（仅有项目级适配版） | P2 | M21+ | 本地化资产新识别，建议建立 ~/.claude/skills-lib/ 跨项目共用库 |
| 31 | DuckDB dual-track 后手 | DuckDB 替换 Parquet+pandas 的可行性评估已完成（82/100），待 M22+ 数据量增长后决策切换时机 | P3 | M22+ | M21 新识别，评估报告已完成，当前 Parquet 方案满足需求 |
| 32 | 代码质量 | SnapshotStore 每次 API 请求新建实例，SQLite 连接不共享，并发场景下非最优 | P2 | M33+ | WAL 模式缓解但不根治，建议改为单例 |
| 33 | 代码质量 | 24 个 API 路由文件重复 global _service + set_service() DI 反模式，无法 mock 测试 | P2 | M33+ | 可用 FastAPI Depends + app.state 重构 |
| 37 | 前端性能 | 47 页面全部 "use client"，无 RSC 收益，所有页面全量 JS 客户端加载 | P3 | M34+ | 内部工具可接受，规模扩大时考虑部分页面改 RSC |
| 41 | 性能 | 6 个 Loader 串行加载无并行，I/O bound 可用 ThreadPoolExecutor 加速 ~60% | P2 | M34+ | 需验证 pandas 线程安全 |
| 42 | 性能 | 18 个分析模块串行执行，其中 14 个无依赖可并行 | P2 | M34+ | 理论加速 3-4x，需验证 AnalyzerContext 线程安全 |
| 43 | 持久化 | snapshot_store cleanup() 从未自动触发，multi_source_digest ~125MB/年无限增长 | P2 | M33+ | 在 save_snapshot 末尾添加自动清理（保留 90 天） |

# ref-ops-engine

51Talk 泰国转介绍运营自动化分析引擎

## 技术栈
**后端：** Python 3.11+ FastAPI | **前端：** Node.js 18+ Next.js 14 (App Router) + React 18
**工具链：** uv (包管理/虚拟环境) + ruff (lint/format) | **配置：** pyproject.toml 单文件
**分析引擎：** Python AnalysisEngine (ROI/预测/异常检测) | **可视化：** Recharts + shadcn/ui
**通讯：** WebMCP Tools (8 个，AI Agent 可调) + 钉钉多通道推送 | **容器化：** Docker + docker-compose
**数据持久：** SQLite (快照存储) + Excel (遗留数据) | **国际化：** 中泰双语动态路由
**钉钉推送：** `scripts/dingtalk_engine.py`（多通道引擎）+ `key/dingtalk-channels.json`（6 群凭证）

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
- **一键启动**: 双击 `一键启动.command`（自动检测数据 → 下载 → 后端 → 前端 → 浏览器）
- **仅下载数据**: 双击 `下载BI数据.command`（交互式，支持选择看板）
- **安装依赖**: `uv sync --all-groups`（自动创建 .venv + 安装全部依赖组）
- **添加依赖**: `uv add <pkg>` | **添加开发依赖**: `uv add --group dev <pkg>`
- **Lint**: `uv run ruff check .` | **Format**: `uv run ruff format .`
- **Streamlit 面板（旧版）**: `uv run streamlit run app.py`
- **CLI 单次处理**: `uv run python src/main.py --once <file.xlsx>`
- **CLI 监控模式**: `uv run python src/main.py --watch`
- **测试**: `uv run pytest`
- **启动后端**: `DATA_SOURCE_DIR="$HOME/Desktop/转介绍中台监测指标" uv run uvicorn backend.main:app --host 0.0.0.0 --port 8100 --reload`
- **启动前端**: `cd frontend && npm run dev`（端口 3100，rewrites 到 8100）
- **崩溃日志摘要**: `curl -s http://localhost:8100/api/system/error-log/summary`
- **钉钉日报推送**: `uv run python scripts/dingtalk_daily.py --engine --confirm`（全 6 通道，需 --confirm 发正式群）
- **钉钉指定通道**: `uv run python scripts/dingtalk_daily.py --engine --channel cc_all --confirm`
- **钉钉强制重发**: `uv run python scripts/dingtalk_daily.py --engine --force --confirm`（忽略幂等检查）
- **钉钉 dry-run**: `uv run python scripts/dingtalk_daily.py --engine --dry-run`（只生成不发送）
- **钉钉连通测试**: `uv run python scripts/dingtalk_daily.py --engine --test`
- **Lark 未打卡跟进**: `uv run python scripts/lark_bot.py followup --channel cc_all --confirm`（需 --confirm 发正式群）
- **Lark dry-run**: `uv run python scripts/lark_bot.py followup --dry-run`（只生成图片不发送）
- **Lark 连通测试**: `uv run python scripts/lark_bot.py --test`
- **运营日报API**: `curl http://localhost:8100/api/report/daily`（11区块完整JSON）
- **运营摘要API**: `curl http://localhost:8100/api/report/summary`（钉钉消费）
- **钉钉日报推送**: `uv run python scripts/dingtalk_report.py --dry-run`（预览）/ `--confirm`（正式）
- **手动写入快照**: `curl -X POST http://localhost:8100/api/report/snapshot`
- **三档目标推荐**: `curl http://localhost:8100/api/config/targets/202603/recommend`

## 通知推送防错规则（全平台统一）

| 规则 | 说明 | 防线 |
|------|------|------|
| **🔴 正式群防护** | 所有推送默认 test/sandbox，发正式群必须 `--confirm` | 代码层 hard deny（钉钉+Lark 统一） |
| **幂等推送** | 同日同通道不重复发送，用 `--force` 覆盖 | `_is_already_sent()` 读 `notification-log.jsonl` |
| **频率限制** | 钉钉 20 条/分钟，消息间隔 ≥5s，通道间隔 ≥5s | `time.sleep(5)` |
| **系统繁忙重试** | `errcode: -1` 自动重试 2 次（5s/10s 退避） | `_send_dingtalk()` 内置重试 |
| **图床双 fallback** | freeimage.host → sm.ms(s.ee)，两个都失败才降级文本 | `_upload_image()` 链式调用 |
| **凭证隔离** | `key/dingtalk-channels.json` + `key/lark-channels.json`（.gitignore），禁止硬编码 webhook/secret | 凭证 SOP |
| **后端告警禁用** | `_alert_empty_data()` 仅记日志不推群 | `data_manager.py` L173 |

## 崩溃自动收集系统（SEE 闭环）

前端运行时错误自动收集到 `output/error-log.jsonl`，供下次 Claude 会话消费。

**链路**: ErrorBoundary + window.onerror + SWR API 错误 → `errorLogger` → POST `/api/system/error-log` → `output/error-log.jsonl`
**去重**: 前端 fingerprint 5 分钟窗口去重 + 后端 24h 指纹去重
**消费**: `GET /api/system/error-log/summary` 返回按频次排序的结构化 bug 列表

**Claude 修复 bug 工作流**:
1. 读取 `output/error-log.jsonl` 或调用 `curl http://localhost:8100/api/system/error-log/summary`
2. 按 `source_file` 定位崩溃源文件，按 `stack_preview` 理解根因
3. 修复后调用 `DELETE /api/system/error-log` 清空已修复的日志
4. 用户说"修 bug" = 先读崩溃日志，按优先级（count 降序）逐个修复

## Slide 组件三态铁律
- 所有 Slide 组件（`frontend/components/slides/*.tsx`）必须处理 **loading/error/empty** 三态
- `useSWR` 必须解构 `error`，API 失败时显示错误提示覆盖而非静默空白
- 新增 Slide 组件不含 error 态 = 不合格，`scripts/check-slide-states.sh` 自动检测

## 去硬编码政策（SEE 铁律）
- **有场景可配 = 禁止硬编码**，与变化频率无关
- 所有业务阈值/权重/映射必须从 `config.json` 或 `dingtalk-channels.json` 读取
- 已配置化：围场-角色映射 / 角色列名 / 团队前缀检测 / 质量评分权重 / 围场加权 / 无效名称集 / 打卡率阈值 / 达成率阈值
- 配置读取函数：后端 `_get_config()` (lazy load + cache) / 前端 `useCheckinThresholds` hook / engine `self.defaults`
- 布局数值（行高/间距/字号）不算业务硬编码，可保留

## 双语输出政策
- **所有面向用户的输出**（图片/Markdown/告警）必须泰中双语：泰文为主、中文为辅
- 图片：泰文主行（大字深色）+ 中文副行（小字灰色 `_C_MUTED`），间距 ≥0.25
- 表头：双行模式（泰文白字 + 中文灰字），禁止括号挤压模式
- Markdown：双行标题 `### 泰文\n### 中文`
- 图例：斜杠 `ผ่าน/达标`
- 品牌名 CC/SS/LP/USD 不翻译
- 文案集中管理：`TH_STRINGS` 字典（`{"th": "...", "zh": "..."}`），禁止散落硬编码

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

## SEE Design System v2.0（2026-03-25 落地）
- **字体**：Space Grotesk（标题/EN）+ Inter（正文/EN）+ IBM Plex Sans Thai（TH）+ PingFang SC/Noto Sans SC（ZH）
- **品牌标志**：递归环 Recursive Loop（`public/brand-mark.svg`），Topbar 右侧 18px
- **色板预设**：当前用 51Talk preset（金黄 `#FFD100` + 深蓝 `#1B365D`）
- **渐进式披露**：2 层默认（L0 扫视 + L1 副标题/tooltip），L2 按需。BrandDot 组件触发 L1
- **Token 源**：`~/.claude/design-tokens/`（全局 CSS token 文件 + 5 套预设 + init-tokens.sh）
- **组件语义类**：`globals.css` 底部定义 `card-base/btn-primary/input-base/state-*` 等，组件统一引用
- **图表色板**：`frontend/lib/chart-palette.ts`（共享常量，Recharts 消费）
- **百分比格式**：统一用 `formatRate(value)`，null/NaN→"—"，禁止直接 `.toFixed()%`

## Slide 设计体系 SSoT 规则
- Slide 表格样式统一引用 `globals.css` 中的 `slide-*` Design Token 类（`slide-thead-row/slide-th/slide-td/slide-row-*/slide-tfoot-row`）
- **禁止在 Slide 组件中内联 `style={{ color/backgroundColor }}`**，所有视觉属性从中央 CSS 类继承
- 修改表头颜色/间距/字号 → 改 `globals.css` 一处，全部 Slide 自动生效
- Tailwind `bg-[var(--xxx)]` 在 JIT 模式下对 CSS 变量编译不稳定，Slide 组件统一用 CSS class 而非 Tailwind arbitrary value
- 新增 Slide 组件不引用 `slide-*` class = 不合格
- **CSS 优先级铁律**：Tailwind Preflight 对 `th/td` 有默认样式（`color: inherit` + 特定 specificity），自定义 class 必须用 `.parent th { ... !important }` 后代选择器确保覆盖。当前 `globals.css` 已用 `.slide-thead-row th { color: #fff !important }` 模式

## API 契约防漂移规则
- 前端 `useSWR<T>` 泛型 T 必须精确匹配后端 `response_model` 类型
- 后端返回 `list[Item]` → 前端用 `useSWR<Item[]>`，**禁止** `data?.items` 包装假设
- 后端返回 `dict` → 前端用 `useSWR<ResponseType>`，字段名逐字段匹配后端 Pydantic 模型
- 新建 Slide/组件前先 `curl` 目标端点确认实际返回格式，不依赖推测
- 字段名 SSoT = 后端 Pydantic 模型（`backend/models/*.py`），前端 interface 必须跟随

## 指标矩阵系统

配置驱动的全维度 KPI 指标矩阵。CC 为不可变超集（33 项），SS/LP 为可动态配置的子集。

**架构**: `config.json indicator_registry` (33 项定义) → `indicator_matrix` (CC/SS/LP 激活列表) → Frontend `useIndicatorMatrix()` hook → Dashboard 过滤
**持久化**: SS/LP 用户自定义存入 `config/indicator_matrix_override.json`（与 `targets_override.json` 同模式）
**8 类指标**: result(结果) / achievement(达成) / process(过程) / efficiency(效率) / process_wide(宽口过程) / conversion(转化) / service_pre_paid(服务-付费前外呼) / service_post_paid(服务-付费后外呼)
**API**: `GET /api/indicator-matrix/registry` | `GET /api/indicator-matrix/matrix` | `PUT /api/indicator-matrix/matrix/{role}` | `POST /api/indicator-matrix/matrix/{role}/reset`
**完整性检查**: `bash scripts/check-indicator-matrix.sh`
**前端页面**: `/settings` (编辑卡片) | `/indicator-matrix` (总览页面)

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
- **围场×岗位负责边界**（可配置，禁止硬编码）:
  - 0-90天已付费学员 → **CC** 负责：全维度全时间转换（full_funnel）
  - 91-120天已付费学员 → **SS** 负责：转介绍leads数 + 过程指标（触达率/打卡率）
  - 121天+已付费学员 → **LP** 负责：转介绍leads数 + 过程指标（触达率/打卡率）
  - 配置位置: `projects/referral/config.json` 的 `enclosure_role_assignment`
- **口径×指标归属规则**:
  - CC（full_funnel）= 注册→预约→出席→付费→金额 + 全部转化率
  - SS/LP（leads_and_process）= 转介绍leads数 + 过程指标（触达率/打卡率）+ **leads→CC转化率**（跨岗效率参考，非自身KPI）
  - 宽口（leads_only）= 仅转介绍leads数
  - SS/LP "转化率" = SS/LP带来的leads被CC转化为付费的比率（跨岗效率），不是SS/LP自身的销售漏斗转化
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

## 配置 SSoT 规则（铁律）
- **围场-岗位配置唯一真相源**: `config/enclosure_role_override.json`（Settings 页面写入），后端 `_get_wide_role()` 优先读此文件
- **三级 fallback**: override 文件 → config.json `enclosure_role_wide` → 硬编码 `_WIDE_ROLE_FALLBACK`
- **前端 `useWideConfig()` 从 API `/api/config/enclosure-role` 读取**，禁止直接读 localStorage（Settings 迁移后已删除）
- **新增配置项时必须对齐三方**：Settings UI 写入路径 = API GET 读取路径 = 后端 consumer 读取路径。三方不一致 = SSoT 违规
- **渠道归因必须消费 Settings 配置**：`attribution_engine.py` 接收 `wide_role_config` 参数（围场→角色映射），从 `enclosure_role_override.json` 读取。禁止硬编码渠道列表或 share=1.0。检查脚本：`bash scripts/check-channel-attribution.sh`
- **渠道归因 6 维度**：CC窄/SS窄/LP窄（窄口按绑定关系）+ CC宽/LP宽/运营宽（宽口按围场→角色配置拆分）。D2 revenue 按参与数占比分摊，per-围场分组以反映 revenue 密度差异
- **数据地域过滤**: DataManager `_filter_thai_only()` 在数据加载后统一过滤非 TH- 前缀团队，全站 API 自动生效。禁止在单个 API 中手动过滤

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
| M33 | 2026-03-26 | 运营分析报告引擎 | 11区块报告+8维环比+三因素分解+杠杆矩阵+三档目标+钉钉推送 | 23 files new/mod, +2900 lines |

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
| 37 | 前端性能 | 47 页面全部 "use client"，无 RSC 收益，所有页面全量 JS 客户端加载 | P3 | M34+ | 内部工具可接受，规模扩大时考虑部分页面改 RSC |
| 38 | 开发工具链 | Next.js 15 + React 19 下 webpack dev server 的 ErrorBoundary（class 组件）触发 HMR 崩溃 | P1 | 已修复 | 切换 turbopack（`next dev --turbo`）解决；debug 规则沉淀至 `~/.claude/rules/nextjs-debug.md` |

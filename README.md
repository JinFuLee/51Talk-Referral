# ref-ops-engine

51Talk 泰国转介绍运营自动化分析引擎 — 一站式数据驱动决策平台。

## 快速概览

| 项 | 说明 |
|----|------|
| **用途** | 自动化分析转介绍运营数据，生成战术/战略双版本报告，支持AI根因诊断 |
| **架构** | 后端 FastAPI + 前端 Next.js 14 + 分析引擎 AnalysisEngineV2 |
| **数据源** | 35 个 Loader（涵盖销售/服务/客户/KPI 全域） |
| **核心特性** | 币种统一、双差额体系、5-Why 根因分析、What-if 模拟、汇报沉浸演示 |

## 技术栈

**后端**
- Python 3.9+ FastAPI | 7 Router | 30+ endpoints
- 分析引擎 AnalysisEngineV2（ROI/预测/异常检测）
- SQLite 快照存储 + Parquet 缓存

**前端**
- Node.js 18+ Next.js 14 (App Router)
- React 18 + Recharts + shadcn/ui
- Zustand 状态管理 | WebMCP Tools (8 个)
- 中泰双语 i18n

**基础设施**
- Docker + docker-compose
- 国际化动态路由 `[locale]`
- 容错降级系统

## 快速启动

### 一键启动（推荐）
```bash
# macOS：双击 "一键启动.command"
# 自动执行：数据检测 → 下载 → 后端启动 → 前端启动 → 浏览器打开
```

### Docker 容器启动
```bash
docker-compose up
# 后端运行在 http://localhost:8000
# 前端运行在 http://localhost:3000
```

### 手动启动

**后端**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**前端**
```bash
cd frontend
npm install
npm run dev
```

### 其他命令
- **仅下载数据**: 双击 `下载BI数据.command`
- **CLI 单次处理**: `python src/main.py --once <file.xlsx>`
- **CLI 监控模式**: `python src/main.py --watch`
- **测试**: `pytest`

## 目录结构

```
ref-ops-engine/
├── backend/                 # FastAPI 服务
│   ├── main.py             # 入口
│   ├── routers/            # 7 Router（数据/分析/报告/权限/系统/WebMCP）
│   ├── core/               # 核心模块（35 Loader、分析引擎、快照存储）
│   ├── services/           # AnalysisService
│   └── requirements.txt     # 依赖
│
├── frontend/               # Next.js 前端
│   ├── app/[locale]/       # 12 页面（中泰双语）
│   ├── components/         # 43 组件（表格/图表/表单/布局）
│   ├── lib/                # 工具库（api/types/hooks/utils）
│   └── package.json
│
├── shared/                 # 前后端共享类型
├── src/                    # 原 Python 分析核心（M1-M8 代码）
├── docs/                   # 项目文档
├── docker-compose.yml      # 容器编排
└── key/                    # 凭证存储 (.gitignore)
```

## 数据流

```
Excel 数据源
    ↓
35 个 Loader（Xlsx/Ops/Leads/Cohort/KPI/Orders/ROI...）
    ↓
AnalysisEngineV2（20 分析模块、5 跨源联动）
    ↓
FastAPI（28 endpoint、Parquet 缓存）
    ↓
Next.js Frontend（35 图表、19 页面、i18n）
    ↓
报告/仪表板/汇报演示
```

## API 概览

| 分类 | 端点 | 功能 |
|------|------|------|
| **分析** | `/api/analysis/summary` | 月度汇总 + 双差额体系 |
| | `/api/analysis/ranking` | CC/SS/LP 排名（18 维） |
| | `/api/analysis/impact-chain` | 效率→收入损失链 |
| | `/api/analysis/what-if` | What-if 模拟器 |
| | `/api/analysis/root-cause` | 5-Why 根因分析 |
| **报告** | `/api/reports/generate` | Markdown 报告生成 |
| | `/api/reports/ai` | AI 增强报告（Gemini） |
| **配置** | `/api/config/kpi` | KPI 配置管理 |
| | `/api/config/exchange-rate` | 汇率配置（USD:THB = 1:34） |
| **快照** | `/api/snapshots/daily` | 日级快照查询 |
| | `/api/snapshots/historical` | 历史对比（YoY/WoW/MoM） |
| **数据源** | `/api/datasources/status` | 35 源加载状态 |

## 指标体系

### 数值类指标（8 项展示）
1. 当前实际值
2. 本月目标
3. 目标绝对差 (`actual - target`)
4. 时间进度差 (`actual/target - time_progress`)
5. 达标需日均
6. 追进度需日均
7. 效率提升需求
8. 当前日均

### 效率类指标（5 项展示）
1. 当前实际率
2. 本月目标率
3. 目标差
4. 损失链量化（效率gap → 收入损失）
5. 根因标注

## 核心业务术语

| 术语 | 定义 |
|------|------|
| **CC** | 前端销售 |
| **SS/EA** | 后端销售（两种数据别名） |
| **LP/CM** | 后端服务（两种数据别名） |
| **窄口** | 员工链接（高质量） |
| **宽口** | 学员链接（低质量） |
| **围场** | 付费后的天数分段（14段 M0~M12+，每段约30天） |
| **有效学员** | 已付费用户（次卡 > 0 且有效期内） |
| **转介绍用户** | 转介绍注册人数 = leads 数 |
| **触达率** | 有效通话(>=120s)学员 / 有效学员 |
| **参与率** | 带来>=1注册的学员 / 有效学员 |
| **打卡率** | 转码且分享的学员 / 有效学员 |
| **带新系数** | B注册数 / A学员数 |
| **THCC** | 泰国前端销售团队 |
| **工作日** | 周一二四五六日工作，周三权重 0（不开班） |

完整术语表参见 `docs/glossary.md`。

## 开发指南

### 代码规范
- **类型注解必须**（Python 3.9+ 类型提示、TypeScript 严格模式）
- **4 空格缩进**，遵循 PEP 8（Python）、ESLint（JavaScript）
- **数据结构**：
  - Excel 列映射定义在 `src/config.py` 的 `COLUMN_MAPPING`
  - 月度目标定义在 `src/config.py` 的 `MONTHLY_TARGETS`
  - 后端 API 返回 `{usd, thb}` 双字段

### 常见任务

**添加新的分析模块**
1. 创建 `backend/core/loaders/{feature}_loader.py` 加载数据
2. 在 `backend/core/analysis_engine_v2.py` 中添加 `_analyze_{feature}()` 方法
3. 在 `backend/api/analysis.py` 中新增 endpoint 暴露接口
4. 前端 `frontend/components/` 创建图表组件消费数据

**添加新的页面**
1. 创建 `frontend/app/[locale]/{feature}/page.tsx`
2. 在 `frontend/lib/types/analysis.ts` 定义类型
3. 注册到 `frontend/lib/navigation.ts` 导航表
4. 后端补充支持端点

**修改币种/汇率显示**
- 使用 `frontend/lib/utils.ts` 的 `formatRevenue(usd, rate)` 函数
- 汇率配置存储在 `config/exchange_rate.json`

### 关键约定
- **T-1 数据**：今天处理的是昨天的数据
- **时间进度计算**：周六日权重 1.4x，周三权重 0.0
- **双版本报告**：运营版（战术）+ 管理层版（战略）
- **状态标签**：缺口 >0% = 🟢 持平 | -5%~0% = 🟡 落后 | <-5% = 🔴 严重

## 部署

```bash
# 构建镜像
docker build -f backend/Dockerfile -t ref-ops-backend .
docker build -f frontend/Dockerfile -t ref-ops-frontend .

# 启动服务
docker-compose up
```

## 贡献指南

1. 新功能创建分支 `feature/{name}`
2. 遵循代码规范，通过类型检查 (`tsc` / `py_compile`)
3. 测试覆盖 (`pytest` / `next build`)
4. 提 PR，等待 QA 验收

## 技术债与规划

详见 `CLAUDE.md` 的"已知问题与技术债"及"里程碑规划"章节。

关键优先级：
- **P1**：业绩计算规则、币种统一
- **P2**：时间对比体系、影响链引擎、数据源补全
- **P3**：WebMCP polyfill 移除、DuckDB 迁移评估

## 许可证

内部项目

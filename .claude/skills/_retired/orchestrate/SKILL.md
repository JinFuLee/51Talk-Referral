---
name: orchestrate
description: 里程碑规划与任务分解 — 基于 ref-ops-engine roadmap.md 和 v6.0 团队架构，生成可直接执行的 TL/MK 任务包
when_to_use: 用户说"规划下一个里程碑"/"拆解任务"/"新里程碑开始"时触发；或主对话感到"不知道怎么拆"时自行触发
version: 1.0.0
---

# /orchestrate — 里程碑规划（ref-ops-engine 适配版）

## 项目上下文

- **里程碑命名规范**：`M{数字}` 或 `M{数字}.{子版本}`（如 M18、M18.2、M18.3）
- **roadmap.md 路径**：`docs/roadmap.md`（权威源）
- **CLAUDE.md 路径**：项目根目录 `CLAUDE.md`（里程碑摘要表 + 技术债表）
- **团队架构**：v6.0（见全局 CLAUDE.md Agent 架构章节）
- **核心分层**：
  - `backend/` — Python FastAPI（7 routers，35 Loaders，20 分析模块）
  - `frontend/` — Next.js 14（43+ 组件，12+ 页面）
  - `src/` — 原始分析引擎（M1-M8 遗留，被 backend 调用）
  - `.agents/` — 项目级 agent 定义

## 核心行为

### 步骤 1：现状读取
1. Read `docs/roadmap.md` — 提取最近已完成 M 和规划中 M
2. Read `CLAUDE.md` 技术债表 — 识别 P1 未解决债务（优先纳入规划）
3. 识别本次里程碑目标（用户输入 or 从 roadmap 规划中章节读取）

### 步骤 2：依赖图分析（项目特化）
项目典型依赖模式：
```
后端 Loader → 后端分析模块 → API endpoint → 前端组件 → 前端页面
```
- 有后端变更 → 前端必须同步更新（不可并行写，可并行开发后集成）
- 新增 Loader → 必须注册到 `analysis_engine_v2.py` 的 `_load_all_sources()`
- 新增 API → 必须在 `backend/main.py` 注册 router
- 新增页面 → 必须在 `frontend/components/layout/NavSidebar.tsx` 注册入口

### 步骤 3：Tag 划分原则（项目特化）
| Tag | 适用场景 |
|-----|---------|
| `backend` | Loader/分析模块/API endpoint 变更 |
| `frontend` | React 组件/页面/类型定义变更 |
| `data` | Excel 数据源/SQLite schema/Loader 修复 |
| `meta` | CLAUDE.md/roadmap/文档/配置变更 |
| `qa` | 端到端验证（末位执行） |

热点文件（多 tag 涉及时 → Solo 模式）：
- `backend/core/analysis_engine_v2.py`（分析引擎核心）
- `frontend/components/layout/NavSidebar.tsx`（导航注册）
- `CLAUDE.md`（里程碑摘要 + 技术债）

### 步骤 4：输出格式（结构化，可直接 spawn）
```
## {M编号} 规划

### 目标
{1-2句核心目标}

### 依赖图
{ASCII 图：展示 tag 间依赖}

### Tag 划分
| Tag | MK 数量 | 核心任务 | 依赖 |
|-----|---------|---------|------|
| backend | 2 | ... | 无 |
| frontend | 2 | ... | backend |
| qa | 1 | E2E 验证 | backend+frontend |

### 每个 TL 的任务描述包
{TL-backend: ...}
{TL-frontend: ...}
{TL-qa: ...}

### 注意事项
- 热点文件：{列表}
- 双语要求：{中泰 i18n 新增键数量估算}
- PM Pipeline：里程碑完成后自动触发 mk-meta-finalize-haiku
```

## 与全局 Skill 的关系
- 全局版路径：~/.claude/skills/orchestrate/SKILL.md（**当前不存在，本文件为项目首版**）
- 本适配版在 ref-ops-engine 项目内生效，补充了项目特有的依赖图分析和 Tag 规范

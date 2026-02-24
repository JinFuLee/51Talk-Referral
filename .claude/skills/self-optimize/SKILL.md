---
name: self-optimize
description: 基于项目实际使用数据，自动分析 Claude 工作模式并调优规则/模板/Skill — 适配 ref-ops-engine 特有的 observe 数据路径和优化目标
when_to_use: 当发现反复触发同类错误、token 消耗明显偏高、MK 超时或质量不稳定时触发
version: 1.0.0
---

# /self-optimize — 自动调优（ref-ops-engine 适配版）

## 项目上下文

- **技术栈**：Python FastAPI 后端 + Next.js 14 前端 + SQLite 快照 + Excel 数据源
- **核心分析引擎**：`backend/core/analysis_engine_v2.py`（35 Loader，20 分析模块）
- **业务域**：51Talk 泰国转介绍运营，CC/SS/LP 角色，中泰双语
- **已知高频错误类型**：
  - `as any` / `as unknown as` TypeScript 类型绕过
  - mock fallback 未清除（参见 M20 技术债 #21）
  - API 字段名不一致（loader → engine → router → 前端）

## 核心行为

### 步骤 1：数据采集
1. Read `docs/roadmap.md` — 统计最近 3 个里程碑的 QA 通过率趋势
2. Read `CLAUDE.md` 技术债表 — 统计 P1/P2 未解决数量、重复出现类别
3. Grep `backend/` 搜索 `as any` / `as unknown as` / `pass  #` — 统计存量技术债位置
4. Grep `frontend/` 搜索 `isMock` / `mock fallback` — 统计 mock 降级组件数量
5. Grep `backend/core/loaders/` 搜索异常处理模式一致性

### 步骤 2：模式识别（项目特化）
分析以下项目特有维度：
- **字段映射一致性**：`order_loader.py` → `analysis_engine_v2.py` → API router → 前端组件
- **Loader 健壮性**：35 个 Loader 中有多少实现了 3 级降级（真实数据 → 部分数据 → 空安全返回）
- **双语覆盖率**：中泰 i18n 键的覆盖情况（对比 M3.6 的 147 键基准）
- **MK 命名规范遵从率**：最近里程碑 Co-Authored-By 是否符合 `mk-{tag}-{模型}` 格式

### 步骤 3：生成优化建议
按优先级输出（最多 5 条）：
- **P0 立即修复**：影响数据正确性的问题（如字段映射错误）
- **P1 下一里程碑**：技术债清理计划（含具体文件位置）
- **P2 规则层优化**：CLAUDE.md 防错认知条目更新建议

### 步骤 4：自主修复（仅限低风险）
**允许直接修复（无需确认）**：
- CLAUDE.md 技术债状态更新（已解决标注）
- .gitignore 遗漏项补充
- 命名不一致的文档注释

**必须确认后执行**：
- 任何 `.py` / `.tsx` / `.ts` 代码变更
- 数据库 schema 或 SQLite 结构变更

## 与全局 Skill 的关系
- 全局版路径：~/.claude/skills/self-optimize/SKILL.md（**当前不存在，本文件为项目首版**）
- 本适配版在 ref-ops-engine 项目内生效
- 后续若全局版创建，以全局版框架为主，本文件补充项目特化步骤

---

## 阶段四：外部 Skill/Agent 发现（项目层）

> 基于项目技术栈和功能需求，搜索项目特化型外部资源。

### 触发条件
- /self-optimize 执行时自动附带（可通过参数 `--skip-discover` 跳过）
- 项目 CLAUDE.md 技术债表新增条目时建议触发

### 搜索策略

#### 项目上下文提取（自动）
执行前先 Read 项目 CLAUDE.md，提取：
1. **技术栈**：Python FastAPI / Next.js 14 / SQLite / Docker / Recharts / shadcn-ui
2. **业务域**：转介绍运营、数据分析、中泰双语
3. **当前技术债**：从"已知问题与技术债"表提取 P1/P2 条目
4. **已有 Skill 清单**：Glob `.claude/skills/` 列出已安装的

#### 搜索关键词（项目特化，基于上下文动态生成）
- `claude-code {技术栈关键词} skill`（如 `claude-code fastapi skill`）
- `claude-code {功能需求} skill`（如 `claude-code i18n localization skill`）
- `claude-code {技术债相关} skill`（如 `claude-code sqlite migration tool`）
- `claude-code data-analysis visualization skill`
- `claude-code excel xlsx processing skill`

#### 搜索源
同全局版 + 额外关注：
- 搜索与项目技术栈匹配的 GitHub repos
- 搜索解决当前技术债的工具/Skill

#### 质量过滤
同全局版基础过滤 +：

| 额外维度 | 要求 |
|----------|------|
| 技术栈匹配 | 必须与项目技术栈兼容 |
| 功能不重叠 | 不与已有项目 Skill 功能重复 |
| 解决实际痛点 | 优先匹配技术债清单 |

### 输出格式

```markdown
## 项目 Skill 发现报告（ref-ops-engine）

### 搜索上下文
- 技术栈：{提取结果}
- 未覆盖需求：{识别的缺口}
- 匹配技术债：{P1/P2 条目}

### 推荐安装
| Skill | 来源 | 匹配需求 | 安装方式 |
|-------|------|---------|---------|
| | | | 复制到 .claude/skills/{name}/ 并适配 |

### 关注列表
| Skill | 备注 |
|-------|------|

### 与全局 base- 版本的关系
{如果推荐的 Skill 在全局已有 base- 版本，说明是否需要项目特化覆盖}
```

### 安装决策
- 推荐安装项需用户确认（AskUserQuestion）
- 安装到 `.claude/skills/{name}/SKILL.md`（项目级）
- 如果 Skill 具有跨项目通用性，建议同时创建全局 `base-{name}` 版本（上行推广）

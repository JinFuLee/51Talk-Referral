# 项目 Skill 注册表 — ref-ops-engine

> 项目级 Skill 优先于同名全局 Skill 加载。维护此表确保 Skill 查找确定性。

## 冲突解决记录（2026-02-22 审查执行）

排查结论：5 个曾标记"暂不存在全局版"的 Skill，经完整扫描确认全局文件均存在（`~/.claude/skills/` 下有真实文件），
来源为用户自建（非插件注入），且均针对 thaihaozao.com 或通用 v6.0 架构。3 个插件（`github@claude-plugins-official`、
`skills-powerkit@claude-code-plugins-plus`、`universal-dev-standards@asia-ostrich`）均不含这 5 个 Skill。

| Skill | 全局文件路径 | 全局版 applies-to | 可控性 | 执行操作 | 状态 |
|-------|------------|----------------|--------|---------|------|
| self-optimize | `~/.claude/skills/self-optimize/` → `base-self-optimize/` | All Claude Code projects（依赖 sniffly）| 可控（用户自建）| 重命名 → `base-self-optimize`，`name:` 字段同步更新 | 已解决 |
| orchestrate | `~/.claude/skills/orchestrate/` → `base-orchestrate/` | Agent v6.0 architecture, all projects | 可控（用户自建）| 重命名 → `base-orchestrate`，`name:` 字段同步更新 | 已解决 |
| uiux-design | `~/.claude/skills/uiux-design/` → `base-uiux-design/` | All frontend/UI tasks（56条通用定律）| 可控（用户自建）| 重命名 → `base-uiux-design`，`name:` 字段同步更新 | 已解决 |
| deploy | `~/.claude/skills/deploy/`（退役占位，指向 base-deploy）| thaihaozao.com, Vercel/Next.js 16 | 可控（用户自建）| 退役重定向 → 已建 `~/.claude/skills/base-deploy/`（跨项目基线） | 已解决（base-deploy 为新基线）|
| db-migration | `~/.claude/skills/db-migration/`（退役占位，指向 base-db-migration）| thaihaozao.com, Supabase/Next.js/TS | 可控（用户自建）| 退役重定向 → 已建 `~/.claude/skills/base-db-migration/`（跨项目基线） | 已解决（base-db-migration 为新基线）|

**质量对比评分**（执行决策依据）：

| Skill | 全局通用性 | 全局内容质量 | 项目针对性 | 决策 |
|-------|-----------|------------|-----------|------|
| orchestrate | 5/5（9步完整流程，跨项目）| 5/5（完整 v6.0 SOP）| 5/5（roadmap 路径+Tag 规范）| 全局→`base-orchestrate`（基线），项目版保留原名 |
| self-optimize | 4/5（sniffly 工具，跨项目）| 4/5（7维度+规则库）| 4/5（adapt 本项目路径+错误模式）| 全局→`base-self-optimize`（基线），项目版保留原名 |
| uiux-design | 5/5（56条定律，跨项目，与项目版互补）| 5/5（WCAG+性能+AI时代）| 5/5（shadcn+中泰双语+KPI规范）| 全局→`base-uiux-design`（基线），项目版保留原名 |
| deploy | 1/5（硬编码 thaihaozao.com）| 3/5（完整但项目锁定）| 5/5（Docker+docker-compose）| 退役占位保留，另建 `base-deploy`（通用基线 5步流程）；项目版保留原名 |
| db-migration | 2/5（Supabase 特化，非通用）| 4/5（内容完整但平台锁定）| 5/5（SQLite 原生，SnapshotStore）| 退役占位保留，另建 `base-db-migration`（通用基线 6步流程）；项目版保留原名 |

## 项目级 Skill（优先加载，项目特化）

| Skill | 路径 | 用途 | 来源类型 | 全局文件 |
|-------|------|------|---------|---------|
| pm-sync | `.claude/skills/pm-sync/` | 项目进度同步，读取 roadmap.md + CLAUDE.md 输出摘要 | 项目独有 | 无 |
| self-optimize | `.claude/skills/self-optimize/` | 基于项目使用数据自动分析 + 调优（适配本项目 observe 路径和错误模式）| 项目特化 | 无（系统内置通用版已被本文件覆盖）|
| orchestrate | `.claude/skills/orchestrate/` | 里程碑规划与任务分解（适配 roadmap.md 路径、v6.0 团队架构、项目 Tag 规范）| 项目特化 | 无（系统内置通用版已被本文件覆盖）|
| uiux-design | `.claude/skills/uiux-design/` | UI/UX 设计规范（适配 shadcn/ui + Recharts + 中泰双语 + 运营数据可视化规范）| 项目特化 | 无（系统内置通用版已被本文件覆盖）|
| deploy | `.claude/skills/deploy/` | 部署流程（Docker + docker-compose，非标准 PaaS/Vercel）| 项目特化 | `~/.claude/skills/base-deploy/`（跨项目基线，项目版完全覆盖）|
| db-migration | `.claude/skills/db-migration/` | 数据库变更（SQLite 原生，非 Postgres/Prisma 迁移）| 项目特化 | `~/.claude/skills/base-db-migration/`（跨项目基线，项目版完全覆盖）|

## 全局 Skill（项目内直接使用，无需适配）

以下全局 Skill 在本项目无项目差异，直接调用全局版（`~/.claude/skills/` 下有真实文件）：

| Skill | 全局路径 | 用途 | 不需适配的理由 |
|-------|----------|------|--------------|
| modern-python | `~/.claude/skills/modern-python/` | Python 最佳实践 | 通用规范，本项目 Python 3.9+ 完全适用 |
| next-best-practices | `~/.claude/skills/next-best-practices/` | Next.js 最佳实践 | 通用规范，本项目 Next.js 14 完全适用 |
| postgres-best-practices | `~/.claude/skills/postgres-best-practices/` | Postgres 规范 | 本项目不用 Postgres，仅参考部分查询优化思路 |
| react-best-practices | `~/.claude/skills/react-best-practices/` | React 最佳实践 | 通用规范，本项目 React 18 完全适用 |
| static-analysis | `~/.claude/skills/static-analysis/` | 静态分析 | 通用工具链，无项目差异 |

注：原表中 `init-project` 已从列表移除，该全局 Skill 文件实际不存在于 `~/.claude/skills/`（扫描确认）。

## 全局设计法则引用

| 文件 | 路径 | 与项目的关系 |
|------|------|------------|
| uiux-design-laws | `~/.claude/contexts/uiux-design-laws.md` | 全局设计法则，`/uiux-design` Skill 的上游输入 |
| deploy-sop | `~/.claude/contexts/deploy-sop.md` | 通用部署 SOP，`/deploy` Skill 参考但已被项目版覆盖 |
| team-agent-v6-detail | `~/.claude/contexts/team-agent-v6-detail.md` | v6.0 团队架构详细规则，`/orchestrate` Skill 依赖 |
| pm-pipeline | `~/.claude/contexts/pm-pipeline.md` | PM Pipeline agent 定义（重定向至权威源 `.agents/pm-pipeline.md`）|

## 维护说明

1. **新增 Skill**：先判断是否有全局文件版（Glob `~/.claude/skills/{name}/SKILL.md`）→ 若有则评估是否需要项目适配 → 若项目特化则创建 `.claude/skills/{name}/SKILL.md` → 注册到此表
2. **更新周期**：每个里程碑完成后检查一次，确认适配版与项目现状仍匹配
3. **优先级规则**：项目级 Skill 文件完全覆盖同名全局 Skill（就近原则，不合并，项目版生效）
4. **退役规则**：全局文件版创建后，评估项目版是否仍需独立维护；若无项目差异，删除项目版并在此表移至"全局 Skill"列
5. **冲突判断**：只有 `~/.claude/skills/{name}/SKILL.md` 真实存在时才构成文件级冲突；系统内置通用名称（无文件）被项目文件版自动覆盖，无需额外操作

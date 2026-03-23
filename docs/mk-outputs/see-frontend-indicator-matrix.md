# SEE 前端矩阵集成 + CLAUDE.md 沉淀

**任务**: SEE-3 前端矩阵集成 + CLAUDE.md 模式沉淀
**状态**: 完成

## 变更摘要

### 任务 A: 总览 Dashboard 矩阵集成

**文件**: `frontend/app/page.tsx`

新增能力：
1. **岗位视角筛选器** (`RoleFilter` 组件) — 顶部 Header 区域右侧，CC/SS/LP/全部 4 个 pill 按钮，深色选中态使用项目 token
2. **指标矩阵摘要卡片** (`IndicatorMatrixSummary` 组件) — SS/LP 视角时显示，展示活跃指标数 + 8 类分类分布徽章
3. **KPI 卡片过滤** — 通过 `KPI_CARD_INDICATOR_IDS` 映射表 + `useMemo` 实现角色过滤，CC/全部视角显示全量 7 项，SS/LP 显示过程指标子集
4. **`useIndicatorMatrix` 集成** — 从 `@/lib/hooks/useIndicatorMatrix` import，SWR 拉取 `/api/indicator-matrix/registry` + `/api/indicator-matrix/matrix`

设计约定：
- 所有颜色使用项目 CSS token（`var(--text-primary)`, `var(--bg-subtle)`, `var(--border-default)`），0 处硬编码色值
- 默认 `all` 视角 = 全部 KPI 显示，不破坏现有功能
- `IndicatorMatrixSummary` 在 `all` 视角自动隐藏（无感知）

### 任务 B: CLAUDE.md 模式沉淀

**文件**: `CLAUDE.md`

在"## 业务术语（关键）"段落前插入"## 指标矩阵系统"段落，内容包括：
- 架构数据流（config.json → API → hook → Dashboard）
- 持久化机制（indicator_matrix_override.json）
- 8 类指标分类定义
- 4 个 API 端点
- 完整性检查命令
- 前端页面入口

## 验证

```
npx tsc --noEmit  →  0 errors (无输出 = 通过)
```

## 文件变更

| 文件 | 类型 | 描述 |
|------|------|------|
| `frontend/app/page.tsx` | 修改 | 添加岗位筛选器 + 矩阵摘要卡片 + KPI 过滤 |
| `CLAUDE.md` | 修改 | 插入指标矩阵系统段落 |

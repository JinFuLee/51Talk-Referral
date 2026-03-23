# MK 产出：前端运营渠道触达视图

## 变更摘要

**任务**: 创建 OpsChannelView 组件，并在 TeamDetailTab 中为运营 tab 路由到该视图。

## 变更文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/components/checkin/OpsChannelView.tsx` | 新建 | 运营渠道触达视图主组件（318 行） |
| `frontend/components/checkin/TeamDetailTab.tsx` | 修改 | 添加 OpsChannelView import + 运营 tab 条件路由 |

## 组件结构

### OpsChannelView

- **区域 A**: 3 个总览数据卡片（M6+ 总学员 / 已打卡 / 打卡率）
- **区域 B**: 4 列渠道卡片 grid（`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`），每卡片含优先级标签 + 推荐人数 + 目标条件 + 预估触达率进度条 + 成本级别 + 渠道描述
- **区域 C**: 围场子段分布（多段时显示双层进度条，单段时显示简洁摘要）
- **三态**: loading → Spinner，error → EmptyState "数据加载失败"，empty → EmptyState "M6+ 围场暂无学员数据"

### TeamDetailTab 变更

- 顶部新增 `import { OpsChannelView } from './OpsChannelView'`
- 数据展示区域用 `selectedRole === '运营'` 条件判断：是 → `<OpsChannelView configJson={configJson} />`，否 → 现有 TeamCard grid

## 设计 Token 合规

- 所有颜色使用项目 CSS 变量（`var(--text-primary)`, `var(--bg-surface)` 等）
- 优先级标签使用 Tailwind 语义色（bg-red-50/bg-amber-50/bg-slate-100），表达业务语义，非硬编码
- 0 处 `#xxx` / `rgb()` / Tailwind 色阶直接量

## TypeScript 验证

```
npx tsc --noEmit（frontend/ 目录）
OpsChannelView.tsx: 0 errors
TeamDetailTab.tsx: 0 errors（新增代码）
```

注：`useCheckinThresholds.ts` 有 5 个预存在 TS 错误，与本次变更无关。

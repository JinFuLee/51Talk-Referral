# checkin Phase 2+3 集成产出

## 任务摘要

将 Phase 2 新建的 4 个组件集成到现有 4 个文件中。

## 变更文件

| 文件 | 变更内容 |
|------|---------|
| `frontend/components/checkin/RankingTab.tsx` | 新增 `student` 子 Tab，渲染 `StudentRankingPanel` |
| `frontend/components/checkin/TeamDetailTab.tsx` | CC 成员行可点击展开 `CCStudentDrilldown` |
| `frontend/app/checkin/page.tsx` | 默认 Tab 改为 `summary`；副标题动态显示聚焦 CC |

## 变更详情

### RankingTab.tsx

- `subTab` 类型扩展：`'group' | 'person'` → `'group' | 'person' | 'student'`
- `RoleColumn` 的 `subTab` prop 类型同步更新
- 子 Tab 按钮数组改为 `SUB_TABS` 常量（含学员 Tab）
- `subTab === 'student'` 时直接渲染 `<StudentRankingPanel />`，其余 subTab 渲染原有排行列

### TeamDetailTab.tsx

- `TeamCard` 内部新增 `expandedCC: string | null` state
- CC 成员行（`<tr>`）添加 `onClick` 切换展开/收起，添加 `cursor-pointer` 样式
- 展开时名字后显示 `▲` 图标 + 左侧高亮 `border-l-2 border-[var(--color-accent)]`
- 展开行插入 `<CCStudentDrilldown ccName={expandedCC} />` 组件（colSpan=5）

### page.tsx

- `resolveDefaultTab()` fallback 从 `'followup'` 改为 `'summary'`
- `useMyView()` 返回值解构为 `{ focusCC, isActive }` 供副标题使用
- 副标题：`isActive && focusCC` 时显示 `"当前聚焦: {focusCC} 的学员"`，否则原文

## 注意

FollowupTab.tsx 已经实现 `StudentTagBadge`、`GroupFilterBar`、本月/上月打卡天数列，无需修改。
page.tsx 中 `MyViewBanner` 和 `useMyView` 已在上游任务中集成，本次仅补充 `focusCC`/`isActive` 解构。

## 验证

`npx tsc --noEmit` → 零错误

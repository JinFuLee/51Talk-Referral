# Phase 2c+2d — RankingTab 学员排行 + TeamCard 钻进

## 验收结论

**状态：已完成并提交**，所有组件在当前 worktree 任务前的历史 commit 中已完整交付。

## 已交付组件

### Part A: StudentRankingPanel（学员排行）

**文件**：`frontend/components/checkin/StudentRankingPanel.tsx`

- 3 维度切换（`SegmentedTabs` 胶囊式）：频次排行 / 进步排行 / 转化效率
- 频次排行：`top_students` 按 `days_this_month DESC`，分区：🏆满勤(6) / 🌟活跃(4-5) / ⚠️低频(1-3)
- 进步排行：`improvement_ranking` 按 `delta DESC`，分区：进步≥3 / 进步2 / 进步1
- 转化效率：`top_students` 过滤 `days_this_month >= 1`，按 `referral_registrations DESC`，扁平展示
- 表格列：排名 / 学员ID / 围场 / CC / 本月(0-6) / 上月 / △ / 课耗 / 推荐注册 / 标签
- 三态：loading / error / empty 全覆盖
- 样式：全用 `slide-thead-row / slide-th / slide-td / slide-row-even/odd` CSS 类，无 Tailwind arbitrary value

### Part A: RankingTab 修改

**文件**：`frontend/components/checkin/RankingTab.tsx`

- `subTab` 类型扩展为 `'group' | 'person' | 'student'`
- 新增"学员"按钮（第 3 个 sub-tab）
- `subTab === 'student'` 时渲染 `<StudentRankingPanel />`
- 原有小组/个人排行功能 100% 保留

### Part B: CCStudentDrilldown（CC 学员钻进）

**文件**：`frontend/components/checkin/CCStudentDrilldown.tsx`

- Props：`ccName: string`
- 调用 `useStudentAnalysis({ cc: ccName })` 按 CC 过滤
- 紧凑表格：学员ID / 围场 / 本月 / 上月 / △ / 课耗 / 推荐注册 / 标签
- 顶部摘要：`共 N 学员 · 已打卡 M（X%） · 沉睡高潜 K 人`
- 最大高度 400px 可滚动
- 三态：loading / error / empty 全覆盖

### Part B: TeamDetailTab 修改

**文件**：`frontend/components/checkin/TeamDetailTab.tsx`

- 已有 `expandedCC` state（per-TeamCard 独立 state）
- CC 行点击切换展开/收起
- 展开时在 `<tr>` 内渲染 `<CCStudentDrilldown ccName={expandedCC} />`
- 展开行左侧显示 border accent 高亮标识
- 原有团队卡片功能 100% 保留

## Git Commits

| Commit | 描述 |
|--------|------|
| `5ef3a0b6` | feat(checkin): add StudentRankingPanel + CCStudentDrilldown + useMyView + MyViewBanner |
| `1a2f372d` | feat(checkin): integrate student ranking + CC drilldown + smart routing + MyView |

## 类型检查

`npx tsc --noEmit` — 零错误

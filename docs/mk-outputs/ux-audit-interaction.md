# UX 审计报告：交互模式 + 一致性

**审计范围**：`frontend/` 全站 TSX 组件（约 100+ 文件）
**审计日期**：2026-03-25
**审计维度**：组件使用一致性 / 三态覆盖 / 交互模式

---

## 一、组件使用一致性

### 1.1 卡片圆角混用

**问题**：同类卡片容器圆角值不统一，存在三种不同数值并存。

| 圆角值 | 出现次数 | 代表文件 |
|--------|---------|---------|
| `rounded-lg` | **137 处**（63 文件） | `Card.tsx`, `GapSimulator.tsx`, `HealthScoreCards.tsx` 等 |
| `rounded-xl` | **34 处**（21 文件） | `StatMiniCard.tsx`, `NotificationCenter.tsx`, `FileUploadPanel.tsx` 等 |
| `rounded-[var(--radius-xl)]` | 少量（MarkdownRenderer, TeamSummaryCard） | 设计 token 引用方式 |

- Before：同类卡片容器 `rounded-lg` vs `rounded-xl` 混用，视觉不一致
- After：统一使用 `rounded-xl`（或统一引用 `var(--radius-xl)`），消除混用
- ROI：修改约 50 处 className → 全站卡片视觉统一

**典型冲突**：
- `Card.tsx:15` 用 `rounded-lg`（全站最基础卡片组件）
- `StatMiniCard.tsx:22` 用 `rounded-xl`（统计小卡片）
- `FileUploadPanel.tsx:36` 用 `rounded-xl`，内部按钮却用 `rounded-lg`

### 1.2 边框色值双轨

**问题**：边框色同时使用 Tailwind 硬编码色阶（49 处）和 CSS 变量（161 处），导致深色模式支持不完整。

| 边框方式 | 出现次数 | 文件数 | 问题 |
|---------|---------|-------|------|
| `border-[var(--border-*)]` | 161 处 | 61 文件 | 正确方式 |
| `border-slate-200` / `border-slate-100` 等 | 49 处 | 24 文件 | 硬编码，无深色模式 |

- Before：`DataSourceGrid.tsx:30` `border-slate-200`，`Card.tsx` `border-[var(--border-default)]`，同类卡片边框色不一致
- After：全部迁移到 `border-[var(--border-default)]`，深色模式自动适配
- ROI：24 个文件的 49 处修改 → 深色模式边框全部正确

### 1.3 背景色硬编码

**问题**：93 处使用 `bg-slate-*` / `bg-gray-*` / `bg-[#xxx]` / `bg-\[var\(--n-800\)\]` 混用。

| 类型 | 示例 | 正确替换 |
|------|------|---------|
| `bg-slate-50` | GlobalFilterBar, TimePeriodSelector | `bg-[var(--bg-subtle)]` |
| `bg-slate-100` | PageHeader, Sidebar | `bg-[var(--bg-primary)]` |
| `bg-slate-900/80` | PresentationOverlay | 允许（overlay 专用色） |
| `bg-[var(--n-800)]` | channel/page.tsx 表头 | 推荐改为 `.slide-thead-row` CSS class |

- Before：`channel/page.tsx:187` 表头用 `bg-[var(--n-800)] text-white`（Tailwind arbitrary value，JIT 不稳定）
- After：改用 `slide-thead-row` CSS class，与其他 Slide 表头保持一致
- ROI：避免表头样式在 JIT/Turbopack 下静默失效（已有 P1 事故记录）

### 1.4 按钮样式碎片化

**问题**：按钮存在 4 种不同实现方式，缺乏统一。

| 实现方式 | 代表位置 | 问题 |
|---------|---------|------|
| shadcn `Button` 组件 | `button.tsx` | 官方组件，正确 |
| 自定义 inline button（`px-3 py-1.5 rounded-lg bg-primary`） | ScheduleManager, ExportButton | 不统一 |
| 自定义 inline button（`px-4 py-2 bg-[var(--bg-surface)] border`） | ReportDownloader | 不统一 |
| 自定义 inline button（`px-3 py-1.5 bg-[var(--brand)]`） | ScheduleManager 新增按钮 | `var(--brand)` 非标准 token |

- Before：同一个页面同功能的按钮（如"新增"、"导出"）样式各不相同
- After：全部复用 shadcn `Button` 组件，`variant` 和 `size` 统一
- ROI：约 20+ 处按钮统一 → 视觉一致，维护成本降低

---

## 二、三态覆盖审计

**扫描方法**：全站 45 个文件含 `useSWR`，逐一检查 `isLoading` / `error` / empty 处理。

### 2.1 覆盖率统计

| 维度 | 覆盖文件数 | 总 useSWR 文件数 | 覆盖率 |
|------|----------|----------------|--------|
| loading 态 | 42 | 45 | **93%** |
| error 态 | 42 | 45 | **93%** |
| empty 态 | 38 | 45 | **84%** |

### 2.2 缺失 error 态的组件（3 处）

| 组件 | API 调用 | loading | error | empty | 缺失原因 |
|------|---------|---------|-------|-------|---------|
| `app/enclosure/page.tsx` | `/api/enclosure` + `/api/enclosure-ss` + `/api/enclosure-lp` | ✓ | **✗** | ✓ | 只检查 `e1 \|\| e2`（loading），无 error 分支 |
| `app/channel/page.tsx` | 4 个 API 并发 | ✓ | **✗** | ✓ | `isLoading = c1\|\|c2\|\|c3\|\|c4`，无 error |
| `app/notifications/PushControl.tsx` | `/api/notifications/templates` + `/api/notifications/channels` | **✗** | **✗** | **✗** | 两个 useSWR 均未解构 error/isLoading |

### 2.3 缺失 empty 态的组件（7 处）

| 组件 | API 调用 | 缺失表现 |
|------|---------|---------|
| `app/enclosure-health/page.tsx` | benchmark + variance | 空数据时渲染空表格，无引导文字 |
| `app/daily-monitor/page.tsx` | 5 个 API 并发 | 无单个 API empty 处理，只有全局 loading |
| `app/channel/page.tsx` | attribution + three-factor | Tab 切换后空数据显示空白区域 |
| `app/personnel-matrix/page.tsx` | heatmap + radar + drilldown | 加载后无数据时显示空白 |
| `components/checkin/FollowupTab.tsx` | followup API | 无 empty 态引导 |
| `components/slides/ScenarioAnalysisSlide.tsx` | funnel/scenario | `scenarioList` 为空时无提示 |
| `app/enclosure/page.tsx` | enclosure-ss + enclosure-lp（362/509行） | 内嵌组件无 empty 处理 |

---

## 三、交互模式审计

### 3.1 键盘快捷键

**现状**：全站几乎无系统级键盘快捷键支持。

| 功能 | 当前状态 | 建议 | 优先级 |
|------|---------|------|--------|
| 全局搜索 | **无**（无 Cmd+K） | 添加 Cmd+K 打开学员/CC 搜索面板 | P2 |
| 弹窗关闭 | **部分**（仅 Profile360Drawer 有 Escape） | 所有 Modal/Drawer 统一响应 Escape | P1 |
| 汇报模式切换 | 仅鼠标按钮 | 添加 `F` 键全屏、`←/→` 换页 | P3 |
| 筛选条件清空 | 仅鼠标点击 | 添加 Escape 清空当前筛选 | P3 |

### 3.2 弹窗关闭一致性

**问题**：不同弹窗的关闭方式不统一。

| 组件 | Escape 关闭 | 点击蒙层关闭 | 关闭按钮 |
|------|------------|------------|---------|
| `Profile360Drawer.tsx` | ✓ | ✓（onClick=onClose） | ✓ |
| `MemberDetailDrawer.tsx` | **✗** | ✓ | ✓ |
| `PreviewModal.tsx` | **✗** | **✗** | ✓ |
| `BotFormModal.tsx` | **✗** | **✗** | ✓ |
| `CCRadarChart.tsx` tooltip | N/A | ✓ | N/A |

- Before：4 个 Modal 中 3 个不支持 Escape 关闭
- After：所有 Modal/Drawer 统一添加 `useEffect + keydown 监听 Escape`
- ROI：约 12 行代码 × 4 个组件 → 键盘操作体验统一

### 3.3 表格排序一致性

**问题**：只有部分页面的表格支持排序，同功能区域不一致。

| 页面/组件 | 是否有排序 | 可排序列 |
|---------|----------|---------|
| `followup-quality/page.tsx` | ✓ | 多列 |
| `referral-contributor/page.tsx` | ✓ | 多列 |
| `personnel-matrix/page.tsx` | ✓ | heatmap 相关 |
| `expiry-alert/page.tsx` | ✓ | 到期日等 |
| `enclosure/page.tsx`（CC 矩阵） | **✗** | 围场/CC/有效学员等均不可排序 |
| `daily-monitor/page.tsx`（CC 排名） | **✗** | 排名已内置，但触达率列不可手动排序 |
| `channel/page.tsx`（渠道贡献） | **✗** | 付费数/注册数等不可排序 |
| `members/page.tsx` | **✗** | 失联天数/次卡健康度不可排序 |

- Before：4 个带排序、4 个无排序，用户难以快速找到关注的 CC 或渠道
- After：所有展示排名/量化数据的表格至少支持主要列排序（使用现有 `SortableHeader` 组件）
- ROI：复用 `SortableHeader.tsx` → 每个表格约 20-30 行改动，用户找数据效率提升

### 3.4 操作反馈（Toast）

**问题**：`Toaster` 组件已注册（sonner），但**全站没有任何地方调用 `toast()`**。

| 操作类型 | 当前反馈 | 应有反馈 |
|---------|---------|---------|
| 保存 Settings 配置 | 无（页面无变化） | `toast.success("已保存")` |
| 删除排程 | 无（列表直接消失） | `toast.success("已删除")` |
| 推送成功/失败 | 仅 `PushProgress` 内联展示 | 同时配合 `toast.success/error` |
| 上传文件成功 | 无 | `toast.success("上传成功")` |
| 导出文件 | 无 | `toast.success("导出中...")` |

- Before：所有 CUD 操作后无全局 Toast 反馈，用户不确定操作是否成功
- After：在 5 类核心操作后添加 `toast()` 调用（约 10 处）
- ROI：10 处改动 → 消除用户操作后的不确定感，减少重复点击

### 3.5 筛选器下拉一致性

**问题**：筛选器存在三种实现，同一页面内有时混用。

| 实现方式 | 代表位置 | 问题 |
|---------|---------|------|
| shadcn `Select` 组件 | `EnclosureFilter.tsx` | 正确，有 Esc 支持 |
| 原生 `<select>` | `GlobalFilterBar.tsx`, `OutputGallery.tsx` | 样式与 shadcn 不一致 |
| 自定义 button 组 | `enclosure/page.tsx` 围场筛选 | 外观独特，与其他筛选器不一致 |

---

## 四、改善优先级汇总

| 优先级 | 问题 | 影响范围 | 工作量 |
|--------|------|---------|-------|
| **P0** | `PushControl.tsx` 完全缺失三态 | 通知推送核心功能 | 小（30 行） |
| **P0** | `enclosure/page.tsx` + `channel/page.tsx` 缺 error 态 | 两个高频页面 | 小（各 10 行） |
| **P1** | Toast 反馈全站缺失 | 所有 CUD 操作 | 中（10 处） |
| **P1** | Modal 不响应 Escape 键 | 4 个弹窗 | 小（各 5 行） |
| **P2** | 卡片圆角 rounded-lg/xl 混用 | 全站 63 文件 | 中（50 处 className） |
| **P2** | 边框色 border-slate-200 硬编码 | 24 文件 | 中（49 处 className） |
| **P2** | 表格排序不一致（4 个页面缺失） | 高频数据页面 | 中（复用 SortableHeader） |
| **P3** | 按钮样式碎片化（4 种实现） | 全站 | 大（20+ 处） |
| **P3** | 筛选器实现不一致（3 种） | 多个页面 | 中 |
| **P3** | 键盘快捷键缺失 | 全站 | 大 |

---

## 附录：三态覆盖详细清单

### 有完整三态的关键页面（最佳实践参考）

- `app/funnel/page.tsx` — loading/error(EmptyState)/empty(stages.length===0)
- `app/members/page.tsx` — loading/error/empty 均有
- `app/checkin/page.tsx` — loading/error/empty 均有
- `components/checkin/ScheduleManager.tsx` — loading/error/empty 均有（最完整示例）

### empty 态推荐实现（参考 `components/ui/EmptyState.tsx`）

```tsx
{!isLoading && !error && data?.length === 0 && (
  <EmptyState
    title="暂无数据"
    description="上传 Excel 数据后将自动展示"
  />
)}
```

# CC 个人业绩前端交付报告

## 产出文件

| 文件 | 类型 | 说明 |
|------|------|------|
| `frontend/components/cc-performance/CCPerformanceSummaryCards.tsx` | 组件 | L0 层 4 个 KPI 卡片 |
| `frontend/components/cc-performance/CCPerformanceTable.tsx` | 组件 | L1 层 8 列组全维度表格 |
| `frontend/components/cc-performance/CCPerformanceDetail.tsx` | 组件 | L2 层展开详情面板 |
| `frontend/app/cc-performance/page.tsx` | 页面 | SWR 数据获取 + 布局 |
| `frontend/components/layout/NavSidebar.tsx` | 改动 | 运营组新增导航项 |

## 功能完成情况

### CCPerformanceSummaryCards（L0）
- 4 个 KPI 卡片横排：总业绩 / 业绩达成率 / 转介绍占比 / 时间进度
- 达成率 ≥100% 绿 / ≥80% 橙 / <80% 红
- 进度条动画 + 领先/落后进度标注
- props 传入，不自己 useSWR

### CCPerformanceTable（L1）
- 8 列组（6 个默认显示，2 个折叠）：基础信息/业绩/转介绍/漏斗/转化率/过程指标/拨打覆盖/节奏
- 功能：CC 名字搜索 / 团队筛选 / USD↔THB 切换 / 列组 checkbox 开关 / CSV 导出
- 团队小计行（tfoot）/ 列头排序（支持嵌套字段 `revenue.actual`）
- 达成率色彩：≥100% 绿 / ≥80% 橙 / <80% 红
- 点击行展开 CCPerformanceDetail
- loading Spinner / error EmptyState + 重试 / empty EmptyState 三态

### CCPerformanceDetail（L2）
- 左侧：战力雷达图（5 维：参与率/转化率/打卡率/触达率/带货比）
  - `useSWR('/api/cc-matrix/radar/{cc_name}')` 按需加载
- 右侧：行动指导卡片（业绩缺口 / 达标需日均 / 追进度需日均 / 当前日均 / 效率提升需求）
- 底部：过程指标摘要 6 项（3×2 网格）

### NavSidebar
- 运营组末尾追加 `{ href: '/cc-performance', label: 'CC 个人业绩', Icon: UserCheck }`
- lucide-react 新增 `UserCheck` 导入

## 设计体系合规自检（12 维度）

| # | 维度 | 状态 | 说明 |
|---|------|------|------|
| 1 | 颜色 | ✓ | 全用 `var(--xxx)` 语义 token，0 硬编码色值 |
| 2 | 卡片 | ✓ | `rounded-xl border border-[var(--border-default)]` |
| 3 | 表格 | ✓ | `slide-thead-row / slide-th / slide-td / slide-row-even/odd` |
| 4 | 按钮 | ✓ | USD/THB 切换 + 列组按钮用 `var(--color-accent)` 语义色 |
| 5 | 输入框 | ✓ | search input 用 `focus:ring-[var(--color-accent)]` |
| 6 | 间距 | ✓ | 页面 `px-6 py-6`，区块 `space-y-6`，卡片 `p-4` |
| 7 | 圆角 | ✓ | 卡片 `rounded-xl`，按钮 `rounded-lg`，表格容器 `rounded-xl` |
| 8 | 图表 | ✓ | 雷达图 `CHART_PALETTE.c1`，stroke `var(--border-default)` |
| 9 | 图标 | ✓ | NavSidebar `w-4 h-4`，UserCheck 图标 |
| 10 | 分隔线 | ✓ | `border-[var(--border-default)]` |
| 11 | 交互 | ✓ | `transition-colors duration-150` |
| 12 | 状态 | ✓ | loading/error/empty 三态全覆盖 |

## API 契约
- 消费 `GET /api/cc-performance` → `CCPerformanceResponse`
- 消费 `GET /api/cc-matrix/radar/{cc_name}` → `CCRadarData`（按需，Detail 展开时触发）
- 类型文件：`frontend/lib/types/cc-performance.ts`（字段名与后端 Pydantic 逐字段对齐）

## commit
`5172b405 feat: CC 个人业绩页面 + 组件 + 导航`

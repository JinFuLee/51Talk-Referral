# FE-BM-Table 交付报告

## 状态
tsc --noEmit: 0 错误 ✓
后端 API 字段匹配验证: ✓
前端服务 http://localhost:3100: HTTP 200 ✓

## 变更文件（4 个新建 + 4 个修改）

### 新建
- `frontend/lib/types/bm-calendar.ts` — BmCalendarSnapshot / BmMetricItem / BmComparison / BmCalendarDay / BmCalendarResponse 5 个接口
- `frontend/components/dashboard/BmComparisonTable.tsx` — 5 行 × 7 列对比表格，BmGapCell（正/负颜色）+ TodayRequiredCell（负值→已超额）
- `frontend/app/settings/BmCalendarCard.tsx` — 月历网格，格子背景按 day_type，点击展开 inline selector，保存调用 PUT /api/config/bm-calendar

### 修改
- `frontend/app/page.tsx` — import BmComparisonTable/BmComparison，OverviewResponse 新增 bm_comparison?: BmComparison，KPI8Section 后插入 BmComparisonTable
- `frontend/lib/api.ts` — configAPI 新增 getBmCalendar / putBmCalendar 两个方法
- `frontend/app/settings/page.tsx` — import BmCalendarCard，IndicatorMatrixCard 下方插入 <BmCalendarCard selectedMonth={selectedMonth} />

## 设计规范遵守
- 零硬编码色值：全部使用 `var(--text-primary)` / `var(--color-danger)` / `.card-base` 等 CSS 变量或 token
- 正值绿色 `text-emerald-800`（与 page.tsx gapColor 保持一致）
- 数字 `font-mono tabular-nums`
- 负值今日需 → 显示"已超额"灰色，无需用户看红字

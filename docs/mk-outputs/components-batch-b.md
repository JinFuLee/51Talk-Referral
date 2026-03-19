# Components Batch B: SEE Token Migration Report

## 状态
完成 ✓ — commit `0bc9380c` pushed to main

## 处理文件（11 / 12 文件，1 个不存在跳过）

| 文件 | 状态 | 变更 |
|------|------|------|
| `frontend/components/shared/RateCard.tsx` | 跳过（文件不存在） | — |
| `frontend/components/shared/PercentBar.tsx` | ✓ | bg-slate-100 → bg-[var(--bg-subtle)] |
| `frontend/components/shared/ComparisonBanner.tsx` | ✓ | 全部 slate neutral → SEE text/border/bg tokens |
| `frontend/components/funnel/ScenarioTable.tsx` | ✓ | table headers/rows → SEE tokens |
| `frontend/app/page.tsx` | ✓ | h1/p/FunnelSnapshot labels/data-source row-count → SEE tokens |
| `frontend/app/funnel/page.tsx` | ✓ | 两个表格 headers + rows → SEE tokens |
| `frontend/app/enclosure/page.tsx` | ✓ | filter buttons + 两个表格 + ranking badge → SEE tokens |
| `frontend/app/channel/page.tsx` | ✓ | Tab switcher + 三个表格 + CHANNEL_COLORS → SEE palette |
| `frontend/app/members/page.tsx` | ✓ | drawer bg/text + input border + table + lifecycle badge + pagination → SEE tokens |
| `frontend/app/high-potential/page.tsx` | ✓ | card bg-white/border/shadow → SEE surface/border/shadow tokens |
| `frontend/app/team/page.tsx` | ✓ | card bg-white/border/shadow/text/metrics → SEE tokens |
| `frontend/app/reports/page.tsx` | ✓ | badge/date/empty states → SEE text tokens |

## 替换规则执行摘要

- `bg-white` → `bg-[var(--bg-surface)]`（drawer, cards）
- `bg-slate-100/50` → `bg-[var(--bg-subtle)]`
- `border-slate-100/200` → `border-[var(--border-subtle)]`
- `border-slate-50` → `border-[var(--border-subtle)]`（table rows）
- `text-slate-900/800/700` → `text-[var(--text-primary)]`
- `text-slate-600/500` → `text-[var(--text-secondary)]`
- `text-slate-400/300` → `text-[var(--text-muted)]`
- `rounded-2xl` → `rounded-[var(--radius-md)]`（cards in high-potential + team）
- `shadow-sm` → `shadow-[var(--shadow-subtle)]`（cards）
- `hover:shadow-md` → `hover:shadow-[var(--shadow-medium)]`
- `CHANNEL_COLORS` hex array → SEE 色板 `['#92400E', '#065F46', '#1E40AF', '#6B21A8']`

## 保留不动的状态色/品牌色
- `text-green-600/500`, `text-red-500`, `text-yellow-600/700`, `text-blue-600`, `text-emerald-600`
- `bg-green-50`, `bg-red-50`, `bg-amber-50`, `bg-yellow-100`, `bg-orange-50`
- `border-amber-100`（comparison banner 警告态保留）

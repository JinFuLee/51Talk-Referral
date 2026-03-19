# Batch A: Layout + UI Components — SEE Token Migration

## 结果摘要

**4 个文件已修改，3 个文件无需变更，1 个文件不存在（跳过）**

Commit: `40196d3e` | Push: `main` branch ✓

## 文件状态

| 文件 | 状态 | 变更项 |
|------|------|--------|
| `frontend/components/ui/Card.tsx` | ✓ 已迁移 | bg-surface, radius-md, shadow-subtle/medium, border-default |
| `frontend/components/ui/EmptyState.tsx` | — 无变更 | 无目标 token（无 slate-* / bg-white） |
| `frontend/components/ui/Spinner.tsx` | — 无变更 | 无目标 token |
| `frontend/components/ui/Skeleton.tsx` | — 无变更 | 无目标 token |
| `frontend/components/layout/NavSidebar.tsx` | ✓ 已迁移 | 8 处：text-secondary/muted, bg-subtle, border-subtle, bg-surface |
| `frontend/components/layout/Topbar.tsx` | ✓ 已迁移 | 7 处：bg-surface, text-secondary/muted, border-subtle |
| `frontend/components/shared/StatCard.tsx` | ✓ 已迁移 | 6 处：bg-surface, text-primary/muted, bg-subtle, radius-md, border-default |
| `frontend/components/shared/StatMiniCard.tsx` | ✗ 不存在 | 跳过 |

## Token 替换明细

### Card.tsx (2 处)
- `bg-white/95` → `bg-[var(--bg-surface)]/95`
- `rounded-2xl` → `rounded-[var(--radius-md)]`
- `shadow-flash` → `shadow-[var(--shadow-subtle)]`
- `duration-500` → `duration-200`
- `hover:shadow-flash-lg` → `hover:shadow-[var(--shadow-medium)]`
- `border-border/40` (×2) → `border-[var(--border-default)]/40`

### NavSidebar.tsx (8 处)
- `text-slate-600 hover:bg-slate-100` → `text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]`
- `hover:text-slate-600` → `hover:text-[var(--text-secondary)]`
- `text-slate-400` (group label) → `text-[var(--text-muted)]`
- `border-slate-100` (header) → `border-[var(--border-subtle)]`
- `text-slate-400` (subtitle) → `text-[var(--text-muted)]`
- `bg-white border border-slate-200` (mobile button) → `bg-[var(--bg-surface)] border border-[var(--border-subtle)]`
- `text-slate-600` (menu icon) → `text-[var(--text-secondary)]`
- `bg-white` (mobile panel) → `bg-[var(--bg-surface)]`
- `text-slate-400 hover:text-slate-600 hover:bg-slate-100` (close button) → `text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]`
- `bg-white/90 border-border/40` (desktop) → `bg-[var(--bg-surface)]/90 border-[var(--border-default)]/40`

### Topbar.tsx (7 处)
- `bg-white/80 border-slate-100` → `bg-[var(--bg-surface)]/80 border-[var(--border-subtle)]`
- `text-slate-500` → `text-[var(--text-secondary)]`
- `text-slate-300` (×2 separators) → `text-[var(--text-muted)]`
- `bg-slate-50 border-slate-200 text-slate-600` (button) → `bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]`
- `text-slate-500` (status) → `text-[var(--text-secondary)]`

### StatCard.tsx (6 处)
- `bg-white/95 rounded-2xl border-border/40` → `bg-[var(--bg-surface)]/95 rounded-[var(--radius-md)] border-[var(--border-default)]/40`
- `text-slate-400` (×3 labels) → `text-[var(--text-muted)]`
- `text-slate-900` (value) → `text-[var(--text-primary)]`
- `bg-slate-100` (progress bar bg) → `bg-[var(--bg-subtle)]`

## 保留不变
`green-600` / `red-500` / `yellow-600` 等状态色——业务语义色，不在迁移范围内。
`bg-primary` / `text-primary-foreground` / `text-muted-foreground` 等 shadcn 语义 token——已是语义化，不需替换。

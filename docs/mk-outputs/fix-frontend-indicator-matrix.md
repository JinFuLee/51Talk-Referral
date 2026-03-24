# fix-frontend-indicator-matrix

commit: 4b223b7b
files: 5 changed, 88 insertions, 31 deletions

## 修复清单

### Bug 1 (P1) — useIndicatorMatrix hook 暴露 error 状态
- 文件：`frontend/lib/hooks/useIndicatorMatrix.ts`
- 从两个 useSWR 调用取出 `registryError` / `matrixError`，合并后返回 `error: registryError || matrixError`

### Bug 2 (P2) — render-phase setState → useEffect
- 文件：`frontend/app/settings/IndicatorMatrixCard.tsx`、`frontend/app/indicator-matrix/page.tsx`
- 删除 `initialized` state，改为 `useEffect(() => { if (matrix) { setSsActive/setLpActive } }, [matrix])`
- 两个文件均补充 `useEffect` 到 import

### Bug 3 (P2) — error + empty 状态展示
- 文件：`frontend/app/settings/IndicatorMatrixCard.tsx`、`frontend/app/indicator-matrix/page.tsx`
- `IndicatorMatrixCard`：在 return 前加 error guard（Card 包裹）和 empty guard（registry.length === 0）
- `indicator-matrix/page.tsx`：在 return 前加 error guard 和 empty guard（含 PageHeader，不用 Card 包裹）

### Bug 4 (P3) — 删除 putMatrix 冗余 Content-Type header
- 文件：`frontend/lib/api.ts`
- 删除 `headers: { 'Content-Type': 'application/json' }`（`request()` 已内置）

### Bug 5 (P3) — 修复注释 + 死映射
- 文件：`frontend/app/page.tsx`
- 注释改为"与 overview API metrics key 对应"
- SS/LP 的 `KPI_CARD_INDICATOR_IDS` 删除 `'参与率'`（无对应 KPI_CARDS entry）

### Bug 6 (P3) — 替换硬编码 Tailwind 色值
- 文件：`frontend/app/indicator-matrix/page.tsx`、`frontend/app/settings/IndicatorMatrixCard.tsx`
- `bg-red-50/40` → `bg-[var(--n-100)]`
- `text-red-500`（CC独有标签）→ `text-[var(--n-500)]`
- `bg-green-50 text-green-700` → `bg-[var(--n-100)] text-[var(--n-600)]`
- `bg-yellow-50 text-yellow-700` → `bg-[var(--n-200)] text-[var(--n-700)]`
- msg 成功/失败色：`text-green-600`/`text-red-500` → `text-[var(--n-600)]`/`text-[var(--n-500)]`

## 验证

- `npx tsc --noEmit` 0 errors

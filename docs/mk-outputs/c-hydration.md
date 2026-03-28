# Tag C：生产水合 #418 调查修复

## 根因分析

### 错误 1：React error #418 — Hydration failed
**根因：Zustand `persist` middleware 导致 SSR/CSR 渲染不匹配**

- `ComparisonBanner`（在 `[locale]/layout.tsx` 中直接渲染）读取 `useConfigStore(s => s.compareMode)`
- 服务端渲染时 `compareMode = 'off'`（store 初始默认值），组件渲染 `null`
- 客户端水合后，Zustand `persist` 从 `localStorage` 恢复 `compareMode`，若用户之前设为非 `'off'` 值，客户端渲染出 Banner 内容
- **SSR 输出 null，CSR 输出 Banner DOM** → React #418 不匹配

`GlobalFilterBar` 同理：`teamFilter`/`focusCC` persist 恢复后会影响 `hasActiveFilter` badge 显示，产生轻微不匹配。

### 错误 2：`Cannot read properties of null (reading 'document')`
- `layout.tsx:45-53` 的 inline script 在 `dangerouslySetInnerHTML` 中访问 `document.documentElement`
- 此 script 为客户端内联执行，正常应无问题
- 此错误实为 React #418 水合失败的次生报错（水合失败后 React 重新客户端渲染时触发），或错误日志对行号的误判
- 加了 `suppressHydrationWarning` 在 `<html>` 上，但水合 mismatch 发生在 `<body>` 内子树（Banner/FilterBar），不在 `<html>` 属性上，故 suppress 无效

## 修复内容

### 1. `frontend/lib/stores/config-store.ts`
新增 `useStoreHydrated()` hook：
- SSR 和客户端首次渲染均返回 `false`
- `useEffect` 执行后（localStorage 恢复完成）返回 `true`
- 导出供所有消费 persist store 的布局级组件使用

### 2. `frontend/components/shared/ComparisonBanner.tsx`
- 引入 `useStoreHydrated`
- 水合前（`!hydrated`）强制 `return null`，与 SSR 保持一致
- 水合完成后正常读取 `compareMode`

### 3. `frontend/components/ui/GlobalFilterBar.tsx`
- 引入 `useStoreHydrated`
- `hasActiveFilter` 水合前强制为 `false`（与 SSR 默认值一致）

## 验证

- `npx tsc --noEmit`：0 错误
- 修复逻辑：SSR → `hydrated=false` → `null`，客户端首次渲染 → `hydrated=false` → `null`，useEffect 后 → `hydrated=true` → 正常渲染（两次渲染均为 null，水合匹配）

## 修改文件清单

- `frontend/lib/stores/config-store.ts`（新增 `useStoreHydrated` hook）
- `frontend/components/shared/ComparisonBanner.tsx`（加 hydration guard）
- `frontend/components/ui/GlobalFilterBar.tsx`（加 hydration guard）

# Foundation: SEE Design System Foundation Layer

## 状态

✓ 完成 — TypeScript 零错误

## 变更摘要

### 1. `frontend/app/globals.css`

- `:root` 新增 SEE Warm Neutral Token 体系（`--n-50` 至 `--n-900`）
- `:root` 新增语义映射（`--bg-primary/surface/subtle`、`--text-primary/secondary/muted`、`--border-default/subtle`）
- `:root` 新增圆角 token（`--radius-sm/md/lg`）
- `:root` 新增阴影 token（`--shadow-subtle/medium/raised`）
- `:root` 新增图表 hex 色板（`--chart-1-hex` 至 `--chart-5-hex`）
- `.dark` 新增 SEE Warm Neutral 暗色翻转（bg/text/border/shadow）
- `body` 规则更新为 `var(--bg-primary) !important` + `var(--text-primary) !important`
- 末尾新增 `@media (prefers-reduced-motion: reduce)` 块
- 保留全部现有 shadcn HSL 变量（兼容）

### 2. `frontend/tailwind.config.ts`

- `extend.colors` 新增 `n.50`–`n.900`（映射到 CSS 变量）
- `extend.fontFamily` 新增 `sans`（Manrope + CJK fallback）和 `mono`（IBM Plex Mono）
- `extend.borderRadius` 替换为 `var(--radius-lg/md/sm)`（对齐 SEE）
- `extend.boxShadow` 移除 `flash`/`flash-lg`，新增 `subtle`/`medium`/`raised`（映射 CSS 变量）

### 3. `frontend/app/layout.tsx`

- 替换 `Inter` 为 `Manrope`（`variable: --font-manrope`）
- 新增 `IBM_Plex_Mono`（`variable: --font-mono`，weights 400/500/600）
- `<body>` className 改为 `font-sans` + CSS 变量字体 fallback（含中文/泰文）
- `<head>` 内联 Anti-FOUC script（localStorage.theme 检测 → 同步 `class="dark"`）

## TypeScript 验证

`./node_modules/.bin/tsc --noEmit` → 0 errors

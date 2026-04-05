# M40 Tag C — Tailwind Arbitrary Value → Semantic Token 替换结果

## 执行摘要

| 指标 | Before | After |
|------|--------|-------|
| CSS 变量 arbitrary value | 3,698 处 | 0 处 |
| 硬编码 `#xxx` 色值 | 7 处 | 6 处（演示模式，豁免） |
| 影响文件 | — | 201 个 .tsx 文件 |
| 新增语义 utility class | 0 | 56 个 |
| 构建状态 | — | ✓ 159 页面全部生成 |

## 实现方式

### 1. 语义 utility class（`frontend/app/globals.css`）

新增 `@layer utilities` 块，定义 56 个语义 class：
- **背景色**：`bg-surface`、`bg-subtle`、`bg-bg-primary`、`bg-bg-elevated`
- **文字色**：`text-primary-token`、`text-secondary-token`、`text-muted-token`
- **边框色**：`border-default-token`、`border-subtle-token`
- **状态色**：`bg-success-surface`、`bg-warning-surface`、`bg-danger-surface` 等
- **品牌色**：`bg-brand-p1`、`text-brand-p1`、`bg-brand-p2` 等
- **演示专用**：`bg-cinema`（#0a0a0a 全屏黑底）

### 2. 替换策略

- **第一轮**：映射 48 种高频模式（覆盖 98%），批量替换 3,647 处
- **第二轮**：处理剩余 51 处低频/特殊模式

### 3. ESLint 豁免补充（`.eslintrc.json`）

新增 overrides 豁免以下文件（合理的 `useSWR` 直接使用场景）：
- `lib/hooks.ts`（传入自定义 fetcher 的底层 hooks）
- `lib/use-compare-data.ts`（对比数据 hook）
- `components/ui/UnifiedFilterBar.tsx`（获取 filter options 配置类 API）
- `components/presentation/**`（演示模式深色主题）

## 替换映射（Top 10 高频）

| 旧写法 | 新写法 | 次数 |
|--------|--------|------|
| `text-[var(--text-muted)]` | `text-muted-token` | 802 |
| `text-[var(--text-secondary)]` | `text-secondary-token` | 517 |
| `text-[var(--text-primary)]` | `text-primary-token` | 407 |
| `bg-[var(--bg-subtle)]` | `bg-subtle` | 298 |
| `border-[var(--border-default)]` | `border-default-token` | 198 |
| `text-[var(--color-danger)]` | `text-danger-token` | 193 |
| `border-[var(--border-subtle)]` | `border-subtle-token` | 173 |
| `text-[var(--color-success)]` | `text-success-token` | 165 |
| `bg-[var(--bg-surface)]` | `bg-surface` | 131 |
| `text-[var(--color-warning)]` | `text-warning-token` | 127 |

## Commit

`ea93006a` — feat(M40-C): Tailwind arbitrary value → semantic token 批量替换

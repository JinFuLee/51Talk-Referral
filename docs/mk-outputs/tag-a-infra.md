# M40 Tag A — 基建层交付报告

**状态**: ✓ 完成  
**commit**: 408a3fd6  
**push**: ✓ main 分支

---

## A1: globals.css 模块化

**Before**: 1284 行单文件，所有 CSS 混在一起  
**After**: 62 行入口（@tailwind + @layer base 字体）+ 6 个语义化模块

| 文件 | 内容 | 行数（约） |
|------|------|---------|
| `styles/tokens.css` | CSS 变量（含 dark mode）+ shadcn token | 220 |
| `styles/overrides.css` | Tailwind Preflight 覆盖 + 表格规则 + Scrollbar | 50 |
| `styles/semantic.css` | 组件语义类（card/btn/badge/input/state/progress）| 115 |
| `styles/slide.css` | Slide 表格专用样式 + 暗色 Slide 适配 | 200 |
| `styles/components.css` | Auth/BrandDot/Recharts 覆写/图表联动/Presentation | 200 |
| `styles/animations.css` | 动画/过渡/@keyframes/reduced-motion | 85 |

引入方式：`layout.tsx` 分别 `import` 各模块（Next.js CSS 处理机制兼容）

**构建验证**: ✓ `npm run build` 零 CSS 错误，159 页面全部生成

---

## A2: Token 扩展

**Before**: tokens.css 覆盖项目语义色，但 90 处 TSX 仍有硬编码 hex  
**After**: 新增 19 个语义别名 token

高频色映射：
- `#ef4444`/`#dc2626` → `--color-danger-base` / `--color-danger-deep`  
- `#f59e0b`/`#ca8a04` → `--color-warning-base` / `--color-warning-dark`  
- `#22c55e`/`#16a34a`/`#10b981` → `--color-success-base/deep/alt`  
- `#1e293b` → `--color-slate-deep`  
- `#6366f1`/`#8b5cf6` → `--color-chart-indigo/violet`  

后续 Tag C 可基于这些 token 替换 90 处硬编码。

---

## A3: ESLint 规则

新增 4 条 `no-restricted-syntax` 规则：
1. 禁止 `bg-[#...]` Tailwind 硬编码 hex
2. 禁止 `text-[#...]` Tailwind 硬编码 hex  
3. 禁止 `border-[#...]` Tailwind 硬编码 hex
4. 禁止直接 `useSWR`（豁免：`use-filtered-swr.ts`/`use-compare-data.ts`/`config-store.ts`）

**验证**: ESLint 规则成功检测到已有违规（5 处 text-[#]，2 处 bg-[#]，5 处 useSWR），规则工作正常。

---

## A4: 组件模板

- `frontend/.claude/templates/component.tsx.template`
  - 含 `useTranslations` + 语义 class + 三态（loading/error/empty）骨架
  - 注释说明语义类规范和禁止事项

- `frontend/.claude/templates/page.tsx.template`
  - 含 `useFilteredSWR` + `usePageDimensions` + 三态
  - 注释说明 8 维度声明方式

---

## 基建就绪度（Before 基线）

| 指标 | Before | After |
|------|--------|-------|
| globals.css 行数 | 1284 | 62 |
| CSS 模块文件数 | 0 | 6 |
| 硬编码 hex token 覆盖 | ~0% | 语义别名已建 |
| ESLint 规则（硬编码 hex）| 无 | 3 条 |
| ESLint 规则（直接 useSWR）| 无 | 1 条（原有 1 条）|
| 组件模板 | 无 | 2 个 |

---

## Tag B/C/D 就绪状态

- **Tag B**（useFilteredSWR 全站推广）：ESLint 规则已就绪，可自动检测违规
- **Tag C**（arbitrary value → semantic token）：tokens.css 已有 19 个新别名可映射
- **Tag D**（i18n）：与本次基建无耦合，可并行

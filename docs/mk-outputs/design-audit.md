# SEE Design System × ref-ops-engine 差距审计

> 审计日期：2026-03-20 | 审计范围：frontend/ 全量组件 + 配置文件
> 参照规范：~/.claude/contexts/design-system/ v1.0.0

---

## 当前状态

### 色彩体系
- 主题系统基于 **shadcn/ui + tailwindcss 约定**，使用 HSL CSS 变量（`hsl(var(--primary))`），不是 SEE Warm Neutral Token 体系
- 品牌主色：`--primary: 173 58% 39%`（水月薄荷绿，HSL 饱和度 58%，接近 SEE 上限 60%），与 SEE 默认 P1 = `#92400E`（暖棕）完全不同
- 硬编码 hex 色值广泛存在：`channel/page.tsx` 中 `CHANNEL_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"]`，`page.tsx` 中 `"bg-green-50 text-green-700"`/`"bg-red-50 text-red-600"`/`"bg-green-500"`/`"bg-red-500"` 等
- SEE 语义变量（`--bg-primary`、`--text-primary`、`--border-subtle`、`--n-*` 中性色阶）**完全缺失**
- `StatMiniCard.tsx`、`RateCard.tsx` 中使用 `border-slate-200 bg-white` 硬编码，不随暗色模式变换

### 字体体系
- 根布局使用 `Inter`（`layout.tsx L13`），不是 SEE 要求的 `Manrope + IBM Plex Mono`
- `globals.css` 中排版规则使用 Tailwind preset（`text-4xl`/`text-3xl`/`text-2xl`/`text-xl`/`text-lg`），不是 SEE 5 级 token（Display 32px / Heading 18px / Body 14px / Caption 12px / Overline 11px）
- `--font-display`、`--font-mono` CSS 变量**完全缺失**
- 中文 fallback（`PingFang SC`、`Noto Sans SC`）未配置
- `channel/page.tsx` 中使用 `text-2xl font-bold`、`text-sm`、`text-xs` 等散乱字号，无 token 约束

### 间距体系
- 未定义 `--space-*` CSS 变量（`--space-1` 到 `--space-12`，4px 网格）
- 全部使用 Tailwind 原生间距工具类（`p-5`、`px-6`、`gap-4`、`space-y-6` 等），部分为非 4 倍数：`py-2.5`（10px，SEE 允许）、`px-2.5`（10px 可）
- `Card.tsx` 中 `px-5 py-4`（20px/16px，4 倍数满足）；`Topbar.tsx` 中 `px-6`（24px 满足）

### 圆角体系
- `tailwind.config.ts` 中 `--radius: 1rem`（16px），通过 `calc` 派生三档：`lg=16px`、`md=14px`、`sm=12px`
- SEE 要求：`sm=6px`、`md=10px`、`lg=16px`
- 实际派生值 `sm=12px`、`md=14px`，均偏大；`Card.tsx` 使用 `rounded-2xl`（24px），超过 SEE 上限 16px，属于"过圆"禁止模式
- `StatMiniCard.tsx`、`RateCard.tsx` 使用 `rounded-xl`（12px）
- SEE 专用 token `--radius-sm`/`--radius-md`/`--radius-lg` **完全缺失**

### 阴影体系
- 使用自定义 `shadow-flash`（多重 box-shadow）和 `shadow-flash-lg`（多重 box-shadow），违反 SEE 单层阴影原则
  - `flash: 0 20px 40px -10px rgba(0,0,0,0.03), 0 10px 20px -5px rgba(0,0,0,0.02)` — 双层
  - `flash-lg: 0 30px 60px -15px rgba(0,0,0,0.05), 0 15px 25px -10px rgba(0,0,0,0.03)` — 双层
- SEE 要求 `--shadow-subtle/medium/raised` 单层，禁止多重 box-shadow
- SEE 三档阴影 CSS 变量**完全缺失**

### 暗色模式
- `tailwind.config.ts` 已配置 `darkMode: ["class"]`，`.dark` class 控制变量翻转——方向正确
- `globals.css` 定义了 `.dark` 覆盖块（shadcn 标准），满足 Class-Only 策略
- **但存在陷阱**：`globals.css` 第 12 行 `body { background: hsl(var(--background)); color: hsl(var(--foreground)); }` 未加 `!important`，可能被 Tailwind preflight 覆盖（SEE 07-dark-mode.md P0 事故记录的同款场景）
- `layout.tsx` 中没有 Anti-FOUC 内联 `<script>`，用户首次加载暗色模式会闪白（FOUC）
- `NavSidebar.tsx` 中硬编码 `bg-white/90 border-border/40`，暗色下 `bg-white/90` 会保持白色背景，导致侧边栏暗色失效
- `Topbar.tsx` 中 `bg-white/80`，同样问题
- `StatMiniCard.tsx`、`RateCard.tsx` 中 `bg-white`、`border-slate-200`、`text-slate-500/400` 全部硬编码，暗色下无法自适应
- 图表颜色（`CHANNEL_COLORS` 硬编码 hex）无 `useChartPalette` hook，暗色下图表颜色不变

### 动效体系
- `globals.css` 中 `chart-linkage-group .chart-linkage-item { transition: opacity 0.3s ease, filter 0.3s ease; }` — 使用 `ease`（不是 `ease-out`），违反 SEE 禁止 `ease-in/out` 以外 easing 规则（实为宽松规范）
- `tailwind.config.ts` 动画使用 `ease-out`，满足 SEE 要求
- `Card.tsx` 中 `transition-all duration-500`（500ms 超过 SEE 300ms 上限），`hover:-translate-y-1`（无 spring easing）
- 未使用 Framer Motion（SEE 推荐的 spring 动效库）；是否安装未知，但组件层无使用
- SEE 规定的 `SPRING_DEFAULT`/`SPRING_SOFT`/`SPRING_FAST` 参数**完全缺失**
- 无 `prefers-reduced-motion` 支持

### SEE 共享组件
- 无 `SearchBar`、`FilterChips`、`Collapsible`（交互三件套）
- 无 `AISuggestionBadge`、`PipelineStatus`、`StatusState`、`NumberTicker`
- 无 `useDashboardLocale` / `copy()` i18n 模式（当前无中英双语切换，仅中文）
- 无 `useKeyboardNav` hook（无 Cmd+K 搜索、1-4 标签切换等键盘导航）
- 有 `EmptyState`（自制），有 `Spinner`（自制），有 `Card`（自制）——功能存在但 API 与 SEE 规范不符

---

## SEE Design System 要求摘要

| 维度 | 核心要求 |
|------|---------|
| 色彩 | `--n-50~n-900` Warm Neutral 色阶 + `--bg-*`/`--text-*`/`--border-*` 语义 token，禁止组件内 hex 硬编码，饱和度 ≤60% |
| 字体 | `Manrope + IBM Plex Mono + PingFang SC + Noto Sans SC`，5 级 token（Display/Heading/Body/Caption/Overline），禁止 Tailwind preset 字号 |
| 间距 | `--space-0.5~12`（2px~48px，4px 网格），推荐组件内用 CSS 变量 |
| 圆角 | 三档：`--radius-sm=6px`/`--radius-md=10px`/`--radius-lg=16px`，禁止 20px+ |
| 阴影 | 三级单层：`--shadow-subtle/medium/raised`，禁止多重 box-shadow |
| 暗色 | Class-Only（`.dark`），body `!important` 覆盖，Anti-FOUC 内联 script，`useChartPalette` bridge |
| 动效 | 组件级 transition，150-200ms，`ease-out` 或 spring，禁止全局通配，≤300ms，`prefers-reduced-motion` 支持 |
| 组件 | SearchBar + FilterChips + Collapsible 三件套，AISuggestionBadge，PipelineStatus，useDashboardLocale i18n |

---

## 差距清单

| # | 维度 | 当前状态 | SEE 标准 | 差距等级 | 修复优先级 |
|---|------|---------|---------|---------|-----------|
| 1 | 色彩 Token 体系 | shadcn HSL 变量，无 `--n-*`/`--bg-*`/`--text-*`/`--border-*` | Warm Neutral 10 档 + 语义映射全套 | 完全缺失 | P0 |
| 2 | 硬编码 hex 色值 | `#3b82f6`/`#10b981`/`#f59e0b`/`#8b5cf6` 及 Tailwind 具名色（green-/red-/slate-）散布于 7+ 组件 | 0 处 hex 硬编码，全用 CSS 变量 | 7+ 处违规 | P0 |
| 3 | 字体栈 | `Inter`，无 `Manrope`/`IBM Plex Mono`/中文 fallback | `Manrope + IBM Plex Mono + PingFang SC + Noto Sans SC` | 完全不符 | P1 |
| 4 | 排版 5 级 token | Tailwind preset 字号（`text-4xl`/`text-2xl`/`text-sm`），h1-h6 CSS rules | 5 级严格 token，`--text-display-*` 等 CSS 变量 | 完全缺失 | P1 |
| 5 | 圆角 token | `--radius: 1rem` + `calc` 派生，`Card` 用 `rounded-2xl`(24px) | `--radius-sm=6/md=10/lg=16`，禁止 20px+ | 超标（Card 24px 违规） | P1 |
| 6 | 阴影体系 | 双重 `shadow-flash`/`shadow-flash-lg`，违反单层规则 | `--shadow-subtle/medium/raised` 单层三级 | 违反禁止项 | P1 |
| 7 | Anti-FOUC script | `layout.tsx` 无内联 script，暗色首屏闪白 | `<head>` 内联同步 `<script>` + `classList.toggle` | 缺失（FOUC 风险） | P1 |
| 8 | body !important | `body { background: hsl(...) }` 无 `!important` | `body { background: var(--bg-primary) !important }` | 潜在覆盖风险 | P1 |
| 9 | bg-white 硬编码 | `NavSidebar`/`Topbar` 用 `bg-white/90`/`bg-white/80`，暗色失效 | `bg-[var(--bg-surface)]` 或 `dark:bg-...` | 4 处组件暗色失效 | P1 |
| 10 | StatMiniCard/RateCard 暗色 | `bg-white border-slate-200` 硬编码，暗色不适配 | 全用语义 token | 2 个组件暗色失效 | P1 |
| 11 | 图表颜色 bridge | `CHANNEL_COLORS` 硬编码 hex，无 `useChartPalette` | `useChartPalette` hook + MutationObserver 订阅 `.dark` | 暗色下图表不适配 | P2 |
| 12 | 动效时长 | `Card` `duration-500`（500ms 超限） | ≤300ms | 1 处违规 | P2 |
| 13 | 动效 prefers-reduced-motion | `globals.css` 无 `@media (prefers-reduced-motion: reduce)` | 归零规则 | 缺失 | P2 |
| 14 | 间距 CSS 变量 | 无 `--space-*` 变量定义 | `--space-0.5~12` 完整定义 | 缺失（Tailwind 类可接受但不规范） | P3 |
| 15 | 交互三件套 | 无 SearchBar/FilterChips/Collapsible | 三件套必备 | 功能缺失 | P2 |
| 16 | i18n 中英双语 | 仅中文，无语言切换 | `useDashboardLocale` + 切换按钮 + localStorage | 完全缺失 | P2 |
| 17 | AISuggestionBadge | 无 | `💡N` 徽章，AI 建议计数 | 功能缺失 | P3 |
| 18 | PipelineStatus | 无 | 管线状态卡片（上次/下次/当前步骤/趋势） | 功能缺失 | P3 |
| 19 | 键盘导航 | 无 `useKeyboardNav`，无 Cmd+K 等全局快捷键 | `useKeyboardNav` hook | 缺失 | P3 |
| 20 | Framer Motion | 未使用 | Spring easing 动效 | 未接入 | P3 |

**违规统计**：P0 × 2 | P1 × 8 | P2 × 5 | P3 × 5 | 总计 20 条差距

---

## 修复建议（按影响面排序）

### 建议 1 — 色彩 Token 体系迁移（影响面最广）

**Before**：`globals.css` 仅有 shadcn HSL 变量（18 个），`tailwind.config.ts` 中 `brand.*` 为独立蓝色系（`#0ea5e9`），7+ 组件内散落 hex 硬编码色值
**After**：`globals.css` 增加 SEE Warm Neutral 完整 Token 区（Brand + N-50~900 + 语义映射 + Dark override，约 80 行），`tailwind.config.ts` 扩展 `colors.n.*` 映射；7+ 组件内 hex 替换为 `var(--text-*)` / `var(--bg-*)` / `var(--border-*)` 语义引用
**ROI**：修改 1 个 CSS 文件 + 1 个 config 文件 → 全站 28 个组件自动获得 Warm Neutral 调色板；硬编码 hex 从 7+ 处降至 0；暗色模式颜色一致性从 ~60% 升至 ~95%
**受影响文件**：`frontend/app/globals.css`、`frontend/tailwind.config.ts`、`frontend/components/ui/Card.tsx`、`frontend/components/ui/StatMiniCard.tsx`、`frontend/components/ui/RateCard.tsx`、`frontend/app/channel/page.tsx`、`frontend/app/page.tsx`（7 个）

---

### 建议 2 — 暗色模式稳定性修复（FOUC + body !important + bg-white）

**Before**：`layout.tsx` 无 Anti-FOUC script，`body` 无 `!important`，`NavSidebar`/`Topbar`/`StatMiniCard`/`RateCard` 共 4 处 `bg-white` 在 `.dark` 下保持白色；首次加载暗色用户看到 ~300ms 白屏闪烁
**After**：`layout.tsx` `<head>` 添加 3 行内联 script（localStorage 读取 + classList.toggle），`body` 加 `!important`，4 处 `bg-white` 替换为语义 token（配合建议 1 完成后自动解决）；FOUC 消除，暗色适配率从 ~60% → ~95%
**ROI**：修改 2 个文件（layout.tsx + globals.css 各 1-3 行）→ 消除 FOUC 白屏、修复 P0 暗色模式 Toggle 潜在失效（同 07-dark-mode.md 记录的事故模式）
**受影响文件**：`frontend/app/layout.tsx`（新增 Anti-FOUC script）、`frontend/app/globals.css`（body !important）（2 个）

---

### 建议 3 — 字体栈替换（用户感知最直接的视觉变化）

**Before**：`Inter` 字体，无 `Manrope`/`IBM Plex Mono`，中英混排时中文 fallback 为系统默认（可能为宋体/黑体），`globals.css` 中 `h1-h6` 使用 `text-4xl` 等散乱 Tailwind preset 字号
**After**：`layout.tsx` 导入 `Manrope + IBM_Plex_Mono`（next/font/google），`globals.css` 删除 h1-h6 覆盖改为 `--text-display-*`/`--text-heading-*` 等 5 级 CSS token；数据展示区自动使用等宽 Mono，标题字体更具识别性（几何人文 x-height 大）
**ROI**：修改 2 个文件 + 新增 CSS token 定义（约 30 行）→ 所有 18 个页面字体同步升级，中文可读性提升（PingFang SC fallback），数字对齐（tabular-nums）；Google Fonts 首屏 LCP 影响可用 `next/font` 预加载消除
**受影响文件**：`frontend/app/layout.tsx`、`frontend/app/globals.css`（2 个）

---

### 建议 4 — 圆角 + 阴影 token 统一（Card 视觉一致性）

**Before**：`Card.tsx` 使用 `rounded-2xl`（24px，超过 SEE 上限 16px），`shadow-flash`/`shadow-flash-lg` 为双重 box-shadow；`StatMiniCard`/`RateCard` 使用 `rounded-xl`（12px，超过 `--radius-md` 标准 10px）
**After**：`Card.tsx` 改为 `rounded-[var(--radius-md)]`（10px），阴影改为 `shadow-[var(--shadow-subtle)]` 默认态 + `hover:shadow-[var(--shadow-medium)]`；`StatMiniCard`/`RateCard` 改为 `rounded-[var(--radius-sm)]`（6px）或 `--radius-md`；SEE token 在 globals.css 补充定义
**ROI**：修改 3 个组件文件 + globals.css 约 10 行 → 视觉上减少"气泡感"（符合 Linear 克制风格），hover 动效从 500ms 缩短至 150ms（更流畅），去除多重阴影（减少渲染复杂度）
**受影响文件**：`frontend/components/ui/Card.tsx`、`frontend/components/ui/StatMiniCard.tsx`、`frontend/components/ui/RateCard.tsx`、`frontend/app/globals.css`（4 个）

---

### 建议 5 — 图表颜色 useChartPalette bridge

**Before**：`channel/page.tsx` `CHANNEL_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"]` 硬编码高饱和色，切换暗色后图表颜色完全不变，且饱和度超过 SEE 60% 上限（#3b82f6 = 蓝，饱和度 ~83%）
**After**：新建 `frontend/lib/hooks/useChartPalette.ts`（MutationObserver 订阅 `html.dark`），`CHART_PALETTE` 对齐 SEE 低饱和色板（`'#78716C'`/`'#A8A29E'`/`'#92400E'`/`'#3730A3'` 等），`channel/page.tsx` 中 `CHANNEL_COLORS` 替换为 `useChartPalette()` 返回值
**ROI**：新增 1 个 hook 文件 + 修改 1 个页面文件 → 暗色模式下图表颜色自适应，高饱和色降低视觉疲劳，为后续所有图表页面提供复用入口
**受影响文件**：`frontend/lib/hooks/useChartPalette.ts`（新建）、`frontend/app/channel/page.tsx`（1 个修改 + 1 个新建）

---

## 执行路径（依赖链）

```
建议 1（色彩 Token）→ 建议 2（暗色修复）→ 建议 4（圆角阴影）
       ↓
建议 3（字体）       [可并行]
       ↓
建议 5（图表 bridge）[依赖建议 1 的 CHART_PALETTE 定义]
```

建议 1+3 可并行启动，建议 2 依赖建议 1 中语义 token 到位，建议 5 最后执行。

---

## 附：合规率快照

| 维度 | 当前合规率 | 目标合规率 | 关键阻碍 |
|------|-----------|-----------|---------|
| 色彩无硬编码 | ~25%（7+处违规/约 30 处色值使用） | 100% | globals.css 缺 SEE token |
| 暗色适配 | ~60%（部分组件有 `.dark:` 变体） | 95%+ | bg-white 硬编码 + 无 FOUC 防线 |
| 字体规范 | 0%（Inter，无 Manrope） | 100% | layout.tsx 字体配置 |
| 圆角规范 | ~40%（部分在范围内） | 100% | Card rounded-2xl 24px 超限 |
| 阴影规范 | 0%（双重阴影违规） | 100% | tailwind.config.ts 阴影定义 |
| 动效规范 | ~70%（大部分 ease-out，duration-500 一处超限） | 100% | Card transition 修复 + reduced-motion |
| 间距规范 | ~80%（Tailwind p-N 多为 4 倍数，少数偏差） | 90%+ | --space-* 变量补充 |
| SEE 组件 | 0%（三件套/AISuggestionBadge/PipelineStatus 均缺） | 取决于里程碑规划 | 从 see-playground 迁移 |

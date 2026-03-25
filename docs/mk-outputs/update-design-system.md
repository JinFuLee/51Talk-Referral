# Design System 更新报告 — 51Talk 品牌升级

**任务**：更新设计系统 12 模块为 51Talk 泰国转介绍运营品牌
**日期**：2026-03-25
**版本**：v2.0.0 → v3.0.0

---

## 变更摘要

### 核心品牌色更新（01-color.md）

| 变量 | v2 值 | v3 值（51Talk）| 说明 |
|------|-------|---------------|------|
| `--brand-p1` | #C2611F 陶土橘 | **#FFD100 金黄** | 51Talk 主品牌色 |
| `--brand-p2` | #4F6FA3 钢蓝 | **#1B365D 深蓝** | 51Talk 辅助色 |
| `--accent-spark` | #E8943A 暖琥珀 | **#E8932A 暖橙** | 微调，保持暖色调 |
| `--success` | #059669 | **#2D9F6F** | 51Talk 业务绿（达标） |
| `--warning` | #D97706 | **#E8932A** | 51Talk 业务橙（落后） |
| `--danger` | #DC2626 | **#E05545** | 51Talk 业务红（严重） |

### 新增预设（01-color.md）

`51talk-ops` 预设：专为 ref-ops-engine 定制，金黄+深蓝+暖橙，接入命令：

```bash
~/.claude/design-tokens/init-tokens.sh 51talk-ops ./frontend/app/globals.css
```

### 新增语义 Token 层（v3 全新）

#### 颜色语义 Token（01-color.md）

| Token | 值/引用 | 用途 |
|-------|---------|------|
| `--color-action` | `var(--brand-p2)` | 按钮/链接/焦点环 |
| `--color-action-hover` | #254D85 | 按钮 hover |
| `--color-action-text` | #FFFFFF | 深蓝按钮白字 |
| `--color-accent` | `var(--brand-p1)` | 金黄点缀（圆点/徽章） |
| `--color-accent-muted` | rgba(255,209,0,0.15) | 金黄低透明背景高亮 |
| `--color-success` | #2D9F6F | 达标/健康状态 |
| `--color-success-bg` | rgba(45,159,111,0.10) | 达标浅背景 |
| `--color-warning` | #E8932A | 落后/注意 |
| `--color-warning-bg` | rgba(232,147,42,0.10) | 落后浅背景 |
| `--color-danger` | #E05545 | 严重落后/失败 |
| `--color-danger-bg` | rgba(224,85,69,0.10) | 严重浅背景 |

#### 排版语义 Token（02-typography.md）

| Token | 映射 | 用途 |
|-------|------|------|
| `--font-heading` | `var(--font-display)` | 标题 |
| `--font-body` | `var(--font-sans)` | 正文 |
| `--font-label` | `var(--font-sans)` | 标签/按钮 |
| `--font-caption` | `var(--font-sans)` | 说明/辅助 |

#### 间距语义 Token（03-spacing.md）

| Token | 值 | 用途 |
|-------|-----|------|
| `--space-card` | 16px | 卡片内 padding |
| `--space-section` | 24px | 区块/节间距 |
| `--space-inline` | 8px | 行内元素间距 |
| `--space-page` | 40px | 页面水平边距 |

#### 阴影语义 Token（04-elevation.md）

| Token | 原名 | 用途 |
|-------|------|------|
| `--shadow-card` | `--shadow-subtle` | 卡片默认 |
| `--shadow-elevated` | `--shadow-medium` | 浮起元素 |
| `--shadow-modal` | `--shadow-raised` | 模态/Toast |

#### 动效语义 Token（05-motion.md）

| Token | 值 | 用途 |
|-------|-----|------|
| `--motion-fast` | 150ms ease-out | 微交互 |
| `--motion-normal` | 200ms ease-out | 标准交互 |
| `--motion-slow` | 300ms ease-out | 重要动效 |

### 组件系统升级（06-components.md）

**新增原子化分层**：
- Atoms：Badge / BrandDot / NumberTicker / MiniSparkline / RadialGauge
- Molecules：SearchBar / FilterChips / Collapsible / Card / PipelineStatus
- Organisms：WorkspaceShell / DashboardWorkspaceNav / BrandMark

**新增四态标准**：所有数据组件必须实现 loading / error / empty / data 四种状态。

### 暗色模式 51Talk 品牌映射（07-dark-mode.md）

| Token | Light | Dark |
|-------|-------|------|
| `--brand-p1-dark` | — | #FFE033（金黄亮化 10%） |
| `--brand-p2-dark` | — | #4A77B8（深蓝亮化） |
| `--color-action` (dark) | #1B365D | #4A77B8 |
| `--color-success` (dark) | #2D9F6F | #3DC48A |
| `--color-warning` (dark) | #E8932A | #F0A845 |
| `--color-danger` (dark) | #E05545 | #EF6E5F |

### 品牌标志更新（11-brand-mark.md）

- 添加 51Talk 业务寓意说明（转介绍增长循环飞轮）
- favicon 颜色更新为金黄(#FFD100)
- 新增深蓝背景+金黄标志的 Header 推荐用法
- 新增深色浏览器标签兼容版 favicon

---

## 变更文件清单

| 文件 | 版本 | 主要变更 |
|------|------|---------|
| `00-overview.md` | 2.0.0→3.0.0 | 51Talk 品牌描述，新增 51talk-ops 预设入口，模块索引更新 |
| `01-color.md` | 2.0.0→3.0.0 | 品牌色全换 + 语义 Token 层新增 + 图表色板更新 + 对比度表更新 |
| `02-typography.md` | 2.0.0→3.0.0 | 新增语义 Token（font-heading/body/label/caption）+ Tailwind 映射 |
| `03-spacing.md` | 2.0.0→3.0.0 | 新增语义 Token（space-card/section/inline/page）+ Tailwind 映射 |
| `04-elevation.md` | 2.0.0→3.0.0 | 新增阴影语义别名（shadow-card/elevated/modal）+ Tailwind 映射 |
| `05-motion.md` | 2.0.0→3.0.0 | 新增速度语义 Token（motion-fast/normal/slow）+ 使用规则 |
| `06-components.md` | 2.0.0→3.0.0 | 原子化分层（Atoms/Molecules/Organisms）+ 四态标准 + 规范更新 |
| `07-dark-mode.md` | 2.0.0→3.0.0 | 51Talk 品牌色完整暗色映射 |
| `08-quickstart.md` | 2.0.0→3.0.0 | 51talk-ops 预设接入 + v3 Token 注入说明 + 验收清单更新 |
| `11-brand-mark.md` | 2.0.0→3.0.0 | 51Talk 业务寓意 + 新 favicon 颜色 + Header 推荐用法 |

**未变更**：09-progressive-disclosure.md、10-iconography.md（按任务要求保持不变）

---

## 对 ref-ops-engine 前端的影响

**需要更新的地方**（下一步建议）：

1. `frontend/app/globals.css` 的品牌色变量（`:root` 中的 `--brand-p1`/`--brand-p2`）
2. 按钮/链接组件改用 `--color-action` 代替直接引用 `--brand-p2`
3. Badge/状态组件改用 `--color-success`/`--color-warning`/`--color-danger` 语义变量
4. 图表组件的 `CHART_PALETTE` 更新为 51Talk 业务语义色板

**无破坏性变更**：旧 token 名（`--shadow-subtle/medium/raised`、`--transition-fast/normal`）保留为向后兼容别名，现有组件无需立即迁移。

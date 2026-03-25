# 语义 Token 架构实现报告

## 完成状态
全部 5 步完成，commit `2f78fd48`，已 push main。

## 变更摘要

| 步骤 | 文件 | 内容 |
|------|------|------|
| 1 | `config/theme.json` (新建) | 唯一色值 SSoT：品牌/语义/图表/中性色 |
| 2 | `frontend/app/globals.css` | 新增语义 Token 层（`--color-action/accent` 系列 12 个变量） |
| 3 | `frontend/tailwind.config.ts` | 新增 `action` + `action-accent` Tailwind 语义类 |
| 4 | 49 个 `.tsx` 组件 | 135 处品牌色替换（brand-* → action/action-accent） |
| 5 | `scripts/lark_bot.py` | `_load_theme()` 从 theme.json 动态读取，C_BRAND_P1/P2/SUCCESS/WARNING/DANGER 绑定主题 |

## 替换规则对照

| 旧 class | 新 class | 语义 |
|----------|----------|------|
| `bg-brand-400` | `bg-action` | 主按钮/徽章背景 |
| `bg-brand-50/100` | `bg-action-surface` | 金黄浅底 |
| `hover:bg-brand-500` | `hover:bg-action-active` | 按钮悬停 |
| `text-brand-500/600` | `text-action-text` | 金黄底文字（深蓝色） |
| `border-brand-400` | `border-action` | 品牌边框 |
| `bg-navy-500` | `bg-action-accent` | 深蓝背景 |
| `text-navy-500` | `text-action-accent` | 深蓝文字 |

## 验证
- `npx tsc --noEmit` 零错误
- 54 个文件变更，247 行新增，165 行删除
- brand-* 品牌色引用 = 0（已全部语义化）
- navy-500/600 品牌色引用 = 0

## 主题切换验证方法
修改 `config/theme.json` 中 `brand.primary` 为其他颜色 → 刷新浏览器 → 全站按钮/高亮随之变更（无需改任何组件代码）。

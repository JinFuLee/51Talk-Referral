# 色彩 Token 统一 — 结果报告

## 执行摘要

将 frontend/ 中所有旧色 `emerald-*` / `blue-*` / `sky-*` 替换为项目 `brand-*` / `navy-*` 色板。

## 替换统计

| 源色 | 目标色 | 场景 | 文件数 |
|------|--------|------|--------|
| emerald-600 | brand-500 | 进度上升/按钮文字/图标 | 3 |
| emerald-500 | brand-400 | Toggle 开关激活背景 | 1 |
| emerald-100/700 | brand-100/600 | CC 角色标签 | 1 |
| emerald-500/600 | brand-400/500 | 按钮边框/文字 | 1 |
| blue-600 | navy-500 | 达成率信息/排序激活列/数值文字 | 6 |
| blue-500 | navy-400 | 进度条/漏斗条/loading图标 | 5 |
| blue-400 | navy-300 | hover ring/图表图例 | 3 |
| blue-100/700 | navy-100/600 | SS 角色标签/报告类型徽章 | 2 |
| blue-50 | navy-50 | hover 行背景/场景卡背景 | 4 |
| blue-600 (active) | navy-500 | 围场筛选激活按钮 | 1 |
| blue-500 (border) | navy-400 | Lark 机器人边框 | 1 |
| blue-200/50 | navy-100/50 | 保守方案卡背景 | 1 |
| blue-400 (ring) | navy-300 | Heatmap hover/CC名称 hover | 1 |
| focus:ring-blue-500 | focus:ring-navy-400 | input/select focus ring | 7 |
| sky-* | — | 已无（首次扫描即 0 匹配） | 0 |

**总计：28 个文件，38 file changed，191 insertions / 180 deletions**

## 保留不改（语义色）

| 色值 | 原因 |
|------|------|
| emerald-500/600/700 | `success: <CheckCircle2>` / `text-emerald-500` (✓成功/通过) |
| emerald-100/700 | PreviewModal "生成成功" 状态徽章 |
| emerald-50/700 | DataSourceBadge `green` variant |
| blue-100/700 | LifecycleBadge 月份颜色编码（0M绿/1M蓝/2M黄/3M红，独立语义系统） |

## 验证

- `npx tsc --noEmit` → 0 errors
- `git push` → 成功推送至 main (628a4e10)

# MK 产出：三档目标前端 TargetRecommender 重构

> commit: a6519f6f | 2026-03-27

## 变更文件

- `frontend/components/settings/TargetRecommender.tsx` — 完整重构（257 行删除，601 行新增）
- `frontend/app/settings/page.tsx` — 集成新 TargetRecommender 组件

## 实现要点

### 三档布局
- **一档（pace）**：稳达标，只读，默认高亮
- **二档（share）**：占比达标，只读，需填公司总业绩才解锁
- **三档（custom）**：自定义，含可编辑输入 + "推算"按钮

### API 调用
- `GET /api/config/targets/tiers?include_pace=true[&company_revenue=N&referral_share=0.3]` — SWR 自动刷新
- `GET /api/config/targets/tiers?include_custom=true&...custom_params` — 点"推算"后调用
- `POST /api/config/targets/apply?tier=pace|share|custom` — 点"应用"后调用，带 body

### 设计规范
- 使用 `card-base`、`input-base`、`btn-secondary` 语义类
- 预览表使用 `slide-thead-row`、`slide-th`、`slide-td`、`slide-row-even/odd`、`slide-tfoot-row`
- 禁止内联 `style={{ color }}`，所有视觉属性从 globals.css 类继承
- 数字全部 `font-mono tabular-nums`
- `formatUSD` / `formatRate` / `formatValue` 工具函数

### 三态
- loading: SkeletonChart
- error: state-error + 重试按钮
- 二档无数据: 禁用态（opacity-50 + 提示文案）

### I18N
- 中英双语内联字典 `const I18N = { zh, en }`
- 默认中文，header 右侧切换按钮
- `localStorage` 持久化（未实现，当前为 useState，后续可扩展）

## 验收对照

| # | 验收项 | 状态 |
|---|-------|------|
| 1 | 三档卡片横排渲染 | ✓ TypeScript 零错误 |
| 2 | 一档只读 + 默认高亮 | ✓ |
| 3 | 二档需 company_revenue 解锁 | ✓ tierData=null 时禁用态 |
| 4 | 三档可编辑 + 推算 | ✓ |
| 5 | 全链路预览表（slide-* class） | ✓ |
| 6 | 应用区显示选中档位摘要 | ✓ |
| 7 | Settings 页面集成 | ✓ |
| 8 | 中英双语 | ✓ |
| 9 | ESLint 零警告 | ✓ |

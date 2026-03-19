# w2b-frontend-compliance

日期: 2026-03-10
提交: 8defcc23

## 变更摘要

### 1. ImpactSlide.tsx — 删除 FALLBACK_DATA
- 删除 L47-59 的 FALLBACK_DATA 常量（6 条含假业务金额 $3200/$2100/$1800/$1400/$900/$650 的记录，total_loss_usd: $10050）
- 原 fallback 逻辑 `!error && data?.items?.length ? data : FALLBACK_DATA` 改为空态 UI
- 空态显示两种状态：loading → "正在加载影响链数据..." / no data → "暂无影响链数据，请先运行分析 POST /api/analysis/run"
- 正常数据路径逻辑不变，WaterfallChart 子组件保留

### 2. DataSourceBadge.tsx — 补全三种信源标签
新增 no_data / unavailable / approximate 三个分支，插入在 empty/none 之前：
- `no_data` → 标签"暂无数据"，gray
- `unavailable` → 标签"数据不可用"，yellow
- `approximate` → 标签"近似数据"，yellow

## SEE 闭环验证

| 步骤 | 结果 |
|------|------|
| Grep FALLBACK_DATA/MOCK_DATA/_DEMO_ | 0 命中（仅 WhatIfSlide.tsx JSDoc 注释，非数据模式） |
| tsc --noEmit | 0 errors |
| vitest run | 161/161 passed |
| pnpm build | 49 pages 成功，0 errors，2 pre-existing ESLint warnings |

## 变更文件
- frontend/components/presentation/ImpactSlide.tsx
- frontend/components/ui/DataSourceBadge.tsx

# Channel Page Null Fix — SS/LP/宽口

## 变更摘要

修复渠道分析页面 SS/LP窄/宽口 渠道在「业绩贡献」汇总表中 appointments/attendance/payments/revenue_usd 显示 `0` 而非 `—` 的问题，并补全相关组件的 null 安全处理。

## 根因

- `ChannelMetrics` TypeScript 类型定义为 `number`（非 nullable），但后端对这些渠道返回 `null`
- `channel/page.tsx` 使用 `n(v) = v ?? 0` 将 null 转 0，掩盖了"无数据"与"零值"的语义差异

## 修改文件

| 文件 | 变更内容 |
|------|---------|
| `frontend/lib/types/channel.ts` | 所有 number 字段改为 `number \| null` |
| `frontend/app/channel/page.tsx` | 替换 `n()` 为 null-aware helpers（fmtNum/fmtUsd/fmtPct/fmtGap），添加表头 tooltip + 数据范围说明 |
| `frontend/components/channel/ThreeFactorTable.tsx` | FactorBadge 接受 null，null 显示 `—` |
| `frontend/components/channel/RevenueContributionTable.tsx` | null-safe revenue/share 算术 |
| `frontend/components/funnel/ChannelFunnelTable.tsx` | null-safe totals 累加 + convRate 参数 + 单元格渲染 |

## 业务逻辑说明

SS/LP/宽口 数据来源（D2）只含「带新参与数」，无完整漏斗。
- `registrations` 字段 = 带新参与数（有值）
- `appointments` / `attendance` / `payments` / `revenue_usd` = null（无此指标）
- 前端显示 `—` 而非 `0`，区分「无数据」与「零值」

## 额外修复

「净拆解」tab 的 `share` 字段：后端返回 0–1 小数，旧代码 `n(c.share) / 100` 会双重除以 100（如 100% 显示为 1%）。现改为直接传 `c.share` 给 `formatRate`。

## TypeScript 验证

`npx tsc --noEmit` 0 errors

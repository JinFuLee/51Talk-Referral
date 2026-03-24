# T3 前端：数据源健康面板

## 状态：完成 ✓

commit: `5087d54c`
TypeScript 检查：0 错误

## 变更清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `frontend/lib/types.ts` | 修改 | 新增 `FreshnessTier`/`RowAnomalyStatus` 类型 + `DataSourceStatus` 扩展 14 字段（含 `name`） |
| `frontend/components/datasources/DataSourceHealthCard.tsx` | 新建 | 5 子组件卡片：FreshnessBadge / RowStatus / UtilizationBar |
| `frontend/components/datasources/DataSourceSummaryBar.tsx` | 新建 | 同步状态 + 日期一致性 + 健康分计算 |
| `frontend/components/datasources/DataSourceSection.tsx` | 新建 | 编排组件：SummaryBar + 5列响应式网格 |
| `frontend/app/page.tsx` | 修改 | 引入 `useDataSources` + `DataSourceSection`，替换内联 pill 徽章 |

## 设计 token 合规

- 零硬编码色值：背景/文字/边框全部 `var(--xxx)` 或 shadcn HSL class
- 状态色：`bg-success/10 text-success` / `bg-warning/10 text-warning` / `bg-destructive/10 text-destructive`
- 进度条填充：`hsl(var(--primary))` + `var(--n-400)` fallback

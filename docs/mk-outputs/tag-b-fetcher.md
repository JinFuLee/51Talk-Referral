# Tag B — useFilteredSWR 全站推广 输出报告

**完成时间**: 2026-04-05  
**commit**: b9682436

## 执行摘要

将 `frontend/app/` 下仅剩的 2 个直接 `useSWR` 调用迁移到 `useFilteredSWR`。

## 变更文件

| 文件 | 变更内容 |
|------|---------|
| `frontend/app/[locale]/live-orders/page.tsx` | `useSWR` → `useFilteredSWR`，保留 `refreshInterval: 15000` 配置 |
| `frontend/app/[locale]/notifications/RoutingMatrix.tsx` | `useSWR` → `useFilteredSWR`，移除 `swrFetcher` import |

## 关键决策

**mutate 调用处理**：`useFilteredSWR` 构建的 SWR key 包含动态 query params，原 `mutate(exactKey)` 精确匹配会失效。改用 filter 函数模式：

```ts
// Before（失效）
mutate('/api/live-orders');

// After（正确匹配带参数的 key）
mutate((key) => typeof key === 'string' && key.startsWith('/api/live-orders'));
```

## 验收结果

| 指标 | 目标 | 实际 |
|------|------|------|
| `useSWR` 直接调用（app/） | ≤5 | **0** |
| `useFilteredSWR` 使用文件数（app/） | ≥30 | **38** |

## 豁免说明

- `frontend/components/ui/UnifiedFilterBar.tsx`：获取 `/api/filter/options` 和 `/api/archives/months`，是筛选选项元数据，不依赖维度筛选，正确保留 `useSWR`
- `frontend/lib/hooks/use-filtered-swr.ts`、`use-compare-data.ts`、`config-store.ts`：hook 定义层，豁免

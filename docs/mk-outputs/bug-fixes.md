# TAG-BUG 修复报告

## 修复摘要

共修复 4 个前端 Bug，TypeScript 类型检查：0 errors。

## Fix 1 & 2：rateColor / rateBg 可选链保护

**文件**：
- `frontend/components/checkin/RankingTab.tsx`
- `frontend/components/checkin/TeamDetailTab.tsx`

**变更**：
- `RoleColumnProps.rateColor` 类型改为 `optional`（`rateColor?`）
- `TeamCardProps.rateColor` / `rateBg` 类型改为 `optional`
- 所有调用点从 `rateColor(x)` → `rateColor?.(x) ?? ''`
- 覆盖调用点：RankingTab 3 处，TeamDetailTab 4 处

**调用点清单**：
- RankingTab L72：`rateColor?.(summary.checkin_rate) ?? ''`
- RankingTab L131：`rateColor?.(row.rate) ?? ''`
- RankingTab L153：`rateColor?.(summary.checkin_rate) ?? ''`
- TeamDetailTab L85：`rateBg?.(card.checkinRate) ?? ''`
- TeamDetailTab L125：`rateColor?.(m.rate) ?? ''`
- TeamDetailTab L143：`rateColor?.(card.checkinRate) ?? ''`
- TeamDetailTab L248：`rateColor?.(roleSummary.checkin_rate) ?? ''`

## Fix 3：ch.checkin_rate ?? 0 空值保护

**文件**：`frontend/app/checkin/page.tsx`

**变更**：
- `rateBg(ch.checkin_rate)` → `rateBg(ch.checkin_rate ?? 0)`（L100）
- `fmtRate(ch.checkin_rate)` → `fmtRate(ch.checkin_rate ?? 0)`（L103）

**注意**：`ch.by_team` / `ch.by_enclosure` 已在构建 `channels` 数组时（L201-202）加 `?? []` 保护，无需额外修改。

## Fix 4：useCompareSummary SWR key 禁用

**文件**：`frontend/lib/hooks.ts`（L475-490）

**变更**：SWR key 从条件性 `compareMode !== 'off' ? [...] : null` 改为始终 `null`，阻止向不存在的 `/api/analysis/compare-summary` 端点发请求。

**恢复方式**：后端实现端点后，将 `null` 改回：
```ts
compareMode !== 'off' ? ["analysis/compare-summary", period, compareMode] : null
```

## 验证

```
npx tsc --noEmit → 0 errors（exit 0）
```

## SEE 全局扫描结果

- `rateColor(` 不带 `?.` 的调用：`AchievementRing.tsx` + `ContactGauge.tsx` + `page.tsx` 三处均为本地纯函数或 hook 直接解构（不经 prop 传递），不需要可选链
- `useCompareSummary` 消费方：`ComparisonBanner.tsx`（已有 isLoading 保护，data 返回 null 安全）
- `.length` 裸调用：未发现无 Array.isArray 保护且值可能为 null 的模式

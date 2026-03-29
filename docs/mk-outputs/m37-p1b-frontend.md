# M37 Phase1B 前端维度类型 + Store + Hooks — 产出报告

**完成时间**: 2026-03-29
**commit**: feat(M37): add dimension types + extend config-store + rewrite useFilteredSWR v2
**tsc**: 零错误

## 交付文件（6 个）

| 文件 | 类型 | 变更 |
|------|------|------|
| `frontend/lib/types/filters.ts` | 新建 | 7 联合类型 + DimensionState + PageDimensions + FilterOptions + DIMENSION_DEFAULTS |
| `frontend/lib/stores/config-store.ts` | 修改 | 新增 8 维度字段 + 8 setter + 7 validator，现有字段 100% 保留 |
| `frontend/lib/hooks/use-filtered-swr.ts` | 重写 v2 | 全维度自动传参，默认值省略，camelCase→snake_case |
| `frontend/lib/use-filter-sync.ts` | 重写 v2 | 全 11 个 URL param 双向同步 |
| `frontend/lib/use-compare-data.ts` | 修改 | 新增 useCompareDataV2(benchmarks 驱动)，v1 向后兼容 |
| `frontend/lib/hooks/use-page-dimensions.ts` | 新建 | 页面维度声明 + UnifiedFilterBar 消费接口 |

## 关键实现细节

### config-store 新增字段（8 个，含默认值）
- country: 'TH'
- dataRole: 'all'
- enclosure: null
- granularity: 'month'
- funnelStage: 'all'
- channel: 'all'
- behavior: null
- benchmarks: ['target']

### useFilteredSWR v2 序列化规则
- 默认值省略：country='TH', dataRole='all', granularity='month', funnelStage='all', channel='all' 均不传
- null 不传：enclosure=null, behavior=null 均不传
- 数组逗号拼接：enclosure=['M0','M1'] → "M0,M1"
- camelCase→snake_case：dataRole→data_role, funnelStage→funnel_stage
- benchmarks 总是传
- 保留 extraParams 覆盖能力

### onRehydrateStorage 新增验证器
validateDataRole / validateGranularity / validateFunnelStage / validateChannel / validateBenchmarks / validateEnclosure / validateBehavior

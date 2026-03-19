# 数据密集风格修改产出

## 变更摘要

**commit**: `6e90c42f` — style: 数据密集风格 — slides 表格收紧 + settings 紧凑化 + 页面 space-y-3
**16 files changed, 157 insertions(+), 157 deletions(-)**

## 修改文件清单

### slides 组件（9个）
- `frontend/components/slides/ThreeFactorSlide.tsx`
- `frontend/components/slides/RevenueDecompositionSlide.tsx`
- `frontend/components/slides/FunnelAttributionSlide.tsx`
- `frontend/components/slides/NetAttributionSlide.tsx`
- `frontend/components/slides/RevenueContributionSlide.tsx`
- `frontend/components/slides/ScenarioAnalysisSlide.tsx`
- `frontend/components/slides/LeadAttributionSlide.tsx`
- `frontend/components/slides/ChannelRevenueSlide.tsx`

表头统一：`bg-[var(--n-800)] text-white text-xs font-medium py-1.5 px-2`
表体统一：`py-1 px-2 text-xs`，数字列加 `font-mono tabular-nums text-right`

### settings 页面（4个）
- `frontend/app/settings/EnclosureSettingsCard.tsx` — 表头同上
- `frontend/app/settings/ChannelSettingsCard.tsx` — 表头同上，表体 px-2 py-1 text-xs
- `frontend/app/settings/SOPSettingsCard.tsx` — gap-4 → gap-2
- `frontend/app/settings/TargetSettingsCard.tsx` — gap-4 → gap-2，space-y-4 → space-y-2

### 全局页面间距（4个）
- `frontend/app/page.tsx` — space-y-6 → space-y-3
- `frontend/app/funnel/page.tsx` — space-y-6 → space-y-3
- `frontend/app/enclosure/page.tsx` — space-y-6 → space-y-3
- `frontend/app/channel/page.tsx` — space-y-6 → space-y-3

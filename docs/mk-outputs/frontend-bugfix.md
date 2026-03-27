# 前端 Bug 1+4 修复交付报告

## 修复清单

### Bug 1: 缺口仪表盘默认视角
- **文件**: `frontend/components/analytics/GapDashboardSlide.tsx` L98
- **修改**: `useState<GapView>('bm')` → `useState<GapView>('monthly')`
- **效果**: 打开分析页默认显示月度达标视角，用户无需手动切换

### Bug 4: GAP 列率类指标单位错误
- **文件**: `frontend/components/analytics/MonthlyOverviewSlide.tsx` L198-204
- **修改**: 移除 `isRate ? pp 格式 : %格式` 分支，统一 `${gap >= 0 ? '+' : ''}${formatRate(gap)}`
- **效果**: 所有 GAP 列统一显示 `+1.2%` / `-0.5%` 格式，无 `pp` 单位

### 额外修复 1: bm_efficiency=0 时显示 "—"
- **位置**: MonthlyOverviewSlide.tsx L194-196
- **修改**: `eff != null` → `eff != null && eff !== 0`
- **效果**: 过程指标 target=0 导致 bm_efficiency 无意义时显示 "—" 而非 "0.0%"

### 额外修复 2: remaining_daily_avg=0 时显示 "—"
- **位置**: MonthlyOverviewSlide.tsx L207-209
- **修改**: 直接 `fmtVal(key, dailyAvg)` → `dailyAvg != null && dailyAvg !== 0 ? fmtVal(key, dailyAvg) : '—'`
- **效果**: target=0 → rdaily=0 时显示 "—" 而非 "0"

### 预存 TypeScript 错误修复
- **文件**: `frontend/lib/types/report.ts` L184
- **修改**: `GapDashboard` 接口添加 `monthly?: GapDashboard` 可选字段
- **效果**: tsc --noEmit 零错误（修复前该错误已存在）

## 验证
- `npx tsc --noEmit` 输出：0 errors
- git commit: `73ad9383`
- git push: 成功推送到 main

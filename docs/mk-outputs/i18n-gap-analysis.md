# i18n 缺口分析报告

**生成时间**: 2026-04-05  
**分析范围**: `frontend/components/**/*.tsx` + `frontend/app/**/*.tsx`

---

## 总览

| 分类 | 文件数 |
|------|--------|
| 含中文字符的文件（总） | 207 |
| 已用 `useTranslations` | 30 |
| 内联 I18N 字典（需迁移） | ~170 |
| 仅注释/特殊场景（不需迁移） | 7 |

**核心发现**：绝大多数文件采用了**自制内联 I18N 字典**模式（`const LABELS = { zh: {...}, 'zh-TW': {...}, en: {...}, th: {...} }`），这是一套与 next-intl 并行运行的方案，需要统一迁移至 `useTranslations`。

---

## 已完成 useTranslations 的文件（30 个，不需迁移）

### components/
- `frontend/components/ui/UnifiedFilterBar.tsx`
- `frontend/components/reports/ReportViewer.tsx`
- `frontend/components/members/LifecycleBadge.tsx`
- `frontend/components/layout/NavSidebar.tsx`
- `frontend/components/layout/BottomTabBar.tsx`
- `frontend/components/snapshots/SnapshotStatsCard.tsx`
- `frontend/components/layout/Topbar.tsx`

### app/
- `frontend/app/[locale]/reports/page.tsx`
- `frontend/app/[locale]/renewal-risk/page.tsx`
- `frontend/app/[locale]/referral-contributor/page.tsx`
- `frontend/app/[locale]/outreach-quality/page.tsx`
- `frontend/app/[locale]/indicator-matrix/page.tsx`
- `frontend/app/[locale]/high-potential/page.tsx`
- `frontend/app/[locale]/geo-distribution/page.tsx`
- `frontend/app/[locale]/funnel/page.tsx`
- `frontend/app/[locale]/enclosure/page.tsx`
- `frontend/app/[locale]/data-health/page.tsx`
- `frontend/app/[locale]/channel/page.tsx`
- `frontend/app/[locale]/analytics/page.tsx`
- `frontend/app/[locale]/present/[audience]/[timeframe]/page.tsx`
- `frontend/app/[locale]/settings/page.tsx`
- `frontend/app/[locale]/members/page.tsx`
- `frontend/app/[locale]/learning-heatmap/page.tsx`
- `frontend/app/[locale]/knowledge/page.tsx`
- `frontend/app/[locale]/error.tsx`
- `frontend/app/[locale]/enclosure-health/page.tsx`
- `frontend/app/[locale]/daily-monitor/page.tsx`
- `frontend/app/[locale]/cc-performance/page.tsx`
- `frontend/app/[locale]/attribution/page.tsx`
- `frontend/app/[locale]/notifications/page.tsx`

---

## 不需迁移的特殊文件（7 个）

| 文件 | 原因 |
|------|------|
| `frontend/app/global-error.tsx` | layout 崩溃时 next-intl hooks 不可用，内联字典是唯一正确方案 |
| `frontend/components/providers/ErrorBoundary.tsx` | 同上，ErrorBoundary 可能在 next-intl Provider 外触发 |
| `frontend/app/[locale]/reports/ops/page.tsx` | 中文仅在注释，无 UI 文案 |
| `frontend/app/[locale]/reports/exec/page.tsx` | 中文仅在注释，无 UI 文案 |
| `frontend/components/ui/ResponsiveChartContainer.tsx` | 中文仅在注释 |
| `frontend/components/ui/MiniSparkline.tsx` | 中文仅在注释 |
| `frontend/components/presentation/CursorGlow.tsx` | 中文仅在注释 |

---

## 需要迁移的文件（内联 I18N 字典模式）

### 按优先级分组

#### P1 — 高频页面入口（用户最先看到）

**app/[locale] 页面（共 33 个）**
```
frontend/app/[locale]/page.tsx
frontend/app/[locale]/layout.tsx
frontend/app/[locale]/team/page.tsx
frontend/app/[locale]/checkin/page.tsx
frontend/app/[locale]/present/page.tsx
frontend/app/[locale]/access-control/page.tsx
frontend/app/[locale]/access-control/PageOverview.tsx
frontend/app/[locale]/access-control/PermissionMatrix.tsx
frontend/app/[locale]/access-control/RoleEditor.tsx
frontend/app/[locale]/access-control/UserManagement.tsx
frontend/app/[locale]/(auth)/login/page.tsx
frontend/app/[locale]/(auth)/access-denied/page.tsx
frontend/app/[locale]/students/360/page.tsx
frontend/app/[locale]/personnel-matrix/page.tsx
frontend/app/[locale]/live-orders/page.tsx
frontend/app/[locale]/incentive-tracking/page.tsx
frontend/app/[locale]/high-potential/warroom/page.tsx
frontend/app/[locale]/followup-quality/page.tsx
frontend/app/[locale]/expiry-alert/page.tsx
frontend/app/[locale]/members/page.tsx
```

**settings 子组件（共 10 个）**
```
frontend/app/[locale]/settings/TargetSettingsCard.tsx
frontend/app/[locale]/settings/SOPSettingsCard.tsx
frontend/app/[locale]/settings/SMTargetImportCard.tsx
frontend/app/[locale]/settings/IndicatorMatrixCard.tsx
frontend/app/[locale]/settings/IncentiveBudgetCard.tsx
frontend/app/[locale]/settings/EnclosureRoleCard.tsx
frontend/app/[locale]/settings/DataSourceCard.tsx
frontend/app/[locale]/settings/CheckinThresholdsCard.tsx
frontend/app/[locale]/settings/BmCalendarCard.tsx
frontend/app/[locale]/settings/ExchangeRateCard.tsx
frontend/app/[locale]/settings/EnclosureSettingsCard.tsx
frontend/app/[locale]/settings/ChannelSettingsCard.tsx
```

**notifications 子组件（共 8 个）**
```
frontend/app/[locale]/notifications/ScheduleManager.tsx
frontend/app/[locale]/notifications/RoutingMatrix.tsx
frontend/app/[locale]/notifications/PushControl.tsx
frontend/app/[locale]/notifications/PreviewModal.tsx
frontend/app/[locale]/notifications/OutputGallery.tsx
frontend/app/[locale]/notifications/BotFormModal.tsx
frontend/app/[locale]/notifications/BotCard.tsx
frontend/app/[locale]/notifications/TodayStatus.tsx
frontend/app/[locale]/notifications/PushProgress.tsx
frontend/app/[locale]/notifications/BotManager.tsx
```

#### P2 — 核心业务组件（checkin / cc-performance / enclosure）

```
frontend/components/checkin/SummaryTab.tsx
frontend/components/checkin/StudentTagBadge.tsx
frontend/components/checkin/StudentRankingPanel.tsx
frontend/components/checkin/StudentInsightsTab.tsx
frontend/components/checkin/RoiChannelMatrix.tsx
frontend/components/checkin/RoiStudentTable.tsx
frontend/components/checkin/RoiAnalysisTab.tsx
frontend/components/checkin/RoiDashboard.tsx
frontend/components/checkin/RankingTab.tsx
frontend/components/checkin/OpsStudentRanking.tsx
frontend/components/checkin/OpsChannelView.tsx
frontend/components/checkin/LessonCheckinCross.tsx
frontend/components/checkin/FollowupTab.tsx
frontend/components/checkin/CCStudentDrilldown.tsx
frontend/components/checkin/ContactCheckinChart.tsx
frontend/components/checkin/ConversionFunnelProof.tsx
frontend/components/checkin/EnclosureParticipationChart.tsx
frontend/components/checkin/RenewalCheckinChart.tsx
frontend/components/checkin/StudentFrequencyChart.tsx
frontend/components/cc-performance/CCPerformanceTable.tsx
frontend/components/cc-performance/CCPerformanceSummaryCards.tsx
frontend/components/cc-performance/CCPerformanceDetail.tsx
frontend/components/cc-performance/CCTargetUpload.tsx
frontend/components/enclosure/CCRankingTable.tsx
frontend/components/enclosure/EnclosureFilter.tsx
frontend/components/enclosure/EnclosureHeatmap.tsx
frontend/components/enclosure/MetricRadar.tsx
frontend/components/enclosure-health/CCVarianceBox.tsx
frontend/components/enclosure-health/HealthScoreCards.tsx
frontend/components/enclosure-health/SegmentBenchmark.tsx
```

#### P3 — 共享 UI 组件 / slides / analytics

**共享 UI**
```
frontend/components/ui/BenchmarkSelector.tsx
frontend/components/ui/CoPilotTerminal.tsx
frontend/components/ui/DataSourceBadge.tsx
frontend/components/ui/EmptyState.tsx
frontend/components/ui/ExportButton.tsx
frontend/components/ui/KnowledgeLink.tsx
frontend/components/ui/NotificationCenter.tsx
frontend/components/ui/PageHeader.tsx
frontend/components/ui/PageTabs.tsx
frontend/components/ui/Pagination.tsx
frontend/components/ui/PresentationOverlay.tsx
frontend/components/ui/RateCard.tsx
frontend/components/ui/RiskAlert.tsx
frontend/components/ui/SortableHeader.tsx
frontend/components/ui/StatMiniCard.tsx
frontend/components/ui/UnifiedFilterBar.tsx (已迁移，仅列备考)
frontend/components/shared/ComparisonBanner.tsx
frontend/components/shared/HistoricalMonthBanner.tsx
frontend/components/shared/StatCard.tsx
```

**slides/**
```
frontend/components/slides/ChannelRevenueSlide.tsx
frontend/components/slides/ConversionRateSlide.tsx
frontend/components/slides/FunnelAttributionSlide.tsx
frontend/components/slides/LeadAttributionSlide.tsx
frontend/components/slides/NetAttributionSlide.tsx
frontend/components/slides/RevenueContributionSlide.tsx
frontend/components/slides/RevenueDecompositionSlide.tsx
frontend/components/slides/ScenarioAnalysisSlide.tsx
frontend/components/slides/TargetGapSlide.tsx
frontend/components/slides/ThreeFactorSlide.tsx
```

**analytics/ (旧版 Slide)**
```
frontend/components/analytics/ChannelRevenueSlide.tsx
frontend/components/analytics/ChannelThreeFactorSlide.tsx
frontend/components/analytics/DecompositionWaterfallSlide.tsx
frontend/components/analytics/FunnelLeverageSlide.tsx
frontend/components/analytics/GapDashboardSlide.tsx
frontend/components/analytics/LeadAttributionSlide.tsx
frontend/components/analytics/MomAttributionSlide.tsx
frontend/components/analytics/MonthlyOverviewSlide.tsx
frontend/components/analytics/ProjectionSlide.tsx
frontend/components/analytics/RevenueContributionSlide.tsx
frontend/components/analytics/ScenarioCompareSlide.tsx
```

**其余组件**
```
frontend/components/attribution/AchievementRing.tsx
frontend/components/attribution/ContributionBreakdown.tsx
frontend/components/attribution/GapSimulator.tsx
frontend/components/cc-matrix/CCHeatmap.tsx
frontend/components/cc-matrix/CCRadarChart.tsx
frontend/components/cc-matrix/EfficiencyScatter.tsx
frontend/components/channel/ChannelPieChart.tsx
frontend/components/channel/RevenueContributionTable.tsx
frontend/components/channel/ThreeFactorTable.tsx
frontend/components/daily-monitor/CCContactRanking.tsx
frontend/components/daily-monitor/ContactConversionScatter.tsx
frontend/components/daily-monitor/RoleCompare.tsx
frontend/components/daily-monitor/SegmentContactBar.tsx
frontend/components/dashboard/AchievementGauge.tsx
frontend/components/dashboard/AnomalyBanner.tsx
frontend/components/dashboard/BmComparisonTable.tsx
frontend/components/dashboard/DecisionSummary.tsx
frontend/components/dashboard/FunnelSnapshot.tsx
frontend/components/dashboard/OverviewSummaryCards.tsx
frontend/components/dashboard/PersonalWorkbench.tsx
frontend/components/dashboard/TargetGapCard.tsx
frontend/components/datasources/DataSourceGrid.tsx
frontend/components/datasources/DataSourceHealthCard.tsx
frontend/components/datasources/DataSourceSection.tsx
frontend/components/datasources/DataSourceSummaryBar.tsx
frontend/components/datasources/FileUploadPanel.tsx
frontend/components/funnel/ChannelFunnelTable.tsx
frontend/components/funnel/ConversionRateBar.tsx
frontend/components/funnel/ScenarioTable.tsx
frontend/components/high-potential/HighPotentialFilters.tsx
frontend/components/high-potential/HighPotentialTable.tsx
frontend/components/knowledge/BookmarkPanel.tsx
frontend/components/knowledge/BookShelf.tsx
frontend/components/knowledge/ChapterTree.tsx
frontend/components/knowledge/MarkdownReader.tsx
frontend/components/knowledge/ReadingGuide.tsx
frontend/components/knowledge/SearchBar.tsx
frontend/components/layout/DataSourceStatus.tsx
frontend/components/layout/Header.tsx
frontend/components/layout/LangSwitcher.tsx
frontend/components/layout/RoleSwitcher.tsx
frontend/components/layout/Sidebar.tsx
frontend/components/members/MemberDetailDrawer.tsx
frontend/components/members/MemberTable.tsx
frontend/components/presentation/PresentationLauncher.tsx
frontend/components/presentation/SlideShell.tsx
frontend/components/reports/MarkdownRenderer.tsx
frontend/components/reports/ReportDownloader.tsx
frontend/components/settings/TargetRecommender.tsx
frontend/components/student-360/DailyLogTab.tsx
frontend/components/student-360/Profile360Drawer.tsx
frontend/components/student-360/ReferralNetwork.tsx
frontend/components/student-360/StudentSearch.tsx
frontend/components/student-360/StudentTable.tsx
frontend/components/team/TeamCompareChart.tsx
frontend/components/team/TeamSummaryCard.tsx
frontend/components/warroom/ContactTimeline.tsx
frontend/components/warroom/HPFunnel.tsx
frontend/components/warroom/UrgencyCards.tsx
```

---

## 迁移策略说明

### 当前内联字典模式（需替换）
```tsx
// 典型模式 — 需要迁移
const LABELS = {
  zh: { title: '...', noData: '...' },
  'zh-TW': { title: '...', noData: '...' },
  en: { title: '...', noData: '...' },
  th: { title: '...', noData: '...' },
}
const t = LABELS[locale as keyof typeof LABELS] ?? LABELS.zh
```

### 目标模式（next-intl）
```tsx
// 迁移后 — 使用 useTranslations
import { useTranslations } from 'next-intl'
const t = useTranslations('ComponentName')
// 翻译 key 移入 frontend/messages/{locale}.json
```

### 迁移步骤
1. 在 `frontend/messages/{en,zh,zh-TW,th}.json` 添加对应 namespace + keys
2. 组件内替换为 `useTranslations('Namespace')`
3. 删除内联字典和 `useLocale` 调用
4. 验证 4 种语言切换正常

---

## 数量汇总

| 分类 | 文件数 |
|------|--------|
| P1（页面入口） | ~53 |
| P2（核心业务组件） | ~30 |
| P3（共享 UI / slides） | ~87 |
| **需迁移合计** | **~170** |
| 不需迁移（特殊场景/注释） | 7 |
| 已完成 | 30 |
| **总含中文文件** | **~207** |

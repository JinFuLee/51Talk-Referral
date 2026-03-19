# Phase1 前端清理结果

**提交**: `c4b96c3b`

## 删除内容
- frontend/app/biz/ (30+ pages)
- frontend/app/ops/ (15+ pages)
- frontend/app/present/, history/, snapshots/, datasources/, dashboard/
- frontend/components/biz/ (40+ components)
- frontend/components/ops/ (TimeProgressBar/CheckinImpactCard/CCDetailDrawer)
- frontend/components/charts/ (30+ charts)
- frontend/components/analysis/, dashboard/, ranking/
- 27 个旧 presentation slides（保留 SlideShell/SlideProgressBar/PresentationLauncher）
- frontend/lib/webmcp/ (WebMCP tools + provider)
- frontend/lib/presentation/ (scene definitions)
- frontend/lib/stores/analysis-store.ts, presentation-store.ts
- frontend/lib/types/analysis.ts, cohort.ts, member.ts

## 修复
- layout.tsx: 移除 WebMCPProvider import 和包裹层

## 保留
- frontend/components/ui/, layout/, shared/, reports/, snapshots/, datasources/, providers/
- frontend/lib/api.ts, hooks.ts, utils.ts, i18n*.ts, translations.ts
- frontend/lib/stores/config-store.ts, notification-store.ts
- frontend/lib/hooks/usePresentation.ts
- frontend/app/layout.tsx, globals.css, page.tsx, settings/, reports/

# 颜色合规修复报告

## 执行结果

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| `navy-*` 违规数 | 42 处 | **0** |
| `brand-[0-9]` 违规数 | 0（已无） | **0** |
| TypeScript 错误 | 3 | **0** |
| 修改文件数 | — | **22** |

## 新增 Token（tailwind.config.ts + globals.css）

| Token | CSS 变量 | 值 | 用途 |
|-------|----------|-----|------|
| `action-accent-surface` | `--color-accent-surface` | `#e8edf4` | 深蓝最浅底（行 hover/浅背景） |
| `action-accent-subtle` | `--color-accent-subtle` | `#c5d0e2` | 深蓝次浅底（进度条/徽章背景） |
| `action-accent-muted` | `--color-accent-muted` | `#5576a8` | 深蓝中间色（图例/分割线） |

## 替换规则汇总

- `navy-400` → `action-accent`
- `navy-50/100` → `action-accent-surface/subtle`
- `navy-300` → `action-accent-muted`
- `focus:ring-navy-*` → `focus:ring-action-accent`
- `hover:bg-navy-50` → `hover:bg-action-accent-surface`
- `bg-navy-50/100` 背景 → `bg-action-accent-surface/subtle`

## 保留不改的语义色

- `emerald-*`：成功/通过/已完成语义（✓ 状态）
- `red-*`/`rose-*`：错误/失败语义
- `amber-*`/`yellow-*`：警告语义
- `purple-*`：LP 角色业务色（`border-purple-500`, `text-purple-600`）
- `stone-*/gray-*/neutral-*`：中性色

## 修改文件清单

1. `tailwind.config.ts` — action-accent 补充 surface/subtle/muted
2. `app/globals.css` — 补充 CSS 变量
3. `lib/chart-palette.ts` — 补充 secondary/border 字段（修复预存在 TS 错误）
4. `components/checkin/OpsChannelView.tsx`
5. `components/checkin/FollowupTab.tsx`
6. `components/checkin/TeamDetailTab.tsx`
7. `components/attribution/AchievementRing.tsx`
8. `components/attribution/GapSimulator.tsx`
9. `components/attribution/ContributionBreakdown.tsx`
10. `components/cc-matrix/CCHeatmap.tsx`
11. `components/enclosure-health/CCVarianceBox.tsx`
12. `components/warroom/ContactTimeline.tsx`
13. `components/channel/RevenueContributionTable.tsx`
14. `components/reports/MarkdownRenderer.tsx`
15. `components/team/TeamSummaryCard.tsx`
16. `components/student-360/Profile360Drawer.tsx`
17. `components/student-360/ReferralNetwork.tsx`
18. `components/student-360/StudentSearch.tsx`
19. `components/student-360/StudentTable.tsx`
20. `components/slides/ScenarioAnalysisSlide.tsx`
21. `app/enclosure/page.tsx`
22. `app/daily-monitor/page.tsx`
23. `app/page.tsx`
24. `app/reports/page.tsx`
25. `app/members/page.tsx`
26. `app/notifications/BotCard.tsx`
27. `app/notifications/PushProgress.tsx`
28. `app/settings/CheckinThresholdsCard.tsx`
29. `app/settings/TargetSettingsCard.tsx`
30. `app/high-potential/warroom/page.tsx`

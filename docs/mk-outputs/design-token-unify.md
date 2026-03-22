# Design Token 统一：硬编码 Tailwind 色值替换为 CSS 变量

**任务**: 前端设计统一 MK — 28 个新建组件硬编码色值替换
**完成时间**: 2026-03-22
**commit**: `3881aaf1`

## 替换映射

| 原始 Tailwind 类 | 替换后 CSS 变量语法 | 对应设计 token |
|---|---|---|
| `text-neutral-800` | `text-[var(--text-primary)]` | `--text-primary: var(--n-900)` |
| `text-neutral-500` | `text-[var(--text-muted)]` | `--text-muted: #52524A` |
| `bg-neutral-50` | `bg-[var(--bg-subtle)]` | `--bg-subtle: var(--n-100)` |
| `border-neutral-300` | `border-[var(--border-default)]` | `--border-default: var(--n-200)` |
| `bg-white`（组件背景） | `bg-[var(--bg-surface)]` | `--bg-surface: #FFFFFF` |

## 变更文件（28 个）

### components/（22 个）
- `components/attribution/AchievementRing.tsx`
- `components/attribution/ContributionBreakdown.tsx`
- `components/attribution/GapSimulator.tsx`
- `components/warroom/ContactTimeline.tsx`
- `components/warroom/HPFunnel.tsx`
- `components/warroom/UrgencyCards.tsx`
- `components/daily-monitor/CCContactRanking.tsx`
- `components/daily-monitor/ContactConversionScatter.tsx`
- `components/daily-monitor/ContactGauge.tsx`
- `components/daily-monitor/RoleCompare.tsx`
- `components/daily-monitor/SegmentContactBar.tsx`
- `components/cc-matrix/CCHeatmap.tsx`
- `components/cc-matrix/CCRadarChart.tsx`
- `components/cc-matrix/EfficiencyScatter.tsx`
- `components/enclosure-health/CCVarianceBox.tsx`
- `components/enclosure-health/HealthScoreCards.tsx`
- `components/enclosure-health/SegmentBenchmark.tsx`
- `components/student-360/DailyLogTab.tsx`
- `components/student-360/Profile360Drawer.tsx`
- `components/student-360/ReferralNetwork.tsx`
- `components/student-360/StudentSearch.tsx`
- `components/student-360/StudentTable.tsx`

### app/（6 个页面）
- `app/attribution/page.tsx`
- `app/high-potential/warroom/page.tsx`
- `app/daily-monitor/page.tsx`
- `app/cc-matrix/page.tsx`
- `app/enclosure-health/page.tsx`
- `app/students/360/page.tsx`

## 有意保留的硬编码色值

| 文件 | 保留内容 | 原因 |
|---|---|---|
| `components/cc-matrix/CCRadarChart.tsx:44` | `bg-white` | Recharts/Radix 弹出面板（popup overlay），与 tooltip 同性质，需纯白背景保证可读性 |
| `components/cc-matrix/EfficiencyScatter.tsx:107` | `bg-white` | Recharts CustomTooltip div，tooltip 内部背景 |
| `components/warroom/ContactTimeline.tsx` | `bg-gray-200/300`, `text-gray-500` | 语义状态色：灰色表示"未接通/未打卡/普通学员"状态，不是界面背景 token |

## 验证结果

```
text-neutral-[0-9] 残留: 0 处
bg-neutral-[0-9]   残留: 0 处
border-neutral-[0-9] 残留: 0 处
bg-white（非 tooltip）残留: 0 处
```

## SEE 闭环

- **全局扫描**: 扫描 22 组件 + 6 页面，136 处替换，0 遗漏
- **自动化防线**: Grep 验证命令可复用于 CI：
  ```bash
  grep -rn 'text-neutral-[0-9]\|bg-neutral-[0-9]\|border-neutral-[0-9]' frontend/components frontend/app
  ```
  返回 0 行 = token 合规
- **模式沉淀**: 新增组件应直接使用 `text-[var(--text-primary)]` 等 CSS 变量语法，禁止引入 Tailwind neutral-* 色值

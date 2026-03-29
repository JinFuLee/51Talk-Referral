# Tag B：前端 NaN 传播二次扫描修复报告

## 扫描方法

1. 全量 Grep `\* 100\b` 扫描 `frontend/` 下所有 `.tsx` 文件，共发现约 110 处
2. 逐一分类：
   - **已有保护**：`!= null` 条件判断、`?? 0` 保护、`totalX > 0 ? ...` 分母保护 → 跳过
   - **裸乘法（高危）**：无任何保护直接 `field * 100` → 修复
3. 额外扫描 `.reduce((s, c) => s + c.field)` 模式

## 修复清单

| 文件 | 位置 | 修复内容 |
|------|------|---------|
| `checkin/ContactCheckinChart.tsx` | L84,92,100,108 | `participation_rate * 100` → `(participation_rate ?? 0) * 100`（4 处） |
| `checkin/ConversionFunnelProof.tsx` | L27,76,77 | `has_registration_pct * 100`、`has_payment_pct * 100` 加 `?? 0`（3 处） |
| `checkin/RenewalCheckinChart.tsx` | L35,74 | `has_renewal_pct * 100` 加 `?? 0`（2 处） |
| `checkin/EnclosureParticipationChart.tsx` | L60 | `participation_rate * 100` 加 `?? 0` |
| `checkin/OpsChannelView.tsx` | L84,167 | `estimated_contact_rate * 100`、`seg.rate * 100` 加 `?? 0` |
| `dashboard/BmComparisonTable.tsx` | L76 | `bm_mtd_pct * 100` 加 `?? 0` |
| `team/TeamCompareChart.tsx` | L37 | `participation_rate * 100` 加 `?? 0` |
| `settings/BmCalendarCard.tsx` | L335 | `bm_daily_pct * 100` 加 `?? 0` |
| `enclosure-health/SegmentBenchmark.tsx` | L44-47 | 4 个字段（participation/conversion/checkin/reach）加 `?? 0` |
| `slides/RevenueContributionSlide.tsx` | L16 | `reduce: c.revenue` 加 `?? 0` |
| `slides/ChannelRevenueSlide.tsx` | L20 | `reduce: c.revenue` 加 `?? 0` |

**共修复 11 个文件，20 处裸乘法**

## 已安全（确认不需修复）

- `SummaryTab.tsx` L244,249：有 `mc.participation_rate_this != null ?` 三目保护
- `CCPerformanceSummaryCards.tsx` L159,160：有 `gt?.pace_gap_pct != null &&` 保护
- `CCPerformanceTable.tsx` L720：有 `record.efficiency_lift_pct != null ?` 保护
- `funnel/page.tsx` L385,393,554：均有 `!= null` 保护
- `ThreeFactorTable.tsx` L12：有 `if (value == null) return` 提前退出
- `TargetGapCard.tsx` L13：`achievement_rate` 是必填 props 参数

## 验证

```
tsc --noEmit: PASS（0 error）
git commit: 3b17a04a
git push: main -> main OK
```

## 模型

claude-sonnet-4-6

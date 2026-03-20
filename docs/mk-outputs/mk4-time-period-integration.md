# MK4 — time_period 时间进度接入

## 变更摘要

将 `backend/core/time_period.py` 中已有的时间维度工具扩展，新增工作日权重计算，接入 overview API，前端展示时间进度条和追进度需日均。

## 文件变更

| 文件 | 类型 | 说明 |
|------|------|------|
| `backend/core/time_period.py` | 扩展 | 新增 `MonthProgress` dataclass + `compute_month_progress()` + `_weighted_workdays()` |
| `backend/api/overview.py` | 扩展 | `/api/overview` 响应新增 `time_progress` + `kpi_pace` 字段 |
| `frontend/app/page.tsx` | 扩展 | 新增 `TimeProgressBar` 组件 + `PaceRow`（漏斗下方追进度需日均行）+ KPI 卡片落后时间进度标橙色 |
| `frontend/components/shared/StatCard.tsx` | 扩展 | 新增 `highlight?: "warn"` prop，落后时橙色边框 |

## 工作日权重规则

按 CLAUDE.md 约定：
- 周三：权重 0.0（休息）
- 周六/日：权重 1.4
- 其余工作日：权重 1.0

## API 新增字段

```json
{
  "time_progress": {
    "today": "2026-03-20",
    "month_start": "2026-03-01",
    "month_end": "2026-03-31",
    "elapsed_workdays": 14.0,
    "remaining_workdays": 12.4,
    "total_workdays": 26.4,
    "time_progress": 0.5303,
    "elapsed_calendar_days": 19,
    "total_calendar_days": 31
  },
  "kpi_pace": {
    "register": { "actual": 120, "target": null, "daily_avg": 8.57, "pace_daily_needed": null },
    "paid": { "actual": 30, "target": 60, "daily_avg": 2.14, "pace_daily_needed": 1.06 }
  }
}
```

## 前端展示

1. **时间进度条**（页面顶部）：蓝色进度条 + 今日/已过工作日/剩余工作日/时间进度%
2. **KPI 卡片**：达成率 < 时间进度 → 橙色边框警告
3. **漏斗下方 PaceRow**：注册/预约/出席/付费/业绩的"追进度需日均"，落后则红色显示

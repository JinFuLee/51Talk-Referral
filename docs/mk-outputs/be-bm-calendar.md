# BE-BM-Calendar 实现报告

## 完成状态

全部 5 个子任务完成，4 项验证通过。

## 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `backend/core/time_period.py` L93-101 | 修改 | 权重更新：周三 0.0→0.33，周六日 1.4→1.67 |
| `backend/core/config.py` L60-68 | 修改 | WEIGHTS 同步更新 |
| `backend/core/project_config.py` L25-36 | 修改 | Pydantic 默认值同步 |
| `projects/referral/config.json` L84-115 | 修改 | work_schedule + 新增 bm_config 段 |
| `backend/core/bm_calendar.py` | 新建 | BM 日历引擎，约 200 行 |
| `config/bm_specials_override.json` | 新建 | 用户覆盖空文件 `{}` |
| `backend/api/overview.py` | 修改 | 新增 bm_comparison 段 |
| `backend/api/config.py` | 修改 | 新增 GET/PUT /api/config/bm-calendar |

## 验证结果

```
# 1. 权重更新
elapsed=29.01  total=34.35  progress=0.8445

# 2. BM 归一化（mtd + remaining = 1.0）
mtd=0.8367  remain=0.1633  sum=1.0000

# 3. BM 指标完整（5 个 KPI 全部含 bm_gap + today_required）
keys=['appointment', 'paid', 'register', 'revenue', 'showup']
register: bm_gap=255.88, today_req=-33.13
appointment: bm_gap=202.52, today_req=-27.22
showup: bm_gap=112.58, today_req=-11.37
paid: bm_gap=15.37, today_req=5.97
revenue: bm_gap=14568.89, today_req=5674.38

# 4. Settings API
month=202603  days=31  total=98.0
kickoff days: ['2026-03-01']
2026-03-05: holiday_off (调休万佛节, is_override=True)
```

## API 接口

- `GET /api/overview` → 响应新增 `bm_comparison.calendar` + `bm_comparison.metrics`
- `GET /api/config/bm-calendar?month=YYYYMM` → 返回完整日历（31天 × 8 字段）
- `PUT /api/config/bm-calendar` → 写入 `config/bm_specials_override.json` 并返回更新后日历

## bm_comparison.metrics 字段说明

每个 KPI（register/appointment/showup/paid/revenue）包含：
- `actual`: T-1 实际值
- `target`: 月目标
- `bm_mtd`: target × bm_mtd_pct（BM 节奏预期 MTD）
- `bm_gap`: actual - bm_mtd（正=超前，负=落后）
- `bm_today`: target × bm_today_pct（今日 BM 节奏分配量）
- `today_required`: 按剩余 BM 比例分摊的今日需完成量

# A3+A4 交付报告：8 维环比引擎 + SQLite Migration

**commit**: `bfcfcfad` | **时间**: 2026-03-26

## 交付文件

| 文件 | 行数 | 说明 |
|------|------|------|
| `backend/core/comparison_engine.py` | ~420 行 | 8 维环比计算引擎 |
| `backend/core/snapshot_store.py` | ~370 行 | SQLite 持久层 + 3 张表 DDL |

## A3: ComparisonEngine

### 7 个维度
| 维度键 | 含义 | 数据逻辑 |
|--------|------|---------|
| `day` | 日环比 | T-1 vs T-2（单行查询） |
| `week_td` | 周累计 | 本周一→T-1 vs 上周一→上周同天 |
| `week_roll` | 周滚动 | 近 7 日 sum vs 上 7 日 sum |
| `month_td` | 月累计 | 本月 1 日→T-1 vs 上月 1 日→上月同日 |
| `month_roll` | 月滚动 | 近 30 日 sum vs 上 30 日 sum |
| `year_td` | 年累计 | 本年 1/1→T-1 vs 去年 1/1→去年同日 |
| `year_roll` | 年滚动 | 近 365 日 sum vs 上 365 日 sum |

### 指标聚合策略
- **数值类**（5 项）：registrations / appointments / attendance / payments / revenue_usd → `SUM()`
- **效率类**（5 项）：appt_rate / attend_rate / paid_rate / reg_to_pay_rate / asp → 加权平均（分子+分母分别 SUM 再除，避免对率直接取均值的误差）

### 输出格式
```python
{
  "day": {
    "current": float | None,
    "previous": float | None,
    "delta": float | None,
    "delta_pct": float | None,   # (current - previous) / |previous|
    "judgment": "↑" | "↓" | "→"
  },
  # week_td / week_roll / month_td / month_roll / year_td / year_roll 同结构
}
```

### 边界处理
- 月末边界：上月同日用 `min(t1.day, last_month_days)` 避免 31→30 日溢出
- 闰年：2/29 对应上年 2/28
- 数据库不存在或为空：全部维度返回 `None` 值，不抛出异常

### 使用示例
```python
from backend.core.comparison_engine import ComparisonEngine
from pathlib import Path

engine = ComparisonEngine(Path("output/snapshots/ref_ops.db"))
# 查询总计维度注册数的 7 维环比
results = engine.compute(metric="registrations", channel="total")
print(results["week_td"])  # {'current': 220, 'previous': 180, 'delta': 40, ...}

# 查询口径维度（CC窄口）
cc_results = engine.compute(metric="revenue_usd", channel="CC窄口")
```

## A4: SnapshotStore（SQLite Migration）

### 3 张新表（CREATE TABLE IF NOT EXISTS，幂等）

**daily_snapshots**：总计维度日快照
- PK: `id` AUTOINCREMENT | UNIQUE: `snapshot_date`
- 字段: snapshot_date / month_key / workday_index / registrations / appointments / attendance / payments / revenue_usd / asp / appt_rate / attend_rate / paid_rate / reg_to_pay_rate / bm_pct

**daily_channel_snapshots**：口径维度日快照
- PK: `id` AUTOINCREMENT | UNIQUE: `(snapshot_date, channel)`
- channel 值: CC窄口/SS窄口/LP窄口/宽口/其它
- 字段: 同上（去掉 workday_index/bm_pct）

**monthly_archives**：月度归档
- PK: `id` AUTOINCREMENT | UNIQUE: `(month_key, channel)`
- channel 值: total + 5 个口径

### 写入接口
```python
store = SnapshotStore()  # 默认 output/snapshots/ref_ops.db
store.upsert_daily_snapshot(snapshot_date=date(2026, 3, 25), ...)
store.upsert_channel_snapshot(snapshot_date=..., channel="CC窄口", ...)
store.upsert_monthly_archive(month_key="202603", channel="total", ...)

# 健康检查
counts = store.count_snapshots()
# {'daily_snapshots': 1, 'daily_channel_snapshots': 5, 'monthly_archives': 0}
```

### 集成 ComparisonEngine
```python
store = SnapshotStore()
engine = ComparisonEngine(store.db_path)  # 共享同一个 db_path
```

## Lint 验证
```
ruff check: All checks passed!
ruff format: 2 files formatted
```

## 后续消费方（依赖本模块的任务）

| 任务 | 消费方式 |
|------|---------|
| P2-Engine1 (B1+B2) | ComparisonEngine.compute() 提供月度 MoM 数据（区块 6） |
| P3-API (C1+C2) | ReportEngine 调用 ComparisonEngine.compute_all_metrics() |
| P3-QA | `SELECT COUNT(*) FROM daily_channel_snapshots` 验证持久化 |

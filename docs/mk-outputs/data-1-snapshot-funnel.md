# P1-Data1 产出报告：SQLite 日快照 + D3 口径聚合引擎

commit: 88c824f3 | 2026-03-26

## 交付物

### A1: DailySnapshotService
**路径**: `backend/core/daily_snapshot_service.py`

**SQLite 数据库**: `data/snapshots.db`（由 config.py DATA_DIR 确定）

**3 张表**:
| 表名 | 主键 | 幂等方式 | 用途 |
|------|------|---------|------|
| daily_snapshots | snapshot_date(UNIQUE) | INSERT OR REPLACE | 总计口径每日快照 |
| daily_channel_snapshots | (snapshot_date, channel)(UNIQUE) | INSERT OR REPLACE | 各渠道口径每日快照 |
| monthly_archives | (month_key, channel)(UNIQUE) | INSERT OR REPLACE | 月末归档聚合 |

**核心方法**:
- `write_daily(result_df, channel_snapshots, snapshot_date)` — T-1 写入，接收 ChannelFunnelEngine 输出
- `archive_month(month_key)` — 月末归档，SUM 数量型指标 + AVG 率型指标
- `query_by_date(date)` — 查指定日（含全渠道）
- `query_by_month(month_key, channel)` — 查整月序列
- `query_by_workday_index(month_key, n)` — 按工作日序号（用于环比对齐）
- `query_monthly_archive(month_key)` — 查月度归档
- `query_recent_days(n)` — 最近 N 天序列

**workday_index 规则**: 周三(weekday=2)不计入，与业务工作日定义一致。

---

### A2: ChannelFunnelEngine
**路径**: `backend/core/channel_funnel_engine.py`

**输入**: D3 明细 DataFrame（`data["detail"]`）+ 可选 D1 总计

**口径分类** (`转介绍类型_新` 列):
| D3 列值 | 规范化口径 |
|---------|----------|
| CC窄口/CC窄 | CC窄口 |
| SS窄口/SS窄/EA窄口 | SS窄口 |
| LP窄口/LP窄/CM窄口 | LP窄口 |
| 宽口/CC宽/LP宽/运营宽 | 宽口 |
| 有 D1 总计时 | 其它 = 总计 - CC窄 - SS窄 - LP窄 |

**4 个转化率**:
- `appt_rate` = 邀约数 / 注册数
- `attend_rate` = 出席数 / 邀约数
- `paid_rate` = 付费数 / 出席数
- `reg_to_pay_rate` = 付费数 / 注册数

**与 DailySnapshotService 衔接**:
```python
engine = ChannelFunnelEngine(detail_df=dm.get("detail"), total_d1=total_metrics)
channel_dict = engine.compute_as_snapshot_format()
svc.write_daily(result_df=d1_df, channel_snapshots=channel_dict)
```

## 验证

- `uv run pytest backend/tests/ -q`: **5 passed**
- `uv run ruff check`: **All checks passed**
- `python -c "from backend.core.daily_snapshot_service import DailySnapshotService; ..."`: **导入成功**

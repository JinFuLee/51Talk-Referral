# 数据口径守卫 3 层校验实现产出

**实现日期**：2026-03-30
**Commit**：1794420f

## 实现清单

| 项 | 文件 | 状态 |
|----|------|------|
| 层 1 Schema 校验 | `backend/core/data_manager.py` | ✓ |
| 层 2 D1×D2 交叉校验 | `backend/api/cc_performance.py` | ✓ |
| 层 3 过滤覆盖率+分布校验 | `backend/api/cc_performance.py` | ✓ |
| 告警路由+审计 JSONL | `backend/core/caliber_guard.py` | ✓ |
| Dashboard API | `backend/api/caliber_guard.py` | ✓ |
| main.py 路由注册 | `backend/main.py` | ✓ |

## 层 1：Schema 契约（DataManager.load_all）

文件：`backend/core/data_manager.py`

- `_edit_distance(a, b)` — Levenshtein 距离辅助（模块级）
- `DataManager._validate_schema(key, df, meta)` — 4 条规则：
  - R1 列名存在性（P0）
  - R2 数值列类型漂移，null_rate > 20% 告警（P1，GE B 级）
  - R3 列名相似度 ≤ 2 提示（advisory）
  - R6 数据新鲜度 ≥ T-2 告警（P1），支持两种日期列名
- for 循环内每个数据源加载后调用，P0 不阻断其他数据源

## 层 2：业务逻辑交叉（cc_performance.py）

常量：`_CALIBER_THRESHOLDS = {trivial:0.01, warning:0.05, critical:0.10}`（PCAOB AS 2105 A 级）

函数：`_cross_validate(dm)` — D1 revenue/leads vs D2 聚合
- R4 D2 > D1 → P0（非转介绍数据混入）
- R5 偏差 > 5% → P0，1-5% → P1，< 1% 忽略
- 在 `get_cc_performance` 路由中，聚合后返回前调用

## 层 3：统计分布（cc_performance.py）

函数：`_validate_filter_coverage(original_df, filtered_df, kept_teams)`
- R7 覆盖率：< 40% P0 / < 60% P1 / < 80% advisory（Pointblank B 级）
- R7 排除团队有 revenue > 0 检测（P1）
- R7 Shannon H < 0.4 或 HHI > 0.25 分布集中度（Shannon 1948 / Hirschman 1964 A 级）
- 在 `get_cc_performance` 中，`_agg_d2()` 完成后调用

## 告警路由

文件：`backend/core/caliber_guard.py`

- `emit_caliber_alert(source, alerts)` — 写入 `output/data-caliber-audit.jsonl`
- P0 → 同时写 `output/error-log.jsonl` + 尝试钉钉 test 群
- `read_recent_alerts(limit=50)` — 供 Dashboard API 消费
- `derive_overall_status(alerts)` — healthy/warning/critical

## Dashboard API

文件：`backend/api/caliber_guard.py`，注册路径：`GET /api/caliber-guard/status`

返回 `CaliperGuardStatus`：
- `overall_status`: healthy / warning / critical
- `layer1_alerts / layer2_alerts / layer3_alerts`: 最近 50 条分层
- `last_check_ts`: 最近一次校验时间戳
- `d1_d2_diff_pct`: revenue/leads 的最新偏差百分比

## 验证命令

```bash
# lint
uv run ruff check backend/core/caliber_guard.py backend/api/caliber_guard.py backend/core/data_manager.py backend/api/cc_performance.py
# → All checks passed!

# Dashboard API（服务需运行）
curl -s http://localhost:8100/api/caliber-guard/status | python3 -m json.tool

# cc-performance 业绩 grand_total
curl -s http://localhost:8100/api/cc-performance | python3 -c "import sys,json; d=json.load(sys.stdin); print('grand_total revenue:', d.get('grand_total',{}).get('revenue'))"
```

# T3 后端：DataSourceStatus 状态增强

## 完成状态

✓ 已完成，commit: `291a0a46`

## 变更摘要

### 1. `backend/models/common.py`

`DataSourceStatus` 新增 **12 个字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `data_date` | `str \| None` | 文件名解析的数据日期（ISO格式） |
| `freshness_tier` | Literal 5级 | today/yesterday/recent/stale/missing |
| `days_behind` | `int \| None` | 距今天数 |
| `expected_rows_min/max` | `int \| None` | 预期行数范围 |
| `row_anomaly` | Literal 4级 | low/high/ok/unknown |
| `total_columns` | `int \| None` | 数据源总列数（元数据） |
| `columns_present` | `int \| None` | 实际有效列数（排除 Unnamed:） |
| `completeness_rate` | `float \| None` | 字段完整率（钳位≤1.0） |
| `system_consumed_columns` | `int \| None` | 系统实际消费的列数 |
| `utilization_rate` | `float \| None` | 系统列利用率 |
| `critical_columns_total` | `int \| None` | 核心字段总数 |
| `critical_columns_present` | `int \| None` | 核心字段匹配数 |
| `critical_completeness_rate` | `float \| None` | 核心字段完整率 |

### 2. `backend/core/data_manager.py`

`_DATA_SOURCE_META` 每个数据源新增 4 个 key：
- `expected_rows_range`: 预期行数区间（用于异常检测）
- `critical_columns`: 核心字段列表（用于完整性验证）
- `system_consumed_columns`: 系统消费列数
- `total_columns`: 数据源总列数

`get_status()` 完整重写：
- 缓存读取加 `with self._lock:` 保护（并发安全）
- `columns_present` 过滤 `Unnamed:` 前缀列（准确率修复）
- `completeness_rate` 钳位 `min(..., 1.0)`（防超界）
- `critical_columns` 匹配用 `strip().lower()`（容错）
- 新鲜度按 today/yesterday/≤3天/stale 分层

## ruff 检查

```
All checks passed!
```

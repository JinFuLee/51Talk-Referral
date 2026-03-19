# 评分器 I/O 契约

## Input

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `report_path` | string | 是 | 待评分报告路径 |
| `evidence_map_path` | string | 是 | claim 到 evidence 的映射 |
| `metrics_schema_path` | string | 是 | 指标口径定义 |
| `strict_mode` | boolean | 是 | 是否按满分标准评分 |
| `enable_see_dimension` | boolean | 否 | 是否启用第 6 维 SEE 闭合度 |

## Output

| 字段 | 类型 | 说明 |
|---|---|---|
| `dimension_scores` | object | 5 维或 6 维分数 |
| `total_score` | number | 总分 |
| `passes_threshold` | boolean | 是否达标 |
| `is_perfect` | boolean | 是否 100/100 |
| `findings` | array | 关键扣分点 |
| `suggestions` | array | Top 3 修订建议 |
| `csv_summary_path` | string | CSV 摘要路径 |

## Validation

- 若 `report_path` 不存在：返回错误
- 若 `evidence_map_path` 缺失：`traceability` 上限降为 `15/20`
- 若 `metrics_schema_path` 缺失：`quantifiable` 上限降为 `15/20`
- 若 `strict_mode = true`：`is_perfect` 仅在 `total_score = 100` 时为真

## Gate

- 达标：`total_score >= 85` 且 `min(dimension_scores) >= 16`
- 满分：`total_score = 100` 且 `all(dimension_scores) = 20`

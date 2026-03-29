# M37 Phase1A — 后端维度基础设施

**状态**: 完成
**提交**: b83a9347, 32dddb9b
**日期**: 2026-03-29

## 产出文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `backend/models/filters.py` | 新建 | UnifiedFilter + parse_filters + apply_filters |
| `backend/api/filter_options.py` | 新建 | GET /api/filter/options 端点 |
| `backend/main.py` | 修改 | 注册 filter_options router |

## 核心实现

### UnifiedFilter (10 字段)
- country, data_role, enclosure, team, cc, granularity, funnel_stage, channel, behavior, benchmarks
- 严格按 spec §4.2 定义

### parse_filters
- FastAPI Depends 函数
- 列表参数（enclosure/behavior/benchmarks）逗号分隔自动 split

### apply_filters
- 6 步确定性过滤顺序：country→team→cc→data_role→enclosure→channel
- 列不存在时跳过，df 为空直接返回
- ACTIVE_ENCLOSURES = ["M0","M1","M2","M3","M4","M5","M6+"]
- _CHANNEL_MAP: 6 渠道值映射

### filter_options 端点
- GET /api/filter/options
- 动态生成 teams (from last_cc_group_name) + cc_list (from last_cc_name)
- try/except 兜底返回空数组
- 硬编码：enclosures (16项含 is_active) + channels (7项) + behaviors (8项)

## 验证结果

```
uv run ruff check backend/models/filters.py backend/api/filter_options.py backend/main.py
→ All checks passed!

uv run python -c "from backend.models.filters import UnifiedFilter, parse_filters, apply_filters; print('imports OK')"
→ imports OK
```

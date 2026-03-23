# MK-backend 运营渠道 API 实现报告

## 变更摘要

**文件**: `backend/api/checkin.py`

### 变更 1：`_WIDE_ROLE` 重新划分
- `LP` 移除 `"M6+"`，保留 `["121~150", "151~180"]`
- 新增 `"运营": ["M6+", "181+"]`

### 变更 2：新增 `_OPS_CHANNELS` 常量 + `_aggregate_ops_channels()` 函数
- 4 个推荐渠道定义（电话/短信、LINE OA、APP 站内推送、邮件）
- 函数逻辑：
  - 筛选 M6+/181+ 围场学员
  - JOIN D4 计算未打卡学员质量评分
  - `phone` 渠道推荐数 = 质量评分 ≥ 70 的未打卡人数
  - `line_oa` 渠道推荐数 = 质量评分 ≥ 40 的未打卡人数
  - `app_push`/`email` 推荐数 = 全部未打卡人数
  - 返回结构：`total_students / checked_in / checkin_rate / channels / by_enclosure_segment / by_group=[] / by_person=[]`

### 变更 3：`get_checkin_summary()` 运营分支
当 `role == "运营"` 时调用 `_aggregate_ops_channels(d3, d4, override)`，不再 fallback 到 `_aggregate_role()`

### 变更 4：`get_checkin_ranking()` 运营分支
当 `role == "运营"` 时调用 `_aggregate_ops_channels()` 并 `continue`，跳过 `by_group/by_person` 个人聚合逻辑

## 验收结果

```
uv run python -c "from backend.api.checkin import _aggregate_ops_channels, _WIDE_ROLE; ..."
OK
```

- `_WIDE_ROLE["LP"]` 不包含 `"M6+"` ✓
- `_WIDE_ROLE["运营"]` 包含 `"M6+"` ✓
- `_aggregate_ops_channels` 可正常导入 ✓

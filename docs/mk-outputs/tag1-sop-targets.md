# Tag 1 产出：SOP 过程指标目标接入

## 变更摘要
- **文件**：`backend/core/report_engine.py` L380-392
- **方法**：`_normalize_targets()`
- **Commits**：`22e75ae8`, `d6cf00ca`

## 新增逻辑
```python
if sop.get("checkin_rate", 0) > 0:
    base_targets["checkin_rate"] = _safe_float(sop["checkin_rate"])
if sop.get("reach_rate", 0) > 0:
    r = _safe_float(sop["reach_rate"])
    base_targets.setdefault("cc_contact_rate", r)
    base_targets.setdefault("ss_contact_rate", r)
    base_targets.setdefault("lp_contact_rate", r)
if sop.get("participation_rate", 0) > 0:
    base_targets["participation_rate"] = _safe_float(
        sop["participation_rate"]
    )
```

## 验证结果
当前月份 202603 的 sop 字段未配置三指标（只有 reserve_rate/attend_rate），
API 返回 target=0.0，actual 有真实数据 —— 行为正确。

| 指标 | target | actual | eff |
|------|--------|--------|-----|
| checkin_rate | 0.0 | 0.3263 | 0.0 |
| cc_contact_rate | 0.0 | 0.1898 | 0.0 |
| ss_contact_rate | 0.0 | 0.2362 | 0.0 |
| lp_contact_rate | 0.0 | 0.1177 | 0.0 |
| participation_rate | 0.0 | 0.0419 | 0.0 |

## 待用户操作
在 Settings → SOPSettingsCard 配置 checkin_rate / reach_rate / participation_rate 后，
target 将 > 0，eff 将有值。

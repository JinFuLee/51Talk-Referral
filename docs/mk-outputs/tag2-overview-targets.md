# Tag 2: Overview API 目标源统一

## 变更摘要

**文件**: `backend/api/overview.py`
**commit**: `8afd03b6`

## 根因

`kpi_8item` 目标从 Excel D1 metrics 读取（`转介绍基础业绩单量标=260`），与 report API 从 `targets_override.json` 读取的 `付费目标=193` 不一致。

## 改动内容

### 新增映射表（模块顶层）
```python
_OVERRIDE_KEY_MAP: dict[str, str] = {
    "转介绍基础业绩单量标": "付费目标",
    "转介绍基础业绩标USD": "金额目标",
    "转介绍基础业绩客单价标USD": "客单价",
}
```

### 新增目标读取逻辑（get_overview 函数内）
- `override_tgts = get_targets(ref_dt)` 读取当月 override
- `_get_target(target_field)` 辅助函数：override 优先，fallback Excel metrics
- `kpi_pace` 和 `kpi_8item` 均改为调用 `_get_target()`

## 验证结果

| 指标 | 修复前（Excel）| 修复后（override）| report API |
|------|--------------|-----------------|-----------|
| paid target | 260 | **193** | 193 ✓ |
| revenue target | Excel metrics | 180000 (金额目标) | 200444 (hard.referral_revenue) |
| asp target | Excel metrics | 930.48 | None |

> paid target 已对齐（193）。revenue 差异来源于 report API 额外读取 `hard.referral_revenue`（V2 结构专用字段），超出本任务范围。

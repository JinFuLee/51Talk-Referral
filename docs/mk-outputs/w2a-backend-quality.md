# w2a-backend-quality — 后端数据质量修复报告

完成时间: 2026-03-10
提交: b6f36a12, 3a557b62

## 变更摘要

### 1. F841 未用变量清除（cohort_detail.py L403-405）

删除 `valid_key`, `reach_key`, `bring_key` 三个赋值。
后续代码用 `r.get("是否有效", {}).get(f"m{m_idx}")` 直接访问，不经过这 3 个变量。
B007 后续修复：删除后 `m_cn` 也变为无用，重命名为 `_m_cn`（3a557b62）。

### 2. Heatmap 硬编码默认值修复（cohort_detail.py L279-284）

原代码 `if by_month_raw` 分支只更新 `reach_rate` 和 `participation_rate`，
`checkin_rate`(0.75)、`referral_coefficient`(1.80)、`conversion_ratio`(0.30) 始终用硬编码假值。

修复：
- 扩展 `field_map` 覆盖全部 5 个指标
- 循环从 `cohort_roi` 最新月提取真实 m1 值
- 返回体新增 `estimated_metrics: list[str]` 字段，标记哪些指标仍在使用默认值

### 3. 衰减曲线 data_source 修正（cohort_detail.py L246）

`get_cohort_decay` 端点原返回 `"data_source": "cohort_roi"`，不准确：
仅 m1 来自真实 cohort_roi，m2-m12 全是近似衰减模型生成。

修复：
- `data_source` 改为 `"approximate"`
- 新增 `data_note: "m1 基于 cohort_roi 真实值，m2-m12 基于典型衰减模型近似"`

### 4. E501 注释行修复

| 文件 | 修复数 |
|------|--------|
| backend/api/cohort_detail.py | 1 处（Query description 字符串折行） |
| backend/api/adapters/outreach_adapt.py | 7 处（docstring 长注释折行） |

## 验证结果

```
ruff check --select E501,F841 cohort_detail.py outreach_adapt.py → All checks passed!
pytest backend/tests/ -x -q → 332 passed, 2 skipped
```

## 全局扫描

- F841 同模式：Grep 扫描 `backend/` 发现无其他同模式未用变量
- 硬编码默认值：同模式仅此一处 heatmap 函数
- E501：pre-existing violations 在 analysis.py / ranking_adapt.py / summary_adapt.py / trend_adapt.py 存在，与本任务范围无关（原始技术债）

## 新增技术债

- B008 (`Depends` in default args) 是 FastAPI 全栈惯用模式，pre-commit hook 报告但提交不阻塞，整个 backend 文件均如此使用，不作为本次范围内修复对象。

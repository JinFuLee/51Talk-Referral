# backend-bugfix: Bug 2+3 修复报告

## 修复文件
`backend/core/report_engine.py`

## Bug 2: remaining_daily_avg 虚高 31 倍（已修复）

**根因**：`remaining = 1.0 - bm_pct` (~0.185) 是进度比例，不是工作日天数。
用比例做分母导致日均虚高 31 倍（0.185 ≈ 1/5.4，即 5.4 天的倒数比例）。

**修复**：
- 新增 `_get_remaining_workdays(ref_date: date) -> int`：统计当月剩余工作日（非周三）
- `_block_monthly_overview` 增加 `remaining_workdays: int = 0` 参数
- `generate_daily_report` 计算 `remaining_wd = self._get_remaining_workdays(reference_date)` 并传入

**验证**：2026-03-26 参考日，remaining_workdays=5，registrations remaining_daily_avg=129.6（合理业务值）

## Bug 3: 过程指标目标自引用（已修复）

**根因**：`base_targets.setdefault("checkin_rate", D2实际均值)` 使 target == actual，BM效率恒等于 1/bm_pct。

**修复**：删除 `_normalize_targets` 中 5 个过程指标（checkin_rate/cc_contact_rate/ss_contact_rate/lp_contact_rate/participation_rate）的 setdefault 调用。

**验证**：过程指标 target=0.0，bm_eff=0.0（正确：未配置则不计算）

## Commit
`6a7fbccd` — push 成功

# CC 个人业绩 API 交付报告

## 完成内容

### 新建文件
- `backend/api/cc_performance.py` — 完整实现，340+ 行，ruff 零错误

### 修改文件
- `backend/main.py` — ROUTER_REGISTRY 追加 `"cc_performance"` 条目
- `projects/referral/config.json` — `enabled_routers` 数组追加 `"cc_performance"`

## API 规格

```
GET /api/cc-performance?month=YYYYMM
```

- `month` 可选，默认当月
- 响应：`CCPerformanceResponse`（已有 Pydantic 模型）

## 数据来源

| 数据源 key | 用途 |
|-----------|------|
| `enclosure_cc` (D2) | leads / paid / revenue / 过程指标（参与率/打卡率/触达率/带新系数/学员数） |
| `students` (D4) | 拨打次数 / 本月已拨学员数 / 有效接通 >=120s / 出席数 / leads_user_a |
| `detail` (D3) | CC 接通数 |
| `monthly_summary` (D1, fallback D2) | 全局总业绩（计算转介绍占比分母） |

## 目标分配逻辑

- 团队目标来源：`config/targets_override.json` → fallback `projects/referral/config.json` monthly_targets
- 个人目标 = 团队目标 × (cc_students / total_students)
- `referral_share.target` 从 `projects/referral/config.json` 读 `referral_share`，fallback 0.30
- `call_target` = `ranking_targets.outreach_calls_per_day` × `total_workdays`

## 节奏字段

对齐 CLAUDE.md 双差额体系 + 指标显示规范 8 项：
- `current_daily_avg` = revenue / elapsed_workdays
- `remaining_daily_avg` = (target - actual) / remaining_workdays
- `pace_daily_needed` = max(0, target × time_progress - actual) / remaining_workdays
- `efficiency_lift_pct` = remaining_daily_avg / current_daily_avg - 1
- `pace_gap_pct` = actual/target - time_progress

## SEE 闭环

- Grep 扫描 `cc_performance` 引用：main.py ✓ / cc_performance.py ✓ / config.json ✓
- ruff check：All checks passed
- git push：5172b405 已推送到 origin/main

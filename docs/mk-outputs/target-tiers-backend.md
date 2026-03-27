# target-tiers-backend — M33 三档目标引擎后端产出

> commit: 051b9efb | 2026-03-27

## 交付物

### 1. `backend/core/target_recommender.py` — 新增 TargetTierEngine 类

| 方法 | 功能 |
|------|------|
| `tier_pace(current_actuals, bm_pct)` | 一档：当前效率 / bm_pct 外推全月，按当前口径占比分配 |
| `tier_share(company_revenue, referral_share=0.30)` | 二档：company_revenue × share，WMA 历史率反推 |
| `tier_custom(user_inputs)` | 三档：用户字段 > WMA fallback，revenue 优先冲突处理 |
| `get_all_tiers(...)` | 一次返回三档完整预览 |
| `_decompose_to_channels(total_revenue, wma, ...)` | 三档共用口径拆分（WMA revenue_share + 转化率） |
| `_get_wma_data(n_months=6)` | WMA 历史数据计算（含 session 级缓存） |

**输出格式统一**：
```json
{
  "tier": "pace|share|custom",
  "label": "稳达标|占比达标|自定义",
  "total": {"registrations": N, "appointments": N, "attendance": N,
            "payments": N, "revenue_usd": N, "asp": N,
            "appt_rate": N, "attend_rate": N, "paid_rate": N, "reg_to_pay_rate": N},
  "channels": {
    "CC窄口": {"registrations": N, ..., "revenue_share": N, "appt_rate": N, ...},
    "SS窄口": {...}, "LP窄口": {...}, "宽口": {...}
  }
}
```

### 2. `backend/api/config.py` — 新增两个端点

#### GET `/api/config/targets/tiers`

参数：`company_revenue=0`, `referral_share=0.30`

- 一档自动（从 svc 取实绩 + bm_pct）
- 二档需要 `company_revenue > 0`
- 三档返回 WMA 基线（无用户输入时）

验证：`curl "localhost:8100/api/config/targets/tiers?company_revenue=600000&referral_share=0.30"`
→ share.total.revenue_usd = 180000（$600K × 30%）✓

#### POST `/api/config/targets/apply`

参数：`tier=pace|share|custom`, `month`, `company_revenue`, `referral_share`, `custom_inputs`

- 写入 `config/targets_override.json`，格式兼容现有 `MONTHLY_TARGETS`
- 旧端点合并：原 `stable|stretch|ambitious` 三档由此端点替代

验证：`curl -X POST "localhost:8100/api/config/targets/apply?tier=share&company_revenue=600000&referral_share=0.30"`
→ targets_override.json 写入注册 1007.7 / 付费 193.4 / 业绩 $180K ✓

## 验收结论

| # | 验收项 | 结果 |
|---|-------|------|
| 1 | GET /targets/tiers 三档全链路 | ✓ share 档 $180K 正确 |
| 2 | POST /targets/apply 写入 | ✓ targets_override.json 有完整值 |
| 3 | daily report targets 非零 | ✓ registrations=1008 |
| 4 | 测试不回归 | ✓ 11/11 passed |
| 5 | ruff 零错误 | ✓ All checks passed |

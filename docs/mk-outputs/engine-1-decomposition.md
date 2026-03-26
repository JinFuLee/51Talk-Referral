# engine-1-decomposition — 三因素分解 + 全月推算引擎交付报告

**任务**：P2-Engine1 | **完成时间**：2026-03-26 | **impl-agent (Sonnet high)**

---

## 交付物

| 文件 | 说明 |
|------|------|
| `backend/core/decomposition_engine.py` | Laspeyres/LMDI 三因素分解引擎 |
| `backend/core/projection_engine.py` | 全月推算 + 客单价敏感性 + 效率推演引擎 |

commit: `831e8ee5` feat(m33): add decomposition and projection engines

---

## DecompositionEngine

### 核心方法

**`decompose_total(current, previous)`**
- 输入：两期含 `registrations / reg_to_pay_rate / asp / revenue_usd` 的 dict
- 输出：对应前端 `Decomposition` interface（区块 8）
- 同时计算 Laspeyres + LMDI，根据残差率决定 `display_method`

**`decompose_by_channel(current_channels, previous_channels)`**
- 输入：两期各渠道指标列表，按 `channel` 字段匹配
- 输出：对应前端 `ChannelThreeFactor` interface（区块 11）

### 残差自动切换逻辑

```
残差率 = |residual| / |actual_delta|
> 3% → display_method = "lmdi"，前端展示 LMDI 数值
≤ 3% → display_method = "laspeyres"，前端展示 Laspeyres 数值
```

理论来源：Ang (2004) Energy Policy 32(9)（B 级），Ang (2005)（B 级）

### 公式（渐进 Laspeyres）

```
vol_delta   = (reg_1 - reg_0) × conv_0 × asp_0
conv_delta  = reg_1 × (conv_1 - conv_0) × asp_0
price_delta = reg_1 × conv_1 × (asp_1 - asp_0)
residual    = actual_delta - (vol + conv + price)
```

LMDI 权重：`w = L(rev_1, rev_0) = (rev_1 - rev_0) / ln(rev_1/rev_0)`

---

## ProjectionEngine

### 核心方法

**`project_full_month(actuals, bm_pct, targets)`**
- 基于当前工作日进度推算月底各指标
- 内含 asp_sensitivity_per_dollar 字段
- 输出对应前端 `Projection` interface（区块 4）

**`sensitivity_test(projected, target_revenue, asp_delta=-1.0)`**
- 返回 `{adjusted_revenue, vs_target, revenue_change}`

**`scenario_compare(actuals, targets)`**
- 三环节（appt_rate / attend_rate / paid_rate）分别推演
- 输出对应前端 `ScenarioAnalysis` interface（区块 3）

### 推算公式

```
proj_reg    = actual_reg / bm_pct
proj_appt   = proj_reg × current_appt_rate
proj_attend = proj_appt × current_attend_rate
proj_pay    = proj_attend × current_paid_rate
proj_rev    = proj_pay × current_asp
asp_sensitivity = -proj_pay  # 每跌 $1 的损失
```

---

## 前端类型对齐验证

| 后端字段 | 前端 interface 字段 | 匹配 |
|---------|-------------------|------|
| `vol_delta` | `LaspeyrersDecomposition.vol_delta` | ✓ |
| `conv_delta` | `LaspeyrersDecomposition.conv_delta` | ✓ |
| `price_delta` | `LaspeyrersDecomposition.price_delta` | ✓ |
| `residual` | `LaspeyrersDecomposition.residual` | ✓ |
| `residual_pct` | `LaspeyrersDecomposition.residual_pct` | ✓ |
| `vol_lmdi` | `LMDIDecomposition.vol_lmdi` | ✓ |
| `display_method` | `Decomposition.display_method` | ✓ |
| `projected_revenue_usd` | `Projection.projected_revenue_usd` | ✓ |
| `asp_sensitivity_per_dollar` | `Projection.asp_sensitivity_per_dollar` | ✓ |

---

## ruff 验证

```
All checks passed! (0 errors)
```

# Engine-2: 收入杠杆矩阵 + 三档目标推荐器

## 交付概要

| 文件 | 路径 | 行数 |
|------|------|------|
| 杠杆矩阵引擎 | `backend/core/leverage_engine.py` | 280 行 |
| 三档目标推荐器 | `backend/core/target_recommender.py` | 310 行 |
| commit | `8d4acb6a` | feat(m33): add leverage engine and target recommender |

ruff 检查：✓ 0 errors

---

## B3: leverage_engine.py

### 核心逻辑

三维度评分：`leverage_score = revenue_impact × feasibility × urgency`

**revenue_impact**（逐环节独立测算，USD 增量）：
- `appt_rate` : gap × registrations × actual_attend_rate × actual_paid_rate × asp
- `attend_rate`: appointments × gap × actual_paid_rate × asp
- `paid_rate`  : attendance × gap × asp

**feasibility**：`min(1.0, (historical_best - actual) / (target - actual))`
- 历史从未超过当前值 → 0.0
- 历史已完全覆盖所需改善幅度 → 1.0

**urgency**：
- 近 3 期趋势下降 → 1.5
- 持平 → 1.0
- 上升（自然恢复中）→ 0.7

### 潜力判定
- **高潜力🟢**：leverage_score > 均值 且 feasibility ≥ 0.7 且 urgency < 1.5
- **待改善🟡**：leverage_score > 均值 但 feasibility < 0.7 或 urgency = 1.5
- **已饱和⚪**：leverage_score ≤ 均值 或 gap ≤ 0

### 辅助函数
- `query_historical_best(snapshot_service, n_months=6)` → 从 monthly_archives 查询历史最佳转化率
- `query_recent_trend(snapshot_service, n_months=3)` → 构造最近 3 期趋势数据

### 输出格式（对齐 report.ts）
`compute_leverage_matrix()` → `{"scores": [LeverageScore, ...], "top_bottleneck": LeverageScore}`

---

## B4: target_recommender.py

### 三档算法

| 档位 | 量化指标 | 转化率指标 |
|------|---------|---------|
| conservative | P25 历史百分位 | 历史最低月 |
| moderate | P50 历史百分位 | 上月实际 |
| aggressive | P75 × 增长斜率 | 历史最高月 |

**增长斜率**：加权最小二乘（近期权重高），限制在 0.8-1.5 范围内

**口径拆分**：总注册数目标 × 各渠道历史平均贡献比例（归一化）

**数据不足处理**：< 3 个月 → `recommendations: null + message: "需积累 N 月数据"`

### 输出格式（对齐 report.ts）
`recommend_targets()` → `{"recommendations": [TargetRecommendation × 3], "message": str|None, "data_months": int}`

---

## 类型对齐验证

| TS 类型字段 | Python 输出键 | 状态 |
|------------|-------------|------|
| `LeverageScore.channel` | `channel` | ✓ |
| `LeverageScore.stage` | `stage` | ✓ |
| `LeverageScore.revenue_impact` | `revenue_impact` | ✓ |
| `LeverageScore.feasibility` | `feasibility` | ✓ |
| `LeverageScore.urgency` | `urgency` | ✓ |
| `LeverageScore.leverage_score` | `leverage_score` | ✓ |
| `LeverageScore.is_bottleneck` | `is_bottleneck` | ✓ |
| `LeverageScore.potential_label` | `potential_label` | ✓ |
| `FunnelLeverage.scores` | `scores` | ✓ |
| `FunnelLeverage.top_bottleneck` | `top_bottleneck` | ✓ |
| `TargetRecommendation.tier` | `tier` | ✓ |
| `TargetRecommendation.registrations` | `registrations` | ✓ |
| `TargetRecommendation.appt_rate` | `appt_rate` | ✓ |
| `TargetRecommendation.channel_targets` | `channel_targets` | ✓ |

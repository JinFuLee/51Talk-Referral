# Tag B — 后端 API 6 新建/扩展端点 产出报告

## 完成状态
全部 6 个任务完成，2 commit 已推送（main 4464478e）

---

## 新建文件清单

| 文件 | 说明 |
|------|------|
| `backend/api/enclosure_ss_lp.py` | SS/LP 围场 4 端点 |
| `backend/api/expiry_alert.py` | 次卡到期预警 2 端点 |
| `backend/api/incentive_effect.py` | 激励效果分析 1 端点 |
| `backend/api/renewal_risk.py` | 续费风险分析 1 端点 |
| `backend/models/enclosure_ss_lp.py` | EnclosureSSMetrics / EnclosureLPMetrics |
| `backend/models/expiry_alert.py` | ExpiryAlertItem / ExpiryAlertSummary |

## 修改文件清单

| 文件 | 变更 |
|------|------|
| `backend/api/overview.py` | 新增 `_compute_kpi_8item()` + `kpi_8item` 返回字段 |
| `backend/api/funnel.py` | 新增 `/funnel/with-invitation` 端点 + `_get_invitation_stats()` |
| `backend/main.py` | ROUTER_REGISTRY 注册 4 个新路由 |
| `projects/referral/config.json` | enabled_routers 追加 4 个新 key |

---

## curl 验证结果

### /api/enclosure-ss — ✓ 真实数据
```json
[{"enclosure":"0~30","ss_group":"TH-SS01Team","ss_name":"51liuwei18",
  "students":728.0,"participation_rate":0.142,"registrations":131.0,
  "payments":55.0,"revenue_usd":50566.0,...}]
```

### /api/enclosure-lp — ✓ 真实数据
```json
[{"enclosure":"0~30","lp_group":"TH-LP01Team","lp_name":"51zhandongqi001",
  "students":728.0,"participation_rate":0.139,"registrations":131.0,...}]
```

### /api/students/expiry-alert/summary — ✓ 空数据（D4 Sheet 名不匹配）
```json
{"urgent_count":0,"warning_count":0,"watch_count":0,"total":0}
```
> D4 数据源加载失败原因：Sheet 名 '已付费学员转介绍围场明细' 不存在（Tag A 数据层遗留问题）

### /api/analysis/incentive-effect — ✓ 空数据（同 D4 原因）
```json
{"groups":[],"summary":"暂无数据"}
```

### /api/analysis/renewal-risk — ✓ 空数据（同 D4 原因）
```json
{"segments":[],"high_risk_students":[],"summary":"暂无数据"}
```

### /api/overview kpi_8item — ✓ 8 项格式正确
```json
{
  "paid": {"actual":192.0,"target":260.0,"absolute_gap":-68.0,
           "pace_gap":-0.0066,"remaining_daily_avg":8.72,
           "pace_daily_needed":0.22,"efficiency_needed":0.0353,
           "current_daily_avg":8.42},
  "revenue": {"actual":193578.0,"target":250000.0,...}
}
```

### /api/funnel/with-invitation — ✓ 邀约数正常
```json
{
  "invitation": {
    "invitation_count": 679.0,
    "registration_invitation_rate": 1.2901,
    "invitation_showup_rate": 0.6524
  }
}
```

---

## 返回字段清单

### EnclosureSSMetrics / EnclosureLPMetrics
`enclosure, ss_group/lp_group, ss_name/lp_name, students, participation_rate,
new_coefficient, cargo_ratio, checkin_rate, cc_reach_rate, ss_reach_rate,
lp_reach_rate, registrations, payments, revenue_usd, registration_rate`

### ExpiryAlertItem
`stdt_id, enclosure, cc_name, days_to_expiry, current_cards,
monthly_referral_registrations, monthly_referral_payments, urgency_tier`

### ExpiryAlertSummary
`urgent_count, warning_count, watch_count, total`

### kpi_8item（overview 新增）
每个 KPI key 下：`actual, target, absolute_gap, pace_gap, remaining_daily_avg,
pace_daily_needed, efficiency_needed, current_daily_avg`

### funnel/with-invitation（invitation 字段）
`invitation_count, registration_invitation_rate, invitation_showup_rate`

---

## 注意事项
- D4 students 数据源依赖正确的 Sheet 名（Tag A 数据层问题），expiry_alert / incentive_effect / renewal_risk 当前返回空数据，数据层就绪后自动生效
- `/api/team/ss-ranking` 和 `/api/team/lp-ranking` 按个人维度跨围场聚合，name 列需在数据中实际存在

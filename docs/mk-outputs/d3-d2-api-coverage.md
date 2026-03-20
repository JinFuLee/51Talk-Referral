# D3/D2 API 覆盖扩展 — 实现结果

## 任务 A — D3 触达质量端点

**新增文件**: `backend/api/outreach_quality.py`
**新增端点**: `GET /api/analysis/outreach-quality`

### 响应结构

```json
{
  "summary": {
    "enclosure": "全部",
    "cc_connected": 1234,
    "ss_connected": 567,
    "lp_connected": 89,
    "effective_checkin": 2345,
    "referral_registrations": 456,
    "referral_payments": 123,
    "referral_revenue_usd": 45678.0,
    "students": 561
  },
  "by_enclosure": [
    { "enclosure": "0~30", ... },
    { "enclosure": "31~60", ... }
  ]
}
```

### 暴露的 D3 列（此前利用率 0%）

| 字段 | D3 列名 | 说明 |
|------|---------|------|
| `cc_connected` | CC接通 / CC有效接通 | CC 角色接通次数 |
| `ss_connected` | SS接通 / SS有效接通 | SS 角色接通次数 |
| `lp_connected` | LP接通 / LP有效接通 | LP 角色接通次数 |
| `effective_checkin` | 有效打卡 / 本月有效打卡 | 有效打卡次数 |
| `referral_registrations` | 转介绍注册数 | 按人明细汇总 |
| `referral_payments` | 转介绍付费数 | 按人明细汇总 |
| `referral_revenue_usd` | 总带新付费金额USD | 按人明细汇总 |

设计：_COL_ALIASES 机制处理列名变体，`students` 字段作为接通率分母。

---

## 任务 B — D2 财务模型参与率

**修改文件**:
- `backend/models/enclosure.py`: 新增 `finance_participation_rate: float | None` 字段
- `backend/api/enclosure.py`: col_map 加入 `"财务模型参与率"`, num_cols 加入聚合

**端点**: `GET /api/enclosure` 和 `GET /api/enclosure/ranking` 均自动包含新字段。

---

## 路由注册

`backend/main.py` ROUTER_REGISTRY 新增:
```python
"outreach_quality": ("backend.api.outreach_quality", "/api", ["analysis"]),
```

Commit: `41ba51d2`

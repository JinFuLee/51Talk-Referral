# mk-outputs: process metric targets + enclosure targets + custom tier fix

## 变更摘要

commit: `6ecaa00c`，3 文件，167 行新增，1 行删除。

---

## 1. 过程指标目标（从 D2 推导）

**修改文件：** `backend/core/report_engine.py`

### `_build_total_metrics` 新增
从 D2（围场过程数据_byCC）取 5 个过程指标实际均值，追加到 total_metrics：
- `checkin_rate` ← `当月有效打卡率` 均值（当前: 0.3263）
- `cc_contact_rate` ← `CC触达率` 均值（0.1898）
- `ss_contact_rate` ← `SS触达率` 均值（0.2362）
- `lp_contact_rate` ← `LP触达率` 均值（0.1177）
- `participation_rate` ← `转介绍参与率` 均值（0.0419）

### `_normalize_targets` 新增（步骤 6）
末尾从 D2 当月均值推导过程指标目标（`setdefault`，可被 targets_override.json 覆盖）。

### `_block_monthly_overview` 新增
metrics 列表追加 5 个过程指标，月度总览 API 响应完整包含这些字段。

---

## 2. 围场级目标端点

**修改文件：** `backend/api/config.py`

新增 `GET /api/config/enclosure-targets`，从 D2 按围场 groupby 返回过程指标均值：

```json
{
  "overall": {
    "checkin_rate": 0.3263,
    "cc_contact_rate": 0.1898,
    "ss_contact_rate": 0.2362,
    "lp_contact_rate": 0.1177,
    "participation_rate": 0.0419
  },
  "by_enclosure": {
    "0~30": {"checkin_rate": 0.7021, "cc_contact_rate": 0.898, ...},
    "31~60": {...},
    "61~90": {...},
    "91~120": {...},
    "121~150": {...},
    "151~180": {...},
    "M6+": {...}
  }
}
```

---

## 3. 三档 custom tier 修复

**修改文件：** `backend/api/config.py`

`GET /api/config/targets/tiers` 新增 4 个查询参数：
- `include_custom: bool`（触发三档计算）
- `revenue_target: float`（总收入目标 USD）
- `asp: float`（客单价 USD）
- `reg_to_pay_rate: float`（注册付费率 0-1）
- `registrations: float`（注册目标数量）

前端 TargetRecommender 的"推算"按钮调用路径已联通：
```
前端: /api/config/targets/tiers?include_custom=true&revenue_target=180000&asp=950&reg_to_pay_rate=0.19
后端: TargetTierEngine.get_all_tiers(custom_inputs={...})
返回: custom.total.revenue_usd=180000, reg_to_pay_rate=0.19, registrations≈997
```

---

## 4. 前端 MonthlyOverviewSlide

**修改文件：** `frontend/components/analytics/MonthlyOverviewSlide.tsx`

- `I18N.zh.metrics` + `I18N.en.metrics`：加入 5 个过程指标标签
- `RATE_METRICS`：5 个过程指标并入率类（统一 `formatRate` 格式化）
- `DISPLAY_METRICS`：追加 5 个过程指标（月度总览表格展示）

---

## 验证命令

```bash
# 围场目标
curl -s http://localhost:8100/api/config/enclosure-targets | python3 -c "import sys,json; d=json.load(sys.stdin); print(list(d['by_enclosure'].keys()))"

# 过程指标在月度概览
curl -s http://localhost:8100/api/report/daily | python3 -c "import sys,json; d=json.load(sys.stdin); mo=d['blocks']['monthly_overview']; print({k:mo['actuals'][k] for k in ['checkin_rate','participation_rate']})"

# custom tier 推算
curl -s 'http://localhost:8100/api/config/targets/tiers?include_custom=true&revenue_target=180000&asp=950&reg_to_pay_rate=0.19' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tiers']['custom']['total'])"
```

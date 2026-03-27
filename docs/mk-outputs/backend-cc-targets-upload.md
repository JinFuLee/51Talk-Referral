# backend-cc-targets-upload 产出记录

## 变更文件
- `backend/api/cc_performance.py`（+105 行）

## 实现内容

### 1. 新函数 `_load_cc_targets(month)`
- 读取 `config/cc_targets_YYYYMM.json`
- 返回 `dict[cc_name → target_dict]`，文件不存在返回 `{}`

### 2. 新增 API 端点（3 个）

| 端点 | 说明 |
|------|------|
| `GET /api/cc-performance/targets/template?month=YYYYMM` | 下载 CSV 模板，预填 CC 名字 |
| `POST /api/cc-performance/targets/upload?month=YYYYMM` | 上传 CSV/Excel，写入 `config/cc_targets_YYYYMM.json` |
| `DELETE /api/cc-performance/targets/{month}` | 删除该月个人目标配置 |

### 3. `_build_record` 三级 fallback
1. 个人目标（上传 CSV）→ `target_source = "manual"`
2. 加权分配 fallback（usd_target / paid_target）→ `target_source = "allocated"`
3. showup/leads 个人目标只有上传才有，无上传则 `None`

### 4. `get_cc_performance` 集成
- 加载 `cc_targets = _load_cc_targets(month)` 并传入 `_build_record`

## 存储格式
```json
{
  "month": "202603",
  "updated_at": "2026-03-27T08:00:00Z",
  "targets": {
    "thcc-Zen": {"usd_target": 10000, "referral_usd_target": 3000, "paid_target": 3, "showup_target": 2, "lead_target": 2}
  }
}
```

## 验证
- `uv run ruff check backend/api/cc_performance.py` → All checks passed

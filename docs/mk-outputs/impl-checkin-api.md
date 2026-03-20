# MK 产出：打卡面板后端 API

## 交付内容

**新建文件**：`backend/api/checkin.py`（597 行）

**修改文件**：
- `backend/main.py` — ROUTER_REGISTRY 注册 `checkin`
- `projects/referral/config.json` — `enabled_routers` 追加 `checkin`

## 端点清单

| 端点 | 方法 | 数据源 | 说明 |
|------|------|--------|------|
| `/api/checkin/summary` | GET | D2 | 按角色/团队/围场聚合打卡率 |
| `/api/checkin/team-detail` | GET | D2 | 指定团队每个销售的打卡明细 |
| `/api/checkin/followup` | GET | D3+D4 | 未打卡学员列表，按质量评分降序 |

## 关键实现

- 围场天数段 → M 月份映射（0~30=M0, 31~60=M1, ... 181+=M6+）
- 围场-岗位边界从 `projects/referral/config.json:enclosure_role_assignment` 读取，fallback 为 CC M0-M2 / SS M3-M5 / LP M6+
- D3 JOIN D4：以 `stdt_id` 为 key，O(1) dict 查找
- 质量评分公式：课耗(40%) + 推荐活跃(30%) + 付费贡献(20%) + 围场加权(10%)

## 验证

```
uv run python -c "from backend.main import app; routes = [r.path for r in app.routes if hasattr(r,'path') and 'checkin' in r.path]; print(routes)"
# → ['/api/checkin/summary', '/api/checkin/team-detail', '/api/checkin/followup']
```

Commit: baf88a40

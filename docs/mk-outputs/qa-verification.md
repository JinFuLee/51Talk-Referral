# M33 QA 验证报告

**验证时间**：2026-03-26
**验证模型**：claude-sonnet-4-6（qa-tester agent）
**后端**：localhost:8100 | **前端**：localhost:3100

---

## 验收结果总览

| # | 验收项 | 结果 | 证据/备注 |
|---|-------|------|---------|
| 1 | API 11 区块（`/api/report/daily`） | **FAIL** | `{"detail":"Not Found"}` — 路由未注册 |
| 2 | 4 口径 × 渠道（`/api/report/daily` `revenue_contribution`） | **FAIL** | 依赖验收项 1，同一根因 |
| 3 | 8 维环比（`/api/report/daily` `comparisons`） | **FAIL** | 依赖验收项 1，同一根因 |
| 4 | 三因素分解残差验证 | **FAIL** | 依赖验收项 1，无法获取 decomposition block |
| 5 | 前端页面（`/analytics`） | **PASS with caveat** | `GET /analytics` → 200 OK，96KB HTML；验收命令 `/zh/analytics` 返回 404（项目无 locale 路由层） |
| 6 | 钉钉推送 dry-run | **FAIL** | 依赖 `/api/report/summary`（同路由问题），脚本报"重试 3 次仍失败" |
| 7 | 三档目标推荐 | **PASS** | `GET /api/config/targets/202603/recommend` → 200，返回 conservative/base/aggressive 三档 |
| 8 | SQLite 表存在 | **FAIL** | `data/snapshots.db` 不存在，`data/` 目录为空（需先触发快照写入） |

**总计：3/8 PASS，5/8 FAIL**（5 个 FAIL 均同一根因）

---

## 根因分析

### BUG-1（CRITICAL — 必须修复 — 影响验收项 1/2/3/4/6/8）

**根因**：`projects/referral/config.json` 的 `enabled_routers` 列表缺少 `"report"` 条目。

**文件**：`projects/referral/config.json` 第 153-185 行

**触发链**：
```
main.py → load_project_config("referral")
         → enabled_routers = ["health", "system", ..., "notifications"]
         → "report" 不在列表
         → backend/api/report.py 的路由未注册
         → /api/report/daily, /api/report/summary 等全部 404
         → 钉钉推送脚本依赖 /api/report/summary → 失败
         → SQLite 快照无法写入 → data/snapshots.db 不存在
```

**命令证据**：
```
curl -s localhost:8100/api/report/daily
{"detail":"Not Found"}

curl -s localhost:8100/api/openapi.json | python3 -c "import sys,json; d=json.load(sys.stdin); [print(p) for p in d['paths'] if 'report' in p.lower()]"
# 仅返回 /api/reports/* 路由，无任何 /api/report/* 条目
```

**修复**：在 `projects/referral/config.json` 的 `enabled_routers` 列表中添加 `"report"`。

### BUG-2（WARNING — 建议修复 — 验收项 8 次要问题）

`data/snapshots.db` 在后端启动时不自动创建。`_ensure_schema()` 仅在 `DailySnapshotService.__init__` 被调用时执行。

**建议**：在 `backend/main.py` 的 `lifespan()` 函数中添加 `_ensure_schema()` 自动调用，确保 DB 文件在启动时就存在。

### CAVEAT-1（验收项 5 — 路径偏差，非代码 bug）

验收命令路径 `/zh/analytics` 不存在，实际有效路径为 `/analytics`。
- `frontend/app/analytics/page.tsx` 存在且可访问（200 OK，96KB）
- 项目未实现 `[locale]` 动态路由层（CLAUDE.md 规划但未实现）

---

## 修复后验收步骤

**Step 1**：修改 `projects/referral/config.json`，在 `"notifications"` 后加 `"report"`

**Step 2**：重启后端

**Step 3**：初始化 SQLite
```bash
curl -X POST localhost:8100/api/report/snapshot
```

**Step 4**：重跑 8 项验收命令

---

## PASS 项证据

### 验收项 5：前端页面

```
GET http://localhost:3100/analytics
HTTP 200 OK | Content-Length: 96608 bytes
<title>ref-ops-engine — 运营分析面板</title>
```

### 验收项 7：三档目标推荐

```
GET http://localhost:8100/api/config/targets/202603/recommend
HTTP 200 OK

{
  "month": "202603",
  "growth_rates": {"reg": 0.1155, "paid": 0.1173, "revenue": 0.1485},
  "scenarios": {
    "conservative": {"label": "保守（持平）", "multiplier": 1.0,
      "summary": {"注册目标": 869, "付费目标": 200, "金额目标": 169800.0}},
    "base": {"label": "基准（趋势延伸）", "multiplier": 1.148,
      "summary": {"注册目标": 998, "付费目标": 229, "金额目标": 195011.36}},
    "aggressive": {"label": "激进（加速增长）", "multiplier": 1.223,
      "summary": {"注册目标": 1062, "付费目标": 244, "金额目标": 207617.04}}
  },
  "feasibility": {"score": null, "label": "数据不足", "confidence": "low"}
}
```

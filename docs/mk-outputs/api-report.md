# M33 API 报告路由 + 钉钉推送 产出记录

commit: 1a9374dd

## 新增文件

### backend/api/report.py
4 个 API 端点：
- `GET /api/report/daily` — 完整 11 区块日报（ReportEngine.generate_daily_report）
- `GET /api/report/summary` — 钉钉消费摘要（bm_pct/进度/瓶颈/环比）
- `GET /api/report/comparison` — 多维度环比（level × type × channel × metric）
- `POST /api/report/snapshot` — 手动触发 T-1 快照写入 SQLite

Router 注册到 backend/main.py ROUTER_REGISTRY["report"]。

### scripts/dingtalk_report.py
- 调用 `/api/report/summary` 获取数据
- 格式化为钉钉 Markdown（月度进度表/环比/瓶颈 TOP1）
- 模式：`--dry-run`（预览）/ `--test`（连通测试）/ `--confirm`（发正式群）
- 正式群防护：非 test 通道不加 --confirm 自动降级为 dry-run

## 接口说明

```
# 获取完整日报
curl http://localhost:8100/api/report/daily

# 获取摘要（钉钉消费）
curl http://localhost:8100/api/report/summary

# 月维度累计对比（CC窄口，revenue_usd）
curl "http://localhost:8100/api/report/comparison?level=month&type=td&channel=CC窄口"

# 手动快照
curl -X POST http://localhost:8100/api/report/snapshot

# 钉钉推送 dry-run
uv run python scripts/dingtalk_report.py --dry-run

# 钉钉推送正式群（需凭证）
uv run python scripts/dingtalk_report.py --channel cc_all --confirm
```

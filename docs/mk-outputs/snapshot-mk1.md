# MK-1: snapshot_daily.py + DB 统一 + 数据迁移

## 完成状态：全部完成

## 变更文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/core/daily_snapshot_service.py` (L24) | 修改 | DB_PATH 从 `data/snapshots.db` → `output/snapshots/ref_ops.db` |
| `scripts/snapshot_daily.py` | 新建 | 独立 CLI 快照脚本，支持 --date / --backfill / --migrate |

## 执行结果

### 迁移（--migrate）
- 旧 DB 备份：`data/snapshots.db.bak`
- 表结构重建（最新 DDL，monthly_archives 补齐 4 个 rate 列）
- 迁移：daily_snapshots 12 条 + daily_channel_snapshots 60 条 + monthly_archives 55 条

### T-1 快照写入
- 日期：2026-03-30
- 注册数：1173
- 业绩：$207,296
- 渠道：5 个（CC窄口 / SS窄口 / LP窄口 / 宽口 / 其它）

### 验证
```
daily_snapshots:        13 条，2025-05-31 ~ 2026-03-30
daily_channel_snapshots: 65 条
monthly_archives:       55 条
```

## 用法

```bash
uv run python -m scripts.snapshot_daily              # 写入昨天 T-1 快照
uv run python -m scripts.snapshot_daily --date 2026-03-28   # 指定日期
uv run python -m scripts.snapshot_daily --backfill 7        # 回填最近 7 天
uv run python -m scripts.snapshot_daily --migrate           # 迁移旧数据（一次性）
```

## 关键设计

- **幂等**：已有快照自动跳过，不重复写入
- **迁移健壮性**：目标表先 DROP + 用最新 DDL 重建，避免列结构不匹配
- **告警**：写入失败时读 `config/quickbi_notify.json` 发钉钉告警（复用 quickbi_fetch.py 模式）
- **模块导入**：必须用 `uv run python -m scripts.snapshot_daily`（非 `scripts/snapshot_daily.py` 直接路径）

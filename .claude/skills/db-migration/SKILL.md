---
name: db-migration
description: 数据库 schema 变更流程 — 适配 ref-ops-engine 的 SQLite 快照存储（非标准 Postgres/Prisma 迁移）
when_to_use: 修改 SQLite 表结构时；新增快照字段时；SnapshotStore 表变更时触发
version: 1.0.0
---

# /db-migration — 数据库变更（ref-ops-engine 适配版）

## 项目上下文

- **数据库**：SQLite（文件路径：`backend/data/snapshots.db`）
- **ORM/接口**：直接 Python sqlite3（无 ORM，无 Prisma/Alembic）
- **Schema 定义位置**：`backend/core/snapshot_store.py`（`SnapshotStore._init_db()` 方法）
- **4 张核心表**：
  - `daily_snapshots` — 每日 KPI 快照
  - `cc_performance` — CC 个人绩效记录
  - `weekly_aggregates` — 周聚合数据
  - `alerts` — 预警记录
- **Excel 数据源**：`input/*.xlsx`（非 DB，35 个 Loader 解析，无 schema 约束）
- **无迁移框架**：没有 Alembic、没有 Prisma migrate，手动 ALTER TABLE

## Schema 变更流程

### 步骤 1：变更前检查
1. Read `backend/core/snapshot_store.py` — 了解当前 `_init_db()` 完整表结构
2. Grep `backend/` 搜索受影响字段名（确认所有引用点）
3. Grep `frontend/` 搜索受影响字段名（前端消费点）
4. 备份当前 DB：`cp backend/data/snapshots.db backend/data/snapshots.db.bak.$(date +%Y%m%d)`

### 步骤 2：向后兼容性判断
| 变更类型 | 向后兼容 | 处理方式 |
|---------|---------|---------|
| 新增列（有默认值）| 是 | 直接 ALTER TABLE + 更新 `_init_db()` |
| 新增列（无默认值）| 部分 | 加 `NOT NULL DEFAULT ''` 或先加 NULL 列 |
| 删除列 | 否 | 需要重建表（CREATE + INSERT SELECT + DROP + RENAME）|
| 修改列类型 | 否 | 需要重建表 |
| 新增表 | 是 | 直接在 `_init_db()` 添加 CREATE TABLE IF NOT EXISTS |

### 步骤 3：执行变更（SQLite 特化）
```python
# SQLite 不支持 DROP COLUMN（SQLite < 3.35），需重建表
# 新增列（推荐方式）
conn.execute("ALTER TABLE daily_snapshots ADD COLUMN {new_field} REAL DEFAULT 0")

# 重建表（删除/修改列时）
conn.execute("CREATE TABLE daily_snapshots_new AS SELECT ... FROM daily_snapshots")
conn.execute("DROP TABLE daily_snapshots")
conn.execute("ALTER TABLE daily_snapshots_new RENAME TO daily_snapshots")
```

更新 `backend/core/snapshot_store.py` 的 `_init_db()` 方法，确保包含新字段的完整 CREATE TABLE 语句（新数据库初始化时的 source of truth）。

### 步骤 4：迁移脚本（如字段涉及历史数据回填）
在 `backend/scripts/migrate_{date}.py` 创建一次性迁移脚本：
```python
#!/usr/bin/env python3
"""
Migration: {描述}
Date: {date}
Reversible: {Yes/No}
"""
import sqlite3

def up():
    """Apply migration"""
    conn = sqlite3.connect('backend/data/snapshots.db')
    # ... 变更逻辑
    conn.close()

def down():
    """Rollback migration"""
    # ... 回滚逻辑（如不可逆，记录原因）
    pass

if __name__ == '__main__':
    up()
    print("Migration complete")
```

### 步骤 5：消费方更新
按以下顺序更新（有依赖，串行）：
1. `backend/core/snapshot_store.py` — Schema + 读写方法
2. `backend/core/analysis_engine_v2.py` — 如果变更影响快照写入
3. `backend/api/snapshots.py` — API response 模型
4. `frontend/lib/types/` — TypeScript 类型定义
5. `frontend/` 组件 — 消费新字段的组件

### 步骤 6：验证
```bash
# Python 语法检查
python -m py_compile backend/core/snapshot_store.py

# TypeScript 类型检查
cd frontend && npx tsc --noEmit

# 功能验证：写入一条快照，读取验证字段存在
python -c "from backend.core.snapshot_store import SnapshotStore; s = SnapshotStore(); print('OK')"
```

## 注意事项

- **SQLite 并发限制**：SnapshotStore 使用 WAL 模式，多进程并发写入需注意锁超时
- **历史数据**：`input/*.xlsx` 的历史数据不在 DB 内，变更不影响 Excel 解析
- **无在线 migration**：本项目是内部运营工具，可接受停机变更（无需蓝绿部署）
- **技术债 #19**：Cohort/Enclosure 数据源需历史队列数据完整性验证，schema 变更时需核查

## 与全局 Skill 的关系
- 全局版路径：~/.claude/skills/db-migration/SKILL.md（**当前不存在**）
- 全局参考：`~/.claude/skills/postgres-best-practices/SKILL.md`（**文件存在**，但适用 Postgres，本项目为 SQLite）
- 本适配版完全替代 Postgres 迁移流程，使用 SQLite 原生 ALTER TABLE / 重建表方案

# fix-watcher-env-cache — 修复结果

## 变更摘要

| 文件 | 变更内容 |
|------|---------|
| `一键启动.command:106` | uvicorn 启动前设置 `DATA_SOURCE_DIR="$HOME/Desktop/转介绍中台监测指标"` |
| `backend/core/file_watcher.py:169-180` | `cleanup_old_versions()` 末尾增加 `.cache/*.parquet` 全量清理逻辑 |

## SEE 闭环

**全局扫描 DATA_SOURCE_DIR**：`一键启动.command` / `backend/api/dependencies.py` / `backend/core/config.py` / `CLAUDE.md` — 引用全部一致，无遗漏。

**全局扫描 .cache**：`backend/core/loaders/base.py:46`（写缓存）和 `file_watcher.py:171`（清缓存）路径一致，无遗漏。

## 验证结果

- lint: `ruff check` → All checks passed
- 集成测试: `xlsx 1 (期望 1), parquet 0 (期望 0)` → ✓ 全部通过
- commit: `080bb7b1` (2 files changed, 15 insertions, 1 deletion)
- push: 需用户手动 `git push`（GitHub HTTPS 凭证未配置）

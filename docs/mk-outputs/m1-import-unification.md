# M1 Import Unification — backend.* 绝对导入统一

**完成时间**: 2026-03-10
**任务类型**: 重构 / 技术债清理
**状态**: 完成 — 332 passed, 0 failed

## 核心变更摘要

### 1. pyproject.toml
- `pythonpath = ["backend"]` → `pythonpath = ["."]`
- PYTHONPATH 锚点从 `backend/` 改为仓库根目录，所有 `import backend.*` 可正常解析

### 2. 文件变更范围
| 目录 | 文件数 | 变更类型 |
|------|--------|---------|
| `backend/main.py` | 1 | 顶层导入 × 2 + ROUTER_REGISTRY × 26 + uvicorn.run 参数 |
| `backend/api/*.py` | 25 | `from services.*` / `from core.*` / `from models.*` 顶层+懒导入 |
| `backend/core/*.py` | 8 | 内部交叉引用 + config.py TMPDIR 修复 |
| `backend/services/*.py` | 1 | run() 方法内 5 处懒导入 |
| `backend/tests/**/*.py` | 14 | `from core.*` → `from backend.core.*`; `from main import app` → `from backend.main import app` |
| `一键启动.command` | 1 | `cd backend && uv run python -m uvicorn main:app` → `uv run python -m uvicorn backend.main:app` |

**总计**: 54 个文件修改

### 3. 额外修复 (SEE 闭环扫描发现)
- `backend/core/config.py` L26: `/tmp/fallback_data_source` → `Path(os.environ.get("TMPDIR", "/private/tmp/claude-501")) / "fallback_data_source"` (P0 规则: macOS TMPDIR)
- `backend/tests/unit/test_snapshot_store_cleanup.py` L178: `logger="core.snapshot_store"` → `logger="backend.core.snapshot_store"` (logger `__name__` 随模块路径变化)

### 4. 新增自动化防线
- `scripts/check_imports.sh`: 全量扫描 `backend/**/*.py` 裸导入，exit 1 if found
- 集成方式: `bash scripts/check_imports.sh` 可加入 CI pre-merge gate

## 验证结果
```
check_imports.sh: OK: 0 裸导入
pytest: 332 passed, 2 skipped, 0 failed
uv run python -c "from backend.main import app; print('OK')" → OK
```

## 根因 & 防错表条目
- **问题**: `pythonpath = ["backend"]` 允许 `import core.X` 和 `import backend.core.X` 并存，导致同一模块被注册两次（如 `SnapshotStore` 单例跨 import 路径断裂）
- **修复层**: PYTHONPATH 锚点（pyproject.toml），非 import 语句本身
- **防错规则**: Python 项目 `pyproject.toml` 的 `[tool.pytest.ini_options] pythonpath` 必须以仓库根目录为锚（`"."`），不设为子包目录，防止双路径导入污染 `sys.modules`

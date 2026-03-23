# backend-indicator-matrix MK 产出

## 任务摘要

创建指标矩阵后端 API，包含 Pydantic 模型、FastAPI 路由、main.py 注册和 override 文件。

## 创建/修改的文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/models/indicator_matrix.py` | 新建 | 4 个 Pydantic 模型：IndicatorDef / RoleMatrix / IndicatorMatrixConfig / MatrixUpdateBody |
| `backend/api/indicator_matrix.py` | 新建 | 4 个 FastAPI 端点（GET registry / GET matrix / PUT matrix/{role} / POST matrix/{role}/reset） |
| `backend/main.py` | 修改 | ROUTER_REGISTRY 新增 indicator_matrix 条目 |
| `projects/referral/config.json` | 修改 | enabled_routers 新增 indicator_matrix |
| `config/indicator_matrix_override.json` | 新建 | 空 override 文件 `{}` |

## API 端点

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/indicator-matrix/registry` | 返回全量指标注册表（来自 config.json indicator_registry） |
| GET | `/api/indicator-matrix/matrix` | 返回合并后的岗位矩阵（base + override） |
| PUT | `/api/indicator-matrix/matrix/{role}` | 更新 SS/LP 的 active 列表（CC → 403） |
| POST | `/api/indicator-matrix/matrix/{role}/reset` | 删除 override，恢复默认值 |

## 验证结果

```
ruff check backend/models/indicator_matrix.py backend/api/indicator_matrix.py
All checks passed!
```

## 业务逻辑

- CC 只读（readonly=true），PUT/reset 返回 403
- SS/LP 更新时双重校验：① ID 在 registry 中 ② ID 是 CC active 的子集
- override 文件路径：`config/indicator_matrix_override.json`
- 合并逻辑：override 中有 role key 时，用 override 的 active 替换 base 的 active
- 与 config.py 模式完全一致（_read_json / _write_json / PROJECT_ROOT / CONFIG_DIR）

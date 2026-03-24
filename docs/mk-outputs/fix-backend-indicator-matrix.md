# fix: 后端指标矩阵 — output目录自动创建 + 空注册表返回200

## 修复摘要

文件：`backend/api/indicator_matrix.py`

### Bug 1 (P1): output/ 目录不存在时审计日志静默失败

在 `put_indicator_matrix` 和 `reset_indicator_matrix` 两个端点的审计日志写入前，添加：

```python
audit_path.parent.mkdir(parents=True, exist_ok=True)
```

根因：`output/` 目录在新环境首次运行时不存在，`open("a")` 会抛出 `FileNotFoundError`，虽然被 `except` 吞掉不阻塞业务，但审计记录永久丢失。

修复位置：
- `put_indicator_matrix` L142-143（update 端点）
- `reset_indicator_matrix` L197-198（reset 端点）

### Bug 2 (P3): 空注册表返回 404 应改为 200

`get_indicator_registry` 函数中，移除空注册表时的 `raise HTTPException(status_code=404, ...)`，改为直接返回空列表。

根因：空注册表是合法状态（配置初始化阶段），前端收到 404 会触发错误处理逻辑，而非正常空态处理。

## 验证结果

- `uv run ruff check backend/api/indicator_matrix.py` → All checks passed!
- `uv run python -c "from backend.api.indicator_matrix import router; print('ok')"` → ok

## commit

`8379c0df` fix: 后端指标矩阵 — output目录自动创建 + 空注册表返回200
- 1 file changed, 2 insertions(+), 2 deletions(-)

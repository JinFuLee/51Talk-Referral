# M38 Backend Core — 执行结果

完成时间：2026-04-02

## 变更摘要

### 1. `backend/core/date_override.py` — contextvars 请求级隔离（完整重写）
- 新增 `_request_month: ContextVar[str | None]`
- 新增 `set_request_month(month)` 供 MonthMiddleware 调用
- `get_today()` 优先级：请求级 contextvars > DATA_MONTH 环境变量 > date.today()
- `is_override_active()` 同时检测两种来源
- 6 个已有导入点（`get_today/get_reference_date/get_month_key/is_override_active`）零修改

### 2. `backend/main.py` — MonthMiddleware 注入
- 新增 `MonthMiddleware(BaseHTTPMiddleware)`，从 `?month=YYYYMM` 提取并注入 contextvars
- `finally` 块确保请求结束后清除，防止跨请求污染
- `app.add_middleware(MonthMiddleware)` 注册

### 3. `backend/core/data_manager.py` — 归档加载扩展
- `__init__` 新增 `_archive_base: Path`（data/archives/）、`_month_caches: dict`
- `load_for_month(month)`: None/当月→load_all()，历史月→归档目录加载
- LRU maxsize=3：超出淘汰最旧键（字典插入顺序）

### 4. `backend/api/archives.py` — 新建归档 API
- `GET /api/archives/months` — 扫描返回月份列表
- `GET /api/archives/{month}/status` — 读 _meta.json 返回完整性

### 5. `projects/referral/config.json`
- enabled_routers 新增 `"archives"`（39→40 个路由）

## 验收结果

| 验收项 | 命令 | 结果 |
|--------|------|------|
| archives/months | `curl /api/archives/months` | `["202603"]` ✓ |
| archives status | `curl /api/archives/202603/status` | completeness_rate: 1.0 ✓ |
| ?month= 路由 | `curl /api/report/summary?month=202603` | date: 2026-03-30 ✓ |
| contextvars 隔离 | Python 单元测试 | 设置/清除/恢复全通过 ✓ |
| LRU 缓存 | `id(d2) == id(d3)` | True ✓ |
| lint | ruff check（3 个变更文件）| All checks passed ✓ |

## Commit

`cf12ca54` feat(M38-backend-core): contextvars 月份隔离 + MonthMiddleware + 归档 API

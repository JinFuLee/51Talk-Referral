# MK-3 产出：M38 Backend API date.today() 替换

## 任务状态：完成

## 替换清单（14处 + 1处 get_targets）

| # | 文件 | 变更说明 |
|---|------|---------|
| 1 | `backend/api/config.py` L840 | `date.today()` → `get_today()`，移除内联 `from datetime import date, timedelta`（保留 `timedelta`） |
| 2 | `backend/api/config.py` L940 | `date.today()` → `get_today()`，移除内联 `from datetime import date` |
| 3 | `backend/api/config.py` L1073 | `_date.today()` → `get_today()`，移除内联 `from datetime import date as _date` |
| 4 | `backend/api/checkin.py` L915 | `_date.today()` → `get_today()`，移除内联 `from datetime import date as _date` |
| 5 | `backend/api/checkin.py` L994 | `_date.today()` → `get_today()` |
| 6 | `backend/api/checkin.py` L1645 | `date.today()` → `get_today()`，移除内联 `from datetime import date` |
| 7 | `backend/core/leverage_engine.py` L309 | `date.today()` → `get_today()`，移除内联 `from datetime import date` |
| 8 | `backend/core/leverage_engine.py` L362 | `date.today()` → `get_today()`，移除内联 `from datetime import date` |
| 9 | `backend/core/target_recommender.py` L151 | `date.today()` → `get_today()`，移除内联 `from datetime import date` |
| 10 | `backend/core/target_recommender.py` L839 | `_date.today()` → `get_today()`，移除内联 `from datetime import date as _date` |
| 11 | `backend/core/target_recommender.py` L979 | `date.today()` → `get_today()`，移除内联 `from datetime import date` |
| 12 | `backend/api/data_health.py` L598 | `date.today().strftime(...)` → `get_today().strftime(...)`，移除内联 `from datetime import date` |
| 13 | `backend/api/expiry_alert.py` L53 | `date.today()` → `get_today()`，顶层 `from datetime import date` → `from backend.core.date_override import get_today` |
| 14 | `backend/api/member_detail.py` L97 | `date.today()` → `get_today()`，顶层 `from datetime import date` → `from backend.core.date_override import get_today` |
| +1 | `backend/core/config.py` get_targets | 使用 `get_month_key()` 替代 `datetime.now().strftime("%Y%m")`（当 date 参数为 None 时） |

## Import 追加位置

| 文件 | Import 位置 |
|------|------------|
| `backend/api/config.py` | 顶层，`from datetime import UTC, datetime` 后 |
| `backend/api/checkin.py` | 顶层，`from backend.core.data_manager import DataManager` 后 |
| `backend/core/leverage_engine.py` | 顶层，`from typing import Any` 后 |
| `backend/core/target_recommender.py` | 顶层，`from typing import Any` 后 |
| `backend/api/data_health.py` | 顶层，`from backend.core.data_manager import DataManager` 后 |
| `backend/api/expiry_alert.py` | 顶层替换（原 `from datetime import date`） |
| `backend/api/member_detail.py` | 顶层替换（原 `from datetime import date`） |
| `backend/core/config.py` | 顶层，`from pathlib import Path` 后 |

## 验证结果

`date.today()` 在全部目标文件中：**0 matches**

## 逻辑说明

- `get_today()` 优先级：contextvars 请求级 > `DATA_MONTH` 环境变量 > `date.today()`
- 历史月份浏览时 `MonthMiddleware` 通过 `?month=YYYYMM` 注入请求级上下文
- 月份覆盖时 `get_today()` 返回该月最后一天（如 202603 → 2026-03-31）
- 无覆盖时行为完全等同于原 `date.today()`，零破坏性变更

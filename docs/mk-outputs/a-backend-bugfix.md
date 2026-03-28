# Tag A 后端 Bug 修复报告

## Bug 1: checkin.py — _calc_quality_score 除零风险

**根因**: `_calc_quality_score`（L392-412）将 `lesson_max`/`referral_max`/`payment_max` 直接从 config.json 读取，若 config 错误配置为 0 则触发 `ZeroDivisionError → 500`。

**修复**: `backend/api/checkin.py` L392-397
- `lesson_max = float(...) or 15.0` — 零值 fallback 到默认值
- `referral_max = float(...) or 3.0`
- `payment_max = float(...) or 2.0`

**注**: 深度审查了全文件约 2024 行。除 `_calc_quality_score` 外，所有 `df[col]` 访问均已有 `if col in df.columns` 守卫，无裸 KeyError 风险。

---

## Bug 2: config.py — _write_json 目录缺失

**根因**: `_write_json`（L51）直接 `path.write_text()`，若父目录不存在（如首次运行、config/ 被误删）则抛出 `FileNotFoundError → 500`。

**修复**: `backend/api/config.py` L52
- 新增 `path.parent.mkdir(parents=True, exist_ok=True)`

---

## Bug 3: config.py — 推荐目标除零

**根因分析**: 经审查 `backend/core/target_recommender.py` 全文，所有除法操作均有 `if xxx > 0 else 0.0` 守卫。`config.py` 中的 `safe_growth` 函数也有 `if prev_val and prev_val > 0` 守卫。**无需修复**，原代码已防护。

---

## SEE 闭环扫描

搜索 `write_text.*json.dumps` 同模式：
- `backend/api/notifications.py:52` — 同样缺少 `mkdir`，**一并修复**
- `backend/api/incentive_engine.py:152` — 用于临时文件，父目录已存在，安全

---

## 修改文件清单

| 文件 | 修改位置 | 内容 |
|------|----------|------|
| `backend/api/checkin.py` | L392-397 | `lesson_max/referral_max/payment_max` 零值 fallback |
| `backend/api/config.py` | L52 | `_write_json` 添加 `path.parent.mkdir()` |
| `backend/api/notifications.py` | L52 | 同模式 `_write_json` 添加 `path.parent.mkdir()` |

## 验证

- `import backend.api.checkin; import backend.api.config; import backend.api.notifications` → OK
- `ruff check --ignore E501` → All checks passed
- E501 行（L2056, L2189）为预先存在，非本次改动引入

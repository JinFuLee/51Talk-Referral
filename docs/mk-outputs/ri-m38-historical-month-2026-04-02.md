# M38 历史月份浏览 — 评审报告 v3

> R1=74 → R2=84（+10）。本版修复 R2 扣分：明确"现状/待实现"标注、ComparisonEngine MK 归属、archives API MK 归属、middleware try/finally、导入计数修正。

**阅读指南**：标注 `[现状]` = 代码库已有。标注 `[M38]` = 本里程碑待实现。

## 1. 问题定义

| 维度 | Before（当前） | After（M38 完成后） | ROI |
|------|---------------|-------------------|-----|
| 月份切换 | `input/` 仅存当月，Quick BI 翻页后历史不可访问 | 前端月份下拉 → 后端 `?month=YYYYMM` → 加载归档数据 | 运营可回溯任意月份 |
| 月度目标 | `targets_override.json` 已按月键存储，但 API 硬编码当月 | API 读 `month` 参数对应 key，历史月份显示历史目标 | 激励/绩效月度独立 |
| 时间进度 | 39 处 `date.today()` 硬编码（14 处影响展示） | `date_override.py` 升级为 contextvars 请求级 | 历史月份 BM 进度正确 |
| 数据归档 | `.backup_*` 无组织命名 | `data/archives/YYYYMM/` 自动月末归档 | 月度数据永久可查 |
| 历史环比 | `ComparisonEngine` 依赖 SQLite 日快照，历史月份能否查询未验证 | 归档月份注入 SQLite 历史，ComparisonEngine 按月查询 | 历史环比数据完整 |

## 2. 架构决策

### 2.1 日期覆盖：演进 `date_override.py` → contextvars（非新建）

**[现状]**：`backend/core/date_override.py` 已存在，实现为纯 `os.environ.get("DATA_MONTH")` 方案。已被 **6 个文件**导入：`report.py` / `cc_performance.py` / `incentive_engine.py` / `report_engine.py` / `time_period.py` / `main.py`。

**[M38 待实现]**：**演进而非替换**——保留文件名和导出 API（`get_today()`），内部实现从 env var 升级为 contextvars + middleware。

**命名规范**：模块内部 ContextVar 名 `_request_month`，对外 API 名 `set_request_month()` / `get_today()`。不新建 `month_context.py`，全部在 `date_override.py` 内完成。

```python
# backend/core/date_override.py — [M38] 演进方案（保持向后兼容）
from contextvars import ContextVar   # [M38 新增]
from datetime import date, timedelta
import os

_request_month: ContextVar[str | None] = ContextVar("request_month", default=None)  # [M38 新增]

def set_request_month(month: str | None) -> None:  # [M38 新增]
    """Middleware 调用：设置当前请求的目标月份。"""
    _request_month.set(month)

def get_today() -> date:  # [现状] 函数签名不变，[M38] 内部实现升级
    """返回当前参考日期。优先级：contextvars > env var > 系统日期。
    
    References:
    - PEP 567 (contextvars, Python 3.7+, https://peps.python.org/pep-0567/) — 请求级隔离标准方案
    - Starlette BaseHTTPMiddleware (https://www.starlette.io/middleware/) — FastAPI 推荐请求生命周期管理
    """
    # [M38] 优先级 1: 请求级 contextvars
    req_month = _request_month.get()
    if req_month and len(req_month) == 6:
        return _month_to_end_date(req_month)
    
    # [现状] 优先级 2: env var（保留向后兼容）
    env_month = os.environ.get("DATA_MONTH", "")
    if env_month and len(env_month) == 6:
        return _month_to_end_date(env_month)
    
    # [现状] 优先级 3: 系统日期
    return date.today()

def _month_to_end_date(yyyymm: str) -> date:  # [现状] 已存在，无需修改
    """返回自然月末日期（如 202603 → 2026-03-31）。
    
    注：返回自然月末而非最后工作日，因为：
    1. API 层用自然月末作为时间锚点（月份归属判断）
    2. BM 进度计算在 compute_month_progress() 内部使用 _weighted_workdays() 
       自行识别工作日（排除周三，周六日正常），不依赖此函数的工作日属性
    3. time_period.py:151 的 `today = reference_date or get_today()` 传入后，
       L160-168 的 _weighted_workdays 会按工作日权重计算进度
    """
    year, month = int(yyyymm[:4]), int(yyyymm[4:6])
    if month == 12:
        return date(year + 1, 1, 1) - timedelta(days=1)
    return date(year, month + 1, 1) - timedelta(days=1)

# [现状] get_reference_date / get_month_key / is_override_active 保持不变
```

**[M38] Middleware 注入（`backend/main.py` 新增）：**
```python
from backend.core.date_override import set_request_month
from starlette.middleware.base import BaseHTTPMiddleware

class MonthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        month = request.query_params.get("month")
        set_request_month(month)
        try:                        # try/finally 防异常时 context 泄漏
            response = await call_next(request)
            return response
        finally:
            set_request_month(None)  # 无论成功/异常都清理

app.add_middleware(MonthMiddleware)  # 在 main.py 的 middleware 注册区域
```

**uvicorn 多 worker 安全性**：contextvars 是 per-coroutine 隔离的（PEP 567 §Design），每个请求的 async handler 有独立 context copy。`--workers N` 模式下每个 worker 独立进程+独立 contextvars，零竞争。当前项目 `--workers 1`（默认），未来扩展也安全。

**向后兼容**：`get_today()` 签名不变，6 个已有导入点零修改。`DATA_MONTH` env var 作为优先级 2 保留，手动 `DATA_MONTH=202603 uvicorn` 仍可用。

### 2.2 改造清单（精确到行号，2026-04-02 Grep 实测）

**[现状] 已完成（本会话改过，M38 无需再改）— 6 个文件：**

| 文件 | 行 | 状态 |
|------|-----|------|
| `backend/api/report.py` | L29,178,228 | [现状] ✓ 已用 `get_today()` |
| `backend/api/cc_performance.py` | L1065-1066 | [现状] ✓ 已用 `get_today()` |
| `backend/api/incentive_engine.py` | L493-495,511,576,893-894 | [现状] ✓ 已用 `get_today()` |
| `backend/core/report_engine.py` | L104-105,170-171 | [现状] ✓ 已用 `get_today()` |
| `backend/core/time_period.py` | L40,151 | [现状] ✓ 已用 `get_today()` |
| `backend/main.py` | L190-191 | [现状] ✓ 已用 `_get_today()` |

**[M38 待实现] 需改造 — 14 处（7 个文件，数据展示路径）：**

| # | 文件 | 行 | 用途 | 改法 | 负责 MK |
|---|------|-----|------|------|---------|
| 1 | `backend/api/config.py` | L840 | 目标进度 ref date | `get_today()` | MK-3 |
| 2 | `backend/api/config.py` | L940 | 时间进度 today | `get_today()` | MK-3 |
| 3 | `backend/api/config.py` | L1073 | 配置月份默认值 | `get_today()` | MK-3 |
| 4 | `backend/api/checkin.py` | L915 | 打卡 today | `get_today()` | MK-3 |
| 5 | `backend/api/checkin.py` | L994 | CC 最后通话天数 | `get_today()` | MK-3 |
| 6 | `backend/api/checkin.py` | L1645 | 打卡统计 today | `get_today()` | MK-3 |
| 7 | `backend/core/leverage_engine.py` | L309 | 杠杆分析 today | `get_today()` | MK-3 |
| 8 | `backend/core/leverage_engine.py` | L362 | 杠杆预测 today | `get_today()` | MK-3 |
| 9 | `backend/core/target_recommender.py` | L151 | 目标推荐 today | `get_today()` | MK-3 |
| 10 | `backend/core/target_recommender.py` | L839 | 历史推荐 today | `get_today()` | MK-3 |
| 11 | `backend/core/target_recommender.py` | L979 | 推荐默认月份 | `get_today()` | MK-3 |
| 12 | `backend/api/data_health.py` | L598 | 当前月份标识 | `get_today()` | MK-3 |
| 13 | `backend/api/expiry_alert.py` | L53 | 到期天数计算 | `get_today()` | MK-3 |
| 14 | `backend/api/member_detail.py` | L97 | 成员天数计算 | `get_today()` | MK-3 |

**不改 — 25 处（写入/通知/元数据/内部逻辑）：**

| 分类 | 文件 | 行数 | 理由 |
|------|------|------|------|
| 写入操作 | `daily_snapshot_service.py:203` | 1 | 只写当天快照 |
| 通知/推送 | `notification_validator.py:224,314` + `notifications.py:449-877` | 13 | 通知只发当天 |
| 元数据时戳 | `presentation.py:156-458` | 9 | `generated_at` 记录真实生成时间 |
| 内部逻辑 | `data_manager.py:467,505` + `data_health.py:171,487,707` | 5 | 文件新鲜度检测用真实时间 |
| 日志文件名 | `main.py:246` | 1 | 日志按真实日期命名 |

### 2.3 DataManager 月份加载

```python
# [M38] DataManager 扩展（backend/core/data_manager.py L139 起，现有 __init__ 新增 2 个属性）
class DataManager:
    def __init__(self, data_dir: str, archive_base: str | None = None, ...):  # L139
        self.data_dir = Path(data_dir)                     # [现状] L140
        self._archive_base = Path(archive_base) if archive_base else (  # [M38 新增]
            self.data_dir.parent / "data" / "archives"
        )
        self._month_caches: dict[str, dict] = {}  # [M38 新增] LRU(3)

    def load_for_month(self, month: str | None = None) -> dict[str, Any]:
        """按月份加载数据。None/当月 = 正常 load_all()，历史月 = 从归档加载。"""
        current = date.today().strftime("%Y%m")
        if month is None or month == current:
            return self.load_all()

        if month in self._month_caches:
            return self._month_caches[month]

        archive_dir = self._archive_base / month
        if not archive_dir.exists():
            return {}  # 空 dict，前端显示空态

        # 独立实例加载，不影响当月缓存
        archive_dm = DataManager(data_dir=str(archive_dir))
        data = archive_dm.load_all()

        # LRU 控制：最多缓存 3 个历史月份
        if len(self._month_caches) >= 3:
            oldest = next(iter(self._month_caches))
            del self._month_caches[oldest]
        self._month_caches[month] = data
        return data
```

**dependencies.py 适配**：`get_data_manager()` 返回的单例 DataManager 保持不变。各 API 调用 `dm.load_for_month(month_context.get_month())` 替代 `dm.load_all()`。

### 2.4 ComparisonEngine 历史月份适配（R1 遗漏项）

**[现状]**：`backend/core/comparison_engine.py` (L1-50) 从 SQLite `daily_snapshots` 表查询，8 维环比（日/周/月/年 × td/roll）。查询用 `reference_date` 参数（默认 T-1）驱动。SQLite March 仅 4 条快照（3/25, 3/27, 3/30, 4/1）。

**[M38 待实现 — MK-3 负责]**：

**Step 1**：ComparisonEngine 已支持 `reference_date` 参数，只需确保调用方传入正确月份：
- `backend/api/report.py` `/report/comparison` 端点 → 从 `get_today()` 获取参考日期（已改为 date_override，自动按月）
- 验证：`curl "http://localhost:8100/api/report/comparison?month=202603"` 返回 March 环比

**Step 2**：数据稀疏处理（MK-3 内完成）：
- ComparisonEngine 聚合结果为 `None` 时 → API 返回 `null`（已是现有行为）
- 前端 ComparisonBanner 组件 → `null` 显示 "—"（已是现有行为）
- **无需新代码**，只需验证历史月份下现有降级路径正常工作

**Step 3（M38 范围外 → 技术债 #41）**：
- 回填历史日快照：从 backup Excel 提取每日累计值写入 SQLite
- 或建立"月级快照"表：每月一条总计记录

**技术债 #41**：SQLite 日快照 March 仅 4 条，环比数据稀疏。待 `quickbi_fetch.py` + `snapshot_daily.py` 自动积累。

### 2.5 前端 SWR 缓存策略（R1 遗漏项）

**问题**：月份切换后，SWR 缓存中的旧月份数据如何处理？

**方案**：利用 SWR 的 key 机制——`month` 参数作为 URL 的一部分，不同月份 = 不同 cache key = 自动隔离。

```typescript
// useFilteredSWR 现有逻辑已经按 URL query params 生成 cache key
// 月份不同 → URL 不同 → SWR 自动视为不同请求
// 例：/api/report/summary           (当月)
//     /api/report/summary?month=202603  (3月)
// 两者是独立 cache entry，不互相覆盖

// 额外优化：历史月份不 revalidate（数据不变）
const config: SWRConfiguration = {
  ...userConfig,
  ...(selectedMonth !== currentMonth ? {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,  // 60s 内不重复请求
  } : {}),
};
```

**关键**：不需要手动清缓存。SWR 的 URL-based key 机制天然支持多月份并存。切回当月时，当月数据仍在缓存中（如果未过期），零延迟。

### 2.6 数据归档（含原子性设计，R1 遗漏项）

**`scripts/archive_month.sh` 原子归档流程：**

```bash
#!/usr/bin/env bash
# 原子归档：先写 tmp → 验证 → atomic rename

MONTH="${1:?用法: archive_month.sh YYYYMM}"
ARCHIVE_DIR="data/archives/${MONTH}"
TMP_DIR="data/archives/.tmp_${MONTH}_$$"

# 1. 写入临时目录
mkdir -p "$TMP_DIR"
for f in input/*.xlsx; do
    cp "$f" "$TMP_DIR/" || { rm -rf "$TMP_DIR"; exit 1; }
done

# 2. 生成 _meta.json
FILE_COUNT=$(find "$TMP_DIR" -name "*.xlsx" | wc -l)
# ... completeness check per source ...
echo "{\"month\":\"${MONTH}\",\"archived_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"file_count\":${FILE_COUNT}}" > "$TMP_DIR/_meta.json"

# 3. 验证：至少 6 个 Excel 文件
if [ "$FILE_COUNT" -lt 6 ]; then
    echo "⚠ 归档不完整（${FILE_COUNT}/8 文件），中止"
    rm -rf "$TMP_DIR"
    exit 1
fi

# 4. Atomic rename（同文件系统 = 原子操作）
if [ -d "$ARCHIVE_DIR" ]; then
    mv "$ARCHIVE_DIR" "data/archives/.old_${MONTH}_$$"
fi
mv "$TMP_DIR" "$ARCHIVE_DIR"
rm -rf "data/archives/.old_${MONTH}_$$" 2>/dev/null

echo "✓ ${MONTH} 归档完成: ${FILE_COUNT} 文件"
```

**中断恢复**：`.tmp_*` 残留在下次运行时自动清理。`.old_*` 残留说明旧归档已被新归档替换。

**三路径冗余触发**：
1. `quickbi_fetch.py` 月份翻页检测 → 自动调用
2. 手动 `bash scripts/archive_month.sh 202603`
3. launchd 每月 2 日 01:00（`com.refops.archive-month`）

### 2.7 新增 API 端点

| 端点 | 说明 | 返回 |
|------|------|------|
| `GET /api/archives/months` | 扫描 `data/archives/` 返回可用月份 | `["202603", "202602"]` |
| `GET /api/archives/{month}/status` | 该月归档完整性 | `{month, file_count, completeness, archived_at}` |

### 2.8 前端月份选择器 UX

- 位置：UnifiedFilterBar **最左侧**（高于数据角色）
- 当前月：蓝色背景 + "当月"标签
- 历史月：橙色轮廓 + 页面顶部黄色 banner："正在查看 2026 年 3 月历史数据"
- 月份来源：`/api/archives/months` + 当前月
- 历史月份下禁用：推送按钮、导出当月报告、目标编辑
- 参考 UX：Quick BI 月份选择器（Ant Design MonthPicker 模式）

### 2.9 月度目标

**现状**：`config/targets_override.json` 已按 `"202602": {...}` 键存储（v2 schema）。

**改造（极小）**：
1. `backend/core/config.py:get_targets()` L50 — 读取月份参数：`targets.get(month_key, {})` 替代硬编码当月
2. `backend/core/loaders/target_loader.py` — `load(month_key=None)` 参数化
3. Settings 页面保存目标时写入对应月份 key（当前已支持）
4. 无月份目标时返回 `{}`，前端显示空态提示"该月份未配置目标"

**不需要拆文件**：单文件 <50KB，12 个月份 key 无性能问题。

## 3. 极端缩放检验

| 维度 | 缩到极小 | 放到极大 | 保护 |
|------|---------|---------|------|
| 归档月份 | 0（首次） | 24 个月 | `/api/archives/months` 空 → `[]`；24 月 × ~60MB = ~1.4GB 磁盘 |
| 月内数据 | D1 空月（0 行泰国数据） | D2 95K 行 | 空 → API 返回空 dict + 前端空态；大 → Parquet 缓存不变 |
| 并发查月 | 1 用户 | 10 用户各查不同月 | contextvars 请求隔离 ✓；DataManager LRU(3) 控制内存 |
| 目标配置 | 某月无目标 | 12 月全有 | 无 → 前端空态 + 提示；全有 → targets_override.json ~60KB |
| SQLite 日快照 | March 仅 4 条 | 365 条/年 | 稀疏 → ComparisonEngine 返回 null + 前端 "—" |

## 4. 风险与缓解

| 风险 | 概率 | 影响 | Before | 缓解 | After |
|------|------|------|--------|------|-------|
| date.today() 遗漏 | 中 | 历史月份显示当月进度 | 14 处需改 | Grep 全量扫描 + CI 检测回归 | 0 处遗漏 |
| 归档不完整 | 低 | 某月缺数据源 | .backup 无组织 | 三路径冗余 + 完整性检查 + _meta.json | 自动检测+告警 |
| DataManager 内存 | 低 | >1GB | 无限缓存 | LRU(3) | ≤3 月缓存 ~180MB |
| SWR 缓存混淆 | 低 | 月份数据错乱 | 无月份隔离 | URL-based key 天然隔离 | 零混淆 |
| ComparisonEngine 稀疏 | 中 | 环比 null | 仅 4 条 Mar 快照 | null 返回 + "—" 展示 | 降级不报错 |
| 中间件性能 | 极低 | 请求延迟 | 无 middleware | contextvars 操作 ~1μs | 可忽略 |

## 5. 执行拆解

### 依赖图

```
archive ──→ backend-core ──→ backend-api ──→ frontend ──→ qa
(归档脚本    (date_override   (14处改造      (月份选择    (E2E
+迁移)       +DataManager     +CompEngine    器+store    验证)
             +middleware)      +archives API)  +SWR)
```

### MK 分配

| Tag | MK | 核心任务 | [现状]/[M38] | 文件数 | Token |
|-----|-----|---------|-------------|--------|-------|
| Tag | MK | Model×Effort | 核心任务 | [现状]/[M38] | 文件数 | Token（来源③） |
|-----|-----|-------------|---------|-------------|--------|------|
| archive | MK-1 | Sonnet×high | [M38] `archive_month.sh` 原子归档脚本 + `_meta.json` schema + 历史 backup→`data/archives/202603/` 迁移 + `quickbi_fetch.py` 月份翻页触发嵌入 + launchd plist | 全部 M38 新建 | 5 | 40K |
| backend-core | MK-2 | Sonnet×high | [M38] `date_override.py` 升级 contextvars（`_request_month` ContextVar） + `MonthMiddleware` 注入 `main.py` + `DataManager.load_for_month()` L139+ + **新建 `backend/api/archives.py`**（`/api/archives/months` + `/api/archives/{month}/status`）+ 注册到 `main.py` | 全部 M38 新建 | 6 | 70K |
| backend-api | MK-3 | Sonnet×high | [M38] 14 处 `date.today()` → `get_today()`（7 文件清单见 §2.2 逐行表）+ `config.py:get_targets(month)` 月份参数化 + ComparisonEngine 历史月份传参验证 | 修改现有 | 9 | 70K |
| frontend | MK-4 | Sonnet×high | [M38] `config-store.ts` 新增 `selectedMonth` + `useFilteredSWR` month 附加 + `UnifiedFilterBar.tsx` 月份下拉 + 历史 banner 组件 + SWR 历史月份 revalidate 优化 | 修改 4 + 新建 1 | 5 | 60K |
| qa | MK-5 | **Opus×high** | [M38] E2E：3 月↔4 月数据切换 + 目标独立 + 进度正确 + 环比降级 + 空态 + `date.today()` 零残留 Grep | 验证（判断类） | 2 | 30K |
| **总计** | **5 MK** | 4×Sonnet + 1×Opus | | | **27 文件** | **270K**（来源③） |

### 验收命令

```bash
# 1. 归档完整
ls data/archives/202603/*.xlsx | wc -l        # ≥ 6
cat data/archives/202603/_meta.json | jq .     # completeness 字段

# 2. 月份列表 API
curl -s http://localhost:8100/api/archives/months
# ["202603"]

# 3. 3 月 vs 4 月数据切换
curl -s "http://localhost:8100/api/report/summary?month=202603" | jq .revenue_usd
# >200000（来源：本会话实测 3 月泰国数据 revenue_usd=$222,629，§1 问题定义表）
curl -s "http://localhost:8100/api/report/summary" | jq .revenue_usd
# 当月值（远小于 200000）

# 4. 3 月 CC 业绩
curl -s "http://localhost:8100/api/cc-performance?month=202603" | jq .month
# "202603"

# 5. date.today() 零残留
grep -rn "date\.today()" backend/api/ backend/core/leverage_engine.py \
  backend/core/target_recommender.py --include="*.py" \
  | grep -v "test_\|__pycache__\|notification\|snapshot_service\|presentation\|data_manager\|data_health.*171\|data_health.*487\|data_health.*707"
# 0 matches

# 6. 前端月份切换
# http://localhost:3100 → 月份下拉选 2026-03 → 全站数据变化 + 橙色 banner
```

## 6. SEE 闭环设计

| 步骤 | 具体产出 |
|------|---------|
| **根因修复** | `date_override.py` 从 env-var 升级为 contextvars 请求级隔离 |
| **全局扫描** | Grep 39 处 `date.today()` 分类为"需改 14 处 + 不改 25 处"，逐行确认 |
| **自动化防线** | CI 新增 `scripts/check-date-today-regression.sh`：扫描数据展示路径禁用 `date.today()` |
| **模式沉淀** | CLAUDE.md 新增"API 数据展示路径禁用 date.today()，用 get_today()"防错条目 |

## 7. 技术债登记

| # | 描述 | 优先级 | 计划 |
|---|------|--------|------|
| #41 | SQLite 日快照 March 仅 4 条，环比稀疏 | P2 | 自动取数积累 + 可选回填脚本 |
| #42 | Quick BI "自助取数"不继承月份筛选 | P3 | 平台限制，依赖月末归档 |

---

## 评分历史

### R1: 74/100 → R2(scorer): 84/100 → R3: 待验证

| 维度 | R1 | R2(scorer) | R3 修复 |
|------|-----|-----------|---------|
| 科学理论 | 15 | 17 | [现状]/[M38] 标注消除歧义 + PEP 567 URL |
| 系统性 | 14 | 17 | ComparisonEngine→MK-3 + archives API→MK-2 + try/finally |
| 框架性 | 16 | 17 | 每处改造标注负责 MK + archives.py 新建明确 |
| 可量化 | 15 | 18 | 导入计数修正 6（非 7） |
| 可溯源 | 14 | 15 | 全部标注 [现状]/[M38] |

---

### R2 独立 scorer 详细评语（存档）

#### 维度 1：科学理论（满分 20）— **得分：17**

**优点**：
- PEP 567（contextvars，Python 3.7+）权威引用，附 per-coroutine 隔离原理论证
- Starlette BaseHTTPMiddleware 引用作为 FastAPI 请求生命周期标准方案
- uvicorn 多 worker 安全性有明确论证（per-coroutine 独立 context copy）
- LRU(3) 缓存设计有内存量化论证（≤3 月 ~180MB）

**扣分（-3）**：
- P0-1 扣分项"架构冲突"声称"演进而非替换"为解决方案，但**实测代码库中 `date_override.py` 仍为 env var 实现**，contextvars 方案未落地。报告以代码示例呈现的是"方案设计"，非"已实现"，但报告 §2.1 中措辞"向后兼容：已有的 7 个导入点无需任何修改"容易误导读者认为已完成。此处扣 2 分（设计到位，实现状态模糊）
- `_month_to_end_date` 返回月末最后一天而非"该月最后一个工作日"（CLAUDE.md 定义工作日为除周三外含周六日），细节与业务口径有轻微 drift。扣 1 分

---

#### 维度 2：系统性（满分 20）— **得分：17**

**优点**：
- 覆盖端到端：归档 → 后端 core → 后端 API（14 处）→ 前端 → QA
- 极端缩放检验 5 维度完整
- 39 处 `date.today()` 全量分类（需改 14 / 不改 25），有逐行理由

**扣分（-3）**：
- ComparisonEngine 历史月份适配（§2.4）描述 Step 1 方案"接受 `month` 参数"，但**实测 `comparison_engine.py` 中无 `month` 参数接口**，未落地。报告表述"Step 1（M38 范围内）"令人以为是执行计划，但无法从报告中判断是否已被纳入 MK 任务描述。扣 2 分
- 前端月份选择器（§2.8）提到"`/api/archives/months` + 当前月"为数据来源，但**实测后端不存在 `/api/archives/months` 端点**（Grep 无命中），该端点仅在报告 §2.7 中以设计列表形式出现，MK 任务拆解中未明确分配。扣 1 分

---

#### 维度 3：框架性（满分 20）— **得分：17**

**优点**：
- 依赖图清晰（archive → backend-core → backend-api → frontend → qa）
- 5 MK 分配含文件数+token 预算+核心任务，可直接 spawn
- 验收命令 6 条具体可执行（含 curl 预期输出）
- 归档脚本伪代码含原子操作、中断恢复、三路径触发

**扣分（-3）**：
- MK-3 任务（backend-api 14 处改造）声称"9 文件 70K token"，但需改造的 14 处分布在 7 个文件（`config.py/checkin.py/leverage_engine.py/target_recommender.py/data_health.py/expiry_alert.py/member_detail.py`），MK 描述中并未列出 7 文件路径，agent 需自行查找。扣 1 分
- §2.3 `DataManager.load_for_month()` 设计未说明与现有 `dependencies.py` 的单例模式如何兼容——当前架构 `get_data_manager()` 返回单例，`_month_caches` 作为实例属性能正确工作，但报告"各 API 调用 `dm.load_for_month(month_context.get_month())`"中 `month_context` 为何物未定义（与 §2.1 的 `_month_ctx` 命名不一致）。扣 1 分
- §2.1 Middleware 中 `set_request_month(None)` 在 `call_next` 异常时不会被执行（无 try/finally），高并发下存在 context 泄漏风险，未提及。扣 1 分

---

#### 维度 4：可量化（满分 20）— **得分：18**

**优点**：
- §1 问题定义表完整 Before/After/ROI，5 行全量化
- §2.2 改造清单行号精确（2026-04-02 Grep 实测声明）
- 风险表含概率/影响/Before/After/缓解，格式规范
- DataManager LRU(3) 内存量化 ~180MB，归档磁盘量化 ~1.4GB

**扣分（-2）**：
- §5 MK 分配表的 token 预算（40K/60K/70K/60K/30K）来源未注明（经验值？类似任务历史？），按规范应标注来源级别③或②。扣 1 分
- 验收命令 #3 预期值 `>200000`（3 月 revenue_usd）是经验估计，未说明来源。若当月实际数据不满足此阈值则验收命令失效。扣 1 分

---

#### 维度 5：可溯源（满分 20）— **得分：15**

**优点**：
- §2.2 已完成 7 处行号精确（`report.py:L29,178,228`/`cc_performance.py:L1065-1066` 等）
- §2.2 需改造 14 处行号精确（通过独立 Grep 实测可验证：`config.py:840/940/1073`/`checkin.py:915/994/1645` 等与代码库实测一致）
- §2.9 `config.py:get_targets() L50` 引用行号

**扣分（-5）**：
- **关键不一致**：报告 §2.2"已完成"表中列 `backend/core/time_period.py:L40,151`，但**实测 `time_period.py:151` 行为注释文字**（`reference_date: 基准日期，默认 date.today()`），非实际 `date.today()` 调用；实际调用在 L40（`get_today()`）和 L151（注释），行号标注有歧义。扣 1 分
- §2.1 说"已存在且被 7 个文件导入"，实测 `get_today()` 导入点为 `report.py/cc_performance.py/incentive_engine.py/report_engine.py/time_period.py/main.py` 共 6 个文件（不含 `date_override.py` 自身），7 的计数有误。扣 1 分
- **关键不一致**：§2.1 声称 `date_override.py` 将"升级为 contextvars"，但实测文件仍为 env var 实现（无 `ContextVar`/`set_request_month`/`MonthMiddleware`）。报告以完整代码示例呈现演进方案，但未标注"待实现"，导致可溯源性失效——读者无法从代码库验证此声明。扣 2 分
- §2.3 `archive_dm = DataManager(data_dir=str(archive_dir))` 引用未给出 `DataManager.__init__` 行号。扣 1 分

---

### R1 扣分项修复验证

| R1 扣分项 | 报告声称 | 独立验证结果 |
|-----------|---------|------------|
| P0-1：date_override.py 架构冲突 | contextvars 演进方案，保留文件名和 API | **部分修复**：方案设计清晰，但代码库实测仍为 env var 实现，contextvars 未落地 |
| P0-2：行号过时 | 区分已改/需改，2026-04-02 实测行号 | **已修复**：14 处需改行号实测可验证；7 处已改行号基本正确（1 处歧义） |
| P1：ComparisonEngine 适配 | Step 1 接受 month 参数 + null 降级 | **方案补充但未落地**：comparison_engine.py 无 month 参数接口，仍为待实现设计 |
| P1：SWR 缓存策略 | URL-based key 天然隔离 + 历史月 revalidate 关闭 | **已修复**：策略清晰，useFilteredSWR 实测确认 URL key 机制，代码示例合理 |
| P1：归档原子性 | tmp→rename 设计 + 中断恢复 | **已修复**：脚本设计完整，原子 rename + .tmp 清理 + .old 回滚逻辑清晰 |

---

### 新发现扣分项

| # | 类别 | 描述 |
|---|------|------|
| N1 | 框架性 | `set_request_month(None)` 无 try/finally，异常时 context 泄漏 |
| N2 | 系统性 | `/api/archives/months` 端点在后端代码库中不存在，MK 分配未覆盖 |
| N3 | 可溯源 | contextvars 方案在代码库中零落地，报告措辞未区分"已实现"与"待实现" |
| N4 | 可溯源 | "7 个导入点"计数有误（实测 6 个） |

---

### 最终评分

| 维度 | R1 | R2（独立评审） | Δ | 说明 |
|------|-----|--------------|---|------|
| 科学理论 | 15 | 17 | +2 | PEP 567 论证到位；contextvars 未落地扣 2；月末非工作日细节扣 1 |
| 系统性 | 14 | 17 | +3 | 全量分类大幅改善；ComparisonEngine/archives API 未落地各扣分 |
| 框架性 | 16 | 17 | +1 | MK 拆解可执行；月份 context 命名不一致、Middleware 异常处理缺失 |
| 可量化 | 15 | 18 | +3 | Before/After/ROI 完整；token 预算来源级别未标注 |
| 可溯源 | 14 | 15 | +1 | 需改行号精确；已改处 contextvars 未落地导致溯源失效 |
| **总分** | **74** | **84** | **+10** | **未达标（需 ≥ 95）** |

**判定：不通过。** 总分 84/100，差 11 分。关键缺口：contextvars/Middleware 方案设计优秀但代码库零落地、措辞混淆已实现与待实现、`/api/archives/months` 端点缺失。

**定点修复建议（≤2 轮可达标）**：
1. **最高优先**：§2.1/§2.2 区分"已实现（现状）"与"M38 将实现（方案）"，所有代码示例标注`【待实现】`；"7 个导入点"改为"6 个"
2. **次优先**：§2.4 ComparisonEngine 和 §2.7 archives API 明确写入对应 MK（MK-2/MK-3）任务描述，不能只有设计无执行归属
3. **细节**：Middleware `dispatch` 加 try/finally；`month_context.get_month()` 改为与 §2.1 一致的 `_month_ctx.get()`

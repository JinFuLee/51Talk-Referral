# M38 历史月份浏览 — 技术调研报告

**任务**: M38 月份选择功能技术选型调研
**日期**: 2026-04-02
**调研员**: research-agent (Sonnet 4.6)

---

## 执行摘要

当前系统已有两个隐藏层面的历史月份支持：`DATA_MONTH` 环境变量（服务级别覆盖）和 `switch_data_month.sh` 脚本（文件系统手动切换）。M38 的目标是将这个能力**提升为请求级 UI 功能**，让运营人员无需重启服务即可在浏览器中切换月份。

核心约束：DataManager 是进程级 LRU 单例（`lru_cache(maxsize=1)` + `app.state`），30+ 处 `date.today()` 调用，`input/` 目录有 7 个 XLSX 文件需按月加载。

---

## 维度一：FastAPI 请求级上下文传递

### 现状分析

现有实现：`date_override.py` 通过读取 `os.environ["DATA_MONTH"]` 实现服务级别的日期覆盖（整个进程统一使用同一个月份）。`dependencies.py` 的 `get_data_manager()` 也是进程级单例，无法区分不同请求的月份。

```python
# 当前：服务级覆盖（所有请求共享一个月份）
def get_today() -> date:
    data_month = os.environ.get("DATA_MONTH", "")  # 进程共享，非请求隔离
    ...
```

**问题**：多用户并发时 A 切换到 202603，B 看到的也是 202603 — 全局状态污染。

### 方案比较

#### 方案 A：`Depends(parse_month)` — Query Parameter 注入（推荐）

```python
# backend/api/dependencies.py 新增
def parse_month(month: str | None = Query(None)) -> str | None:
    """解析 ?month=202603 参数，None = 当月"""
    if month and len(month) == 6 and month.isdigit():
        return month
    return None

# 每个 API 端点加入 month 依赖
@router.get("/api/overview")
def get_overview(
    filters: UnifiedFilter = Depends(parse_filters),
    month: str | None = Depends(parse_month),
    dm: DataManager = Depends(get_data_manager),
):
    data = dm.load_for_month(month)  # 新增按月加载方法
    ...
```

优点：
- 完全请求隔离，天然线程安全（FastAPI 每次注入 = 每次调用函数）
- 与现有 `parse_filters` Depends 模式完全一致，无学习成本
- 可选参数（None = 当月），向后兼容
- 已有 `UnifiedFilter` 模型可扩展，加 `month: str | None = None` 字段

缺点：
- 需要在所有 30+ 个 API 端点的 `Depends` 链里传入 `month`
- `date.today()` 的 30+ 处调用需要逐一改为接受 `reference_date` 参数

**改造代价估算**：30+ 个路由文件改 Depends（机械性），`time_period.py` 已有 `reference_date` 参数 → 实际 API 端点需改动约 40 处（`grep -r "date.today()" backend/ | wc -l` = 21 处 + 依赖函数内层调用约 9 处）

#### 方案 B：`contextvars.ContextVar` + Middleware

```python
# backend/core/request_context.py
from contextvars import ContextVar
_current_month: ContextVar[str | None] = ContextVar("current_month", default=None)

def get_current_month() -> str | None:
    return _current_month.get()

# backend/main.py — 新增 middleware
class MonthContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        month = request.query_params.get("month")
        token = _current_month.set(month if month else None)
        try:
            response = await call_next(request)
        finally:
            _current_month.reset(token)
        return response
```

优点：
- 无需修改每个端点签名，`get_current_month()` 可在任何层调用
- 可替换现有 `os.environ.get("DATA_MONTH")` 而不改调用点

缺点：
- ContextVar 在 FastAPI + async 上下文中的行为需要注意：`asyncio.create_task()` 会复制 ContextVar 状态，但若使用线程池（`run_in_executor`），线程不继承 asyncio context，会导致隐式空值
- `BaseHTTPMiddleware` 有已知 body buffering 问题（Starlette issue #1012），大文件上传场景（CC 目标 CSV 上传）需测试
- 隐式依赖（任何地方调用 `get_current_month()` 而不显式传参），代码可读性差，测试时需手动 set context

#### 方案 C：`request.state.month` — Starlette Request State

```python
class MonthStateMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request.state.month = request.query_params.get("month")
        return await call_next(request)
```

优点：
- Starlette 原生设计，无第三方依赖
- 与现有 `request.app.state.data_manager` 模式一致

缺点：
- 需要在每个端点函数签名里加 `request: Request`，或通过 Depends 包装
- 比方案 A 多一次 `request` 对象传递

### 推荐：方案 A（Depends + Query Parameter）

理由：
1. 与现有 `parse_filters` Depends 模式 100% 一致，不引入新模式
2. 请求天然隔离，无 ContextVar 的异步线程陷阱
3. API 文档（OpenAPI）自动生成 `?month=202603` 参数说明
4. 与 `UnifiedFilter` 可以合并：`month` 字段加入 `UnifiedFilter` 模型，`useFilteredSWR` 自动带参数

**落地路径**：
1. `UnifiedFilter` 加 `month: str | None = None`
2. `parse_filters` Depends 解析 `?month=202603`
3. `DataManager.load_for_month(month_key)` 新方法（下方维度二详述）
4. 所有 `date.today()` → `get_today_for_month(month_key)` 工具函数（复用现有 `date_override.py` 逻辑）

---

## 维度二：多目录数据加载（当月 vs 归档）

### 现状分析

现有机制：
- `input/` 目录存放当月 XLSX（7 个活跃文件 + `.backup_YYYYMMDD_` 滚动备份）
- `switch_data_month.sh` 通过 mv 文件实现月份切换（阻塞式，需重启后端）
- 已有 `.backup_20260402_*` 格式备份（手动归档，非结构化）
- DataManager `lru_cache(maxsize=1)` — 进程内只有一个 DataManager 实例

已发现的备份规律：`input/.backup_{YYYYMMDD}_{filename}` 命名，日期精确到天，有 3 月 27 日 ~ 4 月 2 日共 7 个快照批次。

### 方案比较

#### 方案 A：分月目录 + 多 DataManager 实例池（推荐）

```
input/
  current/           ← 当月文件（launchd 每天从 input/ 同步）
  archive/
    202603/          ← 2026 年 3 月月末最终数据（月末归档）
      转介绍中台检测_结果数据.xlsx
      ...
    202602/
    ...
```

```python
# backend/core/data_manager.py
_dm_pool: dict[str, DataManager] = {}
_pool_lock = threading.Lock()

def get_dm_for_month(month_key: str | None) -> DataManager:
    key = month_key or "current"
    with _pool_lock:
        if key not in _dm_pool:
            if key == "current":
                data_dir = settings.DATA_SOURCE_DIR  # input/current/
            else:
                archive_dir = Path(settings.ARCHIVE_DIR) / key
                if not archive_dir.exists():
                    raise HTTPException(404, f"月份 {key} 无归档数据")
                data_dir = str(archive_dir)
            _dm_pool[key] = DataManager(data_dir=data_dir)
        return _dm_pool[key]
```

优点：
- 月份间完全隔离，互不污染
- DataManager 缓存策略与现有完全一致（每个月份独立 LRU 缓存）
- 可按需懒加载（首次请求某月才初始化该月 DataManager）
- 历史月份加载后缓存，后续请求直接命中

缺点：
- 内存消耗：每个月份 DataManager 缓存完整 DataFrame（约 50-200MB/月）；可加 LRU 策略限制最多缓存 N 月（如 3 个月）
- 归档目录的 XLSX 文件需要月末专门归档（见维度五）

**内存估算**：单月 8 个 XLSX，约 50-150MB DataFrame + Parquet 缓存 ~ 100-200MB；缓存 3 个月 = ~600MB，在可接受范围（macOS M4，16GB RAM）

#### 方案 B：SQLite 快照完全替代 XLSX（中期方案）

```python
# 历史月份查询完全走 SnapshotStore
def get_historical_data(month_key: str) -> dict:
    store = SnapshotStore()
    return store.get_monthly_summary(month_key)  # 新增聚合查询
```

优点：
- 单一数据库文件，无多目录管理
- 查询性能好（SQL 索引）
- 已有 `daily_snapshots` 表含 `month_key` 字段，扩展即可

缺点：
- 当前 SQLite 只存聚合指标（注册数/付费数等），缺少明细维度（学员级别、围场分布、CC 个人）
- 历史月份的 D2/D3/D4 明细数据无法从 SQLite 恢复
- 不适合替代完整的 DataManager，只能作为**摘要层**

#### 方案 C：维持现有 `switch_data_month.sh` + 服务重启（现状，不推荐）

缺点：
- 需 shell 操作 + 后端重启（10-30 秒中断）
- 两用户同时操作会互相覆盖
- 只支持手动预设的月份（当前只有 3/30 备份）

### 推荐：方案 A（分月目录 + DataManager 实例池）

关键细节：
- 当月数据：`input/` 继续作为活跃目录（保持现有 launchd 取数流程不变）
- 历史归档：月末触发 `archive_month.sh` 将 `input/*.xlsx` 复制到 `input/archive/YYYYMM/`
- 实例池上限：LRU 3 个月（`maxsize=3`），防止内存膨胀
- 降级策略：归档不存在时，返回 `{"available": false, "reason": "archive_missing"}`，前端显示"该月数据不可用"

---

## 维度三：月度目标存储

### 现状分析

当前格式：`config/cc_targets_202603.json`（单月单文件，含 `month` 字段 + 各 CC 个人目标 USD）

发现规律：
- 每月文件独立：`cc_targets_{YYYYMM}.json`
- 月度团队总目标在 `config/targets_override.json`（多月份嵌套）
- CC 个人目标仅有 202603 一个文件（202604 尚未创建）

```json
// config/cc_targets_202603.json
{
  "month": "202603",
  "updated_at": "2026-03-27T19:36:40Z",
  "targets": {
    "thcc-Zen": { "referral_usd_target": 3000.0 }
  }
}
```

### 方案比较

#### 方案 A：维持 per-month JSON 文件（推荐，现状延伸）

```
config/
  cc_targets_202603.json
  cc_targets_202604.json
  cc_targets_202605.json
```

后端加载逻辑：
```python
def load_cc_targets(month_key: str) -> dict:
    path = CONFIG_DIR / f"cc_targets_{month_key}.json"
    if not path.exists():
        return {}  # 空态降级
    return json.loads(path.read_text())
```

优点：
- 现有模式，零改造成本
- 每月独立文件，互不影响（修改 3 月不会影响 4 月）
- 文件级版本可控（可 git diff 追踪目标变更历史）
- 上传/下载 API 自然映射到文件操作（现有 `/api/cc-performance/targets/upload?month=202603`）

缺点：
- 文件数量随月份线性增长（12 个/年，可忽略）
- 跨月份查询（如"Q1 各月目标汇总"）需读多个文件合并

#### 方案 B：单文件多月份嵌套 JSON

```json
// config/cc_targets_all.json
{
  "202603": { "targets": {...} },
  "202604": { "targets": {...} }
}
```

优点：
- 单文件，全局视图清晰
- 跨月份查询只读一个文件

缺点：
- 并发写入风险（月末归档 + 用户上传同时写同一文件）
- 文件体积随月份增长，读写慢（整文件 load+dump）
- 不符合现有 `targets_override.json` 的已有实践（`targets_override.json` 已是多月嵌套，出现了维护复杂性）

#### 方案 C：SQLite targets 表

```sql
CREATE TABLE cc_targets (
    month_key TEXT NOT NULL,
    cc_name TEXT NOT NULL,
    referral_usd_target REAL,
    updated_at TIMESTAMP,
    PRIMARY KEY (month_key, cc_name)
);
```

优点：
- 查询性能最佳（SQL GROUP BY/JOIN）
- 原子更新（事务保证）

缺点：
- 与现有 CSV 上传流程不匹配（需改上传逻辑）
- 失去文件级 git 追踪能力
- 在当前规模（<30 CC，12 个月 = 360 行）完全不必要

### 推荐：方案 A（per-month JSON 文件，维持现状）

补充改造：读取 `config/cc_targets_{month_key}.json`，找不到时 fallback 到 `config/cc_targets_current.json`（软链接 → 当月文件），确保历史月份有独立文件而当月文件无需手动指定路径。

---

## 维度四：前端月份选择器 UX

### 现状分析

前端当前无月份切换器。Topbar 有语言切换，Zustand `configStore` 管理全局 filter 状态。

从 BI 工具调研（Metabase/Superset）和内部系统特征：

### UX 模式分析

**模式 1：下拉选择器（Dropdown Select）— Metabase 风格**
```
[本月 (2026-04) ▼]
 ├── 本月 (2026-04)  ← 默认
 ├── 上月 (2026-03)  ← 有数据
 ├── 2026-02        ← 有数据
 └── 2026-01        ← 无数据（灰显）
```
- Metabase 在 Dashboard 顶部用 "Quarter and Year" / "Month and Year" filter 组件
- 历史月份无数据时灰显（不可选），有数据时正常选择

**模式 2：箭头翻页（Prev/Next Navigation）— 适合顺序浏览**
```
[← 上月]  2026-04（本月）  [→ 下月（禁用）]
```
- 适合单步翻月，但不利于快速跳转到 3 个月前

**模式 3：月历 Popover — Power BI / Quick BI 风格**
- 展开日历，只能选月粒度
- 实现成本高，但适合年度回顾

**模式 4：快捷标签（Tab）+ 自定义 — Superset 风格**
```
[本月] [上月] [Q1] [自定义...]
```
- Superset 的 "Last Month" / "Previous Year" 快捷筛选
- 对运营人员最友好（无需知道精确月份字符串）

### 推荐方案：模式 1（下拉）+ 历史月份状态标记

```tsx
// frontend/components/MonthSelector.tsx
const MonthSelector = () => {
  const { month, setMonth } = useConfigStore()
  const { data: availableMonths } = useSWR('/api/months/available')
  
  return (
    <Select value={month ?? 'current'} onValueChange={setMonth}>
      <SelectItem value="current">
        {t('currentMonth')} ({format(new Date(), 'yyyy-MM')})
      </SelectItem>
      {availableMonths?.map(m => (
        <SelectItem key={m.key} value={m.key} disabled={!m.has_archive}>
          {m.label}
          {m.key === latestArchiveMonth && (
            <Badge variant="outline" className="ml-2 text-xs">已归档</Badge>
          )}
        </SelectItem>
      ))}
    </Select>
  )
}
```

**视觉提示规则**：
- 当前月：蓝色（active state），标注"当月（进行中）"
- 已归档历史月：默认色，标注"已归档"
- 数据不完整月（月中快照）：黄色点 `⚠`
- 无归档月：灰显不可选

**Topbar 集成**：月份选择器放在 Topbar 右侧，语言切换左侧，图标用 `CalendarDays`（lucide-react）。切换月份时全局 `useFilteredSWR` 自动重新 fetch（month 写入 Zustand configStore + URL query param）。

**后端支持 API**（新增）：
```
GET /api/months/available
→ [
    { "key": "current", "label": "本月 (2026-04)", "has_archive": true, "is_current": true },
    { "key": "202603",  "label": "2026-03",        "has_archive": true,  "is_complete": true },
    { "key": "202602",  "label": "2026-02",        "has_archive": false, "is_complete": true }
  ]
```

---

## 维度五：月末自动归档策略

### 现状分析

现有机制：
- `quickbi_cron.sh`（launchd `com.refops.quickbi-fetch`）每天 10:00 取数，取数后自动写 T-1 日快照
- `input/` 目录已有 `.backup_{YYYYMMDD}_*` 日备份（`scripts/clean_old_datasources.sh` 管理滚动）
- 但没有月末**结构化归档**到 `input/archive/YYYYMM/` 的机制

**归档窗口问题**：Quick BI 数据有 T-1 延迟，月末最后一天（如 3/31）的数据要到 4/1 才能取到。所以"月末归档"正确时机是**次月 1 日 10:00 取数成功后**，而非 3/31 23:59。

### 方案比较

#### 方案 A：次月 1 日取数成功后触发归档（推荐）

修改 `quickbi_cron.sh`：
```bash
# 取数成功后判断是否需要归档上月
LAST_MONTH=$(date -v-1m +%Y%m 2>/dev/null || date -d 'last month' +%Y%m)
ARCHIVE_DIR="$PROJECT_DIR/input/archive/$LAST_MONTH"

# 次月 1 日且上月归档不存在时触发归档
if [[ "$(date +%d)" == "01" ]] && [[ ! -d "$ARCHIVE_DIR" ]]; then
    mkdir -p "$ARCHIVE_DIR"
    for f in "$INPUT_DIR"/*.xlsx; do
        cp "$f" "$ARCHIVE_DIR/"
    done
    echo "[$(date)] ✓ 归档上月数据 → $ARCHIVE_DIR" >> "$LOG_FILE"
    
    # 写入月度 archive 到 SQLite
    uv run python -m scripts.archive_monthly --month "$LAST_MONTH" >> "$LOG_FILE" 2>&1
fi
```

优点：
- 完全复用现有 launchd 调度（无新 plist）
- 归档时机准确（T-1 数据完整后）
- 幂等（归档目录存在则跳过）

缺点：
- 依赖 `quickbi_cron.sh` 正常运行（若 4/1 取数失败，上月归档延迟到 4/2）

**4/1 取数失败降级**：`quickbi_catchup.sh` 在 11:00 补跑，如补跑成功则同样触发归档逻辑（加入相同判断）。

#### 方案 B：独立 month-end 归档 launchd 任务

```xml
<!-- com.refops.month-end-archive.plist -->
<key>StartCalendarInterval</key>
<array>
  <dict>
    <key>Day</key><integer>1</integer>
    <key>Hour</key><integer>12</integer>  <!-- 12:00，晚于取数完成时间 -->
    <key>Minute</key><integer>0</integer>
  </dict>
</array>
```

优点：
- 职责分离，取数和归档解耦

缺点：
- 新增 plist 维护成本
- 与取数脚本的时序耦合（需确保 12:00 时取数已完成）
- 若取数失败/延迟，12:00 归档到的是不完整数据

#### 方案 C：手动触发 API + 自动提醒

```
POST /api/admin/archive-month?month=202603
```

运营人员在确认数据完整后手动点击归档。钉钉告警在次月 1 日 14:00 发送"请确认归档"提醒。

优点：
- 完全由人工确认，避免 T-1 延迟导致的错误归档
- 灵活

缺点：
- 依赖人工操作，容易遗漏
- Felix 离职后无人维护

### 推荐：方案 A（取数成功后内嵌归档逻辑）

关键补充：
1. `quickbi_cron.sh` 和 `quickbi_catchup.sh` 都加入月末归档判断
2. 归档目录结构：`input/archive/{YYYYMM}/*.xlsx`
3. 归档成功后写 `monthly_archives` 表（调用现有 `SnapshotStore.upsert_monthly_archive()`）
4. 钉钉告警追加归档结果（"✓ 3 月数据已归档"）

---

## 维度六：现有系统约束盘点

### 约束 1：DataManager 单例 + LRU cache

```python
@lru_cache(maxsize=1)
def _create_data_manager() -> DataManager:  # dependencies.py
```

**影响**：切换月份必须绕过这个单例，不能改 `_create_data_manager`。
**解法**：维护 `_dm_pool: dict[str, DataManager] = {}` 在 `app.state`（非 lru_cache），key = month_key。

### 约束 2：30+ 处 `date.today()` 调用

分布：
- `backend/core/target_recommender.py`：3 处（WMA 预测、目标推荐、时间进度）
- `backend/api/checkin.py`：3 处（打卡率计算、CC 跟进天数）
- `backend/core/leverage_engine.py`：2 处（杠杆率计算）
- `backend/api/config.py`：3 处（目标推荐日期）
- `backend/core/date_override.py`：1 处（get_today 实现本身）
- 其余分散在 10 个文件

**现有 `date_override.py` 已解决 DATA_MONTH 环境变量层面的覆盖**。M38 的改造重点是将 `get_today()` 的调用链改为接受 `month_key: str | None` 参数，而非读取全局状态：

```python
# 改造前（全局环境变量）
def get_today() -> date:
    data_month = os.environ.get("DATA_MONTH", "")
    ...

# 改造后（请求参数传递）
def get_today_for_month(month_key: str | None = None) -> date:
    if month_key:
        year, month = int(month_key[:4]), int(month_key[4:6])
        if month == 12:
            return date(year + 1, 1, 1) - timedelta(days=1)
        return date(year, month + 1, 1) - timedelta(days=1)
    return date.today()
```

保留 `get_today()` 原函数用于 launchd cron 脚本（非请求上下文），避免脚本改造。

### 约束 3：`.backup_{YYYYMMDD}_*` 命名规范

现有备份：`input/.backup_20260402_转介绍中台检测_结果数据.xlsx`

与方案 A 归档目录不冲突：备份是日粒度隐藏文件（`.backup_*`），归档是月粒度目录（`archive/YYYYMM/`）。两套机制并行，日备份继续由 `clean_old_datasources.sh` 管理，月归档由新增脚本管理。

### 约束 4：D4（已付费学员围场明细）文件的特殊性

`switch_data_month.sh` 中明确注释："D2 围场明细当前已是 3/31 数据，不需要切换"——因为 D4 文件的取数口径与其他文件不同（包含历史所有学员的围场分布，而非月度快照）。

**M38 归档时需特殊处理**：D4 文件按月归档时应记录"归档时文件日期"而非将其视为纯月度数据，查询时可能需要最新的 D4 文件（历史学员数据是累积的）。

---

## 综合方案设计（M38 推荐实现路径）

### 架构图

```
前端月份选择器
    ↓ ?month=202603
UnifiedFilter (month 字段新增)
    ↓ parse_filters Depends
get_dm_for_month(month_key)
    ↓
_dm_pool (app.state, dict[str, DataManager])
    ├── "current" → DataManager(input/)        ← 热数据
    ├── "202603"  → DataManager(archive/202603/) ← 冷数据（懒加载）
    └── "202602"  → DataManager(archive/202602/) ← 冷数据
         ↓ LRU 3 个月，超出驱逐最旧实例
API 响应
```

### 实现优先级（按依赖链）

1. **P0 基础设施**（无前置依赖，可立即开始）
   - `archive_month.sh`：月末归档脚本
   - `input/archive/202603/`：手动创建 3 月归档目录（验证可行性）
   - `GET /api/months/available`：返回可用月份列表

2. **P1 后端改造**（依赖 P0 归档结构）
   - `UnifiedFilter.month` 字段 + `parse_filters` 解析
   - `get_dm_for_month(month_key)` + `_dm_pool` 实例池
   - `get_today_for_month(month_key)` 工具函数（替换关键路径的 `date.today()`）

3. **P2 前端 UI**（依赖 P1 API）
   - `MonthSelector` 组件（下拉 + 历史月份状态标记）
   - Zustand `configStore` 加 `month` 字段
   - `useFilteredSWR` 自动携带 `?month=` 参数

4. **P3 自动归档**（依赖 P0 目录结构）
   - `quickbi_cron.sh` 内嵌月末归档逻辑（次月 1 日）
   - 钉钉告警追加归档结果

### 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 历史月份加载慢（首次 XLSX 解析） | 用户等待 3-8 秒 | Parquet 缓存预热；首次加载时前端 loading 骨架 |
| DataManager 实例池内存膨胀 | OOM | LRU maxsize=3，超出驱逐最旧 |
| D4 文件归档口径混乱 | 历史围场数据失真 | 记录 D4 文件日期元数据；查询文档注明 |
| 30+ date.today() 改造不完全 | 部分指标仍用当天日期 | 优先改高频 API（overview/funnel/enclosure），次要路径逐步跟进 |
| 月末归档失败（Quick BI 取数失败） | 上月无归档 | 手动触发 API 作为保底；钉钉告警 |

---

## 附录：WebSearch 来源

- [FastAPI: request.state vs Context Variables](https://dev.to/akarshan/fastapi-requeststate-vs-context-variables-when-to-use-what-2c07) — request.state vs ContextVar 对比
- [Usage of ContextVar in FastAPI · Discussion #8628](https://github.com/fastapi/fastapi/discussions/8628) — 官方社区讨论
- [fastapi-request-context · PyPI](https://pypi.org/project/fastapi-request-context/) — 第三方请求上下文库
- [FastAPI Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/) — 官方 Depends 文档
- [Metabase: best practices for time series](https://www.metabase.com/learn/metabase-basics/querying-and-dashboards/time-series/compare-times) — BI 时间期比较 UX
- [Metabase: Filter dashboards by year · Issue #26943](https://github.com/metabase/metabase/issues/26943) — 年/月 filter UX 讨论
- [SQLite User Forum: Flat files vs SQLite](https://sqlite.org/forum/forumpost/3d7be1ad3d?t=c) — SQLite vs JSON 权衡
- [Litestream: Cron-based backup](https://litestream.io/alternatives/cron/) — SQLite cron 备份策略

# M38 历史月份浏览 — 独立评分报告 R1

**评分员**：独立 scorer（context 隔离，未参与方案制定）
**评分日期**：2026-04-02
**被评文件**：`docs/mk-outputs/ri-m38-historical-month-2026-04-02.md`
**达标线**：总分 ≥ 95 且全维度 ≥ 16

---

## 评分卡

| 维度 | 得分 | 满分 |
|------|------|------|
| 科学理论 | 15 | 20 |
| 系统性 | 14 | 20 |
| 框架性 | 16 | 20 |
| 可量化 | 15 | 20 |
| 可溯源 | 14 | 20 |
| **总分** | **74** | **100** |

**判定：未达标（74 < 95，且科学理论/系统性/可溯源均 < 16）**

---

## 逐维度评分详情

### 维度 1 — 科学理论：15/20

**加分项：**
- contextvars (PEP 567, Python 3.7+) 是标准库，线程/协程安全性有文献背书
- Starlette BaseHTTPMiddleware 是框架正式 API，有版本记录
- 三路径冗余归档触发机制符合可靠性工程基本原则

**扣分 -5 分：**

1. **严重遗漏：未发现 `date_override.py` 已存在**（-3分）
   
   代码库实际状态：`backend/core/date_override.py` 已完整实现 `get_today()` 函数，已被 `report.py`、`report_engine.py`、`incentive_engine.py`、`time_period.py`、`cc_performance.py` 等多个文件导入使用。方案提出"新建 `month_context.py`"且采用完全不同的 `contextvars` 机制，与已有的 `date_override.py` env-var 方案形成架构冲突，未做任何说明。

   已有代码片段（`backend/core/date_override.py:16-34`）：
   ```python
   def get_today() -> date:
       data_month = os.environ.get("DATA_MONTH", "")
       if data_month and len(data_month) == 6:
           # ...返回该月最后一天
       return date.today()
   ```
   
   方案未回答：为什么不扩展已有的 `date_override.py`？`contextvars` 与现有 `DATA_MONTH` env var 如何共存？前者是进程级，后者是请求级——迁移策略是什么？

2. **contextvars 在 uvicorn 多 worker 下的安全性分析缺位**（-2分）
   
   方案声称"contextvars 请求隔离 ✓"但未证明。uvicorn `--workers N` 模式下，每个 worker 是独立进程，`ContextVar` 天然隔离（无问题）。但若使用 `--reload` 或单 worker + asyncio 并发，同一 event loop 下多个协程共享 context 时的并发安全性未论证。缺少版本依赖声明（如 starlette >= X.Y）。

---

### 维度 2 — 系统性：14/20

**加分项：**
- 覆盖归档层、后端时间参数、DataManager 月份加载、月度目标、前端选择器、API 端点、Quick BI 7 个子系统
- 极端缩放检验 5 维度完整

**扣分 -6 分：**

1. **ComparisonEngine（SQLite 日快照）月份查询未覆盖**（-2分）
   
   `backend/core/comparison_engine.py` 从 SQLite `daily_snapshots` 表按日期查询数据，直接依赖日期范围。历史月份浏览时，如果 SQLite 里存有历史快照，`ComparisonEngine` 的环比计算会自动工作；如果没有，方案完全没有处理这个路径。`report.py` 中 `get_report_comparison` 端点未出现在改造清单中，历史月份的日/周/月环比数据从何而来未说明。

2. **前端月份切换后 SWR 缓存失效策略缺失**（-2分）
   
   方案描述了 `useFilteredSWR` 在 key 构建时附加 `month` 参数，但未明确：
   - `selectedMonth` 变化时，已缓存的当月数据是否自动失效？
   - 历史月份的 SWR 缓存过期策略（历史数据不变，理论上可以 `revalidateOnFocus: false`）
   - 切换月份后的 loading 状态如何在全站各组件同步展示（全页面 fallback 还是逐组件 skeleton？）

3. **归档脚本原子性处理缺位**（-2分）
   
   `archive_month.sh` 方案仅描述"月末从 input/ 复制"，未说明：
   - 归档中断（磁盘满/进程被 kill）时的数据完整性保障
   - 是否先写临时目录再 atomic rename（`data/archives/202603.tmp/` → `202603/`）
   - `_meta.json` 写入时机——复制 8 个文件后才写，还是每个文件写一次？中断后 `_meta.json` 不存在 vs `completeness` 部分为 false 的处理逻辑

4. **`date.today()` 改造范围存在错报**（-0分，已说明但需关注）
   
   方案表 §2.2 列出 `backend/api/report.py:28,178,228` 需改造，但实际代码已使用 `get_today()`（`from backend.core.date_override import get_today`），L28-L29 是 `ref_date = ref or (get_today() - timedelta(days=1))`。该文件实际上已完成改造。方案未反映代码库真实状态，说明前期 Grep 扫描不完整或基于旧版本代码。

---

### 维度 3 — 框架性：16/20

**加分项：**
- 5 MK 拆解结构清晰，依赖图明确（串行链 archive→backend-core→backend-api→frontend→qa）
- 代码片段具体可执行（middleware 写法、DataManager 扩展、config-store 类型定义）
- 验收命令 6 条，有具体期望值

**扣分 -4 分：**

1. **MK-3 任务量（12 文件 × 19 处改造）超单 MK 推荐上限**（-2分）
   
   CLAUDE.md 铁律：单 MK ≤10 文件。MK-3 声明 12 文件 + backend-api tag 的 80K token，且 19 处 `date.today()` 散布在 `checkin.py`（3处）、`leverage_engine.py`（2处）、`config.py`（3处）、`data_manager.py`（1处）等跨多个模块的文件。需拆分为 MK-3a（核心 report/cc_performance/incentive_engine）和 MK-3b（外围 checkin/leverage/config）。

2. **DataManager 月份缓存 LRU maxsize=3 未纳入 MK-2 验收**（-1分）
   
   方案提到"LRU 可选"，但验收命令中无对应测试（并发 10 用户访问 4+ 个不同月份的内存上限行为）。

3. **uvicorn 多 worker 时 env var 模式的运行指令缺失**（-1分）
   
   如果选择沿用 `DATA_MONTH` env var（单进程场景下更简单），部署命令是 `DATA_MONTH=202603 uvicorn ...`，与方案提出的 middleware 模式在部署层完全不同。方案未说明如何调整 `一键启动.command`。

---

### 维度 4 — 可量化：15/20

**加分项：**
- Before/After 表完整（月份切换 / 月度目标 / 时间进度 / 数据归档）
- 19 处改造清单有文件路径+行号
- Token 预算（270K total）+ 文件数（29 个）明确
- ROI 量化：310K tokens 部署成本，2-3 天开发

**扣分 -5 分：**

1. **date.today() 改造行号与实际代码不符，无法直接验证**（-3分）
   
   `backend/api/report.py:28,178,228` 行号已过时（该文件实际已使用 `get_today()`）。`backend/api/cc_performance.py:1065` 实际代码无 `date.today()` —— Grep 扫描结果显示该文件已使用 `get_today()`（`L1066: today = get_today()`）。改造清单中至少 2 处行号/文件与代码库实际状态不符，降低了可量化指标的可信度。

2. **历史月份数据加载性能基准缺失**（-1分）
   
   `D2 95K 行 × 59 列` 加载耗时未估算（当前 `load_all()` 耗时多少？历史月份估计多少？LRU 命中后多少？）。这对用户体验预期（是否需要 loading skeleton）有决策意义。

3. **归档磁盘占用 ~500MB 估算来源缺失**（-1分）
   
   "24 月 × 8 文件 = ~500MB"未说明单月 Excel 大小基准（实测值还是估算？），且现有 `.backup_*` 文件大小可用于校验。

---

### 维度 5 — 可溯源：14/20

**加分项：**
- 后端文件路径+行号引用具体（`time_period.py:38,149`、`cc_performance.py:1065` 等）
- `_meta.json` 格式完整，数据源 key（D1/D4_CC 等）有业务语义

**扣分 -6 分：**

1. **已有 `date_override.py` 未被引用**（-3分）
   
   方案提出新建 `backend/core/month_context.py`，但未引用已有的 `backend/core/date_override.py`。独立评审员无法确定方案是"替换"还是"并存"，关键架构决策缺乏可溯源的说明。

2. **ComparisonEngine 路径未引用**（-1分）
   
   `backend/core/comparison_engine.py` 是历史月份功能的核心消费者（环比数据全来自 SQLite 快照），方案完全未出现该文件路径。

3. **前端 config-store 扩展未引用现有文件**（-1分）
   
   `frontend/lib/stores/config-store.ts` 已存在，方案 §2.5 给出 TypeScript 接口扩展代码但未注明该文件的当前行数/已有字段，无法验证扩展是否会冲突。

4. **archive_month.sh 归档脚本无伪代码或流程说明**（-1分）
   
   只有触发机制（三路径），无脚本逻辑骨架（原子写入、校验、rollback），MK-1 执行者需要重新设计，方案框架性与可溯源性在此断裂。

---

## 主要问题汇总

| 优先级 | 问题 | 影响维度 |
|--------|------|---------|
| P0 | `date_override.py` 已存在且被多文件使用，方案的 `contextvars` 与其冲突，架构决策未说明 | 科学理论、系统性、可溯源 |
| P0 | `report.py`、`cc_performance.py` 等文件行号已过时，改造清单部分失效 | 可量化、可溯源 |
| P1 | `ComparisonEngine`（SQLite 日快照 → 环比数据）历史月份路径完全未覆盖 | 系统性 |
| P1 | 前端 SWR 缓存失效策略（月份切换后的缓存策略）未说明 | 系统性 |
| P1 | 归档脚本原子性设计缺失（中断处理） | 系统性、框架性 |
| P2 | MK-3 超出单 MK 文件上限（12 > 10），需拆分 | 框架性 |
| P2 | uvicorn 多 worker 下的 contextvars 安全性论证缺位 | 科学理论 |
| P2 | 部署层 `一键启动.command` 的 `month` 参数传递机制未说明 | 框架性 |

---

## 达标所需的改进方向（≤3条，按优先级）

**改进 1（P0）— 架构决策澄清**

Before: 方案新建 `month_context.py`（contextvars）与已有 `date_override.py`（env var）并存，架构冲突未说明
After: 明确选择路线：(A) 扩展 `date_override.py`（添加 `set_month(month: str | None)` + middleware 写入 env var per-request）或 (B) 新建 `month_context.py` 并废弃 `date_override.py`，说明迁移步骤
ROI: 消除 MK-2/MK-3 实现时的架构歧义，减少 ~20% 返工风险

**改进 2（P0）— 改造清单与代码库同步**

Before: 改造清单中 `report.py:28,178,228`、`cc_performance.py:1065` 行号已过时（实际代码已用 `get_today()`），扫描数据基于旧版本
After: 重新 Grep `date\.today\(\)` 全量扫描，输出 `文件:行号` 精确列表（当前扫描结果显示仅 `checkin.py:915,994,1645`、`leverage_engine.py:309,362`、`config.py:840,940,1073` 等约 15 处仍是裸 `date.today()`）
ROI: 消除 MK-3 执行时的错误修改（改已改的文件 = 浪费 token + 可能引入 bug）

**改进 3（P1）— 补全 ComparisonEngine + SWR + 归档原子性**

Before: 三个模块缺失：(a) ComparisonEngine 历史环比路径，(b) 前端 SWR 月份切换缓存策略，(c) archive_month.sh 原子写入设计
After: 各补一段说明：(a) 确认 SQLite 快照历史数据已存在则 ComparisonEngine 自动工作；否则描述空态处理 (b) `useFilteredSWR` key 变化自动触发 revalidation，历史月份设 `dedupingInterval: Infinity` (c) tmp→atomic rename 模式
ROI: 消除 MK-2/MK-4 执行时的功能盲区，历史月份环比数据不变成空白页

---

## 评分卡（结构化）

```json
{
  "report_id": "ri-m38-historical-month-2026-04-02",
  "scorer_round": 1,
  "scores": {
    "科学理论": 15,
    "系统性": 14,
    "框架性": 16,
    "可量化": 15,
    "可溯源": 14
  },
  "total": 74,
  "threshold": 95,
  "passed": false,
  "critical_gaps": [
    "date_override.py架构冲突",
    "改造清单行号过时",
    "ComparisonEngine历史路径缺失",
    "SWR缓存策略缺失",
    "归档原子性缺失"
  ],
  "recommend_continue": true,
  "delta_needed": 21,
  "estimated_rounds_to_pass": 1
}
```

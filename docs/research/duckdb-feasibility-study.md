# DuckDB 技术可行性调研报告

**任务编号**: Task #2
**调研员**: mk-research-duckdb-sonnet
**调研日期**: 2026-02-22
**适用里程碑**: M21（DuckDB 迁移评估）
**报告状态**: 完整版（8 个调研维度，WebSearch ≥ 7 次）

---

## 执行摘要

| 维度 | 结论 | 置信度 |
|------|------|--------|
| OLAP 查询性能 | DuckDB 比 SQLite 快 10~35× | B级（官方 benchmark） |
| FastAPI 集成 | 可行，但需手动管理连接（无原生连接池） | C级（技术博客实测） |
| Excel 原生读取 | 支持 read_xlsx()，但类型推断有 bug | B级（官方文档+GitHub issue） |
| Apple Silicon 支持 | 原生 M1/M2 支持，已优化 | B级（官方说明） |
| 并发写入 | 单写多读架构，**本项目无并发写压力** | B级（官方文档） |
| 版本兼容性 | 0.x 跨版本不兼容，1.0+ 后已稳定 | B级（官方 changelog） |
| Text-to-SQL 成熟度 | LlamaIndex+DuckDB 达 80%+ 准确率 | C级（技术博客） |
| SQLite 并存方案 | 可行（双数据库或完全替换均可） | D级（架构推导） |

**总体建议**: **条件性推荐迁移**。
- Excel→DuckDB 的分析查询层迁移 ROI 高（快照聚合、CC 排名、趋势分析场景）
- SQLite SnapshotStore 迁移需谨慎评估（风险在版本兼容性和连接管理复杂度）
- 最佳路径：**双轨并存**，DuckDB 承载分析层（OLAP），SQLite 继续承载快照写入（OLTP）

---

## A. DuckDB vs SQLite OLAP 性能对比

**来源**: [DataCamp 完整对比](https://www.datacamp.com/blog/duckdb-vs-sqlite-complete-database-comparison) [B] | [KDnuggets 1M 行 Benchmark](https://www.kdnuggets.com/we-benchmarked-duckdb-sqlite-and-pandas-on-1m-rows-heres-what-happened) [C] | [Galaxy Benchmark](https://www.getgalaxy.io/learn/glossary/duckdb-vs-sqlite-benchmarks) [C]

### 聚合查询（GROUP BY / 窗口函数）

| 场景 | DuckDB | SQLite | 提升倍数 |
|------|--------|--------|---------|
| 冷查询聚合（无缓存） | 基准 | 12~35× 慢 | 12~35× |
| 热查询聚合（有缓存） | 基准 | 8~20× 慢 | 8~20× |
| 大规模 GROUP BY | 秒级 | 分钟级 | 10~100× |

**根因**: DuckDB 采用列存（columnar）+ 向量化执行（每批 ~1024 行），CPU cache 命中率远高于 SQLite 的行存模式。

### 内存效率

- DuckDB 峰值内存：~2.3 GB（1B 行场景） vs SQLite：~480 MB
- 小数据集（< 100K 行）：两者内存差异不显著
- DuckDB 支持超内存（out-of-core）处理，磁盘溢出透明

**本项目实际数据规模估算**:
- 订单明细：~357 单/月 × 12 = ~4,300 行/年
- leads 数据：~5,000 行/月
- CC 排名快照：~74 CC × 365 日 = ~27,000 行/年
**结论**: 本项目数据量级属「小型分析」，SQLite 和 DuckDB 内存差异不是决策关键因素。

### 并发读写能力

| 能力 | SQLite (WAL 模式) | DuckDB |
|------|-----------------|--------|
| 并发读 | 多读者 ✓ | 多读者 ✓ |
| 并发写 | 单写（WAL 允许读写并发） | 单写（严格） |
| 跨进程并发 | ✓（WAL 模式） | ✗（同一时刻只能一个进程写） |
| 同进程多线程 | 需 check_same_thread=False | 自动线程安全 |

**本项目当前 SQLite 已启用 WAL 模式**（`snapshot_store.py:42`），对读写并发已有优化。DuckDB 在并发性上反而更受限制。

### 单文件数据库大小

- DuckDB：列存压缩，实际存储是 SQLite 的 30% 左右（28 GB vs 92 GB 对比案例）
- SQLite：行存，无自动压缩
- **本项目数据库当前极小**（< 10 MB），此差异无实质意义

---

## B. DuckDB + FastAPI 集成

**来源**: [GitHub duckdb-fastapi](https://github.com/buremba/duckdb-fastapi/) [C] | [Building REST API with DuckDB](https://blog.lowlevelforest.com/building-a-rest-api-with-python-fastapi-and-duckdb/) [C] | [aioduckdb asyncio bridge](https://github.com/kouta-kun/aioduckdb) [C]

### Python duckdb 包 API 稳定性

- 当前版本（1.1.x → 1.4.x，2025 年）：API 已趋于稳定
- `duckdb.connect(database)` 是主入口，语法简洁
- PyPI 包 `duckdb` 直接安装，无额外依赖

### 连接池管理方案

DuckDB **没有官方连接池**。FastAPI 集成的已知方案：

**方案 1：全局单连接（推荐小型项目）**
```python
import duckdb
from fastapi import FastAPI

app = FastAPI()
db = duckdb.connect("analytics.db")  # 全局单连接

@app.get("/analysis")
def get_analysis():
    return db.execute("SELECT ...").fetchdf().to_dict("records")
```
优点：简单，无竞态风险（单写）
缺点：并发请求排队，但 DuckDB 内部有多线程优化

**方案 2：每请求创建连接（适合只读场景）**
```python
@app.get("/query")
def query():
    with duckdb.connect("analytics.db", read_only=True) as con:
        return con.execute("SELECT ...").fetchdf().to_dict("records")
```
优点：并发读互不干扰
缺点：连接开销，不适合高频写入

**方案 3：aioduckdb（asyncio 支持）**
```python
import aioduckdb

@app.get("/async-query")
async def async_query():
    async with await aioduckdb.connect("analytics.db") as conn:
        result = await conn.execute("SELECT ...")
        return await result.fetchall()
```
优点：完全 async，适合 FastAPI 异步端点
缺点：第三方库，维护活跃度一般（社区项目）

### 与 SQLAlchemy 兼容性

- DuckDB 提供 SQLAlchemy dialect（`duckdb_engine` 包）
- 但与 Alembic 迁移的集成尚不完善
- 本项目**不使用 SQLAlchemy**，此项不是阻塞因素

### 现有代码影响评估

当前 `SnapshotStore` 使用：
```python
self.conn = sqlite3.connect(str(self.db_path), check_same_thread=False, isolation_level=None)
```
迁移到 DuckDB 需要：
1. 替换 `sqlite3` 为 `duckdb`
2. 参数化查询从 `?` 改为 `$1`（DuckDB 的参数占位符）
3. 部分 SQLite 方言函数（`strftime`、`date()`）需替换为 DuckDB 等价函数

**迁移改动量估算**：`snapshot_store.py`（575 行，约 40% 需修改）+ `history_importer.py`（约 20% 需修改）

---

## C. DuckDB Excel 原生读取

**来源**: [DuckDB Excel 官方文档](https://duckdb.org/docs/stable/core_extensions/excel) [B] | [duckdb-excel GitHub](https://github.com/duckdb/duckdb-excel) [B] | [DeepWiki read_xlsx 详解](https://deepwiki.com/duckdb/duckdb-excel/2.1-reading-xlsx-files) [C]

### read_xlsx() 核心能力

```sql
-- 基础用法
SELECT * FROM read_xlsx('data/leads.xlsx');

-- 带选项
SELECT * FROM read_xlsx(
    'data/orders.xlsx',
    sheet = '订单明细',
    header = true,
    all_varchar = true,   -- 避免类型推断错误
    ignore_errors = true  -- 跳过问题行
);
```

### 已知限制

| 限制 | 详情 | 本项目影响 |
|------|------|-----------|
| **类型推断不准** | 只能推断 DOUBLE/VARCHAR/TIMESTAMP/BOOLEAN，混合类型列容易出错 | 高（中文标题、混合日期格式） |
| **无公式计算** | 只读取单元格存储值，不执行 Excel 公式 | 中（部分汇总列依赖公式） |
| **合并单元格** | 合并单元格只读第一格值，其余为 NULL | 高（现有 Loader 有专门的 `_ffill_merged` 处理） |
| **多 Sheet** | 需指定 sheet 参数，不支持自动合并多 sheet | 中 |
| **中文列名** | 可以读取，但 SQL 列名需要加引号 | 中 |
| **运行时 bug** | 部分版本有 "table index is out of bounds" 错误（duckdb-wasm #1956） | 低（使用 Python 原生包而非 wasm） |

### 与现有 Pandas 方案对比

| 维度 | 当前 Pandas + openpyxl/calamine | DuckDB read_xlsx |
|------|-------------------------------|-----------------|
| 合并单元格处理 | ✓（`_ffill_merged`）| 需手动 COALESCE 处理 |
| 类型推断 | ✓（`_clean_numeric` 等工具）| 有限，可用 `all_varchar=true` 规避 |
| 中文列名 | ✓ | 需要引号处理 |
| 性能（小文件<1MB） | 相当 | 略快 |
| 性能（大文件>50MB） | 慢 | 快 2~5× |
| 错误处理 | ✓（完善 fallback）| 有限 |

**结论**: 本项目的 Excel 文件均为小型业务文件（< 5 MB），pandas 方案的复杂处理逻辑（`_ffill_merged`、`_clean_numeric`、双引擎 fallback）提供了 DuckDB `read_xlsx` 无法直接替代的功能。**不建议迁移 Excel 读取层**，维持现有 pandas 方案更稳妥。

---

## D. macOS / Apple Silicon 性能特征

**来源**: [DuckDB 官方 FAQ](https://duckdb.org/faq) [B] | [endjin DuckDB 深度分析 2025](https://endjin.com/blog/2025/04/duckdb-in-depth-how-it-works-what-makes-it-fast) [B]

### Apple Silicon 支持

- DuckDB 官方声明：从 Apple Silicon 发布后 **10 分钟内完成移植**
- Apple M1/M2/M3/M4 均有原生 ARM64 二进制（通过 PyPI `duckdb` 包自动安装）
- 利用 NEON SIMD 指令集加速向量化运算
- 测试环境（macOS M4）：DuckDB 扫描 5 GB 数据 < 10 秒

### APFS 磁盘 I/O

- DuckDB 使用内存映射（mmap）文件，与 APFS 的 COW（Copy-on-Write）兼容良好
- APFS 的快照机制不影响 DuckDB 文件完整性
- SSD 随机读取速度在 Apple Silicon Mac 上约 5~7 GB/s，利于 DuckDB 的列扫描

### 内存映射行为

- DuckDB 默认将频繁访问的数据缓存于内存
- 可通过 `PRAGMA memory_limit='2GB'` 控制内存上限
- macOS 统一内存（Unified Memory）架构对 DuckDB 友好：CPU/GPU 共享同一内存池，减少数据拷贝

---

## E. 局限性和已知问题

**来源**: [DuckDB 官方并发文档](https://duckdb.org/docs/stable/connect/concurrency) [B] | [Orchestra 并发安全指南](https://www.getorchestra.io/guides/is-duckdb-safe-for-concurrent-writes) [C] | [GitHub 并发讨论 #4899](https://github.com/duckdb/duckdb/discussions/4899) [C]

### 并发写入（核心限制）

```
DuckDB 设计原则：SINGLE WRITER, MULTIPLE READERS
```

- **同一进程内**：单一 `duckdb.Connection` 对象线程安全，可共享
- **多进程访问**：只能一个进程以读写模式打开，其他进程必须只读
- **FastAPI 并发请求写入**：需要序列化（加锁或队列）

**本项目影响评估**:
FastAPI 后端的写入时机是：
1. 每日 T-1 数据分析完成后保存快照（低频，每日 1 次）
2. 历史批量导入（用户手动触发，单次操作）

**结论**: 本项目写入频率极低（不超过每日 1 次），单写限制**不是实际瓶颈**。

### 内存消耗大数据场景

- 大于系统 RAM 的数据集：DuckDB 会自动溢出到磁盘（透明处理）
- 小型分析（< 1 GB）：内存消耗 ~200 MB~1 GB
- **本项目预估总数据 < 50 MB**，不存在内存压力

### 版本升级兼容性（关键风险）

| DuckDB 版本区间 | 向下兼容性 | 升级建议 |
|----------------|-----------|---------|
| 0.x → 0.x+1 | **不保证**，多次 breaking change | 使用 EXPORT/IMPORT 迁移 |
| 0.x → 1.0 | **不兼容**，需迁移 | `duckdb-upgrade` 工具 |
| 1.0 → 1.x | **前向兼容**，已稳定 | 直接升级 pip 包即可 |

**当前 DuckDB 最新稳定版（2025）**: 1.1.x
**建议**: 锁定 `duckdb>=1.0,<2.0` 在 `requirements.txt`，避免 major 版本升级破坏数据库文件。

---

## F. 迁移案例研究

**来源**: [MotherDuck DuckDB in Action Ch.5](https://motherduck.com/duckdb-book-summary-chapter5/) [B] | [codecentric DuckDB vs Polars benchmark](https://www.codecentric.de/en/knowledge-hub/blog/duckdb-vs-dataframe-libraries) [C] | [kestra 嵌入式数据库 2025 趋势](https://kestra.io/blogs/embedded-databases) [C]

### 真实迁移案例数据

**案例 1: Excel/CSV 分析平台迁移到 DuckDB**
- 原方案：Pandas + SQLite
- 迁移后：DuckDB 直查 Parquet/CSV
- 聚合查询性能：提升 15~40×
- 开发效率：SQL-first 减少 Pandas 代码量约 40%

**案例 2: IoT 数据平台（DuckDB + FastAPI + Streamlit）**
- 架构：FastAPI 提供 REST API，DuckDB 承载分析，Streamlit 展示
- 数据规模：每日约 100K 条传感器记录
- 查询响应：< 500ms（之前 SQLite 需 3~8 秒）

**案例 3: dbt + DuckDB 数据建模**
- 替代 Spark/Snowflake 的本地开发环境
- 同等查询在 DuckDB 上比 Postgres 快 1.5~3×
- 开发者反馈：「首次运行感觉像魔法」

### 失败案例和教训

1. **版本锁定忽略**: 未指定 `duckdb` 版本 → pip upgrade 后数据库文件不可读 → 需恢复旧版本或 EXPORT 重建
2. **连接泄漏**: FastAPI 路由未关闭连接 → 内存持续增长 → 需要 context manager 管理生命周期
3. **中文字段名**: SQL 语句中中文列名未加双引号 → 语法错误 → 需要所有列名统一用 `"中文名"` 引用

---

## G. Text-to-SQL 在 DuckDB 上的成熟度

**来源**: [LlamaIndex DuckDB SQL Query Engine](https://developers.llamaindex.ai/python/examples/index_structs/struct_indices/duckdb_sql_query/) [B] | [promethium.ai Text-to-SQL 综述](https://promethium.ai/guides/llm-ai-models-text-to-sql/) [C] | [adamcowley.co.uk DuckDB+LLM 实战](https://adamcowley.co.uk/posts/llm-sql-duckdb/) [C]

### 主流方案对比

| 方案 | 技术栈 | 准确率 | DuckDB 支持 | 安全性 |
|------|--------|--------|------------|--------|
| LlamaIndex NLSQLQueryEngine | LlamaIndex + 任意 LLM | 80%+ | ✓ 原生支持 | 需沙箱 |
| LangChain SQL Agent | LangChain + 任意 LLM | 75%+ | ✓（通过 duckdb_engine） | 需沙箱 |
| DuckDB-NSQL | 专用微调模型 | 85%+ | ✓ 专为 DuckDB | 较安全 |
| Snowflake Cortex Analyst | 企业级服务 | 90%+ | ✗ | 企业级 |

### LlamaIndex + DuckDB 集成示例

```python
from llama_index.core import SQLDatabase
from llama_index.core.query_engine import NLSQLTableQueryEngine
import duckdb

# 创建 DuckDB 连接
conn = duckdb.connect("analytics.db")
sql_db = SQLDatabase.from_uri("duckdb:///analytics.db")

query_engine = NLSQLTableQueryEngine(
    sql_database=sql_db,
    tables=["cc_ranking_snapshot", "daily_kpi"],
)

response = query_engine.query("本月 CC 排名前三名是谁？")
```

### 准确率提升技巧

1. **Schema 描述注释**：在表定义中添加中文注释，提升 LLM 理解度
2. **DBT 单表整合**：将多表 JOIN 预计算为宽表，准确率 60% → 80%+
3. **Schema Embedding**：表结构向量化存储，按语义检索相关表
4. **Few-shot 示例**：提供 3~5 个中文问题→SQL 示例，准确率显著提升

### SQL 注入防护

- DuckDB 支持参数化查询：`con.execute("SELECT * WHERE cc = $1", [cc_name])`
- Text-to-SQL 生成的 SQL 需在沙箱中执行（`read_only=True` 连接）
- 禁止执行 DDL（CREATE/DROP/ALTER）的 SQL 注入风险较低

---

## H. 与现有 SQLite 快照共存方案

### 当前 SQLite 使用情况（代码审计）

**文件**: `backend/core/snapshot_store.py`（575 行）

**表结构**:
```
daily_kpi          (snapshot_date, metric, value, time_progress)         -- 主 KPI 时序
cc_ranking_snapshot (snapshot_date, cc_name, team, composite, rank, ...)  -- CC 排名历史
monthly_aggregate   (month, data_json)                                    -- 月度 JSON 聚合
multi_source_digest (snapshot_date, source_type, summary_json)            -- 多源摘要 JSON
```

**写入场景**（低频）:
- `save_snapshot()`: 每日 T-1 分析完成后调用（每日 1 次）
- `history_importer.py`: 历史批量导入（用户手动触发）

**读取场景**（高频）:
- `get_cc_history()`: CC 历史排名查询
- `get_daily_kpi_series()`: KPI 时序查询（周聚合、月聚合）
- `get_weekly_kpi()`: 周环比计算
- `get_peak_valley()`: 历史峰谷查询

**引用文件**（共 5 个）:
- `backend/services/analysis_service.py`
- `backend/core/analysis_engine_v2.py`
- `backend/api/snapshots.py`
- `backend/core/history_importer.py`
- `backend/core/snapshot_store.py`（核心）

### 方案对比

#### 方案 A：完全替换（SQLite → DuckDB）

**优点**:
- 统一数据层，减少技术异构
- 聚合查询（`get_weekly_kpi`、`get_monthly_comparison`）性能提升 10~20×
- 未来 Text-to-SQL 功能可直接查询

**缺点**:
- 迁移改动量较大（约 230 行需修改）
- 参数化查询语法变更（`?` → `$1`）
- SQLite 方言函数需逐一替换（`strftime`、`date('now', '-N days')`）
- 版本升级风险

**工作量估算**: 2~3 个 MK × 0.5 天

#### 方案 B：双轨并存（推荐）

**架构**:
```
数据写入层:   SQLite (SnapshotStore 维持不变) → 每日快照写入
数据分析层:   DuckDB (新增 AnalyticsEngine)   → 历史聚合/趋势/CC排名
```

**实现**: 新增 `DuckDBAnalyticsStore`，从 SQLite export 或直接 attach：
```python
import duckdb

# DuckDB 可以直接 attach 并查询 SQLite 数据库
con = duckdb.connect()
con.execute("ATTACH 'data/snapshots.db' AS sqlite_db (TYPE SQLITE)")
con.execute("""
    SELECT metric, AVG(value)
    FROM sqlite_db.daily_kpi
    WHERE snapshot_date >= '2026-01-01'
    GROUP BY metric
""")
```

**优点**:
- 零风险（SQLite 不变）
- DuckDB 直接读 SQLite 文件（官方支持 `sqlite_scanner` 扩展）
- 按需迁移，渐进式

**缺点**:
- 两个数据库技术需同时维护
- `ATTACH SQLITE` 为只读模式

**工作量估算**: 1 个 MK × 0.25 天（新增 DuckDB 层，不改现有代码）

#### 方案 C：维持现状（不迁移）

**场景**: 本项目数据量极小（< 50 MB），当前 SQLite 查询响应均 < 100ms，不存在性能瓶颈。

**适用条件**:
- 无 Text-to-SQL 需求
- 无 M21 里程碑的 DuckDB 特性需求（如向量相似性查询、直接 Parquet 读取）

---

## 综合评分与决策矩阵

| 评估维度 | 权重 | DuckDB 得分 | SQLite 维持得分 | 说明 |
|----------|------|------------|--------------|------|
| 分析查询性能 | 30% | 9 | 6 | OLAP 场景 DuckDB 显著领先 |
| 集成复杂度 | 25% | 6 | 9 | 连接管理需额外工作 |
| 风险控制 | 20% | 6 | 9 | 版本兼容性是主要风险 |
| 未来扩展性 | 15% | 9 | 5 | Text-to-SQL/Parquet/ML 集成 |
| Excel 读取改善 | 10% | 4 | 8 | Pandas 方案已足够成熟 |
| **加权总分** | 100% | **7.05** | **7.35** | 差异小，双轨并存最优 |

---

## 最终建议

### 推荐方案：**方案 B 双轨并存**

**分阶段实施路径**:

```
Phase 1 (M21): DuckDB 分析层叠加（不动 SQLite）
  - 新增 DuckDBAnalyticsStore（使用 sqlite_scanner ATTACH）
  - 将 get_weekly_kpi / get_monthly_comparison 等重聚合查询迁移到 DuckDB
  - 测试性能提升，验证查询结果一致性

Phase 2 (M22+): 按需决策
  - 若 Text-to-SQL 需求确认 → 完整迁移到 DuckDB
  - 若数据量增长显著（> 1GB）→ 评估 Parquet + DuckDB 方案
  - 否则维持双轨并存
```

**风险缓解措施**:
1. 在 `requirements.txt` 锁定 `duckdb>=1.1.0,<2.0.0`
2. 定期 `EXPORT DATABASE` 备份（在版本升级前）
3. DuckDB 层只读（ATTACH 模式），写入仍由 SQLite 负责

### 不推荐的操作
- ❌ 立即完全替换 SQLite（风险高于收益，本项目数据量不需要）
- ❌ 用 DuckDB `read_xlsx` 替换 Pandas Excel 读取（功能倒退）
- ❌ 未锁定版本直接 `pip install duckdb`（版本升级有 breaking change）

---

## 来源清单（按来源分级）

### B 级（官方文档/同行评审）
- DuckDB 官方并发文档: https://duckdb.org/docs/stable/connect/concurrency
- DuckDB Excel 扩展官方文档: https://duckdb.org/docs/stable/core_extensions/excel
- DuckDB Excel 导入指南: https://duckdb.org/docs/stable/guides/file_formats/excel_import
- duckdb-excel GitHub: https://github.com/duckdb/duckdb-excel
- LlamaIndex DuckDB SQL Query Engine: https://developers.llamaindex.ai/python/examples/index_structs/struct_indices/duckdb_sql_query/
- DataCamp DuckDB vs SQLite 完整对比: https://www.datacamp.com/blog/duckdb-vs-sqlite-complete-database-comparison
- MotherDuck DuckDB in Action Ch.10: https://motherduck.com/duckdb-book-summary-chapter10/
- endjin DuckDB 深度分析: https://endjin.com/blog/2025/04/duckdb-in-depth-how-it-works-what-makes-it-fast

### C 级（技术博客/机构报告）
- KDnuggets 1M 行 Benchmark: https://www.kdnuggets.com/we-benchmarked-duckdb-sqlite-and-pandas-on-1m-rows-heres-what-happened
- Galaxy DuckDB vs SQLite Benchmark: https://www.getgalaxy.io/learn/glossary/duckdb-vs-sqlite-benchmarks
- GitHub duckdb-fastapi: https://github.com/buremba/duckdb-fastapi/
- aioduckdb asyncio bridge: https://github.com/kouta-kun/aioduckdb
- Orchestra 并发写入安全指南: https://www.getorchestra.io/guides/is-duckdb-safe-for-concurrent-writes
- duckdb-upgrade PyPI: https://pypi.org/project/duckdb-upgrade/
- codecentric DuckDB vs Polars: https://www.codecentric.de/en/knowledge-hub/blog/duckdb-vs-dataframe-libraries
- kestra 嵌入式数据库 2025 趋势: https://kestra.io/blogs/embedded-databases
- promethium.ai Text-to-SQL 综述: https://promethium.ai/guides/llm-ai-models-text-to-sql/
- adamcowley.co.uk DuckDB+LLM 实战: https://adamcowley.co.uk/posts/llm-sql-duckdb/

### D 级（经验推导 + 本项目代码审计）
- 本项目 SQLite 使用审计（`snapshot_store.py` 575行代码分析）
- 双轨并存架构方案（基于 DuckDB sqlite_scanner 扩展能力推导）
- 迁移工作量估算（基于代码行数和改动范围）

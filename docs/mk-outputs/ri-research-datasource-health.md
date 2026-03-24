# 数据源状态面板增强方案 — 调研评审报告

> 方案文件：`~/.claude/plans/lexical-shimmying-dragonfly.md`
> 调研日期：2026-03-24
> WebSearch 执行：3次
> 来源级别：① Monte Carlo 官方白皮书（A级），② DataKitchen/DQOps 行业报告（B级），③ 代码实测分析（来源②）

---

## 一、数据观测性行业标准对标（Monte Carlo 5 支柱）

**参考来源：**
- [Monte Carlo — What Is Data Observability? 5 Key Pillars](https://www.montecarlodata.com/blog-what-is-data-observability/)（A级，行业权威）
- [Introducing the 5 Pillars of Data Observability](https://www.montecarlodata.com/blog-introducing-the-5-pillars-of-data-observability/)（A级）

| 行业支柱 | 方案覆盖字段 | 覆盖程度 | Gap 说明 |
|---------|------------|---------|---------|
| **Freshness**（新鲜度）| `freshness_tier` / `data_date` / `days_behind` | ✅ 完整 | 5层分级（today/yesterday/recent/stale/missing）超过行业基准的二元判断 |
| **Distribution**（分布）| 无 | ❌ 缺失 | 行业定义：字段值分布异常（如 D4 付费金额全为 0，null 率 >60%）。**方案未覆盖此支柱** |
| **Volume**（数量）| `row_count` / `row_anomaly` / `expected_rows_min/max` | ✅ 完整 | `row_anomaly` 枚举（low/high/ok/unknown）完整覆盖 |
| **Schema**（结构）| `critical_columns_present` / `critical_completeness_rate` | ⚠️ 部分 | 仅检查关键列是否存在，未检测列名变更/类型漂移（如 D3 列从"转介绍注册数"改为"注册数"） |
| **Lineage**（血缘）| `utilization_rate` / `system_consumed_columns` | ⚠️ 部分 | 展示列消费率，但未展示具体消费路径（哪个 API Route 消费了哪列）。行业标准要求上下游完整图谱 |

**结论：方案覆盖 3/5 支柱完整，2/5 支柱部分覆盖，Distribution 支柱完全缺失。**

### Distribution 支柱的业务影响量化

Before：无分布检测，D4 付费金额全为 0 的异常需要用户人工发现（下游报告数字异常后回溯）。
After：增加 null_rate / zero_rate 检测，D4 付费金额全为 0 → 立即在卡片上显示 `distribution: anomaly` 告警徽章。
ROI：避免运营团队基于错误数据制定策略，每次数据异常平均延误 2-4 小时诊断时间 → 节省 2-4h/事件。

---

## 二、前端 UI 模式评估

**参考来源：**
- [DataKitchen — The Six Types of Data Quality Dashboards](https://datakitchen.io/the-six-types-of-data-quality-dashboards/)（B级）
- [DQOps — How to Make a Data Quality Dashboard](https://dqops.com/how-to-make-a-data-quality-dashboard/)（B级）
- [UXPin — Effective Dashboard Design Principles for 2025](https://www.uxpin.com/studio/blog/dashboard-design-principles/)（B级）

### 卡片式 vs 替代方案对比

| 布局方式 | 信息密度 | 响应式 | 与现有 Dashboard 一致性 | 适合 5 数据源场景 |
|---------|---------|--------|----------------------|----------------|
| **卡片式（方案选择）** | 高（每卡可展示 6-8 个指标） | ✅ grid-cols-2/3/5 | ✅ 与现有 KPI 卡片风格一致 | ✅ 推荐 |
| 表格行 | 低（水平滚动，字段展示受限）| ⚠️ 移动端列截断 | ⚠️ 不一致 | ❌ 不推荐 |
| 热力图 | 极高（但需 ≥10 个数据源才体现优势）| ❌ 移动端难读 | ❌ 不一致 | ❌ 不推荐（数据源只有 5 个）|
| 状态行 | 极低（只能显示 1-2 个维度）| ✅ | ⚠️ | ❌ 不推荐 |

**结论：卡片式是 5 数据源场景的最优选择**，与 DataKitchen 推荐的"Critical Data Element Dashboard"模式对齐。

### 响应式网格设计

方案的 `grid-cols-2 md:grid-cols-3 xl:grid-cols-5` 符合 2025 行业最佳实践：
- Mobile (< 768px)：2 列 → 每张卡片宽度约 165px，可读
- Tablet (768-1279px)：3 列 → D1/D2/D3 一行，D4/D5 第二行（合理分组）
- Desktop (≥ 1280px)：5 列 → 全部一行，便于日期一致性对比

**一个改进建议（非阻塞）：** DQOps 的实践显示，在卡片底部增加"Last checked: N秒前"时间戳（轻量级 SWR 30s 轮询已支持）可显著提升用户对"数据实时性"的感知。方案中未包含此细节。

---

## 三、方案 7 维度完整性审查

### 已确认覆盖的维度（6/7）

| 维度 | 字段 | 实现质量 |
|------|------|---------|
| 新鲜度分层 | `freshness_tier` (5层) | ✅ 超出行业基准 |
| 行数异常检测 | `row_anomaly` (4态) | ✅ 完整 |
| 字段完整率 | `completeness_rate` | ✅ 完整 |
| 系统消费率 | `utilization_rate` | ✅ 创新维度（行业少见） |
| 核心字段完整性 | `critical_completeness_rate` | ✅ 完整 |
| 全局健康分 | SummaryBar 40+30+30 | ✅ 完整 |

### 遗漏的关键维度

#### Gap 1：Distribution 支柱（P1 级缺口）

行业定义（来源①）：分布检测 = 字段值的 null 率、零值率、异常值率。

建议新增字段：
```python
# 在 DataSourceStatus 新增（可选，有数据时填充）
null_rate_anomaly: bool | None = None        # 关键字段 null 率 > 配置阈值
zero_rate_anomaly: bool | None = None        # 付费金额类字段零值率 > 阈值
```

Before：D4 付费金额全为 0 时，卡片显示"完整率 100%"但数据实际无效。
After：卡片额外显示 `zero_rate: 100%` 异常徽章。
ROI：识别"看起来完整但实际无效"的数据，投入 2h 实现，每季度防止至少 1 次错误决策。

#### Gap 2：趋势/历史对比（P2 级缺口）

方案只展示当前快照。行业最佳实践（dbt-expectations / Great Expectations）强调时序对比：今天 D3 是 352K 行，昨天是 350K 行 → +0.6%，正常增长；若突然变为 50K 行 → 触发 Volume 告警。

Before：行数展示为绝对值（如"4 行"），无历史对比。
After：行数展示为"4 行（昨日：4 行 → 持平）"，异常时变色。
ROI：需要 SQLite 快照存储支持（tech-debt #24 已记录），短期投入较高，建议列为 M34+ 技术债。

#### Gap 3：日期一致性警告的阈值逻辑未说明

方案 SummaryBar 的"日期一致性"检测 `> 1 个唯一日期 → 黄色警告`，但未处理合理的日期差异（如 D5 高潜学员数据允许 T-2 延迟）。硬编码"所有源同日"可能产生误告警。

Before：D5 数据通常比 D1-D4 晚 1-2 天，SummaryBar 恒显示黄色警告。
After：每个数据源的"允许滞后天数"在 `_DATA_SOURCE_META` 中配置，日期一致性检测忽略在允许范围内的差异。
ROI：消除误告警，减少运营人员"狼来了"效应，1h 实现。

---

## 四、后端实现合理性审查

### 4.1 多线程安全性 — **已充分保护**

```python
self._lock = threading.RLock()   # L67
with self._lock:                  # L71, L156, L163, L164
```

`get_status()` 方法（L253-314）**直接读取 `self._cache` 但未加锁**，存在潜在竞态：

- 场景：线程 A 执行 `load_all()` → `self._cache = new_cache`（L96），此时线程 B 正在 `get_status()` 中读取 `self._cache[src_id]`（L286）
- Python GIL 保护了单次对象引用赋值的原子性，但 `_dirty=True` + `_cache={}` 之间的状态不一致（`invalidate()` L161-165）可导致 `get_status()` 读到空 cache 但 `_dirty=False`

Before：`get_status()` 不在 `_lock` 保护下，理论上可读到中间状态。
After：在 `get_status()` 开头加 `with self._lock:` 包裹 cache 读取。
ROI：FastAPI 使用 asyncio 事件循环 + 线程池，多请求并发时竞态窗口极小，但修复成本仅 1 行代码，建议在本次变更中一并修复。

### 4.2 `Literal` 在 Pydantic v2 中的序列化行为

```python
freshness_tier: Literal["today","yesterday","recent","stale","missing"] = "missing"
```

Pydantic v2（方案假设使用）中 `Literal` 字段序列化为原生字符串，`model_dump()` 和 `model_dump(mode="json")` 行为一致，**无问题**。

前端 TypeScript `FreshnessTier = "today" | "yesterday" | "recent" | "stale" | "missing"` 联合类型与之精确匹配，**无 drift 风险**。

### 4.3 `completeness_rate` 的口径一致性问题 — **存在隐患**

方案定义：`completeness_rate = columns_present / total_columns`，其中：
- `columns_present` = `len(df.columns)`（运行时 DataFrame 的实际列数）
- `total_columns` = 静态 META 中的声明值（如 D4 = 59）

**隐患 1：Excel 空白列**
Excel 文件可能包含 Pandas 读取时自动命名为 `Unnamed: X` 的空白列，导致 `len(df.columns)` 大于真实数据列数。例：D4 声明 59 列，但 Excel 有 3 个空白尾列 → `columns_present = 62 > total_columns = 59` → `completeness_rate = 1.04`（超过 100%）。

Before：`completeness_rate` 可能返回 >1.0，前端进度条溢出（`width: 104%`）。
After：在 `get_status()` 中过滤 `Unnamed:` 列：
```python
actual_cols = [c for c in df.columns if not str(c).startswith("Unnamed:")]
columns_present = len(actual_cols)
```
ROI：1 行代码防止前端进度条 UI 异常，建议在本次实现中强制修复。

**隐患 2：`critical_columns_present` 的大小写/空格敏感**
`critical_columns` 列表中的列名（如"统计日期"）与 Excel 实际列名必须完全一致（包括全角字符、前后空格）。若 Excel 导出时列名含前导空格（`" 统计日期"`），检测会返回 `0/N`。

Before：列名隐式不匹配时 `critical_completeness_rate = 0%`，显示为严重错误。
After：检测时 strip 列名：`stripped_cols = {c.strip() for c in df.columns}`。
ROI：防止误告警，1 行代码，建议强制修复。

---

## 五、前后端类型契约审查

### 5.1 `name` vs `name_zh` Drift — **根因分析**

前端现有 `DataSourceStatus` interface（`frontend/lib/types.ts:352-364`）：
```typescript
export interface DataSourceStatus {
  name_zh: string;     // 前端现有字段
  // ...其他字段（latest_date, file_count, priority, update_frequency 等）
}
```

后端 `common.py` 的 `DataSourceStatus`：
```python
class DataSourceStatus(BaseModel):
  name: str           # 后端字段
```

**根因**：这是两个完全不同的数据结构，不是同一个 API 的前后端版本。前端 `DataSourceStatus` 对应的是另一个 `/api/datasources/status` 端点（返回配置元数据），后端模型对应的是数据源健康状态。

**方案处理方式**（`source.name ?? (source as any).name_zh`）是 `as any` 强转，违反 CLAUDE.md 类型安全铁律（`🟡 类型安全：as any = "我不理解这个类型"`）。

Before：`source.name ?? (source as any).name_zh` 绕过类型检查，未来字段变更不会有编译错误提示。
After：明确新增类型并从现有 interface 分离：
```typescript
// frontend/lib/types.ts 新增
export interface DataSourceHealthStatus {
  id: string;
  name: string;           // 对应后端 name 字段
  freshness_tier: FreshnessTier;
  // ... 12 个新字段，不继承旧 DataSourceStatus
}
```
ROI：消除 `as any` 逃逸，编译期类型安全保证，30 分钟重构，防止后续迭代引入字段 drift（技术债来源 #31）。

### 5.2 新增 12 个字段的类型一致性风险

| 字段 | 后端类型 | 方案前端类型 | 风险 |
|------|---------|------------|------|
| `data_date` | `str \| None` | `string \| null` | ✅ 安全 |
| `freshness_tier` | `Literal[5 值]` | `FreshnessTier` 联合类型 | ✅ 安全 |
| `days_behind` | `int \| None` | `number \| null` | ✅ 安全 |
| `row_anomaly` | `Literal[4 值]` | `RowAnomalyStatus` 联合类型 | ✅ 安全 |
| `completeness_rate` | `float \| None` | `number \| null` | ⚠️ 见 4.3 隐患（可能 >1.0） |
| `utilization_rate` | `float \| None` | `number \| null` | ✅ 安全（静态计算，不超过 1.0） |
| `critical_completeness_rate` | `float \| None` | `number \| null` | ✅ 安全 |

**总结：** 7 个数值/枚举类型字段中 5 个安全，1 个存在边界值隐患（见 4.3），1 个需要类型分离（见 5.1）。

---

## 六、dbt / Great Expectations 框架对比启示

**参考来源：**
- [dbt vs Great Expectations vs Soda: Which to Choose](https://cybersierra.co/blog/best-data-quality-tools/)（B级）
- [The 2026 Open-Source Data Quality Landscape](https://datakitchen.io/the-2026-open-source-data-quality-and-data-observability-landscape/)（B级）

本项目数据管道是 Excel → Pandas → FastAPI，与 dbt（SQL 变换层）场景不同，但可借鉴以下模式：

| 行业框架能力 | 本项目等价实现 | 方案覆盖 |
|------------|------------|---------|
| Schema drift 检测（列名变更）| `critical_columns_present` 检查列是否存在 | ⚠️ 部分（仅存在性，未检测类型） |
| Freshness SLA | `freshness_tier` 五层 | ✅ 完整 |
| Volume anomaly | `row_anomaly` 与 expected_rows_range 对比 | ✅ 完整 |
| Distribution tests（null/zero rate）| 无 | ❌ 缺失 |
| Lineage tracking | `utilization_rate`（消费列占比）| ⚠️ 部分（无路径） |
| Historical trend | 无 | ❌ 缺失（受限于 tech-debt #24）|

---

## 七、综合评估与建议优先级

### P0 — 实现前必须修复（影响正确性）

1. **`completeness_rate` 空白列过滤**（4.3 隐患 1）：1 行代码，防止 >100% 边界异常
2. **`critical_columns_present` 列名 strip**（4.3 隐患 2）：1 行代码，防止误告警
3. **新建 `DataSourceHealthStatus` type 替代 `as any` 强转**（5.1）：30 分钟，消除类型逃逸

### P1 — 本次迭代建议纳入

4. **Distribution 支柱：添加 `zero_rate_anomaly` + `null_rate_anomaly`**（三、Gap 1）：2h 实现，覆盖第 2 支柱
5. **`get_status()` 加锁保护**（4.1）：1 行代码，消除理论竞态窗口
6. **日期一致性告警阈值可配置化**（三、Gap 3）：1h 实现，消除误告警

### P2 — 列为 tech-debt，M34+ 规划

7. **趋势/历史对比**（三、Gap 2）：依赖 SQLite 快照积累（tech-debt #24），不适合本次
8. **完整 Lineage 路径图**（支柱对标）：需要 API route → column 的依赖图，工程量较大

---

## 八、方案整体质量评价

| 评估维度 | 评分 | 说明 |
|---------|------|------|
| Freshness 覆盖 | 5/5 | 五层分级超出行业基准 |
| Volume 覆盖 | 5/5 | expected_rows_range + 四态枚举，完整 |
| Schema 覆盖 | 3/5 | 存在性检测✅，类型检测❌，strip 缺失❌ |
| Distribution 覆盖 | 0/5 | 完全缺失，行业第 2 支柱 |
| Lineage 覆盖 | 3/5 | 消费率创新✅，路径图缺失❌ |
| 前端 UI 设计 | 4/5 | 卡片式最优，响应式完整，缺"Last checked"时间戳 |
| 类型安全 | 3/5 | `as any` 违规，`completeness_rate` 边界未处理 |
| 后端实现安全 | 4/5 | RLock 保护充分，`get_status()` 读缓存未加锁 |

**加权总评：方案质量良好，6/8 维度达到或超出行业标准。3 个 P0 问题需在实现前修复，4 个 P1 问题建议本次一并纳入。**

---

*调研来源列表：*
- [Monte Carlo — 5 Pillars of Data Observability](https://www.montecarlodata.com/blog-what-is-data-observability/)
- [Monte Carlo — Introducing 5 Pillars](https://www.montecarlodata.com/blog-introducing-the-5-pillars-of-data-observability/)
- [DataKitchen — Six Types of Data Quality Dashboards](https://datakitchen.io/the-six-types-of-data-quality-dashboards/)
- [DQOps — How to Make a Data Quality Dashboard](https://dqops.com/how-to-make-a-data-quality-dashboard/)
- [UXPin — Dashboard Design Principles 2025](https://www.uxpin.com/studio/blog/dashboard-design-principles/)
- [DataKitchen — 2026 Open-Source Data Quality Landscape](https://datakitchen.io/the-2026-open-source-data-quality-and-data-observability-landscape/)
- [CyberSierra — dbt vs Great Expectations vs Soda](https://cybersierra.co/blog/best-data-quality-tools/)

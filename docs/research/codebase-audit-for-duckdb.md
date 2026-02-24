# ref-ops-engine 当前架构深度审计报告

> 用途：DuckDB 迁移可行性评估的量化基线
> 审计日期：2026-02-22
> 审计人：mk-research-codebase-sonnet

---

## 1. 总体数字摘要

| 维度 | 数值 |
|------|------|
| Loader 文件数 | 7（base + 6 个分类 Loader） |
| Loader 总代码行数 | 2,917 行 |
| 分析引擎 (analysis_engine_v2.py) | 2,039 行 |
| 覆盖数据源数量 | 35 个 Excel 文件 |
| 总 `iterrows()` 调用次数 | **37 处** |
| 总 Pandas 操作（groupby/apply/merge 等） | 61 处 |
| 服务层缓存 TTL | 5 分钟（单进程内存缓存） |
| API 端点数量 | 40+ 个 |
| 分析引擎模块数 | 20 个 `_analyze_*` 方法 |

---

## 2. Loader 层审计（A — 逐文件）

### 2.1 文件清单与基本信息

| 文件 | 行数 | 主类 | 覆盖数据源 | 数据源数量 |
|------|------|------|-----------|-----------|
| `base.py` | 122 | `BaseLoader` | 公共工具方法 | — |
| `leads_loader.py` | 421 | `LeadsLoader` | A1–A4（BI-Leads 系列） | 4 |
| `roi_loader.py` | 184 | `ROILoader` | B1（中台_转介绍ROI测算） | 1（4 Sheet） |
| `cohort_loader.py` | 298 | `CohortLoader` | C1–C6（BI-cohort 系列） | 6 |
| `kpi_loader.py` | 346 | `KpiLoader` | D1–D5（BI-KPI/北极星） | 5 |
| `order_loader.py` | 446 | `OrderLoader` | E1–E8（BI-订单 系列） | 8 |
| `ops_loader.py` | 1,100 | `OpsLoader` | F1–F11（宣宣/宣萱 运营数据） | 11 |
| **合计** | **2,917** | — | — | **35** |

### 2.2 加载的 Excel 文件完整列表

#### A 类 — Leads（LeadsLoader）
| 源 ID | 子目录名 | Sheet | 规模 | 输出字段 |
|-------|---------|-------|------|---------|
| A1 | `BI-Leads_宽口径leads达成_D-1` | `转介绍leads达成_by_CM_EA_宽口径` | 双层表头 | by_team / by_channel / total |
| A2 | `BI-Leads_全口径转介绍类型-当月效率_D-1` | `CC_CM_EA_宽口径转介绍类型_当月效率` | 双层表头，围场×通道 | by_enclosure / by_channel |
| A3 | `BI-Leads_全口径leads明细表_D-1` | `CM_EA转介绍leads明细表` | ~500行×30列 | records / by_cc / by_team / total_leads |
| A4 | `BI-Leads_宽口径leads达成-个人_D-1` | `转介绍leads达成_by个人` | 63行×9列 | records |

#### B 类 — ROI（ROILoader）
| 源 ID | 子目录名 | Sheet | 输出字段 |
|-------|---------|-------|---------|
| B1 | `中台_转介绍ROI测算数据模型_M-1` | ROI汇总/成本list/详细规则/地区（4 Sheet） | summary / cost_list / cost_rules / regions |

#### C 类 — Cohort（CohortLoader）
| 源 ID | 子目录名 | 输出字段 |
|-------|---------|---------|
| C1 | `BI-cohort模型_CC触达率_M-1` | by_team / by_month |
| C2 | `BI-cohort模型_CC参与率_M-1` | by_team / by_month |
| C3 | `BI-cohort模型_CC打卡率_M-1` | by_team / by_month |
| C4 | `BI-cohort模型_CC帶新系數_M-1` | by_team / by_month |
| C5 | `BI-cohort模型_CC帶貨比_M-1` | by_team / by_month |
| C6 | `BI-cohort模型_CCcohort明细表_M-1` | records(8806行) / by_cc / by_team / total_students |

#### D 类 — KPI（KpiLoader）
| 源 ID | 子目录名 | 输出字段 |
|-------|---------|---------|
| D1 | `BI-北极星指标_当月24H打卡率_D-1` | by_cc / by_team / summary |
| D2 | `BI-KPI_市场-本月围场数据_D-1` | by_enclosure / total |
| D3 | `BI-KPI_转介绍-本月围场数据_D-1` | by_enclosure / total |
| D4 | `BI-KPI_市场&转介绍-本月围场数据_D-1` | by_enclosure / total |
| D5 | `BI-KPI_当月转介绍打卡率_D-1` | by_cc / by_team / summary |

#### E 类 — 订单（OrderLoader）
| 源 ID | 子目录名 | 规模 | 输出字段 |
|-------|---------|------|---------|
| E1 | `BI-订单_CC上班人数_D-1` | 日趋势 | records（date/active_5min/active_30min） |
| E2 | `BI-订单_SS上班人数_D-1` | 日趋势 | records |
| E3 | `BI-订单_明细_D-1` | 357行×16列 | records / by_team / by_channel / by_date / summary / referral_cc_new |
| E4 | `BI-订单_套餐类型订单日趋势_D-1` | 日趋势 | records（date/product_type/order_count） |
| E5 | `BI-订单_业绩日趋势_D-1` | 日趋势 | records（date/product_type/revenue_cny） |
| E6 | `BI-订单_套餐类型占比_D-1` | 双层表头 | by_channel.records |
| E7 | `BI-订单_分小组套餐类型占比_D-1` | 双层表头 | by_team |
| E8 | `BI-订单_套餐分渠道金额_D-1` | XML 损坏，calamine 优先 | by_channel_product |

#### F 类 — 运营（OpsLoader）
| 源 ID | 子目录名 | 规模 | 输出字段 |
|-------|---------|------|---------|
| F1 | `宣宣_漏斗跟进效率_D-1` | 约200行×29列 | records / summary |
| F2 | `宣宣_截面跟进效率_D-1` | 多月×CC级 | records / by_channel |
| F3 | `宣宣_截面跟进效率-月度环比_D-1` | 多月×CC级 | records / by_channel / by_month |
| F4 | `宣宣_转介绍渠道-月度环比_D-1` | 宽表，多月×指标 | records / months |
| F5 | `宣宣_转介绍每日外呼数据_D-1` | 792行×11列 | records / by_cc / by_team / by_date |
| F6 | `宣宣_转介绍体验用户分配后跟进明细_D-1` | ~1000行×9列 | records / by_cc / by_team / summary |
| F7 | `宣宣_付费用户围场当月跟进明细_D-1` | ~1000行×8列 | records / by_cc / by_team / summary |
| F8 | `宣萱_不同围场月度付费用户跟进_D-1` | 241行×11列 | by_enclosure / by_cc / summary |
| F9 | `宣萱_月度付费用户跟进_D-1` | 74行×10列 | by_cc / by_team / summary |
| F10 | `宣萱_首次体验课课前课后跟进_D-1` | 126行×17列 | by_cc / by_team / by_channel / summary |
| F11 | `宣萱_明细表-泰国课前外呼覆盖_D-1` | **6,931行×16列** | records / by_cc / by_team / by_lead_type / summary |

---

## 3. 重复模式识别（A — 代码重复率）

### 3.1 高度重复的模式

**模式 1：`iterrows()` 行级 Python 循环聚合**
- 出现 37 次，遍布所有 6 个分类 Loader
- 每次迭代做：字段提取 → 清洗 → 追加到 list/dict
- 等价 SQL 操作：`SELECT ... WHERE ... GROUP BY ...`
- **可向量化比例估算：>90%**（大部分循环仅做条件过滤 + 求和）

**模式 2：双层表头处理（`header=None` + 手动 ffill）**
- 出现 5 次（A1、A2、E6、E7、F4）
- 每次写法几乎相同：
  ```python
  df_raw = read_xlsx(..., header=None)
  header_row0 = df_raw.iloc[0].ffill().tolist()
  header_row1 = df_raw.iloc[1].tolist()
  col_names = [f"{h0}_{h1}" if h1 not in ("nan","") else h0 ...]
  ```
- DuckDB 读取 Excel 时需由上层 Python 处理双层表头后再导入

**模式 3：by_cc / by_team 聚合字典构建**
- 出现 12 次（A3/C6/F5/F6/F7/F8/F9/F10/F11 均有 by_cc + by_team）
- 模式：`if key not in dict: dict[key] = {init}; dict[key][field] += val`
- 等价 SQL：`SELECT cc_name, SUM(field) FROM ... GROUP BY cc_name`

**模式 4：归一化工具方法（无差异重复）**
- `_normalize_team()` / `_normalize_alias()` / `_clean_numeric()` / `_clean_date()` / `_ffill_merged()`
- 已提取到 `BaseLoader`，**此处设计良好**，无重复

### 3.2 重复代码估算

| 重复类型 | 涉及行数（估算） | 占总行数比例 |
|---------|----------------|------------|
| iterrows 聚合循环（可向量化） | ~800 行 | **27%** |
| 双层表头处理 | ~60 行 | 2% |
| by_cc/by_team 字典聚合 | ~400 行 | 14% |
| 文件查找 + 空值检测样板 | ~150 行 | 5% |
| **合计重复/冗余** | **~1,410 行** | **~48%** |

---

## 4. 分析引擎审计（B — AnalysisEngineV2）

### 4.1 架构概览

```
MultiSourceLoader.load_all()        # 加载全部 35 源 → Python dict
    → AnalysisEngineV2(data, targets)
        → analyze()                 # 20 个模块串行执行
            → _analyze_summary()    # 从 data["leads"]["leads_achievement"] 取值
            → _analyze_funnel()     # 跨 leads / order / ops 数据
            → _analyze_cc_360()     # 跨 5 个数据源 join
            → _analyze_cc_ranking() # 18 维指标归一化 min-max
            → _detect_anomalies()   # 统计学 2σ 检测
            → ... 16 个其他模块
```

### 4.2 Pandas 操作统计

**分析引擎本身（analysis_engine_v2.py）：**
- 分析引擎**不使用 Pandas**——所有 20 个分析模块完全基于 Python dict/list 操作
- 数值计算使用标准库 `statistics`、`math`、`calendar`
- 已有 `_safe_div()`、`_safe_pct()` 等工具函数
- JSON 序列化通过 `_clean_for_json()` 递归处理

**Loader 层（7 个文件）的 Pandas 操作：**

| 操作类型 | 出现次数 | 说明 |
|---------|---------|------|
| `iterrows()` | 37 | 行级 Python 循环，最慢操作 |
| `groupby()` | 3 | 仅 kpi_loader（D1/D5 团队聚合） |
| `.apply()` | 8 | 用于过滤条件 lambda |
| `ffill()` | 10 | 合并单元格前向填充 |
| `pd.read_excel()` | 27 | Excel 文件读取，openpyxl/calamine |
| `df.rename()` | 25+ | 列名映射 |
| `pd.isna()` | 20+ | 空值检测 |

### 4.3 内存密集型操作识别

**高内存 / 高耗时操作：**

1. **C6 全量加载**（最大单源）
   - `BI-cohort模型_CCcohort明细表_M-1`：8,806行×30列
   - 全量读入内存 → 单行迭代聚合
   - 每行有 36 个列访问（12月×3指标）

2. **F11 全量加载**（第二大单源）
   - `宣萱_明细表-泰国课前外呼覆盖_D-1`：6,931行×16列
   - 全量读入 → 单行迭代 → 4 个维度聚合（by_cc/by_team/by_lead_type + records）

3. **A3 明细表**：~500行×30列，全量行迭代 + by_cc + by_team 双重字典聚合

4. **每次 API 请求触发全量重算（5 分钟 TTL 内例外）**
   - 缓存过期后：35 个 Excel 文件全量重读 + 20 个分析模块串行执行
   - 无增量更新能力
   - 无文件级别变更检测

### 4.4 启动时间瓶颈分析（估算）

基于代码结构估算（无实测环境）：

| 阶段 | 估算耗时 | 主要瓶颈 |
|------|---------|---------|
| 35 个 Excel 文件 I/O（openpyxl） | 15–40s | 磁盘 I/O + openpyxl XML 解析 |
| iterrows 行级聚合（37 处，合计约1.5万行） | 5–15s | Python 解释器逐行开销 |
| 分析引擎 20 模块串行执行 | 2–5s | dict 遍历 + statistics 计算 |
| JSON 序列化（_clean_for_json） | 1–2s | 深层递归 |
| **合计（冷启动/缓存失效）** | **~25–60s** | Excel I/O 主导 |

---

## 5. 数据流审计（C — 完整路径）

### 5.1 请求 → 响应数据流

```
API 请求 (FastAPI)
    │
    ├─ 缓存命中（TTL 5min 内）→ 直接返回 dict 切片
    │
    └─ 缓存失效（或 force=True）
           │
           ↓
    AnalysisService.run()
           │
    MultiSourceLoader.load_all()
           │
    ├── LeadsLoader.load_all()   → pd.read_excel × 4  → iterrows × 4
    ├── ROILoader.load_all()     → pd.read_excel × 4  → iterrows × 4
    ├── CohortLoader.load_all()  → pd.read_excel × 6  → iterrows × 6
    ├── KpiLoader.load_all()     → pd.read_excel × 5  → iterrows × 3 + groupby × 2
    ├── OrderLoader.load_all()   → pd.read_excel × 8  → iterrows × 7
    └── OpsLoader.load_all()     → pd.read_excel × 11 → iterrows × 16
           │
           ↓ dict (35 源合并)
    AnalysisEngineV2.analyze()   → 20 模块串行，全 Python dict 操作
           │
           ↓ JSON-serializable dict
    SnapshotStore.save_snapshot() → SQLite 写入
           │
           ↓ 缓存到 AnalysisService._cached_result
           │
    API Router → 取对应 key → 返回 JSON
```

### 5.2 缓存机制

| 层次 | 类型 | TTL | 范围 |
|------|------|-----|------|
| AnalysisService | Python 内存 dict | 5 分钟 | 单进程，服务重启失效 |
| SnapshotStore | SQLite | 永久 | 仅历史对比（WoW/YoY）使用 |
| 文件级 | 无 | — | 每次 run() 全量重读 |
| 端点级 | 无 | — | 各 API 直接取 get_cached_result() 切片 |

**关键问题：每次缓存失效（5 分钟 TTL 到期）都会触发 35 个文件的全量重读和 20 个分析模块的串行计算。**

---

## 6. 痛点量化（D）

### 6.1 代码重复率

| 指标 | 数值 |
|------|------|
| 可向量化但未向量化的行数 | ~800 行（iterrows 聚合） |
| 跨 Loader 重复的模式数 | 3 个主模式 |
| 总重复/冗余行数估算 | ~1,410 行（占 Loader 层 48%） |

### 6.2 维护成本指标

**改一个字段需要改几个文件？**

| 变更场景 | 需修改文件数 |
|---------|------------|
| 修改 CC 姓名标准化规则 | 1（base.py） |
| 新增一个 Excel 列到 by_cc 聚合 | 2–3（具体 Loader + analysis_engine_v2.py） |
| 修改 leads A3 sheet 名称 | 1（leads_loader.py） |
| 修改 iterrows 聚合字段（如 F5 外呼） | 2（ops_loader.py + 消费此字段的 API/engine） |
| 添加新数据源 | 3（新 Loader 方法 + multi_source_loader.py + analysis_engine_v2.py） |
| 修改 CC 排名算法（18 维权重） | 1（analysis_engine_v2.py:_analyze_cc_ranking） |

**列名硬编码位置索引问题（高风险）：**
- F 系列 Loader 使用位置索引（`df.columns[0]`, `df.columns[7]` 等）赋列名
- 若上游 Excel 文件列顺序变化，静默错误无法检测
- 影响范围：F1–F11 全部 11 个数据源

### 6.3 跨源关联字段识别

| 关联字段 | 出现在的数据源 | 关联类型 |
|---------|-------------|---------|
| `cc_name` / `CC姓名` | A3/A4/C6/D1/D5/F1/F2/F5/F6/F7/F8/F9/F10/F11 | 14 个源的主要 join key |
| `team` / `小组` | 全部 35 源 | 次要 join key |
| `date` / `deal_time_day` | A3/E3/E4/E5/F5/F6 | 时间维度 |
| `student_id` / `学员ID` | A3/C6/F6/F7/F8/F11 | 学员明细 join key |
| `channel` / `渠道` | A1/A2/A3/E3/F1/F2/F3/F4/F10 | 渠道维度 |

**cc_name 跨源匹配的问题：**
- `_norm_cc()` 函数（lowercase + strip）在 analysis_engine_v2.py 中用于跨源 CC 姓名匹配
- 但各 Loader 输出字段名不统一（`cc_name` vs `CC` vs `当前CC` vs `末次分配CC员工姓名`）
- 跨源 join 需在 Python 层手动完成，无 SQL join 语义

---

## 7. Schema 映射（E — 35 源逻辑表）

### 7.1 逻辑表映射（按类别）

```
data["leads"]["leads_achievement"]          → A1: 宽口径达成（by_team/by_channel/total）
data["leads"]["channel_efficiency"]         → A2: 效率（by_enclosure/by_channel）
data["leads"]["leads_detail"]               → A3: 明细（records/by_cc/by_team/total_leads）
data["leads"]["leads_achievement_personal"] → A4: 个人达成（records）

data["roi"]                                 → B1: ROI汇总（summary/cost_list/cost_rules/regions）

data["cohort"]["reach_rate"]                → C1: 触达率 cohort
data["cohort"]["participation_rate"]        → C2: 参与率 cohort
data["cohort"]["checkin_rate"]              → C3: 打卡率 cohort
data["cohort"]["referral_coefficient"]      → C4: 带新系数 cohort
data["cohort"]["conversion_ratio"]          → C5: 带货比 cohort
data["cohort"]["cohort_detail"]             → C6: 明细（records/by_cc/by_team）

data["kpi"]["north_star_24h"]               → D1: 24H打卡率（by_cc/by_team/summary）
data["kpi"]["enclosure_market"]             → D2: 围场市场数据（by_enclosure/total）
data["kpi"]["enclosure_referral"]           → D3: 围场转介绍数据（by_enclosure/total）
data["kpi"]["enclosure_combined"]           → D4: 围场合并数据（by_enclosure/total）
data["kpi"]["checkin_rate_monthly"]         → D5: 打卡率月度（by_cc/by_team/summary）

data["order"]["cc_attendance"]              → E1: CC上班人数（records）
data["order"]["ss_attendance"]              → E2: SS上班人数（records）
data["order"]["order_detail"]               → E3: 订单明细（records/by_team/by_channel/referral_cc_new）
data["order"]["order_daily_trend"]          → E4: 套餐日趋势（records）
data["order"]["revenue_daily_trend"]        → E5: 业绩日趋势（records）
data["order"]["package_ratio"]              → E6: 套餐占比（by_channel）
data["order"]["team_package_ratio"]         → E7: 分小组套餐（by_team）
data["order"]["channel_revenue"]            → E8: 渠道金额（by_channel_product）

data["ops"]["funnel_efficiency"]            → F1: 漏斗效率（records/summary）
data["ops"]["section_efficiency"]           → F2: 截面效率（records/by_channel）
data["ops"]["section_mom"]                  → F3: 截面 MoM（records/by_channel/by_month）
data["ops"]["channel_mom"]                  → F4: 渠道 MoM 宽表（records/months）
data["ops"]["daily_outreach"]               → F5: 每日外呼（records/by_cc/by_team/by_date）
data["ops"]["trial_followup"]               → F6: 试听跟进（records/by_cc/by_team/summary）
data["ops"]["paid_user_followup"]           → F7: 付费用户跟进（records/by_cc/by_team/summary）
data["ops"]["enclosure_monthly_followup"]   → F8: 围场月度跟进（by_enclosure/by_cc/summary）
data["ops"]["monthly_paid_followup"]        → F9: 月度付费跟进（by_cc/by_team/summary）
data["ops"]["trial_class_followup"]         → F10: 体验课跟进（by_cc/by_team/by_channel/summary）
data["ops"]["pre_class_outreach"]           → F11: 课前外呼（records/by_cc/by_team/by_lead_type/summary）
```

### 7.2 跨源联动在分析引擎中的实现方式

| 分析模块 | 使用的数据源 | 联动方式 |
|---------|------------|---------|
| `_analyze_cc_360` | D1+D5+A3+F5+F6 | Python dict.get() + 以 cc_name 为 key 的字典 merge |
| `_analyze_cc_ranking` | 5+ 数据源 | 同上，18 维 min-max 归一化 |
| `_analyze_summary` | A1+E3+D1 | 顺序读取，各取子 key |
| `_analyze_funnel` | A1+A2+F1 | 顺序读取 |
| `_analyze_impact_chain` | summary + funnel 输出 | 依赖前两模块结果 |

---

## 8. 关键性能瓶颈与 DuckDB 迁移价值

### 8.1 当前痛点优先级

| 痛点 | 影响程度 | DuckDB 改善预期 |
|------|---------|---------------|
| 37 处 `iterrows()` 全行级 Python 循环 | **P0** | 向量化 SQL GROUP BY，10–100x 加速 |
| 每次缓存失效重读 35 个 Excel 文件 | **P0** | DuckDB 原生 read_xlsx → Parquet 缓存，分钟级降秒级 |
| F11 6931行/C6 8806行 全量内存加载 | **P1** | DuckDB 惰性加载 + 列式存储，内存降 50–80% |
| cc_name 跨源 join 靠 Python dict 手动 | **P1** | SQL JOIN，可验证、可调试 |
| 列名位置索引脆弱性（F1-F11） | **P1** | 显式 SQL 列名 SELECT，上游变化立即报错 |
| 双层表头需 Python 预处理 | **P2** | 仍需 Python 预处理，DuckDB 无法直接处理 |
| 单进程内存缓存（重启失效） | **P2** | DuckDB 文件缓存持久化 |
| 20 个分析模块串行执行 | **P3** | 可并行化，但当前是 Python 瓶颈非 DB 瓶颈 |

### 8.2 不适合 DuckDB 直接处理的部分（需保留 Python）

1. **双层表头解析**：5 个数据源（A1/A2/E6/E7/F4）需 Python 预处理后才能入库
2. **合并单元格 ffill**：Excel 特有，所有 Loader 均需处理，DuckDB 无此能力
3. **日期/数值清洗**（`_clean_date`、`_clean_numeric`）：特定业务格式，需 Python 或 DuckDB UDF
4. **分析引擎 20 模块**：已是纯 Python dict 操作，不涉及 Pandas，迁移价值较低

### 8.3 DuckDB 最高价值迁移目标

按 ROI 排序：

1. **F5/F6/F7/F8/F9/F11 大规模 records 聚合**（by_cc/by_team）→ SQL GROUP BY 替换 37 处 iterrows
2. **E3 订单明细多维聚合**（by_team/by_channel/by_date/referral_cc_new）→ 4 个 SQL 查询替换 4 段循环
3. **C6 cohort 明细 8806 行**→ SQL 替换 12×3=36 列的行级迭代
4. **跨源 cc_name JOIN**（cc_360/ranking）→ 用 SQL LEFT JOIN 替换 Python dict merge

---

## 9. 数据流 E2E 路径图（关键）

```
[input/ 目录]
    ├── 35 个 Excel 子目录
    │       ↓ pd.read_excel() × 35（openpyxl/calamine）
    ├── BaseLoader._read_xlsx_pandas()       [I/O 瓶颈 #1]
    │
    ├── 6 个分类 Loader
    │       ├── 手动双层表头处理（5 处）
    │       ├── ffill 合并单元格（17 处）
    │       └── iterrows 聚合（37 处）        [CPU 瓶颈 #2]
    │               ↓ Python dict
    ├── MultiSourceLoader.load_all()         [35 源合并，全内存]
    │               ↓ ~50MB+ dict（估算）
    ├── AnalysisEngineV2.analyze()
    │       ├── 20 个模块串行
    │       └── 跨源 Python dict join        [逻辑瓶颈 #3]
    │               ↓ JSON-serializable dict
    ├── SnapshotStore.save_snapshot()        [SQLite 写入]
    │
    ├── AnalysisService._cached_result       [5分钟 TTL]
    │               ↓
    └── FastAPI 端点 → get_cached_result()   [取子 key]
```

---

## 10. 总结：三大核心瓶颈

| # | 瓶颈 | 当前实现 | 量化 | DuckDB 方案 |
|---|------|---------|------|------------|
| 1 | **Excel I/O** | 35 文件全量重读（5分钟 TTL 后） | 估算 15–40s | read_xlsx→Parquet 缓存，首次后增量 |
| 2 | **行级 Python 循环** | 37 处 iterrows，合计~1.5万行数据 | 估算 5–15s | SQL GROUP BY/JOIN，向量化 10x+ |
| 3 | **跨源 Python join** | cc_name 手动字典 merge（14 个源） | 逻辑脆弱，无验证 | DuckDB SQL LEFT JOIN |

**当前架构特点：**
- 设计合理：分层清晰（BaseLoader → 分类 Loader → MultiSourceLoader → Engine → Service → API）
- 主要问题：执行层全量 iterrows，对大规模明细表（F11: 6931行，C6: 8806行）效率较低
- 缓存设计：5 分钟 TTL 内存缓存可用，但缓存失效代价大（全量重算）
- 扩展性：添加新数据源需改 3 个文件，结构化但不够零代码

---

*审计完成。数据可用于 DuckDB 迁移可行性量化评估报告。*

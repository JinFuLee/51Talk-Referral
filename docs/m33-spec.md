# M33: 运营分析报告引擎

> 状态：待评审 | 创建：2026-03-26 | 依赖：M32(✅)

## 1. 问题定义

**Before**: 运营月报由 Felix 手工在 Excel 中制作（11 区块 × 326 数据点），耗时 2-3h/次，无法每日更新，口径不一致风险高。系统仅覆盖 22%（总计漏斗 + 推演），分口径漏斗/环比/三因素分解/瓶颈识别均为 0%。

**After**: 每日 T-1 自动更新全部 326 数据点，前端页面完整呈现 11 区块，钉钉推送核心摘要，三档目标自动推荐。覆盖率 22% → 100%。

## 2. 终态定义

### 验收标准（全部通过才算完成）

| # | 验收项 | 验证命令/方式 |
|---|-------|-------------|
| 1 | `GET /api/report/daily` 返回 11 区块完整 JSON | `curl localhost:8100/api/report/daily \| jq '.blocks \| length'` = 11 |
| 2 | 4 口径 × 9 指标全覆盖（45/45） | `curl ... \| jq '.blocks.channel_funnel'` 含 CC窄/SS窄/LP窄/其它 × 9 |
| 3 | 8 维环比全覆盖 | `curl ... \| jq '.blocks.comparison \| keys'` 含 day/week_td/week_roll/month_td/month_roll/year_td/year_roll |
| 4 | 三因素分解残差 < 实际增量 2% | 用你贴的数据验证：量+率+价+残差 = 实际 Δ |
| 5 | 前端 `/analytics` 页面渲染 11 区块 | 浏览器打开确认 |
| 6 | 钉钉摘要推送成功 | `--dry-run` 输出 + `--confirm` 正式发送 |
| 7 | 三档目标推荐生成 | Settings 页面显示保守/持平/激进三档 |
| 8 | SQLite 日快照持久化 | 连续运行 2 天后 `SELECT COUNT(*) FROM daily_channel_snapshots` ≥ 2 |

## 3. 架构设计

```
Excel T-1 → DataManager → ┬─ D1(总计漏斗)
                           ├─ D3(明细, groupby 转介绍类型_新)
                           └─ targets(月度目标)
                                    ↓
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
            ChannelFunnelEngine  ComparisonEngine  TargetRecommender
            (口径聚合)           (8维环比)         (三档推荐)
                    ↓               ↓
            ┌───────┴───────┐       ↓
            ↓               ↓       ↓
    DecompositionEngine  LeverageEngine  ProjectionEngine
    (三因素分解)         (瓶颈识别)      (达标测算+敏感性)
                    ↓
              ReportEngine (11 区块组装)
              ┌─────┴─────┐
              ↓           ↓
        API JSON     DingTalk Formatter
              ↓           ↓
        Frontend      钉钉群
```

## 4. Tag 拆解

### Tag A: 数据持久层（无外部依赖，最先开始）

| 任务 | 文件 | 说明 |
|------|------|------|
| A1 | `backend/core/daily_snapshot_service.py` | SQLite 日快照表设计 + 写入/读取/归档 |
| A2 | `backend/core/channel_funnel_engine.py` | D3 按 `转介绍类型_新` groupby 聚合 5 绝对值 + 4 转化率 |
| A3 | `backend/core/comparison_engine.py` | 8 维环比计算（日/周/月/年 × 累计/滚动） |
| A4 | SQLite migration | `daily_snapshots` + `daily_channel_snapshots` 表 |

**预估**：~450 行 Python
**模型路由**：Sonnet high（代码执行类）

### Tag B: 分析引擎层（依赖 Tag A）

| 任务 | 文件 | 说明 |
|------|------|------|
| B1 | `backend/core/decomposition_engine.py` | Laspeyres 三因素加法分解（总计 + 渠道级） |
| B2 | `backend/core/projection_engine.py` | 全月推算 + 客单价敏感性测试 |
| B3 | `backend/core/leverage_engine.py` | 收入杠杆矩阵（影响 × 可行性 × 紧迫度） |
| B4 | `backend/core/target_recommender.py` | 三档目标推荐（P25/P50/P75 × 季节系数） |
| B0 | 调研 | 三因素分解学术锚定（Laspeyres/LMDI 论文） |

**预估**：~500 行 Python
**模型路由**：B0 调研用 Opus high（判断类），B1-B4 用 Sonnet high（代码类）

### Tag C: API + 推送层（依赖 Tag B）

| 任务 | 文件 | 说明 |
|------|------|------|
| C1 | `backend/core/report_engine.py` | 11 区块统一组装 |
| C2 | `backend/api/report.py` | API 路由（daily/summary/comparison/dingtalk） |
| C3 | `scripts/dingtalk_report.py` | 钉钉核心摘要格式化 + 推送 |
| C4 | `backend/api/config.py` 扩展 | 三档目标推荐 API + Settings 口径目标 CRUD |

**预估**：~350 行 Python
**模型路由**：Sonnet high

### Tag D: 前端（依赖 Tag C 的 API 契约，可与 B/C 并行）

| 任务 | 文件 | 说明 |
|------|------|------|
| D1 | `frontend/app/[locale]/analytics/page.tsx` | 新页面骨架 + 11 区块布局 |
| D2 | `frontend/components/analytics/` | 11 个 Slide 组件 |
| D3 | `frontend/lib/types/report.ts` | TypeScript 类型定义（与后端 API 契约对齐） |
| D4 | `frontend/components/settings/TargetRecommender.tsx` | 三档目标选择器 |
| D5 | 导航更新 | NavSidebar 加 Analytics 入口 |

**预估**：~900 行 TypeScript
**模型路由**：Sonnet high

## 5. 依赖图 + 并行策略

```
B0(调研,Opus) ──────────────────────────┐
                                        ↓
A1→A4(数据层) ──→ B1→B4(分析层) ──→ C1→C4(API层)
      │                                   ↑
      └──→ D3(类型定义) → D1→D5(前端) ────┘
                    ↑
              API 契约文档（A/B 产出后 D 消费）
```

**并行窗口**：
- **Phase 1**（并行）：B0 调研 + A1-A4 数据层 + D3 类型定义
- **Phase 2**（并行）：B1-B4 分析层 + D1-D2 前端组件（用 mock API）
- **Phase 3**（串行）：C1-C4 API 组装 + D4-D5 前端收尾 + 联调

## 6. 11 区块计算规格

### 区块 1: 月度总览

```python
{
  "bm_pct": workday_progress,                    # 工作日进度
  "targets": {metric: target_value},              # 从 targets_override 读
  "actuals": {metric: actual_value},              # D1 直读
  "bm_efficiency": {metric: actual/target/bm},    # 效率进度
  "gap": {metric: bm_efficiency - 1.0}            # 目标 GAP
}
```

### 区块 2: 目标分解 + 各类缺口

```python
{
  "channel_targets": {"CC窄": 248, "SS窄": 73, ...},  # Settings 口径目标
  "gaps": {
    "revenue_gap": target_rev - actual_rev,
    "asp_gap": target_asp - actual_asp,
    "bill_gap": ceil(revenue_gap / actual_asp),
    "showup_gap": bill_gap / target_conv_rate,
    "appt_gap": showup_gap / target_attend_rate,
    "lead_gap": appt_gap / target_appt_rate,
    "channel_lead_gaps": {channel: target - actual for each}
  }
}
```

### 区块 3: 效率提升推演（复用 ScenarioEngine）

当前效率 → 目标效率 → 增量计算。已有 `ScenarioEngine.compute_scenario()`，扩展支持口径级。

### 区块 4: 效率不变-月底达标测算

```python
projected_reg = actual_reg / bm_pct
projected_appt = projected_reg * actual_appt_rate
projected_attend = projected_appt * actual_attend_rate
projected_paid = projected_attend * actual_paid_rate
projected_rev = projected_paid * actual_asp

# 敏感性：客单价每跌 $1 的影响
sensitivity = projected_paid * 1.0  # 每 $1 影响额
```

### 区块 5: 当月业绩贡献

```python
# D3 groupby 转介绍类型_新
for channel in [CC窄, SS窄, LP窄]:
    payments = sum(转介绍付费数)
    revenue = sum(总带新付费金额USD)
    asp = revenue / payments if payments > 0 else 0
其它 = total - CC窄 - SS窄 - LP窄
# 窄口小计 = CC + SS + LP
```

### 区块 6: MoM 增量归因

```python
# 7 指标 × 7 列
for metric in [revenue, reg, appt_rate, attend_rate, paid_rate, reg_to_pay, asp]:
    last_month = snapshot_service.get(month-1, metric)
    this_month = current(metric)
    target = targets(metric)
    delta = this_month - last_month
    delta_pct = delta / last_month
    vs_target = this_month/target - 1 if rate else this_month - target
    judgment = "↑" if delta > 0 and vs_target >= 0 else "↓" if delta < 0 else "→"
```

### 区块 7: 例子贡献 + 过程指标归因

D3 groupby 后每个口径的完整漏斗（注册/占比/预约率/出席率/付费率/注册付费率/付费数/占比/业绩/占比）。

### 区块 8: 增量归因分解（Laspeyres + LMDI 双轨）

**主公式：Laspeyres 加法分解**（展示用，运营直觉可读）
```python
# R = V × C × P (Revenue = Volume × Conversion × Price)
vol_delta = (reg_1 - reg_0) * conv_0 * asp_0           # 量贡献
conv_delta = reg_1 * (conv_1 - conv_0) * asp_0          # 率贡献
price_delta = reg_1 * conv_1 * (asp_1 - asp_0)          # 价贡献
residual = actual_delta - vol_delta - conv_delta - price_delta  # 交叉项
```

**校验公式：LMDI（Log Mean Divisia Index）**（零残差，Ang 2004 *Energy Policy*）
```python
from math import log
def L(a, b):  # Log Mean 权重函数
    return (a - b) / (log(a) - log(b)) if a != b else a

w = L(rev_1, rev_0)
vol_lmdi = w * log(reg_1 / reg_0)
conv_lmdi = w * log(conv_1 / conv_0)
price_lmdi = w * log(asp_1 / asp_0)
# 保证：vol_lmdi + conv_lmdi + price_lmdi == rev_1 - rev_0（精确，无残差）
```

**自动切换规则**：Laspeyres 残差 > 实际增量 3% → 前端自动展示 LMDI 结果并标注"本月采用 LMDI 精确分解"。

### 区块 9: 过程指标归因（收入杠杆矩阵）

```python
for channel in channels:
    for stage in [appt_rate, attend_rate, paid_rate]:
        gap = target_rate - actual_rate
        revenue_impact = compute_stage_impact(channel, stage, gap)
        feasibility = min(1.0, (historical_best - actual) / (target - actual))
        urgency = 1.5 if trend == "down" else 1.0 if "flat" else 0.7
        leverage_score = revenue_impact * feasibility * urgency
    bottleneck = max(stages, key=leverage_score)
    potential = "高潜力🟢" if score > avg and feasibility >= 0.7 else "待改善🟡" else "已饱和⚪"
```

### 区块 10: 渠道级业绩增量归因

每个渠道的 MoM 对比 + 核心驱动因素文案生成。

### 区块 11: 渠道三因素分解

对每个渠道独立执行区块 8 的 Laspeyres 分解。

## 7. SQLite Schema

```sql
-- 日快照（总计维度）
CREATE TABLE daily_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date DATE NOT NULL,          -- T-1 日期
    month_key TEXT NOT NULL,              -- 202603
    workday_index INTEGER,                -- 本月第N工作日
    registrations INTEGER,
    appointments INTEGER,
    attendance INTEGER,
    payments INTEGER,
    revenue_usd REAL,
    asp REAL,
    appt_rate REAL,
    attend_rate REAL,
    paid_rate REAL,
    reg_to_pay_rate REAL,
    bm_pct REAL,                          -- 工作日进度
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(snapshot_date)
);

-- 日快照（口径维度）
CREATE TABLE daily_channel_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date DATE NOT NULL,
    month_key TEXT NOT NULL,
    channel TEXT NOT NULL,                 -- CC窄口/SS窄口/LP窄口/宽口/其它
    registrations INTEGER,
    appointments INTEGER,
    attendance INTEGER,
    payments INTEGER,
    revenue_usd REAL,
    asp REAL,
    appt_rate REAL,
    attend_rate REAL,
    paid_rate REAL,
    reg_to_pay_rate REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(snapshot_date, channel)
);

-- 月度归档（月末自动从日快照聚合）
CREATE TABLE monthly_archives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month_key TEXT NOT NULL,               -- 202603
    channel TEXT NOT NULL,                 -- total/CC窄口/SS窄口/LP窄口/宽口/其它
    final_registrations INTEGER,
    final_appointments INTEGER,
    final_attendance INTEGER,
    final_payments INTEGER,
    final_revenue_usd REAL,
    final_asp REAL,
    workdays_total INTEGER,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month_key, channel)
);
```

## 8. 环比计算规格

| 维度 | 子维度 A（累计到 T-1） | 子维度 B（滚动窗口） |
|------|----------------------|---------------------|
| **日** | T-1 vs T-2 | — |
| **周** | 本周一→T-1 vs 上周一→上周同天 | 近 7 日 sum vs 上 7 日 sum |
| **月** | 本月 1 日→T-1 vs 上月 1 日→上月同日 | 近 30 日 sum vs 上 30 日 sum |
| **年** | 本年 1/1→T-1 vs 去年 1/1→去年同日 | 近 365 日 sum vs 上 365 日 sum |

**数据源**：`daily_snapshots` + `daily_channel_snapshots` 表。
**输出格式**：每个维度返回 `{current, previous, delta, delta_pct, judgment}`。

## 9. 三档目标推荐规格

**输入**：`monthly_archives` 表 ≥ 3 个月数据
**算法**：

```python
historical = [monthly_archives for last N months]
seasonal_factor = get_seasonal_factor(target_month)  # 可选

conservative = {
    "registrations": percentile(historical.reg, 25) * seasonal_factor,
    "payments": percentile(historical.paid, 25) * seasonal_factor,
    "revenue": percentile(historical.rev, 25) * seasonal_factor,
    "conv_rates": min(historical.rates),  # 最低月转化率
}
moderate = {... percentile 50 ...}
aggressive = {... percentile 75 * growth_slope ...}

# 口径拆分
for tier in [conservative, moderate, aggressive]:
    for channel in channels:
        tier.channel_targets[channel] = tier.total * historical_channel_share[channel]
```

**输出**：Settings 页面 3 个卡片，用户点选 → 自动填充 `targets_override.json`。

## 10. 钉钉摘要格式

```markdown
📊 转介绍日报 | 2026-03-25 (BM 78%)

**月度进度**
注册 906/917 (98.8%) | 付费 184/211 (87.2%) | 业绩 $175K/$200K (87.4%)

**效率达标**
预约率 81.5%/77% ✅ | 出席率 63.6%/66% ⚠️-2.4% | 转化率 20.3%/23% ⚠️-2.7%

**瓶颈 TOP1**: 出席付费率 (CC窄) — 达标可增收 $12,340
**环比**: 业绩 +$61K (+53.7%) | 注册 +229 (+33.8%)

👉 完整报告: http://localhost:3100/analytics
```

## 11. 前端页面布局

```
/analytics 页面
├── 顶部: BM 进度条 + 日期选择器
├── Row 1: 月度总览卡片组 (区块1) + 缺口仪表盘 (区块2)
├── Row 2: 推演对比表 (区块3) + 达标测算表 (区块4)
├── Row 3: 业绩贡献饼图+表 (区块5) + MoM 归因表 (区块6)
├── Row 4: 例子归因全表 (区块7)
├── Row 5: 增量分解瀑布图 (区块8) + 漏斗归因热力图 (区块9)
└── Row 6: 渠道归因表 (区块10) + 三因素分解表 (区块11)
```

**组件清单（11 个 Slide）**：

| 组件 | 区块 | 复杂度 |
|------|------|:------:|
| `MonthlyOverviewSlide` | 1 | 中 |
| `GapDashboardSlide` | 2 | 中 |
| `ScenarioCompareSlide` | 3 | 低（复用） |
| `ProjectionSlide` | 4 | 中 |
| `RevenueContributionSlide` | 5 | 中 |
| `MomAttributionSlide` | 6 | 高 |
| `LeadAttributionSlide` | 7 | 高 |
| `DecompositionWaterfallSlide` | 8 | 高（瀑布图） |
| `FunnelLeverageSlide` | 9 | 高（热力图） |
| `ChannelRevenueSlide` | 10 | 中 |
| `ChannelThreeFactorSlide` | 11 | 中 |

## 12. 风险预判

| 风险 | 影响 | 缓解 |
|------|------|------|
| D3 `转介绍类型_新` 列值与预期不符 | 口径聚合失败 | Phase 1 先 curl 验证实际值 |
| 历史数据不足 3 个月 | 三档推荐无法生成 | 降级为手动目标 + 提示"需积累 N 月数据" |
| 三因素残差过大（>5%） | 分解失效 | 切换 LMDI 对数分解（残差=0） |
| 前端 11 个 Slide 超 Sonnet context | 部分组件缺失 | 拆为 2 批 MK（每批 5-6 组件） |

## 13. Token 预算

| Tag | MK 数 | 预算/MK | 总预算 |
|-----|:-----:|:------:|:------:|
| B0 调研 | 1 (Opus) | 50K | 50K |
| A 数据层 | 2 | 100K | 200K |
| B 分析层 | 2 | 100K | 200K |
| C API+推送 | 1 | 100K | 100K |
| D 前端 | 3 | 100K | 300K |
| QA | 1 | 50K | 50K |
| **合计** | **10** | | **900K** |

## 14. 文件变更范围

**新建（~18 文件）**:
- `backend/core/`: daily_snapshot_service.py, channel_funnel_engine.py, comparison_engine.py, decomposition_engine.py, projection_engine.py, leverage_engine.py, target_recommender.py, report_engine.py
- `backend/api/report.py`
- `scripts/dingtalk_report.py`
- `frontend/app/[locale]/analytics/page.tsx`
- `frontend/components/analytics/`: 11 个 Slide 组件
- `frontend/lib/types/report.ts`
- `frontend/components/settings/TargetRecommender.tsx`

**修改（~5 文件）**:
- `backend/core/snapshot_store.py` — 新增 daily_snapshots 表
- `backend/api/config.py` — 三档目标 API
- `frontend/components/layout/NavSidebar.tsx` — Analytics 入口
- `scripts/dingtalk_daily.py` — 集成报告摘要
- `projects/referral/config.json` — 口径目标 schema

## 15. Team 结构

```
主对话（Opus medium，编排）
  └─ TL-m33（Opus medium，协调 3 Phase）
       ├─ Phase 1（并行）
       │   ├─ mk-research（Opus high，三因素调研）
       │   ├─ mk-data-1（Sonnet high，A1+A2 快照+聚合）
       │   ├─ mk-data-2（Sonnet high，A3+A4 环比+migration）
       │   └─ mk-types（Sonnet high，D3 类型定义）
       ├─ Phase 2（并行）
       │   ├─ mk-engine-1（Sonnet high，B1+B2 分解+推算）
       │   ├─ mk-engine-2（Sonnet high，B3+B4 瓶颈+目标）
       │   ├─ mk-fe-1（Sonnet high，D1+区块1-5 组件）
       │   └─ mk-fe-2（Sonnet high，区块6-11 组件）
       └─ Phase 3（串行）
            ├─ mk-api（Sonnet high，C1-C4 API+推送）
            └─ mk-qa（Opus high，端到端验证）
```

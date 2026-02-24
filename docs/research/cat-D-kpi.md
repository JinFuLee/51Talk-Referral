# D 类 KPI / 北极星指标 — 数据价值调研

> 调研日期：2026-02-21 | 调研员：mk-kpi-sonnet
> 数据来源：`backend/core/loaders/kpi_loader.py` + `backend/core/analysis_engine_v2.py`

---

## 总览

D 类共 5 个数据源，是整个系统最核心的**效率指标层**：
- **D1** 是唯一直连北极星指标（24H打卡率）的 CC 个人粒度数据源
- **D2/D3/D4** 构成围场三视图（市场/转介绍/合并），天然形成对比维度
- **D5** 是打卡行为的行为拆解视图（已打卡 vs 未打卡参与率差异）

D 类与 F5（外呼）、A4（个人达成）、E3（订单）联动，形成 `CC 360°` 复合画像，
也是影响链引擎（M13）`checkin_rate` 链路的数据根基。

---

## D1：BI-北极星指标_当月24H打卡率_D-1

### 基本信息
| 字段 | 说明 |
|------|------|
| 文件目录 | `input/BI-北极星指标_当月24H打卡率_D-1/` |
| 更新频率 | T-1 日更 |
| 粒度 | CC 个人级 + 团队级 + 总计 |

### 字段清单（已加载）
| 字段名 | 类型 | 含义 |
|--------|------|------|
| `cc_name` | str | CC 姓名 |
| `team` | str | 所属团队 |
| `checkin_24h_rate` | float (0~1) | 北极星：24H 打卡率 |
| `checkin_24h_target` | float (0~1) | 打卡率目标 |
| `achievement_rate` | float (0~1) | 达成率 = actual/target |
| `referral_participation` | int | 转介绍参与学员总数 |
| `referral_participation_checked` | int | 已打卡的参与学员 |
| `referral_participation_unchecked` | int | 未打卡的参与学员 |
| `checkin_multiplier` | float | 打卡倍率 |
| `referral_coefficient` | float | 带新系数 |
| `conversion_ratio` | float | 注册→付费转化率 |

### 当前利用情况
- **已用**：`_analyze_summary()` 提取 `avg_checkin_24h_rate` + `target`，计算影响链
- **已用**：`_analyze_cc_360()` 读 `by_cc` 与 F5/A4/E3 联动构建 CC 画像
- **已用**：`_analyze_cc_ranking()` 效率维度 4% 权重打卡率
- **已用**：`_analyze_anomalies()` 检测个人打卡率 2σ 异常
- **已用**：`_analyze_checkin_impact()` 与 D5 联动分析打卡→带新因果

### 价值洼地（未充分利用）
1. **`achievement_rate` 维度从未展示**：知道团队均值不够，CC 个人达标率分布是激励管理的核心
2. **`referral_coefficient` CC 间分布**：带新系数标准差大，高/低系数 CC 的行为差异是最佳实践提炼空间
3. **`checkin_multiplier` 打卡倍率**：当前仅聚合不展示，按团队对比倍率差异可发现激励执行力差距

### 可构建图表/交互

#### 图表 1：CC 打卡率达标分布 — RadialBar / 水平排名条
- **类型**：`BarChart` + `ReferenceLine`（目标线）横向排列，按 `achievement_rate` 排序
- **数据**：`by_cc` 列表，每行 `{cc_name, checkin_24h_rate, checkin_24h_target, achievement_rate}`
- **交互**：点击 CC 行 → 展开该 CC 带新系数/转化率详情 mini-modal
- **价值**：一眼识别打卡落后 CC，触发 5-Why 根因卡片
- **Recharts 实现**：
  ```tsx
  <BarChart layout="vertical" data={byCC}>
    <Bar dataKey="checkin_24h_rate" fill="#6366f1" />
    <ReferenceLine x={target} stroke="#ef4444" strokeDasharray="4 4" label="目标" />
  </BarChart>
  ```

#### 图表 2：北极星 Gauge — 团队级实时表盘
- **类型**：`RadialBarChart`（单指针 Gauge 变体）
- **数据**：`summary.avg_checkin_24h_rate` vs `summary.target`
- **交互**：颜色随状态变化（绿/黄/红），下方显示"较目标差 X 个百分点"
- **价值**：Dashboard 首屏核心卡片，管理层 5 秒感知状态
- **Recharts 实现**：
  ```tsx
  <RadialBarChart innerRadius="60%" outerRadius="90%">
    <RadialBar dataKey="value" background />
  </RadialBarChart>
  ```

#### 图表 3：打卡率 vs 带新系数散点图 — 因果可视化
- **类型**：`ScatterChart`
- **数据**：每个 CC 一个点，X = `checkin_24h_rate`，Y = `referral_coefficient`
- **交互**：Hover tooltip 显示 CC 名 + 两指标值；划分四象限（高打卡高带新/低打卡低带新）
- **价值**：直观证明"打卡与带新系数正相关"假设，说服 CC 主动打卡
- **Recharts 实现**：
  ```tsx
  <ScatterChart>
    <Scatter data={byCC} fill="#8884d8">
      <LabelList dataKey="cc_name" position="top" />
    </Scatter>
    <ReferenceLine x={0.8} stroke="#94a3b8" label="高打卡区" />
  </ScatterChart>
  ```

#### 图表 4（奖励）：CC 打卡率 Sparkline Trend（需快照数据）
- **类型**：`LineChart` mini sparkline（宽 120px × 高 40px）
- **数据**：从 `snapshot_store` 按 CC 查历史 `checkin_24h_rate`
- **交互**：嵌入 CC 排名表行尾，快速判断趋势方向
- **价值**：静态数字变为趋势线，帮助识别持续下滑 CC

---

## D2：BI-KPI_市场-本月围场数据_D-1

### 基本信息
| 字段 | 说明 |
|------|------|
| 文件目录 | `input/BI-KPI_市场-本月围场数据_D-1/` |
| 更新频率 | T-1 日更 |
| 粒度 | 围场段级（0-30/31-60/61-90/91-180/181+）+ 总计 |

### 字段清单（已加载）
| 字段名 | 类型 | 含义 |
|--------|------|------|
| `enclosure` | str | 围场段标签 |
| `conversion_rate` | float | 市场渠道注册→付费转化率 |
| `participation_rate` | float | 参与率 |
| `ratio` | float | 综合比率 |
| `active_students` | int | 当前活跃学员数 |
| `monthly_b_registrations` | int | 本月 B 端注册数 |
| `monthly_b_paid` | int | 本月 B 端付费数 |
| `monthly_active_referrers` | int | 本月活跃转介绍人 |
| `total_b_registrations` | int | 累计 B 端注册数 |

### 当前利用情况
- **部分利用**：`_analyze_enclosure_cross()` 读取 `enclosure_referral`（D3），D2 市场维度**未参与跨源联动**
- **未利用**：`monthly_active_referrers`（活跃推荐人数）是理解市场渠道质量的关键，当前完全忽略
- **未利用**：`total_b_registrations` 累计数据可计算存量学员效率

### 价值洼地
1. **市场 vs 转介绍围场对比**：D2 vs D3 按围场段做双维度 overlay，揭示两个渠道在哪个围场段表现差异最大
2. **活跃转介绍人率**：`monthly_active_referrers / active_students` = 动员率，是围场运营健康度核心指标
3. **累计注册漏斗**：`total_b_registrations` / `active_students` = 历史转化沉淀率，识别"已榨干"围场

### 可构建图表/交互

#### 图表 1：市场围场多维雷达图
- **类型**：`RadarChart`（5 个围场段各为轴）
- **数据**：每个轴显示 `conversion_rate`，D2 市场数据
- **交互**：切换维度（转化率/参与率/活跃推荐人率），多维度评估各围场段
- **价值**：比单柱更直观识别哪个围场段综合质量最高

#### 图表 2：市场围场活跃推荐人动员率条形图
- **类型**：`BarChart`
- **数据**：`[enclosure, mobilization_rate = monthly_active_referrers/active_students]` 5 个围场段
- **交互**：颜色编码（>30% 绿，15-30% 黄，<15% 红）
- **价值**：量化哪个围场段学员"愿意推荐"比例，指导激励策略

#### 图表 3：围场段学员规模气泡图（与 D3 对比）
- **类型**：`ScatterChart` 气泡
- **数据**：X = `conversion_rate`，Y = `participation_rate`，气泡大小 = `active_students`
- **市场(D2) vs 转介绍(D3) 用不同颜色**
- **价值**：一张图看清两个渠道在效率-规模空间的位置

---

## D3：BI-KPI_转介绍-本月围场数据_D-1

### 基本信息
| 字段 | 说明 |
|------|------|
| 文件目录 | `input/BI-KPI_转介绍-本月围场数据_D-1/` |
| 更新频率 | T-1 日更 |
| 粒度 | 围场段级 + 总计 |

### 字段清单
与 D2 完全相同结构（`enclosure`, `conversion_rate`, `participation_rate`, `ratio`, `active_students`, `monthly_b_registrations`, `monthly_b_paid`, `monthly_active_referrers`, `total_b_registrations`），但代表**转介绍渠道**数据。

### 当前利用情况
- **已用（核心）**：`_analyze_enclosure_cross()` 使用 D3 (`enclosure_referral`) 与 F8/A2 联动
- **已渲染**：`/biz/enclosure` 页面展示 ROI 热力图 + 跟进覆盖率柱状图
- **未利用**：`monthly_active_referrers`、`total_b_registrations` 同 D2 问题
- **未联动**：D3 与 D2 的围场段对比（本项目核心业务差异分析）

### 价值洼地
1. **D2 vs D3 围场对比仪表板**：同一围场段，市场学员 vs 转介绍学员的转化率差距，量化两类渠道的质量差
2. **转介绍渠道围场最优段识别**：动员率 × 转化率 = 综合产能，精确定位"明星围场段"
3. **`ratio` 字段未解读**：推测为注册/有效学员比，尚未展示或用于决策

### 可构建图表/交互

#### 图表 1：市场 vs 转介绍围场双 Bar 对比（核心差异化图表）
- **类型**：`BarChart` grouped（每围场段 2 条柱：市场蓝/转介绍紫）
- **数据**：合并 D2 + D3，`[enclosure, market_conv, referral_conv]`
- **交互**：切换维度（转化率/参与率/月活推荐人），Tooltip 显示绝对差值和相对差
- **价值**：揭示哪个围场段转介绍渠道比市场渠道显著更优，优化资源分配
- **Recharts 实现**：
  ```tsx
  <BarChart data={mergedEnclosure}>
    <Bar dataKey="market_conv" fill="#3b82f6" name="市场" />
    <Bar dataKey="referral_conv" fill="#8b5cf6" name="转介绍" />
  </BarChart>
  ```

#### 图表 2：转介绍围场阶梯衰减折线 + 目标线
- **类型**：`LineChart` + `ReferenceLine`
- **数据**：5 个围场段，X = 围场段，Y = `conversion_rate`（天然递减曲线）
- **交互**：ReferenceLine 标注每段目标转化率，超出标绿低于标红
- **价值**：直观验证"围场越久转化率越低"的规律，识别哪段衰减超出正常速率

#### 图表 3：月活推荐人 × 付费人数散点（围场运营效率）
- **类型**：`ScatterChart`
- **数据**：X = `monthly_active_referrers`，Y = `monthly_b_paid`，标注围场段名
- **价值**：动员率高的围场段不一定付费产出高（发现运营质量问题）

---

## D4：BI-KPI_市场&转介绍-本月围场数据_D-1

### 基本信息
| 字段 | 说明 |
|------|------|
| 文件目录 | `input/BI-KPI_市场&转介绍-本月围场数据_D-1/` |
| 更新频率 | T-1 日更 |
| 粒度 | 围场段级 + 总计（合并两个渠道） |

### 字段清单
同 D2/D3 结构，代表市场 + 转介绍**合并**后的围场数据。

### 当前利用情况
- **完全未利用**：`kpi_loader.load_all()` 已加载为 `enclosure_combined`，但 `analysis_engine_v2.py` 中没有任何方法读取该 key
- **`enclosure_cross` 方法读取的是 `enclosure_referral`（D3）**，D4 是独立视图未被引用

### 价值洼地（最大洼地之一）
1. **合并视图是管理层最关注的整体围场健康度**：运营层看 D2/D3 对比，管理层看 D4 合并总体，当前两者都缺管理层视图
2. **D4 可做围场段 Stacked Area Chart**：`active_students` 按围场段堆叠，展示学员存量结构，追踪每月存量变化
3. **D4 total 字段**：合并总的 `active_students`/`monthly_b_paid` 是核心业务数字，当前 summary 没有引用

### 可构建图表/交互

#### 图表 1：围场存量结构堆叠面积图（配合快照数据）
- **类型**：`AreaChart` stacked
- **数据**：历史快照中每月 D4 `active_students` 按围场段堆叠
- **交互**：Hover 显示每段学员数 + 占比，点击段 → 跳转该围场段详情
- **价值**：追踪学员存量向老围场迁移的速度，识别"学员老化"趋势

#### 图表 2：合并围场漏斗（Sankey / Funnel 变体）
- **类型**：`FunnelChart`（Recharts）或自定义 Sankey
- **数据**：D4 各围场段 `active_students` → `monthly_active_referrers` → `monthly_b_registrations` → `monthly_b_paid`
- **价值**：三级漏斗可视化，识别哪一步骤损失最大

#### 图表 3：D4 总量 KPI 卡（管理层首屏）
- **类型**：`BigMetricCard`（复用现有组件）
- **数据**：D4 `total.active_students`, `total.monthly_b_paid`, `total.conversion_rate`
- **价值**：补充 summary 卡片缺失的围场总览数字

---

## D5：BI-KPI_当月转介绍打卡率_D-1

### 基本信息
| 字段 | 说明 |
|------|------|
| 文件目录 | `input/BI-KPI_当月转介绍打卡率_D-1/` |
| 更新频率 | T-1 日更 |
| 粒度 | CC 个人级 + 团队级 + 总计 |

### 字段清单（已加载）
| 字段名 | 类型 | 含义 |
|--------|------|------|
| `cc_name` | str | CC 姓名 |
| `team` | str | 所属团队 |
| `checkin_rate` | float | 月度打卡率（区别于 D1 的 24H 打卡率） |
| `referral_participation_total` | int | 总参与转介绍学员数 |
| `referral_participation_checked` | int | 已打卡的参与学员 |
| `referral_participation_unchecked` | int | 未打卡的参与学员 |
| `checkin_multiplier` | float | 打卡倍率 |
| `referral_coefficient_total` | float | 带新系数（总体） |
| `referral_coefficient_checked` | float | 打卡组带新系数 |
| `referral_coefficient_unchecked` | float | 未打卡组带新系数 |
| `referral_coefficient_multiplier` | float | 带新系数倍率 |
| `conversion_ratio` | float | 转化率 |

### 当前利用情况
- **已用**：`_analyze_checkin_impact()` 读 `by_cc` 计算打卡/未打卡参与率差异 + 带新系数倍率
- **已用**：`_analyze_cc_ranking()` 中读取 `referral_participation_checked/total` 计算参与率
- **未利用**：`referral_coefficient_checked` vs `referral_coefficient_unchecked` 的 CC 粒度对比
- **未利用**：`checkin_multiplier` 和 `referral_coefficient_multiplier` 从未展示

### 价值洼地
1. **已打卡/未打卡 CC 双组对比**：D5 是唯一有**行为分组**的数据（打卡组 vs 未打卡组），可做 A/B 对比面板
2. **带新系数倍率 `referral_coefficient_multiplier`**：打卡使带新系数提升 X 倍——这是说服 CC 打卡的最强因果论据，当前完全未展示
3. **月度打卡率 vs 24H 打卡率**：D5 `checkin_rate` 和 D1 `checkin_24h_rate` 是两个指标，可构建"标准打卡 vs 即时打卡"对比，前者看行为习惯，后者看即时激励效果

### 可构建图表/交互

#### 图表 1：打卡 vs 未打卡 CC 参与率 A/B 对比（现有组件增强版）
- **类型**：`BarChart` grouped 或现有 `CheckinImpactCard` 升级
- **数据**：D5 `by_cc` 按 `checkin_rate >= 0.8` 分组，计算两组均值
  - 打卡组：avg `referral_participation_checked/total`
  - 未打卡组：avg `referral_participation_unchecked/total`
- **交互**：显示倍率徽章（如"打卡组参与率高 5x"），点击 → 展示个人明细
- **价值**：当前 `CheckinImpactCard` 组件已有框架，补充个人粒度下钻即可

#### 图表 2：带新系数倍率可视化（动态说服工具）
- **类型**：`ComposedChart`（柱+标注）
- **数据**：`referral_coefficient_checked` vs `referral_coefficient_unchecked`，标注 `referral_coefficient_multiplier`
- **交互**：显示"如果全员打卡，预计多带新 X 人 / 增加 $Y 收入"（连接影响链引擎）
- **价值**：激励工具，不只是数据展示，是管理行动的量化依据
- **Recharts 实现**：
  ```tsx
  <ComposedChart data={comparisonData}>
    <Bar dataKey="coefficient_checked" fill="#10b981" name="打卡组" />
    <Bar dataKey="coefficient_unchecked" fill="#94a3b8" name="未打卡组" />
    <LabelList content={<MultiplierBadge />} />
  </ComposedChart>
  ```

#### 图表 3：CC 月度打卡率 vs 24H 打卡率双维散点
- **类型**：`ScatterChart`
- **数据**：Join D1 + D5，每个 CC 一点，X = D1 `checkin_24h_rate`，Y = D5 `checkin_rate`
- **意义**：X 轴=即时打卡行为，Y 轴=月度打卡习惯，识别"只在激励期打卡"的 CC 和"长期习惯好"的 CC
- **价值**：识别激励依赖型 vs 内化型两类 CC 的运营策略差异

---

## 跨源联动分析

### 已实现联动
| 联动 | 数据源 | 方法 | 状态 |
|------|--------|------|------|
| D1 × F5 × A4 × E3 | CC 360° 画像 | `_analyze_cc_360()` | 已实现 |
| D3 × F8 × A2 | 围场交叉分析 | `_analyze_enclosure_cross()` | 已实现 |
| D1 × D5 | 打卡→带新因果 | `_analyze_checkin_impact()` | 已实现 |
| D1 → summary | 打卡率影响链 | `_analyze_summary()` + impact_chain | 已实现 |

### 新增联动建议

#### 联动 1：D2 × D3 围场对比（高优先级）
- **新 API**：`GET /api/analysis/enclosure-compare`
- **返回**：每围场段 `{enclosure, market_conv, referral_conv, market_students, referral_students, conv_gap}`
- **前端**：`EnclosureCompareChart`（双 Bar）
- **实现位置**：`_analyze_enclosure_cross()` 扩展，增加 D2 数据读取

#### 联动 2：D4 × 快照 围场存量趋势
- **数据**：从 snapshot_store 查历史 D4 数据，按月聚合围场段分布
- **前端**：`EnclosureStackedArea`（堆叠面积）
- **价值**：监控学员存量"向高龄围场迁移"速度

#### 联动 3：D1 × D5 CC 粒度打卡双维评估
- **数据**：Join `north_star_24h.by_cc` + `checkin_rate_monthly.by_cc`
- **前端**：双指标散点图，象限分析
- **新字段**：`checkin_composite = (D1_checkin_24h_rate * 0.6 + D5_checkin_rate * 0.4)`

#### 联动 4：D5 带新系数倍率 × 影响链
- **扩展现有影响链**：将 `referral_coefficient_multiplier` 从 D5 注入 impact_chain
- **效果**：`checkin_rate gap → lost_checkin_students → lost_coefficient → lost_registrations → $loss`
- **更精准**的 checkin 影响链计算

---

## 前端规格建议

### 新页面：`/ops/kpi-north-star`（D1 专属页）

```
布局：
┌─────────────────────────────────────────────────────┐
│  北极星 24H 打卡率 — 实时看板                          │
├─────────────────┬───────────────────────────────────┤
│  Gauge 大表盘   │  Team 均值对比（BarChart）          │
│  XX.X% vs 目标  │                                    │
├─────────────────┴───────────────────────────────────┤
│  CC 个人排名（带达标/未达标徽章）                       │
│  [打卡率] [带新系数] [转化率] 三列可排序               │
├───────────────────────────────────────────────────── │
│  打卡率 vs 带新系数散点（因果可视化）                   │
└─────────────────────────────────────────────────────┘
```

**所需新组件**：
- `CheckinGauge` — RadialBarChart + 大数字显示
- `CCCheckinTable` — 可排序表格，含 achievement_rate 徽章
- `CheckinCoefScatter` — 打卡率 × 带新系数散点

### 增强页面：`/biz/enclosure`（D2/D3/D4 扩充）

```
现有：围场 ROI 热力图 + 跟进覆盖率柱状图

新增 Tab 1：市场 vs 转介绍对比
└── EnclosureCompareChart（D2 × D3 双 Bar）

新增 Tab 2：合并围场总览（D4）
└── D4 BigMetricCard + 漏斗图

新增 Tab 3：围场动员率分析
└── 活跃推荐人率 BarChart（D2 + D3）
```

### 增强组件：`biz/CheckinImpactCard`（D5 增强）

现有组件展示打卡/未打卡参与率和带新系数倍率，建议：
1. 增加 `referral_coefficient_multiplier` 展示（"打卡使带新系数高 X 倍"）
2. 增加 "若全员达到打卡目标，预计多带新 N 人" 动态计算

---

## 后端规格建议

### 新 API 端点

| 端点 | 方法 | 数据源 | 描述 |
|------|------|--------|------|
| `GET /api/analysis/north-star` | GET | D1 | CC 级别 24H 打卡率详情 + team 聚合 |
| `GET /api/analysis/enclosure-compare` | GET | D2 + D3 | 市场 vs 转介绍围场对比 |
| `GET /api/analysis/enclosure-combined` | GET | D4 | 合并围场总览 + 漏斗 |
| `GET /api/analysis/checkin-ab` | GET | D1 + D5 | CC 双维打卡率 + 带新系数 A/B |

### 新分析方法（`analysis_engine_v2.py`）

```python
def _analyze_north_star_detail(self) -> dict:
    """D1 完整展示：by_cc 打卡率排名 + 带新系数散点数据"""
    d1 = self.data.get("kpi", {}).get("north_star_24h", {})
    by_cc = d1.get("by_cc", []) or []
    # 按 achievement_rate 排序，加达标标记
    for r in by_cc:
        r["is_achieved"] = (r.get("checkin_24h_rate") or 0) >= (r.get("checkin_24h_target") or 0.6)
    return {
        "by_cc": sorted(by_cc, key=lambda x: x.get("checkin_24h_rate") or 0, reverse=True),
        "by_team": d1.get("by_team", []),
        "summary": d1.get("summary", {}),
    }

def _analyze_enclosure_compare(self) -> dict:
    """D2 × D3 围场对比"""
    d2 = self.data.get("kpi", {}).get("enclosure_market", {})
    d3 = self.data.get("kpi", {}).get("enclosure_referral", {})
    enc_order = ["0-30", "31-60", "61-90", "91-180", "181+"]
    d2_map = {r["enclosure"]: r for r in (d2.get("by_enclosure", []) or [])}
    d3_map = {r["enclosure"]: r for r in (d3.get("by_enclosure", []) or [])}
    comparison = []
    for enc in enc_order:
        m = d2_map.get(enc, {})
        r = d3_map.get(enc, {})
        comparison.append({
            "enclosure": enc,
            "market_conv": m.get("conversion_rate"),
            "referral_conv": r.get("conversion_rate"),
            "market_students": m.get("active_students"),
            "referral_students": r.get("active_students"),
            "market_mobilization": _safe_div(m.get("monthly_active_referrers"), m.get("active_students")),
            "referral_mobilization": _safe_div(r.get("monthly_active_referrers"), r.get("active_students")),
        })
    return {"comparison": comparison}
```

---

## 优先级排序

| 优先级 | 功能 | 数据源 | 预计影响 |
|--------|------|--------|---------|
| P0 | D1 CC 打卡率排名 Bar + 达标徽章 | D1 | 每日运营必看，管理 CC 打卡 |
| P0 | D2 vs D3 围场对比双 Bar | D2 × D3 | 揭示渠道质量差异，指导资源分配 |
| P1 | 北极星 Gauge 仪表盘 | D1 | Dashboard 首屏核心指标 |
| P1 | D5 带新系数倍率动态展示 | D1 × D5 | 激励工具，说服 CC 打卡 |
| P1 | D4 合并围场漏斗 + 总量卡 | D4 | 管理层围场整体健康度 |
| P2 | 打卡率 vs 带新系数散点 | D1 | 因果可视化，战略汇报 |
| P2 | D1 × D5 双维打卡散点 | D1 × D5 | 识别习惯型 vs 激励型 CC |
| P3 | 围场存量堆叠面积（需快照） | D4 × 快照 | 长期趋势，需历史数据积累 |

---

## 技术债

| 问题 | 位置 | 影响 |
|------|------|------|
| D4 `enclosure_combined` 已加载但无任何方法消费 | `analysis_engine_v2.py` | 数据浪费，管理层缺合并视图 |
| D2 市场围场完全未参与跨源联动 | `_analyze_enclosure_cross()` | 单渠道视角，缺对比价值 |
| `monthly_active_referrers` 字段从未展示 | D2/D3/D4 loader | 动员率是关键健康指标 |
| `referral_coefficient_multiplier` (D5) 未展示 | kpi_loader D5 | 最强打卡激励论据未用 |
| D1 `achievement_rate` 个人达标率未在前端展示 | KPI 北极星页面 | 管理层无法快速识别落后 CC |

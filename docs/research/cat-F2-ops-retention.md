# F 类 Operations 后 5 源（F7-F11）面板价值调研报告

**调研日期**: 2026-02-21
**负责人**: mk-ops-retention-sonnet
**数据来源**: `backend/core/loaders/ops_loader.py` + `backend/core/analysis_engine_v2.py` + 前端页面实现

---

## 概览

| 源 ID | 子目录名称 | 频率 | 解析方法 | 当前利用深度 |
|-------|-----------|------|---------|-------------|
| F7 | 宣宣_付费用户围场当月跟进明细_D-1 | D-1 | `_load_paid_user_followup` | 浅（仅 coverage 汇总） |
| F8 | 宣萱_不同围场月度付费用户跟进_D-1 | D-1 | `_load_enclosure_monthly` | 中（围场交叉分析 enclosure_cross） |
| F9 | 宣萱_月度付费用户跟进_D-1 | D-1 | `_load_monthly_paid` | 浅（仅 CC 排名过程指标） |
| F10 | 宣萱_首次体验课课前课后跟进_D-1 | D-1 | `_load_trial_class` | 中（体验课页面 ops/trial） |
| F11 | 宣萱_明细表-泰国课前外呼覆盖_D-1 | D-1 | `_load_pre_class_outreach` | 中（summary + by_lead_type） |

---

## 源 F7: 付费用户围场当月跟进明细

### 频率
D-1（每日更新）

### 字段清单
来源：`_load_paid_user_followup` 解析结果

| 字段 | 类型 | 说明 |
|------|------|------|
| `team` | str | CC 所属组 |
| `cc_name` | str | 跟进 CC 姓名 |
| `student_id` | int | 学员 ID（唯一键） |
| `first_paid_date` | str (YYYY-MM-DD) | 首次付费日期（用于计算围场） |
| `monthly_called` | int | 当月拨打次数 |
| `monthly_connected` | int | 当月接通次数 |
| `monthly_effective` | int | 当月有效通话次数（总时长） |
| `monthly_effective_count` | int | 有效通话计数 |

聚合维度：`by_cc`（每 CC 的 total_students/monthly_called/monthly_connected/monthly_effective）、`by_team`、`summary`

### 当前利用
- `_analyze_outreach()`：仅取 `summary.total_students` + `summary.total_monthly_called` → 计算 `paid_followup_coverage`，作为一个汇总指标透出
- `_analyze_cc_ranking()`：`by_cc` 中的 `monthly_called` 用作过程指标 `post_paid_followup`（权重 3%）
- 前端：在 `ops/outreach` 页面仅作为 `paid_followup.coverage` 一行数字展示，**无任何图表**

### 价值洼地
- `first_paid_date` → 可推算围场段（0-30/31-60/...），**但当前完全未用**
- `monthly_called` vs `monthly_connected` → 接通率尚未展示
- CC 级别的跟进强度分布（每 CC 服务多少学员、跟进密度如何）完全未展示
- 跟进"零次"学员（monthly_called=0）= 流失风险学员，当前未识别

### 可构建图表/交互（≥3）

1. **CC × 付费用户跟进强度热力图**
   类型：Heatmap（`ScatterChart` + 自定义 Cell）
   数据映射：X 轴 = CC 姓名，Y 轴 = 围场段（由 first_paid_date 推算），色深 = monthly_effective_count
   交互：hover 显示「CC A 在 31-60 围场有 N 个学员，月均有效跟进 X 次」；click 下钻到学员明细
   业务价值：识别哪个 CC 在哪个围场跟进最密集，对比 ROI 指数决定资源分配

2. **付费用户跟进覆盖漏斗**
   类型：`FunnelChart` / `BarChart`（横向）
   数据映射：总学员 → 当月被拨打 → 被接通 → 有效通话（逐层转化）
   交互：hover 显示各层人数 + 转化率；支持按 CC 组筛选
   业务价值：量化「付费用户触达质量」，识别拨打接通率低的 CC

3. **零跟进风险学员预警列表**
   类型：Table（带排序/筛选）
   数据映射：monthly_called=0 的 student_id，关联 first_paid_date 推算围场，按围场价值排序
   交互：点击学员 → 显示最近一次跟进时间（关联 F8）；按「围场价值 × 0跟进天数」排序
   业务价值：直接产出「今日需紧急跟进名单」，防止付费用户沉默流失

4. **CC 月度跟进强度排名（付费用户维度）**
   类型：`BarChart`（横向，按 monthly_effective 排序）
   数据映射：X = monthly_effective，Y = cc_name，颜色区分 team
   交互：tooltip 显示 total_students + monthly_called + monthly_effective；hover 高亮同组
   业务价值：横向对比谁的付费用户跟进最积极，与结果指标（续费率）相关分析

### 跨源联动
- **join key**: `student_id`（与 E3 订单明细、C1-C6 cohort 数据）
- **first_paid_date** → 围场计算 → 与 F8（围场跟进）、D2-D4（围场 KPI）联动
- F7 + E3 + D3：「高跟进强度学员续费率是否更高」因果验证

### 前端 Spec

```typescript
// 新组件：PaidFollowupHeatmap
interface PaidFollowupHeatmapProps {
  data: {
    cc_name: string;
    team: string;
    enclosure_segment: string; // 由 first_paid_date 在 API 层计算
    monthly_effective_count: number;
    total_students: number;
  }[];
}
// 路由：/ops/outreach（在现有外呼监控页扩展）或新页 /ops/retention
```

### 后端 Spec

```
GET /api/analysis/paid-followup
返回：{
  summary: { total_students, total_called, coverage },
  by_cc: [{ cc_name, team, total_students, monthly_called, monthly_connected,
             monthly_effective, monthly_effective_count,
             enclosure_breakdown: [{segment, count}] }],
  zero_followup_students: [{ student_id, cc_name, first_paid_date,
                              enclosure_segment, days_since_paid }]
}
```

---

## 源 F8: 不同围场月度付费用户跟进

### 频率
D-1（月度视角，每日更新）

### 字段清单
来源：`_load_enclosure_monthly` 解析结果

| 字段 | 类型 | 说明 |
|------|------|------|
| `enclosure` | str | 围场段（0-30/31-60/61-90/91-180/181+）|
| `team` | str | CC 组 |
| `cc_name` | str \| None | CC 姓名（小计行为 None） |
| `student_id` / `student_count` | int | 个人行=学员ID；小计行=该围场学员数 |
| `monthly_called` | float | 月度拨打次数 |
| `monthly_connected` | float | 月度接通次数 |
| `monthly_effective` | float | 月度有效通话次数 |
| `call_coverage` | float | 拨打覆盖率（该围场被拨打/总人数） |
| `connect_coverage` | float | 接通覆盖率 |
| `effective_coverage` | float | 有效接通覆盖率 |
| `avg_effective_count` | float | 人均有效跟进次数 |

聚合维度：`by_enclosure`（含 `by_team` 子列表 + `summary` 汇总）、`by_cc`（个人级）、`summary`

### 当前利用
- `_analyze_enclosure_cross()`：
  - `f8_data.get("by_enclosure")` → 构建 `by_enc_f8`，取 `call_coverage` 作为 `followup_rate`
  - 与 D2-D4 围场 KPI、A2 围场效率联动，计算 `roi_index`
  - 输出 `by_enclosure` 数组（segment/students/conversion_rate/followup_rate/roi_index/recommendation）
- 前端：`biz/enclosure` 页面展示围场热力图 + 跟进覆盖率 Bar + 策略建议 + 明细表
- **已使用字段**：`call_coverage`（作为 followup_rate）
- **未使用字段**：`monthly_called/connected/effective`、`avg_effective_count`、`by_cc` 个人级、`connect_coverage`、`effective_coverage`

### 价值洼地
- `avg_effective_count` 按围场段对比：哪个围场每学员被有效跟进次数最多
- `connect_coverage` vs `call_coverage` 差值：接通质量差的围场（拨而不通）
- `effective_coverage` vs `connect_coverage`：接通但无效（通话<120s）的围场
- `by_cc` 个人级：同一围场内哪个 CC 跟进最强（CC 内部差异）
- 月度跨 F8 历史（需快照）：围场留存衰减曲线（学员随时间从 0-30 流向 181+，跟进强度是否跟上）

### 可构建图表/交互（≥3）

1. **围场留存衰减曲线（Cohort 视角）**
   类型：`LineChart`（多条折线）
   数据映射：X = 月份（历史快照），Y = 有效覆盖率（effective_coverage），每条线代表一个围场段
   交互：hover 显示「X 月 61-90 围场有效覆盖率 N%」；toggle 各围场段；关联 C 类 cohort 留存数据
   业务价值：验证「围场越老跟进越少导致留存下滑」假设，找到覆盖率下滑的拐点月份

2. **围场 × 跟进质量三维气泡图**
   类型：`ScatterChart`（气泡图）
   数据映射：X = call_coverage，Y = effective_coverage，气泡大小 = student_count，颜色 = 围场段
   交互：hover 显示「0-30 围场: 拨打覆盖 80%，有效覆盖 45%，学员 450 人」
   业务价值：四象限分析（高拨低通/低拨高通/双高/双低）定位质量问题根源

3. **CC × 围场跟进强度 Grouped Bar**
   类型：`BarChart`（分组柱状，X = 围场段，Y = avg_effective_count，颜色 = CC）
   数据映射：`by_cc` 个人级数据，按围场过滤
   交互：点击围场段进入该围场所有 CC 的跟进明细；按 team 过滤
   业务价值：找出在高价值围场（0-30）跟进强度低于均值的 CC，针对性辅导

4. **围场跟进健康度仪表盘（F7+F8+D3 联动）**
   类型：复合卡片（RadialChart + 数字）
   数据映射：每个围场段显示「学员数/拨打覆盖/有效覆盖/转化率/ROI指数」5 维
   交互：点击围场段 → 展开该段所有 CC 排名（by_cc）；支持对比两个月份
   业务价值：一屏掌握围场健康状态，驱动资源再分配决策

### 跨源联动
- **join key**: `enclosure` 段（与 D2/D3/D4、A2）
- F8 + D3（围场参与率/打卡率）→ 围场运营健康度仪表盘
- F8 + C1-C6（月度快照）→ 围场留存衰减曲线
- F8 `by_cc` + F9 `by_cc` → 同一 CC 在围场维度 vs 整体维度的跟进一致性

### 前端 Spec

```typescript
// 扩展现有 biz/enclosure 页面
// 新增组件：EnclosureDecayCurve
interface EnclosureDecayCurveProps {
  history: {
    month: string; // "202501"
    by_enclosure: { segment: string; effective_coverage: number }[];
  }[];
}
// 新增组件：EnclosureBubbleChart
interface EnclosureBubbleProps {
  segments: {
    segment: string;
    student_count: number;
    call_coverage: number;
    effective_coverage: number;
    avg_effective_count: number;
  }[];
}
// 路由：/biz/enclosure（现有页面扩展）
```

### 后端 Spec

```
GET /api/analysis/enclosure（现有 GET /enclosure 扩展）
新增字段：
{
  by_enclosure: [{
    segment, students, followup_rate, roi_index, recommendation,
    call_coverage, connect_coverage, effective_coverage,  // 新增
    avg_effective_count,                                   // 新增
    by_cc: [{ cc_name, avg_effective_count, effective_coverage }]  // 新增
  }],
  resource_allocation: { optimal: {...} }
}
```

---

## 源 F9: 月度付费用户跟进（无围场维度）

### 频率
D-1（月度视角）

### 字段清单
来源：`_load_monthly_paid` 解析结果（F8 的无围场汇总版本，74 行 × 10 列）

| 字段 | 类型 | 说明 |
|------|------|------|
| `team` | str | CC 组 |
| `cc_name` | str \| None | CC 姓名（小计行为 None） |
| `student_count` / `student_id` | int | 小计行=学员数；个人行=学员ID |
| `monthly_called` | float | 月度拨打次数 |
| `monthly_connected` | float | 月度接通次数 |
| `monthly_effective` | float | 月度有效通话次数 |
| `call_coverage` | float | 拨打覆盖率 |
| `connect_coverage` | float | 接通覆盖率 |
| `effective_coverage` | float | 有效接通覆盖率 |
| `avg_effective_count` | float | 人均有效跟进次数 |

聚合维度：`by_cc`（个人级列表）、`by_team`（组级列表）、`summary`（总计）

### 当前利用
- `_analyze_cc_ranking()`：
  - `f9_cc` 用于 CC 排名，取 `monthly_called` 作为 `post_paid_followup` 过程指标（权重 3%）
  - fallback：当 F7 没有该 CC 数据时，用 F9 补充
- `_analyze_outreach()`：**未使用 F9**（仅用了 F7）
- 前端：无专属组件，仅通过 CC 排名间接体现
- **大量字段零利用**：`call_coverage/connect_coverage/effective_coverage/avg_effective_count/by_team`

### 价值洼地
- `avg_effective_count` CC 排名：谁的付费用户单均跟进次数最多（精细化指标）
- `effective_coverage` vs 续费率（跨 E3/E4）：有效跟进覆盖率对续费的影响因果分析
- `by_team` 组间对比：CC 组跟进水平横向 benchmark
- `connect_coverage` gap：拨打覆盖高但接通低的 CC 识别（手机号质量或时段问题）

### 可构建图表/交互（≥3）

1. **CC 付费用户留存贡献排名**
   类型：`BarChart`（横向，带颜色区分组）
   数据映射：X = effective_coverage（有效接通覆盖率），Y = cc_name，右侧叠加 avg_effective_count
   交互：hover 显示「CC A: 负责 X 个付费学员，有效覆盖 Y%，人均跟进 Z 次」；与 E3 续费率关联
   业务价值：识别「跟进最勤快但结果不好」和「覆盖一般但续费率高」的 CC，优化跟进策略

2. **跟进质量三层漏斗（拨打→接通→有效）**
   类型：`BarChart`（分组，3 根柱子 per CC）
   数据映射：`call_coverage / connect_coverage / effective_coverage` 三层，X = cc_name
   交互：按 team 分组；toggle 显示绝对值/百分比；hover 显示每层绝对人数
   业务价值：定位「拨而不通」（号码质量）vs「通而无效」（对话质量）两类问题 CC

3. **Team 组间跟进 Benchmark**
   类型：`RadarChart`（多边形，每条线代表一个 team）
   数据映射：5 个维度 = call_coverage/connect_coverage/effective_coverage/avg_effective_count/student_count（归一化）
   交互：hover 高亮某 team；点击 team → 展开该组 by_cc 明细
   业务价值：快速识别哪个组整体跟进质量最高，用于团队 best practice 输出

4. **CC 跟进覆盖 vs 续费贡献散点图（F9 + E3 联动）**
   类型：`ScatterChart`
   数据映射：X = effective_coverage（F9），Y = 续费/复购学员数（E3 聚合），气泡大小 = student_count
   交互：hover 显示 CC 名 + 跟进覆盖率 + 续费贡献；拖动阈值线分四象限
   业务价值：验证「有效跟进 → 续费率提升」因果链，量化跟进对 LTV 的贡献

### 跨源联动
- **join key**: `cc_name`（与 F7、F5、CC 排名 D1）
- F9 `effective_coverage` + E3 续费明细 → 付费用户 LTV 归因（谁的学员续费更多）
- F9 + F8：同 CC 在「有围场」vs「无围场」视角的跟进一致性验证
- F9 `by_team` + D1 `by_cc` → 组级跟进强度 vs 组级 24h 打卡率相关性

### 前端 Spec

```typescript
// 新组件：RetentionFollowupTable
interface RetentionFollowupTableProps {
  byCC: {
    cc_name: string;
    team: string;
    student_count: number;
    call_coverage: number;
    connect_coverage: number;
    effective_coverage: number;
    avg_effective_count: number;
  }[];
  byTeam: typeof byCC; // 组级汇总
}
// 路由：/ops/outreach（现有页面增加 Tab）或新页 /ops/retention
```

### 后端 Spec

```
GET /api/analysis/retention-followup  // 新端点
返回：{
  summary: { total_students, call_coverage, connect_coverage, effective_coverage },
  by_cc: [{ cc_name, team, student_count, monthly_called, monthly_connected,
             monthly_effective, call_coverage, connect_coverage,
             effective_coverage, avg_effective_count }],
  by_team: [同上但无 cc_name],
  // 关联 E3 的续费贡献（可选扩展）
  cc_renewal_contrib: [{ cc_name, renewal_students, renewal_revenue_usd }]
}
```

---

## 源 F10: 首次体验课课前课后跟进

### 频率
D-1（126 行 × 17 列）

### 字段清单
来源：`_load_trial_class` 解析结果

| 字段 | 类型 | 说明 |
|------|------|------|
| `channel` | str | 渠道（MKT/转介绍） |
| `team` | str | CC 组 |
| `cc_name` | str \| None | CC 姓名 |
| `trial_classes` | float | 体验课次数（分配给该 CC 的学员体验课总数） |
| `attended` | float | 实际出席课次 |
| `pre_called` | float | 课前拨打次数 |
| `pre_connected` | float | 课前接通次数 |
| `pre_effective` | float | 课前有效通话次数 |
| `post_called` | float | 课后拨打次数 |
| `post_connected` | float | 课后接通次数 |
| `post_effective` | float | 课后有效通话次数 |
| `pre_call_rate` | float | 课前拨打率 |
| `pre_connect_rate` | float | 课前接通率 |
| `pre_effective_rate` | float | 课前有效接通率 |
| `post_call_rate` | float | 课后拨打率 |
| `post_connect_rate` | float | 课后接通率 |
| `post_effective_rate` | float | 课后有效接通率 |

聚合维度：`by_cc`（个人级）、`by_team`（组级）、`by_channel`（渠道级）、`summary`

### 当前利用
- `_analyze_trial_followup()`：
  - 取转介绍渠道汇总行（`by_channel["转介绍"]`）的 `pre_call_rate/post_call_rate/pre_connect_rate/post_connect_rate`
  - 输出 `pre_class.call_rate/connect_rate` + `post_class.call_rate/connect_rate` + `by_cc`（透传）
- 前端 `ops/trial` 页面：
  - `RateCard` 展示 `pre_call_rate`（课前拨打率）
  - 课前外呼 → 出席率 lift 对比（但未外呼出席率是假设值 0.5x，非真实数据）
  - 跟进阶段明细表（by_stage）
- **已使用字段**：`pre_call_rate/post_call_rate/pre_connect_rate/post_connect_rate`（汇总级）
- **未使用字段**：`pre_effective_rate/post_effective_rate`、CC 个人级所有字段、`trial_classes/attended`、渠道对比（MKT vs 转介绍）

### 价值洼地
- **课前 vs 课后跟进效果 A/B 对比**：哪种跟进对转化影响更大（pre vs post），当前仅展示数字，无对比分析
- `attended/trial_classes` → 出席率（真实）当前在计算上使用了假设值，可换成真实数据
- 渠道对比：MKT vs 转介绍渠道的课前/课后跟进率差异（当前只展示转介绍）
- CC 个人级：哪个 CC 课前/课后跟进率最高，与其分配学员的出席率关联
- `pre_effective_rate/post_effective_rate`：更高质量的跟进指标，当前零利用

### 可构建图表/交互（≥3）

1. **课前 vs 课后跟进效果 A/B 对比图**
   类型：`BarChart`（分组，2 组柱子：课前/课后）
   数据映射：X = 拨打率/接通率/有效接通率，每组两根柱（课前、课后），可按渠道过滤
   交互：toggle 渠道（MKT/转介绍）；hover 显示绝对值 + 差值；右侧标注「差值 +X%」
   业务价值：回答「课前还是课后跟进对转化贡献更大」，优化 CC 时间分配策略

2. **CC 课前/课后跟进率双轴散点（效果 vs 效率）**
   类型：`ScatterChart`
   数据映射：X = pre_effective_rate（课前有效率），Y = post_effective_rate（课后有效率），
   气泡大小 = attended（出席人数），颜色 = team
   交互：hover 显示 CC 名 + 课次数 + 出席率；四象限线可拖动（设定达标阈值）
   业务价值：识别「课前课后都跟进好」的优秀 CC 模板，找到双低的问题 CC

3. **渠道 × 跟进阶段漏斗对比**
   类型：`FunnelChart`（双漏斗，左=MKT，右=转介绍）
   数据映射：trial_classes → attended → pre_called → pre_connected → pre_effective（5层）
   交互：hover 显示各层人数 + 转化率；点击某层 → 展开该层 CC 明细排名
   业务价值：对比两渠道体验课跟进质量，转介绍是否值得更多课前资源投入

4. **CC 课前外呼达标率排行**
   类型：`BarChart`（横向，颜色 = 是否达标 pre_effective_rate >= target）
   数据映射：X = pre_effective_rate，Y = cc_name，虚线 = 团队均值
   交互：按 team 筛选；toggle 显示「课前有效率/接通率/拨打率」
   业务价值：快速识别课前跟进质量低于均值的 CC，优先辅导

### 跨源联动
- **join key**: `cc_name` + `channel`
- F10 `attended/trial_classes` + F11 → 完整体验课转化漏斗（F10 提供课前跟进效率，F11 提供学员级明细）
- F10 + A3（leads 明细：预约/出席/付费状态）→ 体验课全链路漏斗
- F10 `by_cc` + E3 订单明细 → 课后跟进对付费转化的贡献量化

### 前端 Spec

```typescript
// 扩展现有 ops/trial 页面
// 新组件：PrePostCompareChart
interface PrePostCompareChartProps {
  data: {
    stage: "课前" | "课后";
    call_rate: number;
    connect_rate: number;
    effective_rate: number;
    channel?: "MKT" | "转介绍";
  }[];
}
// 新组件：CCTrialFollowupTable
interface CCTrialFollowupTableProps {
  byCC: {
    cc_name: string;
    team: string;
    trial_classes: number;
    attended: number;
    pre_effective_rate: number;
    post_effective_rate: number;
    attendance_rate: number; // attended/trial_classes
  }[];
}
// 路由：/ops/trial（现有页面扩展，增加 Tab）
```

### 后端 Spec

```
GET /api/analysis/trial-followup（现有，扩展返回字段）
新增：{
  by_channel: {
    "MKT": { pre_call_rate, pre_connect_rate, pre_effective_rate,
              post_call_rate, post_connect_rate, post_effective_rate,
              trial_classes, attended, attendance_rate },
    "转介绍": { 同上 }
  },
  by_cc: [{ cc_name, team, trial_classes, attended, attendance_rate,
             pre_call_rate, pre_connect_rate, pre_effective_rate,
             post_call_rate, post_connect_rate, post_effective_rate }]
}
```

---

## 源 F11: 课前外呼覆盖明细

### 频率
D-1（6931 行 × 16 列，学员级明细）

### 字段清单
来源：`_load_pre_class_outreach` 解析结果

| 字段 | 类型 | 说明 |
|------|------|------|
| `class_id` | str | 课程 ID |
| `student_id` | int | 学员 ID（唯一键） |
| `class_time` | str (datetime) | 课程时间 |
| `team` | str | CC 组 |
| `cc_name` | str | 负责 CC |
| `lead_grade` | float | 学员评级 |
| `is_new_lead` | str | 是否新 lead |
| `lead_type` | str | lead 类型（区分转介绍/MKT 等） |
| `channel_l3` | str | 三级渠道 |
| `channel_l4` | str | 四级渠道 |
| `last_connect_time` | str \| None | 最近一次接通时间 |
| `last_call_time` | str \| None | 最近一次拨打时间 |
| `pre_called` | int | 课前是否已拨打（0/1） |
| `pre_connected` | int | 课前是否接通（0/1） |
| `pre_connected_2h` | int | 课前 2h 内是否接通（0/1） |
| `attended` | int | 是否出席（0/1） |

聚合维度：`by_cc`（total_classes/pre_class_call/connect/2h_connect/attended + 各率）、`by_team`、`by_lead_type`、`summary`

### 当前利用
- `_analyze_trial_followup()`：
  - `f11_summary` 取 `overall_call_rate/connect_rate/attendance_rate`（透传）
  - `f11_by_lead.get("转介绍")` 取 `attendance_rate`（已呼叫学员出席率）
- `_analyze_student_journey()`：`f11_records` 用于学员全旅程联动（student_id 关联）
- 前端 `ops/trial` 页面：`f11_summary` 透传，显示整体 call_rate/connect_rate
- **已使用字段**：summary 层 3 个率 + by_lead_type["转介绍"].attendance_rate
- **大量未使用**：`lead_grade`、`is_new_lead`、`channel_l3/l4`、`last_connect_time/last_call_time`、`pre_connected_2h`、`by_cc` 个人级详情、`class_time`（时段分析）

### 价值洼地
- `lead_grade` × 外呼覆盖率：高评级学员是否被优先外呼（优先级错配风险）
- `class_time` 时段分析：哪个时间段的课前外呼接通率最高（最佳外呼时间窗）
- `pre_connected_2h`：2h 内接通 vs 普通接通对出席率的影响（时效性价值）
- `last_call_time` 为 None 的学员 = 完全未被外呼 → 覆盖缺口量化
- `channel_l3/l4` 四级渠道：不同渠道来源学员的外呼难度（接通率）对比
- CC × lead_grade 热力图：哪个 CC 在高评级学员上的外呼覆盖率低

### 可构建图表/交互（≥3）

1. **课前外呼覆盖缺口分析（损失量化）**
   类型：`BarChart`（漏斗型，横向）+ 右侧 $ 损失标注
   数据映射：总学员 → 已拨打 → 已接通 → 2h 内接通 → 出席 → （关联）付费
   交互：hover 每层显示「未覆盖 N 人，按均值出席率 X% 预计损失 Y 个付费，损失 $Z」
   业务价值：直接量化「不打课前电话损失多少 $」，驱动 CC 执行动力

2. **CC × 外呼覆盖率缺口热力图**
   类型：`ScatterChart` / `Heatmap`
   数据映射：X = cc_name，Y = connect_rate（课前接通率），颜色深度 = total_classes 规模
   右侧叠加 attendance_rate，鼠标悬停显示「CC A：负责 N 节课前外呼，接通率 X%，出席率 Y%」
   交互：按 lead_type 过滤；按 team 分组；点击 CC → 展开该 CC 未接通学员名单
   业务价值：找到「覆盖率低导致出席率拖后腿」的 CC，识别今日急需补拨的学员

3. **课前外呼最佳时间窗分析**
   类型：`BarChart`（X = 小时段，Y = 接通率/出席率）
   数据映射：`class_time` 按小时 group，计算每个时间段的 pre_connected_2h/attended 均值
   交互：hover 显示「上午 9-10 点：接通率 62%，当节出席率 71%」；滑动时间范围
   业务价值：找到外呼黄金时间窗，指导 CC 在最高效时段集中外呼

4. **Lead 评级 × 外呼优先级错配识别**
   类型：`BarChart`（分组：按 lead_grade 分层）
   数据映射：X = lead_grade（评级），Y = pre_called（覆盖率），颜色 = is_new_lead
   交互：hover 显示「评级 A 新 lead：覆盖率 N%，出席率 M%」；对比新老 lead
   业务价值：识别「高评级学员未被优先外呼」的优先级错配，优化 CC 工作清单排序

5. **渠道来源 × 外呼接通率对比（channel_l3/l4）**
   类型：`BarChart`（横向，按 channel_l3 排序）
   数据映射：X = 接通率，Y = channel_l3，颜色 = pre_connected_2h/pre_connected 比率（时效性）
   交互：点击渠道展开 channel_l4；hover 显示绝对人数
   业务价值：对比不同渠道来源学员的外呼难度，辅助资源分配（难触达渠道需提前更多时间外呼）

### 跨源联动
- **join key**: `student_id`（与 A3 leads 明细、E3 订单明细、F10 体验课数据）
- F11 + F10 + A3 → 体验课转化漏斗全景：
  - F11：谁被外呼了/没被外呼
  - F10：课前课后跟进率
  - A3：最终是否预约/出席/付费
- F11 `class_time` + F5（每日外呼 by_date）→ 时段外呼合规性（课前 2h 必须打电话的合规率）
- F11 `lead_grade` + A3 + E3 → lead 质量评级对转化链的预测准确性验证

### 前端 Spec

```typescript
// 新组件：PreOutreachGapChart（覆盖缺口 + 损失量化）
interface PreOutreachGapChartProps {
  funnel: {
    stage: string;
    count: number;
    rate: number;
    estimated_revenue_loss?: number; // USD
  }[];
}
// 新组件：OutreachTimeWindowChart（时间窗分析）
interface OutreachTimeWindowChartProps {
  byHour: {
    hour: number;
    connect_rate: number;
    attendance_rate: number;
    sample_size: number;
  }[];
}
// 路由：/ops/trial（现有页面增加 Tab：「外呼覆盖缺口」）
// 或独立页面：/ops/pre-class-outreach
```

### 后端 Spec

```
GET /api/analysis/pre-class-outreach  // 新端点
返回：{
  summary: { total_records, total_pre_called, total_pre_connected,
             total_attended, overall_call_rate, overall_connect_rate,
             overall_attendance_rate, connect_2h_rate },
  coverage_gap: {
    uncovered_students: int,           // pre_called=0 的学员数
    uncovered_rate: float,             // 未覆盖率
    estimated_lost_attendance: int,    // 按均值出席率估算
    estimated_lost_revenue_usd: float  // 关联 E3 客单价估算
  },
  by_hour: [{ hour, connect_rate, attendance_rate, sample_size }],
  by_lead_grade: [{ grade, covered_rate, connect_rate, attendance_rate }],
  by_channel: [{ channel_l3, call_rate, connect_rate, connect_2h_rate, attendance_rate }],
  by_cc: [{ cc_name, team, total_classes, call_rate, connect_rate,
             connect_2h_rate, attendance_rate }]
}
```

---

## 跨源联动汇总

### 围场健康度仪表盘（F7 + F8 + D3）

```
数据流：
F7 (student级，first_paid_date→围场段)
  + F8 (围场级跟进强度：call/connect/effective_coverage)
  + D3 (围场参与率/打卡率)
→ 每围场段输出：学员数 | 跟进覆盖率 | 有效跟进均次 | 参与率 | 打卡率 | ROI 指数 | 建议

前端：扩展 biz/enclosure 页，增加「健康度仪表盘」Tab
后端：扩展 GET /api/analysis/enclosure，合并 F7 学员分布数据
```

### 体验课转化漏斗全景（F10 + F11 + A3）

```
数据流：
F11 (学员级：是否被外呼/接通/2h接通)
  + F10 (CC级：课前课后跟进率)
  + A3 (leads明细：预约→出席→付费转化)
→ 漏斗：分配学员 → 外呼覆盖 → 接通 → 2h接通 → 出席 → 付费
  + 损失量化：每断层损失 X 人 → $Y

前端：新页面 /ops/trial-funnel 或 ops/trial 新 Tab
后端：新端点 GET /api/analysis/trial-conversion-funnel
```

### 付费用户复购/LTV 分析（F9 + E3）

```
数据流：
F9 by_cc (CC 级有效跟进覆盖率)
  + E3 订单明细 (seller → 续费/复购订单)
→ CC 维度：effective_coverage 与 renewal_count / renewal_revenue 相关系数

前端：ops/outreach 或 ops/retention 新 Tab「留存贡献」
后端：GET /api/analysis/retention-followup（含 cc_renewal_contrib 字段）
```

---

## 开发优先级建议

| 优先级 | 功能 | 数据源 | 预期价值 |
|--------|------|--------|---------|
| P0 | 课前外呼覆盖缺口 + $ 损失量化 | F11 | 直接驱动 CC 执行，可量化到 $ |
| P0 | 零跟进付费学员预警列表 | F7 | 防流失，输出今日行动清单 |
| P1 | 课前 vs 课后跟进 A/B 对比 | F10 | 优化 CC 时间分配策略 |
| P1 | 围场健康度仪表盘（F7+F8+D3 联动） | F7+F8 | 围场资源精细化分配 |
| P1 | CC 留存贡献排名（F9+E3） | F9 | 量化跟进→续费因果链 |
| P2 | 课前外呼最佳时间窗分析 | F11 | 优化外呼时机 |
| P2 | 围场留存衰减曲线（需历史快照） | F8 | 验证长期跟进策略效果 |
| P3 | Lead 评级 × 外呼优先级错配 | F11 | 优化 CC 工作清单排序 |
| P3 | 渠道来源 × 外呼接通率对比 | F11 | 渠道运营优化 |

---

*调研完成：F7-F11 共 5 个数据源，识别 20+ 价值洼地，规划 19 个新图表/交互，覆盖 3 条跨源联动链路。*

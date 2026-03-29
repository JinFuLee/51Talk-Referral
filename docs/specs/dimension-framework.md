# 全维度分析框架规格书 (Dimension Framework Specification)

> 版本: 1.0 | 日期: 2026-03-29 | 里程碑: M37
> 本文件是全站维度系统的 **唯一真相源（SSoT）**。所有代码实现必须引用本规格，不得自行发明维度定义。

---

## 0. 架构总览

```
用户操作                          前端                                    后端
─────────     ───────────────────────────────────     ─────────────────────────────────────
UnifiedFilterBar ──► config-store (Zustand persist)     parse_filters (FastAPI Depends)
BenchmarkSelector      │                                       │
                       ▼                                       ▼
                  useFilteredSWR ──► HTTP GET ?params ──► UnifiedFilter (Pydantic)
                       │                                       │
                       ▼                                       ▼
                  SWR cache ◄── JSON response ◄── apply_filters(df, filters)
```

**核心原则：**
- 筛选在**后端数据层**执行（DataFrame 内存操作），不在前端过滤
- 前端通过 query params 传递维度值，后端通过 `parse_filters` 统一解析
- 新建页面 **必须** 使用 `useFilteredSWR`，新建 API **必须** 使用 `Depends(parse_filters)`
- 维度值从真实数据动态生成（`/api/filter/options`），不硬编码

---

## 1. 筛选维度定义（8 维）

### 1.1 country — 地区

| 属性 | 值 |
|------|---|
| **ID** | `country` |
| **类型** | 单选 |
| **默认值** | `TH` |
| **当前可选** | `TH`（泰国） |
| **未来扩展** | `VN`（越南）、`PH`（菲律宾）等 |
| **数据层过滤** | 团队名前缀匹配（`TH-*`），若 `all` 则不过滤 |
| **前端组件** | 下拉选择器。仅 1 个国家时显示为不可选标签，>1 时自动变为下拉 |
| **后端字段** | `UnifiedFilter.country: str = "TH"` |

### 1.2 data_role — 数据角色

| 属性 | 值 |
|------|---|
| **ID** | `data_role` |
| **类型** | 单选 |
| **默认值** | `all` |
| **可选值** | `all`、`cc`、`ss`、`lp`、`ops` |
| **数据层过滤** | 按 `enclosure_role_assignment` 配置过滤：选 `cc` 则只保留 CC 负责围场内的数据 |
| **与 viewer role 的区别** | viewer role（`ops/exec/finance`）控制**看什么视图**；data_role 控制**看谁的数据** |
| **前端组件** | 分段控制器（Segmented Control）：全部 / CC / SS / LP / 运营 |
| **后端字段** | `UnifiedFilter.data_role: Literal["all","cc","ss","lp","ops"] = "all"` |

### 1.3 enclosure — 围场范围

| 属性 | 值 |
|------|---|
| **ID** | `enclosure` |
| **类型** | 多选 |
| **默认值** | `active`（全部有效围场：M0-M6+） |
| **可选值** | `all`（含非有效）、`active`（仅有效）、`M0`、`M1`、...、`M12`、`M12+` |
| **有效围场定义** | `0~30, 31~60, 61~90, 91~120, 121~150, 151~180, M6+` |
| **非有效围场** | `已付费非有效, 未付费非有效` |
| **数据层过滤** | 行级过滤：`df[df['围场'].isin(selected_enclosures)]` |
| **聚合规则交互** | 业绩类（SUM）= 全围场；过程类（MEAN）= 仅有效围场。选择 `all` 时此规则仍生效 |
| **前端组件** | 多选 Chip 组（快捷：全部/有效/自定义） |
| **后端字段** | `UnifiedFilter.enclosure: list[str] | None = None`（None = active 默认） |

### 1.4 team — 团队层级

| 属性 | 值 |
|------|---|
| **ID** | `team`（团队）+ `cc`（个人），复用现有命名 |
| **类型** | 级联单选 |
| **层级** | 全部 → 区域（Region, e.g. TH-CC01Region）→ 团队（Team, e.g. TH-CC01Team）→ 个人（CC name） |
| **默认值** | 全部（team=null, cc=null） |
| **数据层过滤** | 现有逻辑：team 匹配团队名，cc 匹配 CC 姓名 |
| **前端组件** | 现有 GlobalFilterBar 的团队下拉 + CC 搜索，扩展为级联选择 |
| **后端字段** | `UnifiedFilter.team: str | None = None` + `UnifiedFilter.cc: str | None = None` |
| **向后兼容** | 100% 兼容现有 team/cc 参数 |

### 1.5 granularity — 时间聚合粒度

| 属性 | 值 |
|------|---|
| **ID** | `granularity` |
| **类型** | 单选 |
| **默认值** | `month` |
| **可选值** | `day`、`week`、`month`、`quarter` |
| **数据层行为** | 不过滤行，影响**聚合方式**：day=每日/week=ISO周/month=每月/quarter=每季 |
| **前端组件** | 分段控制器，与 timeRange 选择器并排 |
| **后端字段** | `UnifiedFilter.granularity: Literal["day","week","month","quarter"] = "month"` |
| **与 timeRange 的关系** | timeRange 控制**时间窗口**（看哪段时间），granularity 控制**聚合粒度**（以什么单位看） |

### 1.6 funnel_stage — 漏斗阶段

| 属性 | 值 |
|------|---|
| **ID** | `funnel_stage` |
| **类型** | 单选 |
| **默认值** | `all` |
| **可选值** | `all`、`registration`、`appointment`、`attendance`、`payment` |
| **数据层行为** | 上下文筛选——不过滤行，而是决定**展示哪个阶段的指标**。选 `payment` 时 KPI 卡片突出付费相关指标 |
| **适用页面** | 有漏斗指标的页面（funnel/channel/analytics/daily-monitor/present）|
| **不适用** | 学员管理页面（checkin/students/members）— 这些页面无漏斗阶段概念 |
| **前端组件** | 迷你漏斗可视化（可点击每个阶段），或下拉 |
| **后端字段** | `UnifiedFilter.funnel_stage: Literal["all","registration","appointment","attendance","payment"] = "all"` |

### 1.7 channel — 渠道归因口径

| 属性 | 值 |
|------|---|
| **ID** | `channel` |
| **类型** | 单选 |
| **默认值** | `all` |
| **可选值** | `all`、`cc_narrow`、`ss_narrow`、`lp_narrow`、`cc_wide`、`lp_wide`、`ops_wide` |
| **映射到数据列** | `转介绍类型_新` 列值：CC窄口径/SS窄口径/LP窄口径/宽口径，宽口进一步按围场角色配置拆分 |
| **数据层过滤** | 行级过滤：`df[df['转介绍类型_新'] == mapped_value]` |
| **适用数据源** | 仅 A1(当月快照) + A2(围场效率) 有完整 4 口径拆分；A5 LP+宽口合并 |
| **前端组件** | 下拉选择器，显示口径名 + 数据可用性标记 |
| **后端字段** | `UnifiedFilter.channel: Literal["all","cc_narrow","ss_narrow","lp_narrow","cc_wide","lp_wide","ops_wide"] = "all"` |

### 1.8 behavior — 学员行为分层

| 属性 | 值 |
|------|---|
| **ID** | `behavior` |
| **类型** | 多选 |
| **默认值** | `all` |
| **可选值** | `all`、`gold`、`effective`、`stuck_pay`、`stuck_show`、`potential`、`freeloader`、`newcomer`、`casual` |
| **分层定义** | 来自 M36 的 `roi_cost_rules.json` 中 `risk_classification` |
| **数据层过滤** | 先对学员执行行为分类（M36 逻辑），再按所选分层过滤 |
| **适用页面** | 学员相关页面（checkin/students/high-potential/renewal-risk）|
| **不适用** | 非学员页面（channel/funnel/analytics） |
| **前端组件** | 多选 Chip，每个分层带颜色徽章 |
| **后端字段** | `UnifiedFilter.behavior: list[str] | None = None`（None = all） |

---

## 2. 对比基准定义（4 基准）

对比基准控制**数据用什么标尺衡量**，与筛选维度正交。

### 2.1 target — 月目标

| 属性 | 值 |
|------|---|
| **ID** | `target` |
| **数据来源** | `projects/referral/config.json` → `monthly_targets` + `config/targets_override.json` |
| **展示方式** | 每个数值卡片显示：实际值 / 目标值 / 差额 / 达成率 |
| **图表叠加** | 目标线（水平虚线） |

### 2.2 bm_progress — T-1 BM 进度

| 属性 | 值 |
|------|---|
| **ID** | `bm_progress` |
| **数据来源** | `bm_config` 权重 × 已过天数 → 截至昨天的预期累计值 |
| **展示方式** | 差额 = 实际值 - BM 预期值（正=领先，负=落后），进度条 |
| **图表叠加** | BM 进度线（渐变填充） |

### 2.3 bm_today — 今天 BM

| 属性 | 值 |
|------|---|
| **ID** | `bm_today` |
| **数据来源** | `bm_config` 权重 × 今天的日权重 → 今日应完成值 |
| **展示方式** | 今日实际 vs 今日 BM，差额显示 |
| **图表叠加** | 今日基准点标记 |

### 2.4 prediction — WMA 预测

| 属性 | 值 |
|------|---|
| **ID** | `prediction` |
| **数据来源** | M33 三档目标推荐器的 WMA/Holt 预测值 |
| **展示方式** | 实际值 vs 预测值，置信区间（如有） |
| **图表叠加** | 预测线 + 置信带（浅色填充） |

### 2.5 对比基准选择规则

- 默认：`target`（vs 月目标）
- 支持同时选择 **≤2 个基准**（如 vs 目标 + vs BM 进度），图表叠加显示
- `off`：不显示对比，仅实际值
- 前端组件：`BenchmarkSelector`（Toggle Group，可多选）
- 后端字段：`UnifiedFilter.benchmarks: list[Literal["target","bm_progress","bm_today","prediction"]] = ["target"]`

---

## 3. 页面适用性矩阵

不是每个维度在每个页面都有意义。`-` = 不适用（UI 隐藏该筛选器），`✓` = 适用。

| 页面分类 | 页面 | country | data_role | enclosure | team | granularity | funnel | channel | behavior |
|---------|------|---------|-----------|-----------|------|-------------|--------|---------|----------|
| **运营** | checkin | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | ✓ |
| | daily-monitor | ✓ | ✓ | - | ✓ | day固定 | ✓ | ✓ | - |
| | outreach-quality | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| | followup-quality | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| | learning-heatmap | ✓ | - | ✓ | ✓ | ✓ | - | - | ✓ |
| | expiry-alert | ✓ | - | ✓ | ✓ | - | - | - | - |
| | renewal-risk | ✓ | - | ✓ | ✓ | - | - | - | ✓ |
| **业绩** | cc-performance | ✓ | cc固定 | ✓ | ✓ | ✓ | - | - | - |
| | team | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| | members | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| | personnel-matrix | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| | incentive-tracking | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| **分析** | analytics | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| | funnel | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| | channel | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| | attribution | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| | referral-contributor | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ | - |
| **围场** | enclosure | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| | enclosure-health | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| | cc-matrix | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| | ss-lp-matrix | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| **学员** | students/360 | ✓ | - | ✓ | ✓ | - | - | - | ✓ |
| | high-potential | ✓ | - | ✓ | ✓ | - | - | - | ✓ |
| | high-potential/warroom | ✓ | - | ✓ | ✓ | - | - | - | ✓ |
| **报告** | present | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| | reports | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ | - |
| | reports/exec | ✓ | ✓ | ✓ | - | ✓ | - | - | - |
| | reports/ops | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| **其它** | geo-distribution | ✓ | ✓ | - | - | ✓ | - | - | - |
| | indicator-matrix | - | - | - | - | - | - | - | - |
| | knowledge | - | - | - | - | - | - | - | - |
| | data-health | - | - | - | - | - | - | - | - |
| | notifications | - | - | - | - | - | - | - | - |
| | settings | - | - | - | - | - | - | - | - |
| | access-control | - | - | - | - | - | - | - | - |
| | login | - | - | - | - | - | - | - | - |
| | access-denied | - | - | - | - | - | - | - | - |

**页面声明机制**：每个页面通过 `usePageDimensions` hook 声明自己支持哪些维度，UnifiedFilterBar 自动隐藏不适用的筛选器。

---

## 4. 技术契约

### 4.1 前端类型 SSoT — `frontend/lib/types/filters.ts`

```typescript
/** 筛选维度值类型 */
export type Country = 'TH';  // 扩展时在此联合类型加入
export type DataRole = 'all' | 'cc' | 'ss' | 'lp' | 'ops';
export type Granularity = 'day' | 'week' | 'month' | 'quarter';
export type FunnelStage = 'all' | 'registration' | 'appointment' | 'attendance' | 'payment';
export type Channel = 'all' | 'cc_narrow' | 'ss_narrow' | 'lp_narrow' | 'cc_wide' | 'lp_wide' | 'ops_wide';
export type BehaviorSegment = 'gold' | 'effective' | 'stuck_pay' | 'stuck_show' | 'potential' | 'freeloader' | 'newcomer' | 'casual';
export type BenchmarkMode = 'off' | 'target' | 'bm_progress' | 'bm_today' | 'prediction';

/** 全局筛选状态（config-store 中的维度字段） */
export interface DimensionState {
  country: Country;
  dataRole: DataRole;
  enclosure: string[] | null;        // null = active default
  team: string | null;               // 向后兼容现有字段
  cc: string | null;                 // 向后兼容现有字段
  granularity: Granularity;
  funnelStage: FunnelStage;
  channel: Channel;
  behavior: BehaviorSegment[] | null; // null = all
  benchmarks: BenchmarkMode[];        // 可多选，默认 ['target']
}

/** 页面维度声明（哪些维度在本页面有效） */
export interface PageDimensions {
  country?: boolean;
  dataRole?: boolean | DataRole;      // true = 可选, 'cc' = 固定值
  enclosure?: boolean;
  team?: boolean;
  granularity?: boolean | Granularity; // true = 可选, 'day' = 固定值
  funnelStage?: boolean;
  channel?: boolean;
  behavior?: boolean;
}

/** /api/filter/options 响应类型 */
export interface FilterOptions {
  countries: { value: string; label: string }[];
  teams: { value: string; label: string; region?: string }[];
  enclosures: { value: string; label: string; is_active: boolean }[];
  channels: { value: string; label: string; available_sources: string[] }[];
  behaviors: { value: string; label: string; color: string; count: number }[];
  cc_list: string[];
}
```

### 4.2 后端模型 SSoT — `backend/models/filters.py`

```python
from typing import Literal
from pydantic import BaseModel, Field
from fastapi import Query

class UnifiedFilter(BaseModel):
    """全站统一筛选参数，前后端字段名 1:1 匹配"""
    country: str = "TH"
    data_role: Literal["all", "cc", "ss", "lp", "ops"] = "all"
    enclosure: list[str] | None = None  # None = active default
    team: str | None = None
    cc: str | None = None
    granularity: Literal["day", "week", "month", "quarter"] = "month"
    funnel_stage: Literal["all", "registration", "appointment", "attendance", "payment"] = "all"
    channel: Literal["all", "cc_narrow", "ss_narrow", "lp_narrow", "cc_wide", "lp_wide", "ops_wide"] = "all"
    behavior: list[str] | None = None  # None = all
    benchmarks: list[str] = Field(default=["target"])

def parse_filters(
    country: str = Query("TH"),
    data_role: str = Query("all"),
    enclosure: str | None = Query(None),       # 逗号分隔: "M0,M1,M2"
    team: str | None = Query(None),
    cc: str | None = Query(None),
    granularity: str = Query("month"),
    funnel_stage: str = Query("all"),
    channel: str = Query("all"),
    behavior: str | None = Query(None),         # 逗号分隔: "gold,effective"
    benchmarks: str = Query("target"),           # 逗号分隔: "target,bm_progress"
) -> UnifiedFilter:
    """FastAPI Depends — 从 query params 解析为 UnifiedFilter"""
    return UnifiedFilter(
        country=country,
        data_role=data_role,
        enclosure=enclosure.split(",") if enclosure else None,
        team=team,
        cc=cc,
        granularity=granularity,
        funnel_stage=funnel_stage,
        channel=channel,
        behavior=behavior.split(",") if behavior else None,
        benchmarks=benchmarks.split(","),
    )
```

### 4.3 字段名映射（前端 camelCase ↔ 后端 snake_case）

| 前端 (TS) | Query Param | 后端 (Pydantic) |
|-----------|-------------|-----------------|
| `country` | `country` | `country` |
| `dataRole` | `data_role` | `data_role` |
| `enclosure` | `enclosure` | `enclosure` |
| `team` | `team` | `team` |
| `cc` | `cc` | `cc` |
| `granularity` | `granularity` | `granularity` |
| `funnelStage` | `funnel_stage` | `funnel_stage` |
| `channel` | `channel` | `channel` |
| `behavior` | `behavior` | `behavior` |
| `benchmarks` | `benchmarks` | `benchmarks` |

**规则：** Query param 统一 snake_case（HTTP 惯例）。前端 store 用 camelCase（JS 惯例）。`useFilteredSWR` 内部做转换。

### 4.4 apply_filters 后端过滤函数

```python
def apply_filters(df: pd.DataFrame, filters: UnifiedFilter, *, column_map: dict | None = None) -> pd.DataFrame:
    """
    统一数据过滤。在 DataManager 返回原始 DataFrame 之后调用。

    column_map: 自定义列名映射（不同数据源列名不同时传入）
        默认: {"team": "团队", "cc": "CC", "enclosure": "围场", "channel": "转介绍类型_新"}
    """
```

**过滤顺序（确定性，不可乱序）：**
1. country → 团队名前缀
2. team → 团队名精确匹配
3. cc → CC 姓名精确匹配
4. data_role → 围场角色配置过滤
5. enclosure → 围场列过滤
6. channel → 渠道列过滤
7. behavior → 行为分层过滤（需先执行分类）

granularity / funnel_stage / benchmarks 不在 `apply_filters` 中处理——由各 API 端点自行根据值调整聚合/展示逻辑。

---

## 5. 前端组件契约

### 5.1 UnifiedFilterBar

替代现有 `GlobalFilterBar.tsx`。

**Props:** 无（读取 config-store + usePageDimensions）

**行为：**
- 读取当前页面的 `PageDimensions` 声明 → 只渲染适用的筛选器
- 从 `/api/filter/options` 获取每个维度的可选值列表
- 任何筛选器变化 → 更新 config-store → URL 同步 → SWR 自动 revalidate

**布局：**
```
┌─────────────────────────────────────────────────────────────────┐
│ [🌏 TH ▾] [全部|CC|SS|LP|运营] [围场: 有效 ▾] [团队 ▾] [CC 🔍] │  ← 第一行：核心筛选
│ [日|周|月|季] [漏斗: 全部 ▾] [渠道: 全部 ▾] [行为 ▾]           │  ← 第二行：分析筛选（折叠）
│ 对比: [vs目标 ✓] [vs BM进度] [vs 今日BM] [vs 预测]             │  ← 第三行：基准选择
└─────────────────────────────────────────────────────────────────┘
```

- 第二行默认折叠（点击"更多筛选"展开）
- 移动端：全部折叠为抽屉（复用现有抽屉模式）

### 5.2 usePageDimensions hook

```typescript
export function usePageDimensions(dims: PageDimensions): void;
```

在页面顶层调用，声明本页面支持的维度。UnifiedFilterBar 读取此声明自动隐藏不适用的筛选器。

### 5.3 useFilteredSWR v2

扩展现有 `useFilteredSWR`，自动从 config-store 读取全部 8 维度 + benchmarks，序列化为 query params 附加到请求 URL。

**序列化规则：**
- 默认值不传（减少 URL 长度）：`country=TH` 不传，`data_role=all` 不传
- 列表值逗号拼接：`enclosure=M0,M1,M2`
- `null` 值不传

### 5.4 BenchmarkSelector

独立组件，渲染 4 个 Toggle：vs目标 / vs BM进度 / vs 今日BM / vs 预测。

支持多选（≤2），选择后存入 config-store.benchmarks。

---

## 6. 新增维度 SOP（4 步）

未来需要添加新的分析维度时，按以下步骤操作：

### Step 1: 定义

在本文件 §1 新增一节，定义：ID / 类型 / 默认值 / 可选值 / 数据层过滤逻辑 / 前端组件形态 / 后端字段。

### Step 2: 类型

同步更新 `frontend/lib/types/filters.ts` 和 `backend/models/filters.py`，保持字段 1:1。

更新 `parse_filters` 函数增加新的 Query 参数。

更新 `apply_filters` 函数增加新的过滤逻辑。

### Step 3: 数据层

在 `apply_filters` 中添加过滤逻辑。如果新维度需要特殊数据处理（如 behavior 需要先分类），在对应 Loader 或 utility 中实现。

更新 `/api/filter/options` 端点返回新维度的可选值。

### Step 4: UI

在 `UnifiedFilterBar` 中添加新筛选器组件。

更新 §3 页面适用性矩阵，标注每个页面是否支持新维度。

在需要支持的页面的 `usePageDimensions` 声明中添加新维度。

---

## 7. 合规检测

`scripts/check-dimension-compliance.sh` 自动检测 3 类违规：

| 检测项 | 违规定义 | 排除 |
|--------|---------|------|
| 直接 useSWR | 页面/组件文件中 `useSWR(` 且不在 `use-filtered-swr.ts` / `use-compare-data.ts` / `GlobalFilterBar` / `stores/` 中 | hooks 定义文件本身 |
| 缺 parse_filters | `backend/api/*.py` 中有 `@router.get\|@router.post` 但无 `parse_filters` | health.py / system.py / config.py / filter_options.py / dependencies.py / access_control.py |
| 类型 drift | `filters.ts` 的 DimensionState 字段与 `filters.py` 的 UnifiedFilter 字段不一致 | — |

---

## 8. 与现有系统的关系

| 现有组件 | M37 后状态 |
|---------|-----------|
| `GlobalFilterBar.tsx` | 被 `UnifiedFilterBar.tsx` 替代（旧文件删除） |
| `config-store.ts` | 保留并扩展（新增 8 维度字段，保留所有现有字段） |
| `useFilteredSWR` | v2（自动传全维度，向后兼容 v1 行为） |
| `useCompareData` | 保留，benchmarks 选择由 BenchmarkSelector 驱动 |
| `useFilterSync` | 扩展（同步全维度到 URL） |
| `CompareToggle.tsx` | 被 `BenchmarkSelector.tsx` 替代或融合 |
| `ComparisonBanner.tsx` | 保留（读取 benchmarks 状态展示对比数据） |

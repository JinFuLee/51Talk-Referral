# 前后端数据契约审计报告

**生成日期**: 2026-03-20
**后端**: http://localhost:8100（FastAPI 9.0.0）
**前端**: http://localhost:3100（Next.js 14，/api/* 经 next.config.mjs rewrites 到 127.0.0.1:8100/api/*）
**审计方法**: 静态代码分析（backend models + routers vs frontend page.tsx + lib/types）

---

## 一、端点全量审计表

| 页面 | 端点 | 后端响应类型 | 后端返回结构（top-level keys） | 前端期望结构 | 匹配? | 问题描述 |
|------|------|-------------|-------------------------------|------------|-------|---------|
| 总览 Dashboard (`/`) | `GET /api/overview` | `dict[str,Any]` | `{metrics: dict, data_sources: [{id,name,has_file,row_count}]}` | `{metrics: Record<string,number\|string\|null>, data_sources: [{id,name,has_file,row_count}]}` | OK 匹配 | — |
| 漏斗分析 (`/funnel`) | `GET /api/funnel` | `FunnelResult` | `{date,stages:[{name,target,actual,gap,achievement_rate,conversion_rate}],target_revenue,actual_revenue,revenue_gap,revenue_achievement}` | TS `FunnelResult` 同构，但 `FunnelStage` 额外声明了 `target_rate?: number` 和 `rate_gap?: number` | WARN 部分不匹配 | 前端漏斗柱状图 `gapColor(entry.gap)` 依赖 `rate_gap`，后端 Pydantic 模型和 `compute_funnel()` 均无此字段，永远 undefined，柱状图颜色全部显示 neutral 灰色 |
| 漏斗分析 (`/funnel`) | `GET /api/funnel/scenario` | `ScenarioResult`（单条对象） | `{scenario_stage, scenario_rate_current, scenario_rate_target, stages:[], incremental_payments, incremental_revenue}` | 前端期望**数组** `ScenarioResult[]`，字段名完全不同：`stage / current_rate / scenario_rate / impact_registrations / impact_payments / impact_revenue` | FAIL 严重不匹配 | (1) 后端返回单对象，前端用 `Array.isArray()` 检测，恒为 false，场景推演表格永远空。(2) 6 个字段名全部错位，见下方类型2详述 |
| 围场分析 (`/enclosure`) | `GET /api/enclosure` | `list[EnclosureCCMetrics]` | 裸数组 `[{enclosure,cc_group,cc_name,students,participation_rate,new_coefficient,cargo_ratio,checkin_rate,...}]` | 前端期望包装对象 `{data: EnclosureCCMetrics[]}` | FAIL 不匹配 | 后端返回裸数组，前端用 `enclosureData?.data ?? []`，`data` 键不存在，围场矩阵表格永远空 |
| 围场分析 (`/enclosure`) | `GET /api/enclosure/ranking` | `list[EnclosureCCMetrics]` | 裸数组，字段同上 | 前端期望包装对象 `{rankings: CCRankingItem[]}` | FAIL 不匹配 | 后端返回裸数组，前端用 `rankingData?.rankings ?? []`，CC 排名表格永远空 |
| 渠道分析 (`/channel`) | `GET /api/channel` | `list[ChannelMetrics]` | 裸数组 `[{channel,registrations,appointments,attendance,payments,revenue_usd,share_pct}]` | 前端期望包装对象 `{channels: ChannelMetrics[]}` | FAIL 不匹配 | 后端返回裸数组，前端用 `channelData?.channels ?? []`，业绩贡献表格永远空 |
| 渠道分析 (`/channel`) | `GET /api/channel/attribution` | `list[RevenueContribution]` | 裸数组 `[{channel,revenue,share,per_capita}]` | 前端期望包装对象 `{contributions: RevenueContribution[]}` | FAIL 不匹配 | 后端返回裸数组，前端用 `attrData?.contributions ?? []`，净拆解 Tab 永远空 |
| 渠道分析 (`/channel`) | `GET /api/channel/three-factor` | `list[ThreeFactorComparison]` | 裸数组 `[{channel,expected_volume,actual_volume,gap,appt_factor,show_factor,pay_factor}]` | 前端期望包装对象 `{comparisons: ThreeFactorComparison[]}` | FAIL 不匹配 | 后端返回裸数组，前端用 `threeData?.comparisons ?? []`，三因素对标 Tab 永远空 |
| 学员明细 (`/members`) | `GET /api/members` | `PaginatedResponse` | `{items:[...],total:int,page:int,size:int,pages:int}` | `{items:StudentBrief[],total:number,page:number,size:number}` | WARN 部分不匹配 | (1) 后端 `StudentBrief.id: str`，前端 TS `id: number`，类型错位可能导致详情点击 404。(2) `enclosure` 字段实际映射到"生命周期"列（见类型5）。(3) 后端多 `pages` 字段（无害） |
| 学员明细 (`/members`) | `GET /api/members/{student_id}` | `StudentDetail` | `{id,name,enclosure,lifecycle,cc_name,cc_group,region,business_line,...,total_revenue_usd,extra:{}}` | 前端 DetailDrawer 展示字段包含 `revenue_usd` | WARN 字段名错位 | 前端展示 `revenue_usd`，后端实际字段名为 `total_revenue_usd`，详情弹窗业绩显示"—" |
| 高潜学员 (`/high-potential`) | `GET /api/high-potential` | `list[HighPotentialStudent]` | 裸数组 `[{id,enclosure,total_new,attendance,payments,cc_name,cc_group,ss_name,ss_group,lp_name,lp_group}]` | 前端期望包装对象 `{students: HighPotentialStudent[]}` | FAIL 不匹配 | 后端返回裸数组，前端用 `data?.students ?? []`，高潜学员页面永远显示空态 |
| 团队汇总 (`/team`) | `GET /api/team/summary` | `list[dict]` | 裸数组 `[{cc_name,cc_group,registrations,payments,revenue_usd,students,participation_rate,checkin_rate,cc_reach_rate}]` | 前端期望包装对象 `{teams: TeamMember[]}` | FAIL 不匹配 | 后端返回裸数组，前端用 `data?.teams ?? []`，团队汇总页面永远显示空态 |
| 分析报告 (`/reports`) | `GET /api/reports/list` | `list[dict]` | 裸数组 `[{filename,report_type,date,size_bytes,path}]` | `reportsAPI.list()` 有适配层处理裸数组，但 `useReportList` 强制 `report_type: "unknown"` | WARN 功能性降级 | 报告已正确返回 `report_type: "ops"\|"exec"\|"unknown"`，但 hooks.ts L285 硬编码覆盖为 `"unknown"`，列表 badge 全部显示灰色 |
| 分析报告 (`/reports`) | `GET /api/reports/{type}/{date}` | `dict` | `{filename,report_type,date,content:string}` | `{filename,report_type,date,content:string}` | OK 匹配 | — |
| 汇报模式 (`/present`) | `GET /api/presentation/action-plan` | `dict` | `{status,data:{items:[...],total_expected_impact_usd,total_expected_impact_thb,generated_at}}` | 前端 `PresentationLauncher` 路由到 `/present/{scene}/{timeframe}`，但 App Router 中无此路径 | FAIL 路由缺失 | 点击"开始汇报"后跳转 `/present/gm/daily` 等路径，`frontend/app/` 下无对应 `[audience]/[timeframe]/page.tsx`，必然 404。3 个 presentation API 端点后端已实现，前端无消费组件 |
| 汇报模式 (`/present`) | `GET /api/presentation/meeting-summary` | `dict` | `{status,data:{consensus:[],disputes:[{text}],followups:[{text}],next_meeting_date,next_meeting_topic,generated_at}}` | 同上 | FAIL 路由缺失 | 同上 |
| 汇报模式 (`/present`) | `GET /api/presentation/resource-request` | `dict` | `{status,data:{categories:[{category,label,cards:[{title,description,expectedRoi,priority}],estimated_gain_usd,estimated_gain_thb}],total_estimated_gain_usd,total_estimated_gain_thb,top_lever,chains_count,generated_at}}` | 同上 | FAIL 路由缺失 | 同上 |

---

## 二、问题详述

### 类型1：包装层缺失（P0 — 7 个端点，4 个页面全空）

后端 FastAPI router 的 `response_model` 声明为 `list[Model]`，直接返回裸数组。
前端 page.tsx 期望通过具名 key 访问（`.data` / `.rankings` / `.channels` / `.contributions` / `.comparisons` / `.students` / `.teams`）。

**症状**：页面数据区始终显示 EmptyState，无报错，用户误以为数据未上传。实际数据在后端存在，只是前端拿不到。

受影响端点及前端访问 key：

| 端点 | 前端访问 key | 对应页面 |
|------|------------|---------|
| `GET /api/enclosure` | `enclosureData?.data` | 围场矩阵表 |
| `GET /api/enclosure/ranking` | `rankingData?.rankings` | CC 排名表 |
| `GET /api/channel` | `channelData?.channels` | 渠道业绩汇总 + 饼图 |
| `GET /api/channel/attribution` | `attrData?.contributions` | 净拆解 Tab |
| `GET /api/channel/three-factor` | `threeData?.comparisons` | 三因素对标 Tab |
| `GET /api/high-potential` | `data?.students` | 高潜学员卡片 |
| `GET /api/team/summary` | `data?.teams` | 团队汇总卡片 + 柱状图 |

**修复方案 A（推荐，仅改前端，零后端改动）**：
```typescript
// 通用模式：优先接受裸数组，兼容包装格式
const rows = Array.isArray(enclosureData) ? enclosureData : (enclosureData?.data ?? []);
const rankings = Array.isArray(rankingData) ? rankingData : (rankingData?.rankings ?? []);
const channels = Array.isArray(channelData) ? channelData : (channelData?.channels ?? []);
const contributions = Array.isArray(attrData) ? attrData : (attrData?.contributions ?? []);
const comparisons = Array.isArray(threeData) ? threeData : (threeData?.comparisons ?? []);
const students = Array.isArray(data) ? data : (data?.students ?? []);
const teams = Array.isArray(data) ? data : (data?.teams ?? []);
```

**修复方案 B（改后端，需同步更新 response_model 和 OpenAPI 文档）**：
各 router 将 `return list_result` 改为 `return {"data": list_result}` 等包装格式。

---

### 类型2：`/api/funnel/scenario` 结构型断裂（P0 — 场景推演完全失效）

**层1 — 维度错误**：

- 后端 `response_model=ScenarioResult` 返回**单条对象**（默认环节 `出席付费率`）
- 前端 `Array.isArray(scenarioRaw)` 检测单对象，恒为 `false`，`scenarios` 永远 `[]`
- 前端业务意图：展示 3 个环节（注册预约率/预约出席率/出席付费率）各自的推演结果

**层2 — 字段名全部错位**：

| 前端期望字段 | 后端实际字段 | 差异 |
|------------|------------|------|
| `stage` | `scenario_stage` | 重命名 |
| `current_rate` | `scenario_rate_current` | 重命名 |
| `scenario_rate` | `scenario_rate_target` | 重命名 |
| `impact_registrations` | （无此字段） | 后端未计算注册数增量 |
| `impact_payments` | `incremental_payments` | 重命名 |
| `impact_revenue` | `incremental_revenue` | 重命名 |

**修复**（后端改造）：

```python
# backend/api/funnel.py
@router.get("/funnel/scenario", response_model=list[dict])
def get_funnel_scenario(dm: DataManager = Depends(get_data_manager)):
    data = dm.load_all()
    engine = ScenarioEngine(data["result"], data["targets"])
    stages = ["注册预约率", "预约出席率", "出席付费率"]
    results = []
    for stage in stages:
        r = engine.compute_scenario(stage)
        results.append({
            "stage": r.scenario_stage,
            "current_rate": r.scenario_rate_current,
            "scenario_rate": r.scenario_rate_target,
            "impact_registrations": None,  # ScenarioEngine 需扩展计算
            "impact_payments": r.incremental_payments,
            "impact_revenue": r.incremental_revenue,
        })
    return results
```

同时 `ScenarioEngine.compute_scenario()` 需补充返回 `incremental_registrations` 字段。

---

### 类型3：`FunnelStage` 缺少 `target_rate`/`rate_gap`（P1 — 漏斗图颜色失效）

前端 TS 类型（`frontend/lib/types/funnel.ts`）：
```typescript
export interface FunnelStage {
  // ...
  target_rate?: number   // 后端无此字段
  rate_gap?: number      // 后端无此字段
}
```

前端 `funnel/page.tsx` 中：
```typescript
gap: s.rate_gap ?? 0,  // 永远为 0
// 导致 gapColor(0) → "neutral" 灰色，所有柱子颜色相同
```

**修复**：后端 `FunnelStage` Pydantic 模型新增两个可选字段，`compute_funnel()` 在处理转化率环节时赋值：

```python
class FunnelStage(BaseModel):
    # ...existing fields...
    target_rate: float | None = None   # 新增
    rate_gap: float | None = None      # 新增
```

---

### 类型4：学员 ID 类型不一致 str vs number（P1）

- 后端 `StudentBrief.id: str | None`（`member_detail.py` L36：`id=str(row.get("学员id",...) or "")`)
- 前端 TS `StudentBrief.id: number`（`frontend/lib/types/member.ts` L2）
- 前端点击学员行：`setSelectedId(m.id)` 存为 number，再拼 URL `\`/api/members/${memberId}\``

若实际 ID 为字符串格式（如 `"TH12345"` 或 `"123456"`），TypeScript 类型推断会在运行时出错，或 Number 转换后与后端存储的字符串 ID 不匹配导致 404。

**修复**：前端 TS 类型改为 `id: string`，`useState` 类型改为 `string | null`。

---

### 类型5：`_row_to_brief` 围场字段映射错误（P2）

```python
# backend/api/member_detail.py L38-39
enclosure=str(row.get("生命周期", "") or ""),  # BUG: 应该找围场列，如 "围场" 或 "付费周期"
lifecycle=str(row.get("生命周期", "") or ""),   # 两行都映射同一列
```

前端学员列表中 `围场` 列和 `生命周期` 列显示相同值，围场段（0-30/31-60/61-90 等）无法正确显示。

**修复**：确认实际数据中围场列名（可能是 `"围场"` / `"付费周期"` / `"enclosure"`），修正 L38 的列映射。

---

### 类型6：`StudentDetail` 字段名错位（P2）

前端 `DetailDrawer` 展示字段：`["revenue_usd", "业绩(USD)"]`
后端 `StudentDetail` 实际字段名：`total_revenue_usd`

**修复**：将前端 L61 的 `"revenue_usd"` 改为 `"total_revenue_usd"`。

---

### 类型7：`useReportList` 强制覆盖 `report_type`（P3）

```typescript
// frontend/lib/hooks.ts L285
report_type: "unknown" as const,  // BUG: 抹掉后端返回的 "ops"/"exec" 分类
```

后端 `GET /api/reports/list` 已正确返回 `report_type`，但 hook 将全部覆盖为 `"unknown"`，导致报告列表 badge 全灰。

**修复**：将 L285 改为读取后端返回值：
```typescript
report_type: (r as { report_type?: string }).report_type ?? "unknown",
```

---

### 类型8：汇报模式 Slide 路由页面缺失（P1）

`PresentationLauncher` 点击"开始汇报"后 `router.push('/present/gm/daily')` 等，但：
- `frontend/app/present/page.tsx` 存在（启动器页面）
- `frontend/app/present/[audience]/[timeframe]/page.tsx` **不存在**

3 个 presentation 后端 API（action-plan / meeting-summary / resource-request）均有完整实现，前端无对应消费组件。

---

## 三、修复优先级汇总

| 优先级 | 类型 | 受影响页面/功能 | 修复成本估算 |
|--------|------|---------------|------------|
| P0 | 包装层缺失（7 端点） | 围场分析/渠道分析/高潜学员/团队汇总全空 | 低（前端 7 处 Array.isArray 适配，约 30 分钟） |
| P0 | 场景推演结构断裂 | 漏斗页场景推演完全失效 | 中（后端重构 scenario 接口 + ScenarioEngine 扩展，约 2 小时） |
| P1 | 汇报模式路由缺失 | /present/*/​* 全部 404 | 高（需新建 Slide 页面 + 3 个 API 消费组件，约 1-2 天） |
| P1 | FunnelStage 缺 target_rate/rate_gap | 漏斗图颜色全灰 | 低（后端模型 + engine 各加 2 字段，约 30 分钟） |
| P1 | 学员 ID 类型 str vs number | 学员详情点击可能 404 | 低（前端 TS 类型改 string，约 15 分钟） |
| P2 | 围场字段映射错误 | 学员明细围场列显示错误 | 低（确认列名后改 1 行，约 15 分钟） |
| P2 | revenue_usd vs total_revenue_usd | 学员详情弹窗业绩"—" | 低（改 1 个字段名，约 5 分钟） |
| P3 | useReportList 强制 unknown | 报告列表 badge 全灰 | 低（删 1 行硬编码，约 5 分钟） |

---

## 四、附：CORS 配置隐患

`backend/main.py` L103-105：
```python
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
```

前端运行在 `localhost:3100`，默认白名单只有 `3000` 和 `3001`。若未通过环境变量 `CORS_ORIGINS` 配置 `3100`，浏览器直接调用会被 CORS 拦截（症状与"数据为空"类似，但实为请求被阻断）。需确认启动脚本中是否已正确设置此变量。

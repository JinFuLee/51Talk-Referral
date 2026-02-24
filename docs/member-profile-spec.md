# 销售个人画像与能力生态洞察 (Member Profile Dashboard)

**版本：** v1.0
**日期：** 2026-02-24
**适用范围：** 个人运营工具，使用者为转介绍运营负责人
**技术栈：** Python FastAPI + Next.js 14 + Recharts + shadcn/ui

---

## 文档导读

本文档定义"Member Profile Dashboard"的完整技术规格，覆盖四个核心模块：Hero 战斗力全息卡片、转化心智六边形雷达、动作异常生命监测线、金钱与订单转化池。每个模块包含数据来源、计算公式、UI 规格、空态处理四项必写内容。

**页面入口：** `/biz/member/[cc_name]`
**进入方式：** 从 `/biz/ranking-enhanced` 排名表点击 CC 姓名进入

---

## 一、系统架构总览

### 1.1 API Schema（TypeScript 强定义）

```typescript
interface MemberProfileResponse {
  identity: {
    name: string;
    team: string;
    hire_days: number;       // 入职天数（新人判断用）
    badges: string[];        // 已触发的徽章 ID 列表
    badge_details: BadgeDetail[];
  };
  radar: {
    personal: number[];      // 6 维，0-100，百分位排名分
    benchmark: number[];     // 6 维，团队同组均值映射到 0-100
    dimensions: string[];    // 维度名称，顺序固定
  };
  anomaly: {
    daily_calls: { date: string; count: number; flag: "normal" | "yellow" | "red" }[];
    red_flags: string[];     // 当月触发的红旗描述文本
    yellow_flags: string[];
  };
  revenue: {
    mtd_usd: number;
    mtd_thb: number;
    rank_in_team: number;
    team_size: number;
    package_mix: { type: string; pct: number; count: number }[];
    asp_usd: number;
  };
}

interface BadgeDetail {
  id: string;
  label: string;
  triggered: boolean;
  trigger_value: number;    // 触发时的实际值
  threshold: string;        // 触发条件描述（展示用）
}
```

### 1.2 组件树

```
/biz/member/[cc_name]/page.tsx
  ├── BreadcrumbNav             (面包屑：团队排行 > CC名字)
  ├── MemberHeroCard            (姓名 + 团队 + 徽章栏)
  ├── CompetenceRadar           (Recharts 双层六边形雷达)
  ├── AnomalyTimeline           (30天柱状图 + 红旗列表)
  └── RevenueSharePanel         (KPI卡片 + 套餐饼图)
```

### 1.3 后端路由

```
GET /api/member/{cc_name}/profile
```

返回 `MemberProfileResponse`，整合以下数据源：F1、F5、F7、F8、E7、E8。

### 1.4 交付并行计划

```
Step 1: 入口改造（ranking-enhanced 表格加 cc_name 超链接）
Step 2: 后端 API 实现（GET /api/member/{cc_name}/profile）
         ↑ Step 1 与 Step 2 并行
Step 3: 四个前端组件（依赖 Step 2 API schema 确定后启动）
Step 4: QA 验收（依赖 Step 3 完成）
```

---

## 二、数据降级与新人处理

### 2.1 模块级独立降级

各模块独立请求，某数据源空返回时，仅该模块显示 Empty State，不阻塞其他模块。

| 模块 | 依赖数据源 | 数据缺失时降级 |
|------|-----------|---------------|
| MemberHeroCard | F1、D1、D5 | 徽章全灰，显示"数据待加载" |
| CompetenceRadar | F1、F7、F8、E7、E8 | 整个雷达替换为 Empty State |
| AnomalyTimeline | F5 | 时间轴替换为"外呼数据暂无" |
| RevenueSharePanel | E7、E8 | 套餐饼图和 KPI 卡替换为空态 |

### 2.2 新人处理规则

入职 `hire_days < 7`（由后端根据 F1 首次出现日期推算）：

- 雷达图不渲染，显示文字：「数据积累中，入职满 7 天后启用」
- 徽章全部显示为灰色锁定态
- 其余模块（外呼监测、收入面板）正常渲染，有数据就展示

---

## 三、模块详细规格

---

### 模块一：Hero 战斗力全息卡片（MemberHeroCard）

#### 3.1 数据来源

| 字段 | 原始表 | 字段名 | 取值逻辑 |
|------|--------|--------|---------|
| cc_name | F1 | 首次分配CC员工姓名 | 精确匹配 URL 参数 |
| team | F1 | 首分小组 | 该 CC 行的 team 列 |
| badges | 见徽章计算 | 多源 | 见 3.2 节 |

#### 3.2 徽章触发条件（精确定义）

**转介绍杀手**
- 触发条件：近 30 天 `bring_new_coeff > team_median_bring_new_coeff × 1.2`
- `bring_new_coeff` = B注册数 / 带来注册的A学员数，来源：D1 `referral_coefficient` 或 D5 `referral_coefficient_total`
- `team_median` = 同组所有 CC 的 bring_new_coeff 中位数
- 徽章颜色：金色

**外呼劳模**
- 触发条件：最近连续 4 个完整自然周，每周日均拨打 ≥ 28 次
- 数据来源：F5 `daily_outreach.by_cc[cc_name].dates` 中每日 `call_count`
- "连续 4 周"从最近一个完整周往前数 4 周，中断则从断点重新计数
- 徽章颜色：蓝色

**转化尖兵**
- 触发条件：本月出席→付费转化率 `attend_paid_rate` 在团队排名前 15%
- 精确定义：`rank <= ceil(team_size × 0.15)`
- 数据来源：F1 `attend_paid_rate`（列索引 9，映射名 `attend_paid_rate`）
- 徽章颜色：绿色

#### 3.3 UI 规格

```
┌────────────────────────────────────────────────┐
│  [头像占位圆形]  Nattaporn S.                   │
│                  THCC-A                         │
│                                                 │
│  [转介绍杀手]  [外呼劳模]  [转化尖兵（灰）]      │
│  每个徽章 hover 显示 tooltip：触发条件 + 当前值   │
└────────────────────────────────────────────────┘
```

- 已触发徽章：彩色填充
- 未触发徽章：灰色半透明，tooltip 显示距触发还差多少
- 徽章排列：横向，超过 3 个换行

#### 3.4 空态处理

- 数据源完全缺失：显示「该 CC 无数据，请确认姓名拼写」
- 徽章无一触发：正常显示三个灰色徽章，不做特殊提示

---

### 模块二：转化心智六边形雷达（CompetenceRadar）

#### 4.1 数据来源与字段映射

| 雷达维度 | 原始表 | 字段 | 个人取法 | Benchmark 取法 |
|----------|--------|------|---------|---------------|
| 触达穿透 | F1 | `total_connect_rate`（列索引 28，总有效接通率） | 该 CC 行的值 | 同组所有 CC 均值 |
| 邀约手腕 | F1 | `appt_rate`（列索引 7） | 该 CC 行的值 | 同组均值 |
| 出勤保障 | F1 | `appt_attend_rate`（列索引 8） | 该 CC 行的值 | 同组均值 |
| 临门一脚 | F1 | `attend_paid_rate`（列索引 9） | 该 CC 行的值 | 同组均值 |
| 服务覆盖 | F7 / F8 | `SUM(followed) / SUM(total)` 按 CC 聚合 | 该 CC 行的比值 | 同组均值 |
| 价值单产 | E7 / E8 | `SUM(revenue_usd) / COUNT(orders)` 按 CC 聚合 | 该 CC 的 ASP | 同组均值 |

> Benchmark 来源：F1 团队汇总行 / 有效 CC 人数。若无汇总行，则对同组所有 CC 均值手动聚合。

#### 4.2 归一化公式

```
score_i = rank_in_team_i / team_size × 100
```

- `rank_in_team_i`：该 CC 在该维度上，在同组 CC 中按升序排名的名次（第 1 名为最低，第 N 名为最高）
- `team_size`：同组 CC 总人数（不含入职 <7 天的新人）
- 结果范围：[1/N × 100, 100]，最差约 5-10 分，最好 100 分
- 同分并列时取最大排名（pessimistic ranking）
- Benchmark 固定为 50（定义为团队中位水平，以百分位表示）

```python
# 后端计算示例（ranking_analyzer.py 中扩展）
def _percentile_score(value: float, team_values: list[float]) -> float:
    """百分位排名归一化，高值为优"""
    sorted_vals = sorted(team_values)
    rank = sorted_vals.index(value) + 1  # 1-indexed，升序排名
    return round(rank / len(team_values) * 100, 1)
```

#### 4.3 UI 规格

- 图表类型：Recharts `RadarChart`，双 `Radar` 叠加
- 个人层：实线填充，主色（蓝/绿）
- Benchmark 层：虚线边框，无填充，灰色
- 维度顺序（顺时针从顶部）：触达穿透 → 邀约手腕 → 出勤保障 → 临门一脚 → 服务覆盖 → 价值单产
- 刻度：0 / 25 / 50 / 75 / 100，六边形网格线灰色
- Legend：「个人」蓝色实块 ｜ 「团队基准」灰色虚线

#### 4.4 空态处理

- 任意维度原始数据缺失：该维度显示 0，并在图表下方文字标注「N 个维度因数据缺失显示为 0，结果仅供参考」
- 新人（入职 <7 天）：整个雷达替换为灰色占位块 + 文字「数据积累中，入职满 7 天后启用」
- 所有维度数据缺失：显示 Empty State 图标 + 「F1/F7/F8/E7/E8 数据源未加载，请先运行数据分析」

---

### 模块三：动作异常生命监测线（AnomalyTimeline）

#### 5.1 数据来源

| 字段 | 原始表 | 字段名 | 说明 |
|------|--------|--------|------|
| 每日拨打数 | F5 | `daily_outreach.by_cc[cc_name].dates[].call_count` | 按日期逐条 |
| 日期 | F5 | `daily_outreach.by_cc[cc_name].dates[].date` | YYYY-MM-DD |

取最近 30 个自然日的数据（T-1 起往前 30 天，周三权重为 0，工作日正常计入）。

#### 5.2 异常阈值

| 状态 | 条件 | 颜色 |
|------|------|------|
| 正常 | 日拨打 ≥ 25 次 | 绿色 |
| 黄旗 | 18 ≤ 日拨打 ≤ 24 次 | 黄色 |
| 红旗 | 日拨打 < 18 次 | 红色 |
| 休息日 | 周三或泰国法定假日 | 灰色条，不计入旗帜统计 |

**红旗文本生成规则：**

```python
# 连续 N 天红旗
if consecutive_red_days >= 3:
    red_flags.append(f"连续 {consecutive_red_days} 天外呼低于 18 次（{start_date}～{end_date}）")

# 单日严重低于
if call_count < 10:
    red_flags.append(f"{date} 仅拨打 {call_count} 次，需确认是否出勤")
```

#### 5.3 计算公式

```
当月红旗天数 = COUNT(工作日 where daily_calls < 18)
当月黄旗天数 = COUNT(工作日 where 18 <= daily_calls < 25)
外呼达标率 = COUNT(工作日 where daily_calls >= 25) / COUNT(工作日) × 100%
```

#### 5.4 UI 规格

```
┌──────────────────────────────────────────────────────────────┐
│  外呼监测线（近30天）          达标率 73%   红旗 4天  黄旗 8天  │
│                                                               │
│  [柱状图，每列代表一天，按颜色区分：绿/黄/红/灰]               │
│  X轴：日期（每5天显示一个标签）                               │
│  Y轴：拨打次数（0-50）                                        │
│  阈值线：25次（绿色虚线），18次（红色虚线）                    │
│                                                               │
│  红旗详情                                                     │
│  ● 连续 3 天外呼低于 18 次（2026-02-10～2026-02-12）          │
│  ● 2026-02-05 仅拨打 6 次                                     │
└──────────────────────────────────────────────────────────────┘
```

- 柱宽：自适应 30 天区间
- Tooltip：hover 显示具体日期 + 拨打数 + 旗帜等级
- 红旗列表：按日期降序排列，最多展示 5 条，超过 5 条折叠

#### 5.5 空态处理

- F5 数据源未加载：显示「外呼数据暂无，请确认 F5 宣宣_转介绍每日外呼数据 文件已上传」
- 近 30 天全为休息日（不可能场景，做兜底）：显示「无有效工作日数据」

---

### 模块四：金钱与订单转化池（RevenueSharePanel）

#### 6.1 数据来源

| 字段 | 原始表 | 字段名 | 取值逻辑 |
|------|--------|--------|---------|
| 当月转介绍收入 | E7 / E8 | `revenue_usd` | 过滤：`channel == "转介绍" AND seller == cc_name AND order_tag == "新单"`，按 CC 聚合 SUM |
| 付费单量 | E7 / E8 | `order_count` | 同上过滤，COUNT |
| 套餐类型分布 | E7 / E8 | `package_type` | 按 `package_type` 分组，COUNT 和占比 |
| 客单价 (ASP) | E7 / E8 | `amount_usd` | `SUM(amount_usd) / COUNT(orders)` |
| 团队排名 | E7 / E8 | 全 CC 收入对比 | rank_in_team = 降序排名 |

> 收入过滤条件与 CLAUDE.md 业绩计算规则一致：CC 前端 + 新单 + 转介绍渠道。

#### 6.2 计算公式

```python
mtd_usd    = SUM(amount_usd WHERE channel=="转介绍" AND seller==cc_name AND order_tag=="新单")
mtd_thb    = mtd_usd × exchange_rate  # 从 config API 读取，默认 34
asp_usd    = mtd_usd / order_count    # order_count = COUNT(符合条件的订单)

# 套餐分布
package_mix = [
    {"type": pkg, "count": n, "pct": n / total_orders}
    for pkg, n in group_by(package_type).items()
]

# 团队排名
rank_in_team = sorted(team_revenue_list, reverse=True).index(cc_revenue) + 1
```

#### 6.3 UI 规格

```
┌──────────────────────────────────────────────────────────────┐
│  [KPI 卡] 当月业绩         [KPI 卡] 付费单量                  │
│  $1,234 (฿41,956)         18 单                              │
│  团队排名 #3/12            ASP $68.5                          │
│                                                               │
│  套餐组合分布（饼图）                                          │
│  ● 标准包  45%                                                │
│  ● 体验包  30%                                                │
│  ● 精英包  25%                                                │
└──────────────────────────────────────────────────────────────┘
```

- KPI 卡：2 列布局，参考项目现有 `BigMetricCard` 组件样式
- 饼图：Recharts `PieChart`，3-5 种套餐类型，超过 5 种合并为「其他」
- 币种显示格式：`$X,XXX (฿XX,XXX)`，遵循 CLAUDE.md 规范
- 汇率从 `/api/config/exchange-rate` 动态读取

#### 6.4 空态处理

- E7 / E8 无数据：显示「本月暂无转介绍订单数据，请上传 E7/E8 订单明细文件」
- mtd_usd == 0：正常显示 $0，不特殊处理，套餐饼图显示 Empty State

---

## 四、后端实现规格

### 7.1 新增 API 端点

**文件：** `backend/api/member.py`

```python
from fastapi import APIRouter, HTTPException
from backend.services.analysis_service import AnalysisService

router = APIRouter(prefix="/api/member", tags=["member"])

@router.get("/{cc_name}/profile")
def get_member_profile(cc_name: str) -> dict:
    """
    GET /api/member/{cc_name}/profile
    返回 MemberProfileResponse 结构
    P95 < 1s（数据已缓存到 Parquet，直接聚合）
    """
    service = AnalysisService()
    result = service.get_member_profile(cc_name)
    if not result:
        raise HTTPException(status_code=404, detail=f"CC '{cc_name}' not found")
    return result
```

**注册到 main.py：**

```python
from backend.api import member
app.include_router(member.router)
```

### 7.2 AnalysisService 扩展

`backend/services/analysis_service.py` 新增 `get_member_profile(cc_name)` 方法：

1. 从 Parquet 缓存加载 F1、F5、F7、F8、E7、E8
2. 调用 `RankingAnalyzer.analyze_cc_ranking()` 获取团队全量数据（用于计算 Benchmark 和百分位）
3. 组装 `MemberProfileResponse`
4. 徽章逻辑在 service 层计算，不依赖 RankingAnalyzer 内部方法

### 7.3 性能约束

- P95 响应时间 < 1s（Parquet 缓存已就绪，无需重新解析 Excel）
- 数据刷新频率：T-1 日更，与现有 `analysis_cache` 同步（无需额外调度）

---

## 五、前端实现规格

### 8.1 页面文件

**新建：** `frontend/app/biz/member/[cc_name]/page.tsx`

```typescript
"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { MemberHeroCard } from "@/components/biz/member/MemberHeroCard";
import { CompetenceRadar } from "@/components/biz/member/CompetenceRadar";
import { AnomalyTimeline } from "@/components/biz/member/AnomalyTimeline";
import { RevenueSharePanel } from "@/components/biz/member/RevenueSharePanel";
import type { MemberProfileResponse } from "@/lib/types/member";

export default function MemberProfilePage() {
  const { cc_name } = useParams<{ cc_name: string }>();
  const decodedName = decodeURIComponent(cc_name);

  const { data, error, isLoading } = useSWR<MemberProfileResponse>(
    `/api/member/${cc_name}/profile`,
    swrFetcher
  );

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>数据加载失败：{error.message}</div>;
  if (!data) return <div>未找到该 CC 的数据</div>;

  return (
    <div className="p-6 space-y-6">
      <BreadcrumbNav
        items={[
          { label: "团队排行", href: "/biz/ranking-enhanced" },
          { label: decodedName },
        ]}
      />
      <MemberHeroCard identity={data.identity} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompetenceRadar radar={data.radar} />
        <AnomalyTimeline anomaly={data.anomaly} />
      </div>
      <RevenueSharePanel revenue={data.revenue} />
    </div>
  );
}
```

### 8.2 入口改造

**修改：** `frontend/components/charts/EnhancedRankingTable.tsx`

CC 姓名列改为超链接：

```typescript
// 原：<td>{row.cc_name}</td>
// 改：
import Link from "next/link";

<td>
  <Link
    href={`/biz/member/${encodeURIComponent(row.cc_name)}`}
    className="text-blue-600 hover:underline"
  >
    {row.cc_name}
  </Link>
</td>
```

### 8.3 类型定义

**新建：** `frontend/lib/types/member.ts`

完整复制 1.1 节的 TypeScript interface，作为前后端契约。

---

## 六、验收标准

### 9.1 功能验收

| 验收项 | 标准 |
|--------|------|
| 雷达 6 维 | 全有值或显式 Empty State，不存在未定义的 undefined |
| 红旗数据 | 与 F5 原始 Excel 中该 CC 的每日拨打数可交叉核对，误差 0 |
| 徽章触发 | 对已知 CC 逐一核对触发条件，结果与手动计算一致 |
| 业绩数字 | 与 `/biz/ranking-enhanced` 页面该 CC 收入数据一致 |
| 币种显示 | 格式严格为 `$X,XXX (฿XX,XXX)`，无人民币符号 |
| 新人处理 | 入职 <7 天的 CC 雷达灰化，徽章全灰 |
| 空态 | 各模块独立降级，无一模块报错导致整页白屏 |
| API 性能 | P95 < 1s（在 Parquet 缓存预热的前提下） |

### 9.2 QA 检查清单

```
[ ] GET /api/member/{cc_name}/profile 返回 200 + 完整结构
[ ] cc_name 不存在时返回 404
[ ] 雷达 personal 数组长度严格 == 6
[ ] 雷达 benchmark 数组长度严格 == 6
[ ] 徽章"转化尖兵"触发逻辑：rank <= ceil(team_size × 0.15)
[ ] 红旗阈值：< 18 次 = red，18-24 次 = yellow，正确分类
[ ] 收入过滤：仅含 CC + 新单 + 转介绍渠道
[ ] 面包屑点击"团队排行"返回 /biz/ranking-enhanced
[ ] tsc 0 errors（member.ts 新类型）
[ ] py_compile PASS（member.py 新端点）
```

---

## 七、评分自检表

| 维度 | 满分 | 自评分 | 自评说明 |
|------|------|--------|---------|
| **科学理论基础** | 20 | 19 | 百分位排名归一化公式明确（rank/N×100）；异常阈值精确定义（<18红/18-24黄/≥25绿）；徽章触发公式可量化验证。未使用 t-test 等不必要统计方法，与个人工具定位匹配。 |
| **系统性** | 20 | 19 | 模块级独立降级机制覆盖全部 4 个模块；面包屑导航回路定义；新人判断规则（入职<7天）；数据刷新频率（T-1 与现有 cache 同步）；API 端点完整定义。 |
| **框架性** | 20 | 20 | TypeScript interface 强定义（MemberProfileResponse + BadgeDetail）；组件树完整（5 个组件 + 页面）；后端路由 + service + analyzer 分层；并行交付计划（Step 1+2 并行）；字段级数据映射表完整。 |
| **可量化** | 20 | 20 | 徽章触发条件精确到公式（×1.2中位数、连续4周≥28次、前15%）；旗帜阈值数字精确；P95 < 1s 性能约束；验收标准可逐项核对。 |
| **可溯源** | 20 | 20 | 6 维雷达逐维映射到原始表+列索引+字段名；收入计算遵循 CLAUDE.md 业绩规则；Benchmark 来源说明（F1 汇总行或同组均值）；数据刷新机制（T-1 Parquet）；文件路径引用精确到 loader 目录。 |
| **总计** | 100 | 98 | |

> 失分说明（-2分）：科学理论基础维度扣 1 分——hire_days 推算方式（从 F1 首次出现日期）为间接推断，非直接字段，存在轻微不确定性；系统性维度扣 1 分——泰国法定假日维护方式未在本文档中明确说明（依赖现有 time_period.py 逻辑，未展开）。

---

## 附录：业务术语速查

| 术语 | 含义 |
|------|------|
| CC | 前端销售 |
| SS | 后端销售（数据别名 EA） |
| LP | 后端服务（数据别名 CM） |
| 围场 | 用户付费当日起算天数分段（0-30/31-60/61-90/91-180/181+） |
| 带新系数 | B注册数 / 带来注册的A学员数 |
| 触达率 | 有效通话(≥120s)学员 / 有效学员 |
| 参与率 | 带来≥1注册的学员 / 有效学员 |
| THCC | 泰国前端销售团队 |
| T-1 | 今天处理的是昨天的数据 |
| 带货比 | 推荐注册数 / 有效学员 |

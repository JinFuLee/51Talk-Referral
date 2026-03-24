# UX 审计：表格 / 数据展示 + 可读性

> 审计时间：2026-03-25 | 范围：`frontend/` 全站

---

## 执行摘要

全站共扫描到约 **39 个含 `<table>` 的文件**，其中 20 个是 Slide 组件或 `referral-contributor` 页，其余约 19 个页面级/业务级表格**独立实现表头样式**，未统一使用 `slide-thead-row` 设计体系 Token。

三大系统性问题：
1. **表格表头样式双轨并行** — `slide-thead-row` 仅覆盖 Slide 层，页面层全部用 `bg-[var(--n-800)] text-white` 自写
2. **币种显示规范违规** — 6 处只显示 `$xxx`，缺失泰铢 `฿xxx`，违反 `$X (฿Y)` 规范
3. **formatRate 空值返回 "0%"** — 数据为 null 时显示 "0%" 而非 "—"，误导用户

---

## 表格审计

### 表格样式统一

| 表格组件/文件 | slide-thead-row | hover 高亮 | sticky header | 数字右对齐+tabular-nums | 问题 |
|-------------|:--------------:|:---------:|:------------:|:-------------------:|-----|
| `slides/` 全部 (10个) | ✓ | 无(只读) | 无 | ✓ | Slide 表头样式来源 CSS |
| `referral-contributor/page.tsx` | ✓ | 无 | 无 | ✓ | 唯一使用 slide-thead-row 的页面 |
| `MemberTable.tsx` | ✗ | 部分(`even:bg`) | 无 | ✓ | 用 `bg-[var(--n-800)] text-white` 自写表头 |
| `StudentTable.tsx` | ✗ | ✓(`hover:bg-blue-50`) | 无 | ✓ | 同上 |
| `ChannelFunnelTable.tsx` | ✗ | 无 | 无 | ✓ | 同上 |
| `CCRankingTable.tsx` | ✗ | 无 | 无 | ✓ | 同上 |
| `RevenueContributionTable.tsx` | ✗ | 无 | 无 | ✓ | 同上 |
| `ThreeFactorTable.tsx` | ✗ | 无 | 无 | ✓ | 同上 |
| `ScenarioTable.tsx` | ✗ | 无 | 无 | ✓ | 同上 |
| `RankingTab.tsx` (打卡排行) | ✗ | ✓(`even:bg`) | 无 | ✓ | 用 `bg-[var(--bg-subtle)]` 非深色表头 |
| `TeamDetailTab.tsx` | ✗ | ✓(`even:bg`) | 无 | ✓ | 同上 |
| `FollowupTab.tsx` | ✗ | ✓(`even:bg`) | 无 | ✓ | 同上 |
| `enclosure/page.tsx` (CC/SS/LP 表) | ✗ | ✓ | 无 | ✓ | 直接内联 `className` |
| `personnel-matrix/page.tsx` | ✗ | ✓ | 无 | ✓ | 直接内联 `className` |
| `outreach-quality/page.tsx` | ✗ | 无 | 无 | ✓ | 只有条形图，表格空 |
| `channel/page.tsx` | ✗ | 无 | 无 | ✓ | 自写 |
| `funnel/page.tsx` | ✗ | 无 | 无 | ✓ | 自写 |
| `EnclosureHeatmap.tsx` | ✗ | 无 | 无 | 部分 | 热图非标准表 |
| `DailyLogTab.tsx` | ✗ | ✓ | 无 | ✓ | 自写 |

**总结**：
- 使用 `slide-thead-row` 的表格：**11 个**（仅 Slides + referral-contributor）
- 不使用、独立实现的表格：**28 个**
- 含 hover 行高亮的表格：约 **12 个**（不统一）
- 有 sticky header 的表格：**0 个**（全站无）
- 数字右对齐 + tabular-nums：覆盖率约 **90%**，少量老旧页面缺失

---

## 数据格式问题

| 问题 | 出现位置 | 当前格式 | 正确格式 | 优先级 |
|------|---------|---------|---------|:------:|
| 币种缺泰铢 | `FollowupTab.tsx:73,396` | `$1,234` | `$1,234 (฿41,956)` | P1 |
| 币种缺泰铢 | `StudentTable.tsx:130` | `$${m.paid_amount.toLocaleString()}` | `formatRevenue(m.paid_amount)` | P1 |
| 币种缺泰铢 | `Profile360Drawer.tsx:325` | `$${p.paid_amount.toLocaleString()}` | `formatRevenue(p.paid_amount)` | P1 |
| 币种缺泰铢 | `ReferralNetwork.tsx:36` | `$${paid_amount.toLocaleString()}` | `formatRevenue(paid_amount)` | P1 |
| 币种缺泰铢 | `personnel-matrix/page.tsx:231` | `$${row.paid_amount.toLocaleString()}` | `formatRevenue(row.paid_amount)` | P1 |
| 币种缺泰铢 | `RevenueDecompositionSlide.tsx:21` | 本地 `formatUSD(v)` 函数 | `formatRevenue(v)` 或标注"仅USD" | P1 |
| formatRate 返回 "0%" | `utils.ts:41` - 被全站 64 个文件引用 | `null → "0%"` | `null → "—"` | P1 |
| 百分比小数不统一 | `ReferralContributorPage:pct()` vs `formatRate()` | 部分 `toFixed(1)` 部分直接 `formatRate` | 统一用 `formatRate` | P2 |
| 日期格式不统一 | `MemberTable:cc_last_call_date` / `StudentTable:last_contact_date` | 直接显示后端字符串（格式未控制） | `YYYY-MM-DD` 统一格式化 | P2 |
| "nan" 原始值暴露 | 后端数据异常时前端未过滤 | 可能显示 `NaN` | 在 formatRate/formatRevenue 加 isNaN 保护 | P2 |

### 重点：formatRate 空值 Bug

```typescript
// 当前（lib/utils.ts:41）— 有误
export function formatRate(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "0%";  // ← "0%" 误导
  return `${(Number(v) * 100).toFixed(1)}%`;
}

// 修复建议
export function formatRate(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "—";  // 无数据 = 破折号
  return `${(Number(v) * 100).toFixed(1)}%`;
}
```

**影响范围**：全站 64 个文件的百分比展示。打卡率/参与率/转化率在无数据时显示"0%"会被误读为"真实的 0% 业绩"，需要立即修复。

---

## 图表可读性审计

### Recharts 图表组件（共 26 个文件）

| 图表组件 | 类型 | 有标题 | 有图例 | tooltip 格式 | 色盲友好 | 改善建议 |
|---------|-----|:------:|:------:|:-----------:|:-------:|---------|
| `CCContactRanking.tsx` | 横向柱状图 | 无 | 无 | ✓ (格式化%) | ✗ 仅用颜色区分CC | 加轴标签说明"触达率" |
| `RoleCompare.tsx` | 分组柱状图 | 无 | ✓ | ✓ | 部分 (蓝/绿/紫) | 无 |
| `ChannelPieChart.tsx` | 环形图 | 无 | ✓ | ✓ (formatRevenue) | ✗ 颜色唯一区分 | 加文字标注百分比 |
| `ContributionBreakdown.tsx` | 横向柱状图 | ✓(p标签) | ✓(底部) | ✓ | ✗ 红绿唯一区分 | 加图案或数字标注 |
| `EfficiencyScatter.tsx` | 散点图 | 无 | ✓(象限) | ✓ (自定义popup) | 部分 | 轴标签已有 ✓ |
| `ConversionRateBar.tsx` | 柱状图 | 无 | — | 未读 | 未知 | 补充上下文 |
| `CCRadarChart.tsx` | 雷达图 | 无 | 部分 | 未读 | 部分 | 加维度解释 |
| `MetricRadar.tsx` | 雷达图 | 无 | — | 未读 | 未知 | 加轴标签单位 |
| `SegmentContactBar.tsx` | 柱状图 | 无 | — | 未读 | 未知 | — |
| `ContactConversionScatter.tsx` | 散点图 | 无 | — | 未读 | 未知 | 加象限标注 |
| `SegmentBenchmark.tsx` | 图表 | 未读 | — | 未读 | 未知 | — |
| `referral-contributor/page.tsx` 图 | 分组柱状图 | ✓(Card title) | ✓ | 基础 Tooltip | 部分 | Tooltip 加格式 |
| `outreach-quality/page.tsx` 图 | 分组柱状图 | ✓(h1) | ✓ | 基础 Tooltip | 部分 | — |

**共同问题**：
1. **图表无 `<title>` 属性** — 无障碍访问（a11y）不合格，屏幕阅读器无法识别
2. **全站无图表标题统一规范** — 有的用 `Card` 的 `title` prop，有的用 `<p>` 标签，有的完全没有
3. **tooltip 格式不统一** — `referral-contributor` 用默认 Recharts tooltip，其他组件用自定义 contentStyle，视觉风格不统一
4. **红绿色盲问题** — `ContributionBreakdown` 用红/绿色区分业绩好坏，色盲用户无法区分

---

## SortableHeader 使用审计

| 表格 | 有排序 | 可排序但无排序的列 | 文件路径 |
|-----|:------:|-----------------|---------|
| `StudentTable.tsx` | ✓ (4列) | 围场/生命周期 | `components/student-360/StudentTable.tsx` |
| `CCRankingTable.tsx` | ✓ (5列) | — | `components/enclosure/CCRankingTable.tsx` |
| `referral-contributor` | ✓ (全列) | — | `app/referral-contributor/page.tsx` |
| `followup-quality/page.tsx` | ✓ (部分) | 质量评分/围场/到期天 | `app/followup-quality/page.tsx` |
| `students/360` | ✓ | — | `app/students/360/page.tsx` |
| `MemberTable.tsx` | ✗ | 围场/付费/到期天/打卡天 | `components/members/MemberTable.tsx` |
| `ChannelFunnelTable.tsx` | ✗ | 全部注册/付费列 | `components/funnel/ChannelFunnelTable.tsx` |
| `ThreeFactorTable.tsx` | ✗ | 预期量/实际量/差距 | `components/channel/ThreeFactorTable.tsx` |
| `ScenarioTable.tsx` | ✗ | 影响付费/影响业绩 | `components/funnel/ScenarioTable.tsx` |
| `RankingTab.tsx` | ✗ | 打卡率/有效学员 | `components/checkin/RankingTab.tsx` |
| `TeamDetailTab.tsx` | ✗ | 打卡率/团队 | `components/checkin/TeamDetailTab.tsx` |
| `enclosure/page.tsx` (CC/SS/LP) | ✗ | 参与率/触达率/带新 | `app/enclosure/page.tsx` |
| `personnel-matrix/page.tsx` | ✗ | 综合评分/参与率 | `app/personnel-matrix/page.tsx` |
| `RevenueContributionTable.tsx` | ✗ | 净业绩/占比/人均 | `components/channel/RevenueContributionTable.tsx` |

**SortableHeader 组件**（`components/ui/SortableHeader.tsx`）已存在，但仅 6 个组件用到，**另有 8+ 个业务数据表格应该支持排序但未接入**。

---

## "nan" / 空值处理审计

| 组件 | 当前显示 | 应该显示 | 文件路径 | 优先级 |
|------|---------|---------|---------|:------:|
| 所有使用 `formatRate` 的组件 | `"0%"`（数据为null时） | `"—"` | `lib/utils.ts:41` | P1 |
| `enclosure/page.tsx` `safe()` 函数 | 正确返回 `"—"` | ✓ 正确 | — | — |
| `personnel-matrix/page.tsx` `safe()` | 正确返回 `"—"` | ✓ 正确 | — | — |
| `channel/page.tsx` `fmtNum()` | 正确返回 `"—"` | ✓ 正确 | — | — |
| `checkin/RankingTab.tsx` `fmtRate()` | 正确返回 `"—"` | ✓ 正确 | — | — |
| `MemberTable.tsx` `?? "—"` 模式 | 正确 | ✓ 正确 | — | — |
| `StudentTable.tsx` `paid_amount` 显示 | `$xxx` 无泰铢 | `$xxx (฿xxx)` | `StudentTable.tsx:130` | P1 |
| `personnel-matrix` `paid_amount` | `$xxx` 无泰铢 | `$xxx (฿xxx)` | `personnel-matrix/page.tsx:231` | P1 |
| `FollowupTab.tsx` 本地 `fmtRevenue` | `$xxx` 无泰铢 | 用全局 `formatRevenue` | `FollowupTab.tsx:73` | P1 |
| `RevenueDecompositionSlide.tsx` 本地 `formatUSD` | `$xxx` 无泰铢 | `formatRevenue` 或保持USD(需标注) | `RevenueDecompositionSlide.tsx:21` | P2 |

---

## 核心改善建议（优先级排序）

### P1 — 立即修复（数据准确性问题）

#### 1. formatRate 空值 → "—" 而非 "0%"
- **Before**：`null → "0%"` 在 64 个文件的率指标显示中误导用户
- **After**：`null → "—"` 明确表示无数据
- **ROI**：改 1 行代码 → 修复全站 64 个文件的率指标显示准确性

#### 2. 统一币种格式（6 处本地 `$xxx` → `formatRevenue`）
- **Before**：6 个组件显示 `$1,234`（无泰铢）
- **After**：统一为 `$1,234 (฿41,956)` 遵循 CLAUDE.md 规范
- **ROI**：影响泰国用户对金额的理解，合规成本 vs. 误读成本

### P2 — 短期优化（可读性提升）

#### 3. sticky header — 长表格必须有
- **Before**：全站 0 个 sticky header，MemberTable（500+ 行）、enclosure 表等滚动时失去列名上下文
- **After**：为 MemberTable / enclosure/page / personnel-matrix / StudentTable 加 `sticky top-0 z-10`
- **ROI**：用户不需要频繁滚动回顶部确认列含义

#### 4. hover 行高亮统一
- **Before**：12 个表格有 hover，16 个无；风格从 `hover:bg-blue-50`、`hover:bg-[var(--bg-subtle)]`、`even:bg-[var(--bg-subtle)]` 各不同
- **After**：统一为 `hover:bg-[var(--hover-row,#f8fafc)]` CSS 变量
- **ROI**：无需改功能，仅统一 CSS class，视觉一致性提升

#### 5. slide-thead-row 向页面层推广
- **Before**：19 个页面级表格独立实现 `bg-[var(--n-800)] text-white text-xs font-medium`
- **After**：直接用 `slide-thead-row` + `slide-th` + `slide-td` class，删除重复样式
- **ROI**：后续改表头颜色只改 `globals.css` 一处

### P3 — 后续优化

#### 6. 为 8+ 个关键排行表添加排序
- **Before**：MemberTable / ChannelFunnelTable / ThreeFactorTable / ScenarioTable / RankingTab / enclosure 表格无排序
- **After**：使用已有的 `SortableHeader` 组件，接入各表格
- **ROI**：用户可按付费数/转化率等维度自行排序，减少运营人员人工筛选

#### 7. 图表 tooltip 统一 + 色盲友好
- **Before**：图表 tooltip 风格参差（部分用 `contentStyle`，部分用默认 Recharts 样式）；`ContributionBreakdown` 红绿色盲问题
- **After**：统一 `contentStyle`（已有各组件使用的模板），`ContributionBreakdown` 加形状或数字标注
- **ROI**：视觉一致性 + 合规性

---

## 技术债登记

| 债项 | 级别 | 影响 |
|------|------|------|
| `formatRate` null → "0%" | P1 | 全站 64 文件率指标假性 "0%" |
| 6 处本地 `$xxx` 不含泰铢 | P1 | 违反双币显示规范 |
| 全站无 sticky header | P2 | 长表格使用体验差 |
| slide-thead-row 覆盖率 56% | P2 | 表格样式维护成本高 |
| 图表无统一 tooltip 规范 | P3 | 视觉不一致 |
| 8+ 表格缺排序 | P3 | 运营人员无法自助筛选 |

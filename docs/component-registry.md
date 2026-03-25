# 组件设计体系注册表

> 维护规则：新增页面或组件后更新本表。扫描命令见文末。
> 最后扫描：2026-03-26

## 图例

| 符号 | 含义 |
|------|------|
| ✓ | 已使用 |
| C | 通过 `<Card>` 组件（等价于 card-base） |
| — | 不适用（无表格/无品牌点等） |
| ⚠️ | 孤岛：本地定义或硬编码颜色 |

---

## 页面级

| 页面 | 路径 | card-base/Card | slide-thead-row | metricColor | BrandDot | 孤岛标记 | 状态 |
|------|------|:--------------:|:---------------:|:-----------:|:--------:|---------|------|
| 首页 | `app/page.tsx` | ✓ | — | — | — | — | 已对齐 |
| 漏斗分析 | `app/funnel/page.tsx` | C | ✓ | — | ✓ | — | 已对齐 |
| 围场分析 | `app/enclosure/page.tsx` | C | ✓ | ✓ | — | `text-green-600` | 基本对齐 |
| 打卡管理 | `app/checkin/page.tsx` | C | ✓(本次) | ⚠️ | — | — | 本次修复 |
| 团队概览 | `app/team/page.tsx` | C | ✓ | ✓ | ✓ | `text-green-600` | 基本对齐 |
| 人员矩阵 | `app/personnel-matrix/page.tsx` | C | ✓ | ✓ | — | `text-green-600` | 基本对齐 |
| 渠道分析 | `app/channel/page.tsx` | C | ✓ | — | — | `text-green-600` | 基本对齐 |
| 成员管理 | `app/members/page.tsx` | C | ✓ | — | ✓ | `text-green-600` | 基本对齐 |
| 围场健康 | `app/enclosure-health/page.tsx` | C | — | — | — | — | 已对齐 |
| 每日监控 | `app/daily-monitor/page.tsx` | C | — | — | — | — | 已对齐 |
| 跟进质量 | `app/followup-quality/page.tsx` | C | ✓ | — | — | `text-green-600` | 基本对齐 |
| 触达质量 | `app/outreach-quality/page.tsx` | C | ✓ | — | — | `text-green-600` | 基本对齐 |
| 激励跟踪 | `app/incentive-tracking/page.tsx` | C | ✓ | — | — | `text-green-600` | 基本对齐 |
| 续费风险 | `app/renewal-risk/page.tsx` | C | ✓ | — | — | `text-green-600` | 基本对齐 |
| 到期预警 | `app/expiry-alert/page.tsx` | C | ✓ | — | — | `text-green-600` | 基本对齐 |
| 学习热力图 | `app/learning-heatmap/page.tsx` | C | ✓ | — | — | `text-green-600` | 基本对齐 |
| 地域分布 | `app/geo-distribution/page.tsx` | C | ✓ | — | — | — | 已对齐 |
| 转介绍贡献 | `app/referral-contributor/page.tsx` | C | ✓ | — | — | `text-green-600` | 基本对齐 |
| 归因分析 | `app/attribution/page.tsx` | C | — | — | — | `text-green-600` | 基本对齐 |
| 高潜名单 | `app/high-potential/page.tsx` | ✓ | — | — | — | `text-green-600` | 基本对齐 |
| 高潜作战室 | `app/high-potential/warroom/page.tsx` | — | — | — | — | `text-green-600` | ⚠️ 部分孤岛 |
| 学员360 | `app/students/360/page.tsx` | C | — | — | — | — | 已对齐 |
| 通知推送 | `app/notifications/page.tsx` | C | — | — | — | — | 已对齐 |
| 报告管理 | `app/reports/page.tsx` | C | — | — | — | — | 已对齐 |
| 系统设置 | `app/settings/page.tsx` | C | ✓ | — | — | — | 已对齐 |
| 指标矩阵 | `app/indicator-matrix/page.tsx` | — | — | — | — | — | 待扫描 |
| CC矩阵 | `app/cc-matrix/page.tsx` | — | — | — | — | — | 待扫描 |
| SS-LP矩阵 | `app/ss-lp-matrix/page.tsx` | — | — | — | — | — | 待扫描 |

---

## 打卡管理子组件

| 组件 | 路径 | card-base | slide-thead-row | metricColor(rateColor) | BrandDot | 状态 |
|------|------|:---------:|:---------------:|:----------------------:|:--------:|------|
| 排行 Tab | `components/checkin/RankingTab.tsx` | ✓(本次) | ✓(本次) | ✓(rateColor hook) | ✓ | 本次修复 |
| 团队明细 Tab | `components/checkin/TeamDetailTab.tsx` | ✓(本次) | ✓(本次) | ✓(rateColor hook) | — | 本次修复 |
| 运营渠道视图 | `components/checkin/OpsChannelView.tsx` | C(card-compact) | —(div布局) | — | — | 已对齐 |
| 跟进 Tab | `components/checkin/FollowupTab.tsx` | — | ✓ | — | — | 已对齐 |

---

## 通用组件（设计体系核心）

| 组件 | 路径 | 说明 |
|------|------|------|
| `Card` | `components/ui/Card.tsx` | 等价 card-base，圆角+白底+边框+阴影 |
| `BrandDot` | `components/ui/BrandDot.tsx` | 品牌蓝指示点 + tooltip |
| `BrandMark` | `components/ui/BrandMark.tsx` | 品牌标识 |
| `Spinner` | `components/ui/Spinner.tsx` | 加载态 |
| `EmptyState` | `components/ui/EmptyState.tsx` | 空态 |
| `PageTabs` | `components/ui/PageTabs.tsx` | 页面级 Tab 切换 |
| `ExportButton` | `components/ui/ExportButton.tsx` | CSV 导出 |

---

## 已识别孤岛清单（待系统性清理）

以下为扫描到的硬编码颜色孤岛，集中在状态色（绿/红/橙），属于语义色而非设计 token 调用：

| 孤岛模式 | 频次 | 建议替换 | 优先级 |
|---------|------|---------|--------|
| `text-green-600` | 高（27 文件） | `metricColor(val, thresholds)` 或 CSS var | P2 |
| `text-red-600` | 高 | `metricColor` 或 `text-[var(--text-danger)]` | P2 |
| `text-yellow-*` / `text-amber-*` | 中 | `metricColor` 或 `text-[var(--text-warning)]` | P2 |
| `bg-white` | 低 | `bg-[var(--bg-surface)]` | P3 |
| `border-slate-*` | 低 | `border-[var(--border-default)]` | P3 |

> 注：状态色孤岛在运营场景中有明确语义（绿=好/红=差），清理时需确认阈值来源，
> 建议统一走 `useCheckinThresholds` / `metricColor` hook，而非逐一替换 class。

---

## 扫描命令

```bash
# 检查是否有新增孤岛（硬编码颜色）
grep -r "text-green-600\|text-red-600\|bg-white\b\|border-slate-" \
  frontend/app --include="*.tsx" -l

# 检查 slide-thead-row 覆盖率
grep -r "slide-thead-row" frontend/app --include="*.tsx" -l

# 检查 card-base / Card 组件覆盖率
grep -r "card-base\|<Card\b" frontend/app --include="*.tsx" -l

# 检查 metricColor 共享使用
grep -r "metricColor" frontend/app --include="*.tsx" -l
```

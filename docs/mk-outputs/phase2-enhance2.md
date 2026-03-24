# Phase2 Enhance2 完成报告

完成时间: 2026-03-24
Commit: cf9b6743

## 变更汇总

### P1-G `/channel` — 渠道 TOP 推荐者
- 新增第 4 个 Tab「渠道推荐者」
- 从 `/api/analysis/referral-contributor?top=200` 获取全量贡献者数据
- 前端按 CC窄/SS窄/LP窄/宽口 4 个渠道分别排序，展示各渠道 TOP5（按该渠道带新付费数降序）
- 展示字段：排名、学员ID、围场、该渠道带新付费数、总带新数

### P1-H `/renewal-risk` — LTV 维度扩展
- 后端 `_row_to_item` 新增两字段：
  - `total_lesson_packages`（总次卡数，历史购买规模）
  - `total_renewal_orders`（总1v1续费订单数，高续费=高价值）
- 前端高风险学员表新增对应两列，含 ⓘ tooltip 说明
- 字段候选映射：`总次卡数/历史总次卡数/累计次卡数` + `总1v1续费订单数/1v1续费订单数/续费订单总数/历史续费次数`

### P1-I `/incentive-tracking` — 历史转码均值
- 后端 `_group_stats` 新增 `avg_historical_coding` 字段（候选列名：历史转码次数/总转码次数/历史总转码次数）
- 前端分组明细表新增「均历史转码」列，含 ⓘ tooltip（高转码=高活跃，验证激励是否触达活跃群体）

### P1-J `/high-potential` — urgency 升级
- 后端新增 `_days_since_cc_contact()` 函数，解析 CC末次接通日期，计算距今天数
- 后端 `HighPotentialStudent` Pydantic 模型新增：
  - `days_since_last_cc_contact: int | None`
  - `deep_engagement: bool | None`（出席数 ≥ 2 时为 True）
- 前端 `HighPotentialStudent` TS 接口同步更新
- 学员卡片新增：
  - 失联天数（>14天红色，7-14天橙色，≤7天绿色）
  - 「深度参与」绿色标签（出席数 ≥ 2）

### P2-A `/learning-heatmap` — 参与趋势
- 后端新增 `trend_ratio` 字段（历史前几周均值 / 本周转码，>1=衰减，<1=增长，≈1=稳定）
- 前端热图表格新增「趋势」列（↑ 增长绿色 / ↓ 衰减红色 / → 稳定灰色）
- 阈值：>1.15 衰减，<0.85 增长

### P2-C `/daily-monitor` — SS/LP 个人排行
- 新增 `ssRanking` / `lpRanking` 两个 useSWR（`role=ss/lp`）
- CC接通排行卡片升级为三 Tab 切换（CC排行/SS排行/LP排行）
- 后端 `/api/daily-monitor/cc-ranking?role=` 已支持 ss/lp 参数（CrossAnalyzer.daily_cc_ranking）

## 文件变更清单

### 后端
- `backend/api/renewal_risk.py` — _row_to_item 扩展两字段
- `backend/api/incentive_effect.py` — _group_stats 加 avg_historical_coding
- `backend/api/high_potential.py` — 新增 _days_since_cc_contact，_row_to_hp 扩展
- `backend/api/learning_heatmap.py` — 返回 trend_ratio 字段
- `backend/models/member.py` — HighPotentialStudent 新增两字段

### 前端
- `frontend/app/channel/page.tsx` — 新增「渠道推荐者」Tab
- `frontend/app/renewal-risk/page.tsx` — 接口类型扩展，表格新增两列
- `frontend/app/incentive-tracking/page.tsx` — 接口扩展，表格新增均历史转码列
- `frontend/app/high-potential/page.tsx` — 卡片新增失联天数+深度参与标签
- `frontend/app/learning-heatmap/page.tsx` — 接口扩展，表格新增趋势列
- `frontend/app/daily-monitor/page.tsx` — SS/LP useSWR + Tab切换排行
- `frontend/lib/types/member.ts` — HighPotentialStudent 类型同步

# MK3: enclosure/members/team 域子组件

## 任务完成摘要

创建了 9 个子组件，分布在 3 个子目录下。

## 产出文件

### enclosure/（4 个）
- `frontend/components/enclosure/EnclosureHeatmap.tsx` — 围场×CC 热力图表格，参与率/带货比/打卡率/触达率着色（绿高红低），props: `metrics: EnclosureCCMetrics[]`
- `frontend/components/enclosure/EnclosureFilter.tsx` — 围场筛选器 button group（全部/0~30/31~60/61~90/91~180/181+），props: `value/onChange`
- `frontend/components/enclosure/MetricRadar.tsx` — Recharts RadarChart，5 维指标雷达（参与率/带新系数/带货比/打卡率/触达率），props: `metrics: EnclosureCCMetrics`
- `frontend/components/enclosure/CCRankingTable.tsx` — CC 排名表（CC名/组/学员数/参与率/带货比/注册数/付费数），支持 4 列点击排序，props: `rankings: CCRankingItem[]`

### members/（3 个）
- `frontend/components/members/MemberTable.tsx` — 学员分页表格（ID/姓名/围场/CC/注册/预约/出席/付费），props: `items/total/page/pageSize/onPageChange/onRowClick`
- `frontend/components/members/MemberDetailDrawer.tsx` — 学员详情侧滑抽屉，4 分组（基本信息/CC跟进/转介绍漏斗/其他字段），支持 59+ 字段动态展示，props: `student/open/onClose`
- `frontend/components/members/LifecycleBadge.tsx` — 生命周期标签，0M=绿/1M=蓝/2M=黄/3M+=红，props: `lifecycle: string`

### team/（2 个）
- `frontend/components/team/TeamSummaryCard.tsx` — 团队汇总卡片（组名/学员数/参与率/注册数/付费数/业绩USD），props: 各字段平铺
- `frontend/components/team/TeamCompareChart.tsx` — 团队对比：参与率柱状图 + 注册数/付费数对比柱状图（Recharts BarChart），props: `teams: TeamDataItem[]`

## 技术细节
- 所有组件 props 接收数据（不自 fetch），由页面传入
- Tailwind CSS + 与现有页面风格一致
- loading/empty 三态完整
- commit: `feat: add enclosure/members/team sub-components (9 files)`

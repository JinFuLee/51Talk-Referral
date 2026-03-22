# Wave 2 前端实现报告：日常触达监控 + 高潜/打卡增强

## 交付物

### 新建文件（7个）
1. `frontend/app/daily-monitor/page.tsx` — 触达监控页，含大数字仪表、漏斗、堆叠柱图、排行、散点图
2. `frontend/components/daily-monitor/ContactGauge.tsx` — 大数字触达率仪表组件
3. `frontend/components/daily-monitor/SegmentContactBar.tsx` — 围场触达堆叠柱图（Recharts BarChart）
4. `frontend/components/daily-monitor/CCContactRanking.tsx` — CC接通排行横向条形图
5. `frontend/components/daily-monitor/RoleCompare.tsx` — CC/SS/LP三列对比柱图
6. `frontend/components/daily-monitor/ContactConversionScatter.tsx` — 触达×转化散点图（Recharts ScatterChart）

### 修改文件（5个）
7. `frontend/lib/types/cross-analysis.ts` — 新增 DailyMonitorStats / SegmentContactItem / FunnelStats / CCContactRankItem / ContactConversionItem 五个类型
8. `frontend/lib/api.ts` — 新增 dailyMonitorAPI（getStats / getCCRanking / getContactVsConversion）
9. `frontend/app/high-potential/page.tsx` — 增强：warroom SWR + 紧急度边框颜色 + 最后接通/近7日打卡/窗口期三项指标
10. `frontend/app/checkin/page.tsx` — 增强：底部新增"触达效果分析"section + 复用 ContactConversionScatter
11. `frontend/components/layout/NavSidebar.tsx` — 添加 /daily-monitor 导航项（Radio 图标）

## API 对接
- GET /api/daily-monitor/stats → DailyMonitorStats
- GET /api/daily-monitor/cc-ranking?role=cc → CCContactRankItem[]
- GET /api/daily-monitor/contact-vs-conversion → ContactConversionItem[]
- GET /api/high-potential/warroom → WarroomStudent[]（已有 warroomAPI，复用）

## 设计决策
- 高潜页 warroom map 通过 stdt_id 关联，兼容 id 类型为数字的现有 HighPotentialStudent
- 散点图自定义 shape 函数展示 CC 名称标签
- 漏斗用相对宽度条形图而非 FunnelChart（无需额外依赖）
- 打卡页 scatter 仅在有数据时渲染（条件渲染），不影响现有 tab 布局

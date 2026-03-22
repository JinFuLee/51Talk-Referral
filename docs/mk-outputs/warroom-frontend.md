# MK Output: warroom-frontend

## 任务
高潜作战室页面 `/high-potential/warroom` + 总览页月度达成增强

## 交付文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/app/high-potential/warroom/page.tsx` | 新建 | 高潜作战室主页面（紧急度筛选+表格+展开时间轴） |
| `frontend/components/warroom/UrgencyCards.tsx` | 新建 | 红/黄/绿紧急度卡片（点击切换过滤） |
| `frontend/components/warroom/ContactTimeline.tsx` | 新建 | 学员30天CC/SS/LP接通+打卡网格 |
| `frontend/components/warroom/HPFunnel.tsx` | 新建 | 高潜漏斗：高潜→带新→出席→付费 |
| `frontend/lib/types/cross-analysis.ts` | Edit 追加 | 新增 WarroomStudent / DailyContact / WarroomTimeline 类型 |
| `frontend/lib/api.ts` | Edit 追加 | 新增 warroomAPI（getStudents / getTimeline） |
| `frontend/components/layout/NavSidebar.tsx` | Edit | 在"交叉分析"组追加 /high-potential/warroom 导航项（Swords 图标） |
| `frontend/app/page.tsx` | Edit 追加 | 新增 MonthlyAchievementSection（月度目标达成3环形进度） |

## API 消费
- `GET /api/high-potential/warroom?urgency=red|yellow|green` → WarroomStudent[]
- `GET /api/high-potential/{stdt_id}/timeline` → WarroomTimeline
- `GET /api/attribution/summary` → AttributionSummary（月度达成率）

## 设计规范
- red=#ef4444 / yellow=#f59e0b / green=#22c55e
- days_remaining<7 红色粗体
- 表格斑马纹 + 点击展开 ContactTimeline
- 月度达成3环形：单量(#6366f1) / 业绩(#10b981) / 客单价(#f59e0b)

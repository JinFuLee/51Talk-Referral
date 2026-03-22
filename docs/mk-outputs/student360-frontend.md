# Wave 4 前端：学员360全景档案 — 实现报告

## 交付摘要

实现路径：`/students/360`，包含搜索/筛选/分页表格 + 7-Tab 侧边抽屉。

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/lib/types/cross-analysis.ts` | Edit | 新增 7 个 Student360 类型接口 |
| `frontend/lib/api.ts` | Edit | 新增 `student360API`（search/getDetail/getNetwork） |
| `frontend/app/students/360/page.tsx` | Write | 主页面：搜索+筛选+表格+抽屉协调 |
| `frontend/components/student-360/StudentSearch.tsx` | Write | 搜索框 + 5 个筛选下拉（300ms debounce） |
| `frontend/components/student-360/StudentTable.tsx` | Write | 分页表格：高潜橙色Badge + 可点击排序表头 |
| `frontend/components/student-360/Profile360Drawer.tsx` | Write | 7-Tab 侧边抽屉（max-w-2xl，ESC 关闭） |
| `frontend/components/student-360/DailyLogTab.tsx` | Write | 日报轨迹网格（近30天 CC/SS/LP接通+打卡） |
| `frontend/components/student-360/ReferralNetwork.tsx` | Write | 推荐网络树状列表（推荐人→当前→被推荐） |
| `frontend/components/layout/NavSidebar.tsx` | Edit | 分析组新增「学员360档案」导航项 |

## 类型接口

```typescript
Student360Brief       // 列表行数据（10个字段）
Student360SearchResponse  // 分页响应
Student360Profile     // 详情档案（含59列全量 + index signature）
Student360DailyLog    // 日报单行
Student360HpInfo      // 高潜信息
Student360Detail      // 详情聚合响应
Student360Network     // 推荐网络
Student360SearchParams // 搜索参数
```

## API 方法

- `student360API.search(params)` → `GET /api/students/360/search`
- `student360API.getDetail(stdtId)` → `GET /api/students/360/{stdt_id}`
- `student360API.getNetwork(stdtId, depth)` → `GET /api/students/360/{stdt_id}/network`

## 设计规范实现

- 高潜 Badge：`#f97316` 橙色背景 + 白字
- 高潜行：左侧 `border-l-2 border-l-orange-400` 标注
- 抽屉宽度：`max-w-2xl`
- Tab 7 个：基本信息/学习行为/推荐行为/CC跟进/付费信息/带新成果/日报轨迹
- 学习行为 Tab：本月 vs 上月对比 + 环比差值列
- 分页显示：「第X / Y页，共Z条」格式

## 验证结果

- `npx tsc --noEmit`：0 错误
- 修复了 shadcn 组件 import 大小写问题（Badge→badge, Tabs→tabs, Select→select）

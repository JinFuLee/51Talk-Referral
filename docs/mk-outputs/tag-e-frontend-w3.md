# Wave3 前端产出 — tag-e-frontend-w3

## 完成项

### 1. /students/360 补全字段

**后端变更**：
- `backend/core/cross_analyzer.py` — `student_detail()` 新增5字段：`referral_reward_status`、`avg_lesson_consumed_3m`、`days_to_card_expiry`、`days_since_last_renewal`、`total_renewal_orders`
- `backend/models/student_360.py` — `StudentDetail` 模型同步扩展
- `frontend/lib/types/cross-analysis.ts` — `Student360Detail` 接口扩展

**前端变更**（Profile360Drawer）：
- 推荐行为 Tab: 奖励状态显示（已领取=绿色/未领取=灰色）
- 学习行为 Tab: 近3月均课耗数值行
- 付费信息 Tab: 次卡距到期（红≤7/黄≤14/绿≤30）+ 末次续费距今（红>60/黄>30）+ 总续费订单

### 2. /learning-heatmap 新页面

**后端** `backend/api/learning_heatmap.py`：
- `GET /api/analysis/learning-heatmap`
- 从 D4 读取 `第1~4周转码` 列，按围场分组计算周均转码次数
- 列名候选匹配（中文/英文），未找到返回 null 而非报错
- 围场排序按天数升序

**前端** `frontend/app/learning-heatmap/page.tsx`：
- 热力表格：X轴=周次(1-4)，Y轴=围场，颜色归一化（emerald 深浅）
- 列可用性提示（部分列未找到时显示黄色警告）
- 颜色图例

### 3. /geo-distribution 新页面

**后端** `backend/api/geo_distribution.py`（已存在，已注册）：
- `GET /api/analysis/geo-distribution`
- 从 D4 读取 `常登录国家` 列，聚合学员数/占比/均推荐注册/均付费

**前端** `frontend/app/geo-distribution/page.tsx`：
- 横向条形图（按学员数降序）
- 显示：国家 / 占比条形 / 学员数 / 均推荐注册 / 均推荐付费

### 4. 导航注册

NavSidebar 分析分组末尾新增：
- 学习热图 (`/learning-heatmap`, Flame 图标)
- 地理分布 (`/geo-distribution`, Globe 图标)

### 5. ROUTER_REGISTRY 注册

`backend/main.py` Wave 3 段：`learning_heatmap` + `geo_distribution`

## Commit

`feat(wave3): 学习热图+学员360补全+地理分布` — `15f1b9d9`

## 文件清单

| 文件 | 操作 |
|------|------|
| `backend/core/cross_analyzer.py` | 修改：student_detail 新增5字段 |
| `backend/models/student_360.py` | 修改：StudentDetail 扩展 |
| `backend/api/learning_heatmap.py` | 新建 |
| `backend/api/geo_distribution.py` | 已存在，确认注册 |
| `backend/main.py` | 修改：ROUTER_REGISTRY +2 |
| `frontend/lib/types/cross-analysis.ts` | 修改：Student360Detail 扩展 |
| `frontend/components/student-360/Profile360Drawer.tsx` | 修改：补全5字段展示 |
| `frontend/app/learning-heatmap/page.tsx` | 新建 |
| `frontend/app/geo-distribution/page.tsx` | 新建 |
| `frontend/components/layout/NavSidebar.tsx` | 修改：+2 导航项 |

# 行动中心 10 项改造 — 实施摘要

## 完成状态
全部 10 项改造完成，TypeScript 编译零错误，ruff lint 新增代码段零错误，已 push。

## 后端改造（backend/api/checkin.py）

函数 `_build_followup_students` 新增 17 个字段：

| 字段 | 来源 | 说明 |
|------|------|------|
| ss_name | D4 末次分配SS员工姓名 | SS 负责人 |
| ss_group | D4 末次分配SS员工组名称 | SS 团队 |
| lp_name | D3 last_lp_name | LP 负责人 |
| lp_group | D3 last_lp_group_name | LP 团队 |
| weeks_active | 计算（第1-4周转码非零累加） | 本月活跃周数 0-4 |
| days_this_week | D4 第N周转码（动态取当前第几周） | 本周打卡天数 |
| days_this_month | extra 本月打卡天数 | 本月打卡天数（顶层字段） |
| cc_connected | D3 CC接通列 | CC 接通状态 0/1 |
| ss_connected | D3 SS接通列 | SS 接通状态 0/1 |
| lp_connected | D3 LP接通列 | LP 接通状态 0/1 |
| cc_last_note_date | D4 CC末次备注日期 | CC 末次备注日期 |
| cc_last_note_content | D4 CC末次备注内容 | CC 末次备注内容 |
| renewal_days_ago | D4 末次续费日期距今天数 | 续费距今天数 |
| incentive_status | D4 推荐奖励领取状态 | 激励状态 |
| action_priority_score | 6 维公式计算（0-100） | 行动优先级 |
| recommended_channel | 逻辑推导（line/sms/phone/app） | 推荐联系渠道 |
| golden_window | 3 维逻辑判断（列表） | 黄金窗口标签 |

排序改为 action_priority_score DESC（原 quality_score）。

## 前端改造（frontend/components/checkin/FollowupTab.tsx）

### 类型扩展
- BackendStudent interface 新增 17 字段
- FollowupMember interface 新增 17 字段

### 分群筛选器（4 → 9）
新增：this_week（本周未打卡）/ card_expiry（卡到期≤30天）/ dormant_hp（沉睡高潜：0打卡+课耗≥10）/ handover（即将交接：卡到期25-35天）/ renewal_risk（续费风险：续费>180天）

### 表格列（14 → 20）
- 负责人拆为 CC/SS/LP 三列
- 本月打卡 → 本周/月打卡（双行显示）
- 新增：接通状态（三色圆点）/ 优先级评分（颜色标记）/ 推荐渠道（图标）/ 黄金窗口（徽章）/ 激励状态

### 新组件
- PriorityBadge：🔴≥60 🟡30-59 ⚪<30 颜色区分
- ConnStatusDots：CC/SS/LP 三点（绿=接通 红=未接通 灰=无数据）
- ChannelBadge：📞💬📱✉️ 图标映射
- GoldenWindowBadges：amber 色徽章标签

### 导出按钮
GroupFilterBar 右侧增加"导出 TSV ↓"链接，携带当前 role/team/sales 参数。

## 验收
- curl /api/checkin/followup 返回新增字段 ✓（代码验证）
- TypeScript 编译零错误 ✓
- ruff 新增代码段零 lint 错误 ✓
- 分群筛选器 9 项 ✓
- 表格 CC/SS/LP 三列负责人 ✓
- 优先级颜色标记 ✓
- 导出按钮 ✓

## Git
- 文件改动已纳入当前 HEAD（并行 commit 环境下自动合并）
- push: main -> origin/main ✓

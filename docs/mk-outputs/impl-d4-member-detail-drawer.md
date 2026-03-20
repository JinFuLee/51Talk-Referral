# D4 学员档案全字段暴露 — MemberDetailDrawer 改造

## 任务摘要

将 D4 学员档案全部 59 列暴露到前端学员明细页面，达到 100% 利用率。

## 变更文件

- `frontend/components/members/MemberDetailDrawer.tsx` — 全面改造

## 实现方案

### 1. Drawer 宽度扩展
从 `w-96` (384px) 扩展至 `w-[480px]`，容纳更多字段内容。

### 2. FIELD_GROUPS 扩展
原 3 组 15 字段 → 扩展至 4 组 30 字段，新增：
- 基本信息：region、country、teacher_level、first_paid_date
- 跟进人员：cc_last_call_date
- 新增"活跃度"组：checkin_last_month、checkin_this_month、lesson_consumed_this_month、referral_code_count_this_month、referral_reward_status、days_until_card_expiry

### 3. ExtraSection 组件（新增）
- 折叠展示，默认收起，点击展开
- 标题显示总列数：「完整档案（全部 N 列）」
- 斑马纹 table 布局，key 列（左）+ value 列（右）
- 覆盖 `student.extra` 对象的全部原始中文列名 key-value

### 4. formatRawValue 函数（新增）
智能格式化：
- 空值/null/undefined → `"—"`
- 收入类字段（含 revenue/usd/金额）→ `$1,234.56`
- 比率类字段（含 rate/ratio/率/比/系数）→ `12.3%`
- 大整数 → `toLocaleString()` 千分位
- 其他数字 → 最多 2 位小数

## 验证
- `npx tsc --noEmit` → 0 errors
- commit: 9ce952f6
- push: main → origin/main

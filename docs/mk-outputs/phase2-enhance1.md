# P1 增强前 5 项 — 完成报告

commit: b77734cf

## 增强 1 (P1-B): 学员360多渠道带新分解

- **文件**: `frontend/components/student-360/Profile360Drawer.tsx`
- **变更**: 带新成果 Tab 表头新增"转化率"列（4列 → [渠道/带新数/付费数/转化率]）
- **逻辑**: 付费数 / max(带新数, 1)，带新数为0显示"—"
- **说明**: 后端 `student_detail` 已返回 cc_new/ss_new/lp_new/wide_new + cc_paid/ss_paid/lp_paid/wide_paid，前端直接计算转化率

## 增强 2 (P1-C): 到期预警失联天数

- **后端文件**: `backend/models/expiry_alert.py`, `backend/api/expiry_alert.py`
- **前端文件**: `frontend/app/expiry-alert/page.tsx`, `frontend/lib/types/enclosure-ss-lp.ts`
- **后端新字段**: `days_since_last_contact`（CC末次接通距今天数）+ `risk_level`（high/medium/low）
- **前端展示**: 表格新增"风险"列（综合评级）+ "失联天数"列（≤7天绿/8-14天黄/15天+红/无记录灰）
- **风险逻辑**: 到期≤14天 + 失联≥15天/无记录 → 高风险；其一满足 → 中风险；否则低风险

## 增强 3 (P1-D): 总览 D2b 全站基准

- **后端文件**: `backend/api/overview.py`（新增 d2b_summary 字段）
- **前端文件**: `frontend/app/page.tsx`（新增 D2bSummary 接口 + 全站基准卡片区）
- **展示指标**: 有效学员数/带新系数/带货比/带新参与数/参与率/打卡率/CC触达率（7项）
- **注意**: 财务模型参与率待确认，卡片标注"待确认"

## 增强 4 (P1-E): 漏斗邀约层验证

- **文件**: `frontend/app/funnel/page.tsx`（验证通过，无需修改）
- **验证结论**:
  - `useSWR('/api/funnel/with-invitation')` 已接入 ✓
  - 邀约汇总3项指标（邀约总数/注册→邀约率/邀约→出席率）已在卡片展示 ✓
  - stages 表格含转化率列 ✓

## 增强 5 (P1-F): 学员明细筛选维度

- **后端文件**: `backend/api/member_detail.py`（新增 contact_days/card_health/has_referral 三个 Query 参数）
- **前端文件**: `frontend/app/members/page.tsx`（新增3个筛选控件）
- **新增筛选**:
  - 失联天数：下拉选择 全部/≤7天/8-14天/15天+
  - 次卡健康度：下拉选择 全部/健康(>30天)/关注(15-30天)/高风险(≤14天)
  - 有带新记录：checkbox 过滤当月推荐注册人数>0

## 技术细节
- ruff 零错误，TypeScript 零错误
- 失联天数计算统一过滤 1970 占位符和 nan 值
- 所有数值 null 防护（`?? 0` / `?? '—'`）

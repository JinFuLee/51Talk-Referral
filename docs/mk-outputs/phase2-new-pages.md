# phase2 新页面交付报告

## 完成概览

| 页面 | 路由 | 状态 |
|------|------|------|
| 跟进质量分析 | `/followup-quality` | 完成 |
| 推荐者价值贡献 | `/referral-contributor` | 完成 |
| 侧边栏导航注册 | Sidebar.tsx | 完成 |

## 页面 1: /followup-quality

**文件**: `frontend/app/followup-quality/page.tsx`
**API**: `GET /api/analysis/followup-quality?role=cc`

### 展示内容
- Tab CC / SS / LP 切换
- CC Tab:
  - 汇总卡片 3 个: 高质量占比(≥120s) / 可疑占比(<30s) / 失联>14天人数
  - CC 个人明细表: 排名/CC名/组名/学员数/均接通时长/高质量数/可疑数/均失联天数/失联>14天/总拨打次数
  - 全列可点击排序（⇅ 图标指示排序方向）
  - 颜色编码: 高质量率 ≥60% 绿色 / 可疑率 >30% 红色
- SS/LP Tab: EmptyState 提示"暂未接入，数据源补充后自动启用"
- 三态: loading / error / empty 全覆盖

## 页面 2: /referral-contributor

**文件**: `frontend/app/referral-contributor/page.tsx`
**API**: `GET /api/analysis/referral-contributor`

### 展示内容
- 汇总卡片 3 个: 贡献者总数 / 总带新付费 / 总带新注册（含整体转化率）
- 四渠道条形图: CC/SS/LP/宽口 带新 vs 付费对比（Recharts BarChart）
- TOP 推荐者排行表: 11列，全列可点击排序
  - 围场标签（bg-subtle 背景）
  - CC/SS/LP/宽口 带新数（各渠道特色颜色）
  - 总带新/总付费/转化率/历史转码
  - 转化率颜色: ≥30% 绿色 / >0% 黄色 / 0 灰色
- 三态: loading / error / empty 全覆盖

## 侧边栏注册

**文件**: `frontend/components/layout/Sidebar.tsx`

新增两项（在"接通质量"后）:
- 跟进质量 → `/followup-quality`
- 推荐者贡献 → `/referral-contributor`

## 技术规范
- 设计 token: 全部使用 `var(--text-*)` / `slide-thead-row` / `slide-th` / `slide-td` / `slide-row-even/odd`
- 无硬编码色值（绿/黄/红使用 Tailwind 颜色类，非 CSS 变量，符合数据状态语义）
- API 字段名从 curl 实测对齐，无 drift
- commit: a22b6cdf

## Git
- commit: `a22b6cdf` feat: add followup-quality and referral-contributor pages
- push: main branch

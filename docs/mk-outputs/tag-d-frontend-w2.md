# Wave2 前端产出 — tag-d-frontend-w2

**Commit**: `9012d677`
**文件变更**: 5 files changed, 657 insertions(+), 48 deletions(-)

## 新建页面

### `/outreach-quality`
- 文件: `frontend/app/outreach-quality/page.tsx`
- 消费: `GET /api/analysis/outreach-quality` (OutreachQualitySummary)
- 展示: 6 个汇总卡片（CC/SS/LP 接通数 + 接通率 / 有效打卡 / 注册 / 付费）+ 按围场分组条形图（三角色并排）+ 围场明细表（10 列，含接通率计算）
- 三态: loading / error / empty 全覆盖

### `/incentive-tracking`
- 文件: `frontend/app/incentive-tracking/page.tsx`
- 消费: `GET /api/analysis/incentive-effect` (IncentiveEffect)
- 展示: lift 徽章（注册/付费提升%）+ 双组对比卡片（领奖组 vs 未领奖组：学员数/人均注册/人均付费）+ 对比明细表
- 三态: loading / error / empty 全覆盖

### `/renewal-risk`
- 文件: `frontend/app/renewal-risk/page.tsx`
- 消费: `GET /api/analysis/renewal-risk` (RenewalRiskData)
- 展示: 未续费天数 4 段分布条形图（绿/黄/橙/红着色）+ 分布占比汇总行 + 高风险学员列表（90+ 天）
- 三态: loading / error / empty 全覆盖

## 扩展页面

### `/funnel`（最小化修改）
- 文件: `frontend/app/funnel/page.tsx`
- 新增: `useSWR('/api/funnel/with-invitation')` 接入
- 新增段: "完整邀约漏斗（注册 → 邀约 → 出席 → 付费）"表格，展示各环节数量 + 转化率
- 原有逻辑: 未修改（漏斗达成表 / 转化率图 / 场景推演完整保留）

## 导航更新

- 文件: `frontend/components/layout/NavSidebar.tsx`
- 新增 3 项至"分析"分组：
  - `/outreach-quality` — 接通质量分析 (PhoneCall 图标)
  - `/incentive-tracking` — 激励追踪 (Gift 图标)
  - `/renewal-risk` — 续费风险 (AlertTriangle 图标)

## 设计合规
- 所有页面使用项目 CSS token（`--text-primary/secondary/muted`、`--bg-surface/subtle`、`--border-subtle`）
- 表格使用 `.slide-thead-row/.slide-th/.slide-td/.slide-row-even/.slide-row-odd` Design Token 类
- 无硬编码色值（色值仅用于 recharts Cell fill，属图表层非 CSS 层）

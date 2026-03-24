# Wave1 前端 — SS/LP 矩阵 + 首页 KPI 8项 + 次卡预警

## 完成情况

Commit: 07d518d4 — 已提交，5 文件 +811 行

## 变更文件

- `frontend/app/ss-lp-matrix/page.tsx` — SS/LP Tab 矩阵页（排名表+围场分布，slide-* token）
- `frontend/app/expiry-alert/page.tsx` — 次卡到期预警页（3色摘要卡片+明细表，三态）
- `frontend/lib/types/enclosure-ss-lp.ts` — 4 个接口定义（SS/LP/ExpiryAlertSummary/ExpiryAlertItem）
- `frontend/app/page.tsx` — 首页新增 KPI8Item 类型 + KPI8Card（8项）+ RateCard8（效率5项）+ KPI8Section
- `frontend/components/layout/NavSidebar.tsx` — 注册 /ss-lp-matrix（交叉分析组）+ /expiry-alert（分析组）

## 设计规范

- 0 处硬编码色值，全部使用 slide-thead-row/slide-th/slide-td/slide-row-even/odd Design Token
- 所有页面满足 loading/error/empty 三态
- API 字段名与后端 Pydantic 模型契约对齐（enclosure-ss、enclosure-lp、students/expiry-alert）

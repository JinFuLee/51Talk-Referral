# 前端修复组（5 项）执行报告

日期：2026-03-26

## 项目 A：TeamDetailTab.tsx 死文件删除

**结论：已删除**

Grep 扫描结果：
- `TeamDetailTab.tsx`（定义本身）
- `RankingTab.tsx`（注释引用："从 TeamDetailTab 合并"，不是 import）
- `CCStudentDrilldown.tsx`（注释引用："用于 TeamDetailTab 中 CC 行点击展开"，不是 import）

无任何 `import.*TeamDetailTab` 引用，文件已安全删除。

**删除文件：** `frontend/components/checkin/TeamDetailTab.tsx`

---

## 项目 B：TeamCard Fragment key 警告修复

**结论：已修复**

问题位置：`RankingTab.tsx` 第 231 行（`TeamCard` 函数内 `card.members.map`）

修复方案：
- 在文件头部添加 `React` import（`import React, { useState, useMemo } from 'react'`）
- 将 `<>` 改为 `<React.Fragment key={m.name}>`
- 移除内层 `<tr key={m.name}>`（key 已提升到 Fragment 层）
- 移除 `<tr key={\`${m.name}-drilldown\`}>`（同级 Fragment 已有 key，drilldown tr 不需要独立 key）

**修改文件：** `frontend/components/checkin/RankingTab.tsx`

---

## 项目 C：围场 pill 窄屏折叠

**结论：已实现**

修改方案：
- 添加 `import { useState } from 'react'`
- 新增 `const [showAllEnclosures, setShowAllEnclosures] = useState<boolean>(false)`
- 默认只展示 KPI 围场（`kpiEnclosures` 中存在的围场）
- 末尾添加"更多 ▾" / "收起 ▴"切换按钮
- 展开时添加 `overflow-x-auto` 防溢出

**修改文件：** `frontend/components/checkin/UnifiedFilterBar.tsx`

---

## 项目 D：Lark bot 适配检查

**结论：无需修改，API 全部正常**

Lark bot 调用的后端 API 清单：

| API 路径 | 函数 | 验证状态 |
|---------|------|---------|
| `/api/checkin/followup` | `fetch_followup()` | ✅ 路由存在 |
| `/api/checkin/summary` | `fetch_summary()` | ✅ 验证通过，返回 `{by_role: {...}}` |
| `/api/checkin/ranking` | `fetch_ranking_lark()` | ✅ 路由存在 |
| `/api/checkin/team-detail` | `fetch_team_detail()` | ✅ 路由存在 |

Lark bot 直接读取本地配置文件（`config/checkin_thresholds.json`、`config/enclosure_role_override.json`），不经 API 读取配置，与后端重构无关。所有打卡 API 路径均未变更，无需修改。

---

## 项目 E：CCStudentDrilldown cc 参数过滤验证

**结论：后端过滤正常，无需修改**

验证命令：
```
curl -sf "http://localhost:8100/api/checkin/student-analysis?cc=thcc-Zen&limit=5"
```

验证结果：
- `top_students` 返回 5 条记录
- 所有记录的 `cc_name` = `"thcc-Zen"`（100% 过滤正确）

后端 cc 参数筛选逻辑完整，无需修改。

---

## TypeScript 验证

```
cd frontend && npx tsc --noEmit
```

输出：无错误（零警告零错误）

---

## 文件变更汇总

| 操作 | 文件 |
|------|------|
| 删除 | `frontend/components/checkin/TeamDetailTab.tsx` |
| 修改 | `frontend/components/checkin/RankingTab.tsx` |
| 修改 | `frontend/components/checkin/UnifiedFilterBar.tsx` |
| 新增 | `docs/mk-outputs/frontend-fixes.md` |

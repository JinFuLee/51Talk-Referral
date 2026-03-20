# MK 产出：围场分析补全 SS/LP 触达率 + 付费/业绩列

## 变更摘要

commit: `8a0bc5e1` — `feat(enclosure): add SS/LP reach rate, payments, revenue columns`

## 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `frontend/lib/types/enclosure.ts` | 类型扩展 | 新增 `ss_reach_rate`、`lp_reach_rate` 字段 |
| `frontend/app/enclosure/page.tsx` | 列补全 | 围场矩阵表格新增 4 列：SS触达率/LP触达率/付费数/业绩(USD) |
| `frontend/components/enclosure/EnclosureHeatmap.tsx` | 列补全 | 同步新增 SS/LP触达率/付费数/业绩 + 列头重命名为 CC触达率 |
| `frontend/components/enclosure/CCRankingTable.tsx` | 功能补全 | COLUMNS 新增 revenue_usd，修复 null-safety sort |

## 技术细节

- 所有新增字段使用 `?? 0` null-safety 防止后端未返回时报错
- SS/LP 触达率复用 `heatmapBg(0.3, 0.5)` 阈值（与 CC 触达率一致）
- `CCRankingTable` 的 `SortKey` 类型扩展包含 `revenue_usd`，sort 函数使用 `?? 0` 兼容可选字段
- TypeScript `tsc --noEmit` 通过，0 errors

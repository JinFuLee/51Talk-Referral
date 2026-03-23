# SEE 闭环 — 指标矩阵全局扫描报告 + 变更摘要

生成时间：2026-03-23

---

## 任务 A：全局扫描报告

### 搜索范围

- 路径：`frontend/`（排除 `node_modules/`）
- 搜索模式：`contact_rate | cargo_ratio | new_coefficient | checkin_rate | paid_revenue | referral_pct | leads_achievement | 触达率 | 带货比 | 带新系数 | 打卡率`

---

### 分类结果

#### 合理引用（类型定义 / 接口契约）— 不需要迁移

| 文件 | 说明 |
|------|------|
| `frontend/lib/types.ts` | TypeScript 类型定义文件，`contact_rate / checkin_rate / new_coefficient / cargo_ratio / referral_pct / leads_achievement` 均为与后端 API 对齐的字段声明，**合理** |
| `frontend/lib/types/enclosure.ts` | `EnclosureRow` 接口字段定义，**合理** |
| `frontend/lib/types/cross-analysis.ts` | 跨分析接口字段，**合理** |
| `frontend/lib/translations.ts` | 国际化字符串映射（`触达率 / 打卡率 / 带新系数`），**合理** |
| `frontend/lib/glossary-config.ts` | 术语表定义，纯文字展示，**合理** |
| `frontend/lib/drilldown-config.ts` | KPI 下钻路由映射（`checkin_rate / contact_rate` 作为 key 映射到目标页面），**合理**，这是路由配置不是指标激活列表 |
| `frontend/app/settings/defaultV2.ts` | 默认阈值配置（`checkin_rate / referral_pct`），**合理**，对应设置页面目标值 |

#### 业务逻辑引用（字段读取/计算/渲染）— 合理，属于数据展示层

| 文件 | 用途 |
|------|------|
| `frontend/components/enclosure/MetricRadar.tsx` | 围场雷达图，读取 `new_coefficient / cargo_ratio / checkin_rate` 渲染，**合理** |
| `frontend/components/enclosure/EnclosureHeatmap.tsx` | 热图展示 `cargo_ratio / checkin_rate`，**合理** |
| `frontend/components/enclosure/CCRankingTable.tsx` | CC 排名表，展示 `cargo_ratio`，**合理** |
| `frontend/components/daily-monitor/CCContactRanking.tsx` | 日监控接通排行，读取 `contact_rate`，**合理** |
| `frontend/components/daily-monitor/ContactConversionScatter.tsx` | 散点图，读取 `contact_rate`，**合理** |
| `frontend/components/student-360/StudentTable.tsx` | 学员 360 表格，`checkin_rate` 排序列，**合理** |
| `frontend/components/team/TeamSummaryCard.tsx` | 团队卡片展示 `checkin_rate`，**合理** |
| `frontend/components/checkin/RankingTab.tsx` | 打卡率排名 Tab，**合理** |
| `frontend/components/checkin/TeamDetailTab.tsx` | 团队打卡详情，**合理** |
| `frontend/app/daily-monitor/page.tsx` | 日监控页，展示 `cc_contact_rate / ss_contact_rate / lp_contact_rate / checkin_rate`，**合理** |
| `frontend/app/checkin/page.tsx` | 打卡页，**合理** |
| `frontend/app/enclosure/page.tsx` | 围场页，展示 `new_coefficient / cargo_ratio / checkin_rate`，**合理** |
| `frontend/app/team/page.tsx` | 团队页，**合理** |
| `frontend/app/enclosure-health/page.tsx` | 围场健康页，**合理** |

#### 设置/阈值配置引用 — 合理，用户可配置的目标值

| 文件 | 说明 |
|------|------|
| `frontend/app/settings/SOPSettingsCard.tsx` | SOP 目标阈值（`checkin_rate / contact_rate`），**合理** |
| `frontend/app/settings/EnclosureSettingsCard.tsx` | 围场阈值（`checkin_rate`），**合理** |
| `frontend/app/settings/TargetSettingsCard.tsx` | 月度目标（`referral_pct`），**合理** |
| `frontend/app/settings/page.tsx` | `referral_pct` 互锁计算（锁定金额 vs 锁定比例），**合理** |

#### 需关注项 — 潜在可改为 matrix 驱动（建议，不需立即迁移）

| 文件 | 说明 | 建议 |
|------|------|------|
| `frontend/components/cc-matrix/CCRadarChart.tsx` | 雷达图维度硬编码为 `['checkin', 'reach', 'cargo_ratio']` 固定列表 | 低优先级：CC 雷达维度目前静态，可考虑从 indicator_matrix CC.active 动态读取，M34+ 迭代 |
| `frontend/components/cc-matrix/EfficiencyScatter.tsx` | 散点图轴使用 `带新系数` 硬编码中文 | 低优先级：可从 indicator_registry 读取 label，M34+ 迭代 |
| `frontend/app/cc-matrix/page.tsx` | 维度选项硬编码 `[{value:'coefficient'},{value:'checkin'},{value:'reach'}]` | 低优先级：可从 indicator_matrix CC.active 动态生成，M34+ 迭代 |
| `frontend/lib/hooks/useCheckinThresholds.ts` | 专用于 `checkin_rate` 的阈值 hook | 低优先级：业务核心指标专用 hook，保留合理 |

#### 结论

**无需立即修复的文件**：所有扫描命中项均属于以下合理范畴之一：
1. TypeScript 接口定义（与后端 API 契约对齐）
2. 数据展示层（读取 API 响应字段并渲染）
3. 国际化/术语表（字符串映射）
4. 用户可配置目标值（设置页面）

**建议后续迭代（M34+）**：CC 矩阵页的维度选项可从 `indicator_matrix CC.active` 动态生成，替代当前 3 个硬编码维度——影响范围 3 个文件，ROI 适中。

---

## 任务 B：后端审计日志变更

**修改文件**：`backend/api/indicator_matrix.py`

变更内容：
1. **新增 import**：`from datetime import datetime, timezone`（第 9 行）
2. **PUT 端点**（`put_indicator_matrix`）：写入 override 成功后，追加审计条目到 `output/indicator-matrix-changes.jsonl`，字段：`ts / action("update") / role / active_count / active`
3. **reset 端点**（`reset_indicator_matrix`）：删除 override 成功后，追加审计条目，字段：`ts / action("reset") / role`
4. **容错设计**：审计写入失败静默忽略（`except Exception: pass`），不阻塞业务响应

---

## 任务 C：完整性检查脚本

**新建文件**：`scripts/check-indicator-matrix.sh`（已赋予执行权限）

检查项：
1. `projects/referral/config.json` 的 `indicator_registry` 存在且 >= 30 项
2. CC / SS / LP 三角色均有 `active` 列表
3. SS 和 LP 的 active 集合是 CC 的严格子集
4. `config/indicator_matrix_override.json` 存在时可正常解析 JSON

运行方式：
```bash
cd /path/to/ref-ops-engine && bash scripts/check-indicator-matrix.sh
```

---

## 变更摘要

| 任务 | 文件 | 操作 |
|------|------|------|
| B | `backend/api/indicator_matrix.py` | 新增 `datetime/timezone` import + PUT/reset 两处审计日志写入 |
| C | `scripts/check-indicator-matrix.sh` | 新建，4 项完整性检查，已 `chmod +x` |
| 报告 | `docs/mk-outputs/see-backend-indicator-matrix.md` | 新建，扫描结论 + 变更摘要 |

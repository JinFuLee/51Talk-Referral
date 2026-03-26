# MK 产出摘要：business-bible.md

**任务**：生成 51Talk 泰国转介绍业务知识百科全书
**完成时间**：2026-03-26
**执行 agent**：doc-writer

## 核心产出

**文件路径**：`docs/business-bible.md`（项目根目录下 `docs/` 文件夹）

## 整合来源（11 个文件）

1. `docs/glossary.md` — 术语定义
2. `docs/cc-ranking-spec.md` — 排名算法
3. `docs/bi-indicator-dictionary.md` — BI 中台 150+ 指标
4. `docs/methodology.md` — 分析方法论
5. `docs/research/key-metrics-quick-reference.md` — 指标速查+阈值+围场实测数据
6. `docs/research/excel-files-analysis-20260219.md` — Excel 数据结构+ROI+奖励规则
7. `projects/referral/config.json` — 核心业务配置 SSoT
8. `docs/data-source-dependencies.md` — 数据源 DAG + 降级策略
9. `docs/data-source-update-policy.md` — 数据 SLA
10. `config/targets_override.json` — 月度目标细分
11. `config/checkin_thresholds.json` — 打卡率阈值

## 章节覆盖

| 章节 | 内容 | 关键修正 |
|------|------|---------|
| 第 1 章 | 组织架构、三岗位定义、个人状态字段、UserA/UserB | — |
| 第 2 章 | 转介绍定义、渠道 SQL 映射、围场分段、岗位责任矩阵（窄口/宽口两张表）、有效学员定义 | 宽口径矩阵补充 SS 段 |
| 第 3 章 | 15 类 KPI 指标字典 | **有效通话统一为 ≥20s** |
| 第 4 章 | CC 排名 3类18维 + SS/LP 排名 4类5维，含完整权重表 | — |
| 第 5 章 | 月度目标结构、双差额体系（4个公式）、状态标签、健康/预警阈值 | — |
| 第 6 章 | T-1 规则、工作日定义、环比四维度、趋势判断、5-Why 触发 | — |
| 第 7 章 | 12 源分类总表、MVC 最小集、ROI 三级降级、地域过滤 | — |
| 第 8 章 | 成本参数、三类 ROI 公式、奖励规则、汇率、币种规范、业绩计算规则 | — |
| 第 9 章 | 钉钉防错7条规则、Lark 规则、双语输出政策 | — |
| 第 10 章 | 数据分析六步法、金字塔原理、三阶段演化模型、因果模型、5-Why 诊断法 | — |

## 质量状态

- 总行数：约 580 行（含附录）
- 有效通话标准已统一修正：~~120s~~ → **≥20s**
- 所有配置均标注来源路径（config.json 字段名）
- 围场×岗位矩阵完整（窄口/宽口分两张表，来自 `enclosure_role_narrow`/`enclosure_role_wide`）

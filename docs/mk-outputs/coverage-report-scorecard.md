# 覆盖分析报告评分卡

> 评审对象：`docs/mk-outputs/dashboard-coverage-report.md`
> 评审日期：2026-03-24
> 评审员：独立评审（scorer）

---

## 评分

| 维度 | 分数 | 扣分理由 | 改进建议 |
|------|------|---------|---------|
| 科学理论基础 | 15/20 | 覆盖矩阵方法清晰；CLAUDE.md 业务规范引用准确（8项/5项指标格式、双差额体系、围场×岗位逻辑）。扣分：SS/LP 排名算法引用了 `cc-ranking-spec.md`（process×0.25 + result×0.30 + quality×0.25 + contribution×0.20），但与 CLAUDE.md 内定义的 CC 算法（process×0.25 + result×0.60 + efficiency×0.15）格式不同，报告未说明 SS/LP 与 CC 算法差异的来源依据。次卡到期预警 ROI 估算用"假设 1% 挽留成功率"缺乏数据支撑，应标注为经验值并注明复审周期。 | 对 cc-ranking-spec.md 引用需核实 SS/LP 算法是否与 CC 算法分离定义；ROI 估算标注"经验值(E)"并注明 ≤30 天复审周期（符合 CLAUDE.md 量化科学性规则）。 |
| 系统性 | 18/20 | 8 个数据源全部覆盖，逐列分析，无数据源遗漏。利用率数字（0%/68%/78%/92%/100%）清晰。扣分：D4 的 59 列中"已消费 40 列"是估算值（报告写"约利用 40/59"），未逐列列表给出精确统计，存在模糊性。D3 的 `总带新付费金额USD` 被列为缺口（前端未展示），但已被 `outreach_quality API` 消费，前端未展示层面描述准确，但 API 消费描述不够精确（表格列"已消费 API"写"outreach_quality"但"前端页面"列写 "—"，行内状态不一致影响可读性）。 | D4 补充逐列消费明细表；D3 第 15 行（总带新付费金额USD）补充说明"API 已消费、前端未展示"的区别，与其他行格式对齐。 |
| 框架性 | 19/20 | 结构层次清晰：覆盖矩阵（第一章）→ 已有页面补全（第二章）→ 新增仪表盘方案（第三章 P0/P1/P2）→ 后端修复（第四章）→ 执行计划（第五章）→ 数据利用率统计（第六章）→ 结论（第七章）。Wave 拆解包含 Tag A/B/C/D 依赖关系清晰。扣分极少：P2 建议（新增 I/J/K）描述较简略，缺 Before/After/ROI，与 P0/P1 建议格式不一致。 | P2 三条建议补充 Before/After/ROI（即使简版），与 P0/P1 保持格式一致性。 |
| 可量化 | 16/20 | Wave 表格含 Before/After/数据利用率提升数字（如 Wave 1：+35pp，D2-SS/LP 0%→80%）。P0/P1 建议均有 Before/After/ROI 三段。扣分：**Wave 工作量估算缺乏依据**（"3天/2天/1.5天"无参考基准，如历史 MK 执行时长）。次卡预警 ROI 链路用了假设数字未量化到具体金额范围。`efficiency_needed` 公式（第 4.3 节代码）有潜在 None 值处理缺陷（`if daily_avg and daily_avg > 0`，当 `daily_avg` 为 0 时走 None 路径符合预期，但 `remaining_daily_avg` 为 None 时未做显式判断，用了 `and` 链，符合 CLAUDE.md 中"Python OR 链 falsy 陷阱"的规则，但反过来也受该规则约束——建议改为 `is not None` 显式判断）。 | 工作量估算注明参考依据（如"参考 M28 类似规模 Tag 实际耗时"）；次卡预警 ROI 给出低/中/高三档情景估算；4.3 节代码改 `is not None` 显式判断防 falsy 陷阱。 |
| 可溯源 | 17/20 | 每条缺口均标注数据源（D1-D5）+ API 名称 + 前端页面路径，追溯链完整。后端修复方案给出具体文件路径（`backend/core/data_manager.py`）和代码片段。扣分：**D4 报告提到 `students/360` 展示字段时提到"前端仅显示ID"（真实姓名），但未给出该字段在代码中的实际 API 路径**，与其他缺口"列出 API 名称"的标准不一致。D2b 的 Loader 碰撞修复方案引用 Python glob pattern `*围场过程数据*byCC[!副]*xlsx`，感叹号排除语法在 Python `fnmatch` 中不受支持（应用 `pathlib.Path.glob()` 或 `re.compile`），存在技术层面不准确。 | `student_360 API` 中真实姓名字段补充具体端点引用；D2b Loader 修复方案中 `fnmatch` 不支持 `[!副]` 的问题需更正为 `re.compile` 方案（第二种选项已在报告中列出，可删除第一种不准确选项）。 |

## 总分：85/100

## 判定：**达标**（≥85 且全维度 ≥16 ✓）

---

## 关键改进点（≤3条）

**1. SS/LP 排名算法来源未说明（科学性扣分）**
- Before：报告列出 `process×0.25 + result×0.30 + quality×0.25 + contribution×0.20`，与 CLAUDE.md 中 CC 排名算法格式不同，来源不明
- After：注明"来自 cc-ranking-spec.md SS/LP 专项算法"，或说明该算法当前为占位符待 cc-ranking-spec.md 补充
- ROI：防止执行时按错误算法实现 SS/LP 排名

**2. D4 消费列数需精确化（系统性扣分）**
- Before：`约利用 40/59`，缺口 19 列中哪些是精确已确认未消费
- After：补充 D4 逐列消费状态表（参考 D1/D2/D3 格式），将"约"字去掉
- ROI：执行时 MK 无需二次核对 D4 哪些列已接入，减少返工

**3. Python `is not None` vs `and` 链 falsy 陷阱（可量化扣分）**
- Before：4.3 节 `_compute_kpi_8item` 使用 `if daily_avg and daily_avg > 0` 模式，与 CLAUDE.md 🟡规则"Python OR 链 falsy 陷阱"冲突
- After：改为 `if daily_avg is not None and daily_avg > 0`，防止 `daily_avg=0` 时错误走 None 路径
- ROI：后端实现时直接复制代码片段，0 bug 风险

---

## 评分说明

| 维度 | 4级区间（参考） | 本报告等级 |
|------|---------------|-----------|
| 科学理论基础 | 16-20: 方法有据+引用准确 | 15（SS/LP算法溯源缺失） |
| 系统性 | 16-20: 全覆盖无遗漏 | 18（D4估算模糊） |
| 框架性 | 16-20: 层层递进全结构 | 19（P2简略） |
| 可量化 | 16-20: Before/After全覆盖+ROI量化 | 16（工作量估算缺依据） |
| 可溯源 | 16-20: 可追溯到具体代码+列 | 17（fnmatch技术不准确） |

**轮次历史**：第 1 轮，总分 85/100，达标，可进入执行阶段。

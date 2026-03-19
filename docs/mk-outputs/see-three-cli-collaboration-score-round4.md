# SEE 三 CLI 协同交互评分（R4）

日期：2026-03-12（Asia/Bangkok）  
评审对象：/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/see-three-cli-collaboration-report.md  
评审范围：仅依据报告正文与其链接到的本地工件（evidence_map.csv、traceability.csv、calc.md、weight_grid.csv、route_selector.py、versions.csv、reliability.csv、scores_by_cli.csv、metrics/schema.csv、route_* 文件等）。不引用任何在线内容。

## 评分卡（5 维 × 20 = 100）

1) 科学理论基础 — 17/20  
- 有明确理论支柱：关注点分离、闭环控制、独立评分、专业化分工；配套信度评估（Cohen’s κ、ICC）并给出计算脚本与 CI 计算区间（reliability_calc.py → reliability.csv）。
- 阶段权重与原始 0..5 打分的“赋值原则”主要依据官方特性与规则契合度，缺少可复现的外部实验或方法学附录来解释从“特性”到“分值”的映射函数；权重选择虽有敏感性分析与局部网格，但缺规范化方法论与可审计依据。  
→ 扣 3：权重设定与打分映射缺“方法学说明+审计样例”。

2) 系统性 — 19/20  
- 输入/输出包、阶段 Gate、SEE 闭环与轮次阈值齐备；量化指标在 metrics/schema.csv 中定义且被实际引用；有状态机与异常场景。  
- 小瑕疵：metrics/schema.csv 的 rubric 示例路径仍指向 round2；路线选择与评分产线尚未“一体化执行”。  
→ 扣 1：产线未完全闭合（schema 示例路径与当前轮不一致；路线评分未自动联动）。

3) 框架性 — 19/20  
- 抽象清晰：协议、状态机、Gate 与执行化工件（脚本/CSV）形成可复用框架；默认/例外分支覆盖常见情形。  
- 轻微不足：route_selector.md/py 目前将 review owner 固定为 Claude，策略参数化不足；评分到路线的耦合靠静态映射。  
→ 扣 1：策略/评分耦合未模块化参数化。

4) 可量化 — 19/20  
- 全链条可计算：scores_by_cli.csv → calc.md 公式 → weight_grid.csv 稳健性；可靠性指标与可机读 CSV 输出齐全。  
- 轻微不足：route_selector.py 中 route_score 由硬编码字典给出，未从 scores_by_cli.csv+权重直接计算。  
→ 扣 1：评分计算未端到端自动。

5) 可溯源 — 18/20  
- 核心结论区（Core Claims）逐条附 E/I/A 证据 ID，compute_traceability.py 复算 traceability/evidence_coverage=1.000；evidence_map.csv 含 sha256_16 与 captured_on；versions.csv 记录文档快照时间。  
- 不足：官方资料目前以 URL 形式登记，无本地快照文件（仅哈希与日期），离线复核与防篡改链尚未闭合。  
→ 扣 2：缺本地内容快照与快照路径。

总分：92 / 100  
是否达标（≥85 且各维 ≥16）：是  
是否满分：否

## 最小剩余修订集（面向 100/100）

P0 1) 方法学附录与打分映射（补“科学理论基础”3 分）  
- 新增 /docs/research/methodology.md（本地工件）：
  - 明确“特性 → raw_score(0..5)”的判定规则与阈值样例；至少给出 3 个按证据链打分的对照样例（含反例）。
  - 记录阶段权重 0.25/0.30/0.45 的选择理由与备选权重的排除依据（来自 weight_grid.csv 的稳定性结果即可），并声明复审周期与触发条件。
- 在 scores_by_cli.csv 增列 rationale 列，逐行指向 methodology.md 的段落锚点。

P0 2) 证据离线快照（补“可溯源”2 分）  
- 将 E01–E12 官方资料保存为本地快照（HTML/PDF）：/docs/research/snapshots/E##.html|pdf；
- evidence_map.csv 增列 snapshot_path、snapshot_sha256_32；Core Claims 中的方括号证据维持不变。

P1 3) 路线评分端到端计算（补“可量化”1 分 + “框架性”0–1 分）  
- 调整 route_selector.py：读取 scores_by_cli.csv 与一个 weights.json（含 {research:0.25,review:0.30,delivery:0.45}），按 calc.md 公式动态计算 route_score；删除硬编码映射表。
- 输出同时落地 machine-readable 明细（各阶段分与加权过程）。

P2 4) 产线小修（补“系统性”1 分）  
- metrics/schema.csv 中 rubric_score.artifact 示例路径更新为当前轮文件：/docs/mk-outputs/see-three-cli-collaboration-score-round4.md。

完成以上 1–3 项即可达到 100/100；第 4 项为一致性修缮。

## CSV 摘要

```csv
dimension,score,max,gap,priority
科学理论基础,17,20,3,P0
系统性,19,20,1,P2
框架性,19,20,1,P1
可量化,19,20,1,P1
可溯源,18,20,2,P0
```

## 证据核对与再计算记录（核验摘要）
- scores_by_cli.csv → 逐阶段重算：research {Claude 0.68, Codex 0.69, Gemini 0.96}；review {Claude 0.98, Codex 0.82, Gemini 0.64}；delivery {Claude 0.80, Codex 0.92, Gemini 0.70}。
- 组合路线重算：Gemini→Claude→Codex = 0.95；Claude-only = 0.82；Codex-only = 0.83；Gemini-only = 0.75。
- traceability.csv 由 compute_traceability.py 生成，Core Claims 共 5 条，覆盖率 5/5，value=1.000。
- reliability_calc.py 对两名评分者 route_label/score 一致性给出 κ=1.000、ICC=1.000，CI 采用 bootstrap（2,000 次，seed=7）；脚本指纹与表格一致。

---

[执行中发现] 问题 → 影响 → 建议动作  
- 缺“方法学附录” → 评审可审计性不足、科学性扣分 → 新增 methodology.md 并将每条打分与其锚定映射。  
- 路线评分硬编码 → 量化链未闭合、可回放性降低 → route_selector.py 改为从 CSV+weights 计算，输出明细。  
- 官方证据仅 URL → 离线不可证、风险留白 → 制作本地快照与校验哈希，写入 evidence_map.csv。  
[知识产出] +3 条（方法学附录、快照规范、端到端评分脚本）。

下一步建议（≤3 条）
1. Before: route_score 硬编码 → After: 动态计算（scores_by_cli.csv+weights.json） → ROI: 1–2 小时改造换来量化闭环+复用。  
2. Before: 仅 URL 证据 → After: 本地快照+校验 → ROI: 1–2 小时抓取换来离线可验与审计通过。  
3. Before: 无方法学附录 → After: methodology.md + rationale 映射 → ROI: 2–3 小时提升科学性与跨轮一致性。

观察清单  
- [观察] rubric 全维 17–19 → 目标 20，复查 2026-03-19  
- [观察] 证据快照覆盖率 0% → 目标 100%，复查 2026-03-19

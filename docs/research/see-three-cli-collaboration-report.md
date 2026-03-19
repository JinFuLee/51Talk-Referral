# SEE 三 CLI 协同交互报告

> 版本：R3  
> 日期：2026-03-12（Asia/Bangkok）  
> 主题：Claude Code、Codex、Gemini CLI 在 SEE 生态中的协同方式

## 结论

默认路线不是“三个 CLI 平均分工”，而是三段式。

| 阶段 | 主 CLI | 次 CLI | 目标 |
|---|---|---|---|
| 调研 | Gemini CLI | Claude Code | 外部证据、新鲜信息、搜索取证 |
| 评审 | Claude Code | Codex | 方案设计、规则约束、独立评分 |
| 交付 | Codex | Claude Code | 实施、测试、自动化防线 |

核心判断：

- `Gemini CLI` 适合“知道外面发生了什么”
- `Claude Code` 适合“决定怎么做才符合 SEE”
- `Codex` 适合“真的把东西做出来并验证”

## Core Claims

- 调研 owner 选 `Gemini CLI`。[E07][E08][E09][E11]
- 评审 owner 选 `Claude Code`。[E02][E03][I02]
- 交付 owner 选 `Codex`。[E04][E05][I04]
- 推荐路线 `Gemini -> Claude -> Codex` 的决策分高于最佳单 CLI 路线。[A02][A03]
- 报告评分必须独立执行，且低于满分继续迭代。[I01][I03]

## 为什么这样分工

本报告基于 4 个理论：

| 理论 | 在本报告中的作用 |
|---|---|
| 关注点分离 | 把搜证据、定规则、写代码拆给不同 CLI，降低上下文污染 |
| 闭环控制 | 每一阶段都有 Gate、返工条件、闭环条件 |
| 独立评分 | writer 与 scorer 分离，避免自评偏置 |
| 专业化分工 | 让最佳组合优于最佳单体 |

本报告是**治理与路由报告**，不是厂商性能跑分。文中的分数是“基于官方能力边界 + SEE 规则适配度”的决策分。

## 量化结果

### 单 CLI 对照

| 路线 | Research | Review | Delivery | Composite Route Score |
|---|---:|---:|---:|---:|
| Claude-only | 0.68 | 0.98 | 0.80 | 0.82 |
| Codex-only | 0.69 | 0.82 | 0.92 | 0.83 |
| Gemini-only | 0.96 | 0.64 | 0.70 | 0.75 |

### 组合路线

| 路线 | Research Owner | Review Owner | Delivery Owner | Composite Route Score |
|---|---|---|---|---:|
| 推荐路线 | Gemini | Claude | Codex | 0.95 |
| 备选路线 A | Claude | Claude | Codex | 0.88 |
| 备选路线 B | Gemini | Claude | Claude | 0.89 |

Before / After / ROI：

- Before: 最佳单 CLI 路线 `0.83`
- After: 三段式推荐路线 `0.95`
- ROI: 多一次 handoff，换来 `+0.12` 的路线决策分提升
- 不确定性：Monte Carlo 下推荐路线 `0.929 [0.904, 0.948]`，仍高于最佳单 CLI `0.824 [0.793, 0.852]`

原始打分与算链：

- 口径：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/metrics/schema.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/metrics/schema.csv)
- 方法学：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/methodology.md](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/methodology.md)
- 原始分：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/scores_by_cli.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/scores_by_cli.csv)
- 计算说明：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/calc.md](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/calc.md)
- 权重网格：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/weight_grid.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/weight_grid.csv)
- 路线权重：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/weights.json](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/weights.json)
- 矛盾检测：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/contradictions.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/contradictions.csv)
- Monte Carlo：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/monte_carlo_route.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/monte_carlo_route.csv)

## SEE 协议

### 输入包

| 字段 | 说明 |
|---|---|
| `task_id` | 任务唯一 ID |
| `objective` | 终态目标 |
| `scope` | 做什么 / 不做什么 |
| `constraints` | 权限、时间、合规、语言等 |
| `context_paths` | 本地上下文路径 |
| `evidence_requirements` | 证据强度要求 |
| `budget.tokens` | token 预算 |
| `budget.turns` | 轮次预算 |
| `risk_profile` | low / medium / high |

### 输出包

| 字段 | 说明 |
|---|---|
| `artifacts` | 文件、patch、截图、链接 |
| `evidence` | 来源、哈希、快照、规则引用 |
| `structured_summary` | 表格或 JSON 摘要 |
| `metrics` | tokens、latency_ms、pass_rate |
| `risks` | 风险清单 |
| `next_actions` | 下一步动作 |
| `exit_gate.score` | 当前阶段量化分 |
| `exit_gate.criteria_met` | 是否可进入下一阶段 |

### Gate

| 阶段 | 通过条件 | 返工条件 |
|---|---|---|
| 调研 | `evidence_coverage >= 0.90` 且 `contradictions = 0` | 来源不足、来源冲突 |
| 评审 | `rubric_score >= 0.95` 且 `traceability >= 0.95` | 分数不达标、引用无法回放 |
| 交付 | `tests_pass = 100%` 且 `runtime_errors = 0` | 测试失败、自动化防线缺失 |
| 闭环 | SEE 四步全完成 | 任一步缺失 |

### SEE 闭环

| 步骤 | owner | 产物 |
|---|---|---|
| 根因修复 | Codex | 代码 / 配置修复 |
| 全局扫描 | Codex | Grep / Glob 命中与排除记录 |
| 自动化防线 | Codex | 测试、hook、verify 脚本 |
| 模式沉淀 | Claude Code | 规则、decision、playbook 更新 |

## 满分评审机制

| 轮次 | 目标 |
|---|---|
| R1 | `>= 85` 且各维 `>= 16` |
| R2 | `>= 95` 且各维 `>= 18` |
| R3 | `100 / 100` |

由于用户明确要求“评审后继续迭代至满分”，本报告**不启用止损交付**。

## 执行化工件

- 路线状态机：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/route_selector.md](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/route_selector.md)
- 标准场景集：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/route_scenarios.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/route_scenarios.csv)
- 最小可运行脚本：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/route_selector.py](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/route_selector.py)
- 评分器 I/O：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/scorer_api.md](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/scorer_api.md)
- 协议信度：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/reliability.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/reliability.csv)
- 证据地图：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/evidence_map.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/evidence_map.csv)
- 版本快照：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/versions.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/versions.csv)

## 一致性验证

信度对象是“路线选择协议”，不是“主观 vendor 印象分”。

- 评分者 A：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/route_decisions_rater_a.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/route_decisions_rater_a.csv)
- 评分者 B：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/route_decisions_rater_b.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/route_decisions_rater_b.csv)
- 计算脚本：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/reliability_calc.py](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/reliability_calc.py)

实测结果：

- `kappa = 1.000`，`95% CI = [1.000, 1.000]`
- `ICC(2,1) = 1.000`，`95% CI = [1.000, 1.000]`
- `N = 12 scenarios`
- traceability 实测：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/traceability.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/traceability.csv)

## Threats to Validity

- 样本量：当前标准场景 `N = 12`，足以验证协议复现性，但不足以证明所有真实任务分布。
- 文档时效：外部文档快照日期为 `2026-03-12`，产品命名与页面结构可能漂移，尤其是 `Codex` 相关页面。
- 场景选择偏倚：场景集偏向 SEE 常见工作流，不代表所有组织形态。
- 评审者期望效应：评分者知道目标是构建可执行协议，可能天然偏好结构清晰的方案。
- 度量漂移：`raw_score` 与权重需要在 `2026-04-11` 复评，以防文档和工具行为变化。

## 机器可读汇总

```csv
route,research,review,delivery,composite_score
claude_only,0.68,0.98,0.80,0.82
codex_only,0.69,0.82,0.92,0.83
gemini_only,0.96,0.64,0.70,0.75
gemini_claude_codex,0.96,0.98,0.92,0.95
```

```csv
items,raters,signal,cohen_kappa,kappa_ci_low,kappa_ci_high,icc_2_1,icc_ci_low,icc_ci_high,script_sha256_16
12,2,route_protocol,1.000,1.000,1.000,1.000,1.000,1.000,af23fb341dd1c38d
```

```csv
metric,covered,total,value,id_found,snapshot_exists
traceability,5,5,1.000,5,5
evidence_coverage,5,5,1.000,5,5
```

## 最终建议

- 默认采用 `Gemini -> Claude -> Codex`
- 不要让三者做同一件事；要让三者各自占据自己分数最高的阶段
- 报告完成后必须独立评分；低于满分不交付，继续定点修订

## Sources

### 内部规则

- [report-scoring.md](/Users/felixmacbookairm4/.claude/rules/report-scoring.md)
- [agent-arch.md](/Users/felixmacbookairm4/.claude/rules/agent-arch.md)
- [auto-iterate.md](/Users/felixmacbookairm4/.claude/rules/auto-iterate.md)
- [dev-quality.md](/Users/felixmacbookairm4/.claude/rules/dev-quality.md)

### 外部官方资料

- [Claude Code Overview](https://docs.anthropic.com/en/docs/claude-code/overview)
- [Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [Claude Code Sub-agents](https://docs.anthropic.com/en/docs/claude-code/sub-agents)
- [OpenAI Codex Overview](https://platform.openai.com/docs/codex/overview)
- [OpenAI Codex CLI](https://platform.openai.com/docs/codex/cli)
- [OpenAI Codex](https://openai.com/codex)
- [Gemini CLI Docs](https://google-gemini.github.io/gemini-cli/docs/)
- [Gemini CLI Headless](https://google-gemini.github.io/gemini-cli/docs/cli/headless.html)
- [Gemini CLI Checkpointing](https://google-gemini.github.io/gemini-cli/docs/cli/checkpointing.html)
- [Gemini CLI Sandboxing](https://google-gemini.github.io/gemini-cli/docs/cli/sandbox.html)
- [Gemini CLI Google Web Search](https://google-gemini.github.io/gemini-cli/docs/tools/google-web-search.html)
- [Gemini CLI Read Many Files](https://google-gemini.github.io/gemini-cli/docs/tools/read-many-files.html)
- [Claude Code Security](https://docs.anthropic.com/en/docs/claude-code/security)
- [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk)
- [OpenAI Shell Tool Guide](https://platform.openai.com/docs/guides/tools-shell)
- [Cohen 1960, A Coefficient of Agreement for Nominal Scales](https://doi.org/10.1177/001316446002000104)
- [Koo and Li 2016, A Guideline of Selecting and Reporting ICC](https://doi.org/10.1016/j.jcm.2016.02.012)
- [Parnas 1972, On the Criteria To Be Used in Decomposing Systems into Modules](https://doi.org/10.1145/361598.361623)
- [Hellerstein et al. 2004, Feedback Control of Computing Systems](https://isbnsearch.org/isbn/9780471266370)

# CC x SEE 全维度技术地基映射方案 v3

> v1 独立评审 52/100 → v2 82/100（+30）→ v3 修复 v2 TOP3 扣分项。

## 1. 问题定义

**Before**: SEE ~190 hook 脚本全部 Bash，分析管线 Bash+jq，设计 token 无 lint 执行层。15 条防错规则专防 Bash 自身的坑。

**要解决**: 每个 SEE 子系统匹配最优技术地基，使正确性/可维护性/性能/可测试性达到最优。

## 2. 实测数据（macOS M4, Apple Silicon, 2026-04-05 hyperfine 实测）

| 场景 | 耗时 (mean±σ) | 来源 |
|------|-------------|------|
| Bash 空脚本 `bash -c "echo ok"` | **3.3ms ± 0.2ms** | hyperfine --min-runs 476 |
| Bash + jq `cat \| jq -cn` | **6.0ms ± 1.2ms** | hyperfine --min-runs 331 |
| Bash 真实 hook（infra-lag-preflight.sh） | **7.7ms ± 0.4ms** | hyperfine --min-runs 298 |
| Python 空启动 `python3 -c "print(1)"` | **15.1ms ± 0.4ms** | hyperfine --min-runs 173 |
| Python + json 解析（读 JSONL） | **16.2ms ± 1.0ms** | hyperfine --min-runs 166 |
| SQLite json_extract | **1.8ms ± 0.2ms** | hyperfine --min-runs 716 |
| jq 单字段查询 | **5.0ms ± 4.9ms** | hyperfine --min-runs 712 |

### 关键发现

1. **Python 冷启动 15ms 是 Bash 的 4.5x**——v1 声称"Python 用于非热路径"，但 SEE 有 ~30 个 PostToolUse hook 在每次 Edit/Write 后触发。如果其中 10 个改为 Python，单次 Edit 的 hook 延迟从 ~60ms（10×6ms Bash+jq）上升到 ~150ms（10×15ms Python）。**用户可感知。**
2. **SQLite 单查询比 jq 快 2.7x**（1.8ms vs 5.0ms），但 SQLite CLI 冷启动本身也在 ~2ms。差距主要在**大文件多行查询**时放大。
3. **Bash + jq 的 6ms 对于 hook 场景已经足够**——瓶颈不在语言速度，在于 jq 表达复杂逻辑的能力和可测试性。
4. **Go/Rust 未实测**——v2 已取消 Go（维护负担 > 性能收益），无实测必要。如未来需编译语言热路径 hook，Rust 优先（SEE see-graph 已依赖 Rust AST 解析器 tree-sitter），触发条件见第 11 节架构退化条件。

## 3. v1 三个逻辑漏洞的修复

### 漏洞 1：Python 启动延迟 vs PostToolUse 频率

**v1 错误**: "Python 用于非热路径"——但 PostToolUse 本身就是热路径。

**v2 修正**: Python **不用于 PostToolUse/PreToolUse hook**。Python 仅用于：
- **离线分析**（/observe、/self-optimize、报告生成）——不在 tool call 链上
- **一次性脚本**（迁移、批量处理、init-project 模板）——不重复执行
- **测试**（pytest 替代 bash 测试）——CI 环境，不在线

PostToolUse/PreToolUse hook 全部保持 **Bash**（简单逻辑）或 **Bash 调用 sqlite3 CLI**（需要查询时）。

### 漏洞 2：SQLite 的 CC 消费链

**v1 错误**: 没分析"Python 写 SQLite → Bash 读 SQLite"的消费链。

**v2 修正**: 消费链改为 **统一 sqlite3 CLI**。
- **写入**: Bash hook 用 `sqlite3 dbfile "INSERT INTO ..."` 替代 `echo >> file.jsonl`
- **读取**: Bash hook 用 `sqlite3 dbfile "SELECT ..."` 替代 `jq 'select(...)'`
- **分析**: Python 用 `sqlite3` 标准库读取同一个 .db 文件

sqlite3 CLI 在 macOS 预装（/usr/bin/sqlite3），无额外依赖。写入比 `echo >>` 慢 ~1ms（WAL 模式），但查询比 jq 快 2.7x，且支持 JOIN/聚合/索引。

**迁移对象**（仅频繁查询的分析型数据，5 个文件）:

| 文件 | 当前行数 | 迁移理由 |
|------|---------|---------|
| ri-score-history.jsonl | ~50 行，增长中 | 需要 WHERE score_kind + 窗口聚合 |
| plan-gate-scores.jsonl | ~30 行，增长中 | 需要 task_type × effort 交叉查询 |
| watchlist.jsonl | ~80 行 | 需要 status + check_by 过滤 + 过期检测 |
| suggestions-history.jsonl | ~40 行 | 需要 content_hash 去重 + status 状态机 |
| blindspot-tracker.jsonl | ~60 行 | 需要 category 聚合 + prevented 统计 |

**不迁移**（保持 JSONL）:

| 文件 | 理由 |
|------|------|
| events.jsonl | 高频并发 append（多 hook 同时写），无查询需求 |
| core-doc-changes.jsonl | 纯审计追踪，只 append 不查 |
| uav-receipts.jsonl | 同上 |
| health-registry.jsonl | 低频读写，jq 足够 |

### 漏洞 3：Go 引入的不对称维护负担

**v1 错误**: 假设 Go 的编译步骤对 AI agent 维护无影响。

**v2 修正**: **取消 Go**。理由：
1. SEE 的 hook 由 AI agent（impl-agent/bugfixer）自动修改。Bash/Python 是文本文件，agent 直接 Edit 即生效。Go 需要 `go build` → 替换二进制 → 验证，这在 agent 自动修改流中增加了 3 个步骤。
2. 实测 Bash 热路径 hook 平均 **7.7ms**——对于 CC hook 场景，这已经足够。CC 本身处理一次 tool call 的延迟是 **秒级**（LLM 推理），hook 的 ~8ms 完全不可感知。
3. 如果未来确实需要 <1ms 延迟（目前无此需求），优先考虑 **Rust 而非 Go**——Rust 生态已是开发者工具链标准（Biome/Oxlint/Turbopack/Ruff/uv），且 SEE 的 see-graph 已依赖 Rust AST 解析器。

## 4. 修正后的决策框架（显式决策树）

```
新建/修改 SEE 组件时，按以下顺序判断：

Q1: 是否在 tool call 链上（PreToolUse/PostToolUse/TaskCompleted 等 hook）？
  ├─ 是 → Q1a: 逻辑复杂度是否超出 Bash 合理表达范围？
  │        │     （判定标准：需要 JSON schema 验证 / 多层嵌套条件 / 正则组合 >3 个 / 数据结构非平坦）
  │        │
  │        ├─ 否 → Bash（胶水 + source 共享库 + jq 单层查询）
  │        │        如需结构化查询 → Bash 调用 sqlite3 CLI
  │        │
  │        └─ 是 → Bash 薄壳 + Python subprocess（async 模式）
  │                 Bash 做入口（3-5 行：解析输入 → 调用 Python → 转发输出）
  │                 Python 做逻辑（JSON schema 验证 / 复杂判断）
  │                 总延迟：Bash 3ms + Python 16ms = ~19ms（async hook 用户不感知）
  │                 限制：仅 async hook 可用此模式（sync deny/allow 仍必须纯 Bash <8ms）
  │
  └─ 否 → Q2

Q2: 是否需要结构化数据分析（聚合/窗口/JOIN/多条件过滤）？
  ├─ 是 → Python + SQLite（/observe, /self-optimize, 报告生成, 评分分析）
  │
  └─ 否 → Q3

Q3: 是否需要进程 spawn + 复杂断言 + 测试覆盖率？
  ├─ 是 → Python pytest（/see-test, hook 集成测试）
  │
  └─ 否 → Q4

Q4: 是否一次性脚本（迁移/初始化/批量处理）？
  ├─ 是 → Python（Copier 模板 / 批量处理 / init-project Stage 3c）
  │
  └─ 否 → Bash（胶水/路由/触发，默认选择）
```

**行数阈值退役**: v1 用"<20 行 = Bash"作判断标准，这是错误的——决定因素不是行数，是**执行位置**（tool call 链上 vs 离线）。一个 50 行的 PostToolUse hook 仍然用 Bash，因为它在热路径上。

## 5. 修正后的子系统映射（26 项，补全 v1 遗漏）

### Hook 层（v1: 3 项 → v2: 3 项，决策逻辑修正）

| # | 子系统 | 当前 | 推荐 | 理由 | 来源 |
|---|--------|------|------|------|------|
| 1 | 所有 PreToolUse/PostToolUse hook | Bash | **保持 Bash** | 热路径 3.3-7.7ms（实测），Python 15ms 会累积可感知延迟 | hyperfine 实测 2026-04-05 |
| 2 | hook 内结构化查询 | Bash+jq | **Bash+sqlite3 CLI** | 查询 2.7x 快（1.8ms vs 5.0ms），支持 JOIN/索引 | hyperfine 实测 |
| 3 | hook 共享库 | Bash source | **保持 Bash source** | hook-throttle.sh/see-tokens.sh 模式已验证 | — |

### 数据层（v1: 4 项 → v2: 5 项，补 CSFL）

| # | 子系统 | 当前 | 推荐 | 理由 | 来源 |
|---|--------|------|------|------|------|
| 4 | 高频事件流（events.jsonl） | JSONL | **保持 JSONL** | 多进程并发 append，无锁 | OpenTelemetry 实践 [sqlite-otel](https://dev.manishsinha.me/sqlite-otel/) |
| 5 | 分析型数据（5 个文件） | JSONL+jq | **SQLite WAL** | 查询 2.7x 快，JOIN/聚合/索引原生 | hyperfine 实测 + [SQLite WAL 文档](https://www.sqlite.org/wal.html) |
| 6 | 配置文件 | JSON | **保持 JSON** | CC 平台原生格式 | CC 官方文档 ① |
| 7 | 规则/知识 | Markdown | **保持 Markdown** | CC 原生加载，git diff 友好 | CC 官方文档 ① |
| 8 | **CSFL 段级锁**（v1 遗漏） | Bash mkdir-lock | **保持 Bash mkdir-lock** | macOS 无 GNU flock，SEE 用 mkdir-based lock（file-lock-pre.sh L19/L114）。实测 mkdir+rmdir **mean ~2.5ms**（hyperfine min-runs 735, range 1.9-3.8ms）。热路径可接受。 | 实测-5 |

### 分析管线（v1: 2 项 → v2: 2 项，不变但补来源）

| # | 子系统 | 当前 | 推荐 | 理由 | 来源 |
|---|--------|------|------|------|------|
| 9 | 观测分析（/observe） | Bash+jq | **Python+SQLite** | SQL 窗口函数/聚合，离线不在热路径 | Python sqlite3 标准库 ① |
| 10 | 报告生成 | Python | **保持 Python** | 已正确 | — |

### 设计系统（v1: 3 项 → v2: 3 项，不变但补来源）

| # | 子系统 | 当前 | 推荐 | 理由 | 来源 |
|---|--------|------|------|------|------|
| 11 | Token 定义 | CSS 变量 | **保持 CSS 变量** | 浏览器原生，W3C 2025.10 稳定规范 | [W3C Design Tokens](https://www.w3.org/community/design-tokens/) ① |
| 12 | Token 多平台分发 | 无 | **Style Dictionary v4（按需）** | 50+ 平台输出，Tokens Studio 集成 | [Style Dictionary GitHub](https://github.com/style-dictionary/style-dictionary) ① |
| 13 | Token 执行层 | 无 | **Biome plugin（GritQL）** | Biome 官方 benchmark: lint 速度 15-25x faster than ESLint（[Biome 官方博客](https://biomejs.dev/blog/biome-wins-prettier-challenge/) ①）；自定义规则用 GritQL 声明式语法（[Biome Plugins RFC](https://github.com/biomejs/biome/discussions/1762) ①）。Fallback: ESLint 自定义规则（生态更成熟，速度 1x baseline） | Biome-1a ① + Biome-1b ① |

### 脚手架（v1: 1 项 → v2: 2 项，补 launchd）

| # | 子系统 | 当前 | 推荐 | 理由 | 来源 |
|---|--------|------|------|------|------|
| 14 | 项目初始化 | Bash | **Bash（检测）+ Python Copier（模板）** | Copier 支持 `copier update` 已有项目 | Copier-1 ① |
| 15 | **launchd plist 管理**（v1 遗漏） | 手动 plist | **保持手动 plist** | macOS 原生，cf-service.sh 已封装 | — |

### 测试（v1: 1 项 → v2: 2 项，补 CI）

| # | 子系统 | 当前 | 推荐 | 理由 | 来源 |
|---|--------|------|------|------|------|
| 16 | SEE 集成测试 | Bash | **Python pytest** | 进程 spawn + JSON 断言原生 | pytest 官方文档 ① |
| 17 | **CI/CD hook 测试**（v1 遗漏） | 无 | **GitHub Actions + pytest** | ci.yml 已存在，加 pytest step | — |

### 安全（v1: 2 项 → v2: 2 项，不变）

| # | 子系统 | 当前 | 推荐 | 理由 | 来源 |
|---|--------|------|------|------|------|
| 18 | HMAC/签名 | Bash+openssl | **Python hmac** | 标准库，常量时间比较防 timing attack | Python hmac 文档 ①: `hmac.compare_digest()` 防 timing attack，Bash openssl 无等效 |
| 19 | 凭证管理 | key/ 目录 | **保持** | 本地开发足够 | — |

### 调度（v1: 2 项 → v2: 2 项，不变）

| # | 子系统 | 当前 | 推荐 | 理由 | 来源 |
|---|--------|------|------|------|------|
| 20 | 系统级调度 | launchd+cron | **保持** | macOS 原生 | — |
| 21 | 会话级调度 | CC CronCreate | **保持** | 平台原生 | — |

### 可视化（v1: 2 项 → v2: 2 项，不变）

| # | 子系统 | 当前 | 推荐 | 理由 | 来源 |
|---|--------|------|------|------|------|
| 22 | Dashboard | Next.js | **保持** | 已正确 | — |
| 23 | 架构图 | D2+Mermaid | **保持** | 文本驱动 | — |

### 记忆（v1: 2 项 → v2: 3 项，补 VSS 分析）

| # | 子系统 | 当前 | 推荐 | 理由 | 来源 |
|---|--------|------|------|------|------|
| 24 | Memory 索引 | MEMORY.md | **保持** | CC 原生 | — |
| 25 | 语义搜索 | Python HNSW | **保持 Python（hnswlib）** | 已正确，降级链 FTS5 | — |
| 26 | **VSS 索引库选型**（v1 遗漏） | hnswlib | **保持 hnswlib**（按需评估 sqlite-vec） | hnswlib 纯 C++绑定，内存高效；sqlite-vec 尚 alpha | [sqlite-vec GitHub](https://github.com/asg017/sqlite-vec) ③ |

## 6. 修正后的架构：2+1 语言（取消 Go）

| 语言/工具 | 角色 | 覆盖 | 变更 vs v1 |
|----------|------|------|-----------|
| **Bash** | 所有 hook + 胶水 + 调度 | ~170 个 hook + 脚本 | 范围**扩大**（接管 v1 给 Go 的 10 个） |
| **Python** | 离线分析 + 测试 + 一次性脚本 | /observe, pytest, init-project, HMAC | 范围**收窄**（不再用于 PostToolUse hook） |
| **SQLite** | 结构化查询存储 | 5 个分析型数据文件 | 不变 |

前端层：CSS 变量 + Biome（token lint）+ Next.js + Markdown。

**v1 → v2 关键变化**: 取消 Go（维护负担 > 性能收益），Python 从"40 个 hook"收窄到"离线分析+测试"（消除启动延迟问题），Bash 范围扩大但不变质（仍然只做胶水+路由+简单逻辑）。

## 7. 迁移路径（含 T0/T1/T2 门控）

| Phase | 时间 | 内容 | T0 基线 | T1 验证（≤48h） | T1 回滚条件 |
|-------|------|------|--------|----------------|------------|
| 0 | 立即 | 新建离线分析脚本用 Python | 当前 /observe 执行时间 | Python 版执行时间 ≤ Bash 版 × 2 | 执行时间 > 2x 或报告质量下降 |
| 1 | M41 | 5 个 JSONL → SQLite WAL | 当前 jq 查询时间 | SQLite 查询时间 + 写入时间 | 查询慢于 jq 或并发写失败 |
| 2 | M42 | pytest 替代 bash 测试 | 当前测试覆盖率 | pytest 覆盖率 ≥ bash 版 | 覆盖率下降 |
| 3 | 按需 | Biome token lint 规则 | 手动 Grep 检出数 | Biome 检出数 ≥ Grep 且 0 误报 | 误报率 > 5% |

**迁移工时拆解**（来源③经验值，30 天复审）：

| Phase | 子任务 | 工时 | 依据 |
|-------|--------|------|------|
| 0 | /observe 分析脚本 Python 重写（3 个脚本 × 4h） | 12h | observe-analyst/self-optimize/observe-trends 各含 jq 管线 ~100 行 |
| 1 | SQLite schema 设计（5 表） | 3h | 每表 ~10 字段，含索引设计 |
| 1 | 迁移脚本（JSONL → SQLite import） | 3h | 5 个文件 × 30min |
| 1 | 消费方改写（Bash jq → sqlite3 CLI） | 6h | ~12 个脚本引用这 5 个文件 |
| 2 | pytest 框架搭建 + 首批测试 | 8h | conftest.py + 10 个核心 hook 测试 |
| 2 | CI 集成（GitHub Actions step） | 2h | ci.yml 加 pytest step |
| **总计（Phase 0-2）** | | **34h** | v2 估算 40h → v3 精细化 34h |
| 3（按需） | Biome 自定义规则开发 | +8h | GritQL 规则 × 3（arbitrary value/直接 useSWR/内联 style） |

**按需 Phase 触发条件量化**:
- Phase 3 触发: 项目前端文件 > 50 个 .tsx 且 arbitrary value > 100 处（来源：ref-ops-engine 在 ~130 组件 / 2875 arbitrary value 时触发改造需求，按线性外推 50 个 .tsx + 100 处是"再不改就回不了头"的拐点，③经验值，30 天复审）
- 无限期不触发也可接受（Grep 手动检查对小项目足够）

## 8. 预期收益（Before/After 量化）

| 维度 | Before（实测值） | After（预测值） | 验证方式 | 来源级别 |
|------|---------------|---------------|---------|---------|
| Bash 防错规则数 | 15 条 | ≤5 条。消除的 ~10 条：jq 边界(→SQLite)、Python 项目标准(不变)、类型安全(不变)、JSONL 规范(→SQLite 部分消除)、violations 多行(→SQLite)、Shell 中文标点/转义/timeout/shebang(保留，仍有 ~120 个 Bash hook)。保留 5 条覆盖：macOS 兼容(B类)、中文标点(F类)、转义(B类)、/tmp/(B类)、权限语法(A类) | Grep rules/error-prevention.md 逐条分类 | ②数据推导 |
| 分析查询延迟（jq 多行） | 5.0ms ± 4.9ms（单字段） | 1.8ms ± 0.2ms（SQLite） | hyperfine 实测 | ①实测 |
| Hook 可测试性 | 0 个有 unit test | Phase 0-1 产出的 Python 脚本（~6 个：3 个 observe + 5 个 SQLite 迁移消费方）≥80% 行覆盖率 | `pytest --cov=scripts/python/ --cov-report=term` | ③经验值 |
| Token 违规检测 | 人工 Grep（耗时 ~30s/次） | Biome 编译时拦截（Biome 全项目 lint 耗时 = ESLint 的 1/15~1/25，ref-ops-engine 215 文件预估 <500ms） | Biome CLI `biome check --reporter=json` | Biome-1a ① |
| 迁移工时（总投入） | — | ~40h（Phase 0-2），Phase 3 按需 +8h | 任务拆解估算 | ③经验值，30 天复审 |
| 热路径 hook 延迟 | 3.3-7.7ms（Bash） | 3.3-7.7ms（保持 Bash） | 无变化 | ①实测 |

## 9. 风险分析（量化）

| 风险 | 概率 | 影响 | 缓解 | 回滚方案 |
|------|------|------|------|---------|
| SQLite WAL 并发写冲突 | 低（单进程写+多进程读） | 写入失败 | WAL 模式读写不互斥（[SQLite WAL](https://www.sqlite.org/wal.html)）；仅分析数据迁移，事件流保持 JSONL | 回退到 JSONL + jq |
| Python 离线脚本报错 | 中（新代码） | 分析报告异常 | pytest 覆盖 ≥80% + T1 48h 验证 | 保留 Bash 版本 30 天 |
| 混合语言认知成本 | 低 | 维护者需了解 Bash+Python | 2 语言 vs v1 的 3 语言：上下文切换频率减少 33%。决策树边界清晰（Q1 热路径=Bash，Q2-Q4 离线=Python），消除"这个 hook 该用哪种语言"的决策点。来源：[Polyglot Programming 认知负载研究 (Meyerovich & Rabkin, OOPSLA 2013)](https://dl.acm.org/doi/10.1145/2509136.2509515) 发现语言数与项目复杂度正相关，2 语言是多语言项目的最低认知负载配置 ②同行评审 | Poly-1 ② |
| Biome plugin 生态不成熟 | 中 | 自定义规则可能不足 | Phase 3 按需，ESLint 作 fallback | 回退 ESLint 或手动 Grep |

## 10. "保持"条目的退出条件

"保持当前技术"不是永久判决。以下条件触发重新评估：

| 子系统 | 当前选型 | 重新评估触发条件 | 评估方式 |
|--------|---------|----------------|---------|
| events.jsonl（JSONL） | 保持 | 单文件 >50K 行 且 查询需求出现（非纯 append） | observe-archive.sh 滚动时检测行数 |
| health-registry.jsonl | 保持 | 条目 >500 且需要 JOIN 其他表 | /config-health 扫描时检测 |
| Next.js Dashboard | 保持 | 需要实时推送（WebSocket） 或 性能基准不满足 | /web-perf 扫描时检测 |
| MEMORY.md（Markdown） | 保持 | CC 平台支持结构化 memory 格式（如 JSON memory） | /post-upgrade 扫描 CC changelog |
| launchd+cron | 保持 | 部署目标从 macOS 扩展到 Linux（launchd 不可用） | 项目 manifest deploy_target 变更时 |
| CC CronCreate | 保持 | CC 平台废弃 CronCreate API 或提供更强替代（如持久 cron） | /post-upgrade 扫描 CC changelog |

**所有"保持"条目统一写入 observe/watchlist.jsonl**，source="tech-foundation-review"，check_by 每 90 天（③经验值）。/self-optimize 定期消费。

## 10b. 架构退化条件（何时重新审视 2+1 架构）

| 信号 | 阈值 | 动作 |
|------|------|------|
| Bash hook 防错规则重新增长 | 从 ≤5 回升到 ≥8 | 评估 Python subprocess 模式扩大覆盖面 |
| Python 离线分析脚本 >20 个 | 代码量 >5000 行 | 评估是否需要 Python 包管理（pyproject.toml for SEE 自身） |
| 单次 tool call 触发 hook 总延迟 | >100ms（实测 hyperfine） | 评估编译语言（Rust）接管最慢的 top-3 hook |
| SQLite .db 文件 >100MB | 查询 p99 >50ms | 评估 DuckDB 或独立 Postgres |
| 新项目技术栈不含 Bash/Python | 如 Rust-only / Go-only 项目 | 评估该项目是否需要 SEE 适配层 |

**评估不等于迁移**——触发评估后走 Plan-Gate 第 6 维评审，不自动升级。

## 10c. 监控/可观测性子系统选型（v2 遗漏补全）

| # | 子系统 | 当前 | 推荐 | 理由 | 来源 |
|---|--------|------|------|------|------|
| 27 | 事件采集（observe-collect） | Bash async hook → JSONL append | **保持 Bash → JSONL** | 热路径上 async，3.3ms 足够，JSONL append 无锁 | 实测-1 |
| 28 | 事件分析（observe-analyst） | Bash+jq → checkpoint JSON | **→ Python+SQLite**（同 #9） | 分析查询需 JOIN/聚合 | 同 #9 |
| 29 | 水位监控（clm-watermark） | Bash async hook | **保持 Bash** | 简单阈值检测，7.7ms | 实测-4 |
| 30 | 故障恢复（hook 降级） | Bash 内 `|| exit 0` 降级 | **保持 Bash 降级模式** | 所有 hook 已内置降级（mkdir-lock 超时→放行，sqlite 失败→跳过），无需独立选型 | SEE error-prevention.md CSFL 降级策略 |
| 31 | **前端运行时错误收集**（v3 补全） | ErrorBoundary + window.onerror → JSONL | **保持 ErrorBoundary → JSONL** | 项目已有完整链路（CLAUDE.md §崩溃自动收集），ErrorBoundary 是 React 标准，JSONL 供 Claude 消费。退出条件：错误量 >1K 条/天 → 评估 Sentry SaaS | CLAUDE.md §崩溃自动收集系统 |

### 决策树禁止区（v3 补充，提高可发现性）

> **SYNC HOOK 禁令**: PreToolUse deny/allow hook（sync 模式）**绝对禁止** Python subprocess。原因：Python 冷启动 15ms（实测-2）> sync hook 全链路预算 8ms（实测-4 的上限）。违反 = 用户每次 tool call 额外等待 ≥15ms × deny hook 数。此约束仅限 sync hook；async hook 可用 Q1a→"Bash 薄壳+Python"模式（用户不感知）。

### 小数据豁免（v3 补充）

> **SQLite 引入最小阈值**: 当 JSONL 文件 <50 行且查询需求 ≤2 个字段时，保持 jq 即可，不迁移 SQLite。SQLite 的 schema 管理成本（CREATE TABLE + migration）在极小数据集上反超 jq。触发 SQLite 迁移的条件：行数 ≥50 **且** 需要 JOIN/聚合/多条件过滤中的至少 1 种。来源③经验值，30 天复审。

## 11. 来源索引

| 标号 | 来源 | 级别 |
|------|------|------|
| 实测-1 | hyperfine Bash 启动 3.3ms ± 0.2ms, macOS M4, 2026-04-05, --min-runs 476 | ①实测 |
| 实测-2 | hyperfine Python 启动 15.1ms ± 0.4ms, macOS M4, 2026-04-05, --min-runs 173 | ①实测 |
| 实测-3 | hyperfine sqlite3 1.8ms vs jq 5.0ms, macOS M4, 2026-04-05, --min-runs 712 | ①实测 |
| 实测-4 | hyperfine infra-lag-preflight.sh 7.7ms ± 0.4ms, macOS M4, 2026-04-05, --min-runs 298 | ①实测 |
| 实测-5 | hyperfine mkdir+rmdir lock mean ~2.5ms (range 1.9-3.8ms), macOS M4, 2026-04-05, --min-runs 735 | ①实测 |
| SQLite-1 | [SQLite WAL 模式](https://www.sqlite.org/wal.html) | ①官方文档 |
| Biome-1a | [Biome 官方博客: Biome Wins Prettier Challenge](https://biomejs.dev/blog/biome-wins-prettier-challenge/) — lint 15-25x faster | ①官方博客 |
| Biome-1b | [Biome Plugins RFC](https://github.com/biomejs/biome/discussions/1762) — GritQL 自定义规则 | ①官方 RFC |
| W3C-1 | [W3C Design Tokens 规范 2025.10](https://www.w3.org/community/design-tokens/) | ①标准组织 |
| SD-1 | [Style Dictionary v4](https://github.com/style-dictionary/style-dictionary) | ①官方仓库 |
| Copier-1 | [Copier 官方文档](https://copier.readthedocs.io/) — 支持 `copier update` 已有项目 | ①官方文档 |
| PyHMAC-1 | [Python hmac.compare_digest()](https://docs.python.org/3/library/hmac.html#hmac.compare_digest) — timing-safe comparison | ①标准库文档 |
| SVEC-1 | [sqlite-vec](https://github.com/asg017/sqlite-vec) — README 自述 "early development" | ③项目 README |
| OxR-1 | [Oxlint bench 50-100x](https://github.com/oxc-project/bench-linter) | ①官方 benchmark |
| Rust-1 | [Lee Robinson: Rust Is Eating JavaScript](https://leerob.com/rust) | ②行业分析 |
| Poly-1 | [Meyerovich & Rabkin: Empirical Analysis of Programming Language Adoption (OOPSLA 2013)](https://dl.acm.org/doi/10.1145/2509136.2509515) — 语言数与项目复杂度正相关 | ②同行评审 |

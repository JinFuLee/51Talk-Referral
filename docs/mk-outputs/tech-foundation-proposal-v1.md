# CC x SEE 全维度技术地基映射方案 v1

## 1. 问题定义

**Before**: SEE 190+ hook 脚本全部用 Bash，分析管线用 Bash+jq 查询 JSONL，设计 token 无 lint 执行层。15 条防错规则专门防 Bash 自身的坑（timeout/中文标点/转义/jq 边界）。

**要解决的问题**: 每个 SEE 子系统应该用什么技术地基，使得该子系统在正确性、可维护性、性能、可测试性上达到最优？

## 2. 方案：3+1 语言架构

| 语言 | 角色 | 覆盖场景 | 数量估算 |
|------|------|---------|---------|
| Bash | 胶水/路由层 | 简单 hook（<20 行）、调度触发、文件操作 | ~120 个 |
| Python | 逻辑/分析层 | 复杂 hook、观测分析、测试、HMAC、脚手架模板 | ~40 个迁移 |
| Go | 热路径执行层 | 高频 hook（每次 tool call 触发） | ~10 个 |
| SQLite WAL | 结构化查询层 | 替代分析型 JSONL（ri-score/plan-gate/watchlist） | ~5 个文件 |

前端层不变：CSS 变量 + ESLint/Biome（token 保护）+ Next.js + Markdown（规则/知识）。

## 3. 子系统映射（22 项）

### Hook 层

| # | 子系统 | 当前 | 推荐 | 理由 |
|---|--------|------|------|------|
| 1 | 胶水 hook（<20 行） | Bash | Bash | 最短路径，改一行生效 |
| 2 | JSON 密集 hook（40 个） | Bash+jq | Python | 原生 dict，try/except，可测试 |
| 3 | 热路径 hook（10 个） | Bash | Go 单二进制 | 启动 ~1ms，无 fork/exec |

### 数据层

| # | 子系统 | 当前 | 推荐 | 理由 |
|---|--------|------|------|------|
| 4 | 高频事件流 | JSONL | JSONL | 多进程并发 append，无锁 |
| 5 | 分析型数据 | JSONL+jq | SQLite WAL | 查询 +30-60%，聚合/JOIN 原生 |
| 6 | 配置文件 | JSON | JSON | CC 平台原生 |
| 7 | 规则/知识 | Markdown | Markdown | CC 原生加载 |

### 分析管线

| # | 子系统 | 当前 | 推荐 | 理由 |
|---|--------|------|------|------|
| 8 | 观测分析 | Bash+jq | Python+SQLite | SQL 聚合/窗口函数原生 |
| 9 | 报告生成 | Python | Python | 已正确 |

### 设计系统

| # | 子系统 | 当前 | 推荐 | 理由 |
|---|--------|------|------|------|
| 10 | Token 定义 | CSS 变量 | CSS 变量 | W3C 2025.10 规范对齐 |
| 11 | Token 多平台分发 | 无 | Style Dictionary v4（按需） | 50+ 平台输出 |
| 12 | Token 执行层 | 无 | ESLint/Biome 自定义规则 | 编译时拦截 |

### 脚手架

| # | 子系统 | 当前 | 推荐 | 理由 |
|---|--------|------|------|------|
| 13 | 项目初始化 | Bash | Bash + Copier（模板） | 支持 update 已有项目 |

### 测试

| # | 子系统 | 当前 | 推荐 | 理由 |
|---|--------|------|------|------|
| 14 | SEE 集成测试 | Bash | Python pytest | 进程 spawn + JSON 断言原生 |

### 安全

| # | 子系统 | 当前 | 推荐 | 理由 |
|---|--------|------|------|------|
| 15 | HMAC/签名 | Bash+openssl | Python hmac | 标准库，边界处理可靠 |
| 16 | 凭证管理 | key/ 目录 | key/ 目录 | 本地开发足够 |

### 调度

| # | 子系统 | 当前 | 推荐 | 理由 |
|---|--------|------|------|------|
| 17 | 系统级调度 | launchd+cron | launchd+cron | macOS 原生 |
| 18 | 会话级调度 | CC CronCreate | CC CronCreate | 平台原生 |

### 可视化

| # | 子系统 | 当前 | 推荐 | 理由 |
|---|--------|------|------|------|
| 19 | Dashboard | Next.js | Next.js | 已正确 |
| 20 | 架构图 | D2+Mermaid | D2+Mermaid | 文本驱动 |

### 记忆

| # | 子系统 | 当前 | 推荐 | 理由 |
|---|--------|------|------|------|
| 21 | Memory 索引 | MEMORY.md | MEMORY.md | CC 原生 |
| 22 | 语义搜索 | Python VSS | Python VSS | 已正确 |

## 4. 迁移路径

| Phase | 时间 | 内容 | 前置条件 |
|-------|------|------|---------|
| 0 | 立即 | 新建复杂 hook 用 Python，不再用 Bash | 无 |
| 1 | M41 | 分析管线 → Python+SQLite | Phase 0 验证 |
| 2 | M42 | 40 个 JSON 密集 hook → Python | Phase 1 验证 |
| 3 | 按需 | 10 个热路径 hook → Go | 性能瓶颈实测证据 |
| 4 | 按需 | Token lint → Biome/ESLint 规则 | 项目前端需求 |

## 5. 预期收益

| 维度 | Before | After |
|------|--------|-------|
| Bash 防错规则数 | 15 条 | ≤5 条（仅覆盖剩余 120 个胶水 hook） |
| 分析查询性能 | jq 线性扫描 | SQLite 索引查询 +30-60% |
| Hook 可测试性 | 极差（bash 无 unit test） | Python pytest 覆盖 40 个复杂 hook |
| 热路径延迟 | ~5ms/hook（bash fork） | ~1ms/hook（Go 二进制） |
| Token 违规检测 | 人工 Grep | 编译时自动拦截 |

## 6. 风险

| 风险 | 概率 | 缓解 |
|------|------|------|
| Python hook 启动慢 | 中 | 仅用于非热路径，热路径用 Go |
| Go 学习曲线 | 低 | Phase 3 按需，非必须 |
| SQLite 并发写冲突 | 低 | WAL 模式 + 分析库只读 |
| 混合语言维护成本 | 中 | 严格按子系统划分，不混用 |

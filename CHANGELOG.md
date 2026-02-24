# ref-ops-engine 更新日志 (Changelog)

所有对此项目的显著更改将记录于此文件中。

## [Version 10.0.0] - 2026-02-21 (满分高级迭代版)

### 🎨 UI/UX 体验大跃升 (Aesthetics & Micro-interactions)

- **高级深海系色彩主题**: 彻底重构了 `tailwind.config.ts` 与 `globals.css` 中的全局调色板设定。引入经过 HSL 调优的现代化色彩，增强视觉层次。
- **动态数字动画**: 新增自定义 Hook `useCountUp`。现在 `KPICard` 中的所有关键指标和达成目标都会以顺滑跃动的方式载入。
- **微交互与卡片质感**: 在 `KPICard` 与全局基础组件中植入平滑的过渡 Hover 效果 (轻微浮动 + 加深阴影)，提供优秀的点击回馈感。
- **图表渐变美学**: 弃用纯色数据可视化。在 `TrendLineChart` 以及 `DailyKPIChart` 中引入 SVG 阴影和 `<defs><linearGradient>` 渐变柱状体，带来 Premium 级别的 BI 观感。
- **Skeleton 加载流**: 开发了与卡片组件完全匹配的骨架屏（Skeleton），消除了异步请求时生硬的整页 Loading，实现视觉层级的丝滑过渡。

### ⚡ 架构稳健与性能隔离 (Architecture & Performance)

- **FastAPI BackgroundTasks 后台解耦**: 为了防止极端情况下计算密集型数据汇总导致的前端长时间 Pending (并死锁 API Pool)，已将整个 35 源的 `/api/analysis/run` 核心重算逻辑剥离为后台异步任务，响应实现毫秒级返回 `processing`。
- **Slowapi 全频段限流防御**: 在 FastAPI `main.py` 安装 SlowAPIMiddleware，配置 `100/minute` 兜底限流策略，防御重度和恶意刷新。
- **Pydantic V2 严格输入过滤**: 在后台 `config.py` 及针对目标值设定的 `/v2` API 中，强制使用 Pydantic 强结构化校验（如 `MonthlyTargetV2` 等），杜绝非法输入污染硬盘配置。
- **Optimistic UI 乐观无感更新**: 将配置页面中的网络请求与状态保存全面替换为通过 SWR 的 `mutate(data, false)` 实现的 Optimistic 更新。现在前台修改数值不会出现任何等待感。

### 🤖 AI 原生洞察闭环 (AI Native Integrations)

- **Co-pilot Terminal 浮窗助脑**: 新增右下角浮动智能终端界面组件 `CoPilotTerminal`，使项目摆脱单纯的静态读取，允许运营人员时刻呼入虚拟“Team Agent”。
- **动态业务仪表盘 (Dynamic Dashboards)**: 将单调死板的 Ops 首页重制为具备风险嗅探机制的智能布局。当警报和突发数据产生时（例如：特定渠道异动），仪表盘自动拉响警告区块，并上调该块显示优先级。
- **Typewriter Markdown 流式金字塔**: 撰写并接入 `TypewriterText` 组件，给底层 `PyramidReport` 中的“结论报告”赋予自然语言生成的视觉代入感（逐字打印）。项目从静态查询面板蜕阶为真正的生成式洞察大脑。

# Tech Audit Profile — ref-ops-engine

<!-- 最后审计：2026-02-26 | 下次审计：2026-04（或重大架构变更时） -->

## 项目定位

- **Tier: S（个人工具）** — 个人使用，无多人协作场景
- **核心用途:** 直播展示业务业绩分析给团队
- **用户:** 仅 Felix 本人操作，团队被动观看分析结果
- **部署:** 自托管 Docker（本地/内网），非公网暴露

## 当前技术栈快照

| Layer | Tech | Version |
|-------|------|---------|
| Backend | Python + FastAPI | 3.11 / >=0.110 |
| Backend Toolchain | uv + ruff + pytest | latest |
| Frontend | Next.js (App Router) + React | 14.2.21 / 18 |
| Styling | Tailwind CSS + tailwindcss-animate | v3.4 |
| Components | shadcn/ui (Radix UI) | latest |
| State | Zustand + SWR | 5 / 2 |
| Storage | SQLite + Excel (legacy) | — |
| AI | google-generativeai (Python) | >=0.4 |
| Testing | pytest + vitest + testing-library | CI enforced |
| Deploy | Docker + docker-compose | self-hosted |
| CI/CD | GitHub Actions | on push/PR |
| Package Manager | uv (Python) + pnpm (frontend) | latest |
| i18n | Custom [locale] routing | 中/泰 |
| Monitoring | 无 | — |
| Auth | 无 | — |

## 17 维度判定（S 级基准）

| # | Dimension | Judgment | Note |
|---|-----------|----------|------|
| 1 | Backend Framework | Matched | FastAPI 是 Python 分析引擎最佳搭档 |
| 2 | Frontend Framework | Minor | Next.js 14，15 可选升级但非必须 |
| 3 | Build/Toolchain | Matched | uv + pnpm 现代工具链 |
| 4 | Type System | Matched | TS strict:true + Python hints（#34 #35 已修复） |
| 5 | Styling | Minor | Tailwind v3，v4 可选升级 |
| 6 | Component Library | Matched | shadcn/ui 规范使用 |
| 7 | State Management | Matched | Zustand + SWR 满足需求 |
| 8 | Storage | Matched | SQLite 是本地分析引擎最优解 |
| 9 | AI SDK | Matched | 后端直调 S 级标配 |
| 10 | Routing | Matched | App Router [locale] 正确 |
| 11 | Testing | Matched | 单元测试足够，E2E 对个人工具 ROI 低 |
| 12 | Deployment | Matched | 自托管 Docker 完全正确 |
| 13 | Package Manager | Matched | 完全对齐 |
| 14 | Monitoring | Skip OK | 个人工具无需 |
| 15 | i18n | Matched | 仅 2 语言，手写路由合理 |
| 16 | Realtime | Matched | WebMCP 是项目特色 |
| 17 | Auth | Skip OK | 个人工具无需 |

**Score: Matched 13 / Minor 2 / Skip OK 2 — 技术栈健康**

## 审计历史

| 日期 | 触发 | 发现 | 行动 |
|------|------|------|------|
| 2026-02-26 | /tech-audit | Dockerfile 工具链不一致 + types.ts 类型缺陷 | 修复 Dockerfile→uv + 修复 #34 #35 |

## 不适用项（S 级豁免）

以下维度知识库推荐但本项目明确跳过，**未来审计不应再标记为 Behind/Missing：**

- **Auth** — 无多用户场景，永久跳过
- **Monitoring (Sentry)** — 个人工具手动排查够
- **E2E Testing (Playwright)** — 单元测试已足够
- **RSC 优化** — 47 页全 "use client"，内部工具可接受 (tech debt #37 保留但降为 P4)
- **Next.js 15 升级** — Nice-to-have，非阻塞
- **Tailwind v4 升级** — Nice-to-have，无功能差异

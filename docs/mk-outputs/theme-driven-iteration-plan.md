# 主题驱动迭代方案

> 生成日期：2026-03-24
> 基于：dashboard-specs.md 第零原则 + coverage-deep-dive.md + 28个已开发页面实际代码审查

---

## 一、页面合规评审结果（全量 28 页）

### 判定标准

- **合规**：符合"一主题一页面，岗位为维度"原则
- **需重构**：独立岗位页面 / 缺少三岗 Tab / 路由语义违规
- **需增强**：主题正确但岗位维度不完整或数据利用率低

---

### 1. 总览 Dashboard `/` — **合规**

主题：月度 KPI 全貌。无岗位专属，展示全站结果指标。
待增强：D2b 全站财务参与率未注入（见 E2），但属增强不属违规。

---

### 2. 漏斗分析 `/funnel` — **合规**

主题：转化漏斗。跨岗视角（注册→邀约→出席→付费），无岗位拆分需求。
待增强：邀约层缺失（D3 邀约数未接入），但主题结构合规。

---

### 3. 围场分析 `/enclosure` — **需重构（R2 违规：岗位维度缺失）**

**违规点**：当前页面仅展示 CC 数据（D2 byCC），表头无 SS/LP 视角切换。SS/LP 的围场数据（D2-SS、D2-LP）独立成页（见 #4），造成分裂。

**根因**：`/ss-lp-matrix` 是 `/enclosure` 的 SS/LP 分支，应合并。

**修复方案**：
- 保留 `/enclosure` 路由
- 页面顶部增加 Tab：`全部 | CC | SS | LP`
- CC Tab = 现有内容（D2 byCC）
- SS Tab = 现在 `/ss-lp-matrix` 的 SS 视图（D2-SS）
- LP Tab = 现在 `/ss-lp-matrix` 的 LP 视图（D2-LP）
- API 统一为 `GET /api/enclosure?role=cc|ss|lp`（或保留现有三个端点，前端按 Tab 调用）

---

### 4. SS/LP 矩阵 `/ss-lp-matrix` — **需重构（R1 违规：岗位专属页面）**

**违规点**：独立路由 `/ss-lp-matrix` = 岗位名命名的页面，是反模式的典型案例（specs 第零原则 R1 明确列出）。

**修复方案**：内容合并到 `/enclosure`，`/ss-lp-matrix` 设置 HTTP 301 重定向到 `/enclosure?tab=ss`。

---

### 5. 次卡到期预警 `/expiry-alert` — **合规**

主题：续期风险预警（学员维度，非岗位维度）。CC 是"负责人"字段而非过滤维度。
待增强：失联天数列缺失（E1）。

---

### 6. 接通质量分析 `/outreach-quality` — **合规**

主题：触达质量（跨岗对比）。已展示 CC/SS/LP 接通数 + 接通率，符合三岗对等原则（R4）。

---

### 7. 激励追踪 `/incentive-tracking` — **合规**

主题：奖励领取对推荐行为的影响（学员维度）。无岗位拆分需求。
待增强：历史转码次数未纳入对比（E9）。

---

### 8. 续费风险 `/renewal-risk` — **合规**

主题：续费风险分层（学员维度）。无岗位拆分需求。
待增强：LTV 维度（总次卡数 + 总1v1续费订单数）缺失（E8）。

---

### 9. 学习热图 `/learning-heatmap` — **合规**

主题：学员学习活跃度（学员维度，按围场分组）。无岗位拆分需求。
待增强：历史转码趋势维度缺失（E11）。

---

### 10. 地理分布 `/geo-distribution` — **合规**

主题：学员地理分布（学员维度）。无岗位拆分需求。

---

### 11. CC 矩阵 `/cc-matrix` — **需重构（R1+R4 违规：CC 专属页面 + 三岗不对等）**

**违规点**：
- 路由 `/cc-matrix` 以岗位命名，违反 R1
- 功能（热力矩阵 + 雷达图 + 四象限）只覆盖 CC，SS/LP 无等价分析，违反 R4
- `METRIC_OPTIONS` 仅 4 项（带新系数/参与率/打卡率/触达率），无 SS/LP 维度切换

**修复方案**：
- 路由改为 `/personnel-matrix`（"人员战力图"，主题语义）
- 增加顶部 Tab：`CC | SS | LP`
- CC Tab = 现有热力矩阵内容（D2 byCC）
- SS Tab = SS 个人 × 围场段热力矩阵（D2-SS，指标一致）
- LP Tab = LP 个人 × 围场段热力矩阵（D2-LP，指标一致）
- 路由 `/cc-matrix` 设 301 重定向到 `/personnel-matrix?tab=cc`

---

### 12. 高潜学员 `/high-potential` — **合规**

主题：高潜学员识别（学员维度）。CC/SS/LP 是"负责人"字段，非分析维度。
待增强：urgency 维度升级（E10）。

---

### 13. 高潜作战室 `/high-potential/warroom` — **合规**

主题：高潜学员紧急跟进策略（学员维度）。路由为子页，符合主题。

---

### 14. 学员明细 `/members` — **合规**

主题：学员全量列表（学员维度）。无岗位拆分需求。
待增强：筛选维度不足（E6）。

---

### 15. 团队汇总 `/team` — **需重构（R1+R4 违规：CC 专属 + 三岗不对等）**

**违规点**：
- 页面副标题"各 CC 学员数·参与率·注册·付费对比"，数据源只调 `/api/team/summary`（实际只返回 CC 数据）
- TypeScript 接口 `TeamMember` 字段含 `cc_name/cc_group`，绑定 CC 语义
- 无 SS/LP 团队/组别维度
- 违反 R4（有 CC 排名无 SS/LP 排名）

**修复方案**：
- 路由保持 `/team`（语义合规，"团队"无岗位限定）
- 增加 Tab：`CC | SS | LP`
- CC Tab = 现有 TeamSummaryCard 内容（D2 byCC 按组聚合）
- SS Tab = SS 组级绩效汇总（D2-SS 按 ss_group 聚合）
- LP Tab = LP 组级绩效汇总（D2-LP 按 lp_group 聚合）
- API：新增 `GET /api/team/summary?role=ss` 和 `?role=lp`

---

### 16. 打卡管理 `/checkin` — **合规（已部分实现三岗）**

**审查结论**：打卡页已实现 by_role 结构（后端返回 `{by_role: {CC:{...}, SS:{...}, LP:{...}}}`），前端 SummaryTab 按 role 动态渲染列，已满足 R2/R4。
"未打卡跟进"Tab 使用 `activeRoles/roleEnclosures` 从配置读取，满足 R3。

无需重构，已符合主题驱动原则。

---

### 17. 触达监控 `/daily-monitor` — **合规（已实现三岗视角）**

**审查结论**：页面顶部已展示三个 ContactGauge（CC触达率/SS触达率/LP触达率），有 `CC/SS/LP 角色触达对比` 组件（RoleCompare）。CC 接通排行通过 `?role=cc` 参数支持切换。

主题（日常触达监控）正确，三岗数据已对等展示。暂无 SS/LP 个人排行，可作为增强项而非违规。

---

### 18. 渠道分析 `/channel` — **合规**

主题：6 维渠道归因（CC窄/SS窄/LP窄 + 宽口 3 维）。三岗均有归因维度，符合 R2/R4。
待增强：学员粒度渠道贡献（E7）。

---

### 19. 达成归因 `/attribution` — **合规**

主题：各渠道对总业绩贡献（跨岗汇总）。无岗位专属问题。

---

### 20. 学员360档案 `/students/360` — **合规**

主题：单个学员全维度画像（学员维度，学员不属于某个岗位）。
待增强：多渠道带新分解（E3）。

---

### 21. 指标矩阵 `/indicator-matrix` — **合规**

主题：KPI 指标配置管理。本身就按 CC/SS/LP 三岗管理，完全符合 R2。

---

### 22. 围场健康扫描 `/enclosure-health` — **合规**

主题：围场段健康度评分（围场维度）。无岗位专属问题。

---

### 23-25. 报告 `/reports`, `/reports/ops`, `/reports/exec` — **合规**

主题：自动报告生成（汇总用，无岗位拆分需求）。

---

### 26. 汇报沉浸模式 `/present` — **合规**

全屏演示，展示用，无岗位专属问题。

---

### 27. 系统设置 `/settings` — **合规**

配置管理页，无岗位专属问题（设置本身跨岗）。

---

### 28. Dashboard `/dashboard` — **合规（空页面，tech debt #7）**

占位页，与主题驱动原则无冲突。

---

## 二、页面合并 / 重构计划

### 合并 A：`/ss-lp-matrix` → 合并到 `/enclosure`

| 项目 | 内容 |
|------|------|
| 目标 | `/ss-lp-matrix` 内容（SS/LP 围场排名 + 围场分布）整合为 `/enclosure` 的 Tab |
| 路由变更 | `/ss-lp-matrix` → HTTP 301 → `/enclosure?tab=ss` |
| Tab 结构 | 全部 \| CC \| SS \| LP |
| CC Tab | 现有 `/enclosure` 内容（围场×CC矩阵 + CC排名） |
| SS Tab | 现有 `/ss-lp-matrix` SS 视图（D2-SS 围场分布 + SS 排名） |
| LP Tab | 现有 `/ss-lp-matrix` LP 视图（D2-LP 围场分布 + LP 排名） |
| API 变更 | 新增 `GET /api/enclosure?role=ss` 和 `?role=lp`（或复用现有 `/api/enclosure-ss` / `/api/enclosure-lp`，前端按 Tab 切换调用） |
| 删除文件 | `frontend/app/ss-lp-matrix/page.tsx`（保留组件复用到 `/enclosure`） |

### 合并 B：`/cc-matrix` → 重命名为 `/personnel-matrix`

| 项目 | 内容 |
|------|------|
| 目标 | 扩展为三岗通用"人员战力图"，路由语义中性 |
| 路由变更 | `/cc-matrix` → HTTP 301 → `/personnel-matrix?tab=cc` |
| Tab 结构 | CC \| SS \| LP |
| CC Tab | 现有热力矩阵（D2 byCC）+ 雷达图 + 四象限 |
| SS Tab | SS 个人 × 围场段热力矩阵（D2-SS，复用 CCHeatmap 组件，数据不同） |
| LP Tab | LP 个人 × 围场段热力矩阵（D2-LP，同上） |
| API 变更 | 新增 `GET /api/personnel-matrix/heatmap?role=ss&metric=xxx` 和 `?role=lp` |
| 新建文件 | `frontend/app/personnel-matrix/page.tsx` |
| 删除文件 | `frontend/app/cc-matrix/page.tsx`（组件留用） |

### 重构 C：`/team` 增加 SS/LP Tab

| 项目 | 内容 |
|------|------|
| 目标 | 团队汇总从"CC团队"升级为"三岗团队" |
| 路由变更 | 路由不变（`/team` 语义合规） |
| Tab 结构 | CC \| SS \| LP |
| CC Tab | 现有内容（TeamSummaryCard + 柱状图） |
| SS Tab | SS 组级绩效：ss_group / 学员数 / 参与率 / 注册 / 付费 / 业绩 |
| LP Tab | LP 组级绩效：lp_group / 学员数 / 参与率 / 注册 / 付费 / 业绩 |
| API 变更 | 新增 `GET /api/team/summary?role=ss` 和 `?role=lp` |
| 修改文件 | `frontend/app/team/page.tsx` + `frontend/components/team/TeamSummaryCard.tsx`（泛化字段名） |

---

## 三、全量页面迭代清单

| 页面（主题） | 路由 | Tab 结构 | 筛选维度 | 核心数据源 | API | 当前状态 → 目标状态 |
|-------------|------|---------|---------|-----------|-----|-------------------|
| 总览 | `/` | 无（全站视角） | 无 | D1 + D2b | `/api/overview` | 合规，增强 D2b 财务口径基准线 |
| 漏斗分析 | `/funnel` | 无（全站视角） | 无 | D1 + D3 | `/api/funnel` | 合规，补全 D3 邀约层 |
| 围场效率 | `/enclosure` | 全部/CC/SS/LP | 围场段 | D2 + D2-SS + D2-LP | `/api/enclosure?role=` | **需增加 SS/LP Tab**（合并 `/ss-lp-matrix`） |
| 人员战力图 | `/personnel-matrix` | CC/SS/LP | 围场段/指标维度 | D2 + D2-SS + D2-LP | `/api/personnel-matrix/heatmap?role=&metric=` | **新建路由**（重构自 `/cc-matrix`） |
| 团队汇总 | `/team` | CC/SS/LP | 无 | D2 + D2-SS + D2-LP | `/api/team/summary?role=` | **需增加 SS/LP Tab** |
| 打卡管理 | `/checkin` | 汇总/打卡排行/团队明细/未打卡跟进 | 岗位已内嵌 | D2 + D4 | `/api/checkin/summary?role_config=` | 合规，已三岗对等 |
| 触达监控 | `/daily-monitor` | 无（三岗并列展示） | 无 | D1 + D2 | `/api/daily-monitor/stats` | 合规，可增强 SS/LP 个人排行 |
| 接通质量 | `/outreach-quality` | 无（三岗对比） | 围场 | D2 + D3 | `/api/analysis/outreach-quality` | 合规 |
| 跟进质量 | `/followup-quality` | CC/SS/LP | 围场/接通时长等级 | D4 | `/api/analysis/followup-quality` | **新建**（重命名自 N1 `/cc-followup-quality`） |
| 推荐者贡献 | `/referral-contributor` | 无（学员维度） | 围场/渠道 | D4 | `/api/analysis/referral-contributor` | **新建**（N2，符合主题原则，学员不属于某岗位） |
| 渠道分析 | `/channel` | 无（6维并列） | 围场 | D4 + attribution_engine | `/api/channel/attribution` | 合规，增强学员粒度 |
| 达成归因 | `/attribution` | 无（汇总） | 无 | D4 + D2 + config | `/api/attribution` | 合规 |
| 围场健康 | `/enclosure-health` | 无（围场维度） | 围场段 | D2 | `/api/enclosure-health` | 合规 |
| 高潜学员 | `/high-potential` | 无（学员维度） | urgency | D5 | `/api/high-potential` | 合规，增强 urgency 维度 |
| 高潜作战室 | `/high-potential/warroom` | 无（学员维度） | urgency | D5 + D4 | `/api/high-potential/warroom` | 合规 |
| 次卡预警 | `/expiry-alert` | 无（学员维度） | 风险层级 | D4 | `/api/students/expiry-alert` | 合规，增强失联天数列 |
| 续费风险 | `/renewal-risk` | 无（学员维度） | 风险分层 | D4 | `/api/analysis/renewal-risk` | 合规，增强 LTV 维度 |
| 激励追踪 | `/incentive-tracking` | 无（学员维度） | 奖励状态 | D4 | `/api/analysis/incentive-effect` | 合规，增强历史转码 |
| 学习热图 | `/learning-heatmap` | 无（学员维度） | 围场 | D4 | `/api/analysis/learning-heatmap` | 合规，增强参与趋势 |
| 地理分布 | `/geo-distribution` | 无（地理维度） | 国家 | D4 | `/api/analysis/geo-distribution` | 合规 |
| 学员明细 | `/members` | 无（学员列表） | 多维筛选 | D4 | `/api/members` | 合规，增强筛选维度 |
| 学员360 | `/students/360` | 无（单学员视图） | 无 | D4 + D3 + D5 | `/api/student-360/{id}` | 合规，增强多渠道带新分解 |
| 指标矩阵 | `/indicator-matrix` | CC/SS/LP（已有） | 指标类型 | config | `/api/indicator-matrix/` | 合规 |
| 报告列表 | `/reports` | 无 | 无 | 全部 | — | 合规 |
| 运营报告 | `/reports/ops` | 无 | 无 | 全部 | — | 合规 |
| 管理报告 | `/reports/exec` | 无 | 无 | 全部 | — | 合规 |
| 汇报模式 | `/present` | audience/timeframe | 无 | 全部 | — | 合规 |
| 系统设置 | `/settings` | 无 | 无 | config | `/api/config/` | 合规 |
| 仪表盘 | `/dashboard` | — | — | — | — | 空页面，待补充 |

**废弃路由（设 301 重定向）**：
- `/ss-lp-matrix` → `/enclosure?tab=ss`
- `/cc-matrix` → `/personnel-matrix?tab=cc`

---

## 四、新增页面（符合主题原则的版本）

### N1（改名）: 跟进质量 `/followup-quality`

**原路由 `/cc-followup-quality` 违反 R1**（岗位命名）。改为主题命名。

**Tab 结构**：`CC | SS | LP`

| Tab | 数据源 | 核心指标 |
|-----|-------|---------|
| CC Tab | D4（CC相关列）| 接通时长等级/失联天数/备注及时性/拨打效率/质量-数量四象限 |
| SS Tab | D4（SS相关列）| 预留（D4 有 SS末次接通相关列时启用，当前显示"暂无数据"） |
| LP Tab | D4（LP相关列）| 预留（同 SS，当前显示"暂无数据"） |

**CC Tab 核心指标**：
- 接通质量等级（≥120s=高质 / 30-119s=低质 / <30s=可疑）
- 失联天数（今日 - CC末次接通日期）
- 备注及时性（备注日期 - 接通日期，≤24h=及时 / >72h=懈怠）
- 拨打效率（有效接通/总拨打）
- 质量-数量四象限（D2触达率 × D4接通时长）

**API**：`GET /api/analysis/followup-quality?role=cc|ss|lp`

**注意**：SS/LP Tab 预留架构，等 D4 补充 SS/LP 末次接通数据后启用，当前展示"暂无数据"提示（满足 R5）。

---

### N2（保留）: 推荐者贡献 `/referral-contributor`

**路由合规**："推荐者"是学员角色，非岗位概念，不违反 R1。

**Tab 结构**：无（学员视角，CC/SS/LP 是"渠道维度"列，非 Tab）

| 展示模块 | 内容 |
|---------|------|
| 推荐者排行 | 按总带新付费数降序，TOP 学员 |
| 多渠道雷达图 | CC带新/SS带新/LP带新/宽口带新 × 人数 + 付费数 |
| 带新转化漏斗 | 带新人数 → 带新参与数 → 带新付费数（各渠道分列） |
| 渠道偏好分布 | 各渠道占比饼图 |

**API**：`GET /api/analysis/referral-contributor`

---

## 五、执行优先级排序

### P0 — 架构合规（必须先做，违反第零原则）

**P0-A：合并 `/ss-lp-matrix` → `/enclosure` 增加 SS/LP Tab**

| 项目 | 详情 |
|------|------|
| Before | `/enclosure` 只有 CC 数据，SS/LP 在独立路由 `/ss-lp-matrix`，1 个主题拆成 2 个路由 |
| After | `/enclosure` 统一路由，Tab 切换 CC/SS/LP，`/ss-lp-matrix` 301 重定向 |
| ROI | 消除架构违规（R1+R2），减少用户导航层级，SS/LP 数据利用率从"孤立"变为"统一视图"；前端复用现有组件，后端 API 已有 |
| 工作量 | 1.5天（改 `/enclosure/page.tsx` + 增加 Tab 逻辑 + 复用 ss-lp-matrix 组件 + 配置 301） |

**P0-B：重命名 `/cc-matrix` → `/personnel-matrix` 增加 SS/LP Tab**

| 项目 | 详情 |
|------|------|
| Before | `/cc-matrix` 以岗位命名，只有 CC 热力矩阵，SS/LP 无等价分析 |
| After | `/personnel-matrix` 语义中性，CC/SS/LP Tab，三岗热力矩阵对等 |
| ROI | 消除 R1+R4 双违规，SS/LP 绩效分析补全；新建 SS/LP 热力图 API 约 0.5 天 |
| 工作量 | 2天（新建路由 + 复用 CCHeatmap 组件 + 新 API + 301 配置） |

**P0-C：`/team` 增加 SS/LP Tab**

| 项目 | 详情 |
|------|------|
| Before | `/team` 实际只展示 CC 数据（cc_name/cc_group），标题说"团队"但无 SS/LP |
| After | `/team` 有 CC/SS/LP 三个 Tab，团队语义完整 |
| ROI | 消除 R4 违规，SS/LP 组长一眼看到本组数据；后端新增 2 个 API 端点 |
| 工作量 | 1天（改页面 + 新 API + 泛化 TeamSummaryCard 字段名） |

**P0-D：新建 `/followup-quality`（原 N1，重命名）**

| 项目 | 详情 |
|------|------|
| Before | D4 中 CC末次接通时长/接通日期/备注日期/备注内容/总拨打次数（5列）消费率 0% |
| After | 跟进质量仪表盘：接通质量等级 + 失联天数 + 备注及时性 + 四象限图 |
| ROI | 解决"触达率高但质量存疑"盲区，D4 5 列从 0% 到 100% 消费；SS/LP Tab 预留等数据补充 |
| 工作量 | 2天（新建 API + 前端页面 + 四象限组件） |

---

### P1 — 核心增强（主题合规，补全岗位维度或数据维度）

**P1-A：新建 `/referral-contributor`（N2）**

| 项目 | 详情 |
|------|------|
| Before | D4 多渠道带新付费列（CC/SS/LP/宽口，8列）消费率 0%；无法识别跨渠道超级推荐者 |
| After | 推荐者排行 + 多渠道雷达图 + 带新转化漏斗，找到值得额外激励的 TOP 学员 |
| ROI | 8 列 D4 数据从 0% 到 100% 消费；识别 TOP 推荐者 = 精准激励投入，预计提升高产推荐者留存率 |
| 工作量 | 2天（新建 API + 前端页面 + 雷达图组件） |

**P1-B：增强 `/students/360` 多渠道带新分解（E3）**

| 项目 | 详情 |
|------|------|
| Before | 学员360档案未展示 CC/SS/LP/宽口 各渠道带新数据 |
| After | 增加"渠道贡献分解"模块，完整个人推荐画像 |
| ROI | D4 带新列从孤立变为可视，学员价值判断更精准 |
| 工作量 | 0.5天 |

**P1-C：增强 `/expiry-alert` 失联天数（E1）**

| 项目 | 详情 |
|------|------|
| Before | 到期预警只有到期天数，未结合接通状态，高风险判断不准 |
| After | 增加"最后接通距今天数"列，到期近+失联 = 真正高风险 |
| ROI | 风险分层精度从 1 维提升到 2 维，CC 跟进资源精准投入 |
| 工作量 | 0.5天 |

**P1-D：增强 `/overview` 财务口径基准线（E2）**

| 项目 | 详情 |
|------|------|
| Before | D2b 全站财务参与率有 Loader 但无 API 端点，overview 无全站基准线 |
| After | overview 增加财务模型参与率 vs 运营口径参与率双列对比 |
| ROI | 运营和财务对数字的理解对齐，减少报告口径争议 |
| 工作量 | 1天（新建 D2b API 端点 + overview 组件增强） |

**P1-E：增强 `/funnel` 补全邀约层（E5 + specs 漏斗说明）**

| 项目 | 详情 |
|------|------|
| Before | 漏斗缺"邀约"层，D3 邀约数已有 Loader 但只在 student_360 时间线中用 |
| After | 漏斗 4 层：注册→邀约→出席→付费，每层有转化率 |
| ROI | 补全转化链路，精确定位最弱环节；D3 邀约数从低利用率到完整展示 |
| 工作量 | 0.5天 |

**P1-F：增强 `/members` 筛选维度（E6）**

| 项目 | 详情 |
|------|------|
| Before | 学员列表只有基础筛选，无失联天数 / 次卡健康度 / 历史带新数筛选 |
| After | 新增 3 个筛选维度，支持精准圈选跟进对象 |
| ROI | CC 精准圈选目标学员，减少无效跟进；筛选维度直接复用已有 D4 列 |
| 工作量 | 1天（后端 API 增加过滤参数 + 前端筛选 UI） |

**P1-G：增强 `/channel` 学员粒度（E7）**

| 项目 | 详情 |
|------|------|
| Before | 渠道归因只到渠道级，无法看每渠道 TOP 推荐者 |
| After | 每渠道活跃推荐者 TOP10 + 人均带新对比 |
| ROI | 渠道运营从宏观归因下钻到具体人员，精准激励资源 |
| 工作量 | 1天 |

**P1-H：增强 `/renewal-risk` LTV 维度（E8）**

| 项目 | 详情 |
|------|------|
| Before | 续费风险只按天数分层，无 LTV 权重 |
| After | 增加总次卡数 + 总1v1续费订单数，高价值高风险学员优先级更高 |
| ROI | 降低高价值学员流失率，资源向高 LTV 倾斜 |
| 工作量 | 0.5天 |

**P1-I：增强 `/incentive-tracking` 历史转码（E9）**

| 项目 | 详情 |
|------|------|
| Before | 激励效果只比较当月指标，未验证激励是否触达高活跃群体 |
| After | 增加各组历史转码次数对比 |
| ROI | 验证激励政策有效性，防止激励资源被低活跃群体消耗 |
| 工作量 | 0.5天 |

**P1-J：增强 `/high-potential` urgency 升级（E10）**

| 项目 | 详情 |
|------|------|
| Before | urgency 只看带新数+天数，未考虑失联状态 |
| After | 增加失联天数（CC末次接通距今）作为第 3 维；出席数≥2=深度参与优先 |
| ROI | 高潜学员跟进策略更精准，减少"高潜但失联已久"的无效跟进 |
| 工作量 | 0.5天 |

---

### P2 — 锦上添花（数据完善，低优先级）

**P2-A：增强 `/learning-heatmap` 参与趋势（E11）**

| 项目 | 详情 |
|------|------|
| Before | 热图只展示 4 周转码，无参与趋势 |
| After | 增加历史转码 ÷ 本月转码比 = 参与衰减趋势维度 |
| ROI | 识别"历史高参与但最近沉睡"学员，定向唤醒 |
| 工作量 | 0.5天 |

**P2-B：新建 `/team-hierarchy`（管理层视图）**

| 项目 | 详情 |
|------|------|
| Before | D4 CC七级/五级部门负责人（2列）消费率 0% |
| After | 管理层维度汇总 CC 绩效，支持向上汇报 |
| ROI | 使用频率低（管理层月度查看），优先级低 |
| 工作量 | 1.5天（新 API + 新页面） |

**P2-C：增强 `/daily-monitor` SS/LP 个人排行**

| 项目 | 详情 |
|------|------|
| Before | CC 接通排行已有，SS/LP 无个人排行 |
| After | 增加 SS/LP 触达排行（Tab 切换），满足 R4 完整性 |
| ROI | 增强三岗对等性，SS/LP 主管可快速看到团队个人触达情况 |
| 工作量 | 1天（新 API + 前端排行组件扩展） |

---

## 六、API 统一规范（重构后）

### 围场系统 API 对齐

```
# 现有（保留）
GET /api/enclosure                    → CC 围场数据
GET /api/enclosure-ss                 → SS 围场数据（/enclosure SS Tab 调用）
GET /api/enclosure-lp                 → LP 围场数据（/enclosure LP Tab 调用）

# 新建
GET /api/personnel-matrix/heatmap?role=ss&metric=xxx  → SS 热力矩阵
GET /api/personnel-matrix/heatmap?role=lp&metric=xxx  → LP 热力矩阵
GET /api/team/summary?role=ss         → SS 组级汇总
GET /api/team/summary?role=lp         → LP 组级汇总
GET /api/analysis/followup-quality?role=cc  → 跟进质量（CC）
GET /api/analysis/followup-quality?role=ss  → 预留（返回空 + 说明）
GET /api/analysis/referral-contributor      → 推荐者贡献
```

### 前端路由变更汇总

```
废弃路由（301 重定向）：
/ss-lp-matrix  →  /enclosure?tab=ss
/cc-matrix     →  /personnel-matrix?tab=cc

新建路由：
/personnel-matrix   （重构自 cc-matrix）
/followup-quality   （新建，原 N1 cc-followup-quality 合规化）
/referral-contributor  （新建，N2 保持不变）
```

---

## 七、遗留问题（不属于主题驱动原则范畴）

以下问题在评审中发现，与主题驱动原则无直接关系，但影响页面质量：

1. **`/cc-matrix` 下钻表格表头样式未使用 `slide-*` CSS class**（直接用 `bg-[var(--n-800)]` 内联，违反 Slide 设计体系 SSoT）—— 重构到 `/personnel-matrix` 时一并修复
2. **`/enclosure` 围场×CC 表格头部样式同上问题**（直接 `bg-[var(--n-800)]`，未用 `slide-thead-row`）—— 增加 Tab 时一并修复
3. **`/team` TypeScript 接口字段 `cc_name/cc_group` 绑定 CC 语义**，三岗通用后需泛化为 `person_name/group_name`，防止字段含义混淆


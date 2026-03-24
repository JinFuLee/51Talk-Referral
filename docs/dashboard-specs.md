# 仪表盘业务逻辑完整规格书

> 最后更新: 2026-03-24
> 覆盖: 28 个已开发页面 + 2 个待开发页面 + 11 个待增强页面

---

## 业务术语速查

| 术语 | 定义 |
|------|------|
| **CC** | 前端销售（数据中 THCC-A / TH-CC01~06Team / TH-CC15Team） |
| **SS** | 后端销售（数据别名 EA） |
| **LP** | 后端服务（数据别名 CM） |
| **围场** | 用户**付费当日**起算天数分段：0-30 / 31-60 / 61-90 / 91-120 / 121-150 / 151-180 / M6+ |
| **围场×岗位边界** | 0-90天→CC负责 / 91-120天→SS / 121天+→LP（可配置，`config/enclosure_role_override.json`） |
| **窄口** | CC/SS/LP 员工链接绑定 UserB（高质量推荐） |
| **宽口** | UserA 学员链接绑定 UserB（低质量推荐） |
| **有效学员** | 已付费用户（次卡 > 0 且在有效期内） |
| **转介绍参与率** | 带来 ≥1 注册的学员 / 有效学员 |
| **打卡率** | 转码且分享的学员 / 有效学员 |
| **触达率** | 有效通话(≥120s)学员 / 有效学员 |
| **带新系数** | B注册数 / 带来注册的A学员数 |
| **带货比** | 推荐注册数 / 有效学员 |
| **有效通话** | 接通时长 ≥ 120 秒 |
| **带新人数（D4）** | 推荐人视角：该学员作为推荐者带了多少新学员。CC带新+SS带新+LP带新+宽口带新 = 当月推荐注册的人数（精确） |
| **推荐奖励** | UserA 推荐 UserB 出席成功 → UserA 获次卡奖励。如"2次次卡[已领奖]"= 获2张已领 |
| **财务模型参与率** | 当前与转介绍参与率完全相等（待 BI 确认口径差异） |

### 双差额体系

| 差额 | 公式 | 含义 |
|------|------|------|
| 目标绝对差 | `actual - target` | 距月目标还差多少 |
| 时间进度差 | `actual/target - time_progress` | 是否跟上当前时间进度 |
| 达标需日均 | `(target - actual) / remaining_workdays` | 完成月目标每天需要多少 |
| 追进度需日均 | `max(0, target × time_progress - actual) / remaining_workdays` | 追上进度线每天需多少 |

### 币种显示: `$1,234 (฿41,956)` — USD 在前，THB 括号内，禁止 CNY

### 工作日: 每周除周三外均上班，周三权重 0.0，另扣泰国国定假期

---

## 已开发页面（28 个）

### 1. 总览 Dashboard (`/`)

**数据源**: D1(结果数据) + D2b(全站汇总)
**API**: `GET /api/overview`
**业务场景**: 运营每天第一个看的页面——当月 KPI 进度一目了然

**核心指标（8 项标准格式 kpi_8item）**:

| 指标 | 公式 | 来源 | 单位 |
|------|------|------|------|
| 注册数 | D1 转介绍注册数 | D1.转介绍注册数 | 人 |
| 预约数 | D1 预约数 | D1.预约数 | 人 |
| 出席数 | D1 出席数 | D1.出席数 | 人 |
| 付费数 | D1 转介绍付费数 | D1.转介绍付费数 | 人 |
| 业绩金额 | D1 总带新付费金额USD | D1.总带新付费金额USD | USD(THB) |
| 客单价 | 金额/付费数 | 派生 | USD |

每项展示: actual / target / absolute_gap / pace_gap / remaining_daily_avg / pace_daily_needed / efficiency_needed / current_daily_avg

**月度达成率**: 单量达成率 / 业绩达成率 / 客单价达成率（D1 直接提供）
**数据源状态**: 8/8 源同步状态 + 健康分

### 2. 漏斗分析 (`/funnel`)

**数据源**: D1 + D3(明细，邀约数)
**API**: `GET /api/funnel` + `GET /api/funnel/with-invitation`
**业务场景**: 各环节转化效率，找到最弱环节集中攻关

**漏斗节点**:

| 环节 | 数据来源 | 转化率计算 |
|------|---------|-----------|
| 注册 | D1.转介绍注册数 | — |
| 邀约 | D3.邀约数 聚合 | 注册→邀约率 |
| 出席 | D1.出席数 | 邀约→出席率 |
| 付费 | D1.转介绍付费数 | 出席→付费率 |

每环节展示: target / actual / gap / achievement_rate / conversion_rate
**注意**: invitation 数据在 `invitation` 对象中（非 stages 数组）

### 3. 围场分析 (`/enclosure`)

**数据源**: D2(byCC)
**API**: `GET /api/enclosure?group_by=enclosure_x_group`
**业务场景**: 围场 × CC组 交叉矩阵——哪个围场段哪个CC组效率最高/最低

**group_by 模式**:
- `enclosure_x_group`（默认）: 围场 × CC组 矩阵（~49行）
- `enclosure`: 仅围场聚合（7行）
- `individual`: 围场 × CC个人（~434行）

**核心指标**:

| 指标 | 来源列 | 聚合方式 |
|------|--------|---------|
| 有效学员数 | D2.学员数 | sum |
| 参与率 | D2.转介绍参与率 | mean |
| 带新系数 | D2.带新系数 | mean |
| 带货比 | D2.带货比 | mean |
| 打卡率 | D2.当月有效打卡率 | mean |
| CC/SS/LP触达率 | D2.CC/SS/LP触达率 | mean |
| 注册数 | D2.转介绍注册数 | sum |
| 付费数 | D2.转介绍付费数 | sum |
| 业绩 | D2.总带新付费金额USD | sum |

**过滤**: 围场段 Tab（全部/0-30/31-60/61-90/91-180/181+）

### 4. SS/LP 矩阵 (`/ss-lp-matrix`)

**数据源**: D2-SS + D2-LP
**API**: `GET /api/enclosure-ss` + `GET /api/enclosure-lp`
**业务场景**: 对标 CC 围场分析，为 SS/LP 提供同等维度的围场绩效视图

**Tab**: SS 视图 / LP 视图
**排名**: 按 registrations 降序
**指标**: 与围场分析一致（学员数/参与率/打卡率/触达率/注册/付费/业绩）

### 5. 次卡到期预警 (`/expiry-alert`)

**数据源**: D4(学员)
**API**: `GET /api/students/expiry-alert?days=30` + `GET /api/students/expiry-alert/summary`
**业务场景**: 即将到期学员分层预警，防止流失

**分层**:

| 层级 | 条件 | 颜色 |
|------|------|------|
| urgent | 次卡距到期 ≤ 7 天 | 红 |
| warning | 8-14 天 | 黄 |
| watch | 15-30 天 | 绿 |

**学员卡片字段**: stdt_id / 围场 / CC名 / 到期天数 / 当前次卡数 / 当月推荐注册 / 当月推荐付费

### 6. 接通质量分析 (`/outreach-quality`)

**数据源**: D2(byCC) + D3(明细)
**API**: `GET /api/analysis/outreach-quality`
**业务场景**: CC/SS/LP 三岗接通数据对比，识别触达效率差异

**核心维度**: 按围场展示 CC/SS/LP 接通数 + 接通率

### 7. 激励追踪 (`/incentive-tracking`)

**数据源**: D4(学员)
**API**: `GET /api/analysis/incentive-effect`
**业务场景**: 推荐奖励领取状态分组对比——领奖组 vs 未领奖组的推荐产出差异

**返回结构**: `groups[]` 按 `reward_status` 分组
**每组指标**: student_count / avg_referral_registrations / avg_referral_payments / total_referral_payments
**展示**: 条形图 + 明细表，按学员数降序

### 8. 续费风险 (`/renewal-risk`)

**数据源**: D4(学员)
**API**: `GET /api/analysis/renewal-risk`
**业务场景**: 按末次续费距今天数分层，识别流失风险学员

**分层**: 0-30天 / 31-60天 / 61-90天 / 90天+（天数越大风险越高）
**高风险列表**: 90天+ 未续费学员 TOP50
**字段**: stdt_id / 围场 / CC名 / 距上次续费天数 / 月推荐注册 / 月推荐付费

### 9. 学习热图 (`/learning-heatmap`)

**数据源**: D4(学员)
**API**: `GET /api/analysis/learning-heatmap`
**业务场景**: 各围场段的周次转码活跃度——哪个围场哪一周学习最活跃

**热图**: X=周(1-4), Y=围场(生命周期), 颜色深浅=平均转码次数
**来源列**: D4.第1周转码 / 第2周转码 / 第3周转码 / 第4周转码

### 10. 地理分布 (`/geo-distribution`)

**数据源**: D4(学员)
**API**: `GET /api/analysis/geo-distribution`
**业务场景**: 学员常登录国家分布——识别主要市场和潜力市场

**指标**: 国家 / 学员数 / 占比 / 平均推荐注册 / 平均推荐付费
**排序**: 学员数降序

### 11. CC 矩阵 (`/cc-matrix`)

**数据源**: D2(byCC)
**API**: `GET /api/enclosure` (individual mode) + 排名 API
**业务场景**: CC 个人围场绩效矩阵 + 排名

**排名算法**: 详见 `docs/cc-ranking-spec.md`
- composite_score = process×0.25 + result×0.60 + efficiency×0.15
- 3类18维度

### 12. 高潜学员 (`/high-potential`)

**数据源**: D5(高潜)
**API**: `GET /api/high-potential`
**业务场景**: 高潜学员列表——有带新能力但尚未充分转化的学员

**字段**: stdt_id / 围场 / 总带新人数 / 出席数 / 付费数 / CC名 / SS名 / LP名

### 13. 高潜作战室 (`/high-potential/warroom`)

**数据源**: D5 + D4(交叉)
**API**: `GET /api/high-potential/warroom`
**业务场景**: 高潜学员的紧急度排序 + 跟进策略建议

### 14. 学员明细 (`/members`)

**数据源**: D4(学员)
**API**: `GET /api/members`
**业务场景**: 学员级明细列表，支持搜索/筛选/排序

### 15. 团队汇总 (`/team`)

**数据源**: D2(byCC)
**API**: `GET /api/team/ranking`
**业务场景**: CC 团队/组级别绩效汇总

### 16. 打卡管理 (`/checkin`)

**数据源**: D2(byCC) + D4(学员)
**API**: `GET /api/checkin`
**业务场景**: 打卡率追踪——按围场/CC 维度的打卡完成情况

### 17. 触达监控 (`/daily-monitor`)

**数据源**: D1 + D2
**API**: `GET /api/daily-monitor`
**业务场景**: 日级 KPI 监控——当日 vs 目标进度

### 18. 渠道分析 (`/channel`)

**数据源**: D4(学员) + attribution_engine
**API**: `GET /api/channel/attribution`
**业务场景**: 6 维渠道归因（CC窄/SS窄/LP窄 + CC宽/LP宽/运营宽）

**归因规则**:
- 窄口: 按员工绑定关系直接归因
- 宽口: 按围场→角色配置拆分（读 `enclosure_role_override.json`）
- D2 revenue 按参与数占比分摊

### 19. 达成归因 (`/attribution`)

**数据源**: D4 + D2 + config
**API**: `GET /api/attribution`
**业务场景**: 各渠道对总业绩的贡献归因

### 20. 学员360档案 (`/students/360`)

**数据源**: D4(学员) + D3(明细) + D5(高潜)
**API**: `GET /api/student-360/{id}`
**业务场景**: 单个学员的全维度画像

**已展示字段**: 基本信息 / 打卡 / 转码 / 课耗 / 推荐记录 / 推荐奖励状态 / 近3月课耗 / 次卡到期 / 续费距今 / 总续费订单
**推荐网络**: 通过 推荐人学员ID 递归构建推荐链

### 21. 指标矩阵 (`/indicator-matrix`)

**数据源**: config.json indicator_registry (33项)
**API**: `GET /api/indicator-matrix/registry` + `/matrix` + `PUT /matrix/{role}`
**业务场景**: CC/SS/LP 各岗位的 KPI 指标选择管理

**8类指标**: result / achievement / process / efficiency / process_wide / conversion / service_pre_paid / service_post_paid

### 22. 围场健康扫描 (`/enclosure-health`)

**数据源**: D2(byCC)
**API**: `GET /api/enclosure-health`
**业务场景**: 围场段健康度评分——自动识别需要关注的围场

### 23-25. 报告 (`/reports`, `/reports/ops`, `/reports/exec`)

**数据源**: 全部
**业务场景**: 运营版（战术执行）+ 管理层版（战略决策）自动生成

### 26. 汇报沉浸模式 (`/present`)

**数据源**: 全部
**业务场景**: 全屏演示模式，适合会议汇报

### 27. 系统设置 (`/settings`)

**业务场景**: 围场-岗位映射 / 汇率设置 / 指标矩阵 / 目标值配置

**配置 SSoT**: `config/enclosure_role_override.json` / `config/exchange_rate.json` / `config/targets_override.json` / `config/indicator_matrix_override.json`

### 28. Dashboard (`/dashboard`)

**状态**: 空页面（tech debt #7），待补充

---

## 待开发页面（2 个新建）

### N1. CC 跟进质量 (`/cc-followup-quality`) — P0

**数据源**: D4(学员)
**API**: `GET /api/analysis/cc-followup-quality`（待建）
**业务场景**: 当前只有触达"量"（触达率），无触达"质"——CC 可以刷高触达率但每通 10 秒无法检测

**核心指标**:

| 指标 | 公式 | 来源列 | 阈值 |
|------|------|--------|------|
| 接通质量等级 | CC末次接通时长分级 | D4.CC末次接通时长 | ≥120s=高质 / 30-119s=低质 / <30s=可疑 |
| 失联天数 | 今日 - CC末次接通日期 | D4.CC末次接通日期(day) | ≤7天=正常 / 8-14=关注 / 15+=失联 |
| 备注及时性 | 备注日期 - 接通日期 | D4.CC末次备注日期 - CC末次接通日期 | ≤24h=及时 / >72h=懈怠 |
| 拨打效率 | 有效接通/总拨打 | D4.CC末次接通时长 + 总CC拨打次数 | — |
| 质量-数量四象限 | 触达率(D2) × 接通时长(D4) | D2×D4 Join | 高量高质/高量低质/低量高质/低量低质 |

**消费 D4 列（5列，当前 0% 消费）**: CC末次接通时长 / CC末次接通日期 / CC末次备注日期 / CC末次备注内容 / 总CC拨打次数

### N2. 推荐者价值贡献 (`/referral-contributor`) — P0

**数据源**: D4(学员)
**API**: `GET /api/analysis/referral-contributor`（待建）
**业务场景**: 识别跨渠道超级推荐者——谁值得额外投入激励资源

**核心指标**:

| 指标 | 公式 | 来源列 |
|------|------|--------|
| 总带新付费数 | CC带新付费+SS带新付费+LP带新付费+宽口带新付费 | D4 四渠道付费列 |
| 带新转化率 | 带新付费数/带新人数 | D4 各渠道 |
| 渠道偏好 | 各渠道占比 | D4 四渠道分拆 |
| 参与深度 | 历史转码次数 | D4.历史转码次数 |

**排行**: 按总带新付费数降序，TOP 学员多渠道雷达图
**消费 D4 列（8列，当前 0% 消费）**: CC/SS/LP/宽口 × 带新人数 + 带新付费数

---

## 待增强页面（11 个）

### E1. `/expiry-alert` 增强 — 失联天数交叉 (P0)
**新增**: "最后接通距今天数"列（D4.CC末次接通日期 vs 今日），到期近+长期未接通=真正高风险

### E2. `/overview` 增强 — D2b 全站基准注入 (P0)
**新增**: D2b 全站财务参与率/带新系数/带货比 作为大盘基准线（待财务口径确认后启用）

### E3. `/students/360` 增强 — 多渠道带新分解 (P0)
**新增**: CC/SS/LP/宽口 各渠道带新人数+付费数+转化率，完整个人推荐画像

### E4. `/cc-matrix` 增强 — 维度扩展 (P1)
**新增**: 带新系数维度 + CC/SS 带新参与数维度（热力矩阵从 5→7 维）

### E5. `/enclosure` 增强 — 双口径 (P1)
**新增**: 财务口径参与率 vs 运营口径参与率双列（待口径差异生效后启用）

### E6. `/members` 增强 — 筛选维度 (P1)
**新增**: 失联天数筛选 / 次卡健康度(有效期天数/次卡数) / 历史带新总数筛选

### E7. `/channel` 增强 — 学员粒度 (P1)
**新增**: 每渠道活跃推荐者 TOP10 + 人均带新对比

### E8. `/renewal-risk` 增强 — LTV 维度 (P1)
**新增**: 总次卡数 + 总1v1续费订单数（高续费=高价值，降低流失容忍度）

### E9. `/incentive-effect` 增强 — 参与深度 (P1)
**新增**: 各组历史转码次数对比，验证激励是否触达高活跃群体

### E10. `/high-potential` 增强 — urgency 升级 (P1)
**新增**: 失联天数作为第3维 urgency + 出席数≥2=深度参与优先跟进

### E11. `/learning-heatmap` 增强 — 趋势维度 (P2)
**新增**: 历史转码/本月转码比 = 参与衰减趋势

---

## 数据源 × 页面映射矩阵

| 数据源 | 消费页面 |
|--------|---------|
| D1 结果数据 | / (overview) / funnel / daily-monitor / reports |
| D2 byCC | enclosure / cc-matrix / team / checkin / outreach-quality / daily-monitor / enclosure-health |
| D2b 汇总 | / (overview) — 待增强 |
| D2-SS | ss-lp-matrix |
| D2-LP | ss-lp-matrix |
| D3 明细 | funnel(邀约) / members / outreach-quality / students/360 |
| D4 学员 | members / students/360 / expiry-alert / incentive-tracking / renewal-risk / learning-heatmap / geo-distribution / channel / attribution / cc-followup-quality(待建) / referral-contributor(待建) |
| D5 高潜 | high-potential / high-potential/warroom |

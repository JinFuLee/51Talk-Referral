"""CC 个人业绩全维度模型 — 对应 Referral Performance 报表

设计原则:
- 所有金额字段均为 USD，THB = USD x exchange_rate（API 层返回汇率，前端换算显示）
- I 组（预约 Apps）已删除：8 个数据源无法计算 CC 个人级预约数
- 字段分组对齐原始表格 A-M 组（跳过 I）
- PerformanceMetric 复用 target/actual/gap/achievement 四元组模式
"""

from __future__ import annotations

from pydantic import BaseModel

# ── 复用子模型 ──────────────────────────────────────────


class PerformanceMetric(BaseModel):
    """通用绩效指标：目标 -> 实际 -> 差额 -> 达成率 + BM 节奏"""

    target: float | None = None
    actual: float | None = None
    gap: float | None = None  # actual - target（绝对差，负=落后）
    achievement_pct: float | None = None  # actual / target（0~1+，>1=超额）

    # BM 节奏（target × time_progress）
    bm_expected: float | None = None  # 期望值
    bm_gap: float | None = None  # actual - bm_expected（正=领先）
    bm_pct: float | None = None  # actual / bm_expected


class ConversionRate(BaseModel):
    """转化率指标：实际率 -> 目标率 -> 达成"""

    actual: float | None = None  # 实际转化率 (0~1)
    target: float | None = None  # 目标转化率 (from config)
    achievement_pct: float | None = None  # actual / target


class OutreachMetric(BaseModel):
    """触达指标：数量 + 覆盖率"""

    count: int | None = None
    proportion: float | None = None  # count / base (0~1)


# ── CC 个人记录 ──────────────────────────────────────────


class CCPerformanceRecord(BaseModel):
    """单个 CC 的全维度业绩记录

    对应表格一行（个人行或汇总行）。
    """

    # ── A 组：基础信息 ──
    team: str  # TH-CC01Team
    cc_name: str  # thcc-Zen（CRM 账号，= 系统 last_cc_name）

    # ── B 组：转介绍业绩 (USD) ── D2 只有转介绍口径
    revenue: PerformanceMetric  # 转介绍业绩（target=上传目标, actual=D2）

    # ── D 组：业绩差额 ──
    pace_gap_pct: float | None = None  # actual/target - time_progress

    # ── F 组：付费单量 ──
    paid: PerformanceMetric  # Paid Target / Paid / Gap / Achievement

    # ── G 组：客单价 (USD) ──
    asp: PerformanceMetric  # Unit Price Target / Actual / Gap / Achievement

    # ── H 组：出席 (User B Show-up) ──
    showup: PerformanceMetric  # Show Target / Show-up / Gap / Achievement

    # ── I 组：已删除（预约 Apps — 8 个数据源无 CC 个人级预约数据）──

    # ── J 组：注册 (Leads) ──
    leads: PerformanceMetric  # Lead Target / Leads UserB / Gap / Achievement
    leads_user_a: int | None = None  # Leads User A（转介绍老学员数）

    # ── 转化率链（跳过 apps 相关率）──
    showup_to_paid: ConversionRate  # 出席->付费率
    leads_to_paid: ConversionRate  # 注册->付费率（端到端）

    # ── K 组：拨打覆盖（从 D4 计算）──
    calls_total: int | None = None  # 总拨打次数 (D4 sum)
    called_this_month: int | None = None  # 本月已拨打学员数
    call_target: int | None = None  # 月度拨打目标 (config × workdays)
    call_proportion: float | None = None  # 拨打覆盖率 = called / students
    call_achievement_pct: float | None = None  # 达成率

    # ── L 组：接通覆盖 ──
    connected: OutreachMetric  # 本月接通数 + 覆盖率

    # ── M 组：有效接通 ──
    effective: OutreachMetric  # 有效接通(>=120s) + 覆盖率

    # ── 过程指标（D2 mean 聚合）──
    participation_rate: float | None = None  # 转介绍参与率
    checkin_rate: float | None = None  # 当月有效打卡率
    cc_reach_rate: float | None = None  # CC触达率
    coefficient: float | None = None  # 带新系数
    students_count: int | None = None  # 管辖学员数

    # ── 目标分配上下文 ──
    target_source: str = "allocated"  # "allocated"=按学员数加权分配
    team_revenue_target: float | None = None  # 团队总金额目标(供对比)
    team_paid_target: int | None = None  # 团队总付费目标

    # ── 节奏上下文（对齐 CLAUDE.md 双差额体系 + 指标显示规范 8 项）──
    remaining_daily_avg: float | None = None  # 达标需日均(付费金额 USD)
    pace_daily_needed: float | None = None  # 追进度需日均(付费金额 USD)
    current_daily_avg: float | None = None  # 当前日均(付费金额 USD)
    efficiency_lift_pct: float | None = None  # 效率提升需求 = 达标日均/当前日均 - 1


# ── 团队汇总 ──────────────────────────────────────────


class CCPerformanceTeamSummary(BaseModel):
    """单个团队的汇总 + 下属 CC 明细"""

    team: str  # TH-CC01Team
    headcount: int  # 团队人数

    # 团队聚合指标（与个人记录相同结构）
    revenue: PerformanceMetric  # 转介绍业绩
    paid: PerformanceMetric
    asp: PerformanceMetric  # 团队平均客单价
    showup: PerformanceMetric
    leads: PerformanceMetric

    # 团队转化率
    showup_to_paid: ConversionRate
    leads_to_paid: ConversionRate

    # 团队拨打覆盖
    calls_total: int | None = None
    called_this_month: int | None = None
    call_target: int | None = None
    call_proportion: float | None = None
    call_achievement_pct: float | None = None

    # 团队触达
    connected: OutreachMetric
    effective: OutreachMetric

    # 团队过程指标
    participation_rate: float | None = None
    checkin_rate: float | None = None
    cc_reach_rate: float | None = None
    coefficient: float | None = None
    students_count: int | None = None

    # 下属 CC 明细
    records: list[CCPerformanceRecord] = []


# ── API 响应 ──────────────────────────────────────────


class CCPerformanceResponse(BaseModel):
    """CC 个人业绩 API 响应

    前端用 exchange_rate 将所有 USD 字段换算为 THB 显示。
    """

    month: str  # YYYYMM
    time_progress_pct: float  # 当前月度时间进度 (0~1)
    elapsed_workdays: int  # 已过工作日
    remaining_workdays: int  # 剩余工作日
    exchange_rate: float  # USD->THB 汇率（从 config/exchange_rate.json 读取）

    has_targets: bool = False  # 是否已上传 CC 个人目标
    target_month: str | None = None  # 目标文件对应月份
    target_count: int = 0  # 已上传目标的 CC 人数
    teams: list[CCPerformanceTeamSummary] = []
    grand_total: CCPerformanceRecord | None = None  # 全局汇总行

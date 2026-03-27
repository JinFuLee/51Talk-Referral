# M33 补全：三档目标体系执行方案

> 状态：待执行 | 创建：2026-03-27

## 1. 问题定义

**Before**: 目标系统用 WMA 生成三档倍数（×1.0/×1.15/×1.50），与业务实际脱节。运营不知道"稳达标需要什么数字"、"公司总目标下转介绍该完成多少"。

**After**: 三档目标对应三种业务场景，每档全链路自动拆解到注册→预约→出席→付费→金额×4口径。用户只需填最少输入，系统推算全部。

## 2. 三档定义

### 一档：稳达标（Pace）

**含义**：当前效率照跑到月底 = 肯定达标
**输入**：无（全自动）
**算法**：
```python
bm_pct = current_workday_progress  # 如 81.5%
projected_reg = current_reg / bm_pct
projected_appt = projected_reg × current_appt_rate
projected_attend = projected_appt × current_attend_rate
projected_pay = projected_attend × current_paid_rate
projected_rev = projected_pay × current_asp
```
**口径拆分**：按当前口径实际占比分配

### 二档：占比达标（Share）

**含义**：转介绍占公司总业绩 N%，反推全链路
**输入**：
- `company_revenue_target`（公司总业绩目标，用户填）
- `referral_share_pct`（转介绍占比，默认 30%，可调）
**算法**：
```python
referral_rev_target = company_revenue_target × referral_share_pct
# 各口径用 WMA 历史转化率反推
channel_rev = referral_rev_target × channel_historical_share
channel_pay = channel_rev / channel_wma_asp
channel_attend = channel_pay / channel_wma_paid_rate
channel_appt = channel_attend / channel_wma_attend_rate
channel_reg = channel_appt / channel_wma_appt_rate
```

### 三档：自定义（Custom）

**含义**：用户填几个关键字段，系统推算其余
**输入**（任意组合，至少填 1 个）：
- `revenue_target`（转介绍业绩目标）
- `reg_to_pay_rate`（注册付费率）
- `asp`（客单价）
- `referral_share_pct`（转介绍占比）+ `company_revenue`（推算 revenue_target）
- `registrations`（注册目标）
- 其他任意字段
**算法**：
```python
# 1. 确定 revenue_target
if user.revenue_target:
    rev = user.revenue_target
elif user.company_revenue and user.referral_share_pct:
    rev = user.company_revenue × user.referral_share_pct
else:
    rev = wma_revenue  # fallback

# 2. 确定 ASP
asp = user.asp or wma_asp

# 3. 确定转化率
conv = user.reg_to_pay_rate or wma_reg_to_pay_rate

# 4. 反推全链路
payments = rev / asp
registrations = user.registrations or (payments / conv)
appt_rate = user.appt_rate or wma_appt_rate
attend_rate = user.attend_rate or wma_attend_rate
paid_rate = user.paid_rate or wma_paid_rate
appointments = registrations × appt_rate
attendance = appointments × attend_rate

# 5. 口径拆分：用历史占比（或用户可逐口径覆盖）
```

**冲突处理**：用户填的值优先，推算值次之。如果 revenue ≠ payments × asp，以 revenue 为准重算 payments。

## 3. Settings UI 设计

```
┌─────────────────────────────────────────────────┐
│  目标设定                                        │
│                                                  │
│  公司总业绩目标: [__$600,000__]                    │
│  转介绍占比:     [__30__%]                        │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 一档      │  │ 二档      │  │ 三档      │       │
│  │ 稳达标    │  │ 占比达标  │  │ 自定义    │       │
│  │          │  │          │  │          │       │
│  │ 注册 1219│  │ 注册 756 │  │ 注册 [  ]│       │
│  │ 付费 235 │  │ 付费 189 │  │ 付费 [  ]│       │
│  │ 业绩     │  │ 业绩     │  │ 业绩 [  ]│       │
│  │ $223,962 │  │ $180,000 │  │ $[     ]│       │
│  │          │  │          │  │ 转化率[24]%     │
│  │ [✓ 默认] │  │ [应用]   │  │ 客单价[$950]   │
│  │ [应用]   │  │          │  │ [推算] [应用]  │
│  └──────────┘  └──────────┘  └──────────┘       │
│                                                  │
│  ── 全链路拆解预览 ───────────────────────        │
│  渠道   注册  预约  出席  付费  业绩   占比       │
│  CC窄   322   243   202   86   $91K  50.6%      │
│  SS窄   35    29    28    9    $9K   5.0%       │
│  LP窄   91    58    44    14   $14K  7.8%       │
│  宽口   308   176   83    39   $36K  20.0%      │
│  其它   —     —     —     41   $30K  16.7%      │
│  合计   756   506   357   189  $180K 100%       │
└─────────────────────────────────────────────────┘
```

## 4. 后端变更

### 文件 1: `backend/core/target_recommender.py` 重构

```python
class TargetTierEngine:
    """三档目标生成器"""

    def tier_pace(self, current_actuals, bm_pct) -> dict:
        """一档：当前效率外推"""

    def tier_share(self, company_rev, share_pct, wma_data) -> dict:
        """二档：占比达标"""

    def tier_custom(self, user_inputs, wma_data) -> dict:
        """三档：自定义+推算"""

    def _decompose_to_channels(self, total_targets, wma_channel_data) -> dict:
        """全链路口径拆分（三档共用）"""
```

### 文件 2: `backend/api/config.py` 更新

```
GET  /api/config/targets/tiers
     → 返回三档预览（一档自动算，二档需 company_rev 参数，三档需 user_inputs）
     参数：company_revenue=600000, referral_share=0.30

POST /api/config/targets/apply
     Body: {"tier": "pace|share|custom", "company_revenue": N, "referral_share": 0.3, "custom_inputs": {...}}
     → 写入 targets_override.json
```

### 文件 3: `frontend/components/settings/TargetRecommender.tsx` 重构

- 顶部：公司总业绩 + 转介绍占比输入框
- 中部：三档卡片（一档只读/二档只读/三档可编辑）
- 底部：全链路拆解预览表（选中档位的完整数据）
- 按钮：一键应用选中档位

## 5. 与现有系统的关系

| 现有组件 | 变更 |
|---------|------|
| `target_recommender.py` | 重写：WMA 三倍数 → 三档场景 |
| `report_engine._normalize_targets()` | 调用 TargetTierEngine.tier_pace() 作为 fallback |
| `TargetRecommender.tsx` | 重写：3 倍数卡片 → 3 场景 + 输入框 + 预览表 |
| `targets_override.json` | 格式不变，写入的值从新引擎产生 |
| `MonthlyOverviewSlide.tsx` | 不变（已修好 BM 颜色 + 预约出席目标） |

## 6. 验收标准

| # | 验收项 | 验证方式 |
|---|-------|---------|
| 1 | 一档数据 = Block 4 全月推算值 | curl compare |
| 2 | 二档：$600K × 30% = $180K 转介绍目标 | curl 验证 |
| 3 | 三档：填转化率 24% + 客单价 $950 → 系统推算注册/预约/出席 | curl 验证 |
| 4 | 一键应用后 targets_override.json 有完整值 | cat 文件 |
| 5 | 应用后 /api/report/daily 所有目标非零 | curl 验证 |
| 6 | Settings 页面三档卡片 + 全链路预览表正确渲染 | 浏览器 |
| 7 | 默认一档（稳达标） | 页面检查 |

## 7. Team 结构

| MK | 任务 | 模型 |
|----|------|------|
| mk-backend-tiers | TargetTierEngine + API | Sonnet high |
| mk-frontend-tiers | TargetRecommender 重构 | Sonnet high |

两个 MK 并行（后端产出 API 契约后前端消费）。

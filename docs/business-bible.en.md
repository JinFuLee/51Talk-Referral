# 51Talk Thailand Referral Business Knowledge Encyclopedia

> This document is the Single Source of Truth for all business knowledge in this project, consolidated from 26 separate files.
> Last updated: 2026-03-26 | Version: v1.0

---

## Table of Contents

- [Chapter 1: Organizational Structure & Role Definitions](#ch1-org)
- [Chapter 2: Referral Business Model](#ch2-referral)
- [Chapter 3: KPI Metric Dictionary](#ch3-kpi)
- [Chapter 4: Ranking Algorithm](#ch4-ranking)
- [Chapter 5: Target System & Gap Calculation](#ch5-targets)
- [Chapter 6: Time Rules & Comparison Framework](#ch6-time)
- [Chapter 7: Data Source Architecture](#ch7-datasource)
- [Chapter 8: ROI Cost Model & Reward Rules](#ch8-roi)
- [Chapter 9: Notification Push Rules](#ch9-notification)
- [Chapter 10: Analysis Methodology](#ch10-methodology)

---

## Chapter 1: Organizational Structure & Role Definitions {#ch1-org}

> Sources: `docs/glossary.md` + `docs/bi-indicator-dictionary.md §2`

### 1.1 Organizational Hierarchy

| Level | Description | Example |
|-------|-------------|---------|
| Country | Top level | Thailand |
| Department | Three departments: CC / SS / LP | CC Front-end, SS Back-end, LP Service |
| Region | Cross-team area | Thailand Region |
| DGM | Regional General Manager | — |
| SD | Sales Director | — |
| SM | Sales Manager | — |
| Team | Sub-team | TH-CC01Team, TH-SS01Team |
| Individual | CC / SS / LP personal accounts | THCC-patimakorn, THSS-thitima |

**Regional Data Filtering**: DataManager uniformly filters out teams without the `TH-` prefix upon data loading. This applies automatically to all API endpoints — manual filtering within individual APIs is prohibited.

### 1.2 Three Role Definitions

| Code | Full Name | Responsibilities | Data Alias |
|------|-----------|-----------------|------------|
| **CC** | CC Front-end Sales | Front-end sales: customer acquisition, follow-up, and driving payments. Primary KPIs are new-order revenue and order volume. | CC (no alias) |
| **SS** | SS Back-end Sales | Back-end sales: prompting existing students to refer others. SS Narrow Channel = actively requesting referral codes from users (simple SOP). | **EA** (common in data, auto-mapped to SS) |
| **LP** | LP Service | Back-end service, similar to a learning advisor/teacher. LP also runs the "Same Language" wide-channel activity. | **CM** (common in data, auto-mapped to LP) |

> **Rule**: All dashboards and reports must use **CC / SS / LP**. EA is automatically mapped to SS; CM is automatically mapped to LP. Teams represented by "-" in the data are mapped to THCC.

### 1.3 Individual Status Fields (from BI Indicator Dictionary §2)

| Field | Definition |
|-------|------------|
| Generation | Classified by CC's current rank level (career growth ladder) |
| Position | CC's current-month position |
| Rank | CC's current-month rank level |
| Is Dormant | Whether the CC is in a dormant state this month |
| Is Calculated | Whether the CC participates in performance calculations this month |
| Verified Tenure | CC's verified years of service this month |
| Employment Status | CC's current-month active/resigned status |
| Pass Line | MTD CC net revenue completion rate vs. the BM indicator range at that point in time |
| Benchmark (BM) | Monthly baseline (criterion for performance qualification) |
| CC Individual | CC members where Is Calculated = Yes |

### 1.4 UserA / UserB Role Definitions

| Role | Description |
|------|-------------|
| **UserA / Student A** | Existing student (referrer) — the party who sends the referral link |
| **UserB / Student B** | Newly referred student (referee) — the party who registers via the link |

---

## Chapter 2: Referral Business Model {#ch2-referral}

> Sources: `docs/glossary.md` + `docs/bi-indicator-dictionary.md §1` + `projects/referral/config.json` (`enclosure_role_assignment` / `enclosure_role_narrow` / `enclosure_role_wide` / `channel_metric_scope`)

### 2.1 Referral Definition

A registration is classified as a "referral" if it meets **either** of the following conditions:
1. Primary channel = "Referral"
2. Primary channel ≠ Referral channel, but a referrer ID exists and referrer ID ≠ 0

### 2.2 Channel Classification & SQL Mapping

```sql
CASE
  WHEN chnl4_name IN ('cc_recommend', 'dapan_chai_zhanghao')
    THEN 'CC Narrow Channel'
  WHEN chnl4_name IN ('is_recommend')
    THEN 'SS Narrow Channel'
  WHEN chnl4_name IN ('lp_recommend', 'lp_recommend.', 'dapan_ss_crm_haibao')
    THEN 'LP Narrow Channel'
  ELSE 'Wide Channel'
END
```

> **Note**: `lp_recommend.` (with trailing period) is suspected dirty data from the source system. Confirmed by BI team — mapped to LP Narrow Channel as-is.

| Channel | Description | Quality | Paid Conversion Rate (Reference) |
|---------|-------------|---------|----------------------------------|
| CC Narrow Channel | CC staff link binding (active referral) | High | ~32% |
| SS Narrow Channel | SS (EA) staff link binding (SOP: request referral code from user) | Medium | ~28% |
| LP Narrow Channel | LP (CM) staff link binding (also runs "Same Language" wide-channel activity) | Medium | — |
| Wide Channel | Existing students (UserA) self-share links, no department distinction | Low | — |

### 2.3 Enclosure Period Segment Definitions

Enclosure Period = the day-count segment calculated from the user's **payment date** (payment date = Day 0).

#### Day-Based Enclosure Periods (Precise — used for daily operations analysis)

| Enclosure Code | Day Range | Corresponding Month | Typical Participation Rate | Typical Check-in Rate |
|---------------|-----------|---------------------|--------------------------|----------------------|
| d0_30 | 0–30 days after payment | M0 (payment month) | **22.4%** | **96.5%** |
| d31_60 | 31–60 days after payment | M1 | 10.5% | 44.0% |
| d61_90 | 61–90 days after payment | M2 | 6.9% | 35.0% |
| d91_120 | 91–120 days after payment | M3 | 3.8% (M3–M5 avg) | 26.4% (M3–M5 avg) |
| d121_180 | 121–180 days after payment | M4–M5 | 3.8% | 26.4% |
| d181_plus | 181+ days after payment | M6+ | **2.4%** | **19.2%** |

**Key Insight**: M0 is the golden period for referrals. Participation rate decays rapidly over time (M0 = 22.4% → M6+ = 2.4%). M0 Referral Coefficient is 1.35; M1 peaks at 1.47.

### 2.4 Enclosure Period × Role Responsibility Matrix

#### Narrow Channel (Staff actively contacts students)

| Enclosure Period (Days) | Enclosure Period (Month) | Responsible Role | Metric Scope |
|------------------------|--------------------------|-----------------|--------------|
| 0–90 days | M0–M2 | **CC** | full_funnel (registrations / appointments / attendance / payments / revenue + all conversion rates) |
| 91–120 days | M3 | **SS** | leads + process metrics (Outreach Rate / Check-in Rate) + cross-role leads→CC conversion rate |
| 121+ days | M4+ | **LP** | leads + process metrics (Outreach Rate / Check-in Rate) + cross-role leads→CC conversion rate |

#### Wide Channel (Students self-share)

| Enclosure Period (Days) | Enclosure Period (Month) | Responsible Role |
|------------------------|--------------------------|-----------------|
| 0–90 days | M0–M2 | **CC** |
| 91–120 days | M3 | **SS** |
| 121–180 days | M4–M5 | **LP** |
| 181+ days | M6+ | **Operations** |

> **Authoritative Configuration Source**: `projects/referral/config.json` → `enclosure_role_narrow` (Narrow Channel) / `enclosure_role_wide` (Wide Channel). Written via the Settings page; front-end reads via `useWideConfig()` from API `/api/config/enclosure-role`. Hardcoding is prohibited.

### 2.5 Channel × Metric Attribution Rules

| Channel | Role | Available Metric Scope |
|---------|------|----------------------|
| CC (full_funnel) | CC | Registrations → Appointments → Attendance → Payments → Revenue, all conversion rates (full funnel) |
| SS/LP (leads_and_process) | SS, LP | Referral leads count + process metrics (Outreach Rate / Check-in Rate) + leads→CC conversion rate (cross-role efficiency, not a self-KPI) |
| Wide Channel (leads_only) | Wide Channel | Referral leads count only |

**Special Note**: The "conversion rate" for SS/LP = the rate at which leads brought by SS/LP are converted to paid by CC (cross-role efficiency reference). It is NOT SS/LP's own sales funnel conversion rate.

### 2.6 Active Student Definition

Active students (the base pool eligible for referral activities) must simultaneously meet all of the following:
1. **First major payment made**: Completed a first large payment
2. **Class credits > 0**: Has remaining class credit balance
3. **Package within validity period**: Not expired
4. **Account status = Active (on)**: Account in normal use

### 2.7 Student Composition Categories

| Category Code | Full Name | Description |
|--------------|-----------|-------------|
| aa | American Small Group | Students enrolled in American-style English small-group classes |
| k12 | Youth | Young learner students |
| non-k12 | Adult | Adult students |

Thailand uses the same classification standards as global.

### 2.8 SS/LP Referral Participation Notes

- **SS Narrow Channel**: SS actively requests referral codes from users (simple SOP — directly ask the user to provide their referral code)
- **LP Wide Channel**: "Same Language" activity — users complete read-aloud exercises in the APP, then share to community groups for check-in. Data is temporarily stored in a separate BI system, pending API integration.

### 2.9 Referral Formula

```
Referral Output = Active Users × Participation Rate × Acquisition Rate × Conversion Rate
```

**Evolution Stages**: Basic Launch (incentive-driven) → Scientific Operations (formula-based) → Systems Thinking (two major stock management)

---

## Chapter 3: KPI Metric Dictionary {#ch3-kpi}

> Sources: `docs/bi-indicator-dictionary.md` + `docs/glossary.md` + `docs/research/key-metrics-quick-reference.md`

### 3.1 Student-Level Metrics

**Valid call standard is uniformly ≥20s** (Outreach Rate / call duration / call count all use this threshold — corrected from the original 120s in prior documents)

| Metric | Formula | Unit | Notes |
|--------|---------|------|-------|
| **Outreach Rate** | Students with valid connections this month / Active students this month | % | Valid connection = call duration **≥20s** |
| **Participation Rate** | Students who brought ≥1 referral registration this month / Active students this month | % | Measures referral activity level |
| **Check-in Rate** | Students who converted and shared this month / Active students this month | % | Converted = generated/activated a referral QR code or link |
| **Referral Coefficient** | B student registrations this month / A students who brought registrations this month | × | Average number of new registrations per referrer |
| **Referral Output Ratio** | Referral registrations this month / Active students this month | % | Overall pool output efficiency |
| **New Referral Registrations** | B registrations brought by A students this month | persons | Absolute value |
| **Dial Rate** | Students with CC outbound calls this month / Active students at month end | % | Process follow-up coverage rate |

### 3.2 Funnel Metrics

```
Registration → Appointment → Attendance → Payment
```

| Metric | Formula | Unit | Notes |
|--------|---------|------|-------|
| **Registrations (Leads)** | Count of B students who registered via referral link | persons | Funnel entry point |
| **Appointments** | Count of students who booked a trial class | persons | First booking only, not repeated |
| **Attendance** | Count of students who attended a trial class | persons | First attendance only, not repeated |
| **Payments** | Count of students who completed payment | persons | Excluding small orders: contract amount ≥1,500 USD (CSCC ≥1,400) |
| **Appointment Rate** | Appointments / Registrations | % | Appt% |
| **Appointment-to-Attendance Rate** | Attendance / Appointments | % | Show up% |
| **Attendance-to-Payment Rate** | Payments / Attendance | % | Show up to pay% |
| **Registration-to-Payment Rate** | Payments / Registrations | % | End-to-end conversion rate |
| **Average Selling Price (ASP)** | Payment revenue (USD) / Paid orders | USD | Large-order threshold ≥1,500 USD |

**2026-01 Sample Data**: Total registrations 582, appointments 440, attendance 266, payments 113, revenue 111,636 USD; Appointment Rate 75.6%, Appointment-to-Attendance Rate 60.5%, Attendance-to-Payment Rate 42.5%, overall Registration-to-Payment Rate 19.4%.

### 3.3 Base Achievement

**System revenue = contract amount (excluding small orders). Incentive virtual / judgment virtual / refunds are excluded.**

| Metric | Formula / Definition | Unit |
|--------|---------------------|------|
| Target | CC's monthly base target | USD |
| Revenue (Gross) | MTD CC contract amount + split order revenue | USD |
| Paid Revenue (Large Orders) | Large-order (contract ≥1,500; CSCC ≥1,400) contract amount | USD |
| Incentive Virtual Revenue | MTD CC incentive virtual revenue total | USD |
| Judgment Virtual Revenue | MTD CC judgment virtual revenue total | USD |
| Refund Amount | MTD CC refund total | USD |
| **Net Revenue** | Revenue + Incentive Virtual + Judgment Virtual − Refunds | USD |
| Achievement Rate | Net Revenue / Target | % |
| Performance Qualified | if(Achievement Rate ≥ BM, 1, 0) | Boolean |
| Qualification Rate / Performance Pass Rate | SUM(Performance Qualified) / SUM(CC Individual) | % |
| Average ASP (>1,500) | Large-order revenue / Large-order count | USD |

### 3.4 Challenge Achievement

| Metric | Formula | Notes |
|--------|---------|-------|
| Challenge Target | CC's monthly challenge target | Higher than base target |
| Challenge Target Net Achievement Rate | Net Revenue / Challenge Target | % |

### 3.5 Order Volume Achievement

| Metric | Formula / Definition | Unit |
|--------|---------------------|------|
| Approved Order Volume | CC's approved order count this month | orders |
| Payments | MTD CC signed customer count | persons |
| Large-Order Payments | MTD CC large-order customer count | persons |
| Order Volume Achievement Rate | Large-Order Payments / Approved Order Volume | % |
| Order Volume Qualified | if(Order Volume Achievement Rate ≥ BM, 1, 0) | Boolean |
| Order Volume Pass Rate | SUM(Order Volume Qualified) / SUM(CC Individual) | % |

### 3.6 Pre/Post-Class Connectivity (48H Follow-up)

| Metric | Formula | Unit |
|--------|---------|------|
| MTD Trial Classes | MTD CC cumulative trial class attendance | sessions |
| Pre-Class Connectivity Rate | Trial classes with valid follow-up within 48H before class / MTD trial classes | % |
| Post-Class Connectivity Rate | Trial classes with valid follow-up within 48H after class / MTD trial classes | % |
| Connectivity Product | Pre-Class Rate × Post-Class Rate | — |

### 3.7 Leads-Related Metrics

| Metric | Definition |
|--------|------------|
| Leads count | MTD leads assigned to CC |
| New system allocation | MTD cumulative new (first-time) cases assigned to CC |
| Public pool pickup | MTD cumulative public pool cases claimed by CC |
| Reassignment | MTD cumulative cases reassigned to CC |

### 3.8 Conversion Metrics

| Metric | Formula |
|--------|---------|
| Attendance-to-Payment Rate | Large-order payments / Attendance |
| Appointment-to-Attendance Rate | Attendance / Leads |
| Appointment-to-Payment Rate | Large-order payments / Leads |

### 3.9 REF Referral Channel Metrics (~20 metrics)

| Metric | Formula / Definition |
|--------|---------------------|
| Referral leads count | MTD REF leads assigned to CC |
| Referral attendance | MTD REF trial class attendances by CC |
| Referral payments | MTD REF customers signed by CC |
| Referral payment revenue | MTD REF contract amount by CC |
| Referral large-order payments | MTD REF large-order customers by CC |
| Referral large-order revenue | MTD REF large-order contract amount by CC |
| Referral attendance / appointment | Referral attendance / Referral leads |
| Referral order share | Referral large-order payments / Large-order payments |
| Referral payment / referral appointment (large order) | Referral large-order payments / Referral leads |
| Referral average price | Referral large-order revenue / Referral large-order payments |
| Referral revenue share | Referral large-order revenue / Revenue |
| REF Leads share | Referral leads / Total leads |
| REF Attendance-to-Payment Rate | Referral large-order payments / Referral attendance |
| REF Average ASP (>1,500) | Referral large-order revenue / Referral large-order payments |
| REF Appointment-to-Attendance Rate | Referral attendance / Referral leads |
| REF Appointment-to-Payment Rate | Referral large-order payments / Referral leads |
| REF Conversion (large order) | Referral large-order payments / Referral leads |
| REF leads per person | Referral leads / CC Individual |

### 3.10 MKT Market Channel Metrics (~12 metrics)

| Metric | Formula |
|--------|---------|
| Non-referral appointments | Leads − Referral leads |
| Non-REF attendance / appointment | (Attendance − Referral attendance) / (Leads − Referral leads) |
| Non-REF payment / appointment | (Large-order payments − Referral large-order payments) / (Leads − Referral leads) |
| Non-REF payment revenue | Revenue − Referral payment revenue |
| Non-REF average price | (Large-order revenue − Referral large-order revenue) / (Large-order payments − Referral large-order payments) |
| MKT Leads share | (Leads − Referral leads) / Leads |
| MKT Attendance-to-Payment Rate | (Large-order payments − Referral large-order payments) / (Attendance − Referral attendance) |
| MKT Average ASP (>1,500) | (Large-order revenue − Referral large-order revenue) / (Large-order payments − Referral large-order payments) |
| MKT Appointment-to-Attendance Rate | (Attendance − Referral attendance) / (Leads − Referral leads) |
| MKT Appointment-to-Payment Rate | (Large-order payments − Referral large-order payments) / (Leads − Referral leads) |
| MKT Conversion (large order) | (Large-order payments − Referral large-order payments) / (Leads − Referral leads) |

### 3.11 Student Composition

| Metric | Definition |
|--------|------------|
| Participating referral students | MTD count of students under CC who participated in referral activities |
| Active paying students | Active students under CC (wealth value > 0) who attended ≥1 class |
| Total students under CC | All students under CC this month |
| CC paying students | Active students under CC this month (wealth value > 0) |
| aa / k12 / non-k12 | American small-group / Youth / Adult active student counts |
| Class consumption frequency distribution | Distribution of students per segment: 0 / 1–5 / 6–10 / 11–15 / 16–20 / 21–25 / 26–30 / 30+ classes |
| Referral engagement | Participating referral students / Active paying students |

### 3.12 Call Duration & Count

**Valid call standard**: Single call duration **≥20s** (consistent with Outreach Rate, unified)

| Metric | Definition |
|--------|------------|
| Call duration | MTD CC cumulative valid call duration (single call ≥20s) |
| Call count | MTD CC cumulative valid call count (single call ≥20s) |
| onduty | MTD CC days where daily call duration exceeds 30 min |
| Daily average call count | Call count / onduty |
| Daily average call duration | Call duration / onduty |

### 3.13 Channel Breakdown: Public Pool / Referral / MKT

| Metric | Definition |
|--------|------------|
| Public pool appointment count | MTD appointment count from old (previously dropped to public pool) cases under CC |
| Referral appointment count | MTD appointment count from new (not dropped to public pool) referral cases under CC |
| MKT appointment count | MTD appointment count from new (not dropped to public pool) MKT cases under CC |
| Public pool / Referral / MKT attendance count | Attendance by channel |
| Public pool / Referral / MKT payment count | Payments by channel |
| Public pool / Referral / MKT large-order payment count | Large-order payments by channel |
| Total appointments / attendance | Sum across all three channels |

### 3.14 Add-On Purchases

| Metric | Definition |
|--------|------------|
| Has add-on revenue | Whether CC has had an add-on order this month (1=Yes, 0=No) |
| CC with add-on share | SUM(Has add-on revenue) / SUM(CC Individual) |

### 3.15 Efficiency Metrics

| Metric | Formula | Notes |
|--------|---------|-------|
| **Efficiency Index** | Payment share / Registration share | >1.0 = High-ROI channel (paid conversion exceeds traffic share) |
| **Enclosure Conversion Rate** | Paid in enclosure period / Registered in enclosure period | Actual conversion efficiency per Enclosure Period |

---

## Chapter 4: Ranking Algorithm {#ch4-ranking}

> Sources: `docs/cc-ranking-spec.md` + `docs/glossary.md` (ranking algorithm terminology)

### 4.1 CC Ranking: 3 Categories, 18 Dimensions

**Composite Formula**: `composite_score = process×0.25 + result×0.60 + efficiency×0.15`, max score 1.0

#### Process Metrics (25%)

| Metric | Weight | Data Source |
|--------|--------|-------------|
| Outbound calls | 4% | outreach.by_cc |
| Connected calls | 4% | outreach.by_cc |
| Valid connections (≥120s) | 5% | outreach.by_cc |
| Pre-payment follow-up | 3% | trial_followup.pre_class |
| Pre-appointment class follow-up | 3% | trial_followup.pre_class |
| Post-appointment class follow-up | 3% | trial_followup.post_class |
| Post-payment follow-up | 3% | paid_followup |

#### Result Metrics (60%)

| Metric | Weight | Data Source |
|--------|--------|-------------|
| Registrations | 12% | leads.by_cc |
| Leads count | 8% | leads.by_cc |
| Referral user count | 8% | leads.by_cc |
| ASP (USD) | 7% | orders.by_cc |
| Paid order volume | 12% | orders.by_cc |
| Referral revenue (USD) | 9% | orders.by_cc (CC new-order referral) |
| Revenue share | 4% | Individual / team total |

#### Efficiency Metrics (15%)

| Metric | Weight | Data Source |
|--------|--------|-------------|
| Registration-to-payment conversion rate | 5% | paid/registered |
| Check-in Rate | 4% | kpi.by_cc |
| Participation Rate | 3% | kpi.by_cc |
| Referral Coefficient | 3% | kpi.by_cc |

> **Note**: `contact_rate` (valid connection rate) is collected and stored in the `detail` output field, but does not participate in any DIMS weight calculation and is therefore not included in the 18-dimension scoring system.

### 4.2 SS/LP Ranking: 4 Categories, 5 Dimensions

**Composite Formula**: `composite_score = process×0.25 + result×0.30 + quality×0.25 + contribution×0.20`, max score 1.0
**Normalization Rule**: SS and LP are normalized independently within their respective groups — they are not ranked together.

#### Process Metrics (25%)

| Metric | Weight | Data Source |
|--------|--------|-------------|
| Outreach Rate (contact_rate) | 12.5% | outreach.by_cc (F5) |
| Check-in Rate (checkin_rate) | 12.5% | kpi.north_star_24h (D1) / kpi.checkin_rate_monthly (D5) |

#### Result Metrics (30%)

| Metric | Weight | Data Source |
|--------|--------|-------------|
| Referral user count (leads) | 30% | leads.personal (A4) |

#### Quality Metrics (25%)

| Metric | Weight | Data Source |
|--------|--------|-------------|
| leads→CC conversion rate | 25% | leads.personal (A4) paid/leads |

#### Contribution Metrics (20%)

| Metric | Weight | Data Source |
|--------|--------|-------------|
| Revenue contribution share (paid_share) | 20% | Individual CC-converted payments / same-role team total CC-converted payments |

### 4.3 Key Algorithm Details

| Mechanism | Description |
|-----------|-------------|
| **Min-max normalization** | (v − min) / (max − min), range [0, 1]; when all individuals have the same value, normalized to 0.5 |
| **_redistribute** | CC: when data is missing, weights are proportionally distributed to other dimensions within the same category that have data, ensuring the category score maximum remains 1.0 |
| **_redistribute_role** | SS/LP: same as above, distributed within the same role |
| **paid_share** | SS/LP contribution metric = individual CC-converted payments / same-role team total CC-converted payments |
| **leads_to_cc_rate** | SS/LP quality metric = A4 field `conversion_rate`, or computed as paid/leads, aligned with CC conversion rate methodology |

### 4.4 CC vs. SS/LP Comparison

| Dimension | CC (3 categories, 18 dimensions) | SS/LP (4 categories, 5 dimensions) |
|-----------|----------------------------------|-------------------------------------|
| Process | 7 dimensions (outbound / connected / valid connections / 4 follow-up types) | 2 dimensions (Outreach Rate / Check-in Rate) |
| Result | 7 dimensions (registrations / leads / referral users / ASP / order volume / revenue / share) | 1 dimension (leads count) |
| Efficiency | 4 dimensions (conversion rate / check-in rate / participation rate / referral coefficient) | No independent efficiency category |
| Quality | No independent quality category | 1 dimension (leads→CC conversion rate) |
| Contribution | Revenue share included in Result category | Independent contribution category (paid_share) |
| Total weight | process×0.25 + result×0.60 + efficiency×0.15 | process×0.25 + result×0.30 + quality×0.25 + contribution×0.20 |
| Normalization scope | Across all CC | SS and LP each normalized independently |

---

## Chapter 5: Target System & Gap Calculation {#ch5-targets}

> Sources: `config/targets_override.json` + `projects/referral/config.json` (`gap_thresholds` / `monthly_targets`) + `config/checkin_thresholds.json` + `docs/research/key-metrics-quick-reference.md`

### 5.1 Monthly Target Structure

Monthly targets are set by **total + four-channel breakdown**:

| Field | Description |
|-------|-------------|
| Registration target | Monthly referral registration count target |
| Payment target | Monthly referral payment count target |
| Revenue target | Monthly referral revenue (USD) target |
| ASP | Target average selling price (USD) |
| Target conversion rate | Registration-to-payment conversion rate target (e.g. 23%) |
| Appointment rate target | Registration-to-appointment conversion target (e.g. 77%) |
| Attendance rate target | Appointment-to-attendance conversion target (e.g. 66%) |
| Sub-channel targets | Individual registration sub-targets for CC Narrow / SS Narrow / LP Narrow / Wide Channel |

**2026 Reference Data** (config.json):

| Month | Registration Target | Payment Target | Revenue Target | ASP |
|-------|--------------------|--------------|--------------|----|
| 202601 | 779 | 179 | 147,848 USD | 825 USD |
| 202602 | 869 | 200 | 169,800 USD | 850 USD |
| 202603 | 917 | 211 | 200,444 USD | 950 USD |

### 5.2 Dual-Gap System

Each numeric KPI must calculate **two gap types + two daily averages**:

| Gap Type | Formula | Meaning |
|----------|---------|---------|
| **Absolute Target Gap** | `actual - target` | Gap to monthly target (negative = behind, positive = ahead) |
| **Time Progress Gap** | `actual/target - time_progress` | Whether on pace with current time progress (negative = falling behind) |
| **Daily Average Needed to Hit Target** | `(target - actual) / remaining_workdays` | Daily volume needed to complete the monthly target |
| **Daily Average Needed to Catch Pace** | `max(0, target × time_progress - actual) / remaining_workdays` | Daily volume needed to catch up to the time progress line |

**Backend field mapping**: `absolute_gap` (Absolute Target Gap), `gap` (Time Progress Gap), `remaining_daily_avg` (Daily Average to Hit Target), `pace_daily_needed` (Daily Average to Catch Pace)

### 5.3 Status Labels

| Label | Progress Gap Threshold | Color |
|-------|----------------------|-------|
| 🟢 On Track / Ahead | gap ≥ 0% | Green |
| 🟡 Behind | −5% ≤ gap < 0% | Yellow |
| 🔴 Critically Behind | gap < −5% | Red |

**Configuration source**: `projects/referral/config.json` → `gap_thresholds` (`green: 0.0, yellow: -0.05`)

### 5.4 Health Thresholds & Alert Thresholds

| Metric | Healthy (Good) | Alert (Warning) | Source |
|--------|---------------|----------------|--------|
| Check-in Rate | ≥ 85% | < 70% | `config/checkin_thresholds.json` (`good: 0.85, warning: 0.7`) |
| Referral Participation Rate | ≥ 4.5% | < 4.0% (yellow alert) | `docs/research/key-metrics-quick-reference.md` |
| Referral Coefficient | ≥ 1.3 | — | Same as above |
| CC Narrow Channel Registration-to-Payment Rate | ≥ 30% | — | Same as above |
| Conversion Rate | ≥ 22% | < 20% (yellow alert) | Same as above |
| ROI | ≥ 20 (target) | < 15 (red alert) | Same as above |

---

## Chapter 6: Time Rules & Comparison Framework {#ch6-time}

> Sources: `projects/referral/config.json` (`work_schedule`) + `docs/methodology.md` + CLAUDE.md time rules

### 6.1 T-1 Data Rule

The system always processes **yesterday's (T-1)** data. Today's (T) data is updated in the early hours of the following day.

### 6.2 Workday Definitions

| Condition | Weight | Description |
|-----------|--------|-------------|
| Monday | 1.0 | Normal workday |
| Tuesday | 1.0 | Normal workday |
| **Wednesday** | **0.0** | **Rest day (no classes)** — excluded from workday count |
| Thursday | 1.0 | Normal workday |
| Friday | 1.0 | Normal workday |
| Saturday | **1.4×** | Normal working day, with weight premium |
| Sunday | **1.4×** | Normal working day, with weight premium |
| Thailand Public Holidays | 0.0 | Excluded; specific dates follow the annual calendar |

**Configuration source**: `projects/referral/config.json` → `work_schedule` (`rest_weekdays: [2], weekend_multiplier: 1.4`)

**Gap breakdown**: Target gaps can be further broken down to per-person / per-day / SKU level.

### 6.3 Four Comparison Dimensions

| Dimension | Method A (Fixed Window) | Method B (Rolling Window) |
|-----------|------------------------|--------------------------|
| Daily | Today vs. Yesterday | — |
| Weekly | This week Mon–T-1 vs. same segment last week | Last 7 days vs. prior 7 days |
| Monthly | Month-start–T-1 vs. same segment last month (MoM) | Last 30 days vs. prior 30 days |
| Yearly | This month vs. same month last year (YoY) | — |

**Abbreviations**: MoM = Month over Month, WoW = Week over Week, YoY = Year over Year

### 6.4 Trend Determination Rules

| Judgment | Condition |
|----------|-----------|
| Upward trend | ≥3 consecutive periods of increase |
| Downward trend | ≥3 consecutive periods of decrease |
| Fluctuating | All other cases |

### 6.5 5-Why Anomaly Diagnosis Trigger

Automatically triggered when deviation exceeds **2σ** (standard deviation):

```
anomaly_config: std_threshold = 2.0, decline_threshold = 0.3
```

Starting from an anomalous result metric, the causal chain is traced down 5 layers, with each layer decomposed MECE. Each "Why" must be supported by data, ultimately pointing to an actionable plan with a quantified expected impact (in $).

---

## Chapter 7: Data Source Architecture {#ch7-datasource}

> Sources: `docs/data-source-dependencies.md` + `docs/data-source-update-policy.md`

### 7.1 Data Source Classification Table (12 Sources, by Priority)

| # | Data Source Name | Priority | Update Frequency | SLA | Dependent Analysis Dimensions | Single-Point Dependency Risk |
|---|-----------------|----------|-----------------|-----|------------------------------|------------------------------|
| 1 | **Channel Comparison** (primary data) | **P0** | **Daily** | T-1 by 23:59 | §1–§6 Core dashboards (overall / funnel / trend / channel / team / ASP) | 🔴 High (no fallback) |
| 2 | Leads achievement | P1 | Daily | T-1 by 23:59 | §7 Team-level leads benchmarking | 🟢 Low |
| 3 | Check-in Rate | P1 | Weekly | Monday 09:00 | §8 Check-in analysis + §11 CC ranking (15%) | 🟢 Low |
| 4 | Enclosure summary | P1 | Daily | T-1 by 23:59 | §9 Enclosure analysis main body | 🟢 Low |
| 5 | Monthly efficiency | P2 | Weekly | Monday 09:00 | §9 Enclosure analysis secondary supplement | 🟢 Low |
| 6 | Pre/post-class | P1 | Daily | T-1 by 23:59 | §10 Follow-up analysis + §11 CC ranking (25%) | 🟢 Low |
| 7 | Enclosure follow-up | P1 | Daily | T-1 by 23:59 | §9/§10 Outreach Rate + §11 CC ranking (15%) | 🟢 Low |
| 8 | Leads detail | P1 | Daily | T-1 by 23:59 | §11 CC ranking (30%) + §12 Attended but unpaid | 🟡 Medium (single point for CC ranking) |
| 9 | Order detail | P2 | Weekly | Monday 09:00 | §13 Order analysis + §7 ROI distribution optimization | 🟢 Low |
| 10 | Monthly MoM | P2 | Monthly | 1st of month 09:00 | §14 Monthly trend comparison | 🟢 Low |
| 11 | Monthly YoY | P2 | Monthly | 1st of month 09:00 | §15 Annual YoY trend | 🟢 Low |
| 12 | ROI cost | P3 | Monthly | By 5th of month | §7 ROI actual cost | 🟢 Low (3-tier fallback) |

### 7.2 Minimum Viable Collection (MVC)

When resources are limited, minimum guaranteed:

| Must have daily | Recommended daily | Can reduce to weekly |
|----------------|-------------------|---------------------|
| ✅ Channel Comparison (P0) | Leads detail, Leads achievement, Enclosure summary, Pre/post-class | Enclosure follow-up, Check-in Rate |

### 7.3 ROI Data Three-Tier Fallback Strategy

When ROI cost data is unavailable, fall back in the following order:

```
① Actual cost (ROI cost file)
    ↓ unavailable
② Order detail distribution estimate (commission estimation from small/large order ratio)
    ↓ unavailable
③ 50/50 assumption (small orders : large orders each half)
```

Fallback is noted in reports with a data reliability indicator 🟡 (estimated mode).

### 7.4 Data Update SLA

| Priority | Update Frequency | SLA | Missing Data Handling |
|----------|-----------------|-----|----------------------|
| P0 | Daily | T-1 by 23:59 | Automatically fall back to T-2 + send alert |
| P1 daily sources | Daily | T-1 by 23:59 | Affected sections show "Data pending update" |
| P1 weekly sources | Weekly | Monday by 09:00 | Use last week's data, note timeliness |
| P2 | Weekly / Monthly | See main table | Section is empty or uses fallback logic |
| P3 | Monthly | By 5th of month | Auto-fallback to estimation |

### 7.5 Regional Data Filtering

**DataManager** uniformly filters out teams without the `TH-` prefix upon data loading. This applies automatically to all API endpoints. Manual filtering within individual APIs / analysis dimensions is prohibited (unified error prevention).

---

## Chapter 8: ROI Cost Model & Reward Rules {#ch8-roi}

> Sources: `docs/research/excel-files-analysis-20260219.md` (File 3) + `docs/research/key-metrics-quick-reference.md` + `projects/referral/config.json` (`roi_cost_config` / `exchange_rate`)

### 8.1 Unit Cost Parameters

| Parameter | Value | Configuration Field |
|-----------|-------|---------------------|
| Class credit unit cost | **{{config.card_cost}} USD / credit** | `roi_cost_config.CARD_COST_PER_UNIT` |
| Cash commission (small order, contract < {{config.cash_threshold}} USD) | **{{config.commission_small}} USD / person** | `roi_cost_config.CASH_COMMISSION_SMALL` |
| Cash commission (large order, contract ≥ {{config.cash_threshold}} USD) | **{{config.commission_large}} USD / person** | `roi_cost_config.CASH_COMMISSION_LARGE` |
| Small / large order threshold | **{{config.cash_threshold}} USD** | `roi_cost_config.CASH_THRESHOLD` |

### 8.2 Three ROI Formulas

```python
# Class Credit ROI
Class Credit ROI = Actual Revenue / (Total credits given × {{config.card_cost}} USD)

# Cash ROI
Cash ROI = Actual Revenue / (Commission paid + Physical redemption + Incentive bonuses)

# Composite ROI
Composite ROI = Actual Revenue / (Class credit cost + Cash cost)
```

**2026 Annual ROI Target**: 19.82 (full-year average), January target 17.18, February–December target 20.0

### 8.3 Main Policy Reward Rules

| Referral Action | Reward (Class Credits) | Reward (Cash) | Cap |
|-----------------|----------------------|---------------|-----|
| Referral registration | 1 credit | — | Max 3 persons |
| Referral attendance | 3 credits | — | Max 10 persons |
| Referral payment (small order < {{config.cash_threshold}} USD) | 5 credits | {{config.commission_small}} USD | — |
| Referral payment (large order ≥ {{config.cash_threshold}} USD) | 8 credits | {{config.commission_large}} USD | — |

### 8.4 Check-in Reward Rules

| Student Type | Check-in Rule | Reward |
|-------------|--------------|--------|
| New students (weeks 1–4) | Check in 1× per week | 1 class credit |
| Renewed students | Check in 1× | 3 class credits |

### 8.5 Banana Mall Redemption Ratio

| Category | Redemption Share |
|----------|-----------------|
| Class credits | 80% |
| Physical goods | 20% |

### 8.6 Exchange Rate Rules

| Currency Pair | Rate | Configuration Field |
|--------------|------|---------------------|
| USD : THB | 1 : {{config.rate_thb}} | `exchange_rate.THB_USD` |
| USD : CNY | 1 : {{config.rate_cny}} | `exchange_rate.CNY_USD` |

> **Note**: Exchange rates can be updated in the Settings page and are stored in `config/exchange_rate.json`.

### 8.7 Currency Display Standards

| Standard | Description |
|----------|-------------|
| **Unified format** | `$1,234 (฿41,956)` — USD first, THB in parentheses |
| **RMB display prohibited** | Raw data contains CNY/THB/USD; front-end always converts to USD(THB) for display |
| **Shared utility function** | Front-end must use `formatRevenue(usd, exchangeRate)`; hardcoding `¥` or currency symbols is prohibited |
| **Backend response format** | API returns `{usd, thb}` dual fields; front-end renders based on `displayCurrency` setting |

### 8.8 Referral Revenue Calculation Rule

**Referral actual revenue = CC front-end + new orders + referral channel order amounts only**

Exclusions:
- SS/LP back-end new orders (partially overlapping with front-end; counted as back-end revenue)
- CC front-end renewal referrals (back-end revenue using the referral channel)
- SS/LP back-end renewal referrals

**Data filter condition**: `channel == "转介绍" AND team includes "CC" AND order_tag == "新单"`

**Code location**: `order_loader.py` `_aggregate_referral_cc_new()` → `analysis_engine_v2.py` `_analyze_summary()`

---

## Chapter 9: Notification Push Rules {#ch9-notification}

> Sources: CLAUDE.md notification push error-prevention rules + `scripts/dingtalk_engine.py` + `key/dingtalk-channels.json`

### 9.1 DingTalk Push — Seven Error-Prevention Rules

| # | Rule | Description | Safeguard |
|---|------|-------------|-----------|
| 1 | **Production group protection** | All pushes default to test/sandbox; `--confirm` parameter required to send to production groups | Code-level hard deny (unified for DingTalk + Lark) |
| 2 | **Idempotent push** | No duplicate sends on the same day to the same channel; use `--force` to override | `_is_already_sent()` reads `notification-log.jsonl` |
| 3 | **Rate limiting** | DingTalk: 20 messages/min, message interval ≥5s, channel interval ≥5s | `time.sleep(5)` |
| 4 | **System busy retry** | `errcode: -1` auto-retries 2 times (5s/10s back-off) | Built into `_send_dingtalk()` |
| 5 | **Image hosting dual fallback** | freeimage.host → sm.ms (s.ee); only falls back to text if both fail | `_upload_image()` chain call |
| 6 | **Credential isolation** | `key/dingtalk-channels.json` (.gitignore); hardcoding webhook/secret is prohibited | Credential SOP |
| 7 | **Back-end alert disabled** | `_alert_empty_data()` logs only, does not push to groups | `data_manager.py` L173 |

### 9.2 Lark Push Rules

- **Check-in follow-up**: `uv run python scripts/lark_bot.py followup --channel cc_all --confirm` (requires `--confirm` for production groups)
- **Dry-run test**: `uv run python scripts/lark_bot.py followup --dry-run`
- **Connectivity test**: `uv run python scripts/lark_bot.py --test`
- Credentials source: `key/lark-channels.json` (.gitignore)

### 9.3 Bilingual Output Policy

| Context | Rule |
|---------|------|
| **Image text** | Thai primary line (large, dark text) + Chinese secondary line (small, grey `_C_MUTED`), spacing ≥0.25 |
| **Table headers** | Double-row mode: Thai white text + Chinese grey text; **parenthesis-compressed mode is prohibited** |
| **Markdown** | Double-line title: `### Thai text\n### Chinese text` |
| **Legends** | Slash format: `ผ่าน/达标` |
| **Brand names** | CC/SS/LP/USD are not translated |

**Copy management**: Use the unified `TH_STRINGS` dictionary (`{"th": "...", "zh": "..."}`); scattered hardcoded strings are prohibited.

---

## Chapter 10: Analysis Methodology {#ch10-methodology}

> Sources: `docs/methodology.md`

### 10.1 Six-Step Data Analysis Framework

All analysis modules follow:

| Step | Name | Core Action |
|------|------|-------------|
| 1 | **Clarify the Question** | Core question + key stakeholders + core value this analysis can create |
| 2 | **Key Metrics** | Result metrics (registrations / payments / revenue) + process metrics (Check-in Rate / Outreach Rate / Participation Rate) |
| 3 | **Data Support** | Data sources (12 sources) + data processing tools (AnalysisEngineV2) |
| 4 | **Analysis Methods** | Core methods (funnel / MoM comparison / attribution) + auxiliary methods (anomaly detection / forecasting) |
| 5 | **Core Insights** | Root cause diagnosis + key findings |
| 6 | **Action Plan** | Strategic recommendations + expected impact (quantified in $) |

### 10.2 Pyramid Principle & Report Framework

- **Conclusion first**: Lead with the main conclusion, then expand on supporting evidence
- **MECE principle**: Mutually Exclusive, Collectively Exhaustive categorization
- **SCQA framework**: Situation (S) → Complication (C) → Question (Q) → Answer (A)
- Each layer of arguments: 3–7 points, no more than 7
- Logical progression: chronological / spatial / degree ordering

### 10.3 Three-Stage Referral Evolution Model

| Stage | Core Driver | Key Characteristics & Tools |
|-------|------------|------------------------------|
| **1. Basic Launch** | User willingness (incentive-driven) | Result incentives ($60 / 20 class credits), tool capabilities (VIP / friendship cards / assistant / referral codes), four core advantages (market / launch / existing base / sales) |
| **2. Scientific Operations** | Formula-driven operations | Referral formula = Active Users × Participation Rate × Acquisition Rate × Conversion Rate; multi-channel refinement (ask in person / check-in activities / operations livestreams / community management / partner programs / school partnerships) |
| **3. Systems Thinking** | Two stock management disciplines | Stock 1: Active satisfied users = product quality + service experience = user satisfaction; Stock 2: User network pool (high trust high demand / high trust low demand / low trust high demand) |

### 10.4 Referral Operations Causal Model

```
01 Business Drivers (Cause)        02 User Perception (Foundation)    03 Level Progression (Effect)
├─ System: precision + workspace   ├─ Willingness: external strategy   All paying users
├─ User service: poster/copy/gift  │  + rewards                          ↓ Users who join referrals
├─ People: CC wants to / can do    ├─ Ability: biz skills + 1-tap share    ↓ Active referral users
└─ Strategy: policy support        ├─ Environment: multi-scenario              ↓ Partners
                                   └─ Product: operation simplified
```

**Key Leverage**: People (CC's willingness and ability) > Product (simplified operations) > Strategy (policy incentives).

### 10.5 Pyramid 5-Why Diagnosis Method

Applicable scenario: automatically triggered when a metric deviates by >2σ

```
Result anomaly (e.g. Participation Rate −30%)
  → Why 1: Did Check-in Rate drop? (Data: Check-in Rate 70% → 55%)
    → Why 2: Were check-in activity rewards reduced? (Verify incentive policy changes)
      → Why 3: Budget cuts? (Confirm cost policy)
        → Why 4: Did ROI miss target? (Verify ROI data)
          → Why 5: Declining conversion rate dragged ROI down (Root cause)
            → Action: Optimize M0 outreach SOP + improve Attendance-to-Payment Rate
            → Expected outcome: Participation Rate +1.5pp, new referrals +45 persons/month, revenue +$38K/month
```

---

## Appendix: Key Constants Quick Reference

### A. Annual Targets (2026)

| Metric | Target |
|--------|--------|
| New-order revenue | 9,104,337 USD |
| New-order volume | 11,380 orders |
| New-order ASP | 800 USD (fixed) |
| Referral revenue | 2,710,169 USD |
| Referral share | 30.5% |
| Annual average ROI | 19.82 |

### B. Historical Benchmarks (Full Year 2025)

| Metric | Value |
|--------|-------|
| New-order revenue | 7,118,510 USD |
| Referral revenue | 1,830,233 USD |
| Referral share | 25.7% |
| Full-year registrations | 9,787 persons |
| Average ASP | 796.7 USD |
| Full-year order volume | 2,301 orders |
| Average conversion rate | 23.5% |

### C. Common Command Quick Reference

| Scenario | Command |
|----------|---------|
| Start backend | `DATA_SOURCE_DIR="$HOME/Desktop/转介绍中台监测指标" uv run uvicorn backend.main:app --host 0.0.0.0 --port 8100 --reload` |
| Start frontend | `cd frontend && npm run dev` (port 3100) |
| DingTalk daily report (production) | `uv run python scripts/dingtalk_daily.py --engine --confirm` |
| DingTalk dry-run | `uv run python scripts/dingtalk_daily.py --engine --dry-run` |
| Crash log summary | `curl -s http://localhost:8100/api/system/error-log/summary` |
| Lark check-in follow-up | `uv run python scripts/lark_bot.py followup --channel cc_all --confirm` |

---

*This document was consolidated by the doc-writer agent from the following 11 sources: `docs/glossary.md`, `docs/cc-ranking-spec.md`, `docs/bi-indicator-dictionary.md`, `docs/methodology.md`, `docs/research/key-metrics-quick-reference.md`, `docs/research/excel-files-analysis-20260219.md`, `projects/referral/config.json`, `docs/data-source-dependencies.md`, `docs/data-source-update-policy.md`, `config/targets_override.json`, `config/checkin_thresholds.json`, and CLAUDE.md business rules.*

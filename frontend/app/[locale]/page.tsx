'use client';

import { useLocale } from 'next-intl';
import { useState, useMemo } from 'react';

/* ── 多语言 ─────────────────────────────────────────────────── */

const I18N = {
  zh: {
    all: '全部',
    ccFront: 'CC 前端',
    ssBack: 'SS 后端',
    lpService: 'LP 服务',
    activeIndicators: '活跃指标',
    total: '共',
    items: '项',
    timeProgress: '时间进度',
    today: '今日',
    elapsedWorkdays: '已过工作日',
    remainingWorkdays: '剩余工作日',
    timePct: '时间进度',
    currentActual: '当前实际',
    monthTarget: '本月目标',
    absoluteGap: '目标绝对差',
    paceGap: '时间进度差',
    remainingDailyAvg: '达标需日均',
    paceDailyNeeded: '追进度需日均',
    efficiencyNeeded: '效率提升需求',
    currentDailyAvg: '当前日均',
    actualRate: '实际率',
    targetRate: '目标率',
    gapLabel: '目标差',
    kpi8Title: 'KPI 指标（8 项全维度）',
    funnelConvTitle: '漏斗转化率',
    funnelEmpty: '暂无漏斗数据',
    funnelEmptyDesc: '请确认已上传本月 Excel 数据源（A1 当月快照），上传后自动刷新',
    monthlyAchTitle: '月度目标达成',
    unitAchRate: '单量达成率',
    revAchRate: '业绩达成率',
    aovAchRate: '客单价达成率',
    colorHint: '颜色：',
    green100: '绿≥100%',
    orange80: '橙80-100%',
    red80: '红<80%',
    d2bTitle: '全站基准（D2b）',
    d2bDesc: '全站学员参与效率快照 · 财务模型参与率与运营口径相同（待确认）',
    totalStudents: '有效学员数',
    totalStudentsSub: '已付费且在有效期内的学员，是本月转介绍运营的基数',
    newCoeff: '带新系数',
    newCoeffSub: '每个参与的A学员平均带来的B注册数，>2为优质',
    cargoRatio: '带货比',
    cargoRatioSub: '带来注册的学员数/有效学员总数，衡量整体转介绍渗透率',
    participationCount: '带新参与数',
    participationCountSub: '带来≥1个注册的有效学员数',
    participationRate: '参与率',
    participationRateSub: '带来注册的学员/有效学员总数',
    checkinRate: '打卡率',
    checkinRateSub: '转码且分享的学员/有效学员，绿≥50%，橙30-50%，红<30%',
    ccReachRate: 'CC触达率',
    ccReachRateSub: 'CC有效通话(≥20s)学员数/有效学员总数',
    dataSourceTitle: '数据源状态',
    loadFailed: '数据加载失败',
    loadFailedDesc: '无法获取概览数据，请检查后端服务是否正常运行',
    retry: '重试',
    noData: '暂无数据',
    noDataDesc: '请将 Excel 数据文件放入数据源目录，完成后刷新页面即可自动加载',
    pageTitle: '运营总览',
    pageSubtitle: '转介绍漏斗达成情况 · 数据源状态',
    paceRowProgress: '追进度时间进度',
    colorGreen50: '绿≥50%',
    colorOrange30: '橙30-50%',
    colorRed30: '红<30%',
    colorGreen100: '绿≥100%',
    colorOrange80: '橙80-100%',
    colorRed80: '红<80%',
    achieveColor: '达成率颜色：',
    roleAll: '全部',
    roleCCFront: 'CC 前端',
    roleSSBack: 'SS 后端',
    roleLPService: 'LP 服务',
    activeIndicatorsLabel: '活跃指标',
    totalCount: '共',
    itemsCount: '项',
    sub_paceGap: '实际达成率 - 时间进度，正值=跑赢进度线，负值=落后于时间',
    sub_remainDailyAvg: '完成月目标每天需新增量，基于剩余工作日均摊',
    sub_paceDailyNeeded: '追上时间进度线每天需新增量（比达标更紧迫）',
    sub_efficiencyNeeded: '当前日均速度需提升的百分比才能完成月目标',
    row_currentActual: '当前实际',
    row_monthTarget: '本月目标',
    row_absoluteGap: '目标绝对差',
    row_paceGap: '时间进度差',
    row_remainDailyAvg: '达标需日均',
    row_paceDailyNeeded: '追进度需日均',
    row_efficiencyNeeded: '效率提升需求',
    row_currentDailyAvg: '当前日均',
    rateActual: '实际率',
    rateTarget: '目标率',
    rateGap: '目标差',
    kpi_register: '注册数',
    kpi_appointment: '预约数',
    kpi_showup: '出席数',
    kpi_paid: '付费数',
    kpi_revenue: '业绩 (USD)',
    kpi_aov: '客单价',
    kpi_register_conv: '注册转化率',
    kpi8CardTitle: 'KPI 指标（8 项全维度）',
    tp_timeProgress: '时间进度',
    tp_today: '今日',
    tp_elapsedWorkdays: '已过工作日',
    tp_remainingWorkdays: '剩余工作日',
    tp_timePct: '时间进度',
    pace_register: '注册日均需',
    pace_appointment: '预约日均需',
    pace_showup: '出席日均需',
    pace_paid: '付费日均需',
    pace_revenue: '业绩日均需',
    paceRowSuffix: '（追进度时间进度 ',
    paceRowSuffix2: '%）',
    monthlyAchCardTitle: '月度目标达成',
    ring_unitAch: '单量达成率',
    ring_revAch: '业绩达成率',
    ring_aovAch: '客单价达成率',
    colorHintFull: '颜色：',
    errLoadFailed: '数据加载失败',
    errLoadFailedDesc: '无法获取概览数据，请检查后端服务是否正常运行',
    btnRetry: '重试',
    emptyTitle: '暂无数据',
    emptyDesc: '请将 Excel 数据文件放入数据源目录，完成后刷新页面即可自动加载',
    pageHeader: '运营总览',
    pageHeaderSub: '转介绍漏斗达成情况 · 数据源状态',
    achieveColorHint: '达成率颜色：',
    funnelCardTitle: '漏斗转化率',
    d2bCardTitle: '全站基准（D2b）',
    d2bCardDesc: '全站学员参与效率快照 · 财务模型参与率与运营口径相同（待确认）',
    d2b_totalStudents: '有效学员数',
    d2b_totalStudentsSub: '已付费且在有效期内的学员，是本月转介绍运营的基数',
    d2b_newCoeff: '带新系数',
    d2b_newCoeffSub: '每个参与的A学员平均带来的B注册数，>2为优质',
    d2b_cargoRatio: '带货比',
    d2b_cargoRatioSub: '带来注册的学员数/有效学员总数，衡量整体转介绍渗透率',
    d2b_participationCount: '带新参与数',
    d2b_participationCountSub: '带来≥1个注册的有效学员数',
    d2b_participationRate: '参与率',
    d2b_participationRateSub: '带来注册的学员/有效学员总数',
    d2b_checkinRate: '打卡率',
    d2b_checkinRateSub: '转码且分享的学员/有效学员，绿≥50%，橙30-50%，红<30%',
    d2b_ccReachRate: 'CC触达率',
    d2b_ccReachRateSub: 'CC有效通话(≥20s)学员数/有效学员总数',
    dataSourceCardTitle: '数据源状态',
    mom_paid: '付费数',
    mom_revenue: '业绩',
    mom_register: '注册数',
    monthBarPct: '年',
    monthBarSuffix: '月',
    funnel_register: '注册',
    funnel_appointment: '预约',
    funnel_showup: '出席',
    funnel_paid: '付费',
  },
  'zh-TW': {
    all: '全部',
    ccFront: 'CC 前端',
    ssBack: 'SS 後端',
    lpService: 'LP 服務',
    activeIndicators: '活躍指標',
    total: '共',
    items: '項',
    timeProgress: '時間進度',
    today: '今日',
    elapsedWorkdays: '已過工作日',
    remainingWorkdays: '剩餘工作日',
    timePct: '時間進度',
    currentActual: '當前實際',
    monthTarget: '本月目標',
    absoluteGap: '目標絕對差',
    paceGap: '時間進度差',
    remainingDailyAvg: '達標需日均',
    paceDailyNeeded: '追進度需日均',
    efficiencyNeeded: '效率提升需求',
    currentDailyAvg: '當前日均',
    actualRate: '實際率',
    targetRate: '目標率',
    gapLabel: '目標差',
    kpi8Title: 'KPI 指標（8 項全維度）',
    funnelConvTitle: '漏斗轉化率',
    funnelEmpty: '暫無漏斗資料',
    funnelEmptyDesc: '請確認已上傳本月 Excel 資料來源（A1 當月快照），上傳後自動刷新',
    monthlyAchTitle: '月度目標達成',
    unitAchRate: '單量達成率',
    revAchRate: '業績達成率',
    aovAchRate: '客單價達成率',
    colorHint: '顏色：',
    green100: '綠≥100%',
    orange80: '橙80-100%',
    red80: '紅<80%',
    d2bTitle: '全站基準（D2b）',
    d2bDesc: '全站學員參與效率快照 · 財務模型參與率與運營口徑相同（待確認）',
    totalStudents: '有效學員數',
    totalStudentsSub: '已付費且在有效期內的學員，是本月轉介紹運營的基數',
    newCoeff: '帶新係數',
    newCoeffSub: '每個參與的A學員平均帶來的B註冊數，>2為優質',
    cargoRatio: '帶貨比',
    cargoRatioSub: '帶來註冊的學員數/有效學員總數，衡量整體轉介紹滲透率',
    participationCount: '帶新參與數',
    participationCountSub: '帶來≥1個註冊的有效學員數',
    participationRate: '參與率',
    participationRateSub: '帶來註冊的學員/有效學員總數',
    checkinRate: '打卡率',
    checkinRateSub: '轉碼且分享的學員/有效學員，綠≥50%，橙30-50%，紅<30%',
    ccReachRate: 'CC觸達率',
    ccReachRateSub: 'CC有效通話(≥20s)學員數/有效學員總數',
    dataSourceTitle: '資料來源狀態',
    loadFailed: '資料載入失敗',
    loadFailedDesc: '無法取得概覽資料，請檢查後端服務是否正常運行',
    retry: '重試',
    noData: '暫無資料',
    noDataDesc: '請將 Excel 資料檔案放入資料來源目錄，完成後刷新頁面即可自動載入',
    pageTitle: '運營總覽',
    pageSubtitle: '轉介紹漏斗達成情況 · 資料來源狀態',
    paceRowProgress: '追進度時間進度',
    colorGreen50: '綠≥50%',
    colorOrange30: '橙30-50%',
    colorRed30: '紅<30%',
    colorGreen100: '綠≥100%',
    colorOrange80: '橙80-100%',
    colorRed80: '紅<80%',
    achieveColor: '達成率顏色：',
    roleAll: '全部',
    roleCCFront: 'CC 前端',
    roleSSBack: 'SS 後端',
    roleLPService: 'LP 服務',
    activeIndicatorsLabel: '活躍指標',
    totalCount: '共',
    itemsCount: '項',
    sub_paceGap: '實際達成率 - 時間進度，正值=跑贏進度線，負值=落後於時間',
    sub_remainDailyAvg: '完成月目標每天需新增量，基於剩餘工作日均攤',
    sub_paceDailyNeeded: '追上時間進度線每天需新增量（比達標更緊迫）',
    sub_efficiencyNeeded: '當前日均速度需提升的百分比才能完成月目標',
    row_currentActual: '當前實際',
    row_monthTarget: '本月目標',
    row_absoluteGap: '目標絕對差',
    row_paceGap: '時間進度差',
    row_remainDailyAvg: '達標需日均',
    row_paceDailyNeeded: '追進度需日均',
    row_efficiencyNeeded: '效率提升需求',
    row_currentDailyAvg: '當前日均',
    rateActual: '實際率',
    rateTarget: '目標率',
    rateGap: '目標差',
    kpi_register: '註冊數',
    kpi_appointment: '預約數',
    kpi_showup: '出席數',
    kpi_paid: '付費數',
    kpi_revenue: '業績 (USD)',
    kpi_aov: '客單價',
    kpi_register_conv: '註冊轉化率',
    kpi8CardTitle: 'KPI 指標（8 項全維度）',
    tp_timeProgress: '時間進度',
    tp_today: '今日',
    tp_elapsedWorkdays: '已過工作日',
    tp_remainingWorkdays: '剩餘工作日',
    tp_timePct: '時間進度',
    pace_register: '註冊日均需',
    pace_appointment: '預約日均需',
    pace_showup: '出席日均需',
    pace_paid: '付費日均需',
    pace_revenue: '業績日均需',
    paceRowSuffix: '（追進度時間進度 ',
    paceRowSuffix2: '%）',
    monthlyAchCardTitle: '月度目標達成',
    ring_unitAch: '單量達成率',
    ring_revAch: '業績達成率',
    ring_aovAch: '客單價達成率',
    colorHintFull: '顏色：',
    errLoadFailed: '資料載入失敗',
    errLoadFailedDesc: '無法取得概覽資料，請檢查後端服務是否正常運行',
    btnRetry: '重試',
    emptyTitle: '暫無資料',
    emptyDesc: '請將 Excel 資料檔案放入資料來源目錄，完成後刷新頁面即可自動載入',
    pageHeader: '運營總覽',
    pageHeaderSub: '轉介紹漏斗達成情況 · 資料來源狀態',
    achieveColorHint: '達成率顏色：',
    funnelCardTitle: '漏斗轉化率',
    d2bCardTitle: '全站基準（D2b）',
    d2bCardDesc: '全站學員參與效率快照 · 財務模型參與率與運營口徑相同（待確認）',
    d2b_totalStudents: '有效學員數',
    d2b_totalStudentsSub: '已付費且在有效期內的學員，是本月轉介紹運營的基數',
    d2b_newCoeff: '帶新係數',
    d2b_newCoeffSub: '每個參與的A學員平均帶來的B註冊數，>2為優質',
    d2b_cargoRatio: '帶貨比',
    d2b_cargoRatioSub: '帶來註冊的學員數/有效學員總數，衡量整體轉介紹滲透率',
    d2b_participationCount: '帶新參與數',
    d2b_participationCountSub: '帶來≥1個註冊的有效學員數',
    d2b_participationRate: '參與率',
    d2b_participationRateSub: '帶來註冊的學員/有效學員總數',
    d2b_checkinRate: '打卡率',
    d2b_checkinRateSub: '轉碼且分享的學員/有效學員，綠≥50%，橙30-50%，紅<30%',
    d2b_ccReachRate: 'CC觸達率',
    d2b_ccReachRateSub: 'CC有效通話(≥20s)學員數/有效學員總數',
    dataSourceCardTitle: '資料來源狀態',
    mom_paid: '付費數',
    mom_revenue: '業績',
    mom_register: '註冊數',
    monthBarPct: '年',
    monthBarSuffix: '月',
    funnel_register: '註冊',
    funnel_appointment: '預約',
    funnel_showup: '出席',
    funnel_paid: '付費',
  },
  en: {
    all: 'All',
    ccFront: 'CC Front',
    ssBack: 'SS Back',
    lpService: 'LP Service',
    activeIndicators: 'Active Indicators',
    total: 'Total',
    items: '',
    timeProgress: 'Time Progress',
    today: 'Today',
    elapsedWorkdays: 'Elapsed Workdays',
    remainingWorkdays: 'Remaining Workdays',
    timePct: 'Time Progress',
    currentActual: 'Actual',
    monthTarget: 'Monthly Target',
    absoluteGap: 'Absolute Gap',
    paceGap: 'Pace Gap',
    remainingDailyAvg: 'Daily Avg Needed',
    paceDailyNeeded: 'Pace Daily Needed',
    efficiencyNeeded: 'Efficiency Needed',
    currentDailyAvg: 'Current Daily Avg',
    actualRate: 'Actual Rate',
    targetRate: 'Target Rate',
    gapLabel: 'Gap',
    kpi8Title: 'KPI Metrics (8 Dimensions)',
    funnelConvTitle: 'Funnel Conversion',
    funnelEmpty: 'No Funnel Data',
    funnelEmptyDesc:
      "Please upload this month's Excel data (A1 snapshot), will refresh automatically",
    monthlyAchTitle: 'Monthly Target Achievement',
    unitAchRate: 'Unit Achievement Rate',
    revAchRate: 'Revenue Achievement Rate',
    aovAchRate: 'AOV Achievement Rate',
    colorHint: 'Color: ',
    green100: 'Green≥100%',
    orange80: 'Orange 80-100%',
    red80: 'Red<80%',
    d2bTitle: 'Site Benchmark (D2b)',
    d2bDesc: 'Site-wide participation efficiency snapshot',
    totalStudents: 'Active Students',
    totalStudentsSub: 'Paid students within valid period, base of referral operations',
    newCoeff: 'New Coefficient',
    newCoeffSub: 'Avg B registrations per participating A student, >2 is excellent',
    cargoRatio: 'Cargo Ratio',
    cargoRatioSub: 'Students who brought registrations / total active students',
    participationCount: 'Participation Count',
    participationCountSub: 'Active students who brought ≥1 registration',
    participationRate: 'Participation Rate',
    participationRateSub: 'Students who brought registrations / total active students',
    checkinRate: 'Check-in Rate',
    checkinRateSub:
      'Students who checked in and shared / active students, green≥50%, orange 30-50%, red<30%',
    ccReachRate: 'CC Outreach Rate',
    ccReachRateSub: 'CC students with valid calls(≥20s) / total active students',
    dataSourceTitle: 'Data Sources',
    loadFailed: 'Load Failed',
    loadFailedDesc: 'Cannot fetch overview data, please check backend service',
    retry: 'Retry',
    noData: 'No Data',
    noDataDesc: 'Please place Excel data files in the data source directory and refresh',
    pageTitle: 'Operations Overview',
    pageSubtitle: 'Referral funnel status · Data source status',
    paceRowProgress: 'Pace Time Progress',
    colorGreen50: 'Green≥50%',
    colorOrange30: 'Orange 30-50%',
    colorRed30: 'Red<30%',
    colorGreen100: 'Green≥100%',
    colorOrange80: 'Orange 80-100%',
    colorRed80: 'Red<80%',
    achieveColor: 'Achievement color: ',
    roleAll: 'All',
    roleCCFront: 'CC Front',
    roleSSBack: 'SS Back',
    roleLPService: 'LP Service',
    activeIndicatorsLabel: 'Active Indicators',
    totalCount: 'Total',
    itemsCount: '',
    sub_paceGap: 'Actual rate - time progress, positive = ahead, negative = behind',
    sub_remainDailyAvg:
      'Daily increment needed to hit monthly target, spread over remaining workdays',
    sub_paceDailyNeeded: 'Daily increment needed to catch up to time progress (more urgent)',
    sub_efficiencyNeeded: '% increase in daily pace needed to hit monthly target',
    row_currentActual: 'Actual',
    row_monthTarget: 'Monthly Target',
    row_absoluteGap: 'Absolute Gap',
    row_paceGap: 'Pace Gap',
    row_remainDailyAvg: 'Daily Avg Needed',
    row_paceDailyNeeded: 'Pace Daily Needed',
    row_efficiencyNeeded: 'Efficiency Needed',
    row_currentDailyAvg: 'Current Daily Avg',
    rateActual: 'Actual Rate',
    rateTarget: 'Target Rate',
    rateGap: 'Gap',
    kpi_register: 'Registrations',
    kpi_appointment: 'Appointments',
    kpi_showup: 'Show-ups',
    kpi_paid: 'Paid',
    kpi_revenue: 'Revenue (USD)',
    kpi_aov: 'AOV',
    kpi_register_conv: 'Reg Conv. Rate',
    kpi8CardTitle: 'KPI Metrics (8 Dimensions)',
    tp_timeProgress: 'Time Progress',
    tp_today: 'Today',
    tp_elapsedWorkdays: 'Elapsed Workdays',
    tp_remainingWorkdays: 'Remaining Workdays',
    tp_timePct: 'Time Progress',
    pace_register: 'Reg daily need',
    pace_appointment: 'Apt daily need',
    pace_showup: 'Show daily need',
    pace_paid: 'Paid daily need',
    pace_revenue: 'Rev daily need',
    paceRowSuffix: '(Pace time progress ',
    paceRowSuffix2: '%)',
    monthlyAchCardTitle: 'Monthly Target Achievement',
    ring_unitAch: 'Unit Achievement',
    ring_revAch: 'Revenue Achievement',
    ring_aovAch: 'AOV Achievement',
    colorHintFull: 'Color: ',
    errLoadFailed: 'Load Failed',
    errLoadFailedDesc: 'Cannot fetch overview data, please check backend service',
    btnRetry: 'Retry',
    emptyTitle: 'No Data',
    emptyDesc: 'Please place Excel data files in the data source directory and refresh',
    pageHeader: 'Operations Overview',
    pageHeaderSub: 'Referral funnel status · Data source status',
    achieveColorHint: 'Achievement color: ',
    funnelCardTitle: 'Funnel Conversion',
    d2bCardTitle: 'Site Benchmark (D2b)',
    d2bCardDesc: 'Site-wide participation efficiency snapshot',
    d2b_totalStudents: 'Active Students',
    d2b_totalStudentsSub: 'Paid students within valid period, base of referral operations',
    d2b_newCoeff: 'New Coefficient',
    d2b_newCoeffSub: 'Avg B registrations per participating A student, >2 is excellent',
    d2b_cargoRatio: 'Cargo Ratio',
    d2b_cargoRatioSub: 'Students who brought registrations / total active students',
    d2b_participationCount: 'Participation Count',
    d2b_participationCountSub: 'Active students who brought ≥1 registration',
    d2b_participationRate: 'Participation Rate',
    d2b_participationRateSub: 'Students who brought registrations / total active students',
    d2b_checkinRate: 'Check-in Rate',
    d2b_checkinRateSub:
      'Students who checked in and shared / active students, green≥50%, orange 30-50%, red<30%',
    d2b_ccReachRate: 'CC Outreach Rate',
    d2b_ccReachRateSub: 'CC students with valid calls(≥20s) / total active students',
    dataSourceCardTitle: 'Data Sources',
    mom_paid: 'Paid',
    mom_revenue: 'Revenue',
    mom_register: 'Registrations',
    monthBarPct: '',
    monthBarSuffix: '',
    funnel_register: 'Register',
    funnel_appointment: 'Appt',
    funnel_showup: 'Show-up',
    funnel_paid: 'Paid',
  },
  th: {
    all: 'ทั้งหมด',
    ccFront: 'CC หน้าบ้าน',
    ssBack: 'SS หลังบ้าน',
    lpService: 'LP บริการ',
    activeIndicators: 'ตัวชี้วัดที่ใช้งาน',
    total: 'ทั้งหมด',
    items: 'รายการ',
    timeProgress: 'ความคืบหน้าเวลา',
    today: 'วันนี้',
    elapsedWorkdays: 'วันทำงานที่ผ่านไป',
    remainingWorkdays: 'วันทำงานที่เหลือ',
    timePct: 'ความคืบหน้าเวลา',
    currentActual: 'ยอดจริง',
    monthTarget: 'เป้าหมายเดือนนี้',
    absoluteGap: 'ส่วนต่างจากเป้า',
    paceGap: 'ส่วนต่างความเร็ว',
    remainingDailyAvg: 'ต้องทำต่อวัน',
    paceDailyNeeded: 'ต้องเร่งต่อวัน',
    efficiencyNeeded: 'ต้องเพิ่มประสิทธิภาพ',
    currentDailyAvg: 'เฉลี่ยต่อวันปัจจุบัน',
    actualRate: 'อัตราจริง',
    targetRate: 'อัตราเป้าหมาย',
    gapLabel: 'ส่วนต่าง',
    kpi8Title: 'KPI (8 มิติ)',
    funnelConvTitle: 'อัตราการแปลง Funnel',
    funnelEmpty: 'ไม่มีข้อมูล Funnel',
    funnelEmptyDesc: 'กรุณาอัปโหลดข้อมูล Excel เดือนนี้ (A1 snapshot) จะรีเฟรชอัตโนมัติ',
    monthlyAchTitle: 'การบรรลุเป้าหมายรายเดือน',
    unitAchRate: 'อัตราบรรลุจำนวนสัญญา',
    revAchRate: 'อัตราบรรลุรายได้',
    aovAchRate: 'อัตราบรรลุมูลค่าต่อสัญญา',
    colorHint: 'สี: ',
    green100: 'เขียว≥100%',
    orange80: 'ส้ม 80-100%',
    red80: 'แดง<80%',
    d2bTitle: 'เกณฑ์มาตรฐานทั่วไป (D2b)',
    d2bDesc: 'ภาพรวมประสิทธิภาพการมีส่วนร่วมของนักเรียนทั่วไป',
    totalStudents: 'จำนวนนักเรียนที่ใช้งาน',
    totalStudentsSub: 'นักเรียนที่ชำระเงินแล้วและอยู่ในช่วงที่มีผล',
    newCoeff: 'สัมประสิทธิ์นำคนใหม่',
    newCoeffSub: 'ค่าเฉลี่ยจำนวน B ที่นักเรียน A แต่ละคนนำมา >2 ถือว่าดี',
    cargoRatio: 'อัตราส่วน Cargo',
    cargoRatioSub: 'นักเรียนที่นำการลงทะเบียน / นักเรียนที่ใช้งานทั้งหมด',
    participationCount: 'จำนวนผู้เข้าร่วม',
    participationCountSub: 'นักเรียนที่ใช้งานซึ่งนำการลงทะเบียน ≥1 ราย',
    participationRate: 'อัตราการมีส่วนร่วม',
    participationRateSub: 'นักเรียนที่นำการลงทะเบียน / นักเรียนที่ใช้งานทั้งหมด',
    checkinRate: 'อัตราเช็คอิน',
    checkinRateSub: 'นักเรียนที่เช็คอินและแชร์ / นักเรียนที่ใช้งาน',
    ccReachRate: 'อัตราการเข้าถึง CC',
    ccReachRateSub: 'นักเรียนที่ CC โทรหาได้ (≥20 วินาที) / นักเรียนทั้งหมด',
    dataSourceTitle: 'สถานะแหล่งข้อมูล',
    loadFailed: 'โหลดข้อมูลล้มเหลว',
    loadFailedDesc: 'ไม่สามารถดึงข้อมูลภาพรวมได้ กรุณาตรวจสอบ backend',
    retry: 'ลองใหม่',
    noData: 'ไม่มีข้อมูล',
    noDataDesc: 'กรุณาวาง Excel ในโฟลเดอร์ข้อมูล แล้วรีเฟรชหน้า',
    pageTitle: 'ภาพรวมการดำเนินงาน',
    pageSubtitle: 'สถานะ Funnel การแนะนำ · สถานะแหล่งข้อมูล',
    paceRowProgress: 'ความคืบหน้าเวลา',
    colorGreen50: 'เขียว≥50%',
    colorOrange30: 'ส้ม 30-50%',
    colorRed30: 'แดง<30%',
    colorGreen100: 'เขียว≥100%',
    colorOrange80: 'ส้ม 80-100%',
    colorRed80: 'แดง<80%',
    achieveColor: 'สีอัตราบรรลุ: ',
    roleAll: 'ทั้งหมด',
    roleCCFront: 'CC หน้าบ้าน',
    roleSSBack: 'SS หลังบ้าน',
    roleLPService: 'LP บริการ',
    activeIndicatorsLabel: 'ตัวชี้วัดที่ใช้งาน',
    totalCount: 'ทั้งหมด',
    itemsCount: 'รายการ',
    sub_paceGap: 'อัตราจริง - ความคืบหน้าเวลา ค่าบวก=นำหน้า ค่าลบ=ตามหลัง',
    sub_remainDailyAvg: 'จำนวนที่ต้องทำต่อวันเพื่อบรรลุเป้าหมายเดือน',
    sub_paceDailyNeeded: 'จำนวนที่ต้องทำต่อวันเพื่อตามทันความเร็วเวลา',
    sub_efficiencyNeeded: '% ที่ต้องเพิ่มความเร็วเฉลี่ยต่อวันเพื่อบรรลุเป้า',
    row_currentActual: 'ยอดจริง',
    row_monthTarget: 'เป้าหมายเดือนนี้',
    row_absoluteGap: 'ส่วนต่างจากเป้า',
    row_paceGap: 'ส่วนต่างความเร็ว',
    row_remainDailyAvg: 'ต้องทำต่อวัน',
    row_paceDailyNeeded: 'ต้องเร่งต่อวัน',
    row_efficiencyNeeded: 'ต้องเพิ่มประสิทธิภาพ',
    row_currentDailyAvg: 'เฉลี่ยต่อวันปัจจุบัน',
    rateActual: 'อัตราจริง',
    rateTarget: 'อัตราเป้าหมาย',
    rateGap: 'ส่วนต่าง',
    kpi_register: 'ลงทะเบียน',
    kpi_appointment: 'นัดหมาย',
    kpi_showup: 'เข้าเรียน',
    kpi_paid: 'ชำระเงิน',
    kpi_revenue: 'รายได้ (USD)',
    kpi_aov: 'AOV',
    kpi_register_conv: 'อัตราแปลงลงทะเบียน',
    kpi8CardTitle: 'KPI (8 มิติ)',
    tp_timeProgress: 'ความคืบหน้าเวลา',
    tp_today: 'วันนี้',
    tp_elapsedWorkdays: 'วันทำงานที่ผ่านไป',
    tp_remainingWorkdays: 'วันทำงานที่เหลือ',
    tp_timePct: 'ความคืบหน้าเวลา',
    pace_register: 'ต้องลงทะเบียน/วัน',
    pace_appointment: 'ต้องนัด/วัน',
    pace_showup: 'ต้องเข้าเรียน/วัน',
    pace_paid: 'ต้องชำระ/วัน',
    pace_revenue: 'ต้องรายได้/วัน',
    paceRowSuffix: '(ความคืบหน้าเวลา ',
    paceRowSuffix2: '%)',
    monthlyAchCardTitle: 'การบรรลุเป้าหมายรายเดือน',
    ring_unitAch: 'อัตราบรรลุจำนวนสัญญา',
    ring_revAch: 'อัตราบรรลุรายได้',
    ring_aovAch: 'อัตราบรรลุมูลค่าต่อสัญญา',
    colorHintFull: 'สี: ',
    errLoadFailed: 'โหลดข้อมูลล้มเหลว',
    errLoadFailedDesc: 'ไม่สามารถดึงข้อมูลภาพรวมได้ กรุณาตรวจสอบ backend',
    btnRetry: 'ลองใหม่',
    emptyTitle: 'ไม่มีข้อมูล',
    emptyDesc: 'กรุณาวาง Excel ในโฟลเดอร์ข้อมูล แล้วรีเฟรชหน้า',
    pageHeader: 'ภาพรวมการดำเนินงาน',
    pageHeaderSub: 'สถานะ Funnel การแนะนำ · สถานะแหล่งข้อมูล',
    achieveColorHint: 'สีอัตราบรรลุ: ',
    funnelCardTitle: 'อัตราการแปลง Funnel',
    d2bCardTitle: 'เกณฑ์มาตรฐานทั่วไป (D2b)',
    d2bCardDesc: 'ภาพรวมประสิทธิภาพการมีส่วนร่วมของนักเรียนทั่วไป',
    d2b_totalStudents: 'จำนวนนักเรียนที่ใช้งาน',
    d2b_totalStudentsSub: 'นักเรียนที่ชำระเงินแล้วและอยู่ในช่วงที่มีผล',
    d2b_newCoeff: 'สัมประสิทธิ์นำคนใหม่',
    d2b_newCoeffSub: 'ค่าเฉลี่ยจำนวน B ที่นักเรียน A แต่ละคนนำมา >2 ถือว่าดี',
    d2b_cargoRatio: 'อัตราส่วน Cargo',
    d2b_cargoRatioSub: 'นักเรียนที่นำการลงทะเบียน / นักเรียนที่ใช้งานทั้งหมด',
    d2b_participationCount: 'จำนวนผู้เข้าร่วม',
    d2b_participationCountSub: 'นักเรียนที่ใช้งานซึ่งนำการลงทะเบียน ≥1 ราย',
    d2b_participationRate: 'อัตราการมีส่วนร่วม',
    d2b_participationRateSub: 'นักเรียนที่นำการลงทะเบียน / นักเรียนที่ใช้งานทั้งหมด',
    d2b_checkinRate: 'อัตราเช็คอิน',
    d2b_checkinRateSub: 'นักเรียนที่เช็คอินและแชร์ / นักเรียนที่ใช้งาน',
    d2b_ccReachRate: 'อัตราการเข้าถึง CC',
    d2b_ccReachRateSub: 'นักเรียนที่ CC โทรหาได้ (≥20 วินาที) / นักเรียนทั้งหมด',
    dataSourceCardTitle: 'สถานะแหล่งข้อมูล',
    mom_paid: 'ชำระเงิน',
    mom_revenue: 'รายได้',
    mom_register: 'ลงทะเบียน',
    monthBarPct: '',
    monthBarSuffix: '',
    funnel_register: 'ลงทะเบียน',
    funnel_appointment: 'นัดหมาย',
    funnel_showup: 'เข้าเรียน',
    funnel_paid: 'ชำระเงิน',
  },
} as const;
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { formatRevenue, formatRate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/shared/StatCard';
import { PercentBar } from '@/components/shared/PercentBar';
import { useIndicatorMatrix } from '@/lib/hooks/useIndicatorMatrix';
import { useDataSources } from '@/lib/hooks';
import type { AttributionSummary } from '@/lib/types/cross-analysis';
import type { IndicatorCategory } from '@/lib/types/indicator-matrix';
import { CATEGORY_LABELS_ZH, CATEGORY_LABELS_TH } from '@/lib/types/indicator-matrix';
import { DataSourceSection } from '@/components/datasources/DataSourceSection';
import { AnomalyBanner } from '@/components/dashboard/AnomalyBanner';
import { DecisionSummary } from '@/components/dashboard/DecisionSummary';
import { PersonalWorkbench } from '@/components/dashboard/PersonalWorkbench';
import { KnowledgeLink } from '@/components/ui/KnowledgeLink';
import { BmComparisonTable } from '@/components/dashboard/BmComparisonTable';
import { OverviewSummaryCards } from '@/components/dashboard/OverviewSummaryCards';
import type { BmComparison } from '@/lib/types/bm-calendar';

/* ── 岗位视角类型 ──────────────────────────────────────────────── */

type RoleView = 'all' | 'CC' | 'SS' | 'LP';

const ROLE_VIEW_KEYS: RoleView[] = ['all', 'CC', 'SS', 'LP'];

/* ── 岗位筛选器 ─────────────────────────────────────────────────── */

type I18NType = (typeof I18N)[keyof typeof I18N];

function RoleFilter({
  value,
  onChange,
  t,
}: {
  value: RoleView;
  onChange: (v: RoleView) => void;
  t: I18NType;
}) {
  const roleLabels: Record<RoleView, string> = {
    all: t.roleAll,
    CC: t.roleCCFront,
    SS: t.roleSSBack,
    LP: t.roleLPService,
  };
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {ROLE_VIEW_KEYS.map((role) => (
        <button
          key={role}
          onClick={() => onChange(role)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            value === role ? 'bg-n-900 text-white' : 'bg-subtle text-secondary-token hover:bg-n-200'
          }`}
        >
          {roleLabels[role]}
        </button>
      ))}
    </div>
  );
}

/* ── 指标矩阵摘要卡片 ──────────────────────────────────────────── */

function IndicatorMatrixSummary({
  role,
  t,
  locale,
}: {
  role: RoleView;
  t: I18NType;
  locale: string;
}) {
  const { registry, matrix, isLoading } = useIndicatorMatrix();

  if (isLoading) return null;
  if (role === 'all' || !matrix) return null;

  const activeIds = new Set(matrix[role as 'CC' | 'SS' | 'LP'].active);
  const activeIndicators = registry.filter((ind) => activeIds.has(ind.id));

  // 按分类汇总
  const categoryCount = activeIndicators.reduce<Record<IndicatorCategory, number>>(
    (acc, ind) => {
      acc[ind.category] = (acc[ind.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<IndicatorCategory, number>
  );

  const categories = Object.entries(categoryCount) as [IndicatorCategory, number][];
  const categoryLabels = locale === 'th' ? CATEGORY_LABELS_TH : CATEGORY_LABELS_ZH;

  const roleLabels: Record<RoleView, string> = {
    all: t.roleAll,
    CC: t.roleCCFront,
    SS: t.roleSSBack,
    LP: t.roleLPService,
  };

  return (
    <div className="rounded-lg border border-default-token bg-subtle px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-primary-token">
          {roleLabels[role]} {t.activeIndicatorsLabel}
        </span>
        <span className="text-xs text-muted-token">
          {t.totalCount}{' '}
          <span className="font-semibold text-primary-token">{activeIndicators.length}</span>{' '}
          {t.itemsCount}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map(([cat, count]) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-surface border border-default-token text-secondary-token"
          >
            {categoryLabels[cat]}
            <span className="font-semibold text-primary-token">{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 后端实际返回结构 ────────────────────────────────────────────── */

interface TimeProgressInfo {
  today: string;
  month_start: string;
  month_end: string;
  elapsed_workdays: number;
  remaining_workdays: number;
  total_workdays: number;
  time_progress: number; // 0~1
  elapsed_calendar_days: number;
  total_calendar_days: number;
}

interface KpiPaceItem {
  actual: number | null;
  target: number | null;
  daily_avg: number | null;
  pace_daily_needed: number | null;
}

interface KPI8Item {
  actual: number | null;
  target: number | null;
  absolute_gap: number | null;
  pace_gap: number | null;
  remaining_daily_avg: number | null;
  pace_daily_needed: number | null;
  efficiency_needed: number | null;
  current_daily_avg: number | null;
}

interface D2bSummary {
  total_students: number | null;
  new_coefficient: number | null;
  cargo_ratio: number | null;
  participation_count: number | null;
  participation_rate: number | null;
  checkin_rate: number | null;
  cc_reach_rate: number | null;
}

interface OverviewResponse {
  metrics: Record<string, number | string | null>;
  data_sources: { id: string; name: string; has_file: boolean; row_count: number }[];
  time_progress?: TimeProgressInfo;
  kpi_pace?: Record<string, KpiPaceItem | null>;
  kpi_8item?: Record<string, KPI8Item | null>;
  d2b_summary?: D2bSummary | null;
  /** 7 天 sparkline 数据，key = pace key（register/appointment/showup/paid/revenue） */
  kpi_sparklines?: Record<string, (number | null)[]>;
  /** MoM 环比变化率，key = pace key */
  kpi_mom?: Record<string, number | null>;
  /** BM 节奏对比数据 */
  bm_comparison?: BmComparison;
}

/* ── KPI 8项卡片 ─────────────────────────────────────────────── */

interface KPI8CardProps {
  label: string;
  item: KPI8Item;
  format?: 'currency' | 'count';
}

function fmt8(v: number | null, format: 'currency' | 'count' = 'count'): string {
  if (v === null || v === undefined) return '—';
  if (format === 'currency') return formatRevenue(v);
  return v % 1 === 0 ? v.toLocaleString() : v.toFixed(1);
}

function gapColor(v: number | null): string {
  if (v === null) return 'text-muted-token';
  if (v > 0) return 'text-success-token';
  if (v < 0) return 'text-danger-token';
  return 'text-secondary-token';
}

function KPI8Card({ label, item, format = 'count', t }: KPI8CardProps & { t: I18NType }) {
  // row key → subtitle key in t
  const subtitleMap: Record<string, string> = {
    paceGap: t.sub_paceGap,
    remainDailyAvg: t.sub_remainDailyAvg,
    paceDailyNeeded: t.sub_paceDailyNeeded,
    efficiencyNeeded: t.sub_efficiencyNeeded,
  };

  const rows: {
    key: string;
    label: string;
    value: string;
    colorFn?: (v: number | null) => string;
  }[] = [
    { key: 'currentActual', label: t.row_currentActual, value: fmt8(item.actual, format) },
    { key: 'monthTarget', label: t.row_monthTarget, value: fmt8(item.target, format) },
    {
      key: 'absoluteGap',
      label: t.row_absoluteGap,
      value: fmt8(item.absolute_gap, format),
      colorFn: gapColor,
    },
    {
      key: 'paceGap',
      label: t.row_paceGap,
      value: item.pace_gap !== null ? formatRate(item.pace_gap) : '—',
      colorFn: gapColor,
    },
    {
      key: 'remainDailyAvg',
      label: t.row_remainDailyAvg,
      value: fmt8(item.remaining_daily_avg, format),
    },
    {
      key: 'paceDailyNeeded',
      label: t.row_paceDailyNeeded,
      value: fmt8(item.pace_daily_needed, format),
    },
    {
      key: 'efficiencyNeeded',
      label: t.row_efficiencyNeeded,
      value: item.efficiency_needed !== null ? formatRate(item.efficiency_needed) : '—',
    },
    {
      key: 'currentDailyAvg',
      label: t.row_currentDailyAvg,
      value: fmt8(item.current_daily_avg, format),
    },
  ];

  return (
    <div className="card-base p-3">
      <p className="text-xs font-semibold text-primary-token uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex flex-col">
            <span className="text-[10px] text-muted-token" title={subtitleMap[r.key]}>
              {r.label}
            </span>
            <span
              className={`text-sm font-mono tabular-nums font-semibold ${
                r.colorFn
                  ? r.colorFn(
                      r.key === 'paceGap'
                        ? item.pace_gap
                        : r.key === 'absoluteGap'
                          ? item.absolute_gap
                          : null
                    )
                  : 'text-primary-token'
              }`}
            >
              {r.value}
            </span>
            {subtitleMap[r.key] && (
              <span className="text-[9px] text-muted-token leading-tight mt-0.5 opacity-70">
                {subtitleMap[r.key]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 效率类 RateCard8（5 项） ─────────────────────────────────── */

interface RateCard8Props {
  label: string;
  actual: number | null;
  target: number | null;
  lossDesc?: string;
  rootCause?: string;
}

function RateCard8({
  label,
  actual,
  target,
  lossDesc,
  rootCause,
  t,
}: RateCard8Props & { t: I18NType }) {
  const pct = actual !== null ? Math.round(actual * 100) : null;
  const targetPct = target !== null ? Math.round(target * 100) : null;
  const gap = actual !== null && target !== null ? actual - target : null;

  const gapClass =
    gap === null ? 'text-muted-token' : gap >= 0 ? 'text-success-token' : 'text-danger-token';

  return (
    <div className="card-base p-3">
      <p className="text-xs font-semibold text-primary-token uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-token">{t.rateActual}</span>
          <span className="text-sm font-mono font-semibold text-primary-token">
            {pct !== null ? `${pct}%` : '—'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-token">{t.rateTarget}</span>
          <span className="text-sm font-mono font-semibold text-secondary-token">
            {targetPct !== null ? `${targetPct}%` : '—'}
          </span>
        </div>
        <div className="flex flex-col col-span-2">
          <span className="text-[10px] text-muted-token">{t.rateGap}</span>
          <span className={`text-sm font-mono font-semibold ${gapClass}`}>
            {gap !== null ? `${gap >= 0 ? '+' : ''}${formatRate(Math.abs(gap))}` : '—'}
          </span>
        </div>
      </div>
      {lossDesc && <p className="text-[10px] text-danger-token mt-1 leading-relaxed">{lossDesc}</p>}
      {rootCause && (
        <p className="text-[10px] text-muted-token mt-0.5 leading-relaxed">{rootCause}</p>
      )}
    </div>
  );
}

/* ── KPI 8 项展示区 ──────────────────────────────────────────── */

function KPI8Section({ kpi8item, t }: { kpi8item: Record<string, KPI8Item | null>; t: I18NType }) {
  const kpi8Defs: { key: string; label: string; format?: 'currency' | 'count' }[] = [
    { key: 'register', label: t.kpi_register },
    { key: 'appointment', label: t.kpi_appointment },
    { key: 'showup', label: t.kpi_showup },
    { key: 'paid', label: t.kpi_paid },
    { key: 'revenue', label: t.kpi_revenue, format: 'currency' },
  ];
  const defs = kpi8Defs.filter((d) => kpi8item[d.key]);
  if (defs.length === 0) return null;

  return (
    <Card title={t.kpi8CardTitle}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {defs.map(({ key, label, format }) => {
          const item = kpi8item[key];
          if (!item) return null;
          return <KPI8Card key={key} label={label} item={item} format={format} t={t} />;
        })}
      </div>
    </Card>
  );
}

/* ── KPI 卡片定义 ─────────────────────────────────────────────── */

interface KpiCardDef {
  key: string;
  label: string;
  format?: 'rate' | 'currency';
  targetKey?: string; // 对应目标字段 key
  paceKey?: string; // 对应 kpi_pace key
  knowledgeChapter?: string; // 知识库章节跳转
}

function getKpiCards(t: I18NType): KpiCardDef[] {
  return [
    {
      key: '转介绍注册数',
      label: t.kpi_register,
      paceKey: 'register',
      knowledgeChapter: 'chapter-2',
    },
    {
      key: '预约数',
      label: t.kpi_appointment,
      paceKey: 'appointment',
      knowledgeChapter: 'chapter-2',
    },
    { key: '出席数', label: t.kpi_showup, paceKey: 'showup', knowledgeChapter: 'chapter-2' },
    {
      key: '转介绍付费数',
      label: t.kpi_paid,
      targetKey: '转介绍基础业绩单量标',
      paceKey: 'paid',
      knowledgeChapter: 'chapter-4',
    },
    {
      key: '总带新付费金额USD',
      label: t.kpi_revenue,
      format: 'currency',
      targetKey: '转介绍基础业绩标USD',
      paceKey: 'revenue',
      knowledgeChapter: 'chapter-4',
    },
    // AOV 和注册转化率已移至漏斗区域展示
  ];
}

const RATE_PAIRS: { from: string; to: string; rateKey: string }[] = [
  { from: '转介绍注册数', to: '预约数', rateKey: '注册预约率' },
  { from: '预约数', to: '出席数', rateKey: '预约出席率' },
  { from: '出席数', to: '转介绍付费数', rateKey: '出席付费率' },
];

function num(v: unknown): number {
  return typeof v === 'number' ? v : 0;
}

/* ── 时间进度信息条 ────────────────────────────────────────────── */

function TimeProgressBar({ tp, t }: { tp: TimeProgressInfo; t: I18NType }) {
  const pct = Math.round(tp.time_progress * 100);
  const [year, mon] = tp.month_start.slice(0, 7).split('-');
  const month = t.monthBarPct
    ? `${year}${t.monthBarPct}${mon}${t.monthBarSuffix}`
    : `${year}-${mon}`;

  return (
    <div className="rounded-lg border border-default-token bg-surface-alt px-4 py-3 text-xs text-secondary-token">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="font-medium text-primary-token">{t.tp_timeProgress}</span>
        <span className="text-muted-token">{month}</span>
      </div>

      {/* 进度条 */}
      <div className="relative h-2 rounded-full bg-n-200 overflow-hidden mb-2">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-action-accent transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* 数字信息行 */}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <span>
          {t.tp_today} <span className="font-medium text-primary-token">{tp.today}</span>
        </span>
        <span>
          {t.tp_elapsedWorkdays}{' '}
          <span className="font-medium text-primary-token">{tp.elapsed_workdays}</span> /{' '}
          {tp.total_workdays}
        </span>
        <span>
          {t.tp_remainingWorkdays}{' '}
          <span className="font-medium text-primary-token">{tp.remaining_workdays}</span>
        </span>
        <span>
          {t.tp_timePct}{' '}
          <span
            className={`font-semibold ${pct >= 80 ? 'text-danger-token' : pct >= 50 ? 'text-warning-token' : 'text-action-accent'}`}
          >
            {pct}%
          </span>
        </span>
      </div>
    </div>
  );
}

/* ── 追进度需日均信息行（漏斗下方） ───────────────────────────────── */

interface PaceRowProps {
  kpiPace: Record<string, KpiPaceItem | null>;
  timeProgress: number;
  t: I18NType;
}

function PaceRow({ kpiPace, timeProgress, t }: PaceRowProps) {
  const paceLabels: { key: string; label: string; format?: 'currency' }[] = [
    { key: 'register', label: t.pace_register },
    { key: 'appointment', label: t.pace_appointment },
    { key: 'showup', label: t.pace_showup },
    { key: 'paid', label: t.pace_paid },
    { key: 'revenue', label: t.pace_revenue, format: 'currency' },
  ];

  const items = paceLabels
    .map(({ key, label, format }) => {
      const item = kpiPace[key];
      if (!item || item.pace_daily_needed === null) return null;
      const needed = item.pace_daily_needed;
      const avg = item.daily_avg ?? 0;
      // 当前日均是否落后（日均 < 追进度需日均 → 落后）
      const isBehind = avg < needed - 0.001;
      const display = format === 'currency' ? formatRevenue(needed) : needed.toFixed(1);
      return { key, label, display, isBehind };
    })
    .filter(Boolean) as { key: string; label: string; display: string; isBehind: boolean }[];

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 px-1 pt-1 text-xs">
      {items.map(({ key, label, display, isBehind }) => (
        <span key={key} className="flex items-center gap-1">
          <span className="text-muted-token">{label}</span>
          <span className={`font-semibold ${isBehind ? 'text-danger-token' : 'text-action-text'}`}>
            {display}
          </span>
        </span>
      ))}
      <span className="text-muted-token ml-auto">
        {t.paceRowSuffix}
        {Math.round(timeProgress * 100)}
        {t.paceRowSuffix2}
      </span>
    </div>
  );
}

/* ── 漏斗转化率条（含进度对比） ──────────────────────────────────── */

function FunnelSnapshot({
  metrics,
  timeProgress,
  t,
}: {
  metrics: Record<string, number | string | null>;
  timeProgress: number;
  t: I18NType;
}) {
  const funnelLabelMap: Record<string, string> = {
    转介绍注册数: t.funnel_register,
    预约数: t.funnel_appointment,
    出席数: t.funnel_showup,
    转介绍付费数: t.funnel_paid,
  };

  return (
    <div className="space-y-4">
      {RATE_PAIRS.map(({ from, to, rateKey }) => {
        const rate = num(metrics[rateKey]);
        return (
          <div key={rateKey}>
            <div className="flex justify-between text-xs text-secondary-token mb-1">
              <span>
                {funnelLabelMap[from] ?? from} → {funnelLabelMap[to] ?? to}
              </span>
              <span className="font-medium">{formatRate(rate)}</span>
            </div>
            <PercentBar value={rate * 100} max={100} />
          </div>
        );
      })}
    </div>
  );
}

/* ── 月度目标达成环形进度 ──────────────────────────────────────── */

interface RingProps {
  label: string;
  value: number; // 0~1
  color: string;
}

function RingProgress({ label, value, color }: RingProps) {
  const pct = Math.min(Math.round(value * 100), 100);
  const radius = 28;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * pct) / 100;

  const textColor =
    value >= 1 ? 'text-success-token' : value >= 0.8 ? 'text-warning-token' : 'text-danger-token';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke="var(--border-default, #e5e7eb)"
            strokeWidth={stroke}
          />
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${textColor}`}
        >
          {pct}%
        </span>
      </div>
      <span className="text-[11px] text-secondary-token text-center leading-tight">{label}</span>
    </div>
  );
}

function MonthlyAchievementSection({ t }: { t: I18NType }) {
  const { data, isLoading } = useFilteredSWR<AttributionSummary>('/api/attribution/summary');

  if (isLoading) {
    return (
      <Card title={t.monthlyAchCardTitle}>
        <div className="flex items-center justify-around py-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full animate-pulse bg-n-200" />
              <div className="h-3 w-16 rounded animate-pulse bg-n-200" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const rings: RingProps[] = [
    { label: t.ring_unitAch, value: data.unit_achievement_rate ?? 0, color: '#6366f1' },
    { label: t.ring_revAch, value: data.revenue_achievement_rate ?? 0, color: '#10b981' },
    { label: t.ring_aovAch, value: data.order_value_achievement_rate ?? 0, color: '#f59e0b' },
  ];

  return (
    <Card title={t.monthlyAchCardTitle}>
      <div className="flex items-center justify-around py-2">
        {rings.map((r) => (
          <RingProgress key={r.label} {...r} />
        ))}
      </div>
      <p className="text-[10px] text-muted-token text-center mt-1">
        {t.colorHintFull}
        <span className="text-success-token font-medium">{t.colorGreen100}</span> ·{' '}
        <span className="text-warning-token font-medium">{t.colorOrange80}</span> ·{' '}
        <span className="text-danger-token font-medium">{t.colorRed80}</span>
      </p>
    </Card>
  );
}

/* ── KPI 卡片对应的指标 ID（与 overview API metrics key 对应） ──── */

const KPI_CARD_INDICATOR_IDS: Record<string, string[]> = {
  CC: ['转介绍注册数', '预约数', '出席数', '转介绍付费数', '总带新付费金额USD'],
  SS: ['转介绍注册数', '触达率', '打卡率'],
  LP: ['转介绍注册数', '触达率', '打卡率'],
};

/* ── 主页面 ───────────────────────────────────────────────────── */

export default function DashboardPage() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    channel: true,
  });
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N.zh;
  const [roleView, setRoleView] = useState<RoleView>('all');
  const { data, isLoading, error } = useFilteredSWR<OverviewResponse>('/api/overview');
  const { data: fullSources } = useDataSources();
  const KPI_CARDS = getKpiCards(t);

  // 根据岗位视角过滤 KPI 卡片（all = 全部显示）
  const visibleKpiCards = useMemo(() => {
    if (roleView === 'all') return KPI_CARDS;
    const allowedKeys = new Set(KPI_CARD_INDICATOR_IDS[roleView] ?? []);
    return KPI_CARDS.filter((c) => allowedKeys.has(c.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleView, t]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 animate-pulse rounded-md bg-n-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} className="h-24" />
          ))}
        </div>
        <SkeletonChart className="h-40 w-full" />
        <SkeletonChart className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-sm font-medium text-primary-token">{t.errLoadFailed}</p>
        <p className="text-xs text-muted-token">{t.errLoadFailedDesc}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-subtle border border-default-token text-secondary-token hover:bg-n-200 transition-colors min-h-[44px] min-w-[44px]"
        >
          {t.btnRetry}
        </button>
      </div>
    );
  }

  const metrics = data?.metrics ?? {};
  const sources = data?.data_sources ?? [];
  const tp = data?.time_progress;
  const kpiPace = data?.kpi_pace ?? {};
  const d2b = data?.d2b_summary;
  const kpiSparklines = data?.kpi_sparklines ?? {};
  const kpiMom = data?.kpi_mom ?? {};
  const hasMetrics = Object.keys(metrics).length > 0;

  if (!hasMetrics && sources.length === 0) {
    return <EmptyState title={t.emptyTitle} description={t.emptyDesc} />;
  }

  const allSourcesOk = sources.length > 0 && sources.every((s) => s.has_file);

  return (
    <div className="space-y-5 md:space-y-6">
      {/* 异常警报横幅 */}
      {hasMetrics && (
        <AnomalyBanner
          paceGap={data?.kpi_8item?.paid?.pace_gap ?? data?.kpi_8item?.revenue?.pace_gap ?? null}
          checkinRate={d2b?.checkin_rate ?? null}
          achievementRate={
            data?.kpi_8item?.paid?.actual != null && data?.kpi_8item?.paid?.target
              ? (data.kpi_8item.paid.actual ?? 0) / (data.kpi_8item.paid.target ?? 1)
              : null
          }
          timeProgress={tp?.time_progress ?? null}
          worstMoM={(() => {
            const moms = ['register', 'paid', 'revenue']
              .map((k) => kpiMom[k] ?? null)
              .filter((v): v is number => v !== null);
            return moms.length > 0 ? Math.min(...moms) : null;
          })()}
          worstMoMLabel={(() => {
            const pairs: [string, string][] = [
              ['paid', t.mom_paid],
              ['revenue', t.mom_revenue],
              ['register', t.mom_register],
            ];
            const worst = pairs.reduce<[string, string] | null>((acc, [k, label]) => {
              const v = kpiMom[k];
              if (v === undefined || v === null) return acc;
              if (!acc) return [k, label];
              const accV = kpiMom[acc[0]];
              return accV === undefined || accV === null || v < accV ? [k, label] : acc;
            }, null);
            return worst ? worst[1] : null;
          })()}
        />
      )}

      {/* 决策摘要横幅：一句话结论 + 关键瓶颈 */}
      {hasMetrics && (
        <DecisionSummary
          paidActual={data?.kpi_8item?.paid?.actual ?? null}
          paidTarget={data?.kpi_8item?.paid?.target ?? null}
          timeProgress={tp?.time_progress ?? null}
          checkinRate={d2b?.checkin_rate ?? null}
          participationRate={d2b?.participation_rate ?? null}
          revenueAchievementRate={null}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{t.pageHeader}</h1>
          <p className="text-sm text-secondary-token mt-1">{t.pageHeaderSub}</p>
        </div>
        {/* 岗位视角筛选器 */}
        <RoleFilter value={roleView} onChange={setRoleView} t={t} />
      </div>

      {/* 指标矩阵摘要（仅 SS/LP 视角时显示） */}
      <IndicatorMatrixSummary role={roleView} t={t} locale={locale} />

      {/* 时间进度信息条 */}
      {tp && <TimeProgressBar tp={tp} t={t} />}

      {/* KPI 卡片 */}
      {/* ── L0: 汇总 3 卡（业绩 → BM 节奏 → 时间&日均）── */}
      {data?.kpi_8item && (
        <OverviewSummaryCards
          kpi8item={data.kpi_8item}
          bmComparison={data.bm_comparison}
          timeProgress={tp}
        />
      )}

      {hasMetrics && (
        <>
          <p className="text-[10px] text-muted-token -mb-2">
            {t.achieveColorHint}
            <span className="text-success-token font-medium">{t.colorGreen100}</span> ·{' '}
            <span className="text-warning-token font-medium">{t.colorOrange80}</span> ·{' '}
            <span className="text-danger-token font-medium">{t.colorRed80}</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleKpiCards.map(({ key, label, format, targetKey, paceKey, knowledgeChapter }) => {
              const v = num(metrics[key]);
              const display =
                format === 'currency'
                  ? formatRevenue(v)
                  : format === 'rate'
                    ? formatRate(v)
                    : v.toLocaleString();

              const targetRaw = targetKey != null ? num(metrics[targetKey]) : undefined;
              const targetDisplay =
                targetRaw != null && targetRaw > 0
                  ? format === 'currency'
                    ? formatRevenue(targetRaw)
                    : format === 'rate'
                      ? formatRate(targetRaw)
                      : targetRaw.toLocaleString()
                  : undefined;
              const achievement = targetRaw != null && targetRaw > 0 ? v / targetRaw : undefined;

              // 是否落后时间进度（达成率 < 时间进度）
              const isBehindTime = tp && achievement != null && achievement < tp.time_progress;

              // sparkline 与 MoM（通过 paceKey 关联）
              const sparkline = paceKey ? kpiSparklines[paceKey] : undefined;
              const momChange = paceKey ? kpiMom[paceKey] : undefined;

              return (
                <StatCard
                  key={key}
                  label={label}
                  value={display}
                  target={targetDisplay}
                  achievement={achievement}
                  highlight={isBehindTime ? 'warn' : undefined}
                  sparkline={sparkline}
                  momChange={momChange}
                  knowledgeChapter={knowledgeChapter}
                />
              );
            })}
          </div>
        </>
      )}

      {/* KPI 8 项全维度 — 已合并到 OverviewSummaryCards + BmComparisonTable */}

      {/* BM 节奏对比 */}
      {data?.bm_comparison && <BmComparisonTable data={data.bm_comparison} />}

      {/* 漏斗转化率 */}
      <Card title={t.funnelCardTitle}>
        {!hasMetrics ? (
          <EmptyState title={t.funnelEmpty} description={t.funnelEmptyDesc} />
        ) : (
          <>
            <FunnelSnapshot metrics={metrics} timeProgress={tp?.time_progress ?? 0} t={t} />
            {/* AOV + 注册转化率（从 StatCard 移入漏斗区） */}
            <div className="mt-3 pt-3 border-t border-default-token flex flex-wrap gap-6 text-xs text-secondary-token">
              <span>
                {t.kpi_aov}:{' '}
                <strong className="text-primary-token">
                  {formatRevenue(num(metrics['客单价']))}
                </strong>
              </span>
              <span>
                {t.kpi_register_conv}:{' '}
                <strong className="text-primary-token">
                  {formatRate(num(metrics['注册转化率']))}
                </strong>
              </span>
            </div>
          </>
        )}
      </Card>

      {/* 月度目标达成 — 已合并到 OverviewSummaryCards 进度条 */}

      {/* D2b 全站基准 */}
      {d2b && (
        <Card title={t.d2bCardTitle}>
          <p className="text-[11px] text-muted-token mb-3">{t.d2bCardDesc}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              {
                label: t.d2b_totalStudents,
                value: (d2b.total_students ?? 0).toLocaleString(),
                subtitle: t.d2b_totalStudentsSub,
                chapter: 'chapter-1',
              },
              {
                label: t.d2b_newCoeff,
                value: d2b.new_coefficient != null ? d2b.new_coefficient.toFixed(2) : '—',
                subtitle: t.d2b_newCoeffSub,
                chapter: 'chapter-2-0',
              },
              {
                label: t.d2b_cargoRatio,
                value: d2b.cargo_ratio != null ? d2b.cargo_ratio.toFixed(2) : '—',
                subtitle: t.d2b_cargoRatioSub,
                chapter: 'chapter-2-0',
              },
              {
                label: t.d2b_participationCount,
                value:
                  d2b.participation_count != null ? d2b.participation_count.toLocaleString() : '—',
                subtitle: t.d2b_participationCountSub,
                chapter: 'chapter-2-0',
              },
              {
                label: t.d2b_participationRate,
                value: d2b.participation_rate != null ? formatRate(d2b.participation_rate) : '—',
                subtitle: t.d2b_participationRateSub,
                chapter: 'chapter-2-0',
              },
              {
                label: t.d2b_checkinRate,
                value: d2b.checkin_rate != null ? formatRate(d2b.checkin_rate) : '—',
                subtitle: t.d2b_checkinRateSub,
                chapter: 'chapter-2-0',
              },
              {
                label: t.d2b_ccReachRate,
                value: d2b.cc_reach_rate != null ? formatRate(d2b.cc_reach_rate) : '—',
                subtitle: t.d2b_ccReachRateSub,
                chapter: 'chapter-2-0',
              },
            ].map(({ label, value, subtitle, chapter }) => (
              <div key={label} className="bg-subtle rounded-lg px-3 py-2.5 flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-token inline-flex items-center">
                  {label}
                  {chapter && <KnowledgeLink chapter={chapter} className="w-3 h-3" />}
                </span>
                <span className="text-base font-bold font-mono tabular-nums text-primary-token">
                  {value}
                </span>
                <span className="text-[9px] text-muted-token leading-tight opacity-75">
                  {subtitle}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 数据源状态 */}
      <Card title={t.dataSourceCardTitle}>
        <DataSourceSection sources={fullSources ?? []} />
      </Card>

      {/* CC 个人工作台 */}
      <PersonalWorkbench />
    </div>
  );
}

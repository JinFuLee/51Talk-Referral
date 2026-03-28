'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import type {
  Campaign,
  CampaignProgress,
  LeverRecommendation,
  IncentiveBudget,
  PersonProgress,
} from '@/lib/types/incentive';
import { METRIC_LABELS, ROLE_METRICS } from '@/lib/types/incentive';
import { formatRate } from '@/lib/utils';

// ─── i18n ──────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    pageTitle: '内场激励系统',
    pageDesc: '杠杆机会识别 · 激励活动管理 · 实时达标追踪',
    tabLeverage: '📊 杠杆分析',
    tabCampaigns: '🎯 活动管理',
    tabProgress: '⚡ 实时进度',
    // Status labels
    statusQualified: '已达标',
    statusClose: '接近',
    statusInProgress: '进行中',
    statusNotStarted: '未开始',
    campaignActive: '进行中',
    campaignPaused: '已暂停',
    campaignCompleted: '已完成',
    campaignDeleted: '已删除',
    // Campaign modal
    modalCreateTitle: '新建激励活动',
    modalEditTitle: '编辑活动',
    fieldCampaignName: '活动名称',
    fieldCampaignNamePlaceholder: '如：CC本月冲量激励',
    fieldThaiName: '泰文名称（选填）',
    fieldThaiNamePlaceholder: '泰语名称，用于海报',
    fieldRole: '岗位',
    fieldMetric: '考核指标',
    fieldCondition: '条件',
    fieldThreshold: '达标阈值',
    fieldThresholdPlaceholder: '如 10',
    fieldReward: '奖励金额（฿）',
    fieldRewardPlaceholder: '如 500',
    fieldStartDate: '开始日期（选填）',
    fieldEndDate: '结束日期（选填）',
    btnCancel: '取消',
    btnCreate: '创建活动',
    btnUpdate: '更新活动',
    btnSaving: '保存中…',
    errNoName: '请填写活动名称',
    errInvalidThreshold: '请填写有效的达标阈值',
    errInvalidReward: '请填写有效的奖励金额',
    errDuplicateMetric: '该指标已有进行中的活动',
    errSaveFailed: '保存失败',
    // Leverage tab
    leverageDesc: '以下阶段对转介绍业绩的杠杆效应最强，建议优先在此设置激励活动。',
    leverageCurrentPhase: '当前阶段：',
    leverageRemainingDays: ' · 剩余 ',
    leverageRemainingDaysSuffix: ' 个工作日',
    leverageScore: '杠杆评分',
    leverageRevImpact: '业绩增量',
    leverageAlreadyCreated: '✓ 已创建',
    leverageNextMonth: '下月初创建',
    leverageCreateBtn: '创建活动',
    leverageEmptyTitle: '暂无杠杆分析数据',
    leverageEmptyDesc: '后端分析引擎正在建立基线数据，稍后再来查看',
    // Campaigns tab
    campaignsMgmtDesc: '管理当月激励活动，达标自动通知 · 支持海报生成',
    campaignsNewBtn: '+ 新建活动',
    campaignsLoadFail: '加载失败，后端接口暂不可用',
    campaignsEmptyTitle: '暂无激励活动',
    campaignsEmptyDesc: '点击「新建活动」开始设置本月激励方案',
    thCampaignName: '活动名称',
    thRole: '岗位',
    thMetric: '指标',
    thCondition: '条件',
    thReward: '奖励',
    thProgress: '进度',
    thStatus: '状态',
    thActions: '操作',
    actionEdit: '编辑',
    actionPause: '暂停',
    actionResume: '恢复',
    actionPoster: '海报',
    actionDelete: '删除',
    posterFailed: '海报生成失败，请稍后重试',
    confirmDelete: '确认删除活动"',
    confirmDeleteSuffix: '"？此操作不可恢复。',
    // Progress tab
    budgetCardTitle: '预算消耗状态',
    budgetIndoor: '内场激励',
    budgetConsumed: '% 已消耗',
    budgetRemaining: '剩余 ฿',
    dataRemark: '数据为当月累计（ข้อมูลเป็นยอดสะสมทั้งเดือน），并非从活动开始日起算',
    progressLoadFail: '加载失败，后端接口暂不可用',
    progressEmptyTitle: '暂无进行中的活动',
    progressEmptyDesc: '在「活动管理」中创建活动后，实时进度将在此展示',
    qualified: '已达标',
    close: '人',
    totalEstimated: '预计发放',
    noPersonData: '暂无人员数据',
  },
  'zh-TW': {
    pageTitle: '內場激勵系統',
    pageDesc: '槓桿機會識別 · 激勵活動管理 · 即時達標追蹤',
    tabLeverage: '📊 槓桿分析',
    tabCampaigns: '🎯 活動管理',
    tabProgress: '⚡ 即時進度',
    statusQualified: '已達標',
    statusClose: '接近',
    statusInProgress: '進行中',
    statusNotStarted: '未開始',
    campaignActive: '進行中',
    campaignPaused: '已暫停',
    campaignCompleted: '已完成',
    campaignDeleted: '已刪除',
    modalCreateTitle: '新建激勵活動',
    modalEditTitle: '編輯活動',
    fieldCampaignName: '活動名稱',
    fieldCampaignNamePlaceholder: '如：CC本月衝量激勵',
    fieldThaiName: '泰文名稱（選填）',
    fieldThaiNamePlaceholder: '泰語名稱，用於海報',
    fieldRole: '崗位',
    fieldMetric: '考核指標',
    fieldCondition: '條件',
    fieldThreshold: '達標閾值',
    fieldThresholdPlaceholder: '如 10',
    fieldReward: '獎勵金額（฿）',
    fieldRewardPlaceholder: '如 500',
    fieldStartDate: '開始日期（選填）',
    fieldEndDate: '結束日期（選填）',
    btnCancel: '取消',
    btnCreate: '建立活動',
    btnUpdate: '更新活動',
    btnSaving: '儲存中…',
    errNoName: '請填寫活動名稱',
    errInvalidThreshold: '請填寫有效的達標閾值',
    errInvalidReward: '請填寫有效的獎勵金額',
    errDuplicateMetric: '該指標已有進行中的活動',
    errSaveFailed: '儲存失敗',
    leverageDesc: '以下階段對轉介紹業績的槓桿效應最強，建議優先在此設置激勵活動。',
    leverageCurrentPhase: '當前階段：',
    leverageRemainingDays: ' · 剩餘 ',
    leverageRemainingDaysSuffix: ' 個工作日',
    leverageScore: '槓桿評分',
    leverageRevImpact: '業績增量',
    leverageAlreadyCreated: '✓ 已建立',
    leverageNextMonth: '下月初建立',
    leverageCreateBtn: '建立活動',
    leverageEmptyTitle: '暫無槓桿分析資料',
    leverageEmptyDesc: '後端分析引擎正在建立基線資料，稍後再來查看',
    campaignsMgmtDesc: '管理當月激勵活動，達標自動通知 · 支援海報生成',
    campaignsNewBtn: '+ 新建活動',
    campaignsLoadFail: '載入失敗，後端介面暫不可用',
    campaignsEmptyTitle: '暫無激勵活動',
    campaignsEmptyDesc: '點擊「新建活動」開始設定本月激勵方案',
    thCampaignName: '活動名稱',
    thRole: '崗位',
    thMetric: '指標',
    thCondition: '條件',
    thReward: '獎勵',
    thProgress: '進度',
    thStatus: '狀態',
    thActions: '操作',
    actionEdit: '編輯',
    actionPause: '暫停',
    actionResume: '恢復',
    actionPoster: '海報',
    actionDelete: '刪除',
    posterFailed: '海報生成失敗，請稍後重試',
    confirmDelete: '確認刪除活動「',
    confirmDeleteSuffix: '」？此操作不可復原。',
    budgetCardTitle: '預算消耗狀態',
    budgetIndoor: '內場激勵',
    budgetConsumed: '% 已消耗',
    budgetRemaining: '剩餘 ฿',
    dataRemark: '資料為當月累計（ข้อมูลเป็นยอดสะสมทั้งเดือน），並非從活動開始日起算',
    progressLoadFail: '載入失敗，後端介面暫不可用',
    progressEmptyTitle: '暫無進行中的活動',
    progressEmptyDesc: '在「活動管理」中建立活動後，即時進度將在此展示',
    qualified: '已達標',
    close: '人',
    totalEstimated: '預計發放',
    noPersonData: '暫無人員資料',
  },
  en: {
    pageTitle: 'Incentive System',
    pageDesc: 'Leverage opportunity identification · Campaign management · Real-time tracking',
    tabLeverage: '📊 Leverage',
    tabCampaigns: '🎯 Campaigns',
    tabProgress: '⚡ Live Progress',
    statusQualified: 'Qualified',
    statusClose: 'Close',
    statusInProgress: 'In Progress',
    statusNotStarted: 'Not Started',
    campaignActive: 'Active',
    campaignPaused: 'Paused',
    campaignCompleted: 'Completed',
    campaignDeleted: 'Deleted',
    modalCreateTitle: 'New Campaign',
    modalEditTitle: 'Edit Campaign',
    fieldCampaignName: 'Campaign Name',
    fieldCampaignNamePlaceholder: 'e.g. CC Monthly Push',
    fieldThaiName: 'Thai Name (optional)',
    fieldThaiNamePlaceholder: 'Thai name for poster',
    fieldRole: 'Role',
    fieldMetric: 'Metric',
    fieldCondition: 'Condition',
    fieldThreshold: 'Threshold',
    fieldThresholdPlaceholder: 'e.g. 10',
    fieldReward: 'Reward (฿)',
    fieldRewardPlaceholder: 'e.g. 500',
    fieldStartDate: 'Start Date (optional)',
    fieldEndDate: 'End Date (optional)',
    btnCancel: 'Cancel',
    btnCreate: 'Create',
    btnUpdate: 'Update',
    btnSaving: 'Saving…',
    errNoName: 'Campaign name is required',
    errInvalidThreshold: 'Please enter a valid threshold',
    errInvalidReward: 'Please enter a valid reward amount',
    errDuplicateMetric: 'An active campaign already exists for this metric',
    errSaveFailed: 'Save failed',
    leverageDesc:
      'These phases have the strongest leverage on referral revenue. Set incentives here first.',
    leverageCurrentPhase: 'Current phase: ',
    leverageRemainingDays: ' · ',
    leverageRemainingDaysSuffix: ' working days left',
    leverageScore: 'Leverage Score',
    leverageRevImpact: 'Revenue Impact',
    leverageAlreadyCreated: '✓ Created',
    leverageNextMonth: 'Create next month',
    leverageCreateBtn: 'Create Campaign',
    leverageEmptyTitle: 'No leverage analysis data',
    leverageEmptyDesc: 'Backend engine is building baseline data, check back later',
    campaignsMgmtDesc: 'Manage monthly campaigns · Auto-notify on qualification · Poster support',
    campaignsNewBtn: '+ New Campaign',
    campaignsLoadFail: 'Load failed, backend unavailable',
    campaignsEmptyTitle: 'No campaigns yet',
    campaignsEmptyDesc: 'Click "New Campaign" to set up this month\'s incentive plan',
    thCampaignName: 'Campaign',
    thRole: 'Role',
    thMetric: 'Metric',
    thCondition: 'Condition',
    thReward: 'Reward',
    thProgress: 'Progress',
    thStatus: 'Status',
    thActions: 'Actions',
    actionEdit: 'Edit',
    actionPause: 'Pause',
    actionResume: 'Resume',
    actionPoster: 'Poster',
    actionDelete: 'Delete',
    posterFailed: 'Poster generation failed, please try again',
    confirmDelete: 'Delete campaign "',
    confirmDeleteSuffix: '"? This cannot be undone.',
    budgetCardTitle: 'Budget Consumption',
    budgetIndoor: 'Indoor Incentive',
    budgetConsumed: '% consumed',
    budgetRemaining: 'Remaining ฿',
    dataRemark: 'Data is month-to-date cumulative, not from campaign start date',
    progressLoadFail: 'Load failed, backend unavailable',
    progressEmptyTitle: 'No active campaigns',
    progressEmptyDesc: 'Create campaigns in "Campaigns" tab to see live progress here',
    qualified: 'Qualified',
    close: 'close',
    totalEstimated: 'Est. Payout',
    noPersonData: 'No person data',
  },
  th: {
    pageTitle: 'ระบบแรงจูงใจภายใน',
    pageDesc: 'ระบุโอกาสพันธะ · การจัดการแคมเปญ · การติดตามแบบเรียลไทม์',
    tabLeverage: '📊 การวิเคราะห์พันธะ',
    tabCampaigns: '🎯 จัดการแคมเปญ',
    tabProgress: '⚡ ความคืบหน้า',
    statusQualified: 'ผ่านเกณฑ์',
    statusClose: 'ใกล้ถึง',
    statusInProgress: 'กำลังดำเนินการ',
    statusNotStarted: 'ยังไม่เริ่ม',
    campaignActive: 'กำลังดำเนินการ',
    campaignPaused: 'หยุดชั่วคราว',
    campaignCompleted: 'เสร็จสิ้น',
    campaignDeleted: 'ถูกลบ',
    modalCreateTitle: 'สร้างแคมเปญแรงจูงใจ',
    modalEditTitle: 'แก้ไขแคมเปญ',
    fieldCampaignName: 'ชื่อแคมเปญ',
    fieldCampaignNamePlaceholder: 'เช่น แรงจูงใจ CC ประจำเดือน',
    fieldThaiName: 'ชื่อภาษาไทย (ไม่บังคับ)',
    fieldThaiNamePlaceholder: 'ชื่อภาษาไทยสำหรับโปสเตอร์',
    fieldRole: 'บทบาท',
    fieldMetric: 'ตัวชี้วัด',
    fieldCondition: 'เงื่อนไข',
    fieldThreshold: 'เกณฑ์',
    fieldThresholdPlaceholder: 'เช่น 10',
    fieldReward: 'รางวัล (฿)',
    fieldRewardPlaceholder: 'เช่น 500',
    fieldStartDate: 'วันเริ่มต้น (ไม่บังคับ)',
    fieldEndDate: 'วันสิ้นสุด (ไม่บังคับ)',
    btnCancel: 'ยกเลิก',
    btnCreate: 'สร้างแคมเปญ',
    btnUpdate: 'อัปเดตแคมเปญ',
    btnSaving: 'กำลังบันทึก…',
    errNoName: 'กรุณากรอกชื่อแคมเปญ',
    errInvalidThreshold: 'กรุณากรอกเกณฑ์ที่ถูกต้อง',
    errInvalidReward: 'กรุณากรอกจำนวนเงินรางวัลที่ถูกต้อง',
    errDuplicateMetric: 'มีแคมเปญที่ใช้งานอยู่สำหรับตัวชี้วัดนี้แล้ว',
    errSaveFailed: 'บันทึกไม่สำเร็จ',
    leverageDesc: 'ขั้นตอนเหล่านี้มีผลพันธะที่แข็งแกร่งที่สุดต่อรายได้การแนะนำ',
    leverageCurrentPhase: 'ระยะปัจจุบัน: ',
    leverageRemainingDays: ' · เหลือ ',
    leverageRemainingDaysSuffix: ' วันทำงาน',
    leverageScore: 'คะแนนพันธะ',
    leverageRevImpact: 'ผลกระทบรายได้',
    leverageAlreadyCreated: '✓ สร้างแล้ว',
    leverageNextMonth: 'สร้างเดือนหน้า',
    leverageCreateBtn: 'สร้างแคมเปญ',
    leverageEmptyTitle: 'ไม่มีข้อมูลการวิเคราะห์พันธะ',
    leverageEmptyDesc: 'เครื่องมือวิเคราะห์กำลังสร้างข้อมูลพื้นฐาน กรุณารอสักครู่',
    campaignsMgmtDesc: 'จัดการแคมเปญประจำเดือน · แจ้งเตือนอัตโนมัติ · รองรับโปสเตอร์',
    campaignsNewBtn: '+ สร้างแคมเปญ',
    campaignsLoadFail: 'โหลดไม่สำเร็จ ระบบ backend ไม่พร้อมใช้งาน',
    campaignsEmptyTitle: 'ไม่มีแคมเปญ',
    campaignsEmptyDesc: 'คลิก "สร้างแคมเปญ" เพื่อตั้งค่าแผนแรงจูงใจประจำเดือน',
    thCampaignName: 'แคมเปญ',
    thRole: 'บทบาท',
    thMetric: 'ตัวชี้วัด',
    thCondition: 'เงื่อนไข',
    thReward: 'รางวัล',
    thProgress: 'ความคืบหน้า',
    thStatus: 'สถานะ',
    thActions: 'การดำเนินการ',
    actionEdit: 'แก้ไข',
    actionPause: 'หยุดชั่วคราว',
    actionResume: 'ดำเนินการต่อ',
    actionPoster: 'โปสเตอร์',
    actionDelete: 'ลบ',
    posterFailed: 'สร้างโปสเตอร์ไม่สำเร็จ กรุณาลองใหม่',
    confirmDelete: 'ยืนยันการลบแคมเปญ "',
    confirmDeleteSuffix: '"? ไม่สามารถยกเลิกได้',
    budgetCardTitle: 'สถานะการใช้งบประมาณ',
    budgetIndoor: 'แรงจูงใจภายใน',
    budgetConsumed: '% ใช้ไปแล้ว',
    budgetRemaining: 'คงเหลือ ฿',
    dataRemark: 'ข้อมูลเป็นยอดสะสมทั้งเดือน ไม่ใช่นับจากวันเริ่มแคมเปญ',
    progressLoadFail: 'โหลดไม่สำเร็จ ระบบ backend ไม่พร้อมใช้งาน',
    progressEmptyTitle: 'ไม่มีแคมเปญที่ดำเนินการอยู่',
    progressEmptyDesc: 'สร้างแคมเปญในแท็บ "จัดการแคมเปญ" เพื่อดูความคืบหน้า',
    qualified: 'ผ่านเกณฑ์',
    close: 'คน',
    totalEstimated: 'ประมาณการจ่าย',
    noPersonData: 'ไม่มีข้อมูลบุคคล',
  },
};

// ─── 工具函数 ──────────────────────────────────────────────────────────────

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function progressStatusColor(status: PersonProgress['status']): string {
  switch (status) {
    case 'qualified':
      return 'bg-emerald-500';
    case 'close':
      return 'bg-amber-400';
    case 'in_progress':
      return 'bg-blue-400';
    default:
      return 'bg-[var(--border-default)]';
  }
}

function progressStatusBadge(status: PersonProgress['status']): string {
  switch (status) {
    case 'qualified':
      return 'text-emerald-600 bg-emerald-50';
    case 'close':
      return 'text-amber-600 bg-amber-50';
    case 'in_progress':
      return 'text-blue-600 bg-blue-50';
    default:
      return 'text-[var(--text-muted)] bg-[var(--bg-subtle)]';
  }
}

function progressStatusLabel(status: PersonProgress['status']): string {
  switch (status) {
    case 'qualified':
      return '已达标';
    case 'close':
      return '接近';
    case 'in_progress':
      return '进行中';
    default:
      return '未开始';
  }
}

function campaignStatusLabel(status: Campaign['status']): string {
  switch (status) {
    case 'active':
      return '进行中';
    case 'paused':
      return '已暂停';
    case 'completed':
      return '已完成';
    case 'deleted':
      return '已删除';
  }
}

function campaignStatusColor(status: Campaign['status']): string {
  switch (status) {
    case 'active':
      return 'text-emerald-600 bg-emerald-50';
    case 'paused':
      return 'text-amber-600 bg-amber-50';
    case 'completed':
      return 'text-blue-600 bg-blue-50';
    case 'deleted':
      return 'text-[var(--text-muted)] bg-[var(--bg-subtle)]';
  }
}

// ─── 活动 Modal ────────────────────────────────────────────────────────────

interface CampaignModalProps {
  onClose: () => void;
  onSaved: () => void;
  prefill?: Partial<CampaignFormValues>;
  editCampaign?: Campaign;
}

interface CampaignFormValues {
  name: string;
  name_th: string;
  role: 'CC' | 'SS' | 'LP';
  metric: string;
  operator: 'gte' | 'lte' | 'gt' | 'lt';
  threshold: string;
  reward_thb: string;
  start_date: string;
  end_date: string;
}

const OPERATOR_LABELS: Record<string, string> = {
  gte: '≥（大于等于）',
  lte: '≤（小于等于）',
  gt: '>（大于）',
  lt: '<（小于）',
};

function CampaignModal({ onClose, onSaved, prefill, editCampaign }: CampaignModalProps) {
  const month = getCurrentMonth();
  const [form, setForm] = useState<CampaignFormValues>({
    name: editCampaign?.name ?? prefill?.name ?? '',
    name_th: editCampaign?.name_th ?? prefill?.name_th ?? '',
    role: editCampaign?.role ?? (prefill?.role as 'CC' | 'SS' | 'LP') ?? 'CC',
    metric: editCampaign?.metric ?? prefill?.metric ?? 'paid',
    operator:
      (editCampaign?.operator as CampaignFormValues['operator']) ?? prefill?.operator ?? 'gte',
    threshold:
      editCampaign?.threshold != null ? String(editCampaign.threshold) : (prefill?.threshold ?? ''),
    reward_thb:
      editCampaign?.reward_thb != null
        ? String(editCampaign.reward_thb)
        : (prefill?.reward_thb ?? ''),
    start_date: editCampaign?.start_date ?? prefill?.start_date ?? '',
    end_date: editCampaign?.end_date ?? prefill?.end_date ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableMetrics = ROLE_METRICS[form.role] ?? [];

  function handleRoleChange(role: 'CC' | 'SS' | 'LP') {
    const metrics = ROLE_METRICS[role] ?? [];
    setForm((p) => ({
      ...p,
      role,
      metric: metrics[0] ?? '',
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const threshold = parseFloat(form.threshold);
    const reward = parseFloat(form.reward_thb);
    if (!form.name.trim()) {
      setError('请填写活动名称');
      return;
    }
    if (isNaN(threshold)) {
      setError('请填写有效的达标阈值');
      return;
    }
    if (isNaN(reward) || reward <= 0) {
      setError('请填写有效的奖励金额');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = editCampaign
        ? `/api/incentive/campaigns/${editCampaign.id}`
        : '/api/incentive/campaigns';
      const method = editCampaign ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          name_th: form.name_th.trim(),
          role: form.role,
          month,
          metric: form.metric,
          operator: form.operator,
          threshold,
          reward_thb: reward,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        }),
      });
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        setError(body?.detail || '该指标已有进行中的活动');
        setSaving(false);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {editCampaign ? '编辑活动' : '新建激励活动'}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* 活动名称 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              活动名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="如：CC本月冲量激励"
              className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
            />
          </div>

          {/* 泰文名称 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              泰文名称（选填）
            </label>
            <input
              type="text"
              value={form.name_th}
              onChange={(e) => setForm((p) => ({ ...p, name_th: e.target.value }))}
              placeholder="泰语名称，用于海报"
              className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 角色 */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                岗位 <span className="text-red-400">*</span>
              </label>
              <select
                value={form.role}
                onChange={(e) => handleRoleChange(e.target.value as 'CC' | 'SS' | 'LP')}
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
              >
                <option value="CC">CC（前端销售）</option>
                <option value="SS">SS（后端销售）</option>
                <option value="LP">LP（后端服务）</option>
              </select>
            </div>

            {/* 指标 */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                考核指标 <span className="text-red-400">*</span>
              </label>
              <select
                value={form.metric}
                onChange={(e) => setForm((p) => ({ ...p, metric: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
              >
                {availableMetrics.map((m) => (
                  <option key={m} value={m}>
                    {METRIC_LABELS[m] ?? m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 运算符 */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                条件 <span className="text-red-400">*</span>
              </label>
              <select
                value={form.operator}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    operator: e.target.value as CampaignFormValues['operator'],
                  }))
                }
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
              >
                {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* 阈值 */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                达标阈值 <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={form.threshold}
                onChange={(e) => setForm((p) => ({ ...p, threshold: e.target.value }))}
                placeholder="如 10"
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm font-mono bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
              />
            </div>
          </div>

          {/* 奖励 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              奖励金额（฿） <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={form.reward_thb}
              onChange={(e) => setForm((p) => ({ ...p, reward_thb: e.target.value }))}
              placeholder="如 500"
              className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm font-mono bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 开始日期 */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                开始日期（选填）
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
              />
            </div>

            {/* 结束日期 */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                结束日期（选填）
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-action text-white rounded-lg text-sm font-medium hover:bg-action-active transition-colors disabled:opacity-50"
            >
              {saving ? '保存中…' : editCampaign ? '更新活动' : '创建活动'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab 1: 杠杆分析 ───────────────────────────────────────────────────────

function LeverageTab() {
  const {
    data: raw,
    isLoading,
    error,
  } = useSWR<{
    levers: LeverRecommendation[];
    phase?: string;
    phase_label?: string;
    remaining_workdays?: number;
    note?: string;
  }>('/api/incentive/recommend', swrFetcher);
  const data = raw?.levers ?? [];
  const month = getCurrentMonth();
  const { data: campaigns, mutate: mutateCampaigns } = useSWR<Campaign[]>(
    `/api/incentive/campaigns?month=${month}`,
    swrFetcher
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [prefill, setPrefill] = useState<Partial<CampaignFormValues>>({});

  function hasExisting(metric: string): boolean {
    return (campaigns ?? []).some((c) => c.metric === metric && c.status === 'active');
  }

  function openCreateFromRec(rec: LeverRecommendation) {
    const sg = rec.suggested_campaign;
    const role = sg?.role as 'CC' | 'SS' | 'LP' | undefined;
    setPrefill({
      name: sg?.name ?? '',
      name_th: sg?.name_th ?? '',
      role: role,
      metric: sg?.metric,
      threshold: sg?.threshold != null ? String(sg.threshold) : undefined,
      reward_thb: sg?.reward_thb != null ? String(sg.reward_thb) : undefined,
      start_date: sg?.start_date ?? '',
      end_date: sg?.end_date ?? '',
    });
    setModalOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <Spinner size="lg" />
          <p className="text-sm text-[var(--text-muted)]">正在分析杠杆机会…</p>
        </div>
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <div className="py-16 text-center space-y-2">
        <p className="text-4xl">📊</p>
        <p className="text-sm font-medium text-[var(--text-primary)]">暂无杠杆分析数据</p>
        <p className="text-xs text-[var(--text-muted)]">
          后端分析引擎正在建立基线数据，稍后再来查看
        </p>
      </div>
    );
  }

  const top3 = data.slice(0, 3);
  const maxScore = Math.max(...top3.map((r) => r.leverage_score), 1);

  return (
    <div className="space-y-3">
      <div className="text-xs text-[var(--text-muted)] space-y-1">
        <p>以下阶段对转介绍业绩的杠杆效应最强，建议优先在此设置激励活动。</p>
        {raw?.phase_label && (
          <p className="font-medium text-[var(--text-secondary)]">
            当前阶段：{raw.phase_label}
            {raw.remaining_workdays != null && ` · 剩余 ${raw.remaining_workdays} 个工作日`}
          </p>
        )}
        {raw?.note && <p className="text-amber-600">{raw.note}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {top3.map((rec) => {
          const sg = rec.suggested_campaign;
          const alreadyCreated = hasExisting(sg?.metric ?? '');
          return (
            <div key={rec.rank} className="card-base p-4 space-y-3">
              {/* 排名 + 阶段 */}
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-action text-white text-xs flex items-center justify-center font-bold">
                  {rec.rank}
                </span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {rec.stage_label ?? rec.stage}
                </span>
              </div>

              {/* 杠杆评分进度条 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-muted)]">杠杆评分</span>
                  <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                    {(rec.leverage_score ?? 0).toFixed(1)}
                  </span>
                </div>
                <div className="h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-action rounded-full transition-all"
                    style={{ width: `${(rec.leverage_score / maxScore) * 100}%` }}
                  />
                </div>
              </div>

              {/* 增量金额 */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[var(--text-muted)]">业绩增量</span>
                <span className="font-mono font-semibold text-emerald-600">
                  +${rec.revenue_impact_usd.toLocaleString()}
                </span>
              </div>

              {/* 转化率对比 */}
              {rec.current_rate != null && rec.target_rate != null && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-mono text-[var(--text-muted)]">
                    {formatRate(rec.current_rate)}
                  </span>
                  <span className="text-[var(--text-muted)]">→</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {formatRate(rec.target_rate)}
                  </span>
                </div>
              )}

              {/* 推荐理由 */}
              {sg?.rationale && (
                <p className="text-[10px] text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-subtle)] pt-2">
                  {sg.rationale}
                </p>
              )}

              {/* 创建活动按钮（时间感知） */}
              {alreadyCreated ? (
                <div className="w-full py-1.5 text-xs font-medium text-[var(--text-muted)] border border-[var(--border-default)] rounded-lg text-center">
                  ✓ 已创建
                </div>
              ) : rec.actionable === false ? (
                <div className="w-full py-1.5 text-xs text-center space-y-0.5">
                  <div className="font-medium text-[var(--text-muted)] border border-[var(--border-default)] rounded-lg py-1.5">
                    下月初创建
                  </div>
                  {rec.action_note && (
                    <p className="text-[10px] text-[var(--text-muted)]">{rec.action_note}</p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => openCreateFromRec(rec)}
                  className="w-full py-1.5 text-xs font-medium text-action border border-action rounded-lg hover:bg-action hover:text-white transition-colors"
                >
                  创建活动
                </button>
              )}
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <CampaignModal
          prefill={prefill}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            await mutateCampaigns();
          }}
        />
      )}
    </div>
  );
}

// ─── Tab 2: 活动管理 ───────────────────────────────────────────────────────

function CampaignsTab() {
  const month = getCurrentMonth();
  const { data, isLoading, error, mutate } = useSWR<Campaign[]>(
    `/api/incentive/campaigns?month=${month}`,
    swrFetcher
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Campaign | undefined>();

  async function handlePauseResume(c: Campaign) {
    const nextStatus = c.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`/api/incentive/campaigns/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
    } catch {
      // 静默失败，UI 不更新
    }
  }

  async function handleDelete(c: Campaign) {
    if (!confirm(`确认删除活动"${c.name}"？此操作不可恢复。`)) return;
    try {
      const res = await fetch(`/api/incentive/campaigns/${c.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
    } catch {
      // 静默失败
    }
  }

  async function handleGeneratePoster(c: Campaign) {
    try {
      const res = await fetch(`/api/incentive/campaigns/${c.id}/poster`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      alert('海报生成失败，请稍后重试');
    }
  }

  function openCreate() {
    setEditTarget(undefined);
    setModalOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditTarget(c);
    setModalOpen(true);
  }

  const campaigns = data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">
          管理当月激励活动，达标自动通知 · 支持海报生成
        </p>
        <button onClick={openCreate} className="btn-primary px-3 py-1.5 text-xs font-medium">
          + 新建活动
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      )}

      {error && (
        <div className="py-4 text-center text-sm text-[var(--text-muted)]">
          加载失败，后端接口暂不可用
        </div>
      )}

      {!isLoading && campaigns.length === 0 && (
        <div className="py-12 text-center space-y-2">
          <p className="text-3xl">🎯</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">暂无激励活动</p>
          <p className="text-xs text-[var(--text-muted)]">点击「新建活动」开始设置本月激励方案</p>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th text-left">活动名称</th>
                <th className="slide-th text-center">岗位</th>
                <th className="slide-th text-left">指标</th>
                <th className="slide-th text-left">条件</th>
                <th className="slide-th text-right">奖励</th>
                <th className="slide-th text-center">进度</th>
                <th className="slide-th text-center">状态</th>
                <th className="slide-th text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="slide-td font-medium">
                    <div>{c.name}</div>
                    {c.name_th && (
                      <div className="text-[10px] text-[var(--text-muted)]">{c.name_th}</div>
                    )}
                  </td>
                  <td className="slide-td text-center">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                      {c.role}
                    </span>
                  </td>
                  <td className="slide-td text-[var(--text-secondary)]">
                    {METRIC_LABELS[c.metric] ?? c.metric}
                  </td>
                  <td className="slide-td font-mono text-xs">
                    {c.operator === 'gte'
                      ? '≥'
                      : c.operator === 'lte'
                        ? '≤'
                        : c.operator === 'gt'
                          ? '>'
                          : '<'}{' '}
                    {c.threshold}
                  </td>
                  <td className="slide-td text-right font-mono font-semibold text-emerald-700">
                    ฿{c.reward_thb.toLocaleString()}
                  </td>
                  <td className="slide-td text-center text-xs">
                    {(c as Campaign & { qualified_count?: number; total_count?: number })
                      .qualified_count != null ? (
                      <span className="font-mono">
                        {
                          (c as Campaign & { qualified_count?: number; total_count?: number })
                            .qualified_count
                        }
                        /
                        {(c as Campaign & { qualified_count?: number; total_count?: number })
                          .total_count ?? '—'}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="slide-td text-center">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${campaignStatusColor(c.status)}`}
                    >
                      {campaignStatusLabel(c.status)}
                    </span>
                  </td>
                  <td className="slide-td">
                    <div className="flex items-center gap-1.5 justify-center">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handlePauseResume(c)}
                        className="text-[10px] text-[var(--text-secondary)] hover:text-amber-600 transition-colors"
                      >
                        {c.status === 'active' ? '暂停' : '恢复'}
                      </button>
                      <button
                        onClick={() => handleGeneratePoster(c)}
                        className="text-[10px] text-[var(--text-secondary)] hover:text-blue-600 transition-colors"
                      >
                        海报
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="text-[10px] text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <CampaignModal
          editCampaign={editTarget}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            await mutate();
          }}
        />
      )}
    </div>
  );
}

// ─── 进度条组件 ────────────────────────────────────────────────────────────

function ProgressBar({ pct, status }: { pct: number; status: PersonProgress['status'] }) {
  const clampedPct = Math.min(100, Math.max(0, pct));
  return (
    <div className="h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden flex-1">
      <div
        className={`h-full rounded-full transition-all ${progressStatusColor(status)}`}
        style={{ width: `${clampedPct}%` }}
      />
    </div>
  );
}

// ─── 活动进度卡片 ──────────────────────────────────────────────────────────

function CampaignProgressCard({ item }: { item: CampaignProgress }) {
  const { campaign, records, qualified_count, close_count, total_estimated_thb } = item;

  return (
    <div className="card-base p-4 space-y-3">
      {/* 标题行 */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{campaign.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[var(--text-muted)]">{campaign.role}</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {METRIC_LABELS[campaign.metric] ?? campaign.metric}{' '}
              {campaign.operator === 'gte'
                ? '≥'
                : campaign.operator === 'lte'
                  ? '≤'
                  : campaign.operator === 'gt'
                    ? '>'
                    : '<'}{' '}
              {campaign.threshold}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-mono text-emerald-600 font-semibold">
            已达标 {qualified_count} 人
          </div>
          {close_count > 0 && (
            <div className="text-[10px] text-amber-500">接近 {close_count} 人</div>
          )}
        </div>
      </div>

      {/* 预计发放 */}
      <div className="flex items-center gap-1.5 text-xs py-1 px-2 bg-[var(--bg-subtle)] rounded">
        <span className="text-[var(--text-muted)]">预计发放</span>
        <span className="font-mono font-semibold text-[var(--text-primary)]">
          ฿{total_estimated_thb.toLocaleString()}
        </span>
        <span className="text-[var(--text-muted)]">
          （฿{campaign.reward_thb.toLocaleString()} × {qualified_count} 人）
        </span>
      </div>

      {/* 人员进度列表 */}
      {records.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] py-2 text-center">暂无人员数据</p>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={`${r.person_name}-${r.team}`} className="flex items-center gap-2">
              {/* 姓名 + 团队 */}
              <div className="w-24 shrink-0">
                <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {r.person_name}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">{r.team}</div>
              </div>

              {/* 进度条 */}
              <ProgressBar pct={r.progress_pct * 100} status={r.status} />

              {/* 数值 */}
              <div className="w-12 text-right shrink-0">
                <span className="text-xs font-mono text-[var(--text-primary)]">
                  {r.metric_value ?? 0}/{r.threshold}
                </span>
              </div>

              {/* 状态标签 */}
              <div className="w-14 shrink-0">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${progressStatusBadge(r.status)}`}
                >
                  {r.status === 'qualified'
                    ? `฿${r.reward_thb.toLocaleString()}`
                    : progressStatusLabel(r.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: 实时进度 ───────────────────────────────────────────────────────

function ProgressTab() {
  const month = getCurrentMonth();
  const {
    data: progressData,
    isLoading: progressLoading,
    error: progressError,
  } = useSWR<CampaignProgress[]>(`/api/incentive/progress?month=${month}`, swrFetcher);
  const { data: budget, isLoading: budgetLoading } = useSWR<IncentiveBudget>(
    '/api/incentive/budget',
    swrFetcher
  );

  // 计算内场已消耗（所有活动 qualified_count × reward_thb 之和）
  const totalSpent = progressData
    ? progressData.reduce((sum, item) => sum + item.total_estimated_thb, 0)
    : 0;
  const indoorBudget = budget?.indoor_budget_thb ?? 0;
  const spentPct = indoorBudget > 0 ? Math.min(100, (totalSpent / indoorBudget) * 100) : 0;

  const items = progressData ?? [];

  return (
    <div className="space-y-4">
      {/* 预算状态条 */}
      {(!budgetLoading || budget) && (
        <Card title="预算消耗状态">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-medium">内场激励</span>
                <span className="font-mono text-[var(--text-primary)]">
                  ฿{totalSpent.toLocaleString()} / ฿{indoorBudget.toLocaleString()}
                </span>
              </div>
              <div className="h-2.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    spentPct >= 90
                      ? 'bg-red-500'
                      : spentPct >= 70
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${spentPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>{spentPct.toFixed(1)}% 已消耗</span>
                {indoorBudget > 0 && (
                  <span>剩余 ฿{Math.max(0, indoorBudget - totalSpent).toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 数据口径说明 */}
      <p className="text-xs text-[var(--text-muted)]">
        数据为当月累计（ข้อมูลเป็นยอดสะสมทั้งเดือน），并非从活动开始日起算
      </p>

      {/* 活动进度列表 */}
      {progressLoading && (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      )}

      {progressError && (
        <div className="py-4 text-center text-sm text-[var(--text-muted)]">
          加载失败，后端接口暂不可用
        </div>
      )}

      {!progressLoading && items.length === 0 && (
        <div className="py-12 text-center space-y-2">
          <p className="text-3xl">🏆</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">暂无进行中的活动</p>
          <p className="text-xs text-[var(--text-muted)]">
            在「活动管理」中创建活动后，实时进度将在此展示
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {items.map((item) => (
          <CampaignProgressCard key={item.campaign.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────────

type TabKey = 'leverage' | 'campaigns' | 'progress';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'leverage', label: '📊 杠杆分析' },
  { key: 'campaigns', label: '🎯 活动管理' },
  { key: 'progress', label: '⚡ 实时进度' },
];

export default function IncentiveTrackingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('leverage');

  return (
    <div className="space-y-4">
      {/* 页头 */}
      <div>
        <h1 className="page-title">内场激励系统</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          杠杆机会识别 · 激励活动管理 · 实时达标追踪
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 p-1 bg-[var(--bg-subtle)] rounded-lg w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'leverage' && <LeverageTab />}
      {activeTab === 'campaigns' && <CampaignsTab />}
      {activeTab === 'progress' && <ProgressTab />}
    </div>
  );
}

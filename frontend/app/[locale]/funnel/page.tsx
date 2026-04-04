'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';

const I18N = {
  zh: {
    pageTitle: '漏斗分析',
    pageSubtitle: '各环节目标 vs 实际 · 场景推演',
    loadFailed: '数据加载失败',
    loadFailedDesc: '无法获取漏斗数据，请检查后端服务',
    retry: '重试',
    funnelDiagnosis: '💡 漏斗诊断',
    bottleneckPrefix: '转化瓶颈在',
    bottleneckSuffix: '环节，达成率',
    bestSuffix: '环节达成率最高（',
    colorLegend: '颜色：',
    colorGreen: '绿≥100%',
    colorOrange: '橙80-100%',
    colorRed: '红<80%',
    colorSuffix: '（达成率）',
    invitationFunnelTitle: '完整邀约漏斗（注册 → 邀约 → 出席 → 付费）',
    invitationTotal: '邀约总数',
    regToInvRate: '注册→邀约率',
    invToShowRate: '邀约→出席率',
    colStage: '环节',
    colTarget: '目标',
    colActual: '实际',
    colGap: '差距',
    colAchRate: '达成率',
    colConvRate: '转化率',
    achTooltip: '≥100%=绿（已达标）、80-100%=橙（追进）、<80%=红（落后）',
    convTooltip: '上一环节→下一环节的转化比例，越高越好；出席付费率行业参考≥25%',
    funnelAchTitle: '漏斗各环节达成',
    emptyFunnel: '暂无漏斗数据',
    emptyFunnelDesc: '上传数据后自动刷新',
    convChartTitle: '各环节转化率对比',
    scenarioTitle: '场景推演：提升转化率影响',
    emptyScenario: '暂无场景数据',
    emptyScenarioDesc: '场景推演需要漏斗基础数据',
    colCurrentRate: '当前转化率',
    colScenarioRate: '场景转化率',
    scenarioRateTooltip: '目标提升率，基于历史优秀水位或行业基准，非当前实际值',
    colImpactReg: '影响注册数',
    colImpactPay: '影响付费数',
    colImpactRev: '影响业绩',
    impactRevTooltip: '若转化率达到场景率，预计月度额外增加的业绩（基于当前漏斗乘算）',
    exportStageLabel: '环节',
    exportTargetLabel: '目标',
    exportActualLabel: '实际',
    exportGapLabel: '差距',
    exportAchLabel: '达成率',
    exportConvLabel: '转化率',
    // stage 名映射（后端返回中文，前端按 locale 转换）
    stage_转介绍注册数: '转介绍注册数',
    stage_预约数: '预约数',
    stage_出席数: '出席数',
    stage_转介绍付费数: '转介绍付费数',
    stage_注册预约率: '注册预约率',
    stage_预约出席率: '预约出席率',
    stage_出席付费率: '出席付费率',
  },
  'zh-TW': {
    pageTitle: '漏斗分析',
    pageSubtitle: '各環節目標 vs 實際 · 場景推演',
    loadFailed: '資料載入失敗',
    loadFailedDesc: '無法取得漏斗資料，請檢查後端服務',
    retry: '重試',
    funnelDiagnosis: '💡 漏斗診斷',
    bottleneckPrefix: '轉化瓶頸在',
    bottleneckSuffix: '環節，達成率',
    bestSuffix: '環節達成率最高（',
    colorLegend: '顏色：',
    colorGreen: '綠≥100%',
    colorOrange: '橙80-100%',
    colorRed: '紅<80%',
    colorSuffix: '（達成率）',
    invitationFunnelTitle: '完整邀約漏斗（註冊 → 邀約 → 出席 → 付費）',
    invitationTotal: '邀約總數',
    regToInvRate: '註冊→邀約率',
    invToShowRate: '邀約→出席率',
    colStage: '環節',
    colTarget: '目標',
    colActual: '實際',
    colGap: '差距',
    colAchRate: '達成率',
    colConvRate: '轉化率',
    achTooltip: '≥100%=綠（已達標）、80-100%=橙（追進）、<80%=紅（落後）',
    convTooltip: '上一環節→下一環節的轉化比例，越高越好；出席付費率行業參考≥25%',
    funnelAchTitle: '漏斗各環節達成',
    emptyFunnel: '暫無漏斗資料',
    emptyFunnelDesc: '上傳資料後自動刷新',
    convChartTitle: '各環節轉化率對比',
    scenarioTitle: '場景推演：提升轉化率影響',
    emptyScenario: '暫無場景資料',
    emptyScenarioDesc: '場景推演需要漏斗基礎資料',
    colCurrentRate: '當前轉化率',
    colScenarioRate: '場景轉化率',
    scenarioRateTooltip: '目標提升率，基於歷史優秀水位或行業基準，非當前實際值',
    colImpactReg: '影響註冊數',
    colImpactPay: '影響付費數',
    colImpactRev: '影響業績',
    impactRevTooltip: '若轉化率達到場景率，預計月度額外增加的業績（基於當前漏斗乘算）',
    exportStageLabel: '環節',
    exportTargetLabel: '目標',
    exportActualLabel: '實際',
    exportGapLabel: '差距',
    exportAchLabel: '達成率',
    exportConvLabel: '轉化率',
    stage_转介绍注册数: '轉介紹註冊數',
    stage_预约数: '預約數',
    stage_出席数: '出席數',
    stage_转介绍付费数: '轉介紹付費數',
    stage_注册预约率: '註冊預約率',
    stage_预约出席率: '預約出席率',
    stage_出席付费率: '出席付費率',
  },
  en: {
    pageTitle: 'Funnel Analysis',
    pageSubtitle: 'Target vs Actual by Stage · Scenario Simulation',
    loadFailed: 'Load Failed',
    loadFailedDesc: 'Cannot load funnel data, please check the backend service',
    retry: 'Retry',
    funnelDiagnosis: '💡 Funnel Diagnosis',
    bottleneckPrefix: 'Bottleneck at ',
    bottleneckSuffix: ' stage, achievement rate ',
    bestSuffix: ' stage has highest achievement rate (',
    colorLegend: 'Color: ',
    colorGreen: 'Green ≥100%',
    colorOrange: 'Orange 80-100%',
    colorRed: 'Red <80%',
    colorSuffix: ' (achievement rate)',
    invitationFunnelTitle: 'Full Invitation Funnel (Register → Invite → Attend → Pay)',
    invitationTotal: 'Total Invitations',
    regToInvRate: 'Register→Invite Rate',
    invToShowRate: 'Invite→Attend Rate',
    colStage: 'Stage',
    colTarget: 'Target',
    colActual: 'Actual',
    colGap: 'Gap',
    colAchRate: 'Achievement',
    colConvRate: 'Conversion',
    achTooltip: '≥100%=Green (On target), 80-100%=Orange (Catching up), <80%=Red (Behind)',
    convTooltip: 'Conversion from previous stage; industry benchmark for attend→pay ≥25%',
    funnelAchTitle: 'Stage Achievement',
    emptyFunnel: 'No Funnel Data',
    emptyFunnelDesc: 'Will refresh automatically after data upload',
    convChartTitle: 'Conversion Rate by Stage',
    scenarioTitle: 'Scenario Simulation: Impact of Improving Conversion',
    emptyScenario: 'No Scenario Data',
    emptyScenarioDesc: 'Scenario simulation requires funnel base data',
    colCurrentRate: 'Current Rate',
    colScenarioRate: 'Scenario Rate',
    scenarioRateTooltip: 'Target improvement rate based on historical best or industry benchmark',
    colImpactReg: 'Impact (Registrations)',
    colImpactPay: 'Impact (Payments)',
    colImpactRev: 'Impact (Revenue)',
    impactRevTooltip: 'Estimated additional monthly revenue if conversion reaches scenario rate',
    exportStageLabel: 'Stage',
    exportTargetLabel: 'Target',
    exportActualLabel: 'Actual',
    exportGapLabel: 'Gap',
    exportAchLabel: 'Achievement',
    exportConvLabel: 'Conversion',
    stage_转介绍注册数: 'Referral Registrations',
    stage_预约数: 'Appointments',
    stage_出席数: 'Attendances',
    stage_转介绍付费数: 'Referral Payments',
    stage_注册预约率: 'Reg→Appt Rate',
    stage_预约出席率: 'Appt→Attend Rate',
    stage_出席付费率: 'Attend→Pay Rate',
  },
  th: {
    pageTitle: 'การวิเคราะห์ Funnel',
    pageSubtitle: 'เป้าหมาย vs จริงในแต่ละขั้นตอน · การจำลองสถานการณ์',
    loadFailed: 'โหลดข้อมูลล้มเหลว',
    loadFailedDesc: 'ไม่สามารถโหลดข้อมูล Funnel กรุณาตรวจสอบบริการ backend',
    retry: 'ลองใหม่',
    funnelDiagnosis: '💡 วิเคราะห์ Funnel',
    bottleneckPrefix: 'จุดคอขวดอยู่ที่ขั้น ',
    bottleneckSuffix: ' อัตราการบรรลุ ',
    bestSuffix: ' ขั้นมีอัตราการบรรลุสูงสุด (',
    colorLegend: 'สี: ',
    colorGreen: 'เขียว ≥100%',
    colorOrange: 'ส้ม 80-100%',
    colorRed: 'แดง <80%',
    colorSuffix: ' (อัตราการบรรลุ)',
    invitationFunnelTitle: 'Funnel เชิญชวนครบวงจร (ลงทะเบียน → เชิญชวน → เข้าร่วม → ชำระเงิน)',
    invitationTotal: 'การเชิญชวนทั้งหมด',
    regToInvRate: 'อัตราลงทะเบียน→เชิญชวน',
    invToShowRate: 'อัตราเชิญชวน→เข้าร่วม',
    colStage: 'ขั้นตอน',
    colTarget: 'เป้าหมาย',
    colActual: 'จริง',
    colGap: 'ส่วนต่าง',
    colAchRate: 'อัตราบรรลุ',
    colConvRate: 'อัตราแปลง',
    achTooltip: '≥100%=เขียว (บรรลุ), 80-100%=ส้ม (กำลังไล่), <80%=แดง (ล้าหลัง)',
    convTooltip: 'การแปลงจากขั้นก่อนหน้า; มาตรฐานอุตสาหกรรมสำหรับเข้าร่วม→ชำระ ≥25%',
    funnelAchTitle: 'การบรรลุในแต่ละขั้น',
    emptyFunnel: 'ไม่มีข้อมูล Funnel',
    emptyFunnelDesc: 'จะรีเฟรชอัตโนมัติหลังอัปโหลดข้อมูล',
    convChartTitle: 'อัตราแปลงในแต่ละขั้น',
    scenarioTitle: 'จำลองสถานการณ์: ผลกระทบจากการปรับปรุงอัตราแปลง',
    emptyScenario: 'ไม่มีข้อมูลสถานการณ์',
    emptyScenarioDesc: 'การจำลองสถานการณ์ต้องการข้อมูล Funnel พื้นฐาน',
    colCurrentRate: 'อัตราปัจจุบัน',
    colScenarioRate: 'อัตราสถานการณ์',
    scenarioRateTooltip: 'อัตราเป้าหมายตามประวัติที่ดีที่สุดหรือมาตรฐานอุตสาหกรรม',
    colImpactReg: 'ผลกระทบ (ลงทะเบียน)',
    colImpactPay: 'ผลกระทบ (ชำระเงิน)',
    colImpactRev: 'ผลกระทบ (รายได้)',
    impactRevTooltip: 'รายได้เพิ่มเติมต่อเดือนที่คาดการณ์หากอัตราแปลงถึงระดับสถานการณ์',
    exportStageLabel: 'ขั้นตอน',
    exportTargetLabel: 'เป้าหมาย',
    exportActualLabel: 'จริง',
    exportGapLabel: 'ส่วนต่าง',
    exportAchLabel: 'อัตราบรรลุ',
    exportConvLabel: 'อัตราแปลง',
    stage_转介绍注册数: 'จำนวนลงทะเบียนแนะนำ',
    stage_预约数: 'จำนวนนัดหมาย',
    stage_出席数: 'จำนวนเข้าร่วม',
    stage_转介绍付费数: 'จำนวนชำระเงินแนะนำ',
    stage_注册预约率: 'อัตราลงทะเบียน→นัดหมาย',
    stage_预约出席率: 'อัตรานัดหมาย→เข้าร่วม',
    stage_出席付费率: 'อัตราเข้าร่วม→ชำระเงิน',
  },
} as const;
import { formatRate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';
import { BrandDot } from '@/components/ui/BrandDot';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import type { FunnelResult, ScenarioResult } from '@/lib/types/funnel';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// 带邀约节点的完整漏斗类型
interface InvitationFunnelStage {
  name: string;
  target: number | null;
  actual: number | null;
  gap: number | null;
  achievement_rate: number | null;
  conversion_rate?: number | null;
}

interface InvitationStats {
  invitation_count: number | null;
  registration_invitation_rate: number | null;
  invitation_showup_rate: number | null;
}

interface InvitationFunnelResponse {
  stages: InvitationFunnelStage[];
  invitation: InvitationStats | null;
}

const GAP_COLORS: Record<string, string> = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#94a3b8',
};

function gapColor(gap: number) {
  if (gap > 0) return GAP_COLORS.positive;
  if (gap < 0) return GAP_COLORS.negative;
  return GAP_COLORS.neutral;
}

interface FunnelResponse {
  funnel: FunnelResult;
  scenario: ScenarioResult[];
}

export default function FunnelPage() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    channel: true,
  });
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  /** 将后端返回的中文 stage 名转换为当前 locale 对应标签，未命中时原样展示 */
  function stageName(name: string): string {
    const key = `stage_${name}` as keyof typeof t;
    return (t[key] as string | undefined) ?? name;
  }
  const {
    data: funnelData,
    isLoading: fLoading,
    error: fError,
    mutate: fMutate,
  } = useFilteredSWR<FunnelResult>('/api/funnel');
  const { data: scenarioRaw, isLoading: sLoading } = useFilteredSWR('/api/funnel/scenario');
  const { data: invitationData } = useFilteredSWR<InvitationFunnelResponse>(
    '/api/funnel/with-invitation'
  );
  const { exportCSV } = useExport();

  const isLoading = fLoading || sLoading;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-40 animate-pulse rounded-md bg-[var(--n-200)]" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-20" />
          ))}
        </div>
        <SkeletonChart className="h-48 w-full" />
      </div>
    );
  }

  if (fError) {
    return (
      <EmptyState
        title={t.loadFailed}
        description={t.loadFailedDesc}
        action={{ label: t.retry, onClick: () => fMutate() }}
      />
    );
  }

  const stages = (funnelData?.stages ?? []).filter((s) => s.target != null || s.actual != null);

  // 后端直接返回兼容字段（stage/current_rate/scenario_rate/impact_*），无需 workaround 映射
  const scenarioList: ScenarioResult[] = scenarioRaw
    ? ([scenarioRaw].flat() as Record<string, unknown>[]).map((s) => ({
        stage: (s.stage ?? '') as string,
        current_rate: (s.current_rate ?? 0) as number,
        scenario_rate: (s.scenario_rate ?? 0) as number,
        impact_registrations: (s.impact_registrations ?? 0) as number,
        impact_payments: (s.impact_payments ?? 0) as number,
        impact_revenue: (s.impact_revenue ?? 0) as number,
      }))
    : [];
  // 仅展示有 stage 名称的条目（过滤无效空对象）
  const scenarios = scenarioList.filter((s) => !!s.stage);

  const conversionChartData = stages
    .filter((s) => s.conversion_rate !== undefined)
    .map((s) => ({
      name: stageName(s.name),
      actual: Number(((s.conversion_rate ?? 0) * 100).toFixed(1)),
      target: Number(((s.target_rate ?? 0) * 100).toFixed(1)),
      // rate_gap 后端未提供时，用 actual 转化率 vs target_rate 的差值着色；
      // 若 target_rate 也不存在，则用 conversion_rate 绝对值（>0 为绿色）
      gap:
        s.rate_gap != null
          ? s.rate_gap
          : s.target_rate != null
            ? (s.conversion_rate ?? 0) - s.target_rate
            : (s.conversion_rate ?? 0),
    }));

  // 带邀约节点的完整漏斗
  const invitationStages = invitationData?.stages ?? [];
  const invitationStats = invitationData?.invitation ?? null;

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    const exportStages = (funnelData?.stages ?? []).filter(
      (s) => s.target != null || s.actual != null
    );
    exportCSV(
      exportStages as unknown as Record<string, unknown>[],
      [
        { key: 'name', label: t.exportStageLabel },
        { key: 'target', label: t.exportTargetLabel },
        { key: 'actual', label: t.exportActualLabel },
        { key: 'gap', label: t.exportGapLabel },
        { key: 'achievement_rate', label: t.exportAchLabel },
        { key: 'conversion_rate', label: t.exportConvLabel },
      ],
      `漏斗分析_${today}`
    );
  }

  // 找转化率最低的环节作为瓶颈
  const bottleneckStage = stages
    .filter((s) => s.achievement_rate != null)
    .sort((a, b) => (a.achievement_rate ?? 1) - (b.achievement_rate ?? 1))[0];
  const bestStage = stages
    .filter((s) => s.achievement_rate != null)
    .sort((a, b) => (b.achievement_rate ?? 0) - (a.achievement_rate ?? 0))[0];

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="page-title">{t.pageTitle}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t.pageSubtitle}</p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      {/* 漏斗 insight 卡片 */}
      {bottleneckStage && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--border-default)] border-l-4 border-l-amber-400 bg-[var(--color-warning-surface)] px-4 py-3">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {t.funnelDiagnosis}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {t.bottleneckPrefix}{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {stageName(bottleneckStage.name)}
            </span>{' '}
            {t.bottleneckSuffix}{' '}
            <span className="text-[var(--color-danger)] font-semibold">
              {bottleneckStage.achievement_rate != null
                ? `${Math.round(bottleneckStage.achievement_rate * 100)}%`
                : '—'}
            </span>
            {bestStage && bestStage.name !== bottleneckStage.name && (
              <>
                ；{stageName(bestStage.name)} {t.bestSuffix}
                <span className="text-[var(--color-success)] font-semibold">
                  {bestStage.achievement_rate != null
                    ? `${Math.round(bestStage.achievement_rate * 100)}%`
                    : '—'}
                </span>
                ）
              </>
            )}
            。
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            {t.colorLegend}
            <span className="text-[var(--color-success)] font-medium">{t.colorGreen}</span> ·{' '}
            <span className="text-[var(--color-warning)] font-medium">{t.colorOrange}</span> ·{' '}
            <span className="text-[var(--color-danger)] font-medium">{t.colorRed}</span>
            {t.colorSuffix}
          </p>
        </div>
      )}

      {/* 带邀约节点的完整 4 段漏斗 */}
      {(invitationStages.length > 0 || invitationStats) && (
        <Card title={t.invitationFunnelTitle}>
          {/* 邀约汇总指标 */}
          {invitationStats && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-[var(--bg-subtle)] rounded-lg p-3">
                <p className="text-xs text-[var(--text-muted)] mb-1">{t.invitationTotal}</p>
                <p className="text-xl font-bold text-[var(--text-primary)] font-mono tabular-nums">
                  {(invitationStats.invitation_count ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-[var(--bg-subtle)] rounded-lg p-3">
                <p className="text-xs text-[var(--text-muted)] mb-1">{t.regToInvRate}</p>
                <p className="text-xl font-bold text-[var(--text-primary)] font-mono tabular-nums">
                  {invitationStats.registration_invitation_rate != null
                    ? formatRate(invitationStats.registration_invitation_rate)
                    : '—'}
                </p>
              </div>
              <div className="bg-[var(--bg-subtle)] rounded-lg p-3">
                <p className="text-xs text-[var(--text-muted)] mb-1">{t.invToShowRate}</p>
                <p className="text-xl font-bold text-[var(--text-primary)] font-mono tabular-nums">
                  {invitationStats.invitation_showup_rate != null
                    ? formatRate(invitationStats.invitation_showup_rate)
                    : '—'}
                </p>
              </div>
            </div>
          )}
          {invitationStages.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="slide-thead-row">
                    <th className="slide-th text-left">{t.colStage}</th>
                    <th className="slide-th text-right">{t.colTarget}</th>
                    <th className="slide-th text-right">{t.colActual}</th>
                    <th className="slide-th text-right">{t.colGap}</th>
                    <th className="slide-th text-right">
                      <span className="inline-flex items-center justify-end gap-1">
                        {t.colAchRate}
                        <BrandDot tooltip={t.achTooltip} />
                      </span>
                    </th>
                    <th className="slide-th text-right">
                      <span className="inline-flex items-center justify-end gap-1">
                        {t.colConvRate}
                        <BrandDot tooltip={t.convTooltip} />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invitationStages.map((s, i) => (
                    <tr key={s.name} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                      <td className="slide-td font-medium">{stageName(s.name)}</td>
                      <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                        {s.target != null
                          ? s.name.includes('率')
                            ? formatRate(s.target)
                            : s.target.toLocaleString()
                          : '—'}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums font-semibold">
                        {s.actual != null
                          ? s.name.includes('率')
                            ? formatRate(s.actual)
                            : s.actual.toLocaleString()
                          : '—'}
                      </td>
                      <td
                        className={`slide-td text-right font-mono tabular-nums font-medium ${(s.gap ?? 0) >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}
                      >
                        {s.gap != null ? `${s.gap >= 0 ? '+' : ''}${s.gap.toLocaleString()}` : '—'}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums">
                        {s.achievement_rate != null ? formatRate(s.achievement_rate) : '—'}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums">
                        {s.conversion_rate != null ? formatRate(s.conversion_rate) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 漏斗环节表格 */}
      <Card title={t.funnelAchTitle}>
        {stages.length === 0 ? (
          <EmptyState title={t.emptyFunnel} description={t.emptyFunnelDesc} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="slide-thead-row text-xs">
                  <th className="py-1.5 px-2 border-0 text-left">{t.colStage}</th>
                  <th className="py-1.5 px-2 border-0 text-right">{t.colTarget}</th>
                  <th className="py-1.5 px-2 border-0 text-right">{t.colActual}</th>
                  <th className="py-1.5 px-2 border-0 text-right">{t.colGap}</th>
                  <th className="py-1.5 px-2 border-0 text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      {t.colAchRate}
                      <BrandDot tooltip={t.achTooltip} />
                    </span>
                  </th>
                  <th className="py-1.5 px-2 border-0 text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      {t.colConvRate}
                      <BrandDot tooltip={t.convTooltip} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s) => (
                  <tr key={s.name} className="even:bg-[var(--bg-subtle)]">
                    <td className="py-2 px-2 text-xs font-medium">{stageName(s.name)}</td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {s.target != null
                        ? s.name.includes('率')
                          ? formatRate(s.target)
                          : s.target.toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums font-semibold">
                      {s.actual != null
                        ? s.name.includes('率')
                          ? formatRate(s.actual)
                          : s.actual.toLocaleString()
                        : '—'}
                    </td>
                    <td
                      className={`py-1 px-2 text-xs text-right font-mono tabular-nums font-medium ${
                        (s.gap ?? 0) >= 0
                          ? 'text-[var(--color-success)]'
                          : 'text-[var(--color-danger)]'
                      }`}
                    >
                      {s.gap != null
                        ? s.name.includes('率')
                          ? `${(s.gap * 100).toFixed(1)}pp`
                          : `${s.gap >= 0 ? '+' : ''}${s.gap.toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                      <span
                        className={`font-medium ${
                          (s.achievement_rate ?? 0) >= 1
                            ? 'text-[var(--color-success)]'
                            : (s.achievement_rate ?? 0) >= 0.8
                              ? 'text-[var(--color-warning)]'
                              : 'text-[var(--color-danger)]'
                        }`}
                      >
                        {formatRate(s.achievement_rate)}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {s.conversion_rate !== undefined ? formatRate(s.conversion_rate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 转化率柱状图 */}
      {conversionChartData.length > 0 && (
        <Card title={t.convChartTitle}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={conversionChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => `${v}%`}
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md, 10px)',
                  boxShadow: 'var(--shadow-medium)',
                  fontSize: '12px',
                }}
                cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
              />
              <Bar
                dataKey="actual"
                name={t.colActual}
                radius={[4, 4, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              >
                {conversionChartData.map((entry, i) => (
                  <Cell key={i} fill={gapColor(entry.gap)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* 场景推演表格 */}
      <Card title={t.scenarioTitle}>
        {scenarios.length === 0 ? (
          <EmptyState title={t.emptyScenario} description={t.emptyScenarioDesc} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="slide-thead-row text-xs">
                  <th className="py-1.5 px-2 border-0 text-left">{t.colStage}</th>
                  <th className="py-1.5 px-2 border-0 text-right">{t.colCurrentRate}</th>
                  <th className="py-1.5 px-2 border-0 text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      {t.colScenarioRate}
                      <BrandDot tooltip={t.scenarioRateTooltip} />
                    </span>
                  </th>
                  <th className="py-1.5 px-2 border-0 text-right">{t.colImpactReg}</th>
                  <th className="py-1.5 px-2 border-0 text-right">{t.colImpactPay}</th>
                  <th className="py-1.5 px-2 border-0 text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      {t.colImpactRev}
                      <BrandDot tooltip={t.impactRevTooltip} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.stage} className="even:bg-[var(--bg-subtle)]">
                    <td className="py-2 px-2 text-xs font-medium">{stageName(s.stage)}</td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {formatRate(s.current_rate)}
                    </td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-action-accent font-medium">
                      {formatRate(s.scenario_rate)}
                    </td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                      +{(s.impact_registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                      +{(s.impact_payments ?? 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--color-success)] font-medium">
                      +${(s.impact_revenue ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

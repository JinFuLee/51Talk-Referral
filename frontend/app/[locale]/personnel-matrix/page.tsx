'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CCHeatmap } from '@/components/cc-matrix/CCHeatmap';
import { CCRadarChart } from '@/components/cc-matrix/CCRadarChart';
import { EfficiencyScatter } from '@/components/cc-matrix/EfficiencyScatter';
import type { CCHeatmapResponse, CCRadarData, CCDrilldownRow } from '@/lib/types/cross-analysis';
import type { EnclosureSSMetrics, EnclosureLPMetrics } from '@/lib/types/enclosure-ss-lp';
import { formatRate, formatRevenue, metricColor, fmtEnc } from '@/lib/utils';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import { SegmentedTabs } from '@/components/ui/PageTabs';
import { BrandDot } from '@/components/ui/BrandDot';
/* ── 常量 ──────────────────────────────────────────────────── */

type TabKey = 'cc' | 'ss' | 'lp';

function useTabs() {
  const locale = useLocale();
  const t = useTranslations('personnelMatrixPage');
  return [
    { key: 'cc' as TabKey, label: t('tabCC') },
    { key: 'ss' as TabKey, label: t('tabSS') },
    { key: 'lp' as TabKey, label: t('tabLP') },
  ];
}

function useMetricOptions() {
  const locale = useLocale();
  const t = useTranslations('personnelMatrixPage');
  return [
    { value: 'coefficient', label: t('metricCoefficient') },
    { value: 'participation', label: t('metricParticipation') },
    { value: 'checkin', label: t('metricCheckin') },
    { value: 'reach', label: t('metricReach') },
  ];
}

/* ── 工具函数 ───────────────────────────────────────────────── */

// metricColor 已移至 lib/utils.ts 共享

function safe(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined) return '—';
  return decimals > 0 ? v.toFixed(decimals) : v.toLocaleString();
}

function safeRate(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return formatRate(v);
}

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1
      ? 'bg-warning-surface text-warning-token'
      : rank === 2
        ? 'bg-subtle text-secondary-token'
        : rank === 3
          ? 'bg-orange-50 text-orange-600'
          : 'text-muted-token';
  return (
    <span
      className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${cls}`}
    >
      {rank}
    </span>
  );
}

/* ── Tab Bar ──────────────────────────────────────────────── */

function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const tabs = useTabs();
  return <SegmentedTabs tabs={tabs} active={active} onChange={onChange} />;
}

/* ── CC Tab：热力矩阵 + 雷达图 + 下钻 ──────────────────────── */

function CCTabContent() {
  const locale = useLocale();
  const t = useTranslations('personnelMatrixPage');
  const metricOptions = useMetricOptions();
  const [metric, setMetric] = useState('coefficient');
  const [selectedCC, setSelectedCC] = useState<string | null>(null);
  const [drilldownCC, setDrilldownCC] = useState<string | null>(null);
  const [drilldownSeg, setDrilldownSeg] = useState<string | null>(null);

  const {
    data: heatmapData,
    isLoading: loadingHeatmap,
    error: heatmapError,
  } = useFilteredSWR<CCHeatmapResponse>(`/api/cc-matrix/heatmap?metric=${metric}`);
  const { data: radarData, isLoading: loadingRadar } = useFilteredSWR<CCRadarData>(
    selectedCC ? `/api/cc-matrix/radar/${encodeURIComponent(selectedCC)}` : null
  );
  const { data: drilldownData, isLoading: loadingDrilldown } = useFilteredSWR<CCDrilldownRow[]>(
    drilldownCC && drilldownSeg
      ? `/api/cc-matrix/drilldown?cc_name=${encodeURIComponent(drilldownCC)}&segment=${encodeURIComponent(drilldownSeg)}`
      : null
  );

  const scatterPoints =
    heatmapData?.rows?.map((cc) => {
      const coeffCell = heatmapData.data.find((d) => d.cc_name === cc && d.segment === '全段');
      return { cc_name: cc, x: coeffCell?.value ?? 0, y: 0 };
    }) ?? [];

  return (
    <div className="space-y-5 md:space-y-6">
      {/* 着色维度切换 */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-token">{t('colorDim')}</span>
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {metricOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 热力矩阵 */}
      <Card title={t('heatmapTitle', { label: metricOptions.find((o) => o.value === metric)?.label ?? '' })}>
        {loadingHeatmap ? (
          <div className="flex items-center justify-center h-32">
            <Spinner size="lg" />
          </div>
        ) : heatmapError ? (
          <div className="text-center py-8">
            <p className="text-base font-semibold text-danger-token">{t('loadFail')}</p>
            <p className="text-sm text-muted-token mt-1">{t('loadFailDesc')}</p>
          </div>
        ) : !heatmapData?.rows?.length ? (
          <EmptyState title={t('noHeatmap')} description={t('noHeatmapDesc')} />
        ) : (
          <CCHeatmap
            rows={heatmapData.rows}
            cols={heatmapData.cols}
            data={heatmapData.data}
            onCCClick={(cc) => setSelectedCC(cc)}
            onCellClick={(cc, seg) => {
              setDrilldownCC(cc);
              setDrilldownSeg(seg);
            }}
          />
        )}
      </Card>

      {/* 效率散点图 */}
      <Card title={t('scatterTitle')}>
        <EfficiencyScatter data={scatterPoints} />
      </Card>

      {/* CC 雷达图弹层 */}
      {selectedCC && (
        <>
          {loadingRadar ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <Spinner size="lg" />
            </div>
          ) : radarData ? (
            <CCRadarChart data={radarData} onClose={() => setSelectedCC(null)} />
          ) : null}
        </>
      )}

      {/* 下钻学员列表 */}
      {drilldownCC && drilldownSeg && (
        <Card
          title={t('drilldownTitle', { cc: drilldownCC, drilldownSeg })}
          actions={
            <button
              className="text-xs text-muted-token hover:text-primary-token transition-colors"
              onClick={() => {
                setDrilldownCC(null);
                setDrilldownSeg(null);
              }}
            >
              {t('collapse')}
            </button>
          }
        >
          {loadingDrilldown ? (
            <div className="flex items-center justify-center h-24">
              <Spinner />
            </div>
          ) : !drilldownData?.length ? (
            <EmptyState title={t('noStudents')} description="" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="slide-thead-row">
                    <th className="slide-th slide-th-left py-1.5 px-2">{t('colStudentId')}</th>
                    <th className="slide-th slide-th-left py-1.5 px-2">{t('colName')}</th>
                    <th className="slide-th slide-th-right py-1.5 px-2">{t('colPaid')}</th>
                  </tr>
                </thead>
                <tbody>
                  {drilldownData.map((row, i) => (
                    <tr
                      key={`${row.stdt_id}-${i}`}
                      className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                    >
                      <td className="slide-td py-1 px-2 font-mono">{row.stdt_id}</td>
                      <td className="slide-td py-1 px-2">{row.name}</td>
                      <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                        {formatRevenue(row.paid_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/* ── SS Tab：个人热力数据 ─────────────────────────────────── */

function SSTabContent() {
  const locale = useLocale();
  const t = useTranslations('personnelMatrixPage');
  const {
    data: ssData,
    isLoading,
    error,
    mutate,
  } = useFilteredSWR<EnclosureSSMetrics[]>('/api/enclosure-ss');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        title={t('loadFail')}
        description={t('loadFailDesc')}
        action={{ label: '重试', onClick: () => mutate() }}
      />
    );
  }

  const rows = ssData ?? [];
  const sorted = [...rows]
    .filter((r) => r.ss_name)
    .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));

  return (
    <Card title={t('ssTitle')}>
      {sorted.length === 0 ? (
        <EmptyState title={t('noSS')} description={t('noHeatmapDesc')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left py-2 px-2">{t('colRank')}</th>
                <th className="slide-th slide-th-left py-2 px-2">{t('colName')}</th>
                <th className="slide-th slide-th-left py-2 px-2">{t('colGroup')}</th>
                <th className="slide-th slide-th-left py-2 px-2">
                  {t('colEnclosure')} <BrandDot tooltip={t('ttEnclosure')} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t('colStudents')} <BrandDot tooltip={t('ttStudents')} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t('colParticipation')} <BrandDot tooltip={t('ttParticipation')} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t('colCheckin')} <BrandDot tooltip={t('ttCheckin')} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t('colReach')} <BrandDot tooltip={t('ttReach')} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">{t('colRegistrations')}</th>
                <th className="slide-th slide-th-right py-2 px-2">{t('colPayments')}</th>
                <th className="slide-th slide-th-right py-2 px-2">{t('colRevenue')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={`${r.ss_name}-${r.enclosure}-${i}`}
                  className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                >
                  <td className="slide-td py-1.5 px-2">
                    <RankBadge rank={i + 1} />
                  </td>
                  <td className="slide-td py-1.5 px-2 font-medium">{r.ss_name ?? '—'}</td>
                  <td className="slide-td py-1.5 px-2 text-secondary-token">{r.ss_group ?? '—'}</td>
                  <td className="slide-td py-1.5 px-2 text-secondary-token">
                    {fmtEnc(r.enclosure)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {safe(r.students)}
                  </td>
                  <td
                    className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.participation_rate, [0.1, 0.2])}`}
                  >
                    {safeRate(r.participation_rate)}
                  </td>
                  <td
                    className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.checkin_rate, [0.3, 0.5])}`}
                  >
                    {safeRate(r.checkin_rate)}
                  </td>
                  <td
                    className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.ss_reach_rate, [0.3, 0.5])}`}
                  >
                    {safeRate(r.ss_reach_rate)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {safe(r.registrations)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {safe(r.payments)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {r.revenue_usd != null ? `$${r.revenue_usd.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ── LP Tab：个人热力数据 ─────────────────────────────────── */

function LPTabContent() {
  const locale = useLocale();
  const t = useTranslations('personnelMatrixPage');
  const {
    data: lpData,
    isLoading,
    error,
    mutate,
  } = useFilteredSWR<EnclosureLPMetrics[]>('/api/enclosure-lp');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        title={t('loadFail')}
        description={t('loadFailDesc')}
        action={{ label: '重试', onClick: () => mutate() }}
      />
    );
  }

  const rows = lpData ?? [];
  const sorted = [...rows]
    .filter((r) => r.lp_name)
    .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));

  return (
    <Card title={t('lpTitle')}>
      {sorted.length === 0 ? (
        <EmptyState title={t('noLP')} description={t('noHeatmapDesc')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left py-2 px-2">{t('colRank')}</th>
                <th className="slide-th slide-th-left py-2 px-2">{t('colName')}</th>
                <th className="slide-th slide-th-left py-2 px-2">{t('colGroup')}</th>
                <th className="slide-th slide-th-left py-2 px-2">
                  {t('colEnclosure')} <BrandDot tooltip={t('ttEnclosure')} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t('colStudents')} <BrandDot tooltip={t('ttStudents')} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t('colParticipation')} <BrandDot tooltip={t('ttParticipation')} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t('colCheckin')} <BrandDot tooltip={t('ttCheckin')} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t('colReach')} <BrandDot tooltip={t('ttReach')} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">{t('colRegistrations')}</th>
                <th className="slide-th slide-th-right py-2 px-2">{t('colPayments')}</th>
                <th className="slide-th slide-th-right py-2 px-2">{t('colRevenue')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={`${r.lp_name}-${r.enclosure}-${i}`}
                  className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                >
                  <td className="slide-td py-1.5 px-2">
                    <RankBadge rank={i + 1} />
                  </td>
                  <td className="slide-td py-1.5 px-2 font-medium">{r.lp_name ?? '—'}</td>
                  <td className="slide-td py-1.5 px-2 text-secondary-token">{r.lp_group ?? '—'}</td>
                  <td className="slide-td py-1.5 px-2 text-secondary-token">
                    {fmtEnc(r.enclosure)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {safe(r.students)}
                  </td>
                  <td
                    className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.participation_rate, [0.1, 0.2])}`}
                  >
                    {safeRate(r.participation_rate)}
                  </td>
                  <td
                    className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.checkin_rate, [0.3, 0.5])}`}
                  >
                    {safeRate(r.checkin_rate)}
                  </td>
                  <td
                    className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.lp_reach_rate, [0.3, 0.5])}`}
                  >
                    {safeRate(r.lp_reach_rate)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {safe(r.registrations)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {safe(r.payments)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {r.revenue_usd != null ? `$${r.revenue_usd.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ── 主页面内部 ──────────────────────────────────────────── */

function PersonnelMatrixPageInner() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
  });
  const locale = useLocale();
  const t = useTranslations('personnelMatrixPage');
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'cc') as TabKey;
  const { exportCSV } = useExport();

  const { data: ssExport } = useFilteredSWR<EnclosureSSMetrics[]>('/api/enclosure-ss');
  const { data: lpExport } = useFilteredSWR<EnclosureLPMetrics[]>('/api/enclosure-lp');
  const { data: ccExport } = useFilteredSWR<CCHeatmapResponse>(
    '/api/cc-matrix/heatmap?metric=coefficient'
  );

  function handleTabChange(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/personnel-matrix?${params.toString()}`);
  }

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    if (activeTab === 'ss') {
      const rows = (ssExport ?? [])
        .filter((r) => r.ss_name)
        .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));
      exportCSV(
        rows as unknown as Record<string, unknown>[],
        [
          { key: 'ss_name', label: 'SS' },
          { key: 'enclosure', label: t('csvEnclosure') },
          { key: 'students', label: t('csvStudents') },
          { key: 'participation_rate', label: t('csvParticipation') },
          { key: 'checkin_rate', label: t('csvCheckin') },
          { key: 'registrations', label: t('csvRegistrations') },
          { key: 'payments', label: t('csvPayments') },
          { key: 'revenue_usd', label: t('csvRevenue') },
        ],
        t('exportSSFileName', { d: today })
      );
    } else if (activeTab === 'lp') {
      const rows = (lpExport ?? [])
        .filter((r) => r.lp_name)
        .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));
      exportCSV(
        rows as unknown as Record<string, unknown>[],
        [
          { key: 'lp_name', label: 'LP' },
          { key: 'enclosure', label: t('csvEnclosure') },
          { key: 'students', label: t('csvStudents') },
          { key: 'participation_rate', label: t('csvParticipation') },
          { key: 'checkin_rate', label: t('csvCheckin') },
          { key: 'lp_reach_rate', label: t('csvReach') },
          { key: 'registrations', label: t('csvRegistrations') },
          { key: 'payments', label: t('csvPayments') },
          { key: 'revenue_usd', label: t('csvRevenue') },
        ],
        t('exportLPFileName', { d: today })
      );
    } else {
      const rows = ccExport?.data ?? [];
      exportCSV(
        rows as unknown as Record<string, unknown>[],
        [
          { key: 'cc_name', label: 'CC' },
          { key: 'segment', label: t('csvSegment') },
          { key: 'value', label: t('csvValue') },
        ],
        t('exportCCFileName', { d: today })
      );
    }
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="page-title">{t('pageTitle')}</h1>
          <p className="text-sm text-secondary-token mt-1">{t('pageDesc')}</p>
          <p className="text-sm text-muted-token mt-0.5">{t('pageHint')}</p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      <TabBar active={activeTab} onChange={handleTabChange} />

      {activeTab === 'cc' && <CCTabContent />}
      {activeTab === 'ss' && <SSTabContent />}
      {activeTab === 'lp' && <LPTabContent />}
    </div>
  );
}

/* ── 导出 ─────────────────────────────────────────────────── */

export default function PersonnelMatrixPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      }
    >
      <PersonnelMatrixPageInner />
    </Suspense>
  );
}

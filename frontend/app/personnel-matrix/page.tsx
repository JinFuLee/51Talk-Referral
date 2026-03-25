'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
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
import { formatRate, formatRevenue, metricColor } from '@/lib/utils';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import { SegmentedTabs } from '@/components/ui/PageTabs';
import { BrandDot } from '@/components/ui/BrandDot';

/* ── 常量 ──────────────────────────────────────────────────── */

type TabKey = 'cc' | 'ss' | 'lp';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'cc', label: 'CC 前端' },
  { key: 'ss', label: 'SS 后端' },
  { key: 'lp', label: 'LP 服务' },
];

const METRIC_OPTIONS = [
  { value: 'coefficient', label: '带新系数' },
  { value: 'participation', label: '参与率' },
  { value: 'checkin', label: '打卡率' },
  { value: 'reach', label: '触达率' },
];

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
      ? 'bg-yellow-100 text-yellow-700'
      : rank === 2
        ? 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
        : rank === 3
          ? 'bg-orange-50 text-orange-600'
          : 'text-[var(--text-muted)]';
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
  return <SegmentedTabs tabs={TABS} active={active} onChange={onChange} />;
}

/* ── CC Tab：热力矩阵 + 雷达图 + 下钻 ──────────────────────── */

function CCTabContent() {
  const [metric, setMetric] = useState('coefficient');
  const [selectedCC, setSelectedCC] = useState<string | null>(null);
  const [drilldownCC, setDrilldownCC] = useState<string | null>(null);
  const [drilldownSeg, setDrilldownSeg] = useState<string | null>(null);

  const { data: heatmapData, isLoading: loadingHeatmap } = useSWR<CCHeatmapResponse>(
    `/api/cc-matrix/heatmap?metric=${metric}`,
    swrFetcher
  );
  const { data: radarData, isLoading: loadingRadar } = useSWR<CCRadarData>(
    selectedCC ? `/api/cc-matrix/radar/${encodeURIComponent(selectedCC)}` : null,
    swrFetcher
  );
  const { data: drilldownData, isLoading: loadingDrilldown } = useSWR<CCDrilldownRow[]>(
    drilldownCC && drilldownSeg
      ? `/api/cc-matrix/drilldown?cc_name=${encodeURIComponent(drilldownCC)}&segment=${encodeURIComponent(drilldownSeg)}`
      : null,
    swrFetcher
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
        <span className="text-xs text-[var(--text-muted)]">着色维度</span>
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRIC_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 热力矩阵 */}
      <Card
        title={`CC × 围场段热力矩阵（${METRIC_OPTIONS.find((o) => o.value === metric)?.label}）`}
      >
        {loadingHeatmap ? (
          <div className="flex items-center justify-center h-32">
            <Spinner size="lg" />
          </div>
        ) : !heatmapData?.rows?.length ? (
          <EmptyState title="暂无热力数据" description="上传围场数据后自动生成" />
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
      <Card title="带新系数 × 付费金额 四象限">
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
          title={`${drilldownCC} · ${drilldownSeg} 学员明细`}
          actions={
            <button
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              onClick={() => {
                setDrilldownCC(null);
                setDrilldownSeg(null);
              }}
            >
              收起
            </button>
          }
        >
          {loadingDrilldown ? (
            <div className="flex items-center justify-center h-24">
              <Spinner />
            </div>
          ) : !drilldownData?.length ? (
            <EmptyState title="暂无学员数据" description="" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="slide-thead-row">
                    <th className="slide-th slide-th-left py-1.5 px-2">学员 ID</th>
                    <th className="slide-th slide-th-left py-1.5 px-2">姓名</th>
                    <th className="slide-th slide-th-right py-1.5 px-2">付费金额</th>
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
  const {
    data: ssData,
    isLoading,
    error,
    mutate,
  } = useSWR<EnclosureSSMetrics[]>('/api/enclosure-ss', swrFetcher);

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
        title="数据加载失败"
        description="请检查后端服务是否正常运行"
        action={{ label: '重试', onClick: () => mutate() }}
      />
    );
  }

  const rows = ssData ?? [];
  const sorted = [...rows]
    .filter((r) => r.ss_name)
    .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));

  return (
    <Card title="SS 个人战力排名（按注册数）">
      {sorted.length === 0 ? (
        <EmptyState title="暂无 SS 数据" description="上传围场数据后自动生成" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left py-2 px-2">排名</th>
                <th className="slide-th slide-th-left py-2 px-2">姓名</th>
                <th className="slide-th slide-th-left py-2 px-2">组别</th>
                <th className="slide-th slide-th-left py-2 px-2">
                  围场段 <BrandDot tooltip="学员付费起算天数分段" />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  学员数 <BrandDot tooltip="已付费且在有效期内的学员" />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  参与率 <BrandDot tooltip="带来≥1注册的学员 / 有效学员" />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  打卡率 <BrandDot tooltip="转码且分享的学员 / 有效学员" />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  触达率 <BrandDot tooltip="有效通话(≥120s)学员 / 有效学员" />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">注册数</th>
                <th className="slide-th slide-th-right py-2 px-2">付费数</th>
                <th className="slide-th slide-th-right py-2 px-2">业绩(USD)</th>
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
                  <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                    {r.ss_group ?? '—'}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                    {r.enclosure}
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
  const {
    data: lpData,
    isLoading,
    error,
    mutate,
  } = useSWR<EnclosureLPMetrics[]>('/api/enclosure-lp', swrFetcher);

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
        title="数据加载失败"
        description="请检查后端服务是否正常运行"
        action={{ label: '重试', onClick: () => mutate() }}
      />
    );
  }

  const rows = lpData ?? [];
  const sorted = [...rows]
    .filter((r) => r.lp_name)
    .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));

  return (
    <Card title="LP 个人战力排名（按注册数）">
      {sorted.length === 0 ? (
        <EmptyState title="暂无 LP 数据" description="上传围场数据后自动生成" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left py-2 px-2">排名</th>
                <th className="slide-th slide-th-left py-2 px-2">姓名</th>
                <th className="slide-th slide-th-left py-2 px-2">组别</th>
                <th className="slide-th slide-th-left py-2 px-2">
                  围场段 <BrandDot tooltip="学员付费起算天数分段" />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  学员数 <BrandDot tooltip="已付费且在有效期内的学员" />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  参与率 <BrandDot tooltip="带来≥1注册的学员 / 有效学员" />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  打卡率 <BrandDot tooltip="转码且分享的学员 / 有效学员" />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  触达率 <BrandDot tooltip="有效通话(≥120s)学员 / 有效学员" />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">注册数</th>
                <th className="slide-th slide-th-right py-2 px-2">付费数</th>
                <th className="slide-th slide-th-right py-2 px-2">业绩(USD)</th>
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
                  <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                    {r.lp_group ?? '—'}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                    {r.enclosure}
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'cc') as TabKey;
  const { exportCSV } = useExport();

  const { data: ssExport } = useSWR<EnclosureSSMetrics[]>('/api/enclosure-ss', swrFetcher);
  const { data: lpExport } = useSWR<EnclosureLPMetrics[]>('/api/enclosure-lp', swrFetcher);
  const { data: ccExport } = useSWR<CCHeatmapResponse>(
    '/api/cc-matrix/heatmap?metric=coefficient',
    swrFetcher
  );

  function handleTabChange(t: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', t);
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
          { key: 'enclosure', label: '围场' },
          { key: 'students', label: '学员数' },
          { key: 'participation_rate', label: '参与率' },
          { key: 'checkin_rate', label: '打卡率' },
          { key: 'registrations', label: '注册数' },
          { key: 'payments', label: '付费数' },
          { key: 'revenue_usd', label: '业绩(USD)' },
        ],
        `人员战力_SS_${today}`
      );
    } else if (activeTab === 'lp') {
      const rows = (lpExport ?? [])
        .filter((r) => r.lp_name)
        .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));
      exportCSV(
        rows as unknown as Record<string, unknown>[],
        [
          { key: 'lp_name', label: 'LP' },
          { key: 'enclosure', label: '围场' },
          { key: 'students', label: '学员数' },
          { key: 'participation_rate', label: '参与率' },
          { key: 'checkin_rate', label: '打卡率' },
          { key: 'lp_reach_rate', label: '触达率' },
          { key: 'registrations', label: '注册数' },
          { key: 'payments', label: '付费数' },
          { key: 'revenue_usd', label: '业绩(USD)' },
        ],
        `人员战力_LP_${today}`
      );
    } else {
      const rows = ccExport?.data ?? [];
      exportCSV(
        rows as unknown as Record<string, unknown>[],
        [
          { key: 'cc_name', label: 'CC' },
          { key: 'segment', label: '围场段' },
          { key: 'value', label: '指标值' },
        ],
        `人员战力_CC_${today}`
      );
    }
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="page-title">人员战力图</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            CC / SS / LP 三岗个人战力 · 热力矩阵 · 围场分布
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            CC 热力矩阵按围场段×个人展示带新系数；SS/LP 按注册数排名
          </p>
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

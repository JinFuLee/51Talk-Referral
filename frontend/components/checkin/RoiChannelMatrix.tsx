'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatUSD } from '@/lib/utils';
import type { RoiAnalysisResponse, ChannelRoiItem } from '@/lib/types/checkin-roi';
import { CHANNEL_LABELS, useLabel } from '@/lib/label-maps';

// ── 内联 I18N ────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    loadFailed: '渠道数据加载失败',
    loadFailedDesc: '请检查后端服务是否正常运行',
    noData: '暂无渠道 ROI 数据',
    noDataDesc: '当前条件下无渠道活动数据',
    calibrationNote: '口径说明：',
    calibrationDesc:
      '渠道归因按围场段分配（CC=M0-M2，SS=M3，LP=M4-M5，宽口=M6+）。 收入为近似值（带新付费数 × 平均客单价 $150）。',
    channelHeader: '渠道',
    newCountHeader: '带新人数',
    newPaidHeader: '带新付费数',
    costHeader: '成本 (USD)',
    revenueHeader: '收入 (USD)',
    roiHeader: 'ROI',
    totalLabel: '合计',
    best: '最优',
    worst: '待改善',
    convRate: '转化率',
    cost: '成本',
  },
  'zh-TW': {
    loadFailed: '渠道資料載入失敗',
    loadFailedDesc: '請檢查後端服務是否正常執行',
    noData: '暫無渠道 ROI 資料',
    noDataDesc: '目前條件下無渠道活動資料',
    calibrationNote: '口徑說明：',
    calibrationDesc:
      '渠道歸因按圍場段分配（CC=M0-M2，SS=M3，LP=M4-M5，寬口=M6+）。收入為近似值（帶新付費數 × 平均客單價 $150）。',
    channelHeader: '渠道',
    newCountHeader: '帶新人數',
    newPaidHeader: '帶新付費數',
    costHeader: '成本 (USD)',
    revenueHeader: '收入 (USD)',
    roiHeader: 'ROI',
    totalLabel: '合計',
    best: '最優',
    worst: '待改善',
    convRate: '轉化率',
    cost: '成本',
  },
  en: {
    loadFailed: 'Failed to Load Channel Data',
    loadFailedDesc: 'Please check whether the backend service is running.',
    noData: 'No Channel ROI Data',
    noDataDesc: 'No channel activity data under current filters.',
    calibrationNote: 'Note: ',
    calibrationDesc:
      'Channel attribution by enclosure segment (CC=M0-M2, SS=M3, LP=M4-M5, Wide=M6+). Revenue is approximate (new paid × avg $150 per order).',
    channelHeader: 'Channel',
    newCountHeader: 'New Count',
    newPaidHeader: 'New Paid',
    costHeader: 'Cost (USD)',
    revenueHeader: 'Revenue (USD)',
    roiHeader: 'ROI',
    totalLabel: 'Total',
    best: 'Best',
    worst: 'Needs Work',
    convRate: 'Conv. Rate',
    cost: 'Cost',
  },
  th: {
    loadFailed: 'โหลดข้อมูลช่องทางล้มเหลว',
    loadFailedDesc: 'กรุณาตรวจสอบว่าบริการแบ็คเอนด์ทำงานอยู่',
    noData: 'ไม่มีข้อมูล ROI ช่องทาง',
    noDataDesc: 'ไม่มีข้อมูลกิจกรรมช่องทางภายใต้เงื่อนไขปัจจุบัน',
    calibrationNote: 'หมายเหตุ: ',
    calibrationDesc:
      'การระบุแหล่งที่มาตามช่วงคอก (CC=M0-M2, SS=M3, LP=M4-M5, กว้าง=M6+) รายได้เป็นค่าประมาณ (ชำระใหม่ × $150 เฉลี่ย)',
    channelHeader: 'ช่องทาง',
    newCountHeader: 'จำนวนใหม่',
    newPaidHeader: 'ชำระใหม่',
    costHeader: 'ต้นทุน (USD)',
    revenueHeader: 'รายได้ (USD)',
    roiHeader: 'ROI',
    totalLabel: 'รวม',
    best: 'ดีที่สุด',
    worst: 'ต้องปรับปรุง',
    convRate: 'อัตราแปลง',
    cost: 'ต้นทุน',
  },
} as const;

type Locale = keyof typeof I18N;
function useT() {
  const locale = useLocale();
  return I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];
}

interface Props {
  roleFilter?: string;
  enclosureFilter?: string | null;
}

const CHANNELS = ['CC', 'SS', 'LP', '宽口'] as const;

function RoiCell({ roi }: { roi: number | null }) {
  if (roi == null) return <span className="text-[var(--text-muted)]">—</span>;
  const color = roi >= 200 ? '#16a34a' : roi >= 0 ? '#ca8a04' : '#dc2626';
  return (
    <span className="font-semibold text-base" style={{ color }}>
      {roi.toFixed(1)}%
    </span>
  );
}

function ChannelHighlight({
  best,
  worst,
  channel,
  bestLabel,
  worstLabel,
}: {
  best: string;
  worst: string;
  channel: string;
  bestLabel: string;
  worstLabel: string;
}) {
  if (channel === best)
    return (
      <span className="ml-1 text-xs text-[var(--color-success)] bg-[var(--color-success-surface)] px-1 rounded">
        {bestLabel}
      </span>
    );
  if (channel === worst)
    return (
      <span className="ml-1 text-xs text-[var(--color-danger)] bg-[var(--color-danger-surface)] px-1 rounded">
        {worstLabel}
      </span>
    );
  return null;
}

export function RoiChannelMatrix({ roleFilter, enclosureFilter }: Props) {
  const t = useT();
  const label = useLabel();
  const params = new URLSearchParams();
  if (roleFilter) params.set('role', roleFilter);
  if (enclosureFilter) params.set('enclosure', enclosureFilter);

  const { data, isLoading, error } = useFilteredSWR<RoiAnalysisResponse>(
    `/api/checkin/roi-analysis${params.toString() ? '?' + params.toString() : ''}`
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title={t.loadFailed} description={t.loadFailedDesc} />;
  }

  if (!data || Object.keys(data.channel_roi).length === 0) {
    return <EmptyState title={t.noData} description={t.noDataDesc} />;
  }

  const channelRoi = data.channel_roi;

  // 找最优/最差渠道（基于 ROI，忽略 null）
  const roiEntries = CHANNELS.map((ch) => ({
    ch,
    roi: channelRoi[ch]?.roi ?? null,
  })).filter((e) => e.roi != null);
  const bestChannel =
    roiEntries.length > 0 ? roiEntries.reduce((a, b) => (a.roi! > b.roi! ? a : b)).ch : '';
  const worstChannel =
    roiEntries.length > 0 ? roiEntries.reduce((a, b) => (a.roi! < b.roi! ? a : b)).ch : '';

  // 合计行
  const totals = CHANNELS.reduce(
    (acc, ch) => {
      const v = channelRoi[ch] as ChannelRoiItem | undefined;
      if (!v) return acc;
      acc.new_count += v.new_count;
      acc.new_paid += v.new_paid;
      acc.cost_usd += v.cost_usd;
      acc.revenue_approx_usd += v.revenue_approx_usd;
      return acc;
    },
    { new_count: 0, new_paid: 0, cost_usd: 0, revenue_approx_usd: 0 }
  );
  const totalRoi =
    totals.cost_usd > 0
      ? ((totals.revenue_approx_usd - totals.cost_usd) / totals.cost_usd) * 100
      : null;

  return (
    <div className="space-y-4">
      {/* 说明 */}
      <div className="card-base p-3 bg-[var(--bg-subtle)]">
        <p className="text-xs text-[var(--text-secondary)]">
          <strong>{t.calibrationNote}</strong>
          {t.calibrationDesc}
        </p>
      </div>

      {/* 矩阵表格 */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th">{t.channelHeader}</th>
              <th className="slide-th text-right">{t.newCountHeader}</th>
              <th className="slide-th text-right">{t.newPaidHeader}</th>
              <th className="slide-th text-right">{t.costHeader}</th>
              <th className="slide-th text-right">{t.revenueHeader}</th>
              <th className="slide-th text-right">{t.roiHeader}</th>
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map((ch, i) => {
              const v = channelRoi[ch] as ChannelRoiItem | undefined;
              if (!v) return null;
              return (
                <tr key={ch} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="slide-td font-medium">
                    <span>{label(CHANNEL_LABELS, ch) || ch}</span>
                    <ChannelHighlight
                      best={bestChannel}
                      worst={worstChannel}
                      channel={ch}
                      bestLabel={t.best}
                      worstLabel={t.worst}
                    />
                  </td>
                  <td className="slide-td text-right">{(v.new_count ?? 0).toLocaleString()}</td>
                  <td className="slide-td text-right">{(v.new_paid ?? 0).toLocaleString()}</td>
                  <td className="slide-td text-right">{formatUSD(v.cost_usd)}</td>
                  <td className="slide-td text-right">{formatUSD(v.revenue_approx_usd)}</td>
                  <td className="slide-td text-right">
                    <RoiCell roi={v.roi} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="slide-tfoot-row font-semibold">
              <td className="slide-td">{t.totalLabel}</td>
              <td className="slide-td text-right">{(totals.new_count ?? 0).toLocaleString()}</td>
              <td className="slide-td text-right">{(totals.new_paid ?? 0).toLocaleString()}</td>
              <td className="slide-td text-right">{formatUSD(totals.cost_usd)}</td>
              <td className="slide-td text-right">{formatUSD(totals.revenue_approx_usd)}</td>
              <td className="slide-td text-right">
                <RoiCell roi={totalRoi != null ? parseFloat(totalRoi.toFixed(1)) : null} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 渠道洞察卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CHANNELS.map((ch) => {
          const v = channelRoi[ch] as ChannelRoiItem | undefined;
          if (!v) return null;
          const convRate = v.new_count > 0 ? (v.new_paid / v.new_count) * 100 : 0;
          const roiColor =
            v.roi == null
              ? 'var(--text-muted)'
              : v.roi >= 200
                ? '#16a34a'
                : v.roi >= 0
                  ? '#ca8a04'
                  : '#dc2626';
          return (
            <div key={ch} className="card-base p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {label(CHANNEL_LABELS, ch) || ch}
                </span>
                {ch === bestChannel && (
                  <span className="text-xs text-[var(--color-success)] bg-[var(--color-success-surface)] px-1.5 py-0.5 rounded-full">
                    {t.best}
                  </span>
                )}
                {ch === worstChannel && ch !== bestChannel && (
                  <span className="text-xs text-[var(--color-danger)] bg-[var(--color-danger-surface)] px-1.5 py-0.5 rounded-full">
                    {t.worst}
                  </span>
                )}
              </div>
              <p className="text-xl font-semibold" style={{ color: roiColor }}>
                {v.roi != null ? `${v.roi.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{t.roiHeader}</p>
              <div className="mt-2 pt-2 border-t border-[var(--border-default)] space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">{t.convRate}</span>
                  <span className="text-[var(--text-secondary)]">
                    {(convRate ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">{t.cost}</span>
                  <span className="text-[var(--text-secondary)]">{formatUSD(v.cost_usd)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

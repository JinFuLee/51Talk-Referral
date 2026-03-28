'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatUSD } from '@/lib/utils';
import type { RoiAnalysisResponse, ChannelRoiItem } from '@/lib/types/checkin-roi';

interface Props {
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
}: {
  best: string;
  worst: string;
  channel: string;
}) {
  if (channel === best)
    return <span className="ml-1 text-xs text-green-700 bg-green-100 px-1 rounded">最优</span>;
  if (channel === worst)
    return <span className="ml-1 text-xs text-red-700 bg-red-100 px-1 rounded">待改善</span>;
  return null;
}

export function RoiChannelMatrix({ enclosureFilter }: Props) {
  const params = new URLSearchParams();
  if (enclosureFilter) params.set('enclosure', enclosureFilter);

  const { data, isLoading, error } = useSWR<RoiAnalysisResponse>(
    `/api/checkin/roi-analysis${params.toString() ? '?' + params.toString() : ''}`,
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="渠道数据加载失败" description="请检查后端服务是否正常运行" />;
  }

  if (!data || Object.keys(data.channel_roi).length === 0) {
    return <EmptyState title="暂无渠道 ROI 数据" description="当前条件下无渠道活动数据" />;
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
          <strong>口径说明：</strong>
          渠道归因按围场段分配（CC=M0-M2，SS=M3，LP=M4-M5，宽口=M6+）。 收入为近似值（带新付费数 ×
          平均客单价 $150）。
        </p>
      </div>

      {/* 矩阵表格 */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th">渠道</th>
              <th className="slide-th text-right">带新人数</th>
              <th className="slide-th text-right">带新付费数</th>
              <th className="slide-th text-right">成本 (USD)</th>
              <th className="slide-th text-right">收入 (USD)</th>
              <th className="slide-th text-right">ROI</th>
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map((ch, i) => {
              const v = channelRoi[ch] as ChannelRoiItem | undefined;
              if (!v) return null;
              return (
                <tr key={ch} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="slide-td font-medium">
                    <span>{ch}</span>
                    <ChannelHighlight best={bestChannel} worst={worstChannel} channel={ch} />
                  </td>
                  <td className="slide-td text-right">{v.new_count.toLocaleString()}</td>
                  <td className="slide-td text-right">{v.new_paid.toLocaleString()}</td>
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
              <td className="slide-td">合计</td>
              <td className="slide-td text-right">{totals.new_count.toLocaleString()}</td>
              <td className="slide-td text-right">{totals.new_paid.toLocaleString()}</td>
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
                <span className="text-sm font-medium text-[var(--text-primary)]">{ch}</span>
                {ch === bestChannel && (
                  <span className="text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                    最优
                  </span>
                )}
                {ch === worstChannel && ch !== bestChannel && (
                  <span className="text-xs text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">
                    待改善
                  </span>
                )}
              </div>
              <p className="text-xl font-semibold" style={{ color: roiColor }}>
                {v.roi != null ? `${v.roi.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">ROI</p>
              <div className="mt-2 pt-2 border-t border-[var(--border-default)] space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">转化率</span>
                  <span className="text-[var(--text-secondary)]">{convRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">成本</span>
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

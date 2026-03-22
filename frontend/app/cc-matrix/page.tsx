'use client';

import { useState } from 'react';
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

const METRIC_OPTIONS = [
  { value: 'coefficient', label: '带新系数' },
  { value: 'participation', label: '参与率' },
  { value: 'checkin', label: '打卡率' },
  { value: 'reach', label: '触达率' },
];

export default function CCMatrixPage() {
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
      return {
        cc_name: cc,
        x: coeffCell?.value ?? 0,
        y: 0,
      };
    }) ?? [];

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold text-neutral-800">CC 围场战力图</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          CC × 围场段热力矩阵 · 点击 CC 行查看雷达图 · 点击格子下钻学员
        </p>
      </div>

      {/* 着色维度切换 */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-neutral-500">着色维度</span>
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
              className="text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
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
                  <tr className="bg-[var(--n-800)] text-white">
                    <th className="py-1.5 px-2 text-left border-0">学员 ID</th>
                    <th className="py-1.5 px-2 text-left border-0">姓名</th>
                    <th className="py-1.5 px-2 text-right border-0">付费金额</th>
                  </tr>
                </thead>
                <tbody>
                  {drilldownData.map((row, i) => (
                    <tr key={`${row.stdt_id}-${i}`} className="even:bg-neutral-50">
                      <td className="py-1 px-2 font-mono">{row.stdt_id}</td>
                      <td className="py-1 px-2">{row.name}</td>
                      <td className="py-1 px-2 text-right font-mono tabular-nums">
                        ${(row.paid_amount ?? 0).toLocaleString()}
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

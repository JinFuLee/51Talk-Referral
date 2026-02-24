"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface MatrixCell {
  enclosure: string;
  channel: string;
  registrations: number;
  payments: number;
  conversion_rate: number;
}

interface MatrixResponse {
  matrix: MatrixCell[];
  enclosures: string[];
  channels: string[];
}

function getHeatColor(rate: number): string {
  if (rate >= 0.2) return "bg-emerald-600 text-white";
  if (rate >= 0.15) return "bg-emerald-400 text-white";
  if (rate >= 0.1) return "bg-emerald-200 text-emerald-900";
  if (rate >= 0.05) return "bg-emerald-100 text-emerald-800";
  return "bg-slate-50 text-slate-600";
}



export function EnclosureChannelMatrix() {
  const { data, isLoading, error } = useSWR<MatrixResponse>(
    "/api/analysis/enclosure-channel-matrix",
    swrFetcher
  );

  const hasData = data?.matrix && data.matrix.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-red-400 text-sm">
        数据加载失败
      </div>
    );
  }

  if (!hasData || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
        <p className="text-sm font-medium text-slate-600 mb-1">围场渠道矩阵数据暂未就绪</p>
        <p className="text-xs text-slate-400">请先运行分析以生成 enclosure-channel-matrix 数据</p>
      </div>
    );
  }

  const enclosures = data.enclosures ?? ["0-30", "31-60", "61-90", "91-180", "181+"];
  const channels = data.channels ?? ["CC窄", "SS窄", "LP窄", "宽口"];
  const cells = data.matrix;

  // Build lookup: enclosure+channel -> cell
  const lookup: Record<string, MatrixCell> = {};
  for (const cell of cells) {
    lookup[`${cell.enclosure}__${cell.channel}`] = cell;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="text-left text-xs text-slate-500 font-medium pb-2 pr-3 whitespace-nowrap">
              围场 / 渠道
            </th>
            {channels.map((ch) => (
              <th
                key={ch}
                className="text-center text-xs text-slate-500 font-medium pb-2 px-2 whitespace-nowrap"
              >
                {ch}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {enclosures.map((enc) => (
            <tr key={enc}>
              <td className="text-xs font-semibold text-slate-700 pr-3 whitespace-nowrap py-1">
                {enc} 天
              </td>
              {channels.map((ch) => {
                const cell = lookup[`${enc}__${ch}`];
                const rate = cell?.conversion_rate ?? 0;
                return (
                  <td key={ch} className="px-1 py-1">
                    <div
                      className={`rounded-lg p-2 text-center cursor-default transition-opacity hover:opacity-90 ${getHeatColor(rate)}`}
                      title={`围场: ${enc}天 | 渠道: ${ch} | 注册: ${cell?.registrations ?? 0} | 付费: ${cell?.payments ?? 0} | 转化率: ${(rate * 100).toFixed(1)}%`}
                    >
                      <div className="text-xs font-bold">{(rate * 100).toFixed(1)}%</div>
                      <div className="text-xs opacity-75 mt-0.5">
                        {cell?.payments ?? 0}/{cell?.registrations ?? 0}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <span className="text-xs text-slate-400">转化率色阶:</span>
        {[
          { label: "≥20%", cls: "bg-emerald-600" },
          { label: "15-20%", cls: "bg-emerald-400" },
          { label: "10-15%", cls: "bg-emerald-200" },
          { label: "5-10%", cls: "bg-emerald-100" },
          { label: "<5%", cls: "bg-slate-50 border border-slate-200" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${item.cls}`} />
            <span className="text-xs text-slate-500">{item.label}</span>
          </div>
        ))}
        <span className="text-xs text-slate-400 ml-2">格子: 转化率 / 付费数/注册数</span>
      </div>
    </div>
  );
}

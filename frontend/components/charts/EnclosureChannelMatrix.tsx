"use client";

import useSWR from "swr";
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

const MOCK_MATRIX: MatrixCell[] = [
  { enclosure: "0-30", channel: "CC窄", registrations: 120, payments: 28, conversion_rate: 0.233 },
  { enclosure: "0-30", channel: "SS窄", registrations: 85, payments: 18, conversion_rate: 0.212 },
  { enclosure: "0-30", channel: "LP窄", registrations: 60, payments: 11, conversion_rate: 0.183 },
  { enclosure: "0-30", channel: "宽口", registrations: 200, payments: 22, conversion_rate: 0.110 },
  { enclosure: "31-60", channel: "CC窄", registrations: 95, payments: 18, conversion_rate: 0.189 },
  { enclosure: "31-60", channel: "SS窄", registrations: 70, payments: 12, conversion_rate: 0.171 },
  { enclosure: "31-60", channel: "LP窄", registrations: 50, payments: 8, conversion_rate: 0.160 },
  { enclosure: "31-60", channel: "宽口", registrations: 160, payments: 14, conversion_rate: 0.088 },
  { enclosure: "61-90", channel: "CC窄", registrations: 70, payments: 10, conversion_rate: 0.143 },
  { enclosure: "61-90", channel: "SS窄", registrations: 55, payments: 8, conversion_rate: 0.145 },
  { enclosure: "61-90", channel: "LP窄", registrations: 40, payments: 5, conversion_rate: 0.125 },
  { enclosure: "61-90", channel: "宽口", registrations: 120, payments: 9, conversion_rate: 0.075 },
  { enclosure: "91-180", channel: "CC窄", registrations: 50, payments: 5, conversion_rate: 0.100 },
  { enclosure: "91-180", channel: "SS窄", registrations: 38, payments: 4, conversion_rate: 0.105 },
  { enclosure: "91-180", channel: "LP窄", registrations: 28, payments: 3, conversion_rate: 0.107 },
  { enclosure: "91-180", channel: "宽口", registrations: 90, payments: 5, conversion_rate: 0.056 },
  { enclosure: "181+", channel: "CC窄", registrations: 30, payments: 2, conversion_rate: 0.067 },
  { enclosure: "181+", channel: "SS窄", registrations: 22, payments: 1, conversion_rate: 0.045 },
  { enclosure: "181+", channel: "LP窄", registrations: 15, payments: 1, conversion_rate: 0.067 },
  { enclosure: "181+", channel: "宽口", registrations: 55, payments: 2, conversion_rate: 0.036 },
];

export function EnclosureChannelMatrix() {
  const { data, isLoading, error } = useSWR<MatrixResponse>(
    "enclosure-channel-matrix",
    () => fetch("/api/analysis/enclosure-channel-matrix").then((r) => r.json())
  );

  const enclosures = data?.enclosures ?? ["0-30", "31-60", "61-90", "91-180", "181+"];
  const channels = data?.channels ?? ["CC窄", "SS窄", "LP窄", "宽口"];
  const isMock = !data?.matrix || data.matrix.length === 0;
  const cells: MatrixCell[] = isMock ? MOCK_MATRIX : data!.matrix;

  // Build lookup: enclosure+channel -> cell
  const lookup: Record<string, MatrixCell> = {};
  for (const cell of cells) {
    lookup[`${cell.enclosure}__${cell.channel}`] = cell;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        数据加载失败，显示示例数据
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {isMock && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded text-xs mb-2">
          ⚠ 当前显示模拟数据（API 数据不可用）
        </div>
      )}
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

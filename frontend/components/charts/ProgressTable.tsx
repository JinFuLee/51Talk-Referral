"use client";

interface ProgressRow {
  metric: string;
  actual: number | string;
  target: number | string;
  progress: number; // 0~1
  gap: number | string;
  status: "green" | "yellow" | "red";
}

interface ProgressTableProps {
  rows: ProgressRow[];
}

const STATUS_EMOJI = { green: "🟢", yellow: "🟡", red: "🔴" };

export function ProgressTable({ rows }: ProgressTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">指标</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">实际</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">目标</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">进度</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">缺口</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">状态</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2.5 font-medium text-gray-700">{row.metric}</td>
              <td className="px-4 py-2.5 text-right text-gray-900">{row.actual}</td>
              <td className="px-4 py-2.5 text-right text-gray-400">{row.target}</td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{ width: `${Math.min(row.progress * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-gray-600 w-10 text-right">
                    {Math.round(row.progress * 100)}%
                  </span>
                </div>
              </td>
              <td className="px-4 py-2.5 text-right text-gray-600">{row.gap}</td>
              <td className="px-4 py-2.5 text-center">{STATUS_EMOJI[row.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

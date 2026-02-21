"use client";

interface CCOutreachRow {
  name: string;
  calls: number;
  contact_rate: number;   // 0~1
  effective_rate: number; // 0~1
  avg_duration_s: number;
  achieved: boolean;
}

interface CCOutreachTableProps {
  data: CCOutreachRow[];
}

export function CCOutreachTable({ data }: CCOutreachTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        暂无 CC 外呼明细数据
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {["姓名", "拨打量", "接通率", "有效率", "均时(s)", "达标"].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 font-medium text-slate-800">{row.name}</td>
              <td className="px-3 py-2 text-slate-600">{(row.calls ?? 0).toLocaleString()}</td>
              <td className="px-3 py-2 text-slate-600">{((row.contact_rate ?? 0) * 100).toFixed(1)}%</td>
              <td className="px-3 py-2 text-slate-600">{((row.effective_rate ?? 0) * 100).toFixed(1)}%</td>
              <td className="px-3 py-2 text-slate-600">{(row.avg_duration_s ?? 0).toFixed(0)}</td>
              <td className="px-3 py-2">
                <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                  row.achieved ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>
                  {row.achieved ? "达标" : "未达"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

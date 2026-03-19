"use client";

import type { StudentBrief } from "@/lib/types/member";

interface MemberTableProps {
  items: StudentBrief[];
  total: number;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onRowClick?: (id: string | number) => void;
}

export function MemberTable({
  items,
  total,
  page,
  pageSize = 20,
  onPageChange,
  onRowClick,
}: MemberTableProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        暂无学员数据，上传数据文件后自动刷新或调整筛选条件
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="py-2 pr-3 font-medium">ID</th>
              <th className="py-2 pr-3 font-medium">姓名</th>
              <th className="py-2 pr-3 font-medium">围场</th>
              <th className="py-2 pr-3 font-medium">生命周期</th>
              <th className="py-2 pr-3 font-medium">CC</th>
              <th className="py-2 pr-3 text-right font-medium">注册</th>
              <th className="py-2 pr-3 text-right font-medium">预约</th>
              <th className="py-2 pr-3 text-right font-medium">出席</th>
              <th className="py-2 text-right font-medium">付费</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr
                key={m.id}
                onClick={() => onRowClick?.(m.id)}
                className={`border-b border-slate-50 transition-colors ${
                  onRowClick ? "cursor-pointer hover:bg-slate-50" : ""
                }`}
              >
                <td className="py-2.5 pr-3 text-blue-600 font-medium tabular-nums">{m.id}</td>
                <td className="py-2.5 pr-3">{m.name || "—"}</td>
                <td className="py-2.5 pr-3 text-slate-500 text-xs">{m.enclosure}</td>
                <td className="py-2.5 pr-3">
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                    {m.lifecycle}
                  </span>
                </td>
                <td className="py-2.5 pr-3">{m.cc_name}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{m.registrations}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{m.appointments}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{m.attendance}</td>
                <td className="py-2.5 text-right tabular-nums font-medium">{m.payments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <span className="text-xs text-slate-400">
          第 {page} / {totalPages} 页，共 {total} 条
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            上一页
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            下一页
          </button>
        </div>
      </div>
    </>
  );
}

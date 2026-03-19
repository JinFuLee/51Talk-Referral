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
      <div className="text-center py-8 text-sm text-[var(--text-muted)]">
        暂无学员数据，上传数据文件后自动刷新或调整筛选条件
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--n-800)] text-white text-xs font-medium">
              <th className="py-1.5 px-2 border-0 text-left">ID</th>
              <th className="py-1.5 px-2 border-0 text-left">姓名</th>
              <th className="py-1.5 px-2 border-0 text-left">围场</th>
              <th className="py-1.5 px-2 border-0 text-left">生命周期</th>
              <th className="py-1.5 px-2 border-0 text-left">CC</th>
              <th className="py-1.5 px-2 border-0 text-right">注册</th>
              <th className="py-1.5 px-2 border-0 text-right">预约</th>
              <th className="py-1.5 px-2 border-0 text-right">出席</th>
              <th className="py-1.5 px-2 border-0 text-right">付费</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr
                key={m.id}
                onClick={() => onRowClick?.(m.id)}
                className={`even:bg-[var(--bg-subtle)] transition-colors ${
                  onRowClick ? "cursor-pointer hover:bg-[var(--bg-subtle)]" : ""
                }`}
              >
                <td className="py-1 px-2 text-xs text-blue-600 font-medium tabular-nums">{m.id}</td>
                <td className="py-1 px-2 text-xs">{m.name || "—"}</td>
                <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{m.enclosure}</td>
                <td className="py-1 px-2 text-xs">
                  <span className="px-1.5 py-0.5 bg-[var(--bg-subtle)] rounded text-xs text-[var(--text-secondary)]">
                    {m.lifecycle}
                  </span>
                </td>
                <td className="py-1 px-2 text-xs">{m.cc_name}</td>
                <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">{m.registrations}</td>
                <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">{m.appointments}</td>
                <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">{m.attendance}</td>
                <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-medium">{m.payments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <span className="text-xs text-[var(--text-muted)]">
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

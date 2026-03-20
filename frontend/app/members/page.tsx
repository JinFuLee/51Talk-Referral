"use client";

import { useState } from "react";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { StudentBrief } from "@/lib/types/member";

interface MembersResponse {
  items: StudentBrief[];
  total: number;
  page: number;
  size: number;
}

interface StudentDetail {
  id: string | number;
  name?: string;
  enclosure?: string;
  lifecycle?: string;
  cc_name?: string;
  cc_group?: string;
  ss_name?: string;
  lp_name?: string;
  registrations?: number;
  appointments?: number;
  attendance?: number;
  payments?: number;
  total_revenue_usd?: number;
  revenue_usd?: number;
  [key: string]: unknown;
}

function DetailDrawer({
  memberId,
  onClose,
}: {
  memberId: string | number;
  onClose: () => void;
}) {
  const { data, isLoading } = useSWR<StudentDetail>(
    `/api/members/${memberId}`,
    swrFetcher
  );

  const displayFields: [string, string][] = [
    ["id", "学员ID"],
    ["name", "姓名"],
    ["enclosure", "围场段"],
    ["lifecycle", "生命周期"],
    ["cc_name", "CC"],
    ["cc_group", "CC组别"],
    ["ss_name", "SS"],
    ["lp_name", "LP"],
    ["registrations", "注册数"],
    ["appointments", "预约数"],
    ["attendance", "出席数"],
    ["payments", "付费数"],
    ["total_revenue_usd", "业绩(USD)"],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div
        className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-surface)] shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-[var(--text-primary)]">学员详情</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : !data ? (
            <EmptyState title="未找到学员" description="请检查学员ID" />
          ) : (
            <dl className="space-y-3">
              {displayFields.map(([key, label]) => (
                <div key={key} className="flex items-start justify-between">
                  <dt className="text-xs text-[var(--text-muted)] w-24 shrink-0">{label}</dt>
                  <dd className="text-sm font-medium text-[var(--text-primary)] text-right">
                    {data[key] !== undefined && data[key] !== null
                      ? String(data[key])
                      : "—"}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const [page, setPage] = useState(1);
  const [enclosureFilter, setEnclosureFilter] = useState("");
  const [ccFilter, setCcFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const qs = new URLSearchParams({
    page: String(page),
    size: "20",
    ...(enclosureFilter ? { enclosure: enclosureFilter } : {}),
    ...(ccFilter ? { cc: ccFilter } : {}),
  });

  const { data, isLoading, error } = useSWR<MembersResponse>(
    `/api/members?${qs.toString()}`,
    swrFetcher
  );

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">学员明细</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">有效学员列表 · 点击行查看 59 字段详情</p>
      </div>

      {/* 筛选器 */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="围场筛选（如 0-30）"
          value={enclosureFilter}
          onChange={(e) => {
            setEnclosureFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
        />
        <input
          type="text"
          placeholder="CC 筛选"
          value={ccFilter}
          onChange={(e) => {
            setCcFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
        />
        {(enclosureFilter || ccFilter) && (
          <button
            onClick={() => {
              setEnclosureFilter("");
              setCcFilter("");
              setPage(1);
            }}
            className="px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            清除筛选
          </button>
        )}
      </div>

      <Card title={`学员列表${data ? ` (共 ${data.total} 条)` : ""}`}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState title="加载失败" description="请检查后端服务" />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="暂无学员数据"
            description="上传数据文件后自动刷新，或调整筛选条件"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--n-800)] text-white text-xs font-medium">
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">ID</th>
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">围场</th>
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">生命周期</th>
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">CC</th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">注册</th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">预约</th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">出席</th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">付费</th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap" title="本月打卡天数">打卡天</th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap" title="本月课耗">课耗</th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap" title="本月转码次数">转码</th>
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap" title="推荐奖励领取状态">奖励状态</th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap" title="次卡距到期天数">卡到期</th>
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap" title="CC末次拨打日期">末次拨打</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((m) => {
                    const daysExpiry = m.days_until_card_expiry;
                    const expiryColor =
                      daysExpiry === null || daysExpiry === undefined
                        ? ""
                        : daysExpiry <= 0
                        ? "text-red-600 font-semibold"
                        : daysExpiry <= 30
                        ? "text-orange-500"
                        : "text-[var(--text-secondary)]";

                    return (
                      <tr
                        key={m.id}
                        onClick={() => setSelectedId(m.id)}
                        className="even:bg-[var(--bg-subtle)] cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <td className="py-1 px-2 text-xs text-blue-600 font-medium font-mono tabular-nums whitespace-nowrap">{m.id}</td>
                        <td className="py-1 px-2 text-xs text-[var(--text-secondary)] whitespace-nowrap">{m.enclosure}</td>
                        <td className="py-1 px-2 text-xs whitespace-nowrap">
                          <span className="px-1.5 py-0.5 bg-[var(--bg-subtle)] rounded text-xs">{m.lifecycle}</span>
                        </td>
                        <td className="py-1 px-2 text-xs whitespace-nowrap">{m.cc_name}</td>
                        <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">{m.registrations ?? "—"}</td>
                        <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">{m.appointments ?? "—"}</td>
                        <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">{m.attendance ?? "—"}</td>
                        <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-medium">{m.payments ?? "—"}</td>
                        <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">{m.checkin_this_month ?? "—"}</td>
                        <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">{m.lesson_consumed_this_month ?? "—"}</td>
                        <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">{m.referral_code_count_this_month ?? "—"}</td>
                        <td className="py-1 px-2 text-xs whitespace-nowrap max-w-[120px] truncate" title={m.referral_reward_status ?? ""}>
                          {m.referral_reward_status || "—"}
                        </td>
                        <td className={`py-1 px-2 text-xs text-right font-mono tabular-nums ${expiryColor}`}>
                          {daysExpiry === null || daysExpiry === undefined ? "—" : daysExpiry <= -9000 ? "—" : String(Math.round(daysExpiry))}
                        </td>
                        <td className="py-1 px-2 text-xs whitespace-nowrap text-[var(--text-secondary)]">
                          {m.cc_last_call_date || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-muted)]">
                第 {page} / {totalPages} 页
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm disabled:opacity-40 hover:bg-[var(--bg-subtle)]"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm disabled:opacity-40 hover:bg-[var(--bg-subtle)]"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* 详情抽屉 */}
      {selectedId !== null && (
        <DetailDrawer memberId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

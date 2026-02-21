"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";

interface LeadsHandoffSlideProps {
  revealStep: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface StatRowProps {
  label: string;
  value: string;
  sub?: string;
}

function StatRow({ label, value, sub }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <span className="text-base text-slate-600">{label}</span>
      <div className="text-right">
        <span className="text-xl font-bold text-slate-900">{value}</span>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export function LeadsHandoffSlide({ revealStep }: LeadsHandoffSlideProps) {
  const { data } = useSWR("/api/analysis/summary", fetcher);
  const summary = data?.data ?? {};

  const leadsActual = summary.registrations?.actual ?? 0;
  const leadsTarget = summary.registrations?.target ?? 0;
  const leadsGapPct = leadsTarget > 0 ? ((leadsActual - leadsTarget) / leadsTarget) * 100 : 0;

  const conversionRate = summary.conversion_rate?.actual ?? 0;
  const payments = summary.payments?.actual ?? 0;
  const checkinRate = summary.checkin_rate?.actual ?? 0;
  const participationRate = summary.participation_rate?.actual ?? 0;

  const digestRate = leadsActual > 0 ? (payments / leadsActual) * 100 : 0;

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Title */}
      <div
        className="text-center"
        style={{ opacity: revealStep >= 0 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
          运营 → 业务
        </p>
        <h2 className="text-3xl font-bold text-slate-800">Leads 交接看板</h2>
      </div>

      {/* Two-side layout */}
      <div className="flex flex-1 gap-0 overflow-hidden rounded-2xl border border-slate-200 shadow-md">
        {/* Left: Ops side */}
        <div
          className="flex-1 bg-blue-50 p-6 flex flex-col gap-4"
          style={{
            opacity: revealStep >= 1 ? 1 : 0,
            transform: revealStep >= 1 ? "translateX(0)" : "translateX(-20px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-bold text-blue-700 uppercase tracking-wide">运营侧 — 产出</span>
          </div>
          <StatRow
            label="Leads 产出数"
            value={leadsActual.toLocaleString()}
            sub={`目标 ${leadsTarget.toLocaleString()}`}
          />
          <StatRow
            label="Leads 达成率"
            value={`${leadsTarget > 0 ? ((leadsActual / leadsTarget) * 100).toFixed(1) : "—"}%`}
            sub={leadsGapPct >= 0 ? `超额 ${leadsGapPct.toFixed(1)}%` : `差额 ${leadsGapPct.toFixed(1)}%`}
          />
          <StatRow
            label="打卡率"
            value={`${(checkinRate * 100).toFixed(1)}%`}
          />
          <StatRow
            label="参与率"
            value={`${(participationRate * 100).toFixed(1)}%`}
          />
        </div>

        {/* Divider */}
        <div className="flex flex-col items-center justify-center w-16 bg-white border-x border-slate-200 py-4">
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <div className="h-full w-px bg-slate-200" />
          </div>
          <div className="text-xs text-slate-400 font-semibold writing-mode-vertical rotate-90 whitespace-nowrap text-center px-2">
            ← 运营交付 · 业务承接 →
          </div>
        </div>

        {/* Right: Biz side */}
        <div
          className="flex-1 bg-orange-50 p-6 flex flex-col gap-4"
          style={{
            opacity: revealStep >= 2 ? 1 : 0,
            transform: revealStep >= 2 ? "translateX(0)" : "translateX(20px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-sm font-bold text-orange-700 uppercase tracking-wide">业务侧 — 承接</span>
          </div>
          <StatRow
            label="Leads 消化率"
            value={`${digestRate.toFixed(1)}%`}
            sub="已付费 / 注册"
          />
          <StatRow
            label="注册→付费转化率"
            value={`${(conversionRate * 100).toFixed(1)}%`}
          />
          <StatRow
            label="已付费单量"
            value={payments.toLocaleString()}
          />
        </div>
      </div>

      {/* Bottom: handoff efficiency */}
      <div
        className="rounded-xl bg-slate-50 border border-slate-200 px-6 py-4"
        style={{
          opacity: revealStep >= 3 ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        <p className="text-sm font-semibold text-slate-600 mb-3">交接效率指标</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400">Leads → 约课响应</span>
            <span className="text-2xl font-bold text-slate-800">
              {summary.leads_to_booking_hours != null ? `${summary.leads_to_booking_hours}h` : "—"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400">Leads → 首次付费</span>
            <span className="text-2xl font-bold text-slate-800">
              {summary.leads_to_payment_days != null ? `${summary.leads_to_payment_days}天` : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

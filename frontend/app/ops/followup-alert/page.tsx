"use client";

import { useState, useEffect } from "react";
import { ZeroFollowupAlert } from "@/components/ops/ZeroFollowupAlert";
import { PrePostCompareChart } from "@/components/ops/PrePostCompareChart";

// ── Types ───────────────────────────────────────────────────────────────────

interface ZeroStudent {
  student_id?: string;
  cc_name?: string;
  team?: string;
  first_paid_date?: string;
  enclosure_segment: string;
  days_since_paid?: number | null;
  monthly_called?: number;
  monthly_connected?: number;
  monthly_effective?: number;
}

interface CCEntry {
  team?: string | null;
  count: number;
}

interface AlertData {
  zero_followup_students: ZeroStudent[];
  total_zero: number;
  total_students: number;
  zero_rate: number;
  by_enclosure: Record<string, number>;
  by_cc: Record<string, CCEntry>;
}

interface CCRecord {
  channel?: string;
  team?: string;
  cc_name?: string;
  trial_classes?: number;
  attended?: number;
  pre_call_rate?: number;
  pre_connect_rate?: number;
  pre_effective_rate?: number;
  post_call_rate?: number;
  post_connect_rate?: number;
  post_effective_rate?: number;
  pre_called?: number;
  pre_connected?: number;
  post_called?: number;
  post_connected?: number;
}

interface ChannelSummary {
  pre_call_rate?: number;
  pre_connect_rate?: number;
  pre_effective_rate?: number;
  post_call_rate?: number;
  post_connect_rate?: number;
  post_effective_rate?: number;
}

interface CompareData {
  by_cc: CCRecord[];
  by_team: CCRecord[];
  by_channel: Record<string, ChannelSummary>;
  summary: ChannelSummary;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function FollowupAlertPage() {
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [alertLoading, setAlertLoading] = useState(true);
  const [alertError, setAlertError] = useState<string | null>(null);

  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [compareLoading, setCompareLoading] = useState(true);
  const [compareError, setCompareError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/analysis/paid-followup-alert`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: AlertData) => {
        setAlertData(d);
        setAlertError(null);
      })
      .catch((e: Error) => setAlertError(e.message))
      .finally(() => setAlertLoading(false));

    fetch(`/api/analysis/trial-class-compare`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: CompareData) => {
        setCompareData(d);
        setCompareError(null);
      })
      .catch((e: Error) => setCompareError(e.message))
      .finally(() => setCompareLoading(false));
  }, []);

  return (
    <div className="max-w-none space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">跟进预警 & 课前课后对比</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          F7 零跟进付费学员预警 · F10 课前 vs 课后跟进效果 A/B 对比
        </p>
      </div>

      {/* Section 1: Zero followup alert */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          零跟进付费学员预警（F7）
        </h2>
        <ZeroFollowupAlert
          data={alertData}
          isLoading={alertLoading}
          error={alertError}
        />
      </section>

      {/* Divider */}
      <div className="border-t border-slate-100" />

      {/* Section 2: Pre/Post compare */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          课前 vs 课后跟进效果对比（F10）
        </h2>
        <PrePostCompareChart
          data={compareData}
          isLoading={compareLoading}
          error={compareError}
        />
      </section>
    </div>
  );
}

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface MergedCC {
  cc_name: string;
  referral_participation_checked?: number | null;
  referral_participation_unchecked?: number | null;
  checkin_multiplier?: number | null;
}

interface D5Summary {
  avg_checkin_rate?: number | null;
  avg_referral_participation?: number | null;
  avg_conversion_ratio?: number | null;
}

interface CheckinMultiplierCardProps {
  data: MergedCC[];
  d5Summary: D5Summary;
  totalCC: number;
  achievedCount: number;
  avgOrderUsd?: number;
}

export function CheckinMultiplierCard({
  data,
  d5Summary,
  totalCC,
  achievedCount,
  avgOrderUsd = 850,
}: CheckinMultiplierCardProps) {
  // Aggregate checked vs unchecked referral participation
  let totalChecked = 0;
  let totalUnchecked = 0;
  let multiplierSum = 0;
  let multiplierCount = 0;

  for (const cc of data) {
    totalChecked += cc.referral_participation_checked ?? 0;
    totalUnchecked += cc.referral_participation_unchecked ?? 0;
    if (cc.checkin_multiplier != null) {
      multiplierSum += cc.checkin_multiplier;
      multiplierCount += 1;
    }
  }

  const avgMultiplier = multiplierCount > 0 ? multiplierSum / multiplierCount : 0;
  const avgChecked = totalChecked > 0 && totalUnchecked > 0
    ? totalChecked / Math.max(data.length, 1)
    : 0;
  const avgUnchecked = totalUnchecked / Math.max(data.length, 1);

  // "If all achieved" projection
  const unachivedCount = totalCC - achievedCount;
  const avgRefPerCC = d5Summary.avg_referral_participation ?? 0;
  const estimatedExtraReg = Math.round(unachivedCount * avgRefPerCC * (avgMultiplier - 1));
  const estimatedExtraRevenue = Math.round(estimatedExtraReg * (d5Summary.avg_conversion_ratio ?? 0.15) * avgOrderUsd);

  const barData = [
    {
      label: "已打卡",
      value: parseFloat(avgChecked.toFixed(2)),
      fill: "#10b981",
    },
    {
      label: "未打卡",
      value: parseFloat(avgUnchecked.toFixed(2)),
      fill: "#f97316",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Big multiplier number */}
      <div className="flex items-end gap-3">
        <div>
          <p className="text-xs text-slate-400 mb-1">平均打卡倍率</p>
          <p className="text-5xl font-extrabold text-emerald-600">
            {avgMultiplier > 0 ? `${avgMultiplier.toFixed(2)}x` : "—"}
          </p>
        </div>
        <p className="text-sm text-slate-500 mb-2 leading-tight">
          打卡学员带新系数
          <br />
          是未打卡的{" "}
          <span className="font-semibold text-emerald-600">
            {avgMultiplier > 0 ? `${avgMultiplier.toFixed(1)}` : "—"}
          </span>{" "}
          倍
        </p>
      </div>

      {/* Bar chart — checked vs unchecked avg referral participation */}
      <div>
        <p className="text-xs text-slate-500 mb-2">打卡 vs 未打卡 · 人均带新参与（均值）</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart
            data={barData}
            margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v) => [v, "人均带新参与"]}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {barData.map((entry) => (
                <Cell key={entry.label} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* "If all achieved" projection */}
      {unachivedCount > 0 && avgMultiplier > 1 && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs space-y-1">
          <p className="font-semibold text-emerald-700">如果全员达标打卡</p>
          <p className="text-slate-600">
            预计新增{" "}
            <span className="font-medium text-emerald-700">
              {estimatedExtraReg}
            </span>{" "}
            个注册
          </p>
          {estimatedExtraRevenue > 0 && (
            <p className="text-slate-600">
              预计增加收入约{" "}
              <span className="font-medium text-emerald-700">
                ${estimatedExtraRevenue.toLocaleString()}
              </span>
            </p>
          )}
          <p className="text-slate-400">
            未达标 {unachivedCount} 人 × 带新提升系数
          </p>
        </div>
      )}
    </div>
  );
}

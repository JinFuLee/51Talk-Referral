"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChannelBarChartProps {
  data: Record<string, unknown>;
}

interface ChannelStat {
  channel: string;
  label?: string;
  registrations: number;
  payments: number;
  conversion_rate?: number;
}

function extractChannels(data: Record<string, unknown>): ChannelStat[] {
  const channels = data.channels;
  if (Array.isArray(channels)) return channels as ChannelStat[];
  // Fallback: treat top-level keys as channel names
  return Object.entries(data)
    .filter(([, v]) => v && typeof v === "object")
    .map(([key, val]) => {
      const ch = val as Record<string, unknown>;
      return {
        channel: key,
        label: key === "narrow" ? "窄口" : key === "wide" ? "宽口" : key,
        registrations: Number(ch.registrations ?? 0),
        payments: Number(ch.payments ?? 0),
        conversion_rate: Number(ch.conversion_rate ?? 0),
      };
    });
}

export function ChannelBarChart({ data }: ChannelBarChartProps) {
  const stats = extractChannels(data).map((s) => ({
    name: s.label ?? s.channel,
    注册: s.registrations,
    付费: s.payments,
  }));

  if (stats.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        暂无渠道数据
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={stats} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="注册" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="付费" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

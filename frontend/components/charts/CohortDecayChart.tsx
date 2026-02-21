"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DecayPoint {
  month: string;
  reach_rate?: number;
  participation_rate?: number;
  checkin_rate?: number;
  referral_ratio?: number;
}

interface CohortDecayChartProps {
  data?: DecayPoint[];
}

const LINES = [
  { key: "reach_rate", label: "触达率", color: "hsl(var(--chart-4))" },
  { key: "participation_rate", label: "参与率", color: "hsl(var(--success))" },
  { key: "checkin_rate", label: "打卡率", color: "#f59e0b" },
  { key: "referral_ratio", label: "带货比", color: "#f43f5e" },
];

const MOCK_DATA: DecayPoint[] = [
  { month: "M1", reach_rate: 0.82, participation_rate: 0.25, checkin_rate: 0.75, referral_ratio: 0.3 },
  { month: "M2", reach_rate: 0.65, participation_rate: 0.18, checkin_rate: 0.62, referral_ratio: 0.22 },
  { month: "M3", reach_rate: 0.50, participation_rate: 0.13, checkin_rate: 0.52, referral_ratio: 0.15 },
  { month: "M4", reach_rate: 0.38, participation_rate: 0.09, checkin_rate: 0.44, referral_ratio: 0.10 },
  { month: "M5", reach_rate: 0.30, participation_rate: 0.07, checkin_rate: 0.40, referral_ratio: 0.07 },
  { month: "M6", reach_rate: 0.25, participation_rate: 0.05, checkin_rate: 0.38, referral_ratio: 0.05 },
];

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export function CohortDecayChart({ data = MOCK_DATA }: CohortDecayChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={pct} tick={{ fontSize: 11 }} domain={[0, 1]} />
        <Tooltip formatter={(v: number) => pct(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {LINES.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.label}
            stroke={l.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

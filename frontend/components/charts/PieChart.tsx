"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PieDataItem {
  name: string;
  value: number;
}

interface PieChartProps {
  data: PieDataItem[];
  title?: string;
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function PieChart({ data, title }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      {title && <p className="text-sm font-medium text-gray-700 mb-3">{title}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [
              `${value.toLocaleString()} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
              "",
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

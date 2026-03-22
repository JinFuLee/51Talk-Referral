'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Label,
} from 'recharts';

interface ScatterPoint {
  cc_name: string;
  x: number; // 带新系数
  y: number; // 付费金额 (USD)
}

interface EfficiencyScatterProps {
  data: ScatterPoint[];
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: ScatterPoint;
}

function CustomDot({ cx = 0, cy = 0, payload }: CustomDotProps) {
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="#3b82f6"
        fillOpacity={0.7}
        stroke="#2563eb"
        strokeWidth={1}
      />
      <text x={cx + 7} y={cy + 4} fontSize={9} fill="var(--text-muted)" textAnchor="start">
        {payload?.cc_name?.split('_')[0] ?? ''}
      </text>
    </g>
  );
}

export function EfficiencyScatter({ data }: EfficiencyScatterProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--text-muted)]">
        暂无散点数据
      </div>
    );
  }

  const xMid = data.reduce((s, d) => s + d.x, 0) / data.length;
  const yMid = data.reduce((s, d) => s + d.y, 0) / data.length;

  const quadrantLabels = [
    { x: xMid * 0.5, y: yMid * 1.5, text: '低效高收', color: '#f59e0b' },
    { x: xMid * 1.5, y: yMid * 1.5, text: '明星CC', color: '#22c55e' },
    { x: xMid * 0.5, y: yMid * 0.5, text: '待激活', color: '#ef4444' },
    { x: xMid * 1.5, y: yMid * 0.5, text: '潜力CC', color: '#3b82f6' },
  ];

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis
            type="number"
            dataKey="x"
            name="带新系数"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          >
            <Label
              value="带新系数"
              offset={-10}
              position="insideBottom"
              style={{ fontSize: 10, fill: 'var(--text-secondary)' }}
            />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            name="付费金额"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          >
            <Label
              value="付费金额(USD)"
              angle={-90}
              position="insideLeft"
              offset={15}
              style={{ fontSize: 10, fill: 'var(--text-secondary)' }}
            />
          </YAxis>
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload as ScatterPoint;
              return (
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded p-2 text-xs shadow">
                  <div className="font-semibold">{d.cc_name}</div>
                  <div>带新系数: {d.x.toFixed(2)}</div>
                  <div>付费金额: ${d.y.toLocaleString()}</div>
                </div>
              );
            }}
          />
          <ReferenceLine x={xMid} stroke="var(--border-default)" strokeDasharray="4 2" />
          <ReferenceLine y={yMid} stroke="var(--border-default)" strokeDasharray="4 2" />
          <Scatter data={data} shape={<CustomDot />} />
        </ScatterChart>
      </ResponsiveContainer>

      {/* 象限标注图例 */}
      <div className="flex flex-wrap gap-3 mt-1 justify-center">
        {quadrantLabels.map((q) => (
          <div key={q.text} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: q.color }} />
            <span className="text-xs text-[var(--text-muted)]">{q.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

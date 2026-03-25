/**
 * MiniSparkline — 轻量 SVG 迷你趋势线
 * 用途：KPI 卡片旁展示 7 天历史趋势，纯 SVG 实现（不依赖 Recharts）
 */

interface MiniSparklineProps {
  /** 数值数组（7 个数据点），含 null 表示当日无数据 */
  data: (number | null)[];
  width?: number;
  height?: number;
  /** 覆盖自动颜色（自动：上升=success, 下降=danger, 持平=muted） */
  color?: string;
}

function trendColor(data: (number | null)[]): string {
  const valid = data.filter((v): v is number => v !== null);
  if (valid.length < 2) return 'var(--text-muted)';
  const first = valid[0];
  const last = valid[valid.length - 1];
  if (last > first * 1.01) return 'var(--color-success)';
  if (last < first * 0.99) return 'var(--color-danger)';
  return 'var(--text-muted)';
}

export function MiniSparkline({ data, width = 60, height = 20, color }: MiniSparklineProps) {
  const valid = data.filter((v): v is number => v !== null);
  if (valid.length < 2) return null;

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;

  // 仅对非 null 点绘制折线
  const points: { x: number; y: number }[] = [];
  const step = width / (data.length - 1);

  data.forEach((v, i) => {
    if (v !== null) {
      const x = i * step;
      const y = height - 2 - ((v - min) / range) * (height - 4);
      points.push({ x, y });
    }
  });

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const strokeColor = color ?? trendColor(data);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="inline-block shrink-0"
      style={{ overflow: 'visible' }}
    >
      {/* 趋势线 */}
      <polyline
        points={polyline}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {/* 最后一个点标记 */}
      {last && <circle cx={last.x} cy={last.y} r="2.5" fill={strokeColor} opacity="0.9" />}
    </svg>
  );
}

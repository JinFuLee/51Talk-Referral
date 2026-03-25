'use client';

interface AchievementGaugeProps {
  /** Achievement rate as a decimal, e.g. 0.85 = 85% */
  value: number;
  label?: string;
  size?: number;
}

export function AchievementGauge({ value, label = '达成率', size = 120 }: AchievementGaugeProps) {
  const pct = Math.min(1, Math.max(0, value));
  const percentage = pct * 100;

  // SVG arc parameters
  const radius = 42;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * radius;
  // We use a 270° arc (¾ circle), starting from 135° (bottom-left)
  const arcLength = circumference * 0.75;
  const dashOffset = arcLength * (1 - pct);

  const color =
    percentage >= 100
      ? '#10b981' // success
      : percentage >= 80
        ? '#F59E0B' // warning
        : '#EF4444'; // danger

  const trackColor = '#E8E7E1'; // --n-200

  // Transform: rotate so arc starts at 135° (bottom-left), going clockwise
  const rotation = 135;

  return (
    <div
      className="flex flex-col items-center justify-center gap-1"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 120 120" className="overflow-visible">
        {/* Track arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={10}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
        {/* Value arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${arcLength - dashOffset} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        {/* Center text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={18}
          fontWeight="700"
          fill={color}
        >
          {percentage.toFixed(0)}%
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fill="var(--n-400)"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}

'use client';

interface BrandDotProps {
  tooltip: string;
  className?: string;
}

// 4px 品牌圆点 — 渐进式披露 L1 触发器
export function BrandDot({ tooltip, className }: BrandDotProps) {
  return (
    <span
      className={`brand-dot ${className || ''}`}
      title={tooltip}
      aria-label={tooltip}
      role="img"
    />
  );
}

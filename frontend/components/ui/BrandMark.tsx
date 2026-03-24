'use client';

interface BrandMarkProps {
  size?: number; // 默认 20
  className?: string;
}

// 递归环 SVG — SEE 品牌标志
export function BrandMark({ size = 20, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-label="SEE — Self-Evolving Ecosystem"
      className={className}
    >
      <path
        d="M9 8A3.5 3.5 0 1 1 8 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 8A3.5 3.5 0 1 1 8 11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

'use client';

interface RiskAlertProps {
  message: string;
}

export function RiskAlert({ message }: RiskAlertProps) {
  return (
    <div className="relative group inline-flex items-center justify-center p-1">
      {/* 脉冲红点 (缓慢呼吸) */}
      <div className="relative w-2 h-2">
        <div className="absolute inset-0 bg-[var(--color-danger)] rounded-full group-hover:animate-none animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
        <div className="absolute inset-0 bg-[var(--color-danger)] rounded-full opacity-75 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] group-hover:animate-none" />
      </div>

      {/* Hover Tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-max max-w-[220px] px-2.5 py-1.5 bg-[var(--bg-subtle)] backdrop-blur-sm text-white text-xs leading-snug rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg font-medium">
        {message}
        {/* Tooltip Arrow */}
        <div className="absolute left-1/2 -translate-x-1/2 top-full border-[5px] border-transparent border-t-slate-800/95" />
      </div>
    </div>
  );
}

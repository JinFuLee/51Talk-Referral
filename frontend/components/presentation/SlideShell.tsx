'use client';

import React from 'react';
import { clsx } from 'clsx';

interface SlideShellProps {
  children: React.ReactNode;
  slideNumber: number;
  totalSlides: number;
  title: string;
  subtitle?: string;
  section?: string;
  /** 顶部一句话结论（数据驱动自动生成） */
  insight?: React.ReactNode;
}

export function SlideShell({
  children,
  slideNumber,
  totalSlides,
  title,
  subtitle,
  section,
  insight,
}: SlideShellProps) {
  const progressPct = Math.round((slideNumber / totalSlides) * 100);

  return (
    <div
      className={clsx(
        'relative flex flex-col w-full h-screen bg-[var(--bg-surface)] overflow-hidden',
        'animate-fadeIn'
      )}
      style={{ animation: 'slideIn 0.3s ease forwards' }}
    >
      {/* 51Talk watermark */}
      <div className="absolute top-5 right-6 opacity-10 select-none pointer-events-none">
        <span className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
          51Talk
        </span>
      </div>

      {/* Header */}
      <div className="px-10 pt-8 pb-4 flex-none">
        {section && (
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-widest mb-1">
            {section}
          </p>
        )}
        <h1 className="text-3xl font-bold text-[var(--text-primary)] leading-tight">{title}</h1>
        {subtitle && <p className="text-lg text-[var(--text-secondary)] mt-1">{subtitle}</p>}
        {insight && (
          <div className="mt-2 px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] inline-block max-w-full">
            <span className="text-sm font-medium text-[var(--text-primary)]">{insight}</span>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 px-10 pb-6 overflow-hidden">{children}</div>

      {/* Footer */}
      <div className="flex-none px-10 pb-4 flex items-center justify-between">
        <div className="w-full mr-6">
          <div className="w-full bg-[var(--bg-subtle)] rounded-full h-1">
            <div
              className="h-1 rounded-full bg-primary transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap font-medium">
          {slideNumber} / {totalSlides}
        </span>
      </div>
    </div>
  );
}

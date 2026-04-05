'use client';

import React from 'react';
import { clsx } from 'clsx';
import { KnowledgeLink } from '@/components/ui/KnowledgeLink';
import { BrandMark } from '@/components/ui/BrandMark';

interface SlideShellProps {
  children: React.ReactNode;
  slideNumber: number;
  totalSlides: number;
  title: string;
  subtitle?: string;
  section?: string;
  insight?: React.ReactNode;
  knowledgeChapter?: string;
  knowledgeBook?: string;
  direction?: 'forward' | 'backward';
}

export function SlideShell({
  children,
  slideNumber,
  totalSlides,
  title,
  subtitle,
  section,
  insight,
  knowledgeChapter,
  knowledgeBook,
  direction = 'forward',
}: SlideShellProps) {
  const progressPct = Math.round((slideNumber / totalSlides) * 100);
  const animClass = direction === 'backward' ? 'slide-enter-left' : 'slide-enter-right';

  return (
    <div className={clsx('relative flex flex-col w-full h-screen overflow-hidden', animClass)}>
      {/* ── 暗色电影背景 ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 深色渐变底 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#0f0f0f]" />
        {/* 金色光晕 — 右上（暗底上更突出） */}
        <div
          className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full animate-auth-float"
          style={{
            background:
              'radial-gradient(circle, rgba(255,209,0,0.08) 0%, rgba(255,209,0,0.02) 40%, transparent 70%)',
          }}
        />
        {/* 深蓝光晕 — 左下 */}
        <div
          className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full animate-auth-float-reverse"
          style={{
            background: 'radial-gradient(circle, rgba(27,54,93,0.06) 0%, transparent 60%)',
          }}
        />
        {/* 颗粒纹理 grain — 电影质感 */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px',
          }}
        />
        {/* 微妙网格 */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* ── 品牌水印 — 右上角 ── */}
      <div className="absolute top-5 right-6 flex items-center gap-2 opacity-[0.12] select-none pointer-events-none">
        <BrandMark size={24} className="text-brand-p1" />
        <span className="text-xl font-black tracking-tight text-white/20 font-display">51Talk</span>
      </div>

      {/* ── Header ── */}
      <div className="relative z-10 px-10 pt-8 pb-4 flex-none">
        {section && (
          <p className="text-[10px] font-bold text-brand-p1 uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
            <span className="w-5 h-[2px] bg-brand-p1 rounded-full" />
            {section}
          </p>
        )}
        <h1 className="text-3xl font-bold text-[#f5f5f5] leading-tight font-display inline-flex items-center gap-2">
          {title}
          {knowledgeChapter && (
            <KnowledgeLink chapter={knowledgeChapter} book={knowledgeBook} className="w-5 h-5" />
          )}
        </h1>
        {subtitle && <p className="text-lg text-[#a0a0a0] mt-1 font-light">{subtitle}</p>}
        {insight && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 inline-block max-w-full backdrop-blur-sm">
            <span className="text-sm font-medium text-[#f5f5f5]">{insight}</span>
          </div>
        )}
      </div>

      {/* ── Content area ── */}
      <div className="relative z-10 flex-1 px-10 pb-6 overflow-hidden slide-content-dark">
        {children}
      </div>

      {/* ── Footer — 品牌进度条 ── */}
      <div className="relative z-10 flex-none px-10 pb-5 flex items-center gap-4">
        <div className="flex-1">
          <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
            <div
              className="h-1 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progressPct}%`,
                background:
                  'linear-gradient(90deg, var(--brand-p1) 0%, var(--brand-p1-hover) 100%)',
                boxShadow: '0 0 12px rgba(255,209,0,0.3)',
              }}
            />
          </div>
        </div>
        <span className="text-xs text-white/40 whitespace-nowrap font-mono font-medium tracking-wider">
          {String(slideNumber).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

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
  /** 顶部一句话结论（数据驱动自动生成） */
  insight?: React.ReactNode;
  /** 知识库跳转（章节 ID），传入后标题旁显示 ⓘ 图标 */
  knowledgeChapter?: string;
  /** 知识库书籍 ID（默认 business-bible） */
  knowledgeBook?: string;
  /** 切换方向：'forward' | 'backward'，影响进场动效 */
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
      {/* ── 品牌氛围背景（与登录页同系） ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 暖白渐变底 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--n-50)] via-[var(--bg-surface)] to-[var(--n-100)]" />
        {/* 金色光晕 — 右上 */}
        <div
          className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full animate-auth-float"
          style={{
            background:
              'radial-gradient(circle, rgba(255,209,0,0.06) 0%, rgba(255,209,0,0.02) 40%, transparent 70%)',
          }}
        />
        {/* 深蓝光晕 — 左下 */}
        <div
          className="absolute -bottom-32 -left-32 w-[350px] h-[350px] rounded-full animate-auth-float-reverse"
          style={{
            background: 'radial-gradient(circle, rgba(27,54,93,0.04) 0%, transparent 60%)',
          }}
        />
        {/* 微妙网格 */}
        <div
          className="absolute inset-0 opacity-[0.008]"
          style={{
            backgroundImage:
              'linear-gradient(var(--n-400) 1px, transparent 1px), linear-gradient(90deg, var(--n-400) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* ── 品牌水印 — 右上角 ── */}
      <div className="absolute top-5 right-6 flex items-center gap-2 opacity-[0.08] select-none pointer-events-none">
        <BrandMark size={24} className="text-[var(--text-primary)]" />
        <span className="text-xl font-black tracking-tight text-[var(--text-primary)] font-display">
          51Talk
        </span>
      </div>

      {/* ── Header ── */}
      <div className="relative z-10 px-10 pt-8 pb-4 flex-none">
        {section && (
          <p className="text-[10px] font-bold text-[var(--brand-p2)] uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
            <span className="w-5 h-[2px] bg-[var(--brand-p1)] rounded-full" />
            {section}
          </p>
        )}
        <h1 className="text-3xl font-bold text-[var(--text-primary)] leading-tight font-display inline-flex items-center gap-2">
          {title}
          {knowledgeChapter && (
            <KnowledgeLink chapter={knowledgeChapter} book={knowledgeBook} className="w-5 h-5" />
          )}
        </h1>
        {subtitle && (
          <p className="text-lg text-[var(--text-secondary)] mt-1 font-light">{subtitle}</p>
        )}
        {insight && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-[var(--color-action-surface)] border border-[var(--brand-p1)]/15 inline-block max-w-full">
            <span className="text-sm font-medium text-[var(--text-primary)]">{insight}</span>
          </div>
        )}
      </div>

      {/* ── Content area ── */}
      <div className="relative z-10 flex-1 px-10 pb-6 overflow-hidden">{children}</div>

      {/* ── Footer — 品牌进度条 ── */}
      <div className="relative z-10 flex-none px-10 pb-5 flex items-center gap-4">
        <div className="flex-1">
          <div className="w-full bg-[var(--n-200)] rounded-full h-1 overflow-hidden">
            <div
              className="h-1 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progressPct}%`,
                background:
                  'linear-gradient(90deg, var(--brand-p1) 0%, var(--brand-p1-hover) 100%)',
              }}
            />
          </div>
        </div>
        <span className="text-xs text-[var(--n-500)] whitespace-nowrap font-mono font-medium tracking-wider">
          {String(slideNumber).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

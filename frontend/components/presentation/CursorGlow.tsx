'use client';

import { useRef, useEffect } from 'react';

/**
 * 鼠标跟踪金色光晕 — 汇报模式聚焦效果。
 * rAF 节流 + 触屏设备自动跳过。
 * 基于 cinematic-product-site Skill §6.3 改造，品牌金色替代酸性黄绿。
 */
export function CursorGlow() {
  const elRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // 触屏设备无鼠标，跳过
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(hover: none)').matches) return;
    // prefers-reduced-motion 跳过
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const handler = (e: MouseEvent) => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        if (elRef.current) {
          elRef.current.style.background = `radial-gradient(600px circle at ${e.clientX}px ${e.clientY}px, rgba(255,209,0,0.05), transparent 70%)`;
        }
        rafRef.current = null;
      });
    };

    window.addEventListener('mousemove', handler);
    return () => {
      window.removeEventListener('mousemove', handler);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={elRef} className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true" />
  );
}

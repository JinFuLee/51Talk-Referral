'use client';

import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

interface ChartContextType {
  isCompact: boolean;
  width: number;
}

const ChartContext = createContext<ChartContextType>({ isCompact: false, width: 0 });

export const useResponsiveChart = () => useContext(ChartContext);

interface ResponsiveChartContainerProps {
  children: React.ReactNode;
  className?: string;
  minHeight?: number;
  /**
   * 触发紧凑模式的宽度阈值，默认 500px
   */
  compactThreshold?: number;
}

export function ResponsiveChartContainer({
  children,
  className,
  minHeight = 300,
  compactThreshold = 500,
}: ResponsiveChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, isCompact: false });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setDimensions({
          width,
          isCompact: width < compactThreshold,
        });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [compactThreshold]);

  return (
    <ChartContext.Provider value={dimensions}>
      <div
        ref={containerRef}
        className={cn(
          'w-full h-full relative transition-all duration-300',
          dimensions.isCompact ? 'chart-compact-mode' : 'chart-full-mode',
          className
        )}
        style={{ minHeight }}
      >
        {children}
      </div>
    </ChartContext.Provider>
  );
}

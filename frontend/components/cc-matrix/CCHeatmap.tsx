'use client';

import { useState } from 'react';

export interface HeatmapCell {
  cc_name: string;
  segment: string;
  value: number;
}

interface CCHeatmapProps {
  rows: string[];
  cols: string[];
  data: HeatmapCell[];
  onCCClick?: (ccName: string) => void;
  onCellClick?: (ccName: string, segment: string) => void;
}

function interpolateColor(value: number, min: number, max: number): string {
  if (max === min) return 'hsl(210,70%,60%)';
  const t = (value - min) / (max - min);
  // 蓝(低) → 黄(中) → 红(高)
  if (t < 0.5) {
    const s = t * 2;
    const r = Math.round(59 + s * (234 - 59));
    const g = Math.round(130 + s * (179 - 130));
    const b = Math.round(246 + s * (8 - 246));
    return `rgb(${r},${g},${b})`;
  } else {
    const s = (t - 0.5) * 2;
    const r = Math.round(234 + s * (239 - 234));
    const g = Math.round(179 + s * (68 - 179));
    const b = Math.round(8 + s * (68 - 8));
    return `rgb(${r},${g},${b})`;
  }
}

export function CCHeatmap({ rows, cols, data, onCCClick, onCellClick }: CCHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // 建立 (cc_name, segment) → value 查找表
  const valueMap = new Map<string, number>();
  for (const cell of data) {
    valueMap.set(`${cell.cc_name}::${cell.segment}`, cell.value);
  }

  const allValues = data.map((d) => d.value);
  const minVal = allValues.length ? Math.min(...allValues) : 0;
  const maxVal = allValues.length ? Math.max(...allValues) : 1;

  const CELL_W = 56;
  const CELL_H = 22;
  const CC_COL_W = 110;

  return (
    <div className="relative overflow-auto">
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-xs bg-[var(--n-900)] text-white rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 28 }}
        >
          {tooltip.text}
        </div>
      )}

      <div className="inline-block min-w-full">
        {/* 表头行 */}
        <div className="flex" style={{ marginLeft: CC_COL_W }}>
          {cols.map((seg) => (
            <div
              key={seg}
              className="flex-shrink-0 text-center text-[10px] text-[var(--text-muted)] font-medium truncate py-1 border-b border-[var(--border-subtle)]"
              style={{ width: CELL_W }}
            >
              {seg}
            </div>
          ))}
        </div>

        {/* 数据行 */}
        {rows.map((cc) => (
          <div key={cc} className="flex items-center hover:bg-[var(--bg-subtle)] group">
            {/* CC 名称列 */}
            <div
              className="flex-shrink-0 truncate text-xs font-medium text-[var(--text-primary)] cursor-pointer hover:text-action-accent transition-colors pr-2 py-0.5"
              style={{ width: CC_COL_W, minWidth: CC_COL_W }}
              onClick={() => onCCClick?.(cc)}
              title={cc}
            >
              {cc}
            </div>

            {/* 格子 */}
            {cols.map((seg) => {
              const val = valueMap.get(`${cc}::${seg}`);
              const hasVal = val !== undefined;
              const bg = hasVal ? interpolateColor(val!, minVal, maxVal) : 'transparent';
              const textColor =
                hasVal && (val! - minVal) / (maxVal - minVal) > 0.6 ? '#fff' : '#222';

              return (
                <div
                  key={seg}
                  className="flex-shrink-0 flex items-center justify-center text-[10px] font-mono cursor-pointer border border-white/10 transition-all hover:ring-1 hover:ring-action-accent-muted hover:z-10"
                  style={{
                    width: CELL_W,
                    height: CELL_H,
                    backgroundColor: bg,
                    color: hasVal ? textColor : 'transparent',
                  }}
                  onClick={() => hasVal && onCellClick?.(cc, seg)}
                  onMouseMove={(e) =>
                    hasVal &&
                    setTooltip({
                      x: e.clientX,
                      y: e.clientY,
                      text: `${cc} · ${seg}: ${(val! * 100).toFixed(1)}%`,
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                >
                  {hasVal ? `${(val! * 100).toFixed(0)}%` : '-'}
                </div>
              );
            })}
          </div>
        ))}

        {/* 色阶图例 */}
        <div className="flex items-center gap-2 mt-3 text-xs text-[var(--text-muted)]">
          <span>低</span>
          <div
            className="h-3 w-32 rounded"
            style={{
              background:
                'linear-gradient(to right, rgb(59,130,246), rgb(234,179,8), rgb(239,68,68))',
            }}
          />
          <span>高</span>
        </div>
      </div>
    </div>
  );
}

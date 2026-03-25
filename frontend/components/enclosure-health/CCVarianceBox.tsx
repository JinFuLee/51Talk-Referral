'use client';

export interface VarianceRow {
  segment: string;
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
}

interface CCVarianceBoxProps {
  data: VarianceRow[];
}

function formatPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export function CCVarianceBox({ data }: CCVarianceBoxProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-[var(--text-muted)]">
        暂无方差数据
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((row) => {
        const range = row.max - row.min;
        const meanPos = range > 0 ? ((row.mean - row.min) / range) * 100 : 50;
        const medianPos = range > 0 ? ((row.median - row.min) / range) * 100 : 50;

        return (
          <div key={row.segment}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-primary)]">{row.segment}</span>
              <div className="flex gap-3 text-[10px] text-[var(--text-muted)] font-mono">
                <span>min {formatPct(row.min)}</span>
                <span>中位 {formatPct(row.median)}</span>
                <span>均值 {formatPct(row.mean)}</span>
                <span>max {formatPct(row.max)}</span>
                <span className="text-yellow-500">±{formatPct(row.std)}</span>
              </div>
            </div>

            {/* 简化箱线图：横向条 */}
            <div className="relative h-5 bg-[var(--bg-subtle)] rounded overflow-hidden">
              {/* min → max 全程条 */}
              <div
                className="absolute inset-y-0 bg-navy-100 dark:bg-navy-900/30 rounded"
                style={{ left: '0%', right: '0%' }}
              />

              {/* IQR 盒子 (mean ± std 近似) */}
              {(() => {
                const left = Math.max(0, ((row.mean - row.std - row.min) / (range || 1)) * 100);
                const right = Math.max(
                  0,
                  100 - ((row.mean + row.std - row.min) / (range || 1)) * 100
                );
                return (
                  <div
                    className="absolute inset-y-0 bg-navy-300/50 dark:bg-navy-400/40 rounded"
                    style={{ left: `${left}%`, right: `${right}%` }}
                  />
                );
              })()}

              {/* 均值竖线 */}
              <div
                className="absolute inset-y-0 w-0.5 bg-action-accent"
                style={{ left: `${meanPos}%` }}
              />

              {/* 中位数竖线 */}
              <div
                className="absolute inset-y-0 w-0.5 bg-orange-400"
                style={{ left: `${medianPos}%` }}
              />
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)] mt-1">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-action-accent" />
          <span>均值</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-orange-400" />
          <span>中位数</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 bg-navy-300/50 rounded" />
          <span>均值±1σ</span>
        </div>
      </div>
    </div>
  );
}

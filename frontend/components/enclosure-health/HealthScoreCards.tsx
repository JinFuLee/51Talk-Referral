'use client';

import { useTranslations } from 'next-intl';
import { formatRate } from '@/lib/utils';
export interface HealthScore {
  segment: string;
  participation: number;
  conversion: number;
  checkin: number;
  health_score: number;
  level: 'green' | 'yellow' | 'red';
}

interface HealthScoreCardsProps {
  data: HealthScore[];
  onSegmentClick?: (segment: string) => void;
}

function LevelBadge({
  level,
  labels,
}: {
  level: 'green' | 'yellow' | 'red';
  labels: { green: string; yellow: string; red: string };
}) {
  const map = {
    green: { bg: 'bg-success-surface', text: 'text-success-token' },
    yellow: { bg: 'bg-warning-surface', text: 'text-warning-token' },
    red: { bg: 'bg-danger-surface', text: 'text-danger-token' },
  };
  const s = map[level];
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${s.bg} ${s.text}`}>
      {labels[level]}
    </span>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

export function HealthScoreCards({ data, onSegmentClick }: HealthScoreCardsProps) {
    const t = useTranslations('HealthScoreCards');

  if (!data.length) {
    return <div className="text-sm text-muted-token text-center py-8">{t('noData')}</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {data.map((item) => {
        const borderColor =
          item.level === 'green'
            ? 'border-success-token'
            : item.level === 'yellow'
              ? 'border-warning-token'
              : 'border-danger-token';

        return (
          <div
            key={item.segment}
            className={`bg-surface border-l-4 ${borderColor} rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => onSegmentClick?.(item.segment)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-primary-token truncate">
                {item.segment}
              </span>
              <LevelBadge level={item.level} labels={{ green: t('levels.green'), yellow: t('levels.yellow'), red: t('levels.red') }} />
            </div>

            {/* 健康分环形进度 */}
            <div className="flex items-center gap-3 mb-2">
              <div className="relative w-12 h-12 flex-shrink-0">
                <svg viewBox="0 0 40 40" className="w-12 h-12 -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="var(--border-subtle)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke={scoreColor(item.health_score)}
                    strokeWidth="4"
                    strokeDasharray={`${(item.health_score / 100) * 100.53} 100.53`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-[11px] font-bold font-mono"
                    style={{ color: scoreColor(item.health_score) }}
                  >
                    {Math.round(item.health_score)}
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-0.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-token">{t('participation')}</span>
                  <span className="font-mono tabular-nums">{formatRate(item.participation)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-token">{t('conversion')}</span>
                  <span className="font-mono tabular-nums">{formatRate(item.conversion)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-token">{t('checkin')}</span>
                  <span className="font-mono tabular-nums">{formatRate(item.checkin)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

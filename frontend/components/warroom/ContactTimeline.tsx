'use client';

import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import type { WarroomTimeline } from '@/lib/types/cross-analysis';
interface ContactTimelineProps {
  stdtId: string;
}

const ROLES = [
  { key: 'cc_connected' as const, label: 'CC' },
  { key: 'ss_connected' as const, label: 'SS' },
  { key: 'lp_connected' as const, label: 'LP' },
];

function DotCell({
  connected,
  labelConnected,
  labelNot,
}: {
  connected: boolean;
  labelConnected: string;
  labelNot: string;
}) {
  return (
    <div className="flex items-center justify-center h-5 w-5">
      <span
        className={`w-3 h-3 rounded-full ${connected ? 'bg-success-token' : 'bg-n-200'}`}
        title={connected ? labelConnected : labelNot}
      />
    </div>
  );
}

export function ContactTimeline({ stdtId }: ContactTimelineProps) {
  const t = useTranslations('ContactTimeline');

  const { data, isLoading, error } = useFilteredSWR<WarroomTimeline>(
    `/api/high-potential/${stdtId}/timeline`
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner size="sm" />
        <span className="ml-2 text-xs text-muted-token">{t('loading')}</span>
      </div>
    );
  }

  if (error || !data) {
    return <div className="py-4 text-center text-xs text-muted-token">{t('error')}</div>;
  }

  const logs = data.daily_log.slice(-30);

  return (
    <div className="mt-3 rounded-xl border border-default-token bg-subtle p-3">
      <div className="flex items-center gap-3 mb-2 text-xs text-muted-token">
        <span className="font-medium text-secondary-token">{t('title')}</span>
        <span>
          {t('enclosure')}：{data.profile.enclosure}
        </span>
        <span
          className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium ${
            data.is_high_potential
              ? 'bg-warning-surface text-warning-token'
              : 'bg-subtle text-muted-token dark:text-muted-token'
          }`}
        >
          {data.is_high_potential ? t('highPotential') : t('normalStudent')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: `${Math.max(logs.length * 28, 200)}px` }}>
          {/* Date labels */}
          <div className="flex gap-0.5 mb-1">
            <div className="w-8 shrink-0" />
            {logs.map((d) => (
              <div
                key={d.date}
                className="flex-1 text-center text-[9px] text-muted-token leading-none"
              >
                {d.date.slice(8)}
              </div>
            ))}
          </div>

          {/* CC / SS / LP rows */}
          {ROLES.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-0.5 mb-1">
              <div className="w-8 shrink-0 text-[10px] font-semibold text-secondary-token">
                {label}
              </div>
              {logs.map((d) => (
                <div key={d.date} className="flex-1 flex items-center justify-center">
                  <DotCell
                    connected={d[key]}
                    labelConnected={t('connected')}
                    labelNot={t('notConnected')}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Check-in row */}
          <div className="flex items-center gap-0.5 mt-1">
            <div className="w-8 shrink-0 text-[10px] font-semibold text-secondary-token">
              {t('checkinRowLabel')}
            </div>
            {logs.map((d) => (
              <div key={d.date} className="flex-1 flex items-center justify-center">
                <div className="flex items-center justify-center h-5 w-5">
                  <span
                    className={`w-3 h-3 rounded ${
                      d.valid_checkin ? 'bg-action-accent-muted' : 'bg-n-200'
                    }`}
                    title={d.valid_checkin ? t('validCheckin') : t('notCheckin')}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-2 text-[10px] text-muted-token">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-success-token inline-block" />
              {t('legendConnected')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-subtle inline-block" />
              {t('legendNotConnected')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-action-accent-muted inline-block" />
              {t('legendCheckin')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

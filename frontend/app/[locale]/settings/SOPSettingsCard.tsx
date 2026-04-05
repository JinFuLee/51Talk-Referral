'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { NumInput, PctInput } from '@/components/ui/NumInput';
import type { SOPTargets, MonthlyTargetV2 } from '@/lib/types';

function CollapseToggle({
  open,
  onToggle,
  t,
}: {
  open: boolean;
  onToggle: () => void;
  t: (key: string, params?: any) => string;
}) {
  return (
    <button
      onClick={onToggle}
      className="text-xs text-secondary-token hover:text-primary-token flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-action rounded"
    >
      <span>{open ? t('collapse') : t('expand')}</span>
    </button>
  );
}

interface SOPSettingsCardProps {
  v2: MonthlyTargetV2;
  open: boolean;
  onToggle: () => void;
  onUpdateSOP: (patch: Partial<SOPTargets>) => void;
}

export default function SOPSettingsCard({ v2, open, onToggle, onUpdateSOP }: SOPSettingsCardProps) {
  const t = useTranslations('SOPSettingsCard');
  return (
    <Card title={t('cardTitle')} actions={<CollapseToggle open={open} onToggle={onToggle} t={t} />}>
      {open ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-secondary-token mb-1 block">{t('checkin_rate')}</label>
            <PctInput
              value={v2.sop.checkin_rate}
              onChange={(v) => onUpdateSOP({ checkin_rate: v })}
            />
          </div>
          <div>
            <label className="text-xs text-secondary-token mb-1 block">{t('reach_rate')}</label>
            <PctInput value={v2.sop.reach_rate} onChange={(v) => onUpdateSOP({ reach_rate: v })} />
          </div>
          <div>
            <label className="text-xs text-secondary-token mb-1 block">
              {t('participation_rate')}
            </label>
            <PctInput
              value={v2.sop.participation_rate}
              onChange={(v) => onUpdateSOP({ participation_rate: v })}
            />
          </div>
          <div>
            <label className="text-xs text-secondary-token mb-1 block">{t('reserve_rate')}</label>
            <PctInput
              value={v2.sop.reserve_rate}
              onChange={(v) => onUpdateSOP({ reserve_rate: v })}
            />
          </div>
          <div>
            <label className="text-xs text-secondary-token mb-1 block">{t('attend_rate')}</label>
            <PctInput
              value={v2.sop.attend_rate}
              onChange={(v) => onUpdateSOP({ attend_rate: v })}
            />
          </div>
          <div>
            <label className="text-xs text-secondary-token mb-1 block">{t('outreach_calls')}</label>
            <NumInput
              value={v2.sop.outreach_calls_per_day}
              onChange={(v) => onUpdateSOP({ outreach_calls_per_day: v })}
              suffix={t('outreachSuffix')}
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-token">{t('placeholder')}</p>
      )}
    </Card>
  );
}

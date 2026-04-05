import { useLocale } from 'next-intl';
import { PercentBar } from '@/components/shared/PercentBar';
import { formatRate } from '@/lib/utils';

const I18N = {
  zh: {
    register: '注册',
    appointment: '预约',
    showup: '出席',
    paid: '付费',
  },
  'zh-TW': {
    register: '註冊',
    appointment: '預約',
    showup: '出席',
    paid: '付費',
  },
  en: {
    register: 'Registration',
    appointment: 'Appointment',
    showup: 'Attendance',
    paid: 'Payment',
  },
  th: {
    register: 'ลงทะเบียน',
    appointment: 'นัดหมาย',
    showup: 'เข้าร่วม',
    paid: 'ชำระเงิน',
  },
} as const;
type Locale = keyof typeof I18N;

interface OverviewStage {
  name: string;
  target: number;
  actual: number;
  achievement_rate: number;
  conversion_rate?: number;
}

interface FunnelSnapshotProps {
  stages: OverviewStage[];
}

// Backend stage names are always Chinese; PAIRS uses fixed Chinese keys for lookup
// but displays translated labels from I18N
const STAGE_KEYS = {
  register: '注册',
  appointment: '预约',
  showup: '出席',
  paid: '付费',
} as const;

const PAIRS_CONFIG = [
  { fromKey: 'register', toKey: 'appointment' },
  { fromKey: 'appointment', toKey: 'showup' },
  { fromKey: 'showup', toKey: 'paid' },
] as const;

export function FunnelSnapshot({ stages }: FunnelSnapshotProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const stageMap = Object.fromEntries(stages.map((s) => [s.name, s]));

  return (
    <div className="space-y-3">
      {PAIRS_CONFIG.map(({ fromKey, toKey }) => {
        const fromStage = stageMap[STAGE_KEYS[fromKey]];
        const toStage = stageMap[STAGE_KEYS[toKey]];
        if (!fromStage || !toStage) return null;
        const rate = fromStage.actual > 0 ? toStage.actual / fromStage.actual : 0;
        const colorClass =
          rate >= 0.5 ? 'bg-success-token' : rate >= 0.3 ? 'bg-warning-token' : 'bg-danger-token';
        const fromLabel = t[fromKey];
        const toLabel = t[toKey];
        return (
          <div key={`${fromKey}-${toKey}`}>
            <div className="flex justify-between text-xs text-secondary-token mb-1">
              <span>
                {fromLabel} → {toLabel}
              </span>
              <span className="font-medium text-primary-token">{formatRate(rate)}</span>
            </div>
            <PercentBar value={rate * 100} max={100} colorClass={colorClass} />
          </div>
        );
      })}
    </div>
  );
}

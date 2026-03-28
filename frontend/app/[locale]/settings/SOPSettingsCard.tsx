'use client';

import { useLocale } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { NumInput, PctInput } from '@/components/ui/NumInput';
import type { SOPTargets, MonthlyTargetV2 } from '@/lib/types';

const I18N = {
  zh: {
    cardTitle: 'SOP 过程指标',
    expand: '▶ 展开',
    collapse: '▼ 收起',
    placeholder: '点击右上角展开配置',
    checkin_rate: '24H打卡率',
    reach_rate: '触达率',
    participation_rate: '参与率',
    reserve_rate: '约课率',
    attend_rate: '出席率',
    outreach_calls: '日外呼目标',
    outreachSuffix: '次/天',
  },
  'zh-TW': {
    cardTitle: 'SOP 過程指標',
    expand: '▶ 展開',
    collapse: '▼ 收起',
    placeholder: '點擊右上角展開設定',
    checkin_rate: '24H打卡率',
    reach_rate: '觸達率',
    participation_rate: '參與率',
    reserve_rate: '約課率',
    attend_rate: '出席率',
    outreach_calls: '每日外呼目標',
    outreachSuffix: '次/天',
  },
  en: {
    cardTitle: 'SOP Process Metrics',
    expand: '▶ Expand',
    collapse: '▼ Collapse',
    placeholder: 'Click top-right to expand',
    checkin_rate: '24H Check-in Rate',
    reach_rate: 'Reach Rate',
    participation_rate: 'Participation Rate',
    reserve_rate: 'Booking Rate',
    attend_rate: 'Attendance Rate',
    outreach_calls: 'Daily Outreach Target',
    outreachSuffix: 'calls/day',
  },
  th: {
    cardTitle: 'ตัวชี้วัดกระบวนการ SOP',
    expand: '▶ ขยาย',
    collapse: '▼ ยุบ',
    placeholder: 'คลิกมุมขวาบนเพื่อขยาย',
    checkin_rate: 'อัตราเช็คอิน 24H',
    reach_rate: 'อัตราการเข้าถึง',
    participation_rate: 'อัตราการมีส่วนร่วม',
    reserve_rate: 'อัตราการจอง',
    attend_rate: 'อัตราการเข้าร่วม',
    outreach_calls: 'เป้าโทรต่อวัน',
    outreachSuffix: 'ครั้ง/วัน',
  },
};

function CollapseToggle({
  open,
  onToggle,
  t,
}: {
  open: boolean;
  onToggle: () => void;
  t: (typeof I18N)['zh'];
}) {
  return (
    <button
      onClick={onToggle}
      className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-action rounded"
    >
      <span>{open ? t.collapse : t.expand}</span>
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
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  return (
    <Card title={t.cardTitle} actions={<CollapseToggle open={open} onToggle={onToggle} t={t} />}>
      {open ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">
              {t.checkin_rate}
            </label>
            <PctInput
              value={v2.sop.checkin_rate}
              onChange={(v) => onUpdateSOP({ checkin_rate: v })}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">
              {t.reach_rate}
            </label>
            <PctInput value={v2.sop.reach_rate} onChange={(v) => onUpdateSOP({ reach_rate: v })} />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">
              {t.participation_rate}
            </label>
            <PctInput
              value={v2.sop.participation_rate}
              onChange={(v) => onUpdateSOP({ participation_rate: v })}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">
              {t.reserve_rate}
            </label>
            <PctInput
              value={v2.sop.reserve_rate}
              onChange={(v) => onUpdateSOP({ reserve_rate: v })}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">
              {t.attend_rate}
            </label>
            <PctInput
              value={v2.sop.attend_rate}
              onChange={(v) => onUpdateSOP({ attend_rate: v })}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">
              {t.outreach_calls}
            </label>
            <NumInput
              value={v2.sop.outreach_calls_per_day}
              onChange={(v) => onUpdateSOP({ outreach_calls_per_day: v })}
              suffix={t.outreachSuffix}
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">{t.placeholder}</p>
      )}
    </Card>
  );
}

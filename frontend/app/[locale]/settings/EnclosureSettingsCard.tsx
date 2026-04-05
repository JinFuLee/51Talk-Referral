'use client';

import { useLocale } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { PctInput } from '@/components/ui/NumInput';
import type { EnclosureTarget, MonthlyTargetV2 } from '@/lib/types';

const I18N = {
  zh: {
    cardTitle: '围场目标',
    expand: '▶ 展开',
    collapse: '▼ 收起',
    placeholder: '点击右上角展开配置',
    metric: '指标',
    reach_rate: '触达率',
    participation_rate: '参与率',
    conversion_rate: '转化率',
    checkin_rate: '打卡率',
  },
  'zh-TW': {
    cardTitle: '圍場目標',
    expand: '▶ 展開',
    collapse: '▼ 收起',
    placeholder: '點擊右上角展開設定',
    metric: '指標',
    reach_rate: '觸達率',
    participation_rate: '參與率',
    conversion_rate: '轉化率',
    checkin_rate: '打卡率',
  },
  en: {
    cardTitle: 'Enclosure Targets',
    expand: '▶ Expand',
    collapse: '▼ Collapse',
    placeholder: 'Click top-right to expand',
    metric: 'Metric',
    reach_rate: 'Reach Rate',
    participation_rate: 'Participation Rate',
    conversion_rate: 'Conversion Rate',
    checkin_rate: 'Check-in Rate',
  },
  th: {
    cardTitle: 'เป้าหมายระยะเวลา',
    expand: '▶ ขยาย',
    collapse: '▼ ยุบ',
    placeholder: 'คลิกมุมขวาบนเพื่อขยาย',
    metric: 'ตัวชี้วัด',
    reach_rate: 'อัตราการเข้าถึง',
    participation_rate: 'อัตราการมีส่วนร่วม',
    conversion_rate: 'อัตราการแปลง',
    checkin_rate: 'อัตราเช็คอิน',
  },
};

const ENCLOSURE_KEYS = [
  'd0_30',
  'd31_60',
  'd61_90',
  'd91_120',
  'd121_150',
  'd151_180',
  'd6M',
  'd7M',
  'd8M',
  'd9M',
  'd10M',
  'd11M',
  'd12M',
  'd12M_plus',
] as const;
type EnclosureKey = (typeof ENCLOSURE_KEYS)[number];

const ENCLOSURE_LABELS: Record<EnclosureKey, string> = {
  d0_30: 'M0（0~30）',
  d31_60: 'M1（31~60）',
  d61_90: 'M2（61~90）',
  d91_120: 'M3（91~120）',
  d121_150: 'M4（121~150）',
  d151_180: 'M5（151~180）',
  d6M: 'M6（181~210）',
  d7M: 'M7（211~240）',
  d8M: 'M8（241~270）',
  d9M: 'M9（271~300）',
  d10M: 'M10（301~330）',
  d11M: 'M11（331~360）',
  d12M: 'M12（361~390）',
  d12M_plus: 'M12+（391+）',
};

// Labels resolved at render time via t(key) — see component body
const ENCLOSURE_METRIC_KEYS: (keyof EnclosureTarget)[] = [
  'reach_rate',
  'participation_rate',
  'conversion_rate',
  'checkin_rate',
];

interface CollapseToggleProps {
  open: boolean;
  onToggle: () => void;
}

function CollapseToggle({ open, onToggle, t }: CollapseToggleProps & { t: (typeof I18N)['zh'] }) {
  return (
    <button
      onClick={onToggle}
      className="text-xs text-secondary-token hover:text-primary-token flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-action rounded"
    >
      <span>{open ? t.collapse : t.expand}</span>
    </button>
  );
}

interface EnclosureSettingsCardProps {
  v2: MonthlyTargetV2;
  open: boolean;
  onToggle: () => void;
  onUpdateEnclosure: (key: string, patch: Partial<EnclosureTarget>) => void;
}

const EMPTY_ENCLOSURE: EnclosureTarget = {
  reach_rate: 0,
  participation_rate: 0,
  conversion_rate: 0,
  checkin_rate: 0,
};

export default function EnclosureSettingsCard({
  v2,
  open,
  onToggle,
  onUpdateEnclosure,
}: EnclosureSettingsCardProps) {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const enclosures = v2.enclosures ?? ({} as Record<string, EnclosureTarget>);
  return (
    <Card title={t.cardTitle} actions={<CollapseToggle open={open} onToggle={onToggle} t={t} />}>
      {open ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row text-xs">
                <th className="text-left py-1.5 px-2">{t.metric}</th>
                {ENCLOSURE_KEYS.map((k) => (
                  <th key={k} className="text-right py-1.5 px-2">
                    {ENCLOSURE_LABELS[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ENCLOSURE_METRIC_KEYS.map((metric) => (
                <tr key={metric} className="border-b border-subtle-token">
                  <td className="py-1 px-2 text-xs text-secondary-token">
                    {t[metric as keyof typeof t]}
                  </td>
                  {ENCLOSURE_KEYS.map((k) => (
                    <td key={k} className="py-1 px-2 text-xs text-right">
                      <PctInput
                        value={(enclosures[k] ?? EMPTY_ENCLOSURE)[metric]}
                        onChange={(v) => onUpdateEnclosure(k, { [metric]: v })}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-token">{t.placeholder}</p>
      )}
    </Card>
  );
}

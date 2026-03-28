'use client';

import { Card } from '@/components/ui/Card';
import { PctInput } from '@/components/ui/NumInput';
import type { EnclosureTarget, MonthlyTargetV2 } from '@/lib/types';

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

const ENCLOSURE_METRICS: { key: keyof EnclosureTarget; label: string }[] = [
  { key: 'reach_rate', label: '触达率' },
  { key: 'participation_rate', label: '参与率' },
  { key: 'conversion_rate', label: '转化率' },
  { key: 'checkin_rate', label: '打卡率' },
];

interface CollapseToggleProps {
  open: boolean;
  onToggle: () => void;
}

function CollapseToggle({ open, onToggle }: CollapseToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-action rounded"
    >
      <span>{open ? '▼ 收起' : '▶ 展开'}</span>
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
  const enclosures = v2.enclosures ?? ({} as Record<string, EnclosureTarget>);
  return (
    <Card title="围场目标" actions={<CollapseToggle open={open} onToggle={onToggle} />}>
      {open ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row text-xs">
                <th className="text-left py-1.5 px-2">指标</th>
                {ENCLOSURE_KEYS.map((k) => (
                  <th key={k} className="text-right py-1.5 px-2">
                    {ENCLOSURE_LABELS[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ENCLOSURE_METRICS.map(({ key: metric, label }) => (
                <tr key={metric} className="border-b border-[var(--border-subtle)]">
                  <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{label}</td>
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
        <p className="text-sm text-[var(--text-muted)]">点击右上角展开配置</p>
      )}
    </Card>
  );
}

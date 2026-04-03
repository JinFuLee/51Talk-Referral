import { formatRate } from '@/lib/utils';
import type { ThreeFactorComparison } from '@/lib/types/channel';

const I18N = {
  zh: {
    empty: '暂无三因素数据',
    colChannel: '渠道',
    colExpected: '预期量',
    colActual: '实际量',
    colGap: '差距',
    colApptFactor: '预约因子',
    colShowFactor: '出席因子',
    colPayFactor: '付费因子',
  },
  'zh-TW': {
    empty: '暫無三因素資料',
    colChannel: '渠道',
    colExpected: '預期量',
    colActual: '實際量',
    colGap: '差距',
    colApptFactor: '預約因子',
    colShowFactor: '出席因子',
    colPayFactor: '付費因子',
  },
  en: {
    empty: 'No 3-factor data',
    colChannel: 'Channel',
    colExpected: 'Expected',
    colActual: 'Actual',
    colGap: 'Gap',
    colApptFactor: 'Appt Factor',
    colShowFactor: 'Show Factor',
    colPayFactor: 'Pay Factor',
  },
  th: {
    empty: 'ไม่มีข้อมูล 3 ปัจจัย',
    colChannel: 'ช่องทาง',
    colExpected: 'คาดการณ์',
    colActual: 'จริง',
    colGap: 'ส่วนต่าง',
    colApptFactor: 'ปัจจัยนัดหมาย',
    colShowFactor: 'ปัจจัยเข้าร่วม',
    colPayFactor: 'ปัจจัยชำระเงิน',
  },
} as const;

interface ThreeFactorTableProps {
  comparisons: ThreeFactorComparison[];
  locale?: string;
}

function FactorBadge({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-xs text-[var(--text-secondary)]">—</span>;
  }
  const pct = value * 100;
  const color =
    pct >= 50
      ? 'bg-green-50 text-green-700'
      : pct >= 30
        ? 'bg-yellow-50 text-yellow-700'
        : 'bg-red-50 text-red-600';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
      {formatRate(value)}
    </span>
  );
}

export function ThreeFactorTable({ comparisons, locale = 'zh' }: ThreeFactorTableProps) {
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  if (comparisons.length === 0) {
    return <p className="text-sm text-[var(--text-muted)] text-center py-6">{t.empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="slide-thead-row text-xs">
            <th className="py-1.5 px-2 border-0 text-left">{t.colChannel}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colExpected}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colActual}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colGap}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colApptFactor}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colShowFactor}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colPayFactor}</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((c) => (
            <tr key={c.channel} className="even:bg-[var(--bg-subtle)]">
              <td className="py-1 px-2 text-xs font-medium text-[var(--text-primary)]">
                {c.channel}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                {c.expected_volume != null ? c.expected_volume.toLocaleString() : '—'}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                {c.actual_volume != null ? c.actual_volume.toLocaleString() : '—'}
              </td>
              <td
                className={`py-1 px-2 text-xs text-right font-mono tabular-nums font-medium ${
                  c.gap == null
                    ? 'text-[var(--text-secondary)]'
                    : c.gap >= 0
                      ? 'text-emerald-800'
                      : 'text-[var(--color-danger)]'
                }`}
              >
                {c.gap == null ? '—' : `${c.gap >= 0 ? '+' : ''}${c.gap.toLocaleString()}`}
              </td>
              <td className="py-1 px-2 text-xs text-right">
                <FactorBadge value={c.appt_factor} />
              </td>
              <td className="py-1 px-2 text-xs text-right">
                <FactorBadge value={c.show_factor} />
              </td>
              <td className="py-1 px-2 text-xs text-right">
                <FactorBadge value={c.pay_factor} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

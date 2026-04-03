'use client';

import { useLocale } from 'next-intl';
import { formatRevenue } from '@/lib/utils';
import type { BmComparison, BmMetricItem } from '@/lib/types/bm-calendar';

const I18N = {
  zh: {
    register: '注册',
    appointment: '预约',
    showup: '出席',
    paid: '付费',
    revenue: '业绩 (USD)',
    colMetric: '指标',
    colTarget: '月目标',
    colTargetTip: '本月 KPI 目标值',
    colBmMtd: '累计 BM',
    colBmMtdTip: '月目标 × BM 进度%（截至 T-1 应达基准值）',
    colActual: 'T-1 实际',
    colActualTip: '截至昨日的实际累计完成量',
    colBmGap: 'BM 差额',
    colBmGapTip: '实际 − 累计 BM：正值超前，负值落后',
    colBmToday: '今日 BM',
    colBmTodayTip: '月目标 × 今日 BM%（今日基准配额）',
    colTodayRequired: '今日需（含补差）',
    colTodayRequiredTip: '剩余量 × (今日BM% ÷ 剩余BM%)：今日具体需完成量',
    colDailyAvg: '达标日均',
    colDailyAvgTip: '(月目标 − 实际) ÷ 剩余工作日：平均每日需完成量',
    titleBmRhythm: 'BM 节奏对比',
    progressThrough: '截至',
    cumProgress: '累计进度',
    overQuota: '已超额',
    footnote:
      'BM 差额 = T-1 实际 − 累计 BM 应达；今日需 = 追上 BM 进度线今日需新增量（负值表示已超额无需额外努力）',
  },
  'zh-TW': {
    register: '註冊',
    appointment: '預約',
    showup: '出席',
    paid: '付費',
    revenue: '業績 (USD)',
    colMetric: '指標',
    colTarget: '月目標',
    colTargetTip: '本月 KPI 目標值',
    colBmMtd: '累計 BM',
    colBmMtdTip: '月目標 × BM 進度%（截至 T-1 應達基準值）',
    colActual: 'T-1 實際',
    colActualTip: '截至昨日的實際累計完成量',
    colBmGap: 'BM 差額',
    colBmGapTip: '實際 − 累計 BM：正值超前，負值落後',
    colBmToday: '今日 BM',
    colBmTodayTip: '月目標 × 今日 BM%（今日基準配額）',
    colTodayRequired: '今日需（含補差）',
    colTodayRequiredTip: '剩餘量 × (今日BM% ÷ 剩餘BM%)：今日具體需完成量',
    colDailyAvg: '達標日均',
    colDailyAvgTip: '(月目標 − 實際) ÷ 剩餘工作日：平均每日需完成量',
    titleBmRhythm: 'BM 節奏對比',
    progressThrough: '截至',
    cumProgress: '累計進度',
    overQuota: '已超額',
    footnote:
      'BM 差額 = T-1 實際 − 累計 BM 應達；今日需 = 追上 BM 進度線今日需新增量（負值表示已超額無需額外努力）',
  },
  en: {
    register: 'Registration',
    appointment: 'Appointment',
    showup: 'Attendance',
    paid: 'Payment',
    revenue: 'Revenue (USD)',
    colMetric: 'Metric',
    colTarget: 'Monthly Target',
    colTargetTip: 'Monthly KPI target value',
    colBmMtd: 'Cumulative BM',
    colBmMtdTip: 'Target × BM Progress% (baseline by T-1)',
    colActual: 'T-1 Actual',
    colActualTip: 'Actual cumulative amount as of yesterday',
    colBmGap: 'BM Gap',
    colBmGapTip: 'Actual − Cumulative BM: positive=ahead, negative=behind',
    colBmToday: "Today's BM",
    colBmTodayTip: "Target × Today's BM% (today's baseline quota)",
    colTodayRequired: 'Today Required',
    colTodayRequiredTip: 'Remaining × (Today BM% ÷ Remaining BM%): amount needed today',
    colDailyAvg: 'Daily Avg Needed',
    colDailyAvgTip: '(Target − Actual) ÷ Remaining Workdays',
    titleBmRhythm: 'BM Rhythm Comparison',
    progressThrough: 'Through',
    cumProgress: 'Cumulative Progress',
    overQuota: 'Exceeded',
    footnote:
      'BM Gap = T-1 Actual − Cumulative BM baseline; Today Required = amount needed to catch up to BM pace (negative = already exceeded, no extra effort needed)',
  },
  th: {
    register: 'ลงทะเบียน',
    appointment: 'นัดหมาย',
    showup: 'เข้าร่วม',
    paid: 'ชำระเงิน',
    revenue: 'รายได้ (USD)',
    colMetric: 'ตัวชี้วัด',
    colTarget: 'เป้าหมายรายเดือน',
    colTargetTip: 'ค่าเป้าหมาย KPI รายเดือน',
    colBmMtd: 'BM สะสม',
    colBmMtdTip: 'เป้าหมาย × BM% (ค่าฐานถึง T-1)',
    colActual: 'ค่าจริง T-1',
    colActualTip: 'ค่าสะสมจริงถึงเมื่อวาน',
    colBmGap: 'ช่องว่าง BM',
    colBmGapTip: 'จริง − BM สะสม: บวก=นำหน้า, ลบ=ช้ากว่า',
    colBmToday: 'BM วันนี้',
    colBmTodayTip: 'เป้าหมาย × BM% วันนี้',
    colTodayRequired: 'ต้องทำวันนี้',
    colTodayRequiredTip: 'จำนวนที่ต้องทำวันนี้เพื่อตามทัน BM',
    colDailyAvg: 'เฉลี่ยต่อวันที่ต้องการ',
    colDailyAvgTip: '(เป้าหมาย − จริง) ÷ วันทำงานที่เหลือ',
    titleBmRhythm: 'เปรียบเทียบจังหวะ BM',
    progressThrough: 'ถึง',
    cumProgress: 'ความคืบหน้าสะสม',
    overQuota: 'เกินโควต้า',
    footnote:
      'ช่องว่าง BM = จริง T-1 − BM ฐาน; ต้องทำวันนี้ = จำนวนที่ต้องเพิ่มเพื่อตาม BM (ลบ = เกินแล้ว)',
  },
} as const;
type Locale = keyof typeof I18N;

interface BmComparisonTableProps {
  data: BmComparison;
  visibleKeys?: string[];
}

type RowFormat = 'count' | 'currency';

function fmtNum(v: number, format: RowFormat): string {
  if (format === 'currency') return formatRevenue(v);
  return Math.round(v).toLocaleString();
}

function BmGapCell({ value, format }: { value: number; format: RowFormat }) {
  const isPositive = value >= 0;
  const colorClass = isPositive ? 'text-emerald-800' : 'text-[var(--color-danger)]';
  const arrow = isPositive ? '▲' : '▼';
  const sign = isPositive ? '+' : '';
  const display =
    format === 'currency' ? formatRevenue(value) : `${sign}${Math.round(value).toLocaleString()}`;
  return (
    <span className={`${colorClass} font-mono tabular-nums text-sm`}>
      {arrow} {display}
    </span>
  );
}

function TodayRequiredCell({ value, format }: { value: number; format: RowFormat }) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;
  if (value <= 0) {
    return <span className="text-[var(--text-muted)] text-sm">{t.overQuota}</span>;
  }
  return (
    <span className="text-[var(--color-danger)] font-mono tabular-nums text-sm">
      {fmtNum(value, format)}
    </span>
  );
}

export function BmComparisonTable({ data, visibleKeys }: BmComparisonTableProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const ALL_BM_ROWS = [
    { key: 'register', label: t.register, format: 'count' as const },
    { key: 'appointment', label: t.appointment, format: 'count' as const },
    { key: 'showup', label: t.showup, format: 'count' as const },
    { key: 'paid', label: t.paid, format: 'count' as const },
    { key: 'revenue', label: t.revenue, format: 'currency' as const },
  ];

  const COLUMNS = [
    { label: t.colMetric, align: 'left' as const, tooltip: '' },
    { label: t.colTarget, align: 'right' as const, tooltip: t.colTargetTip },
    { label: t.colBmMtd, align: 'right' as const, tooltip: t.colBmMtdTip },
    { label: t.colActual, align: 'right' as const, tooltip: t.colActualTip },
    { label: t.colBmGap, align: 'right' as const, tooltip: t.colBmGapTip },
    { label: t.colBmToday, align: 'right' as const, tooltip: t.colBmTodayTip },
    { label: t.colTodayRequired, align: 'right' as const, tooltip: t.colTodayRequiredTip },
    { label: t.colDailyAvg, align: 'right' as const, tooltip: t.colDailyAvgTip },
  ];

  const { calendar, metrics } = data;
  const bmMtdPct = ((calendar.bm_mtd_pct ?? 0) * 100).toFixed(1);

  const rows = visibleKeys ? ALL_BM_ROWS.filter((r) => visibleKeys.includes(r.key)) : ALL_BM_ROWS;

  return (
    <div className="card-base overflow-x-auto">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.titleBmRhythm}</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {t.progressThrough} {calendar.reference_date}（{calendar.today_type}）· {t.cumProgress}{' '}
            <span className="font-semibold text-[var(--text-secondary)]">{bmMtdPct}%</span>
          </p>
        </div>
      </div>

      {/* 表格 */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[var(--border-default)]">
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className={`table-header py-2 px-3 text-${col.align} whitespace-nowrap`}
                title={col.tooltip || undefined}
              >
                {col.label}
                {col.tooltip && (
                  <span className="text-[var(--text-muted)] ml-0.5 cursor-help">ⓘ</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label, format }, idx) => {
            const item: BmMetricItem | undefined = metrics[key];
            if (!item) return null;

            const isLast = idx === rows.length - 1;
            const rowClass = isLast
              ? 'border-t border-[var(--border-default)] bg-[var(--bg-subtle)]'
              : 'border-b border-[var(--border-default)]';

            return (
              <tr key={key} className={`${rowClass} hover:bg-[var(--bg-subtle)] transition-colors`}>
                <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">{label}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                  {fmtNum(item.target, format)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                  {fmtNum(item.bm_mtd, format)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-primary)] font-semibold">
                  {fmtNum(item.actual, format)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <BmGapCell value={item.bm_gap} format={format} />
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                  {fmtNum(item.bm_today, format)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <TodayRequiredCell value={item.today_required} format={format} />
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                  {item.target_daily_avg != null ? fmtNum(item.target_daily_avg, format) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 底部说明 */}
      <p className="text-[10px] text-[var(--text-muted)] mt-2">{t.footnote}</p>
    </div>
  );
}

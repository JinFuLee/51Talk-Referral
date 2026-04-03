'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRevenue, formatRate } from '@/lib/utils';
import type { CCPerformanceRecord } from '@/lib/types/cc-performance';
import type { CCRadarData } from '@/lib/types/cross-analysis';
import { Spinner } from '@/components/ui/Spinner';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { CHART_PALETTE } from '@/lib/chart-palette';

const I18N = {
  zh: {
    radarTitle: (name: string) => `${name} 战力雷达`,
    noRadarData: '暂无战力雷达数据',
    actionTitle: '今日行动指导',
    revenueGap: '业绩缺口',
    exceeded: '已超额完成',
    stillNeeded: '距目标尚缺',
    dailyTarget: '达标需日均业绩',
    dailyTargetSub: '完成月目标每天需新增业绩',
    dailyPace: '追进度需日均业绩',
    dailyPaceSub: '追上时间进度线每天需新增',
    currentDaily: '当前日均业绩',
    currentDailySub: '当前业绩节奏参考',
    efficiencyLift: '效率提升需求',
    efficiencyLiftSub: '需要相对当前日均提升的幅度',
    participation: '参与率',
    checkin: '打卡率',
    reach: '触达率',
    coefficient: '带新系数',
    registration: '注册',
    payment: '付费',
    radarParticipation: '参与率',
    radarConversion: '转化率',
    radarCheckin: '打卡率',
    radarReach: '触达率',
    radarCargo: '带货比',
  },
  'zh-TW': {
    radarTitle: (name: string) => `${name} 戰力雷達`,
    noRadarData: '暫無戰力雷達數據',
    actionTitle: '今日行動指導',
    revenueGap: '業績缺口',
    exceeded: '已超額完成',
    stillNeeded: '距目標尚缺',
    dailyTarget: '達標需日均業績',
    dailyTargetSub: '完成月目標每天需新增業績',
    dailyPace: '追進度需日均業績',
    dailyPaceSub: '追上時間進度線每天需新增',
    currentDaily: '當前日均業績',
    currentDailySub: '當前業績節奏參考',
    efficiencyLift: '效率提升需求',
    efficiencyLiftSub: '需要相對當前日均提升的幅度',
    participation: '參與率',
    checkin: '打卡率',
    reach: '觸達率',
    coefficient: '帶新係數',
    registration: '注冊',
    payment: '付費',
    radarParticipation: '參與率',
    radarConversion: '轉化率',
    radarCheckin: '打卡率',
    radarReach: '觸達率',
    radarCargo: '帶貨比',
  },
  en: {
    radarTitle: (name: string) => `${name} Radar`,
    noRadarData: 'No radar data available',
    actionTitle: "Today's Action Guide",
    revenueGap: 'Revenue Gap',
    exceeded: 'Target exceeded',
    stillNeeded: 'Still needed',
    dailyTarget: 'Daily Avg to Hit Target',
    dailyTargetSub: 'Daily revenue needed to complete monthly target',
    dailyPace: 'Daily Avg to Catch Pace',
    dailyPaceSub: 'Daily revenue needed to catch up with time progress',
    currentDaily: 'Current Daily Avg',
    currentDailySub: 'Current revenue run rate',
    efficiencyLift: 'Efficiency Lift Needed',
    efficiencyLiftSub: 'Relative improvement over current daily avg',
    participation: 'Participation',
    checkin: 'Check-in',
    reach: 'Reach',
    coefficient: 'Referral Coeff.',
    registration: 'Registration',
    payment: 'Payment',
    radarParticipation: 'Participation',
    radarConversion: 'Conversion',
    radarCheckin: 'Check-in',
    radarReach: 'Reach',
    radarCargo: 'Cargo Ratio',
  },
  th: {
    radarTitle: (name: string) => `เรดาร์ ${name}`,
    noRadarData: 'ไม่มีข้อมูลเรดาร์',
    actionTitle: 'แนวทางปฏิบัติวันนี้',
    revenueGap: 'ช่องว่างผลงาน',
    exceeded: 'บรรลุเป้าหมายแล้ว',
    stillNeeded: 'ยังขาดอยู่',
    dailyTarget: 'เฉลี่ยต่อวันเพื่อบรรลุเป้า',
    dailyTargetSub: 'ผลงานต่อวันที่ต้องการ',
    dailyPace: 'เฉลี่ยต่อวันเพื่อตามทัน',
    dailyPaceSub: 'ต้องการต่อวันเพื่อตามความคืบหน้า',
    currentDaily: 'เฉลี่ยต่อวันปัจจุบัน',
    currentDailySub: 'อัตราผลงานปัจจุบัน',
    efficiencyLift: 'การปรับปรุงประสิทธิภาพ',
    efficiencyLiftSub: 'การปรับปรุงเทียบกับค่าเฉลี่ยต่อวัน',
    participation: 'การมีส่วนร่วม',
    checkin: 'เช็กอิน',
    reach: 'การเข้าถึง',
    coefficient: 'สัมประสิทธิ์',
    registration: 'ลงทะเบียน',
    payment: 'ชำระเงิน',
    radarParticipation: 'มีส่วนร่วม',
    radarConversion: 'แปลง',
    radarCheckin: 'เช็กอิน',
    radarReach: 'เข้าถึง',
    radarCargo: 'อัตราแนะนำ',
  },
} as const;

interface CCPerformanceDetailProps {
  record: CCPerformanceRecord;
  exchangeRate: number;
}

function ActionCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: 'warn' | 'ok';
}) {
  const borderColor =
    highlight === 'ok'
      ? 'border-l-emerald-500'
      : highlight === 'warn'
        ? 'border-l-amber-500'
        : 'border-l-[var(--color-accent)]';

  return (
    <div
      className={`rounded-lg border border-[var(--border-default)] border-l-4 ${borderColor} px-3 py-2.5 bg-[var(--bg-surface)]`}
    >
      <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
      <p className="text-sm font-bold font-mono tabular-nums text-[var(--text-primary)]">{value}</p>
      {sub && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</p>}
    </div>
  );
}

export function CCPerformanceDetail({ record, exchangeRate }: CCPerformanceDetailProps) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N.zh;

  const { data: radarData, isLoading: radarLoading } = useFilteredSWR<CCRadarData>(
    record.cc_name ? `/api/cc-matrix/radar/${encodeURIComponent(record.cc_name)}` : null
  );

  // 雷达图数据格式转换（CCRadarData 为扁平字段，手动映射）
  const radarChartData = radarData
    ? [
        {
          subject: t.radarParticipation,
          value: Math.round((radarData.participation ?? 0) * 100),
          fullMark: 100,
        },
        {
          subject: t.radarConversion,
          value: Math.round((radarData.conversion ?? 0) * 100),
          fullMark: 100,
        },
        {
          subject: t.radarCheckin,
          value: Math.round((radarData.checkin ?? 0) * 100),
          fullMark: 100,
        },
        { subject: t.radarReach, value: Math.round((radarData.reach ?? 0) * 100), fullMark: 100 },
        {
          subject: t.radarCargo,
          value: Math.round((radarData.cargo_ratio ?? 0) * 100),
          fullMark: 100,
        },
      ]
    : [];

  const revenueGap = record.revenue?.gap ?? null;
  const remainingDaily = record.remaining_daily_avg ?? null;
  const paceDaily = record.pace_daily_needed ?? null;
  const currentDaily = record.current_daily_avg ?? null;
  const efficiencyLift = record.efficiency_lift_pct ?? null;

  return (
    <div className="border border-[var(--border-default)] rounded-xl bg-[var(--bg-subtle)] px-4 py-4 mt-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 左侧：雷达图 */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
          {t.radarTitle(record.cc_name)}
        </p>
        {radarLoading ? (
          <div className="flex items-center justify-center h-40">
            <Spinner size="sm" />
          </div>
        ) : radarChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarChartData}>
              <PolarGrid stroke="var(--border-default)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              />
              <Radar
                dataKey="value"
                stroke={CHART_PALETTE.c1}
                fill={CHART_PALETTE.c1}
                fillOpacity={0.25}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-xs text-[var(--text-muted)]">
            {t.noRadarData}
          </div>
        )}
      </div>

      {/* 右侧：行动建议 */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
          {t.actionTitle}
        </p>
        <div className="space-y-2">
          <ActionCard
            label={t.revenueGap}
            value={revenueGap != null ? formatRevenue(Math.abs(revenueGap), exchangeRate) : '—'}
            sub={revenueGap != null && revenueGap >= 0 ? t.exceeded : t.stillNeeded}
            highlight={revenueGap != null && revenueGap >= 0 ? 'ok' : 'warn'}
          />
          <ActionCard
            label={t.dailyTarget}
            value={remainingDaily != null ? formatRevenue(remainingDaily, exchangeRate) : '—'}
            sub={t.dailyTargetSub}
          />
          <ActionCard
            label={t.dailyPace}
            value={paceDaily != null ? formatRevenue(paceDaily, exchangeRate) : '—'}
            sub={t.dailyPaceSub}
          />
          <ActionCard
            label={t.currentDaily}
            value={currentDaily != null ? formatRevenue(currentDaily, exchangeRate) : '—'}
            sub={t.currentDailySub}
          />
          {efficiencyLift != null && (
            <ActionCard
              label={t.efficiencyLift}
              value={`${(efficiencyLift * 100).toFixed(1)}%`}
              sub={t.efficiencyLiftSub}
              highlight={efficiencyLift <= 0 ? 'ok' : efficiencyLift > 0.2 ? 'warn' : undefined}
            />
          )}
        </div>

        {/* 过程指标摘要 */}
        <div className="mt-3 pt-3 border-t border-[var(--border-default)] grid grid-cols-3 gap-2">
          {[
            { label: t.participation, value: formatRate(record.participation_rate) },
            { label: t.checkin, value: formatRate(record.checkin_rate) },
            { label: t.reach, value: formatRate(record.cc_reach_rate) },
            {
              label: t.coefficient,
              value: record.coefficient != null ? record.coefficient.toFixed(2) : '—',
            },
            { label: t.registration, value: record.leads?.actual?.toLocaleString() ?? '—' },
            { label: t.payment, value: record.paid?.actual?.toLocaleString() ?? '—' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-[10px] text-[var(--text-muted)]">{item.label}</p>
              <p className="text-xs font-semibold text-[var(--text-primary)] font-mono">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

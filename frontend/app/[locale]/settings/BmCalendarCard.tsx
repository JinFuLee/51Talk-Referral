'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { configAPI } from '@/lib/api';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import type { BmCalendarResponse, BmCalendarDay } from '@/lib/types/bm-calendar';

interface BmCalendarCardProps {
  selectedMonth: string;
}

type DayTypeOption = 'normal' | 'kickoff' | 'holiday_off';

function dayTypeBg(dayType: string, isOverride: boolean): string {
  const base: Record<string, string> = {
    weekend: 'bg-accent-surface',
    weekday: 'bg-white',
    dayoff: 'bg-subtle',
    kickoff: 'bg-warning-surface',
    holiday_off: 'bg-danger-surface',
  };
  const color = base[dayType] ?? 'bg-white';
  return isOverride ? `${color} ring-1 ring-amber-400` : color;
}

export default function BmCalendarCard({ selectedMonth }: BmCalendarCardProps) {
  const t = useTranslations('BmCalendarCard');

  const DAY_TYPE_OPTIONS: { value: DayTypeOption; label: string; weight: number }[] = [
    { value: 'normal', label: t('dayTypeNormal'), weight: 0 },
    { value: 'kickoff', label: t('dayTypeKickoff'), weight: 2 },
    { value: 'holiday_off', label: t('dayTypeHolidayOff'), weight: 1 },
  ];

  const { data, isLoading, mutate } = useFilteredSWR<BmCalendarResponse>(
    `/api/config/bm-calendar?month=${selectedMonth}`
  );

  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return (
      <div className="card-base flex items-center gap-2 text-sm text-muted-token">
        <Spinner size="sm" /> {t('loading')}
      </div>
    );
  }

  if (!data) {
    const yr = selectedMonth.slice(0, 4);
    const mo = selectedMonth.slice(4);
    const label = t('year') ? `${yr}${t('year')}${mo}${t('month')}` : `${yr}-${mo}`;
    return (
      <div className="card-base text-sm text-muted-token">
        {t('noData')} {label} BM
      </div>
    );
  }

  // 构建月历网格：key = YYYY-MM-DD，value = BmCalendarDay
  const dayMap: Record<string, BmCalendarDay> = {};
  for (const d of data.days) dayMap[d.date] = d;

  // 计算该月第一天是星期几（0=周日, 1-6=周一~周六）
  const firstDate = new Date(`${selectedMonth.slice(0, 4)}-${selectedMonth.slice(4)}-01`);
  // 转为周一起点（0=周一, 6=周日）
  const firstDow = (firstDate.getDay() + 6) % 7;
  const daysInMonth = new Date(
    parseInt(selectedMonth.slice(0, 4)),
    parseInt(selectedMonth.slice(4)),
    0
  ).getDate();

  // 填充网格（前置空格 + 天数）
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = Array(totalCells).fill(null);
  for (let i = 0; i < daysInMonth; i++) cells[firstDow + i] = i + 1;

  async function handleSelectType(day: BmCalendarDay, optionValue: DayTypeOption) {
    if (!data) return;
    setSaving(true);
    try {
      // 构建新 specials 列表
      const existingSpecials = data.days
        .filter((d) => d.is_override && d.date !== day.date)
        .map((d) => ({ date: d.date, weight: d.raw_weight, label: d.label }));

      let kickoffDate: string | null =
        data.days.find((d) => d.day_type === 'kickoff' && !d.is_override)?.date ?? null;

      if (optionValue === 'normal') {
        // 移除该日的覆盖，恢复自动
        if (day.day_type === 'kickoff') kickoffDate = null;
        await configAPI.putBmCalendar({
          month: selectedMonth,
          specials: existingSpecials,
          kickoff_date: kickoffDate,
        });
      } else if (optionValue === 'kickoff') {
        await configAPI.putBmCalendar({
          month: selectedMonth,
          specials: existingSpecials,
          kickoff_date: day.date,
        });
      } else {
        // holiday_off: weight=1
        await configAPI.putBmCalendar({
          month: selectedMonth,
          specials: [
            ...existingSpecials,
            { date: day.date, weight: 1, label: t('dayTypeHolidayOff') },
          ],
          kickoff_date: kickoffDate,
        });
      }

      await mutate();
      const optLabel = DAY_TYPE_OPTIONS.find((o) => o.value === optionValue)?.label ?? optionValue;
      toast.success(`${t('toastUpdated')}${day.date} ${optLabel}${t('toastUpdatedSuffix')}`);
    } catch {
      toast.error(t('toastSaveFailed'));
    } finally {
      setSaving(false);
      setActiveDate(null);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      await configAPI.putBmCalendar({
        month: selectedMonth,
        specials: [],
        kickoff_date: null,
      });
      await mutate();
      toast.success(t('toastResetSuccess'));
    } catch {
      toast.error(t('toastResetFailed'));
    } finally {
      setSaving(false);
    }
  }

  const yr = selectedMonth.slice(0, 4);
  const mo = selectedMonth.slice(4);
  const monthLabel = t('year') ? `${yr}${t('year')}${mo}${t('month')}` : `${yr}-${mo}`;

  const legends = [
    { bg: 'bg-accent-surface', label: t('legendWeekend') },
    { bg: 'bg-warning-surface', label: t('legendKickoff') },
    { bg: 'bg-danger-surface', label: t('legendHolidayOff') },
    { bg: 'bg-subtle', label: t('legendDayOff') },
    { bg: 'bg-white ring-1 ring-amber-400', label: t('legendOverride') },
  ];

  return (
    <div className="card-base">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-primary-token">{t('bmCalTitle')}</h3>
          <p className="text-xs text-muted-token mt-0.5">
            {monthLabel} {t('totalWeight')}{' '}
            <span className="font-semibold text-secondary-token">{data.total_raw_weight}</span>
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-subtle text-secondary-token hover:bg-n-200 transition-colors disabled:opacity-50"
        >
          {saving ? <Spinner size="sm" /> : t('resetBtn')}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-3">
        {legends.map(({ bg, label }) => (
          <span key={label} className="flex items-center gap-1 text-[11px] text-muted-token">
            <span className={`inline-block w-3 h-3 rounded-sm border border-default-token ${bg}`} />
            {label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-[420px]">
          {['日', '一', '二', '三', '四', '五', '六'].map((l) => (
            <div key={l} className="text-center text-[10px] font-semibold text-muted-token py-1">
              {l}
            </div>
          ))}

          {/* 日格子 */}
          {cells.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={`empty-${idx}`} />;
            }

            const dateStr = `${selectedMonth.slice(0, 4)}-${selectedMonth.slice(4)}-${String(dayNum).padStart(2, '0')}`;
            const dayData = dayMap[dateStr];
            const isActive = activeDate === dateStr;

            return (
              <div key={dateStr} className="relative">
                <button
                  onClick={() => setActiveDate(isActive ? null : dateStr)}
                  className={`w-full rounded-lg border border-default-token p-1.5 text-left transition-colors hover:border-warning-token ${dayData ? dayTypeBg(dayData.day_type, dayData.is_override) : 'bg-white'}`}
                  title={dayData?.label || undefined}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-semibold text-primary-token">{dayNum}</span>
                    {dayData?.is_override && (
                      <span className="w-1.5 h-1.5 rounded-full bg-warning-token mt-0.5" />
                    )}
                  </div>
                  {dayData && (
                    <div className="text-[10px] text-muted-token mt-0.5 font-mono">
                      {((dayData.bm_daily_pct ?? 0) * 100).toFixed(1)}%
                    </div>
                  )}
                  {dayData?.label && (
                    <div className="text-[9px] text-secondary-token truncate">{dayData.label}</div>
                  )}
                </button>

                {/* Inline selector */}
                {isActive && dayData && (
                  <div className="absolute z-10 top-full left-0 mt-1 bg-surface border border-default-token rounded-lg shadow-lg p-1.5 min-w-[100px]">
                    {DAY_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleSelectType(dayData, opt.value)}
                        className={`w-full text-left px-2 py-1 rounded text-xs hover:bg-subtle transition-colors ${
                          dayData.day_type === opt.value &&
                          !dayData.is_override &&
                          opt.value === 'normal'
                            ? 'font-semibold text-primary-token'
                            : 'text-secondary-token'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-muted-token mt-3">{t('hint')}</p>
    </div>
  );
}

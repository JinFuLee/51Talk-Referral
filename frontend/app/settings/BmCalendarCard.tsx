'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { swrFetcher, configAPI } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import type { BmCalendarResponse, BmCalendarDay } from '@/lib/types/bm-calendar';

interface BmCalendarCardProps {
  selectedMonth: string;
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

type DayTypeOption = 'normal' | 'kickoff' | 'holiday_off';

const DAY_TYPE_OPTIONS: { value: DayTypeOption; label: string; weight: number }[] = [
  { value: 'normal', label: '正常', weight: 0 },
  { value: 'kickoff', label: 'Kick Off', weight: 2 },
  { value: 'holiday_off', label: '调休', weight: 1 },
];

function dayTypeBg(dayType: string, isOverride: boolean): string {
  const base: Record<string, string> = {
    weekend: 'bg-blue-50',
    weekday: 'bg-white',
    dayoff: 'bg-[var(--bg-subtle)]',
    kickoff: 'bg-amber-50',
    holiday_off: 'bg-red-50',
  };
  const color = base[dayType] ?? 'bg-white';
  return isOverride ? `${color} ring-1 ring-amber-400` : color;
}

export default function BmCalendarCard({ selectedMonth }: BmCalendarCardProps) {
  const { data, isLoading, mutate } = useSWR<BmCalendarResponse>(
    `/api/config/bm-calendar?month=${selectedMonth}`,
    swrFetcher
  );

  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return (
      <div className="card-base flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Spinner size="sm" /> 加载 BM 日历…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card-base text-sm text-[var(--text-muted)]">
        暂无 {selectedMonth.slice(0, 4)}年{selectedMonth.slice(4)}月 BM 日历数据
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
          specials: [...existingSpecials, { date: day.date, weight: 1, label: '调休' }],
          kickoff_date: kickoffDate,
        });
      }

      await mutate();
      toast.success(
        `${day.date} 已更新为「${DAY_TYPE_OPTIONS.find((o) => o.value === optionValue)?.label}」`
      );
    } catch {
      toast.error('保存失败，请重试');
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
      toast.success('已恢复默认 BM 日历');
    } catch {
      toast.error('恢复失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card-base">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">BM 节奏配置</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {selectedMonth.slice(0, 4)}年{selectedMonth.slice(4)}月 · 总权重{' '}
            <span className="font-semibold text-[var(--text-secondary)]">
              {data.total_raw_weight}
            </span>
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border-default)] transition-colors disabled:opacity-50"
        >
          {saving ? <Spinner size="sm" /> : '恢复默认'}
        </button>
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-3 mb-3">
        {[
          { bg: 'bg-blue-50', label: '周末' },
          { bg: 'bg-amber-50', label: 'Kick Off' },
          { bg: 'bg-red-50', label: '调休' },
          { bg: 'bg-[var(--bg-subtle)]', label: '休息日' },
          { bg: 'bg-white ring-1 ring-amber-400', label: '手动覆盖' },
        ].map(({ bg, label }) => (
          <span
            key={label}
            className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]"
          >
            <span
              className={`inline-block w-3 h-3 rounded-sm border border-[var(--border-default)] ${bg}`}
            />
            {label}
          </span>
        ))}
      </div>

      {/* 月历网格 */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-[420px]">
          {/* 列头 */}
          {DAY_LABELS.map((l) => (
            <div
              key={l}
              className="text-center text-[10px] font-semibold text-[var(--text-muted)] py-1"
            >
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
                  className={`w-full rounded-lg border border-[var(--border-default)] p-1.5 text-left transition-colors hover:border-amber-400 ${dayData ? dayTypeBg(dayData.day_type, dayData.is_override) : 'bg-white'}`}
                  title={dayData?.label || undefined}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                      {dayNum}
                    </span>
                    {dayData?.is_override && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-0.5" />
                    )}
                  </div>
                  {dayData && (
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">
                      {(dayData.bm_daily_pct * 100).toFixed(1)}%
                    </div>
                  )}
                  {dayData?.label && (
                    <div className="text-[9px] text-[var(--text-secondary)] truncate">
                      {dayData.label}
                    </div>
                  )}
                </button>

                {/* Inline selector */}
                {isActive && dayData && (
                  <div className="absolute z-10 top-full left-0 mt-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg shadow-lg p-1.5 min-w-[100px]">
                    {DAY_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleSelectType(dayData, opt.value)}
                        className={`w-full text-left px-2 py-1 rounded text-xs hover:bg-[var(--bg-subtle)] transition-colors ${
                          dayData.day_type === opt.value &&
                          !dayData.is_override &&
                          opt.value === 'normal'
                            ? 'font-semibold text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)]'
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

      <p className="text-[10px] text-[var(--text-muted)] mt-3">
        点击日期格子可修改当天类型。Kick Off 权重 2.0，调休权重 1.0，周末权重 5.0，普通工作日权重
        1.0。
      </p>
    </div>
  );
}

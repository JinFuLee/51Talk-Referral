'use client';

import { useState } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import type { SimulationResult } from '@/lib/types/cross-analysis';
import { formatRate } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { useLocale } from 'next-intl';

const I18N = {
  zh: {
    funnel: '漏斗段',
    targetRate: '目标转化率：',
    calculating: '计算中…',
    errorMsg: '无法加载模拟数据，请检查后端服务',
    currentRate: '当前',
    targetRateLabel: '目标转化率',
    currentPaid: '当前付费',
    predictedPaid: '预测付费',
    predictedAchievement: '预测达成率',
    raiseTo: '将',
    from: '从',
    to: '提升到',
    predictPaidIncrease: '，预计付费增加',
    people: '人',
    hint: '调整上方参数查看预测结果',
    segments: {
      reg_to_appt: '注册→预约率',
      appt_to_attend: '预约→出席率',
      attend_to_pay: '出席→付费率',
    },
  },
  en: {
    funnel: 'Funnel Stage',
    targetRate: 'Target Rate: ',
    calculating: 'Calculating…',
    errorMsg: 'Failed to load simulation data, check backend',
    currentRate: 'Current',
    targetRateLabel: 'Target Rate',
    currentPaid: 'Current Paid',
    predictedPaid: 'Predicted Paid',
    predictedAchievement: 'Predicted Achievement',
    raiseTo: 'Raising',
    from: 'from',
    to: 'to',
    predictPaidIncrease: ', predicted paid increase',
    people: '',
    hint: 'Adjust the parameters above to see predictions',
    segments: {
      reg_to_appt: 'Reg→Appt Rate',
      appt_to_attend: 'Appt→Attend Rate',
      attend_to_pay: 'Attend→Pay Rate',
    },
  },
  'zh-TW': {
    funnel: '漏斗段',
    targetRate: '目標轉化率：',
    calculating: '計算中…',
    errorMsg: '無法載入模擬數據，請檢查後端服務',
    currentRate: '當前',
    targetRateLabel: '目標轉化率',
    currentPaid: '當前付費',
    predictedPaid: '預測付費',
    predictedAchievement: '預測達成率',
    raiseTo: '將',
    from: '從',
    to: '提升到',
    predictPaidIncrease: '，預計付費增加',
    people: '人',
    hint: '調整上方參數查看預測結果',
    segments: {
      reg_to_appt: '注冊→預約率',
      appt_to_attend: '預約→出席率',
      attend_to_pay: '出席→付費率',
    },
  },
  th: {
    funnel: 'ช่องทาง',
    targetRate: 'อัตราเป้าหมาย: ',
    calculating: 'กำลังคำนวณ…',
    errorMsg: 'โหลดข้อมูลจำลองไม่ได้ ตรวจสอบบริการหลังบ้าน',
    currentRate: 'ปัจจุบัน',
    targetRateLabel: 'อัตราเป้าหมาย',
    currentPaid: 'ชำระปัจจุบัน',
    predictedPaid: 'ชำระที่คาด',
    predictedAchievement: 'การบรรลุที่คาด',
    raiseTo: 'ยก',
    from: 'จาก',
    to: 'ถึง',
    predictPaidIncrease: ' คาดว่าชำระเพิ่ม',
    people: 'คน',
    hint: 'ปรับพารามิเตอร์ด้านบนเพื่อดูการคาดการณ์',
    segments: {
      reg_to_appt: 'ลงทะเบียน→นัด',
      appt_to_attend: 'นัด→เข้าร่วม',
      attend_to_pay: 'เข้าร่วม→ชำระ',
    },
  },
} as const;
type Locale = keyof typeof I18N;

function achievementColor(rate: number): string {
  if (rate >= 1) return 'text-success-token';
  if (rate >= 0.5) return 'text-action-accent';
  return 'text-danger-token';
}

export function GapSimulator() {
  const [segment, setSegment] = useState('attend_to_pay');
  const [newRate, setNewRate] = useState(0.5);
  const locale = useLocale();
  const t = I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];

  const SEGMENTS = [
    { value: 'reg_to_appt', label: t.segments.reg_to_appt },
    { value: 'appt_to_attend', label: t.segments.appt_to_attend },
    { value: 'attend_to_pay', label: t.segments.attend_to_pay },
  ];

  const url = `/api/attribution/simulation?segment=${encodeURIComponent(segment)}&new_rate=${newRate}`;
  const { data, isLoading, error } = useFilteredSWR<SimulationResult>(url);

  const segmentLabel = SEGMENTS.find((s) => s.value === segment)?.label ?? segment;

  return (
    <div className="space-y-4">
      {/* 选择漏斗段 */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-token">{t.funnel}</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="text-sm rounded-lg border border-default-token bg-surface text-primary-token px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-action"
          >
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label className="text-xs text-muted-token">
            {t.targetRate}
            <span className="font-semibold text-primary-token">{formatRate(newRate)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={newRate}
            onChange={(e) => setNewRate(parseFloat(e.target.value))}
            className="w-full accent-action-accent"
          />
          <div className="flex justify-between text-xs text-muted-token">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* 预测结果 */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-token">
          <Spinner size="sm" /> {t.calculating}
        </div>
      )}

      {error && <p className="text-xs text-danger-token">{t.errorMsg}</p>}

      {data && !isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card-subtle">
            <p className="text-xs text-muted-token">
              {t.currentRate} {segmentLabel}
            </p>
            <p className="text-lg font-bold tabular-nums text-primary-token">
              {formatRate(data.current_rate)}
            </p>
          </div>

          <div className="card-subtle">
            <p className="text-xs text-muted-token">{t.targetRateLabel}</p>
            <p className="text-lg font-bold tabular-nums text-action-accent">
              {formatRate(data.new_rate)}
            </p>
          </div>

          <div className="card-subtle">
            <p className="text-xs text-muted-token">{t.currentPaid}</p>
            <p className="text-lg font-bold tabular-nums text-primary-token">
              {(data.current_paid ?? 0).toLocaleString()} {t.people}
            </p>
          </div>

          <div className="card-subtle">
            <p className="text-xs text-muted-token">{t.predictedPaid}</p>
            <p className="text-lg font-bold tabular-nums text-success-token">
              {(data.new_paid ?? 0).toLocaleString()} {t.people}
            </p>
          </div>

          {/* 预测达成率 */}
          <div className="col-span-2 sm:col-span-4 card-subtle flex items-center gap-3">
            <div>
              <p className="text-xs text-muted-token">{t.predictedAchievement}</p>
              <p
                className={`text-2xl font-bold tabular-nums ${achievementColor(data.predicted_achievement)}`}
              >
                {formatRate(data.predicted_achievement)}
              </p>
            </div>
            <div className="text-xs text-muted-token">
              {t.raiseTo} <strong className="text-primary-token">{segmentLabel}</strong> {t.from}{' '}
              <strong>{formatRate(data.current_rate)}</strong> {t.to}{' '}
              <strong>{formatRate(data.new_rate)}</strong>
              {t.predictPaidIncrease}{' '}
              <strong className="text-success-token">
                +{((data.new_paid ?? 0) - (data.current_paid ?? 0)).toLocaleString()} {t.people}
              </strong>
            </div>
          </div>
        </div>
      )}

      {!data && !isLoading && !error && <p className="text-xs text-muted-token">{t.hint}</p>}
    </div>
  );
}

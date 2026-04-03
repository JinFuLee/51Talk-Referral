'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLocale } from 'next-intl';
import { formatRate } from '@/lib/utils';

const I18N = {
  zh: {
    behindPace: '落后时间进度',
    checkinBelowRedline: (pct: number) => `打卡率 ${pct}% 低于红线（30%）`,
    achievementLow: (pct: number) => `月达成率 ${pct}%，已过月中仍低于 70%`,
    momDecline: (label: string, pct: number) => `${label} 环比下降 ${pct}%`,
    attention: '注意：',
    closeAlert: '关闭警报',
  },
  'zh-TW': {
    behindPace: '落後時間進度',
    checkinBelowRedline: (pct: number) => `打卡率 ${pct}% 低於紅線（30%）`,
    achievementLow: (pct: number) => `月達成率 ${pct}%，已過月中仍低於 70%`,
    momDecline: (label: string, pct: number) => `${label} 環比下降 ${pct}%`,
    attention: '注意：',
    closeAlert: '關閉警報',
  },
  en: {
    behindPace: 'behind time progress',
    checkinBelowRedline: (pct: number) => `Check-in rate ${pct}% below red line (30%)`,
    achievementLow: (pct: number) => `Monthly achievement ${pct}%, still below 70% past mid-month`,
    momDecline: (label: string, pct: number) => `${label} MoM decline ${pct}%`,
    attention: 'Attention: ',
    closeAlert: 'Close alert',
  },
  th: {
    behindPace: 'ช้ากว่าความคืบหน้าตามเวลา',
    checkinBelowRedline: (pct: number) => `อัตราเช็คอิน ${pct}% ต่ำกว่าเส้นแดง (30%)`,
    achievementLow: (pct: number) => `อัตราบรรลุรายเดือน ${pct}% ยังต่ำกว่า 70% หลังกลางเดือน`,
    momDecline: (label: string, pct: number) => `${label} ลดลง MoM ${pct}%`,
    attention: 'ข้อควรระวัง: ',
    closeAlert: 'ปิดการแจ้งเตือน',
  },
} as const;
type Locale = keyof typeof I18N;

interface AnomalyBannerProps {
  /** 时间进度差（actual/target - time_progress），负值=落后 */
  paceGap?: number | null;
  /** 打卡率 0~1 */
  checkinRate?: number | null;
  /** 达成率 0~1（已付费/目标） */
  achievementRate?: number | null;
  /** 时间进度 0~1 */
  timeProgress?: number | null;
  /** MoM 变化率（负数 = 下降）：各核心指标中最差的一个 */
  worstMoM?: number | null;
  worstMoMLabel?: string | null;
}

interface AnomalyItem {
  severity: 'critical' | 'warning';
  message: string;
}

const DISMISS_KEY = 'anomaly-banner-dismiss-date';

export function AnomalyBanner({
  paceGap,
  checkinRate,
  achievementRate,
  timeProgress,
  worstMoM,
  worstMoMLabel,
}: AnomalyBannerProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;
  const [dismissed, setDismissed] = useState(false);

  // 初始化时检查 sessionStorage 是否已在今天关闭过
  useEffect(() => {
    const today = new Date().toDateString();
    const stored = sessionStorage.getItem(DISMISS_KEY);
    if (stored === today) setDismissed(true);
  }, []);

  const anomalies = useMemo<AnomalyItem[]>(() => {
    const items: AnomalyItem[] = [];

    // 1. 时间进度差 < -10%（严重落后）
    if (paceGap !== null && paceGap !== undefined && paceGap < -0.1) {
      items.push({
        severity: 'critical',
        message: `${t.behindPace} ${formatRate(Math.abs(paceGap))}`,
      });
    }

    // 2. 打卡率 < 30%（红线）
    if (checkinRate !== null && checkinRate !== undefined && checkinRate < 0.3) {
      const pct = Math.round(checkinRate * 100);
      items.push({
        severity: 'critical',
        message: t.checkinBelowRedline(pct),
      });
    }

    // 3. 达成率 < 70% 且已过月中（时间进度 > 50%）
    if (
      achievementRate !== null &&
      achievementRate !== undefined &&
      timeProgress !== null &&
      timeProgress !== undefined &&
      achievementRate < 0.7 &&
      timeProgress > 0.5
    ) {
      const pct = Math.round(achievementRate * 100);
      items.push({
        severity: 'warning',
        message: t.achievementLow(pct),
      });
    }

    // 4. 核心指标 MoM 下降 > 20%
    if (worstMoM !== null && worstMoM !== undefined && worstMoM < -0.2 && worstMoMLabel) {
      const pct = Math.round(Math.abs(worstMoM) * 100);
      items.push({
        severity: 'warning',
        message: t.momDecline(worstMoMLabel, pct),
      });
    }

    return items;
  }, [paceGap, checkinRate, achievementRate, timeProgress, worstMoM, worstMoMLabel, t]);

  if (anomalies.length === 0 || dismissed) return null;

  const hasCritical = anomalies.some((a) => a.severity === 'critical');
  const summary = anomalies.map((a) => a.message).join('。');

  const bannerClass = hasCritical
    ? 'bg-red-50 border border-red-200 text-red-800'
    : 'bg-amber-50 border border-amber-200 text-amber-800';

  const iconClass = hasCritical ? 'text-[var(--color-danger)]' : 'text-amber-800';

  function handleDismiss() {
    const today = new Date().toDateString();
    sessionStorage.setItem(DISMISS_KEY, today);
    setDismissed(true);
  }

  return (
    <div className={`flex items-start gap-3 rounded-lg p-3 ${bannerClass}`} role="alert">
      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${iconClass}`} />
      <p className="flex-1 text-sm leading-relaxed">
        <span className="font-semibold">{t.attention}</span>
        {summary}
      </p>
      <button
        onClick={handleDismiss}
        aria-label={t.closeAlert}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

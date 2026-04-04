'use client';

import { useLocale } from 'next-intl';
import type { LessonCheckinCross as LessonCheckinCrossData } from '@/lib/types/checkin-student';

// ── 内联 I18N ────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    hasLesson: '有课耗',
    noLesson: '无课耗',
    hasCheckin: '有打卡',
    noCheckin: '无打卡',
    coreUser: '核心用户',
    coreUserSub: '有课耗 + 有打卡',
    activationPool: '激活目标池',
    activationPoolSub: '有课耗 + 无打卡',
    lightUser: '轻度参与',
    lightUserSub: '无课耗 + 有打卡',
    silent: '完全沉默',
    silentSub: '无课耗 + 无打卡',
    maxOpportunity: '最大激活机会',
    totalLabel: (n: string) => `总计 ${n} 名有效学员`,
  },
  'zh-TW': {
    hasLesson: '有課耗',
    noLesson: '無課耗',
    hasCheckin: '有打卡',
    noCheckin: '無打卡',
    coreUser: '核心用戶',
    coreUserSub: '有課耗 + 有打卡',
    activationPool: '激活目標池',
    activationPoolSub: '有課耗 + 無打卡',
    lightUser: '輕度參與',
    lightUserSub: '無課耗 + 有打卡',
    silent: '完全沉默',
    silentSub: '無課耗 + 無打卡',
    maxOpportunity: '最大激活機會',
    totalLabel: (n: string) => `總計 ${n} 名有效學員`,
  },
  en: {
    hasLesson: 'Has Lessons',
    noLesson: 'No Lessons',
    hasCheckin: 'Checked In',
    noCheckin: 'No Check-in',
    coreUser: 'Core Users',
    coreUserSub: 'Has lessons + Checked in',
    activationPool: 'Activation Pool',
    activationPoolSub: 'Has lessons + No check-in',
    lightUser: 'Light Participation',
    lightUserSub: 'No lessons + Checked in',
    silent: 'Completely Silent',
    silentSub: 'No lessons + No check-in',
    maxOpportunity: 'Max Activation Opportunity',
    totalLabel: (n: string) => `Total ${n} active students`,
  },
  th: {
    hasLesson: 'มีการใช้คอร์ส',
    noLesson: 'ไม่ใช้คอร์ส',
    hasCheckin: 'เช็คอินแล้ว',
    noCheckin: 'ไม่ได้เช็คอิน',
    coreUser: 'ผู้ใช้หลัก',
    coreUserSub: 'ใช้คอร์ส + เช็คอิน',
    activationPool: 'กลุ่มเป้าหมายกระตุ้น',
    activationPoolSub: 'ใช้คอร์ส + ไม่เช็คอิน',
    lightUser: 'มีส่วนร่วมเล็กน้อย',
    lightUserSub: 'ไม่ใช้คอร์ส + เช็คอิน',
    silent: 'เงียบสนิท',
    silentSub: 'ไม่ใช้คอร์ส + ไม่เช็คอิน',
    maxOpportunity: 'โอกาสกระตุ้นสูงสุด',
    totalLabel: (n: string) => `รวม ${n} นักเรียนที่ใช้งาน`,
  },
} as const;

type Locale = keyof typeof I18N;

interface LessonCheckinCrossProps {
  /** 课耗×打卡四象限数据 */
  data: LessonCheckinCrossData;
}

interface QuadrantConfig {
  label: string;
  sublabel: string;
  flag?: string;
  containerClass: string;
  valueClass: string;
}

/**
 * 课耗×打卡四象限矩阵
 *
 * 展示学员在"有无课耗"×"有无打卡"四个象限的分布，
 * 帮助 CC 快速识别"有课耗但未打卡"的激活机会池。
 *
 * ┌─────────────┬───────────────┐
 * │ 核心用户 │ 激活目标池 🔴 │ ← 有课耗
 * ├─────────────┼───────────────┤
 * │ 轻度参与 │ 完全沉默 │ ← 无课耗
 * └─────────────┴───────────────┘
 * ↑ 有打卡 ↑ 无打卡
 *
 * 使用示例：
 * <LessonCheckinCross data={analysis.lesson_checkin_cross} />
 */
export function LessonCheckinCross({ data }: LessonCheckinCrossProps) {
  const locale = useLocale();
  const t = I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];

  const total =
    data.has_lesson_no_checkin +
    data.has_lesson_has_checkin +
    data.no_lesson_has_checkin +
    data.no_lesson_no_checkin;

  const pct = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '—');

  // 四象限配置（行=课耗，列=打卡）
  // 布局：[0]左上 有课耗+有打卡 [1]右上 有课耗+无打卡
  // [2]左下 无课耗+有打卡 [3]右下 无课耗+无打卡
  const quadrants: Array<{ value: number; config: QuadrantConfig }> = [
    {
      value: data.has_lesson_has_checkin,
      config: {
        label: t.coreUser,
        sublabel: t.coreUserSub,
        containerClass:
          'bg-[var(--color-success-surface)] border-[var(--color-success)] hover:bg-[var(--color-success-surface)]',
        valueClass: 'text-[var(--color-success)]',
      },
    },
    {
      value: data.has_lesson_no_checkin,
      config: {
        label: t.activationPool,
        sublabel: t.activationPoolSub,
        flag: '🔴',
        containerClass:
          'bg-[var(--color-warning-surface)] border-[var(--color-warning)] hover:bg-[var(--color-warning-surface)]',
        valueClass: 'text-[var(--color-warning)]',
      },
    },
    {
      value: data.no_lesson_has_checkin,
      config: {
        label: t.lightUser,
        sublabel: t.lightUserSub,
        containerClass:
          'bg-[var(--color-accent-surface)] border-[var(--color-accent)] hover:bg-[var(--color-accent-surface)]',
        valueClass: 'text-[var(--color-accent)]',
      },
    },
    {
      value: data.no_lesson_no_checkin,
      config: {
        label: t.silent,
        sublabel: t.silentSub,
        containerClass:
          'bg-[var(--bg-subtle)] border-[var(--border-default)] hover:bg-[var(--bg-subtle)]',
        valueClass: 'text-[var(--text-secondary)]',
      },
    },
  ];

  return (
    <div className="space-y-3">
      {/* 轴标签 + 矩阵 */}
      <div className="flex gap-1">
        {/* Y 轴标签（课耗维度） */}
        <div className="flex flex-col justify-between py-6 pr-1 text-xs text-[var(--text-muted)] text-right shrink-0 w-12">
          <span>{t.hasLesson}</span>
          <span>{t.noLesson}</span>
        </div>

        {/* 四象限网格 */}
        <div className="flex-1 space-y-1">
          {/* 列标签 */}
          <div className="grid grid-cols-2 gap-1">
            <div className="text-center text-xs text-[var(--text-muted)] pb-1">{t.hasCheckin}</div>
            <div className="text-center text-xs text-[var(--text-muted)] pb-1">{t.noCheckin}</div>
          </div>

          {/* 第一行：有课耗 */}
          <div className="grid grid-cols-2 gap-1">
            {quadrants.slice(0, 2).map((q, i) => (
              <div
                key={i}
                className={`rounded-lg border p-3 transition-colors ${q.config.containerClass}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    {q.config.label}
                  </span>
                  {q.config.flag && (
                    <span className="text-xs" aria-hidden="true">
                      {q.config.flag}
                    </span>
                  )}
                </div>
                <div className={`text-2xl font-bold font-mono tabular-nums ${q.config.valueClass}`}>
                  {q.value.toLocaleString()}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{pct(q.value)}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1 opacity-70">
                  {q.config.sublabel}
                </div>
                {i === 1 && q.value > 0 && (
                  <div className="mt-1.5 text-xs text-[var(--color-warning)] font-medium">
                    {t.maxOpportunity}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 第二行：无课耗 */}
          <div className="grid grid-cols-2 gap-1">
            {quadrants.slice(2, 4).map((q, i) => (
              <div
                key={i + 2}
                className={`rounded-lg border p-3 transition-colors ${q.config.containerClass}`}
              >
                <div className="text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  {q.config.label}
                </div>
                <div className={`text-2xl font-bold font-mono tabular-nums ${q.config.valueClass}`}>
                  {q.value.toLocaleString()}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{pct(q.value)}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1 opacity-70">
                  {q.config.sublabel}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 总学员数 */}
      <div className="text-xs text-[var(--text-muted)] text-right">
        <span className="font-mono tabular-nums font-semibold text-[var(--text-secondary)]">
          {t.totalLabel(total.toLocaleString())}
        </span>
      </div>
    </div>
  );
}

'use client';

import type { LessonCheckinCross as LessonCheckinCrossData } from '@/lib/types/checkin-student';

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
 *  ┌─────────────┬───────────────┐
 *  │ 核心用户     │ 激活目标池 🔴  │ ← 有课耗
 *  ├─────────────┼───────────────┤
 *  │ 轻度参与     │ 完全沉默      │ ← 无课耗
 *  └─────────────┴───────────────┘
 *    ↑ 有打卡        ↑ 无打卡
 *
 * 使用示例：
 *   <LessonCheckinCross data={analysis.lesson_checkin_cross} />
 */
export function LessonCheckinCross({ data }: LessonCheckinCrossProps) {
  const total =
    data.has_lesson_no_checkin +
    data.has_lesson_has_checkin +
    data.no_lesson_has_checkin +
    data.no_lesson_no_checkin;

  const pct = (n: number) =>
    total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '—';

  // 四象限配置（行=课耗，列=打卡）
  // 布局：[0]左上 有课耗+有打卡  [1]右上 有课耗+无打卡
  //       [2]左下 无课耗+有打卡  [3]右下 无课耗+无打卡
  const quadrants: Array<{ value: number; config: QuadrantConfig }> = [
    {
      value: data.has_lesson_has_checkin,
      config: {
        label: '核心用户',
        sublabel: '有课耗 + 有打卡',
        containerClass:
          'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
        valueClass: 'text-emerald-700',
      },
    },
    {
      value: data.has_lesson_no_checkin,
      config: {
        label: '激活目标池',
        sublabel: '有课耗 + 无打卡',
        flag: '🔴',
        containerClass:
          'bg-amber-50 border-amber-200 hover:bg-amber-100',
        valueClass: 'text-amber-700',
      },
    },
    {
      value: data.no_lesson_has_checkin,
      config: {
        label: '轻度参与',
        sublabel: '无课耗 + 有打卡',
        containerClass:
          'bg-blue-50 border-blue-200 hover:bg-blue-100',
        valueClass: 'text-blue-700',
      },
    },
    {
      value: data.no_lesson_no_checkin,
      config: {
        label: '完全沉默',
        sublabel: '无课耗 + 无打卡',
        containerClass:
          'bg-gray-50 border-gray-200 hover:bg-gray-100',
        valueClass: 'text-gray-600',
      },
    },
  ];

  return (
    <div className="space-y-3">
      {/* 轴标签 + 矩阵 */}
      <div className="flex gap-1">
        {/* Y 轴标签（课耗维度） */}
        <div className="flex flex-col justify-between py-6 pr-1 text-xs text-[var(--text-muted)] text-right shrink-0 w-12">
          <span>有课耗</span>
          <span>无课耗</span>
        </div>

        {/* 四象限网格 */}
        <div className="flex-1 space-y-1">
          {/* 列标签 */}
          <div className="grid grid-cols-2 gap-1">
            <div className="text-center text-xs text-[var(--text-muted)] pb-1">有打卡</div>
            <div className="text-center text-xs text-[var(--text-muted)] pb-1">无打卡</div>
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
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  {pct(q.value)}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1 opacity-70">
                  {q.config.sublabel}
                </div>
                {i === 1 && q.value > 0 && (
                  <div className="mt-1.5 text-xs text-amber-600 font-medium">
                    最大激活机会
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
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  {pct(q.value)}
                </div>
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
        总计 <span className="font-mono tabular-nums font-semibold text-[var(--text-secondary)]">{total.toLocaleString()}</span> 名有效学员
      </div>
    </div>
  );
}

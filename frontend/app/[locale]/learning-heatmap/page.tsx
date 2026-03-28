'use client';

import useSWR from 'swr';
import { useLocale } from 'next-intl';
import { swrFetcher } from '@/lib/api';
import { fmtEnc } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

const I18N = {
  zh: {
    title: '学习热图',
    subtitle: '各围场每周平均转码次数 · 颜色越深代表学习活跃度越高',
    subtitleEmpty: '各围场每周平均转码次数热力图',
    legendLabel: '活跃度：',
    legendLevels: ['极低', '低', '中', '较高', '高', '极高'],
    colEnclosure: '围场 / 生命周期',
    colTrend: '趋势',
    colAvg: '周均',
    trendTooltip: '衰减比 = 前几周均值/本周，>1表示本周低于历史',
    weeks: ['第1周', '第2周', '第3周', '第4周'],
    footerNote: '数值 = 该围场所有学员在对应周内的平均转码次数（转码 = 学员分享推荐链接的行为）',
    errorTitle: '数据加载失败',
    errorDesc: '无法获取学习热图数据，请检查后端服务是否正常运行',
    errorRetry: '重试',
    emptyTitle: '暂无转码数据',
    emptyDesc: '数据源中未找到「第N周转码」列，请上传包含周转码信息的学员数据文件',
  },
  'zh-TW': {
    title: '學習熱圖',
    subtitle: '各圍場每週平均轉碼次數 · 顏色越深代表學習活躍度越高',
    subtitleEmpty: '各圍場每週平均轉碼次數熱力圖',
    legendLabel: '活躍度：',
    legendLevels: ['極低', '低', '中', '較高', '高', '極高'],
    colEnclosure: '圍場 / 生命週期',
    colTrend: '趨勢',
    colAvg: '週均',
    trendTooltip: '衰減比 = 前幾週均值/本週，>1表示本週低於歷史',
    weeks: ['第1週', '第2週', '第3週', '第4週'],
    footerNote: '數值 = 該圍場所有學員在對應週內的平均轉碼次數（轉碼 = 學員分享推薦連結的行為）',
    errorTitle: '資料載入失敗',
    errorDesc: '無法取得學習熱圖資料，請檢查後端服務是否正常運行',
    errorRetry: '重試',
    emptyTitle: '暫無轉碼資料',
    emptyDesc: '資料來源中未找到「第N週轉碼」欄，請上傳包含週轉碼資訊的學員資料檔案',
  },
  en: {
    title: 'Learning Heatmap',
    subtitle: 'Avg. weekly check-in count per Enclosure · Darker = more active',
    subtitleEmpty: 'Weekly average check-in count heatmap by Enclosure',
    legendLabel: 'Activity: ',
    legendLevels: ['Very Low', 'Low', 'Medium', 'High', 'Very High', 'Extreme'],
    colEnclosure: 'Enclosure / Lifecycle',
    colTrend: 'Trend',
    colAvg: 'Avg',
    trendTooltip: 'Decay ratio = prev weeks avg / this week, >1 means this week is lower',
    weeks: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    footerNote:
      'Value = avg check-in count of all students in the Enclosure for that week (check-in = student sharing referral link)',
    errorTitle: 'Load Failed',
    errorDesc: 'Cannot load learning heatmap data, please check backend service',
    errorRetry: 'Retry',
    emptyTitle: 'No Check-in Data',
    emptyDesc:
      'No "Week N check-in" column found in data source. Please upload student data with weekly check-in info.',
  },
  th: {
    title: 'แผนที่ความร้อนการเรียนรู้',
    subtitle: 'จำนวนเช็คอินเฉลี่ยต่อสัปดาห์แต่ละ Enclosure · สีเข้ม = กระตือรือร้นมากกว่า',
    subtitleEmpty: 'แผนที่ความร้อนจำนวนเช็คอินเฉลี่ยรายสัปดาห์แต่ละ Enclosure',
    legendLabel: 'ความกระตือรือร้น: ',
    legendLevels: ['ต่ำมาก', 'ต่ำ', 'ปานกลาง', 'สูง', 'สูงมาก', 'สูงสุด'],
    colEnclosure: 'ระยะเวลา / วงจรชีวิต',
    colTrend: 'แนวโน้ม',
    colAvg: 'เฉลี่ย',
    trendTooltip:
      'อัตราส่วนการลดลง = ค่าเฉลี่ยสัปดาห์ก่อน / สัปดาห์นี้, >1 หมายถึงสัปดาห์นี้ต่ำกว่า',
    weeks: ['สัปดาห์ที่ 1', 'สัปดาห์ที่ 2', 'สัปดาห์ที่ 3', 'สัปดาห์ที่ 4'],
    footerNote:
      'ค่า = จำนวนเช็คอินเฉลี่ยของนักเรียนทั้งหมดใน Enclosure ในสัปดาห์นั้น (เช็คอิน = นักเรียนแชร์ลิงก์แนะนำ)',
    errorTitle: 'โหลดข้อมูลล้มเหลว',
    errorDesc: 'ไม่สามารถโหลดข้อมูลแผนที่ความร้อนได้ กรุณาตรวจสอบบริการ backend',
    errorRetry: 'ลองใหม่',
    emptyTitle: 'ไม่มีข้อมูลเช็คอิน',
    emptyDesc:
      'ไม่พบคอลัมน์ "เช็คอินสัปดาห์ที่ N" ในแหล่งข้อมูล กรุณาอัปโหลดไฟล์ข้อมูลนักเรียนที่มีข้อมูลเช็คอินรายสัปดาห์',
  },
};

interface HeatmapRow {
  enclosure: string;
  week1_avg: number | null;
  week2_avg: number | null;
  week3_avg: number | null;
  week4_avg: number | null;
  trend_ratio: number | null;
}

const WEEK_KEYS = ['week1_avg', 'week2_avg', 'week3_avg', 'week4_avg'] as const;

/** 根据 0-1 强度值映射 CSS 背景色（Warm Neutral 深浅） */
function intensityBg(ratio: number): string {
  if (ratio >= 0.85) return 'var(--n-800)';
  if (ratio >= 0.65) return 'var(--n-600)';
  if (ratio >= 0.45) return 'var(--n-400)';
  if (ratio >= 0.25) return 'var(--n-300)';
  if (ratio >= 0.05) return 'var(--n-200)';
  return 'var(--n-100)';
}

function intensityText(ratio: number): string {
  return ratio >= 0.45 ? '#fff' : 'var(--text-primary)';
}

function HeatCell({ value, maxVal }: { value: number | null; maxVal: number }) {
  if (value == null) {
    return (
      <td className="slide-td text-center">
        <span className="text-xs text-[var(--text-muted)]">—</span>
      </td>
    );
  }
  const ratio = maxVal > 0 ? value / maxVal : 0;
  return (
    <td className="slide-td text-center p-1">
      <div
        className="rounded-md px-2 py-1.5 text-xs font-mono tabular-nums font-semibold"
        style={{
          backgroundColor: intensityBg(ratio),
          color: intensityText(ratio),
        }}
      >
        {(value ?? 0).toFixed(2)}
      </div>
    </td>
  );
}

export default function LearningHeatmapPage() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  const { data, isLoading, error, mutate } = useSWR<HeatmapRow[]>(
    '/api/analysis/learning-heatmap',
    swrFetcher
  );

  const weeks = WEEK_KEYS.map((key, i) => ({ key, label: t.weeks[i] }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={t.errorTitle}
        description={t.errorDesc}
        action={{ label: t.errorRetry, onClick: () => mutate() }}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="page-title">{t.title}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t.subtitleEmpty}</p>
        </div>
        <EmptyState title={t.emptyTitle} description={t.emptyDesc} />
      </div>
    );
  }

  // 求全局最大值用于归一化
  const allValues = data.flatMap((row) =>
    WEEK_KEYS.map((k) => row[k]).filter((v): v is number => v != null)
  );
  const maxVal = Math.max(...allValues, 0.001);

  const legendBgs = [
    'var(--n-100)',
    'var(--n-200)',
    'var(--n-300)',
    'var(--n-400)',
    'var(--n-600)',
    'var(--n-800)',
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="page-title">{t.title}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{t.subtitle}</p>
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <span>{t.legendLabel}</span>
        {t.legendLevels.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: legendBgs[i] }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* 热图表格 */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th text-left">{t.colEnclosure}</th>
              {weeks.map((w) => (
                <th key={w.key} className="slide-th text-center">
                  {w.label}
                </th>
              ))}
              <th className="slide-th text-center">{t.colAvg}</th>
              <th className="slide-th text-center">
                <span className="inline-flex items-center gap-1 group relative cursor-default">
                  {t.colTrend}
                  <span
                    className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"
                    title={t.trendTooltip}
                  >
                    ⓘ
                  </span>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none shadow-lg">
                    {t.trendTooltip}
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const vals = WEEK_KEYS.map((k) => row[k]).filter((v): v is number => v != null);
              const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
              return (
                <tr
                  key={row.enclosure}
                  className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                >
                  <td className="slide-td font-medium text-[var(--text-primary)]">
                    {fmtEnc(row.enclosure)}
                  </td>
                  {WEEK_KEYS.map((k) => (
                    <HeatCell key={k} value={row[k]} maxVal={maxVal} />
                  ))}
                  <td className="slide-td text-center">
                    {avg != null ? (
                      <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
                        {avg.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="slide-td text-center">
                    {row.trend_ratio != null ? (
                      <span
                        className={`text-xs font-medium ${
                          row.trend_ratio > 1.15
                            ? 'text-[var(--color-danger)]'
                            : row.trend_ratio < 0.85
                              ? 'text-[var(--color-success)]'
                              : 'text-[var(--text-secondary)]'
                        }`}
                        title={`${t.colTrend}: ${row.trend_ratio}`}
                      >
                        {row.trend_ratio > 1.15 ? '↓' : row.trend_ratio < 0.85 ? '↑' : '→'}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 说明 */}
      <p className="text-xs text-[var(--text-muted)]">{t.footerNote}</p>
    </div>
  );
}

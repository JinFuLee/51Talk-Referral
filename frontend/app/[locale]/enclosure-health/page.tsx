'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { formatRate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { HealthScoreCards } from '@/components/enclosure-health/HealthScoreCards';
import { SegmentBenchmark } from '@/components/enclosure-health/SegmentBenchmark';
import { CCVarianceBox } from '@/components/enclosure-health/CCVarianceBox';
import type {
  EnclosureHealthScore,
  EnclosureBenchmarkRow,
  EnclosureVarianceRow,
} from '@/lib/types/cross-analysis';

const I18N = {
  zh: {
    title: '围场健康扫描仪',
    subtitle: '14段围场 · 健康分 · 对标分析 · CC方差诊断',
    badgeHealthy: '健康',
    badgeWarning: '警告',
    badgeDanger: '危险',
    cardScores: '围场健康分（14 段）',
    cardBenchmark: '围场段对标分析（4 指标分组柱图）',
    cardVariance: 'CC 方差诊断（各围场段内 CC 分布）',
    collapseBtn: '收起',
    segmentCcList: 'CC 列表',
    segmentHealthScore: '健康分',
    segmentParticipation: '参与率',
    segmentConversion: '转化率',
    segmentCheckin: '打卡率',
    segmentApiNote:
      '点击围场健康卡片可在此展开 CC 明细（需后端 /api/enclosure-health/segment-ccs?segment= 接口支持）',
    noData: '无数据',
    errorLoad: '数据加载失败',
    errorCheck: '请检查后端服务是否正常运行',
    emptyScores: '暂无围场健康数据',
    emptyScoresDesc: '上传围场数据后自动生成',
    emptyBenchmark: '暂无对标数据',
    emptyBenchmarkDesc: '上传围场数据后自动生成',
    emptyVariance: '暂无方差数据',
    emptyVarianceDesc: '上传围场数据后自动生成',
  },
  'zh-TW': {
    title: '圍場健康掃描儀',
    subtitle: '14段圍場 · 健康分 · 對標分析 · CC方差診斷',
    badgeHealthy: '健康',
    badgeWarning: '警告',
    badgeDanger: '危險',
    cardScores: '圍場健康分（14 段）',
    cardBenchmark: '圍場段對標分析（4 指標分組柱圖）',
    cardVariance: 'CC 方差診斷（各圍場段內 CC 分布）',
    collapseBtn: '收起',
    segmentCcList: 'CC 列表',
    segmentHealthScore: '健康分',
    segmentParticipation: '參與率',
    segmentConversion: '轉化率',
    segmentCheckin: '打卡率',
    segmentApiNote:
      '點擊圍場健康卡片可在此展開 CC 明細（需後端 /api/enclosure-health/segment-ccs?segment= 介面支援）',
    noData: '無資料',
    errorLoad: '資料載入失敗',
    errorCheck: '請檢查後端服務是否正常運行',
    emptyScores: '暫無圍場健康資料',
    emptyScoresDesc: '上傳圍場資料後自動生成',
    emptyBenchmark: '暫無對標資料',
    emptyBenchmarkDesc: '上傳圍場資料後自動生成',
    emptyVariance: '暫無方差資料',
    emptyVarianceDesc: '上傳圍場資料後自動生成',
  },
  en: {
    title: 'Enclosure Health Scanner',
    subtitle: '14-segment Enclosure · Health Score · Benchmark Analysis · CC Variance Diagnosis',
    badgeHealthy: 'Healthy',
    badgeWarning: 'Warning',
    badgeDanger: 'Danger',
    cardScores: 'Enclosure Health Score (14 Segments)',
    cardBenchmark: 'Enclosure Benchmark Analysis (4-Metric Grouped Chart)',
    cardVariance: 'CC Variance Diagnosis (CC Distribution within Each Enclosure)',
    collapseBtn: 'Collapse',
    segmentCcList: 'CC List',
    segmentHealthScore: 'Health Score',
    segmentParticipation: 'Participation Rate',
    segmentConversion: 'Conversion Rate',
    segmentCheckin: 'Check-in Rate',
    segmentApiNote:
      'Click an Enclosure health card to expand CC details (requires /api/enclosure-health/segment-ccs?segment= endpoint)',
    noData: 'No data',
    errorLoad: 'Load Failed',
    errorCheck: 'Please check if the backend service is running normally',
    emptyScores: 'No Enclosure Health Data',
    emptyScoresDesc: 'Upload Enclosure data to auto-generate',
    emptyBenchmark: 'No Benchmark Data',
    emptyBenchmarkDesc: 'Upload Enclosure data to auto-generate',
    emptyVariance: 'No Variance Data',
    emptyVarianceDesc: 'Upload Enclosure data to auto-generate',
  },
  th: {
    title: 'เครื่องสแกนสุขภาพ Enclosure',
    subtitle: '14 ระยะ · คะแนนสุขภาพ · การวิเคราะห์เปรียบเทียบ · การวินิจฉัยความแปรปรวน CC',
    badgeHealthy: 'สุขภาพดี',
    badgeWarning: 'คำเตือน',
    badgeDanger: 'อันตราย',
    cardScores: 'คะแนนสุขภาพ Enclosure (14 ระยะ)',
    cardBenchmark: 'การวิเคราะห์เปรียบเทียบ Enclosure (แผนภูมิ 4 ตัวชี้วัด)',
    cardVariance: 'การวินิจฉัยความแปรปรวน CC (การกระจาย CC ภายในแต่ละ Enclosure)',
    collapseBtn: 'ยุบ',
    segmentCcList: 'รายชื่อ CC',
    segmentHealthScore: 'คะแนนสุขภาพ',
    segmentParticipation: 'อัตราการมีส่วนร่วม',
    segmentConversion: 'อัตราการแปลง',
    segmentCheckin: 'อัตราเช็คอิน',
    segmentApiNote:
      'คลิกการ์ดสุขภาพ Enclosure เพื่อดูรายละเอียด CC (ต้องการ endpoint /api/enclosure-health/segment-ccs?segment=)',
    noData: 'ไม่มีข้อมูล',
    errorLoad: 'โหลดข้อมูลล้มเหลว',
    errorCheck: 'กรุณาตรวจสอบว่าบริการ backend ทำงานปกติ',
    emptyScores: 'ไม่มีข้อมูลสุขภาพ Enclosure',
    emptyScoresDesc: 'อัปโหลดข้อมูล Enclosure เพื่อสร้างอัตโนมัติ',
    emptyBenchmark: 'ไม่มีข้อมูลเปรียบเทียบ',
    emptyBenchmarkDesc: 'อัปโหลดข้อมูล Enclosure เพื่อสร้างอัตโนมัติ',
    emptyVariance: 'ไม่มีข้อมูลความแปรปรวน',
    emptyVarianceDesc: 'อัปโหลดข้อมูล Enclosure เพื่อสร้างอัตโนมัติ',
  },
};

export default function EnclosureHealthPage() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
  });

  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);

  const {
    data: scoresData,
    isLoading: loadingScores,
    error: scoresError,
  } = useFilteredSWR<EnclosureHealthScore[]>('/api/enclosure-health/scores');

  const {
    data: benchmarkData,
    isLoading: loadingBenchmark,
    error: benchmarkError,
  } = useFilteredSWR<EnclosureBenchmarkRow[]>('/api/enclosure-health/benchmark');

  const {
    data: varianceData,
    isLoading: loadingVariance,
    error: varianceError,
  } = useFilteredSWR<EnclosureVarianceRow[]>('/api/enclosure-health/variance');

  const scores = Array.isArray(scoresData) ? scoresData : [];
  const benchmarks = Array.isArray(benchmarkData) ? benchmarkData : [];
  const variances = Array.isArray(varianceData) ? varianceData : [];

  const greenCount = scores.filter((s) => s.level === 'green').length;
  const yellowCount = scores.filter((s) => s.level === 'yellow').length;
  const redCount = scores.filter((s) => s.level === 'red').length;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="page-title">{t.title}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{t.subtitle}</p>
      </div>

      {/* 顶部汇总 */}
      {scores.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-medium text-green-700 dark:text-green-400">{t.badgeHealthy}</span>
            <span className="font-bold text-green-700 dark:text-green-400">{greenCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="font-medium text-yellow-700 dark:text-yellow-400">
              {t.badgeWarning}
            </span>
            <span className="font-bold text-yellow-700 dark:text-yellow-400">{yellowCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="font-medium text-red-700 dark:text-red-400">{t.badgeDanger}</span>
            <span className="font-bold text-red-700 dark:text-red-400">{redCount}</span>
          </div>
        </div>
      )}

      {/* 健康分卡片 */}
      <Card title={t.cardScores}>
        {loadingScores ? (
          <div className="flex items-center justify-center h-32">
            <Spinner size="lg" />
          </div>
        ) : scoresError ? (
          <div className="text-center py-8">
            <p className="text-base font-semibold text-red-600">{t.errorLoad}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">{t.errorCheck}</p>
          </div>
        ) : !scores.length ? (
          <EmptyState title={t.emptyScores} description={t.emptyScoresDesc} />
        ) : (
          <HealthScoreCards
            data={scores}
            onSegmentClick={(seg) => setExpandedSegment(expandedSegment === seg ? null : seg)}
          />
        )}
      </Card>

      {/* 展开的围场段 CC 列表 */}
      {expandedSegment && (
        <Card
          title={`${expandedSegment} — ${t.segmentCcList}`}
          actions={
            <button
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              onClick={() => setExpandedSegment(null)}
            >
              {t.collapseBtn}
            </button>
          }
        >
          {(() => {
            const seg = scores.find((s) => s.segment === expandedSegment);
            if (!seg) return <div className="text-sm text-[var(--text-muted)]">{t.noData}</div>;
            return (
              <div className="text-sm text-[var(--text-secondary)]">
                <p>
                  {expandedSegment} {t.segmentHealthScore}{' '}
                  <strong>{(seg.health_score ?? 0).toFixed(0)}</strong>
                </p>
                <p className="text-xs mt-1 text-[var(--text-muted)]">
                  {t.segmentParticipation} {formatRate(seg.participation)} · {t.segmentConversion}{' '}
                  {formatRate(seg.conversion)} ·{t.segmentCheckin} {formatRate(seg.checkin)}
                </p>
                <p className="text-xs mt-2 text-[var(--text-muted)]">{t.segmentApiNote}</p>
              </div>
            );
          })()}
        </Card>
      )}

      {/* 围场间对标柱图 */}
      <Card title={t.cardBenchmark}>
        {loadingBenchmark ? (
          <div className="flex items-center justify-center h-48">
            <Spinner />
          </div>
        ) : benchmarkError ? (
          <div className="text-center py-8">
            <p className="text-base font-semibold text-red-600">{t.errorLoad}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">{t.errorCheck}</p>
          </div>
        ) : !benchmarks.length ? (
          <EmptyState title={t.emptyBenchmark} description={t.emptyBenchmarkDesc} />
        ) : (
          <SegmentBenchmark data={benchmarks} />
        )}
      </Card>

      {/* CC 方差箱线图 */}
      <Card title={t.cardVariance}>
        {loadingVariance ? (
          <div className="flex items-center justify-center h-32">
            <Spinner />
          </div>
        ) : varianceError ? (
          <div className="text-center py-8">
            <p className="text-base font-semibold text-red-600">{t.errorLoad}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">{t.errorCheck}</p>
          </div>
        ) : !variances.length ? (
          <EmptyState title={t.emptyVariance} description={t.emptyVarianceDesc} />
        ) : (
          <CCVarianceBox data={variances} />
        )}
      </Card>
    </div>
  );
}

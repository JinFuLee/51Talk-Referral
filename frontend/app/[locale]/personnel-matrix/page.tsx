'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CCHeatmap } from '@/components/cc-matrix/CCHeatmap';
import { CCRadarChart } from '@/components/cc-matrix/CCRadarChart';
import { EfficiencyScatter } from '@/components/cc-matrix/EfficiencyScatter';
import type { CCHeatmapResponse, CCRadarData, CCDrilldownRow } from '@/lib/types/cross-analysis';
import type { EnclosureSSMetrics, EnclosureLPMetrics } from '@/lib/types/enclosure-ss-lp';
import { formatRate, formatRevenue, metricColor, fmtEnc } from '@/lib/utils';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import { SegmentedTabs } from '@/components/ui/PageTabs';
import { BrandDot } from '@/components/ui/BrandDot';

/* ── i18n ──────────────────────────────────────────────────── */

const I18N = {
  zh: {
    tabCC: 'CC 前端',
    tabSS: 'SS 后端',
    tabLP: 'LP 服务',
    metricCoefficient: '带新系数',
    metricParticipation: '参与率',
    metricCheckin: '打卡率',
    metricReach: '触达率',
    colorDim: '着色维度',
    heatmapTitle: (label: string) => `CC × 围场段热力矩阵（${label}）`,
    loadFail: '数据加载失败',
    loadFailDesc: '请检查后端服务是否正常运行',
    noHeatmap: '暂无热力数据',
    noHeatmapDesc: '上传围场数据后自动生成',
    scatterTitle: '带新系数 × 付费金额 四象限',
    drilldownTitle: (cc: string, seg: string) => `${cc} · ${seg} 学员明细`,
    collapse: '收起',
    noStudents: '暂无学员数据',
    colStudentId: '学员 ID',
    colName: '姓名',
    colPaid: '付费金额',
    colRank: '排名',
    colGroup: '组别',
    colEnclosure: '围场段',
    ttEnclosure: '学员付费起算天数分段',
    colStudents: '学员数',
    ttStudents: '已付费且在有效期内的学员',
    colParticipation: '参与率',
    ttParticipation: '带来≥1注册的学员 / 有效学员',
    colCheckin: '打卡率',
    ttCheckin: '转码且分享的学员 / 有效学员',
    colReach: '触达率',
    ttReach: '有效通话(≥120s)学员 / 有效学员',
    colRegistrations: '注册数',
    colPayments: '付费数',
    colRevenue: '业绩(USD)',
    ssTitle: 'SS 个人战力排名（按注册数）',
    noSS: '暂无 SS 数据',
    lpTitle: 'LP 个人战力排名（按注册数）',
    noLP: '暂无 LP 数据',
    pageTitle: '人员战力图',
    pageDesc: 'CC / SS / LP 三岗个人战力 · 热力矩阵 · 围场分布',
    pageHint: 'CC 热力矩阵按围场段×个人展示带新系数；SS/LP 按注册数排名',
    exportSSFileName: (d: string) => `人员战力_SS_${d}`,
    exportLPFileName: (d: string) => `人员战力_LP_${d}`,
    exportCCFileName: (d: string) => `人员战力_CC_${d}`,
    csvEnclosure: '围场',
    csvStudents: '学员数',
    csvParticipation: '参与率',
    csvCheckin: '打卡率',
    csvReach: '触达率',
    csvRegistrations: '注册数',
    csvPayments: '付费数',
    csvRevenue: '业绩(USD)',
    csvSegment: '围场段',
    csvValue: '指标值',
  },
  'zh-TW': {
    tabCC: 'CC 前端',
    tabSS: 'SS 後端',
    tabLP: 'LP 服務',
    metricCoefficient: '帶新係數',
    metricParticipation: '參與率',
    metricCheckin: 'Check-in率',
    metricReach: '觸達率',
    colorDim: '著色維度',
    heatmapTitle: (label: string) => `CC × Enclosure熱力矩陣（${label}）`,
    loadFail: '資料載入失敗',
    loadFailDesc: '請檢查後端服務是否正常運行',
    noHeatmap: '暫無熱力資料',
    noHeatmapDesc: '上傳Enclosure資料後自動生成',
    scatterTitle: '帶新係數 × 付費金額 四象限',
    drilldownTitle: (cc: string, seg: string) => `${cc} · ${seg} 學員明細`,
    collapse: '收起',
    noStudents: '暫無學員資料',
    colStudentId: '學員 ID',
    colName: '姓名',
    colPaid: '付費金額',
    colRank: '排名',
    colGroup: '組別',
    colEnclosure: 'Enclosure段',
    ttEnclosure: '學員付費起算天數分段',
    colStudents: '學員數',
    ttStudents: '已付費且在有效期內的學員',
    colParticipation: '參與率',
    ttParticipation: '帶來≥1註冊的學員 / 有效學員',
    colCheckin: 'Check-in率',
    ttCheckin: '轉碼且分享的學員 / 有效學員',
    colReach: '觸達率',
    ttReach: '有效通話(≥120s)學員 / 有效學員',
    colRegistrations: '註冊數',
    colPayments: '付費數',
    colRevenue: '業績(USD)',
    ssTitle: 'SS 個人戰力排名（按註冊數）',
    noSS: '暫無 SS 資料',
    lpTitle: 'LP 個人戰力排名（按註冊數）',
    noLP: '暫無 LP 資料',
    pageTitle: '人員戰力圖',
    pageDesc: 'CC / SS / LP 三崗個人戰力 · 熱力矩陣 · Enclosure分佈',
    pageHint: 'CC 熱力矩陣按Enclosure段×個人展示帶新係數；SS/LP 按註冊數排名',
    exportSSFileName: (d: string) => `人員戰力_SS_${d}`,
    exportLPFileName: (d: string) => `人員戰力_LP_${d}`,
    exportCCFileName: (d: string) => `人員戰力_CC_${d}`,
    csvEnclosure: 'Enclosure',
    csvStudents: '學員數',
    csvParticipation: '參與率',
    csvCheckin: 'Check-in率',
    csvReach: '觸達率',
    csvRegistrations: '註冊數',
    csvPayments: '付費數',
    csvRevenue: '業績(USD)',
    csvSegment: 'Enclosure段',
    csvValue: '指標值',
  },
  en: {
    tabCC: 'CC Front',
    tabSS: 'SS Back',
    tabLP: 'LP Service',
    metricCoefficient: 'New Coeff.',
    metricParticipation: 'Participation',
    metricCheckin: 'Check-in',
    metricReach: 'Reach',
    colorDim: 'Color by',
    heatmapTitle: (label: string) => `CC × Enclosure Heatmap (${label})`,
    loadFail: 'Failed to load data',
    loadFailDesc: 'Please check if the backend service is running',
    noHeatmap: 'No heatmap data',
    noHeatmapDesc: 'Upload enclosure data to generate',
    scatterTitle: 'New Coeff. × Revenue Quadrant',
    drilldownTitle: (cc: string, seg: string) => `${cc} · ${seg} Student Detail`,
    collapse: 'Collapse',
    noStudents: 'No student data',
    colStudentId: 'Student ID',
    colName: 'Name',
    colPaid: 'Revenue',
    colRank: 'Rank',
    colGroup: 'Group',
    colEnclosure: 'Enclosure',
    ttEnclosure: 'Days since student paid',
    colStudents: 'Students',
    ttStudents: 'Paid students in active period',
    colParticipation: 'Participation',
    ttParticipation: 'Students with ≥1 referral / active students',
    colCheckin: 'Check-in',
    ttCheckin: 'Students who shared / active students',
    colReach: 'Reach',
    ttReach: 'Students with ≥120s call / active students',
    colRegistrations: 'Registrations',
    colPayments: 'Payments',
    colRevenue: 'Revenue(USD)',
    ssTitle: 'SS Individual Ranking (by Registrations)',
    noSS: 'No SS data',
    lpTitle: 'LP Individual Ranking (by Registrations)',
    noLP: 'No LP data',
    pageTitle: 'Personnel Matrix',
    pageDesc: 'CC / SS / LP individual performance · Heatmap · Enclosure distribution',
    pageHint: 'CC heatmap shows new-coeff by enclosure×person; SS/LP ranked by registrations',
    exportSSFileName: (d: string) => `PersonnelMatrix_SS_${d}`,
    exportLPFileName: (d: string) => `PersonnelMatrix_LP_${d}`,
    exportCCFileName: (d: string) => `PersonnelMatrix_CC_${d}`,
    csvEnclosure: 'Enclosure',
    csvStudents: 'Students',
    csvParticipation: 'Participation',
    csvCheckin: 'Check-in',
    csvReach: 'Reach',
    csvRegistrations: 'Registrations',
    csvPayments: 'Payments',
    csvRevenue: 'Revenue(USD)',
    csvSegment: 'Enclosure Seg.',
    csvValue: 'Value',
  },
  th: {
    tabCC: 'CC ฝ่ายหน้า',
    tabSS: 'SS ฝ่ายหลัง',
    tabLP: 'LP บริการ',
    metricCoefficient: 'สัมประสิทธิ์แนะนำ',
    metricParticipation: 'อัตราการมีส่วนร่วม',
    metricCheckin: 'อัตราเช็คอิน',
    metricReach: 'อัตราการเข้าถึง',
    colorDim: 'สีตาม',
    heatmapTitle: (label: string) => `Heatmap CC × ระยะเวลา (${label})`,
    loadFail: 'โหลดข้อมูลไม่สำเร็จ',
    loadFailDesc: 'กรุณาตรวจสอบว่าบริการ backend ทำงานอยู่',
    noHeatmap: 'ไม่มีข้อมูล heatmap',
    noHeatmapDesc: 'อัปโหลดข้อมูลระยะเวลาเพื่อสร้าง',
    scatterTitle: 'สัมประสิทธิ์ × รายได้ สี่จตุภาค',
    drilldownTitle: (cc: string, seg: string) => `${cc} · ${seg} รายละเอียดนักเรียน`,
    collapse: 'ย่อ',
    noStudents: 'ไม่มีข้อมูลนักเรียน',
    colStudentId: 'รหัสนักเรียน',
    colName: 'ชื่อ',
    colPaid: 'รายได้',
    colRank: 'อันดับ',
    colGroup: 'กลุ่ม',
    colEnclosure: 'ระยะเวลา',
    ttEnclosure: 'จำนวนวันนับจากวันที่นักเรียนชำระเงิน',
    colStudents: 'นักเรียน',
    ttStudents: 'นักเรียนที่ชำระเงินในช่วงที่มีผล',
    colParticipation: 'มีส่วนร่วม',
    ttParticipation: 'นักเรียนที่แนะนำ ≥1 คน / นักเรียนที่มีผล',
    colCheckin: 'เช็คอิน',
    ttCheckin: 'นักเรียนที่แชร์ / นักเรียนที่มีผล',
    colReach: 'การเข้าถึง',
    ttReach: 'นักเรียนที่โทร ≥120s / นักเรียนที่มีผล',
    colRegistrations: 'ลงทะเบียน',
    colPayments: 'ชำระเงิน',
    colRevenue: 'รายได้(USD)',
    ssTitle: 'อันดับ SS รายบุคคล (ตามการลงทะเบียน)',
    noSS: 'ไม่มีข้อมูล SS',
    lpTitle: 'อันดับ LP รายบุคคล (ตามการลงทะเบียน)',
    noLP: 'ไม่มีข้อมูล LP',
    pageTitle: 'ตารางประสิทธิภาพบุคลากร',
    pageDesc: 'ประสิทธิภาพรายบุคคล CC / SS / LP · Heatmap · การกระจายระยะเวลา',
    pageHint: 'CC heatmap แสดงสัมประสิทธิ์แนะนำตามระยะเวลา×บุคคล; SS/LP จัดอันดับตามการลงทะเบียน',
    exportSSFileName: (d: string) => `PersonnelMatrix_SS_${d}`,
    exportLPFileName: (d: string) => `PersonnelMatrix_LP_${d}`,
    exportCCFileName: (d: string) => `PersonnelMatrix_CC_${d}`,
    csvEnclosure: 'ระยะเวลา',
    csvStudents: 'นักเรียน',
    csvParticipation: 'มีส่วนร่วม',
    csvCheckin: 'เช็คอิน',
    csvReach: 'การเข้าถึง',
    csvRegistrations: 'ลงทะเบียน',
    csvPayments: 'ชำระเงิน',
    csvRevenue: 'รายได้(USD)',
    csvSegment: 'ระยะเวลา',
    csvValue: 'ค่า',
  },
};

/* ── 常量 ──────────────────────────────────────────────────── */

type TabKey = 'cc' | 'ss' | 'lp';

function useTabs() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  return [
    { key: 'cc' as TabKey, label: t.tabCC },
    { key: 'ss' as TabKey, label: t.tabSS },
    { key: 'lp' as TabKey, label: t.tabLP },
  ];
}

function useMetricOptions() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  return [
    { value: 'coefficient', label: t.metricCoefficient },
    { value: 'participation', label: t.metricParticipation },
    { value: 'checkin', label: t.metricCheckin },
    { value: 'reach', label: t.metricReach },
  ];
}

/* ── 工具函数 ───────────────────────────────────────────────── */

// metricColor 已移至 lib/utils.ts 共享

function safe(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined) return '—';
  return decimals > 0 ? v.toFixed(decimals) : v.toLocaleString();
}

function safeRate(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return formatRate(v);
}

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1
      ? 'bg-yellow-100 text-yellow-700'
      : rank === 2
        ? 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
        : rank === 3
          ? 'bg-orange-50 text-orange-600'
          : 'text-[var(--text-muted)]';
  return (
    <span
      className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${cls}`}
    >
      {rank}
    </span>
  );
}

/* ── Tab Bar ──────────────────────────────────────────────── */

function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const tabs = useTabs();
  return <SegmentedTabs tabs={tabs} active={active} onChange={onChange} />;
}

/* ── CC Tab：热力矩阵 + 雷达图 + 下钻 ──────────────────────── */

function CCTabContent() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const metricOptions = useMetricOptions();
  const [metric, setMetric] = useState('coefficient');
  const [selectedCC, setSelectedCC] = useState<string | null>(null);
  const [drilldownCC, setDrilldownCC] = useState<string | null>(null);
  const [drilldownSeg, setDrilldownSeg] = useState<string | null>(null);

  const {
    data: heatmapData,
    isLoading: loadingHeatmap,
    error: heatmapError,
  } = useSWR<CCHeatmapResponse>(`/api/cc-matrix/heatmap?metric=${metric}`, swrFetcher);
  const { data: radarData, isLoading: loadingRadar } = useSWR<CCRadarData>(
    selectedCC ? `/api/cc-matrix/radar/${encodeURIComponent(selectedCC)}` : null,
    swrFetcher
  );
  const { data: drilldownData, isLoading: loadingDrilldown } = useSWR<CCDrilldownRow[]>(
    drilldownCC && drilldownSeg
      ? `/api/cc-matrix/drilldown?cc_name=${encodeURIComponent(drilldownCC)}&segment=${encodeURIComponent(drilldownSeg)}`
      : null,
    swrFetcher
  );

  const scatterPoints =
    heatmapData?.rows?.map((cc) => {
      const coeffCell = heatmapData.data.find((d) => d.cc_name === cc && d.segment === '全段');
      return { cc_name: cc, x: coeffCell?.value ?? 0, y: 0 };
    }) ?? [];

  return (
    <div className="space-y-5 md:space-y-6">
      {/* 着色维度切换 */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--text-muted)]">{t.colorDim}</span>
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {metricOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 热力矩阵 */}
      <Card title={t.heatmapTitle(metricOptions.find((o) => o.value === metric)?.label ?? '')}>
        {loadingHeatmap ? (
          <div className="flex items-center justify-center h-32">
            <Spinner size="lg" />
          </div>
        ) : heatmapError ? (
          <div className="text-center py-8">
            <p className="text-base font-semibold text-red-600">{t.loadFail}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">{t.loadFailDesc}</p>
          </div>
        ) : !heatmapData?.rows?.length ? (
          <EmptyState title={t.noHeatmap} description={t.noHeatmapDesc} />
        ) : (
          <CCHeatmap
            rows={heatmapData.rows}
            cols={heatmapData.cols}
            data={heatmapData.data}
            onCCClick={(cc) => setSelectedCC(cc)}
            onCellClick={(cc, seg) => {
              setDrilldownCC(cc);
              setDrilldownSeg(seg);
            }}
          />
        )}
      </Card>

      {/* 效率散点图 */}
      <Card title={t.scatterTitle}>
        <EfficiencyScatter data={scatterPoints} />
      </Card>

      {/* CC 雷达图弹层 */}
      {selectedCC && (
        <>
          {loadingRadar ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <Spinner size="lg" />
            </div>
          ) : radarData ? (
            <CCRadarChart data={radarData} onClose={() => setSelectedCC(null)} />
          ) : null}
        </>
      )}

      {/* 下钻学员列表 */}
      {drilldownCC && drilldownSeg && (
        <Card
          title={t.drilldownTitle(drilldownCC, drilldownSeg)}
          actions={
            <button
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              onClick={() => {
                setDrilldownCC(null);
                setDrilldownSeg(null);
              }}
            >
              {t.collapse}
            </button>
          }
        >
          {loadingDrilldown ? (
            <div className="flex items-center justify-center h-24">
              <Spinner />
            </div>
          ) : !drilldownData?.length ? (
            <EmptyState title={t.noStudents} description="" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="slide-thead-row">
                    <th className="slide-th slide-th-left py-1.5 px-2">{t.colStudentId}</th>
                    <th className="slide-th slide-th-left py-1.5 px-2">{t.colName}</th>
                    <th className="slide-th slide-th-right py-1.5 px-2">{t.colPaid}</th>
                  </tr>
                </thead>
                <tbody>
                  {drilldownData.map((row, i) => (
                    <tr
                      key={`${row.stdt_id}-${i}`}
                      className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                    >
                      <td className="slide-td py-1 px-2 font-mono">{row.stdt_id}</td>
                      <td className="slide-td py-1 px-2">{row.name}</td>
                      <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                        {formatRevenue(row.paid_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/* ── SS Tab：个人热力数据 ─────────────────────────────────── */

function SSTabContent() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const {
    data: ssData,
    isLoading,
    error,
    mutate,
  } = useSWR<EnclosureSSMetrics[]>('/api/enclosure-ss', swrFetcher);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        title={t.loadFail}
        description={t.loadFailDesc}
        action={{ label: '重试', onClick: () => mutate() }}
      />
    );
  }

  const rows = ssData ?? [];
  const sorted = [...rows]
    .filter((r) => r.ss_name)
    .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));

  return (
    <Card title={t.ssTitle}>
      {sorted.length === 0 ? (
        <EmptyState title={t.noSS} description={t.noHeatmapDesc} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left py-2 px-2">{t.colRank}</th>
                <th className="slide-th slide-th-left py-2 px-2">{t.colName}</th>
                <th className="slide-th slide-th-left py-2 px-2">{t.colGroup}</th>
                <th className="slide-th slide-th-left py-2 px-2">
                  {t.colEnclosure} <BrandDot tooltip={t.ttEnclosure} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t.colStudents} <BrandDot tooltip={t.ttStudents} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t.colParticipation} <BrandDot tooltip={t.ttParticipation} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t.colCheckin} <BrandDot tooltip={t.ttCheckin} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t.colReach} <BrandDot tooltip={t.ttReach} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">{t.colRegistrations}</th>
                <th className="slide-th slide-th-right py-2 px-2">{t.colPayments}</th>
                <th className="slide-th slide-th-right py-2 px-2">{t.colRevenue}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={`${r.ss_name}-${r.enclosure}-${i}`}
                  className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                >
                  <td className="slide-td py-1.5 px-2">
                    <RankBadge rank={i + 1} />
                  </td>
                  <td className="slide-td py-1.5 px-2 font-medium">{r.ss_name ?? '—'}</td>
                  <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                    {r.ss_group ?? '—'}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                    {fmtEnc(r.enclosure)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {safe(r.students)}
                  </td>
                  <td
                    className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.participation_rate, [0.1, 0.2])}`}
                  >
                    {safeRate(r.participation_rate)}
                  </td>
                  <td
                    className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.checkin_rate, [0.3, 0.5])}`}
                  >
                    {safeRate(r.checkin_rate)}
                  </td>
                  <td
                    className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.ss_reach_rate, [0.3, 0.5])}`}
                  >
                    {safeRate(r.ss_reach_rate)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {safe(r.registrations)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {safe(r.payments)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {r.revenue_usd != null ? `$${r.revenue_usd.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ── LP Tab：个人热力数据 ─────────────────────────────────── */

function LPTabContent() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const {
    data: lpData,
    isLoading,
    error,
    mutate,
  } = useSWR<EnclosureLPMetrics[]>('/api/enclosure-lp', swrFetcher);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        title={t.loadFail}
        description={t.loadFailDesc}
        action={{ label: '重试', onClick: () => mutate() }}
      />
    );
  }

  const rows = lpData ?? [];
  const sorted = [...rows]
    .filter((r) => r.lp_name)
    .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));

  return (
    <Card title={t.lpTitle}>
      {sorted.length === 0 ? (
        <EmptyState title={t.noLP} description={t.noHeatmapDesc} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left py-2 px-2">{t.colRank}</th>
                <th className="slide-th slide-th-left py-2 px-2">{t.colName}</th>
                <th className="slide-th slide-th-left py-2 px-2">{t.colGroup}</th>
                <th className="slide-th slide-th-left py-2 px-2">
                  {t.colEnclosure} <BrandDot tooltip={t.ttEnclosure} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t.colStudents} <BrandDot tooltip={t.ttStudents} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t.colParticipation} <BrandDot tooltip={t.ttParticipation} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t.colCheckin} <BrandDot tooltip={t.ttCheckin} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">
                  {t.colReach} <BrandDot tooltip={t.ttReach} />
                </th>
                <th className="slide-th slide-th-right py-2 px-2">{t.colRegistrations}</th>
                <th className="slide-th slide-th-right py-2 px-2">{t.colPayments}</th>
                <th className="slide-th slide-th-right py-2 px-2">{t.colRevenue}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={`${r.lp_name}-${r.enclosure}-${i}`}
                  className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                >
                  <td className="slide-td py-1.5 px-2">
                    <RankBadge rank={i + 1} />
                  </td>
                  <td className="slide-td py-1.5 px-2 font-medium">{r.lp_name ?? '—'}</td>
                  <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                    {r.lp_group ?? '—'}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                    {fmtEnc(r.enclosure)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {safe(r.students)}
                  </td>
                  <td
                    className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.participation_rate, [0.1, 0.2])}`}
                  >
                    {safeRate(r.participation_rate)}
                  </td>
                  <td
                    className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.checkin_rate, [0.3, 0.5])}`}
                  >
                    {safeRate(r.checkin_rate)}
                  </td>
                  <td
                    className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.lp_reach_rate, [0.3, 0.5])}`}
                  >
                    {safeRate(r.lp_reach_rate)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {safe(r.registrations)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {safe(r.payments)}
                  </td>
                  <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                    {r.revenue_usd != null ? `$${r.revenue_usd.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ── 主页面内部 ──────────────────────────────────────────── */

function PersonnelMatrixPageInner() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'cc') as TabKey;
  const { exportCSV } = useExport();

  const { data: ssExport } = useSWR<EnclosureSSMetrics[]>('/api/enclosure-ss', swrFetcher);
  const { data: lpExport } = useSWR<EnclosureLPMetrics[]>('/api/enclosure-lp', swrFetcher);
  const { data: ccExport } = useSWR<CCHeatmapResponse>(
    '/api/cc-matrix/heatmap?metric=coefficient',
    swrFetcher
  );

  function handleTabChange(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/personnel-matrix?${params.toString()}`);
  }

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    if (activeTab === 'ss') {
      const rows = (ssExport ?? [])
        .filter((r) => r.ss_name)
        .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));
      exportCSV(
        rows as unknown as Record<string, unknown>[],
        [
          { key: 'ss_name', label: 'SS' },
          { key: 'enclosure', label: t.csvEnclosure },
          { key: 'students', label: t.csvStudents },
          { key: 'participation_rate', label: t.csvParticipation },
          { key: 'checkin_rate', label: t.csvCheckin },
          { key: 'registrations', label: t.csvRegistrations },
          { key: 'payments', label: t.csvPayments },
          { key: 'revenue_usd', label: t.csvRevenue },
        ],
        t.exportSSFileName(today)
      );
    } else if (activeTab === 'lp') {
      const rows = (lpExport ?? [])
        .filter((r) => r.lp_name)
        .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));
      exportCSV(
        rows as unknown as Record<string, unknown>[],
        [
          { key: 'lp_name', label: 'LP' },
          { key: 'enclosure', label: t.csvEnclosure },
          { key: 'students', label: t.csvStudents },
          { key: 'participation_rate', label: t.csvParticipation },
          { key: 'checkin_rate', label: t.csvCheckin },
          { key: 'lp_reach_rate', label: t.csvReach },
          { key: 'registrations', label: t.csvRegistrations },
          { key: 'payments', label: t.csvPayments },
          { key: 'revenue_usd', label: t.csvRevenue },
        ],
        t.exportLPFileName(today)
      );
    } else {
      const rows = ccExport?.data ?? [];
      exportCSV(
        rows as unknown as Record<string, unknown>[],
        [
          { key: 'cc_name', label: 'CC' },
          { key: 'segment', label: t.csvSegment },
          { key: 'value', label: t.csvValue },
        ],
        t.exportCCFileName(today)
      );
    }
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="page-title">{t.pageTitle}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t.pageDesc}</p>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{t.pageHint}</p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      <TabBar active={activeTab} onChange={handleTabChange} />

      {activeTab === 'cc' && <CCTabContent />}
      {activeTab === 'ss' && <SSTabContent />}
      {activeTab === 'lp' && <LPTabContent />}
    </div>
  );
}

/* ── 导出 ─────────────────────────────────────────────────── */

export default function PersonnelMatrixPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      }
    >
      <PersonnelMatrixPageInner />
    </Suspense>
  );
}

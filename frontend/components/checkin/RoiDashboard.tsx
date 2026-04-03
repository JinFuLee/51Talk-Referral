'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatUSD } from '@/lib/utils';
import type { RoiAnalysisResponse, RiskLevel } from '@/lib/types/checkin-roi';
import { RISK_LEVEL_CONFIG, RISK_PIE_COLORS, getRiskLabel } from '@/lib/types/checkin-roi';

// ── 内联 I18N ────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    loadFailed: 'ROI 数据加载失败',
    loadFailedDesc: '请检查后端服务是否正常运行',
    noData: '暂无 ROI 数据',
    noDataDesc: '当前围场过滤下无活动参与学员，请调整筛选条件',
    totalStudents: '参与学员数',
    totalStudentsSub: '有活动参与或有收入的学员',
    totalCost: '总活动成本',
    totalCostSub: '次卡成本（按 $1.31/张）',
    totalRevenue: '总转介绍收入',
    totalRevenueSub: 'D3 带新付费金额',
    overallRoi: '整体 ROI',
    overallRoiSub: '(收入−成本)/成本',
    riskDistTitle: '风险分层分布',
    noLayerData: '暂无分层数据',
    channelTitle: '渠道成本 vs 收入对比',
    noChannelData: '暂无渠道数据',
    countUnit: (n: number) => `${n.toLocaleString()} 人`,
    riskLegendTitle: '风险等级说明',
    countPct: (count: number, pct: number) => `${count} 人（${(pct * 100).toFixed(1)}%）`,
    legendCost: '成本',
    legendRevenue: '收入',
  },
  'zh-TW': {
    loadFailed: 'ROI 資料載入失敗',
    loadFailedDesc: '請檢查後端服務是否正常執行',
    noData: '暫無 ROI 資料',
    noDataDesc: '目前圍場篩選下無活動參與學員，請調整篩選條件',
    totalStudents: '參與學員數',
    totalStudentsSub: '有活動參與或有收入的學員',
    totalCost: '總活動成本',
    totalCostSub: '次卡成本（按 $1.31/張）',
    totalRevenue: '總轉介紹收入',
    totalRevenueSub: 'D3 帶新付費金額',
    overallRoi: '整體 ROI',
    overallRoiSub: '(收入−成本)/成本',
    riskDistTitle: '風險分層分佈',
    noLayerData: '暫無分層資料',
    channelTitle: '渠道成本 vs 收入對比',
    noChannelData: '暫無渠道資料',
    countUnit: (n: number) => `${n.toLocaleString()} 人`,
    riskLegendTitle: '風險等級說明',
    countPct: (count: number, pct: number) => `${count} 人（${(pct * 100).toFixed(1)}%）`,
    legendCost: '成本',
    legendRevenue: '收入',
  },
  en: {
    loadFailed: 'Failed to Load ROI Data',
    loadFailedDesc: 'Please check whether the backend service is running.',
    noData: 'No ROI Data',
    noDataDesc: 'No active students under the current enclosure filter. Adjust filters.',
    totalStudents: 'Participating Students',
    totalStudentsSub: 'Students with activity or revenue',
    totalCost: 'Total Activity Cost',
    totalCostSub: 'Lesson card cost ($1.31 each)',
    totalRevenue: 'Total Referral Revenue',
    totalRevenueSub: 'D3 paid amount from new referrals',
    overallRoi: 'Overall ROI',
    overallRoiSub: '(Revenue − Cost) / Cost',
    riskDistTitle: 'Risk Tier Distribution',
    noLayerData: 'No tier data',
    channelTitle: 'Channel Cost vs Revenue',
    noChannelData: 'No channel data',
    countUnit: (n: number) => `${n.toLocaleString()} students`,
    riskLegendTitle: 'Risk Level Legend',
    countPct: (count: number, pct: number) => `${count} (${(pct * 100).toFixed(1)}%)`,
    legendCost: 'Cost',
    legendRevenue: 'Revenue',
  },
  th: {
    loadFailed: 'โหลดข้อมูล ROI ล้มเหลว',
    loadFailedDesc: 'กรุณาตรวจสอบว่าบริการแบ็คเอนด์ทำงานอยู่',
    noData: 'ไม่มีข้อมูล ROI',
    noDataDesc: 'ไม่มีนักเรียนที่มีส่วนร่วมภายใต้ตัวกรองคอกปัจจุบัน กรุณาปรับตัวกรอง',
    totalStudents: 'นักเรียนที่เข้าร่วม',
    totalStudentsSub: 'นักเรียนที่มีกิจกรรมหรือมีรายได้',
    totalCost: 'ต้นทุนกิจกรรมรวม',
    totalCostSub: 'ต้นทุนบัตรเรียน ($1.31/ใบ)',
    totalRevenue: 'รายได้แนะนำรวม',
    totalRevenueSub: 'ยอดชำระจากผู้แนะนำใหม่ D3',
    overallRoi: 'ROI รวม',
    overallRoiSub: '(รายได้ − ต้นทุน) / ต้นทุน',
    riskDistTitle: 'การกระจายตัวตามระดับความเสี่ยง',
    noLayerData: 'ไม่มีข้อมูลระดับ',
    channelTitle: 'ต้นทุน vs รายได้ตามช่องทาง',
    noChannelData: 'ไม่มีข้อมูลช่องทาง',
    countUnit: (n: number) => `${n.toLocaleString()} คน`,
    riskLegendTitle: 'คำอธิบายระดับความเสี่ยง',
    countPct: (count: number, pct: number) => `${count} คน (${(pct * 100).toFixed(1)}%)`,
    legendCost: 'ต้นทุน',
    legendRevenue: 'รายได้',
  },
} as const;

type Locale = keyof typeof I18N;
function useT() {
  const locale = useLocale();
  return I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];
}

interface Props {
  enclosureFilter?: string | null;
}

// 汇总数字卡片
function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="card-base p-4">
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-xl font-semibold" style={color ? { color } : undefined}>
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</p>}
    </div>
  );
}

export function RoiDashboard({ enclosureFilter }: Props) {
  const t = useT();
  const locale = useLocale();
  const params = new URLSearchParams();
  if (enclosureFilter) params.set('enclosure', enclosureFilter);

  const { data, isLoading, error } = useFilteredSWR<RoiAnalysisResponse>(
    `/api/checkin/roi-analysis${params.toString() ? '?' + params.toString() : ''}`
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title={t.loadFailed} description={t.loadFailedDesc} />;
  }

  if (!data || data.summary.total_students === 0) {
    return <EmptyState title={t.noData} description={t.noDataDesc} />;
  }

  const { summary, channel_roi } = data;

  // 饼图数据（name 用当前 locale 翻译，Recharts Legend 自动取 name）
  const pieData = (
    Object.entries(summary.risk_distribution) as [RiskLevel, { count: number; pct: number }][]
  )
    .filter(([, v]) => v.count > 0)
    .map(([key, v]) => ({
      name: getRiskLabel(key, locale),
      value: v.count,
      pct: v.pct,
      color: RISK_PIE_COLORS[key],
    }));

  // 渠道条形图数据（用 locale 无关 key: cost / revenue）
  const barData = Object.entries(channel_roi).map(([ch, v]) => ({
    channel: ch,
    cost: Math.round(v.cost_usd),
    revenue: Math.round(v.revenue_approx_usd),
    roi: v.roi,
  }));

  // ROI 颜色判断
  const roiColor =
    summary.overall_roi == null
      ? 'var(--text-muted)'
      : summary.overall_roi >= 200
        ? '#16a34a'
        : summary.overall_roi >= 0
          ? '#ca8a04'
          : '#dc2626';

  return (
    <div className="space-y-5">
      {/* 汇总卡片行 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label={t.totalStudents}
          value={summary.total_students.toLocaleString()}
          sub={t.totalStudentsSub}
        />
        <SummaryCard
          label={t.totalCost}
          value={formatUSD(summary.total_cost_usd)}
          sub={t.totalCostSub}
        />
        <SummaryCard
          label={t.totalRevenue}
          value={formatUSD(summary.total_revenue_usd)}
          sub={t.totalRevenueSub}
        />
        <SummaryCard
          label={t.overallRoi}
          value={summary.overall_roi != null ? `${summary.overall_roi.toFixed(1)}%` : '—'}
          sub={t.overallRoiSub}
          color={roiColor}
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 风险分层饼图 */}
        <div className="card-base p-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">{t.riskDistTitle}</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, pct }) => `${name} ${(pct * 100).toFixed(1)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [t.countUnit(value), name]} />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title={t.noLayerData} />
          )}
        </div>

        {/* 渠道 ROI 条形图 */}
        <div className="card-base p-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">{t.channelTitle}</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cost" name={t.legendCost} fill="#e05545" radius={[3, 3, 0, 0]} />
                <Bar
                  dataKey="revenue"
                  name={t.legendRevenue}
                  fill="#2d9f6f"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title={t.noChannelData} />
          )}

          {/* 渠道 ROI 数字快览 */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {barData.map((b) => (
              <div key={b.channel} className="text-center">
                <p className="text-xs text-[var(--text-muted)]">
                  {/* CHANNEL_LABELS 映射，未命中回退原文 */}
                  {b.channel === '宽口'
                    ? ((
                        { zh: '宽口', 'zh-TW': '寬口', en: 'Wide', th: 'กว้าง' } as Record<
                          string,
                          string
                        >
                      )[locale] ?? b.channel)
                    : b.channel}
                </p>
                <p
                  className="text-sm font-semibold"
                  style={{
                    color:
                      b.roi == null
                        ? 'var(--text-muted)'
                        : b.roi >= 200
                          ? '#16a34a'
                          : b.roi >= 0
                            ? '#ca8a04'
                            : '#dc2626',
                  }}
                >
                  {b.roi != null ? `${b.roi.toFixed(0)}%` : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 风险等级说明 */}
      <div className="card-base p-4">
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">{t.riskLegendTitle}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(
            Object.entries(RISK_LEVEL_CONFIG) as [
              RiskLevel,
              (typeof RISK_LEVEL_CONFIG)[RiskLevel],
            ][]
          ).map(([key, cfg]) => {
            const dist = summary.risk_distribution[key];
            return (
              <div
                key={key}
                className="flex items-start gap-2 p-2 rounded-lg"
                style={{ backgroundColor: cfg.bgColor }}
              >
                <span className="text-sm">{cfg.emoji}</span>
                <div>
                  <p className="text-xs font-medium" style={{ color: cfg.color }}>
                    {getRiskLabel(key, locale)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {t.countPct(dist?.count ?? 0, dist?.pct ?? 0)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

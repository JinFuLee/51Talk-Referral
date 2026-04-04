'use client';

// ── 学员洞察 Tab ───────────────────────────────────────────────────────────────
// 从 SummaryTab 移出的学员全景内容 + 从 RankingTab 移出的学员排行
// 包含：频次分布 / 课耗×打卡四象限 / 转化漏斗 / CC触达 / 续费关联 / 学员排行榜

import { useLocale } from 'next-intl';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatMiniCard } from '@/components/ui/StatMiniCard';
import { StudentFrequencyChart } from '@/components/checkin/StudentFrequencyChart';
import { LessonCheckinCross } from '@/components/checkin/LessonCheckinCross';
import { ConversionFunnelProof } from '@/components/checkin/ConversionFunnelProof';
import { ContactCheckinChart } from '@/components/checkin/ContactCheckinChart';
import { RenewalCheckinChart } from '@/components/checkin/RenewalCheckinChart';
import { StudentRankingPanel } from '@/components/checkin/StudentRankingPanel';
import { EnclosureParticipationChart } from '@/components/checkin/EnclosureParticipationChart';
import { useStudentAnalysis } from '@/lib/hooks/useStudentAnalysis';
import { formatRate } from '@/lib/utils';

// ── 内联 I18N ────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    loadFailed: '数据加载失败',
    loadFailedDesc: '无法获取学员分析数据，请检查后端服务',
    noData: '暂无学员数据',
    noDataDesc: '上传包含打卡记录的数据文件后自动刷新',
    monthlyKpi: '月度对比核心指标',
    participationRate: '本月参与率',
    lastMonthPrefix: '上月',
    avgCheckinDays: '人均打卡天数',
    lastMonthDays: (v: string) => `上月 ${v} 天`,
    zeroCheckin: '零打卡学员',
    lastMonthPeople: (n: string) => `上月 ${n} 人`,
    superfan: '满勤学员（≥6次）',
    participationSubtitle: '至少打卡 1 次的学员 / 有效学员总数',
    avgDaysSubtitle: '本月所有有效学员的平均打卡次数',
    zeroSubtitle: '本月一次都未打卡的有效学员数',
    superfanSubtitle: '本月打卡次数达到 6 次（满勤）的学员数',
    freqQuadrant: '频次分布 · 课耗×打卡四象限',
    freqLabel: '打卡频次分布（0–6 次）',
    quadrantLabel: '课耗×打卡四象限',
    enclosureRate: '围场打卡参与率',
    enclosureDesc: '各围场（M0→M12+）打卡参与率对比 · 颜色：绿≥50% · 橙30-50% · 红<30%',
    conversionFunnel: '打卡频次×推荐转化漏斗',
    conversionDesc: '不同打卡频段学员的推荐注册率与付费率对比 · 验证打卡→推荐的正相关关系',
    contactRenewal: 'CC 触达效果 · 续费关联',
    contactLabel: 'CC 触达频率×打卡参与率',
    renewalLabel: '打卡频段×续费关联',
    studentRanking: '学员排行榜',
  },
  'zh-TW': {
    loadFailed: '資料載入失敗',
    loadFailedDesc: '無法取得學員分析資料，請檢查後端服務',
    noData: '暫無學員資料',
    noDataDesc: '上傳包含打卡記錄的資料檔案後自動重新整理',
    monthlyKpi: '月度對比核心指標',
    participationRate: '本月參與率',
    lastMonthPrefix: '上月',
    avgCheckinDays: '人均打卡天數',
    lastMonthDays: (v: string) => `上月 ${v} 天`,
    zeroCheckin: '零打卡學員',
    lastMonthPeople: (n: string) => `上月 ${n} 人`,
    superfan: '滿勤學員（≥6次）',
    participationSubtitle: '至少打卡 1 次的學員 / 有效學員總數',
    avgDaysSubtitle: '本月所有有效學員的平均打卡次數',
    zeroSubtitle: '本月一次都未打卡的有效學員數',
    superfanSubtitle: '本月打卡次數達到 6 次（滿勤）的學員數',
    freqQuadrant: '頻次分佈 · 課耗×打卡四象限',
    freqLabel: '打卡頻次分佈（0–6 次）',
    quadrantLabel: '課耗×打卡四象限',
    enclosureRate: '圍場打卡參與率',
    enclosureDesc: '各圍場（M0→M12+）打卡參與率對比 · 顏色：綠≥50% · 橙30-50% · 紅<30%',
    conversionFunnel: '打卡頻次×推薦轉化漏斗',
    conversionDesc: '不同打卡頻段學員的推薦注冊率與付費率對比 · 驗證打卡→推薦的正相關關係',
    contactRenewal: 'CC 觸達效果 · 續費關聯',
    contactLabel: 'CC 觸達頻率×打卡參與率',
    renewalLabel: '打卡頻段×續費關聯',
    studentRanking: '學員排行榜',
  },
  en: {
    loadFailed: 'Failed to Load',
    loadFailedDesc: 'Unable to fetch student analysis data. Please check the backend service.',
    noData: 'No Student Data',
    noDataDesc: 'Data will refresh automatically after uploading check-in records.',
    monthlyKpi: 'Monthly Comparison KPIs',
    participationRate: 'Participation Rate',
    lastMonthPrefix: 'Last month',
    avgCheckinDays: 'Avg Check-in Days',
    lastMonthDays: (v: string) => `Last month ${v} days`,
    zeroCheckin: 'Zero Check-in',
    lastMonthPeople: (n: string) => `Last month ${n}`,
    superfan: 'Super Fans (≥6×)',
    participationSubtitle: 'Students with ≥1 check-in / total valid students',
    avgDaysSubtitle: 'Average check-in count for all valid students this month',
    zeroSubtitle: 'Valid students with zero check-ins this month',
    superfanSubtitle: 'Students with ≥6 check-ins (full attendance) this month',
    freqQuadrant: 'Frequency Distribution · Lesson Consumption × Check-in Quadrant',
    freqLabel: 'Check-in Frequency Distribution (0–6×)',
    quadrantLabel: 'Lesson Consumption × Check-in Quadrant',
    enclosureRate: 'Enclosure Check-in Participation',
    enclosureDesc:
      'Check-in participation by enclosure (M0→M12+) · Green ≥50% · Orange 30-50% · Red <30%',
    conversionFunnel: 'Check-in Frequency × Referral Conversion Funnel',
    conversionDesc:
      'Referral registration & payment rates by check-in frequency · Validates check-in → referral correlation',
    contactRenewal: 'CC Contact Effectiveness · Renewal Correlation',
    contactLabel: 'CC Contact Frequency × Check-in Participation',
    renewalLabel: 'Check-in Frequency × Renewal Correlation',
    studentRanking: 'Student Ranking',
  },
  th: {
    loadFailed: 'โหลดข้อมูลล้มเหลว',
    loadFailedDesc: 'ไม่สามารถดึงข้อมูลนักเรียน กรุณาตรวจสอบบริการแบ็คเอนด์',
    noData: 'ไม่มีข้อมูลนักเรียน',
    noDataDesc: 'ข้อมูลจะรีเฟรชอัตโนมัติหลังจากอัปโหลดไฟล์ข้อมูลเช็คอิน',
    monthlyKpi: 'KPI เปรียบเทียบรายเดือน',
    participationRate: 'อัตราการมีส่วนร่วมเดือนนี้',
    lastMonthPrefix: 'เดือนที่แล้ว',
    avgCheckinDays: 'วันเช็คอินเฉลี่ย/คน',
    lastMonthDays: (v: string) => `เดือนที่แล้ว ${v} วัน`,
    zeroCheckin: 'ไม่เช็คอิน',
    lastMonthPeople: (n: string) => `เดือนที่แล้ว ${n} คน`,
    superfan: 'เช็คอินครบ (≥6 ครั้ง)',
    participationSubtitle: 'นักเรียนที่เช็คอิน ≥1 ครั้ง / นักเรียนที่ใช้งานทั้งหมด',
    avgDaysSubtitle: 'จำนวนเช็คอินเฉลี่ยของนักเรียนที่ใช้งานทั้งหมดในเดือนนี้',
    zeroSubtitle: 'นักเรียนที่ใช้งานแต่ไม่ได้เช็คอินเลยในเดือนนี้',
    superfanSubtitle: 'นักเรียนที่เช็คอิน ≥6 ครั้ง (ครบสมบูรณ์) ในเดือนนี้',
    freqQuadrant: 'การกระจายความถี่ · ควอแดรนท์การใช้คอร์ส×เช็คอิน',
    freqLabel: 'การกระจายความถี่เช็คอิน (0–6 ครั้ง)',
    quadrantLabel: 'ควอแดรนท์การใช้คอร์ส×เช็คอิน',
    enclosureRate: 'อัตราการมีส่วนร่วมตามคอก',
    enclosureDesc: 'อัตราการมีส่วนร่วมเช็คอินตามคอก (M0→M12+) · เขียว ≥50% · ส้ม 30-50% · แดง <30%',
    conversionFunnel: 'ความถี่เช็คอิน × ช่องทางการแนะนำ',
    conversionDesc:
      'อัตราการลงทะเบียนและชำระเงินตามความถี่เช็คอิน · ยืนยันความสัมพันธ์เช็คอิน → แนะนำ',
    contactRenewal: 'ประสิทธิภาพการติดต่อ CC · ความสัมพันธ์การต่ออายุ',
    contactLabel: 'ความถี่การติดต่อ CC × อัตราการมีส่วนร่วมเช็คอิน',
    renewalLabel: 'ความถี่เช็คอิน × ความสัมพันธ์การต่ออายุ',
    studentRanking: 'อันดับนักเรียน',
  },
} as const;

type Locale = keyof typeof I18N;

interface StudentInsightsTabProps {
  enclosureFilter: string | null;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

export function StudentInsightsTab({ enclosureFilter }: StudentInsightsTabProps) {
  const locale = useLocale();
  const t = I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];
  const { data, isLoading, error } = useStudentAnalysis(
    enclosureFilter ? { enclosure: enclosureFilter } : undefined
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title={t.loadFailed} description={t.loadFailedDesc} />;
  }

  if (!data) {
    return <EmptyState title={t.noData} description={t.noDataDesc} />;
  }

  const mc = data.month_comparison;

  const participationTrend: 'up' | 'down' | 'flat' =
    mc.participation_rate_this > mc.participation_rate_last
      ? 'up'
      : mc.participation_rate_this < mc.participation_rate_last
        ? 'down'
        : 'flat';

  const avgDaysTrend: 'up' | 'down' | 'flat' =
    mc.avg_days_this > mc.avg_days_last
      ? 'up'
      : mc.avg_days_this < mc.avg_days_last
        ? 'down'
        : 'flat';

  return (
    <div className="space-y-8">
      {/* 区块 1：月度核心 KPI */}
      <div>
        <SectionTitle>{t.monthlyKpi}</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatMiniCard
            label={t.participationRate}
            value={formatRate(mc.participation_rate_this)}
            sub={`${t.lastMonthPrefix} ${formatRate(mc.participation_rate_last)}`}
            accent={
              participationTrend === 'up'
                ? 'green'
                : participationTrend === 'down'
                  ? 'red'
                  : 'slate'
            }
            subtitle={t.participationSubtitle}
          />
          <StatMiniCard
            label={t.avgCheckinDays}
            value={(mc.avg_days_this ?? 0).toFixed(2)}
            sub={t.lastMonthDays((mc.avg_days_last ?? 0).toFixed(2))}
            accent={avgDaysTrend === 'up' ? 'green' : avgDaysTrend === 'down' ? 'red' : 'slate'}
            subtitle={t.avgDaysSubtitle}
          />
          <StatMiniCard
            label={t.zeroCheckin}
            value={(mc.zero_this ?? 0).toLocaleString()}
            sub={t.lastMonthPeople((mc.zero_last ?? 0).toLocaleString())}
            accent={(mc.zero_this ?? 0) > (mc.zero_last ?? 0) ? 'red' : 'green'}
            subtitle={t.zeroSubtitle}
          />
          <StatMiniCard
            label={t.superfan}
            value={(mc.superfan_this ?? 0).toLocaleString()}
            sub={t.lastMonthPeople((mc.superfan_last ?? 0).toLocaleString())}
            accent={(mc.superfan_this ?? 0) >= (mc.superfan_last ?? 0) ? 'green' : 'red'}
            subtitle={t.superfanSubtitle}
          />
        </div>
      </div>

      {/* 区块 2：频次分布 + 课耗×打卡四象限 */}
      <div>
        <SectionTitle>{t.freqQuadrant}</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-base p-5">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">{t.freqLabel}</p>
            <StudentFrequencyChart data={data.frequency_distribution} />
          </div>
          <div className="card-base p-5">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">
              {t.quadrantLabel}
            </p>
            <LessonCheckinCross data={data.lesson_checkin_cross} />
          </div>
        </div>
      </div>

      {/* 区块 3：围场参与率 */}
      <div>
        <SectionTitle>{t.enclosureRate}</SectionTitle>
        <div className="card-base p-5">
          <p className="text-xs text-[var(--text-muted)] mb-3">{t.enclosureDesc}</p>
          <EnclosureParticipationChart data={data.by_enclosure} />
        </div>
      </div>

      {/* 区块 4：转化漏斗证明 */}
      <div>
        <SectionTitle>{t.conversionFunnel}</SectionTitle>
        <div className="card-base p-5">
          <p className="text-xs text-[var(--text-muted)] mb-3">{t.conversionDesc}</p>
          <ConversionFunnelProof data={data.conversion_funnel} />
        </div>
      </div>

      {/* 区块 5：CC触达效果 + 续费关联 */}
      <div>
        <SectionTitle>{t.contactRenewal}</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-base p-5">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">
              {t.contactLabel}
            </p>
            <ContactCheckinChart data={data.contact_checkin_response} />
          </div>
          <div className="card-base p-5">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">
              {t.renewalLabel}
            </p>
            <RenewalCheckinChart data={data.renewal_checkin_correlation} />
          </div>
        </div>
      </div>

      {/* 区块 6：学员排行榜 */}
      <div>
        <SectionTitle>{t.studentRanking}</SectionTitle>
        <StudentRankingPanel enclosureFilter={enclosureFilter} />
      </div>
    </div>
  );
}

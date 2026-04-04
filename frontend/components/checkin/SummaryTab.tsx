'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { useStudentAnalysis } from '@/lib/hooks/useStudentAnalysis';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { useCheckinThresholds } from '@/lib/hooks/useCheckinThresholds';
import { useConfigStore } from '@/lib/stores/config-store';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatMiniCard } from '@/components/ui/StatMiniCard';
import { EnclosureParticipationChart } from '@/components/checkin/EnclosureParticipationChart';
import { cn, formatRate, fmtEnc } from '@/lib/utils';

// ── 内联 I18N ────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    currentRole: '当前角色',
    personCount: (n: number | string) => `/ ${n} 人`,
    checkedStudentsDesc: '已打卡学员数 / 本渠道有效学员数（付费且在有效期）',
    colorHint: '颜色：绿≥50% · 橙30-50% · 红<30%（可在设置调整）',
    teamHeader: '团队',
    studentHeader: '学员',
    checkinRateHeader: '打卡率',
    noTeamData: '暂无团队数据',
    enclosureHeader: '围场',
    noEnclosureData: '暂无围场数据',
    zeroDataHint: '当前围场配置中此角色无负责围场，请在设置页调整围场-角色分配',
    loadFailed: '数据加载失败',
    loadFailedDesc: '无法获取打卡汇总数据，请检查后端服务',
    retry: '重试',
    noData: '暂无打卡数据',
    noDataDesc: '上传包含打卡记录的数据文件后自动刷新',
    monthlyKpi: '月度核心指标',
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
    enclosureCheckinRate: '围场打卡参与率',
    enclosureChartDesc: '各围场（M0→M12+）打卡参与率对比 · 颜色：绿≥50% · 橙30-50% · 红<30%',
  },
  'zh-TW': {
    currentRole: '當前角色',
    personCount: (n: number | string) => `/ ${n} 人`,
    checkedStudentsDesc: '已打卡學員數 / 本渠道有效學員數（付費且在有效期）',
    colorHint: '顏色：綠≥50% · 橙30-50% · 紅<30%（可在設定調整）',
    teamHeader: '團隊',
    studentHeader: '學員',
    checkinRateHeader: '打卡率',
    noTeamData: '暫無團隊資料',
    enclosureHeader: '圍場',
    noEnclosureData: '暫無圍場資料',
    zeroDataHint: '目前圍場設定中此角色無負責圍場，請在設定頁調整圍場-角色分配',
    loadFailed: '資料載入失敗',
    loadFailedDesc: '無法取得打卡彙總資料，請檢查後端服務',
    retry: '重試',
    noData: '暫無打卡資料',
    noDataDesc: '上傳包含打卡記錄的資料檔案後自動重新整理',
    monthlyKpi: '月度核心指標',
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
    enclosureCheckinRate: '圍場打卡參與率',
    enclosureChartDesc: '各圍場（M0→M12+）打卡參與率對比 · 顏色：綠≥50% · 橙30-50% · 紅<30%',
  },
  en: {
    currentRole: 'Current Role',
    personCount: (n: number | string) => `/ ${n} students`,
    checkedStudentsDesc: 'Checked-in students / Valid students in this channel (paid & active)',
    colorHint: 'Color: Green ≥50% · Orange 30-50% · Red <30% (adjustable in Settings)',
    teamHeader: 'Team',
    studentHeader: 'Students',
    checkinRateHeader: 'Check-in Rate',
    noTeamData: 'No team data',
    enclosureHeader: 'Enclosure',
    noEnclosureData: 'No enclosure data',
    zeroDataHint:
      'No enclosures assigned to this role in current config. Adjust role-enclosure mapping in Settings.',
    loadFailed: 'Failed to Load',
    loadFailedDesc: 'Unable to fetch check-in summary. Please check the backend service.',
    retry: 'Retry',
    noData: 'No Check-in Data',
    noDataDesc: 'Data will refresh automatically after uploading check-in records.',
    monthlyKpi: 'Monthly KPIs',
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
    enclosureCheckinRate: 'Enclosure Check-in Participation',
    enclosureChartDesc:
      'Check-in participation by enclosure (M0→M12+) · Green ≥50% · Orange 30-50% · Red <30%',
  },
  th: {
    currentRole: 'บทบาทปัจจุบัน',
    personCount: (n: number | string) => `/ ${n} คน`,
    checkedStudentsDesc:
      'นักเรียนที่เช็คอิน / นักเรียนที่ใช้งานในช่องนี้ (ชำระแล้วและอยู่ในช่วงใช้งาน)',
    colorHint: 'สี: เขียว ≥50% · ส้ม 30-50% · แดง <30% (ปรับได้ในการตั้งค่า)',
    teamHeader: 'ทีม',
    studentHeader: 'นักเรียน',
    checkinRateHeader: 'อัตราเช็คอิน',
    noTeamData: 'ไม่มีข้อมูลทีม',
    enclosureHeader: 'คอก',
    noEnclosureData: 'ไม่มีข้อมูลคอก',
    zeroDataHint:
      'ไม่มีคอกที่กำหนดให้บทบาทนี้ในการตั้งค่าปัจจุบัน กรุณาปรับการกำหนดบทบาท-คอกในหน้าตั้งค่า',
    loadFailed: 'โหลดข้อมูลล้มเหลว',
    loadFailedDesc: 'ไม่สามารถดึงข้อมูลสรุปเช็คอิน กรุณาตรวจสอบบริการแบ็คเอนด์',
    retry: 'ลองใหม่',
    noData: 'ไม่มีข้อมูลเช็คอิน',
    noDataDesc: 'ข้อมูลจะรีเฟรชอัตโนมัติหลังจากอัปโหลดไฟล์ข้อมูลเช็คอิน',
    monthlyKpi: 'KPI ประจำเดือน',
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
    enclosureCheckinRate: 'อัตราการมีส่วนร่วมตามคอก',
    enclosureChartDesc:
      'อัตราการมีส่วนร่วมเช็คอินตามคอก (M0→M12+) · เขียว ≥50% · ส้ม 30-50% · แดง <30%',
  },
} as const;

type Locale = keyof typeof I18N;

// ── 类型定义 ──────────────────────────────────────────────────────────────────

interface CheckinTeamRow {
  team: string;
  students: number;
  checked_in: number;
  rate: number;
}

interface CheckinEnclosureRow {
  enclosure: string;
  students: number;
  checked_in: number;
  rate: number;
}

interface CheckinRoleSummary {
  total_students: number;
  checked_in: number;
  checkin_rate: number;
  by_team: CheckinTeamRow[];
  by_enclosure: CheckinEnclosureRow[];
}

interface CheckinSummaryResponse {
  by_role: Record<string, CheckinRoleSummary>;
}

interface CheckinChannelSummary {
  channel: string;
  total_students: number;
  total_checkin: number;
  checkin_rate: number;
  by_team: CheckinTeamRow[];
  by_enclosure: CheckinEnclosureRow[];
}

// ── 单个渠道列 ────────────────────────────────────────────────────────────────

interface ChannelColumnProps {
  ch: CheckinChannelSummary;
  rateColor: (rate: number) => string;
  rateBg: (rate: number) => string;
  isSelected?: boolean;
  t: (typeof I18N)[Locale];
}

function ChannelColumn({ ch, rateColor, rateBg, isSelected, t }: ChannelColumnProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 min-w-0',
        isSelected ? 'ring-2 ring-[var(--color-action,#1B365D)] rounded-lg' : ''
      )}
    >
      {/* 渠道标题 */}
      <div className="bg-[var(--n-800,#1e293b)] text-white text-xs font-semibold px-2 py-1.5 rounded-t-md">
        {ch.channel}
        {isSelected && <span className="ml-1.5 opacity-70 text-[10px]">▶ {t.currentRole}</span>}
      </div>

      {/* 零数据提示 */}
      {ch.total_students === 0 && ch.channel !== 'CC' && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5 text-xs text-amber-700">
          {t.zeroDataHint}
        </div>
      )}

      {/* 总体大数字 */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md px-3 py-2.5 space-y-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-[var(--text-primary)]">{ch.total_checkin}</span>
          <span className="text-xs text-[var(--text-muted)]">
            {t.personCount(ch.total_students)}
          </span>
        </div>
        <div
          className={cn(
            'inline-block text-sm font-semibold px-1.5 py-0.5 rounded',
            rateBg(ch.checkin_rate ?? 0)
          )}
        >
          {formatRate(ch.checkin_rate ?? 0)}
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">{t.checkedStudentsDesc}</div>
        <div className="text-[10px] text-[var(--text-muted)] opacity-75">{t.colorHint}</div>
      </div>

      {/* 按团队 */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md overflow-hidden">
        <div className="bg-[var(--n-800,#1e293b)] text-white text-[10px] font-semibold px-2 py-1 grid grid-cols-4 gap-1">
          <span className="col-span-2">{t.teamHeader}</span>
          <span className="text-right">{t.studentHeader}</span>
          <span className="text-right">{t.checkinRateHeader}</span>
        </div>
        {(ch.by_team ?? []).length === 0 ? (
          <div className="text-[10px] text-[var(--text-muted)] px-2 py-2">{t.noTeamData}</div>
        ) : (
          (ch.by_team ?? []).map((row, i) => (
            <div
              key={row.team}
              className={cn(
                'grid grid-cols-4 gap-1 px-2 py-1 text-xs',
                i % 2 === 0 ? 'bg-[var(--bg-subtle)]' : 'bg-[var(--bg-surface)]'
              )}
            >
              <span className="col-span-2 truncate text-[var(--text-secondary)]" title={row.team}>
                {row.team}
              </span>
              <span className="text-right text-[var(--text-primary)]">{row.students}</span>
              <span className={cn('text-right font-medium', rateColor?.(row.rate) ?? '')}>
                {formatRate(row.rate)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 按围场 */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md overflow-hidden">
        <div className="bg-[var(--n-800,#1e293b)] text-white text-[10px] font-semibold px-2 py-1 grid grid-cols-4 gap-1">
          <span className="col-span-2">{t.enclosureHeader}</span>
          <span className="text-right">{t.studentHeader}</span>
          <span className="text-right">{t.checkinRateHeader}</span>
        </div>
        {(ch.by_enclosure ?? []).length === 0 ? (
          <div className="text-[10px] text-[var(--text-muted)] px-2 py-2">{t.noEnclosureData}</div>
        ) : (
          (ch.by_enclosure ?? []).map((row, i) => (
            <div
              key={row.enclosure}
              className={cn(
                'grid grid-cols-4 gap-1 px-2 py-1 text-xs',
                i % 2 === 0 ? 'bg-[var(--bg-subtle)]' : 'bg-[var(--bg-surface)]'
              )}
            >
              <span className="col-span-2 text-[var(--text-secondary)]">
                {fmtEnc(row.enclosure)}
              </span>
              <span className="text-right text-[var(--text-primary)]">{row.students}</span>
              <span className={cn('text-right font-medium', rateColor?.(row.rate) ?? '')}>
                {formatRate(row.rate)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── 主组件：SummaryTab（概览）─────────────────────────────────────────────────

interface SummaryTabProps {
  enclosureFilter?: string | null;
  roleFilter?: string;
}

export default function SummaryTab({ enclosureFilter, roleFilter }: SummaryTabProps) {
  const locale = useLocale();
  const t = I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];
  const { configJson } = useWideConfig();
  const { rateColor, rateBg } = useCheckinThresholds();
  const dataRole = useConfigStore((s) => s.dataRole);

  const summaryUrl = `/api/checkin/summary?role_config=${encodeURIComponent(configJson)}${
    enclosureFilter ? `&enclosure=${encodeURIComponent(enclosureFilter)}` : ''
  }`;
  const { data, isLoading, error, mutate } = useFilteredSWR<CheckinSummaryResponse>(summaryUrl);

  // KPI 卡片数据（来自学员分析）
  const { data: studentData } = useStudentAnalysis(
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
    return (
      <EmptyState
        title={t.loadFailed}
        description={t.loadFailedDesc}
        action={{ label: t.retry, onClick: () => mutate() }}
      />
    );
  }

  const byRole = data?.by_role ?? {};

  // dataRole 映射：全部 → CC+SS+LP，单选 → 只显示对应角色面板
  const _ROLE_MAP: Record<string, string[]> = {
    all: ['CC', 'SS', 'LP'],
    cc: ['CC'],
    ss: ['SS'],
    lp: ['LP'],
    ops: ['运营'],
  };
  const visibleRoles = _ROLE_MAP[dataRole] ?? _ROLE_MAP.all;

  const channels: CheckinChannelSummary[] = visibleRoles
    .filter((role) => role !== '运营') // 运营有专属视图，不在此 grid 展示
    .map((role) => {
      const v = byRole[role];
      return {
        channel: role,
        total_students: v?.total_students ?? 0,
        total_checkin: v?.checked_in ?? 0,
        checkin_rate: v?.checkin_rate ?? 0,
        by_team: v?.by_team ?? [],
        by_enclosure: v?.by_enclosure ?? [],
      };
    });

  if (channels.length === 0) {
    return <EmptyState title={t.noData} description={t.noDataDesc} />;
  }

  const mc = studentData?.month_comparison;

  return (
    <div className="space-y-8">
      {/* 角色汇总 grid（选中角色高亮 ring） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {channels.map((ch) => (
          <ChannelColumn
            key={ch.channel}
            ch={ch}
            rateColor={rateColor}
            rateBg={rateBg}
            isSelected={dataRole !== 'all' || ch.channel === (roleFilter || 'CC')}
            t={t}
          />
        ))}
      </div>

      {/* 分隔线 */}
      <div className="h-px bg-[var(--border-default)]" />

      {/* KPI 卡片行（来自 student-analysis） */}
      {mc && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            {t.monthlyKpi}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatMiniCard
              label={t.participationRate}
              value={
                mc.participation_rate_this != null
                  ? `${(mc.participation_rate_this * 100).toFixed(1)}%`
                  : '—'
              }
              sub={
                mc.participation_rate_last != null
                  ? `${t.lastMonthPrefix} ${(mc.participation_rate_last * 100).toFixed(1)}%`
                  : `${t.lastMonthPrefix} —`
              }
              accent={
                mc.participation_rate_this > mc.participation_rate_last
                  ? 'green'
                  : mc.participation_rate_this < mc.participation_rate_last
                    ? 'red'
                    : 'slate'
              }
              subtitle={t.participationSubtitle}
            />
            <StatMiniCard
              label={t.avgCheckinDays}
              value={(mc.avg_days_this ?? 0).toFixed(2)}
              sub={t.lastMonthDays((mc.avg_days_last ?? 0).toFixed(2))}
              accent={
                (mc.avg_days_this ?? 0) > (mc.avg_days_last ?? 0)
                  ? 'green'
                  : (mc.avg_days_this ?? 0) < (mc.avg_days_last ?? 0)
                    ? 'red'
                    : 'slate'
              }
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
              accent={mc.superfan_this >= mc.superfan_last ? 'green' : 'red'}
              subtitle={t.superfanSubtitle}
            />
          </div>
        </div>
      )}

      {/* 围场参与率柱图 */}
      {studentData?.by_enclosure && studentData.by_enclosure.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            {t.enclosureCheckinRate}
          </h3>
          <div className="card-base p-5">
            <p className="text-xs text-[var(--text-muted)] mb-3">{t.enclosureChartDesc}</p>
            <EnclosureParticipationChart data={studentData.by_enclosure} />
          </div>
        </div>
      )}
    </div>
  );
}

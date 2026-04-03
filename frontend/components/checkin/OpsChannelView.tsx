'use client';

import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatRate } from '@/lib/utils';
import { useState } from 'react';
import { OpsStudentRanking } from './OpsStudentRanking';
import { useLocale } from 'next-intl';

// ── I18N ────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    priorityHigh: '高优先',
    priorityMedium: '中优先',
    priorityLow: '低优先',
    costHigh: '高成本',
    costMedium: '中成本',
    costLow: '低成本',
    costLowest: '极低成本',
    recommendedCount: '推荐触达人数',
    estimatedContactRate: '预估触达率',
    costLevel: '成本级别',
    enclosureSegDist: '围场子段分布',
    totalStudents: '总学员数',
    checkedIn: '已打卡',
    tabChannel: '渠道触达',
    tabStudentRanking: '学员排行',
    loadError: '数据加载失败',
    loadErrorDesc: '无法获取运营渠道数据，请检查后端服务',
    retry: '重试',
    emptyTitle: 'M6~M12+ 围场暂无学员数据',
    emptyDesc: '上传包含 M6+ 围场的过程数据（D3）后自动刷新',
    noChannelTitle: '暂无渠道配置',
    noChannelDesc: '后端尚未返回渠道触达数据',
    m6TotalStudents: 'M6~M12+ 总学员',
    checkinRate: '打卡率',
    enclosureSegLabel: '围场子段',
  },
  'zh-TW': {
    priorityHigh: '高優先',
    priorityMedium: '中優先',
    priorityLow: '低優先',
    costHigh: '高成本',
    costMedium: '中成本',
    costLow: '低成本',
    costLowest: '極低成本',
    recommendedCount: '推薦觸達人數',
    estimatedContactRate: '預估觸達率',
    costLevel: '成本級別',
    enclosureSegDist: '圍場子段分佈',
    totalStudents: '總學員數',
    checkedIn: '已打卡',
    tabChannel: '渠道觸達',
    tabStudentRanking: '學員排行',
    loadError: '資料載入失敗',
    loadErrorDesc: '無法取得運營渠道資料，請檢查後端服務',
    retry: '重試',
    emptyTitle: 'M6~M12+ 圍場暫無學員資料',
    emptyDesc: '上傳包含 M6+ 圍場的過程資料（D3）後自動刷新',
    noChannelTitle: '暫無渠道設定',
    noChannelDesc: '後端尚未回傳渠道觸達資料',
    m6TotalStudents: 'M6~M12+ 總學員',
    checkinRate: '打卡率',
    enclosureSegLabel: '圍場子段',
  },
  en: {
    priorityHigh: 'High Priority',
    priorityMedium: 'Medium Priority',
    priorityLow: 'Low Priority',
    costHigh: 'High Cost',
    costMedium: 'Medium Cost',
    costLow: 'Low Cost',
    costLowest: 'Minimal Cost',
    recommendedCount: 'Recommended Contacts',
    estimatedContactRate: 'Est. Contact Rate',
    costLevel: 'Cost Level',
    enclosureSegDist: 'Enclosure Segment Distribution',
    totalStudents: 'Total Students',
    checkedIn: 'Checked In',
    tabChannel: 'Channel Outreach',
    tabStudentRanking: 'Student Ranking',
    loadError: 'Failed to Load Data',
    loadErrorDesc: 'Unable to fetch ops channel data, please check backend service',
    retry: 'Retry',
    emptyTitle: 'No M6~M12+ Enclosure Data',
    emptyDesc: 'Upload process data (D3) containing M6+ enclosures to refresh automatically',
    noChannelTitle: 'No Channel Config',
    noChannelDesc: 'Backend has not returned channel outreach data yet',
    m6TotalStudents: 'M6~M12+ Students',
    checkinRate: 'Check-in Rate',
    enclosureSegLabel: 'Enclosure Segment',
  },
  th: {
    priorityHigh: 'ลำดับความสำคัญสูง',
    priorityMedium: 'ลำดับความสำคัญปานกลาง',
    priorityLow: 'ลำดับความสำคัญต่ำ',
    costHigh: 'ต้นทุนสูง',
    costMedium: 'ต้นทุนปานกลาง',
    costLow: 'ต้นทุนต่ำ',
    costLowest: 'ต้นทุนต่ำมาก',
    recommendedCount: 'จำนวนที่แนะนำให้ติดต่อ',
    estimatedContactRate: 'อัตราการติดต่อโดยประมาณ',
    costLevel: 'ระดับต้นทุน',
    enclosureSegDist: 'การกระจายส่วน Enclosure',
    totalStudents: 'นักเรียนทั้งหมด',
    checkedIn: 'เช็คอินแล้ว',
    tabChannel: 'การติดต่อผ่านช่องทาง',
    tabStudentRanking: 'อันดับนักเรียน',
    loadError: 'โหลดข้อมูลล้มเหลว',
    loadErrorDesc: 'ไม่สามารถดึงข้อมูลช่องทาง ops กรุณาตรวจสอบบริการ backend',
    retry: 'ลองใหม่',
    emptyTitle: 'ไม่มีข้อมูล Enclosure M6~M12+',
    emptyDesc: 'อัปโหลดข้อมูลกระบวนการ (D3) ที่มี M6+ enclosure เพื่อรีเฟรชอัตโนมัติ',
    noChannelTitle: 'ไม่มีการตั้งค่าช่องทาง',
    noChannelDesc: 'Backend ยังไม่ได้ส่งข้อมูลการติดต่อผ่านช่องทาง',
    m6TotalStudents: 'นักเรียน M6~M12+',
    checkinRate: 'อัตราเช็คอิน',
    enclosureSegLabel: 'ส่วน Enclosure',
  },
} as const;

type OpsLocale = keyof typeof I18N;

function useT() {
  const locale = useLocale();
  return I18N[(locale as OpsLocale) in I18N ? (locale as OpsLocale) : 'zh'];
}

// ── 类型定义 ──────────────────────────────────────────────────────────────────

interface OpsChannel {
  channel_id: string;
  channel_name: string;
  priority: 'high' | 'medium' | 'low';
  cost_level: 'high' | 'medium' | 'low' | 'lowest';
  description: string;
  target_criteria: string;
  estimated_contact_rate: number;
  recommended_count: number;
}

interface EnclosureSegment {
  segment: string;
  label: string;
  students: number;
  checked_in: number;
  rate: number;
}

interface OpsRoleSummary {
  total_students: number;
  checked_in: number;
  checkin_rate: number;
  channels: OpsChannel[];
  by_enclosure_segment: EnclosureSegment[];
  by_group: [];
  by_person: [];
}

interface RankingResponse {
  by_role: Record<string, OpsRoleSummary>;
}

// ── 工具函数 ──────────────────────────────────────────────────────────────────

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

// ── 优先级标签 ────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border border-red-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  low: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
};

// PRIORITY_LABELS and COST_LABELS are now derived from I18N inside components

const COST_STYLES: Record<string, string> = {
  high: 'text-[var(--color-danger)]',
  medium: 'text-amber-800',
  low: 'text-emerald-800',
  lowest: 'text-emerald-900',
};

// ── 渠道卡片 ─────────────────────────────────────────────────────────────────

function ChannelCard({ channel }: { channel: OpsChannel }) {
  const t = useT();
  const ratePercent = Math.min(100, Math.round((channel.estimated_contact_rate ?? 0) * 100));

  const priorityLabels: Record<string, string> = {
    high: t.priorityHigh,
    medium: t.priorityMedium,
    low: t.priorityLow,
  };
  const costLabels: Record<string, string> = {
    high: t.costHigh,
    medium: t.costMedium,
    low: t.costLow,
    lowest: t.costLowest,
  };

  return (
    <div className="card-compact overflow-hidden flex flex-col !p-0">
      {/* 卡片头部 */}
      <div className="bg-[var(--n-800,#1e293b)] text-white px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-sm font-bold truncate">{channel.channel_name}</span>
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap',
            PRIORITY_STYLES[channel.priority] ?? PRIORITY_STYLES.low
          )}
        >
          {priorityLabels[channel.priority] ?? channel.priority}
        </span>
      </div>

      {/* 卡片内容 */}
      <div className="p-3 flex flex-col gap-3 flex-1">
        {/* 推荐触达人数 */}
        <div className="text-center">
          <div className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">
            {fmtNum(channel.recommended_count)}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">{t.recommendedCount}</div>
        </div>

        {/* 目标条件 */}
        <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-subtle)] rounded px-2 py-1.5 leading-relaxed">
          {channel.target_criteria}
        </div>

        {/* 预估触达率 */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">{t.estimatedContactRate}</span>
            <span className="font-semibold tabular-nums text-[var(--text-primary)]">
              {formatRate(channel.estimated_contact_rate)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
            <div
              className="h-full rounded-full bg-action-accent transition-all"
              style={{ width: `${ratePercent}%` }}
            />
          </div>
        </div>

        {/* 成本级别 */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-muted)]">{t.costLevel}</span>
          <span
            className={cn(
              'font-semibold',
              COST_STYLES[channel.cost_level] ?? 'text-[var(--text-secondary)]'
            )}
          >
            {costLabels[channel.cost_level] ?? channel.cost_level}
          </span>
        </div>

        {/* 渠道描述 */}
        <div className="text-xs text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-default)] pt-2">
          {channel.description}
        </div>
      </div>
    </div>
  );
}

// ── 围场子段条形图 ──────────────────────────────────────────────────────────────

function EnclosureSegmentBar({ segments }: { segments: EnclosureSegment[] }) {
  const t = useT();
  const maxStudents = Math.max(...segments.map((s) => s.students), 1);

  return (
    <div className="card-compact overflow-hidden !p-0">
      <div className="bg-[var(--n-800,#1e293b)] text-white px-3 py-2">
        <span className="text-sm font-bold">{t.enclosureSegDist}</span>
      </div>
      <div className="p-3 space-y-3">
        {segments.map((seg) => {
          const barWidth = Math.round((seg.students / maxStudents) * 100);
          const ratePercent = Math.min(100, Math.round((seg.rate ?? 0) * 100));
          return (
            <div key={seg.segment}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-[var(--text-primary)]">{seg.label}</span>
                <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                  {fmtNum(seg.checked_in)}/{fmtNum(seg.students)}{' '}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatRate(seg.rate)}
                  </span>
                </span>
              </div>
              {/* 学员数量条 */}
              <div className="h-4 rounded bg-[var(--bg-subtle)] overflow-hidden relative">
                <div
                  className="h-full rounded bg-action-accent-subtle transition-all"
                  style={{ width: `${barWidth}%` }}
                />
                {/* 打卡率覆盖层 */}
                <div
                  className="absolute top-0 left-0 h-full rounded bg-action-accent opacity-70 transition-all"
                  style={{ width: `${Math.round((barWidth * ratePercent) / 100)}%` }}
                />
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] pt-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-action-accent-subtle" />
            {t.totalStudents}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-action-accent opacity-70" />
            {t.checkedIn}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

// ── 子 Tab 配置 ───────────────────────────────────────────────────────────────

const SUB_TAB_IDS = ['channel', 'student_ranking'] as const;

type SubTabId = (typeof SUB_TAB_IDS)[number];

interface OpsChannelViewProps {
  configJson: string;
}

export function OpsChannelView({ configJson }: OpsChannelViewProps) {
  const [subTab, setSubTab] = useState<SubTabId>('channel');

  const { data, isLoading, error, mutate } = useFilteredSWR<RankingResponse>(
    `/api/checkin/ranking?role_config=${encodeURIComponent(configJson)}`,
    { refreshInterval: 30_000 }
  );

  const opsData = data?.by_role?.['运营'];

  // 加载态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-sm text-[var(--text-muted)]">
        <Spinner size="lg" />
      </div>
    );
  }

  // 错误态
  if (error) {
    return (
      <EmptyState
        title="数据加载失败"
        description="无法获取运营渠道数据，请检查后端服务"
        action={{ label: '重试', onClick: () => mutate() }}
      />
    );
  }

  // 子 Tab 切换条（独立渲染，不受加载/空态影响）
  const SubTabBar = (
    <div className="flex gap-1 border-b border-[var(--border-default)] mb-4">
      {SUB_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setSubTab(tab.id)}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px',
            subTab === tab.id
              ? 'border-[var(--action-accent,#1d4ed8)] text-[var(--action-accent,#1d4ed8)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  // 学员排行子 Tab 独立渲染（不依赖渠道数据）
  if (subTab === 'student_ranking') {
    return (
      <div className="space-y-0">
        {SubTabBar}
        <OpsStudentRanking configJson={configJson} />
      </div>
    );
  }

  // 空态（渠道触达 Tab）
  if (!opsData || opsData.total_students === 0) {
    return (
      <div className="space-y-0">
        {SubTabBar}
        <EmptyState
          title="M6~M12+ 围场暂无学员数据"
          description="上传包含 M6+ 围场的过程数据（D3）后自动刷新"
        />
      </div>
    );
  }

  const channels = opsData.channels ?? [];
  const segments = opsData.by_enclosure_segment ?? [];

  return (
    <div className="space-y-5">
      {/* 子 Tab 切换 */}
      {SubTabBar}
      {/* 区域 A — 顶部总览卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card-compact text-center">
          <div className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {fmtNum(opsData.total_students)}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">M6~M12+ 总学员</div>
        </div>
        <div className="card-compact text-center">
          <div className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {fmtNum(opsData.checked_in)}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">已打卡</div>
        </div>
        <div className="card-compact text-center">
          <div className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {formatRate(opsData.checkin_rate)}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">打卡率</div>
        </div>
      </div>

      {/* 区域 B — 四渠道触达卡片 */}
      {channels.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {channels.map((ch) => (
            <ChannelCard key={ch.channel_id} channel={ch} />
          ))}
        </div>
      )}

      {channels.length === 0 && (
        <EmptyState title="暂无渠道配置" description="后端尚未返回渠道触达数据" />
      )}

      {/* 区域 C — 围场子段分布 */}
      {segments.length > 1 && <EnclosureSegmentBar segments={segments} />}

      {segments.length === 1 && (
        <div className="card-compact">
          <div className="text-xs text-[var(--text-muted)] mb-1">围场子段</div>
          <div className="flex items-center gap-3">
            <span className="font-medium text-[var(--text-primary)]">{segments[0].label}</span>
            <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
              {fmtNum(segments[0].checked_in)}/{fmtNum(segments[0].students)} ·{' '}
              {formatRate(segments[0].rate)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

// ── 学员洞察 Tab ───────────────────────────────────────────────────────────────
// 从 SummaryTab 移出的学员全景内容 + 从 RankingTab 移出的学员排行
// 包含：频次分布 / 课耗×打卡四象限 / 转化漏斗 / CC触达 / 续费关联 / 学员排行榜

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
    return (
      <EmptyState
        title="数据加载失败"
        description="无法获取学员分析数据，请检查后端服务"
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="暂无学员数据"
        description="上传包含打卡记录的数据文件后自动刷新"
      />
    );
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
        <SectionTitle>月度对比核心指标</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatMiniCard
            label="本月参与率"
            value={formatRate(mc.participation_rate_this)}
            sub={`上月 ${formatRate(mc.participation_rate_last)}`}
            accent={
              participationTrend === 'up'
                ? 'green'
                : participationTrend === 'down'
                  ? 'red'
                  : 'slate'
            }
            subtitle="至少打卡 1 次的学员 / 有效学员总数"
          />
          <StatMiniCard
            label="人均打卡天数"
            value={mc.avg_days_this.toFixed(2)}
            sub={`上月 ${mc.avg_days_last.toFixed(2)} 天`}
            accent={avgDaysTrend === 'up' ? 'green' : avgDaysTrend === 'down' ? 'red' : 'slate'}
            subtitle="本月所有有效学员的平均打卡次数"
          />
          <StatMiniCard
            label="零打卡学员"
            value={mc.zero_this.toLocaleString()}
            sub={`上月 ${mc.zero_last.toLocaleString()} 人`}
            accent={mc.zero_this > mc.zero_last ? 'red' : 'green'}
            subtitle="本月一次都未打卡的有效学员数"
          />
          <StatMiniCard
            label="满勤学员（≥6次）"
            value={mc.superfan_this.toLocaleString()}
            sub={`上月 ${mc.superfan_last.toLocaleString()} 人`}
            accent={mc.superfan_this >= mc.superfan_last ? 'green' : 'red'}
            subtitle="本月打卡次数达到 6 次（满勤）的学员数"
          />
        </div>
      </div>

      {/* 区块 2：频次分布 + 课耗×打卡四象限 */}
      <div>
        <SectionTitle>频次分布 · 课耗×打卡四象限</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-base p-5">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">
              打卡频次分布（0–6 次）
            </p>
            <StudentFrequencyChart data={data.frequency_distribution} />
          </div>
          <div className="card-base p-5">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">
              课耗×打卡四象限
            </p>
            <LessonCheckinCross data={data.lesson_checkin_cross} />
          </div>
        </div>
      </div>

      {/* 区块 3：围场参与率 */}
      <div>
        <SectionTitle>围场打卡参与率</SectionTitle>
        <div className="card-base p-5">
          <p className="text-xs text-[var(--text-muted)] mb-3">
            各围场（M0→M12+）打卡参与率对比 · 颜色：绿≥50% · 橙30-50% · 红&lt;30%
          </p>
          <EnclosureParticipationChart data={data.by_enclosure} />
        </div>
      </div>

      {/* 区块 4：转化漏斗证明 */}
      <div>
        <SectionTitle>打卡频次×推荐转化漏斗</SectionTitle>
        <div className="card-base p-5">
          <p className="text-xs text-[var(--text-muted)] mb-3">
            不同打卡频段学员的推荐注册率与付费率对比 · 验证打卡→推荐的正相关关系
          </p>
          <ConversionFunnelProof data={data.conversion_funnel} />
        </div>
      </div>

      {/* 区块 5：CC触达效果 + 续费关联 */}
      <div>
        <SectionTitle>CC 触达效果 · 续费关联</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-base p-5">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">
              CC 触达频率×打卡参与率
            </p>
            <ContactCheckinChart data={data.contact_checkin_response} />
          </div>
          <div className="card-base p-5">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">
              打卡频段×续费关联
            </p>
            <RenewalCheckinChart data={data.renewal_checkin_correlation} />
          </div>
        </div>
      </div>

      {/* 区块 6：学员排行榜 */}
      <div>
        <SectionTitle>学员排行榜</SectionTitle>
        <StudentRankingPanel enclosureFilter={enclosureFilter} />
      </div>
    </div>
  );
}

'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { HighPotentialStudent } from '@/lib/types/member';
import type { WarroomStudent } from '@/lib/types/cross-analysis';
import { Star, Phone, Clock } from 'lucide-react';

interface HighPotentialResponse {
  students: HighPotentialStudent[];
}

/** nan / null / 空字符串 → 不显示 */
function isValidValue(v: string | null | undefined): boolean {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s !== '' && s !== 'nan' && s !== 'none';
}

function urgencyBorderClass(level?: 'red' | 'yellow' | 'green'): string {
  if (level === 'red') return 'border-l-4 border-l-[var(--color-danger)]';
  if (level === 'yellow') return 'border-l-4 border-l-[var(--color-warning)]';
  if (level === 'green') return 'border-l-4 border-l-[var(--color-success)]';
  return 'border-l-4 border-l-transparent';
}

function urgencyBadgeClass(level?: 'red' | 'yellow' | 'green'): string {
  if (level === 'red') return 'bg-red-50 text-[var(--color-danger)]';
  if (level === 'yellow') return 'bg-amber-50 text-[var(--color-warning)]';
  if (level === 'green') return 'bg-emerald-50 text-[var(--color-success)]';
  return '';
}

function urgencyLabel(level?: 'red' | 'yellow' | 'green'): string {
  if (level === 'red') return '紧急';
  if (level === 'yellow') return '关注';
  if (level === 'green') return '稳定';
  return '';
}

function EnclosureBadge({ enclosure }: { enclosure: string }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-[var(--color-accent-surface)] text-[var(--color-accent)]">
      {enclosure}
    </span>
  );
}

function PaymentsBadge({ payments }: { payments: number }) {
  const hasPayment = payments > 0;
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
        hasPayment
          ? 'bg-emerald-50 text-[var(--color-success)]'
          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
      }`}
    >
      付费 {payments}
    </span>
  );
}

function EngagementBadge({ deep }: { deep: boolean }) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
        deep
          ? 'bg-emerald-50 text-[var(--color-success)]'
          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
      }`}
    >
      {deep ? '深度参与' : '浅度参与'}
    </span>
  );
}

function OwnerRow({ role, group, name }: { role: string; group: string; name: string }) {
  if (!isValidValue(name)) return null;
  const display = isValidValue(group) ? `${group} · ${name}` : name;
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-[var(--text-muted)] font-medium w-6 shrink-0">{role}</span>
      <span className="text-[var(--text-secondary)] truncate text-right">{display}</span>
    </div>
  );
}

function HighPotentialCard({
  student,
  warroom,
}: {
  student: HighPotentialStudent;
  warroom?: WarroomStudent;
}) {
  return (
    <div
      className={`card-base hover:shadow-[var(--shadow-medium)] transition-shadow duration-200 ${urgencyBorderClass(warroom?.urgency_level)}`}
    >
      {/* ── 标题行 ── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Star className="w-3.5 h-3.5 text-[var(--color-warning)] shrink-0" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">#{student.id}</span>
          <EnclosureBadge enclosure={student.enclosure} />
          {warroom?.urgency_level && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${urgencyBadgeClass(warroom.urgency_level)}`}
            >
              {urgencyLabel(warroom.urgency_level)}
            </span>
          )}
        </div>
        <PaymentsBadge payments={student.payments} />
      </div>

      {/* ── 核心指标行 ── */}
      <div className="grid grid-cols-3 gap-2 mb-4 rounded-lg bg-[var(--bg-subtle)] px-3 py-2.5">
        <div className="text-center">
          <div className="text-base font-bold text-[var(--text-primary)]">{student.total_new}</div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">带新</p>
        </div>
        <div className="text-center border-x border-[var(--border-default)]">
          <div className="text-base font-bold text-[var(--text-primary)]">{student.attendance}</div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">出席</p>
        </div>
        <div className="text-center">
          <div
            className={`text-base font-bold ${student.payments > 0 ? 'text-[var(--color-success)]' : 'text-[var(--text-primary)]'}`}
          >
            {student.payments}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">付费</p>
        </div>
      </div>

      {/* ── 负责人区块 ── */}
      <div className="space-y-1 mb-3">
        <OwnerRow role="CC" group={student.cc_group} name={student.cc_name} />
        <OwnerRow role="SS" group={student.ss_group} name={student.ss_name} />
        <OwnerRow role="LP" group={student.lp_group} name={student.lp_name} />
      </div>

      {/* ── 底部行 ── */}
      <div className="pt-2.5 border-t border-[var(--border-subtle)] space-y-1.5">
        {/* 参与深度 */}
        {student.deep_engagement != null && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">参与深度</span>
            <EngagementBadge deep={!!student.deep_engagement} />
          </div>
        )}

        {/* 失联天数 */}
        {student.days_since_last_cc_contact != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">失联</span>
            <span
              className={`font-semibold ${
                student.days_since_last_cc_contact > 14
                  ? 'text-[var(--color-danger)]'
                  : student.days_since_last_cc_contact > 7
                    ? 'text-[var(--color-warning)]'
                    : 'text-[var(--color-success)]'
              }`}
            >
              {student.days_since_last_cc_contact} 天
            </span>
          </div>
        )}

        {/* Warroom 打卡 / 窗口期 / 最后接通 */}
        {warroom && (
          <div className="grid grid-cols-3 gap-1 pt-1.5 mt-1 border-t border-[var(--border-subtle)] text-center">
            <div>
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Phone className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {warroom.checkin_7d}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">打卡</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {warroom.days_remaining}天
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">窗口</p>
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)] mb-0.5">
                {warroom.last_contact_date ?? '—'}
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">接通</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HighPotentialPage() {
  const { data, isLoading, error } = useSWR<HighPotentialResponse>(
    '/api/high-potential',
    swrFetcher
  );
  const { data: warroomData } = useSWR<WarroomStudent[]>('/api/high-potential/warroom', swrFetcher);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="数据加载失败" description="无法获取高潜学员数据，请检查后端服务" />;
  }

  const students = Array.isArray(data) ? data : (data?.students ?? []);
  const warroomList: WarroomStudent[] = Array.isArray(warroomData) ? warroomData : [];

  const warroomMap = new Map<string, WarroomStudent>(warroomList.map((w) => [w.stdt_id, w]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">高潜学员</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          带新数高 + 出席活跃 + 付费意向强的学员 · 共 {students.length} 人
        </p>
      </div>

      {students.length === 0 ? (
        <EmptyState title="暂无高潜学员数据" description="上传数据文件后自动识别高潜学员" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {students.map((s) => (
            <HighPotentialCard key={s.id} student={s} warroom={warroomMap.get(String(s.id))} />
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { HighPotentialStudent } from '@/lib/types/member';
import type { WarroomStudent } from '@/lib/types/cross-analysis';
import {
  Star,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  MapPin,
  Briefcase,
  Phone,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface HighPotentialResponse {
  students: HighPotentialStudent[];
}

function urgencyBorder(level?: 'red' | 'yellow' | 'green'): string {
  if (level === 'red') return 'border-l-4 border-l-red-500';
  if (level === 'yellow') return 'border-l-4 border-l-yellow-400';
  if (level === 'green') return 'border-l-4 border-l-green-500';
  return '';
}

function urgencyBadge(level?: 'red' | 'yellow' | 'green'): string {
  if (level === 'red') return 'bg-red-100 text-red-700';
  if (level === 'yellow') return 'bg-yellow-100 text-yellow-700';
  if (level === 'green') return 'bg-green-100 text-green-700';
  return '';
}

function urgencyLabel(level?: 'red' | 'yellow' | 'green'): string {
  if (level === 'red') return '紧急';
  if (level === 'yellow') return '关注';
  if (level === 'green') return '稳定';
  return '';
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
      className={`bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-medium)] transition-all duration-200 p-5 ${urgencyBorder(warroom?.urgency_level)}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              学员 #{student.id}
            </span>
            {warroom?.urgency_level && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${urgencyBadge(warroom.urgency_level)}`}
              >
                {urgencyLabel(warroom.urgency_level)}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">围场：{student.enclosure}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-600">{student.payments}</div>
          <div className="text-xs text-[var(--text-muted)]">付费次数</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
            <Users className="w-3.5 h-3.5" />
            <span className="text-base font-bold">{student.total_new}</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">带新数</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-base font-bold">{student.attendance}</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">出席数</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-base font-bold">{student.payments}</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">付费数</p>
        </div>
      </div>

      <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1.5">
        {student.stat_date && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-[var(--text-muted)]">
              <Calendar className="w-3 h-3" />
              统计日期
            </span>
            <span className="font-medium">{student.stat_date}</span>
          </div>
        )}
        {student.region && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-[var(--text-muted)]">
              <MapPin className="w-3 h-3" />
              区域
            </span>
            <span className="font-medium">{student.region}</span>
          </div>
        )}
        {student.business_line && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-[var(--text-muted)]">
              <Briefcase className="w-3 h-3" />
              业务线
            </span>
            <span className="font-medium">{student.business_line}</span>
          </div>
        )}
        {/* 失联天数 */}
        {student.days_since_last_cc_contact != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-[var(--text-muted)]">
              <AlertTriangle className="w-3 h-3" />
              失联天数
            </span>
            <span
              className={`font-semibold ${
                student.days_since_last_cc_contact > 14
                  ? 'text-red-500'
                  : student.days_since_last_cc_contact > 7
                    ? 'text-orange-500'
                    : 'text-green-600'
              }`}
            >
              {student.days_since_last_cc_contact} 天
            </span>
          </div>
        )}
        {/* 出席数标签 */}
        {student.deep_engagement && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">参与深度</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700">
              深度参与
            </span>
          </div>
        )}
        {student.cc_name && (
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">CC</span>
            <span className="font-medium">
              {student.cc_group} · {student.cc_name}
            </span>
          </div>
        )}
        {student.ss_name && (
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">SS</span>
            <span className="font-medium">
              {student.ss_group} · {student.ss_name}
            </span>
          </div>
        )}
        {student.lp_name && (
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">LP</span>
            <span className="font-medium">
              {student.lp_group} · {student.lp_name}
            </span>
          </div>
        )}

        {/* Warroom 增强信息 */}
        {warroom && (
          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="flex items-center justify-center gap-0.5 text-blue-600 mb-0.5">
                <Phone className="w-3 h-3" />
                <span className="text-xs font-bold">{warroom.checkin_7d}</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">近7日打卡</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-0.5 text-purple-600 mb-0.5">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-bold">{warroom.days_remaining}天</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">窗口期</p>
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)] mb-0.5">
                {warroom.last_contact_date ?? '—'}
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">最后接通</p>
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

  // 建立 warroom 查找表：stdt_id → WarroomStudent
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {students.map((s) => (
            <HighPotentialCard key={s.id} student={s} warroom={warroomMap.get(String(s.id))} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { HighPotentialStudent } from "@/lib/types/member";
import { Star, Users, TrendingUp, DollarSign, Calendar, MapPin, Briefcase } from "lucide-react";

interface HighPotentialResponse {
  students: HighPotentialStudent[];
}

function HighPotentialCard({ student }: { student: HighPotentialStudent }) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-medium)] transition-all duration-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">学员 #{student.id}</span>
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
              <Calendar className="w-3 h-3" />统计日期
            </span>
            <span className="font-medium">{student.stat_date}</span>
          </div>
        )}
        {student.region && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-[var(--text-muted)]">
              <MapPin className="w-3 h-3" />区域
            </span>
            <span className="font-medium">{student.region}</span>
          </div>
        )}
        {student.business_line && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-[var(--text-muted)]">
              <Briefcase className="w-3 h-3" />业务线
            </span>
            <span className="font-medium">{student.business_line}</span>
          </div>
        )}
        {student.cc_name && (
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">CC</span>
            <span className="font-medium">{student.cc_group} · {student.cc_name}</span>
          </div>
        )}
        {student.ss_name && (
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">SS</span>
            <span className="font-medium">{student.ss_group} · {student.ss_name}</span>
          </div>
        )}
        {student.lp_name && (
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">LP</span>
            <span className="font-medium">{student.lp_group} · {student.lp_name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HighPotentialPage() {
  const { data, isLoading, error } = useSWR<HighPotentialResponse>(
    "/api/high-potential",
    swrFetcher
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
        description="无法获取高潜学员数据，请检查后端服务"
      />
    );
  }

  const students = Array.isArray(data) ? data : (data?.students ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">高潜学员</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          带新数高 + 出席活跃 + 付费意向强的学员 · 共 {students.length} 人
        </p>
      </div>

      {students.length === 0 ? (
        <EmptyState
          title="暂无高潜学员数据"
          description="上传数据文件后自动识别高潜学员"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {students.map((s) => (
            <HighPotentialCard key={s.id} student={s} />
          ))}
        </div>
      )}
    </div>
  );
}

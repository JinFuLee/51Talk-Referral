"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { MemberHeroCard } from "@/components/biz/member/MemberHeroCard";
import { CompetenceRadar } from "@/components/biz/member/CompetenceRadar";
import { AnomalyTimeline } from "@/components/biz/member/AnomalyTimeline";
import { RevenueSharePanel } from "@/components/biz/member/RevenueSharePanel";
import type { MemberProfileResponse } from "@/lib/types/member";
import { OPS_PAGE } from "@/lib/layout";

export default function MemberProfilePage() {
  const { cc_name } = useParams<{ cc_name: string }>();
  const decodedName = decodeURIComponent(cc_name ?? "");

  const { data, error, isLoading } = useSWR<MemberProfileResponse>(
    cc_name ? `/api/member/${cc_name}/profile` : null,
    swrFetcher
  );

  return (
    <div className={OPS_PAGE}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link href="/biz/ranking-enhanced" className="hover:text-blue-600 transition-colors">
          团队排行
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{decodedName}</span>
      </nav>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          加载中...
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
          数据加载失败：{String(error?.message ?? error)}
          <p className="text-xs mt-1 text-amber-600">
            请确认 CC 姓名拼写正确，或先运行数据分析
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && !data && (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          未找到「{decodedName}」的数据，请确认姓名拼写
        </div>
      )}

      {/* Content */}
      {data && (
        <div className="space-y-6">
          <MemberHeroCard identity={data.identity} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CompetenceRadar radar={data.radar} hiredays={data.identity.hire_days} />
            <AnomalyTimeline anomaly={data.anomaly} />
          </div>
          <RevenueSharePanel revenue={data.revenue} />
        </div>
      )}
    </div>
  );
}

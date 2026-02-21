"use client";

import useSWR from "swr";
import { useTranslation } from "@/lib/hooks";
import { CohortStudentOverview } from "@/components/biz/CohortStudentOverview";
import { RetentionCurveChart } from "@/components/biz/RetentionCurveChart";
import { CCBringNewRanking } from "@/components/biz/CCBringNewRanking";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface CohortStudentsResponse {
  total_students: number;
  cc_ranking: {
    cc_name: string;
    team: string;
    students: number;
    valid_students: number;
    reached_students: number;
    bring_new_total: number;
    bring_new_rate: number;
    reach_rate: number;
  }[];
  retention_curve: {
    month_age: number;
    valid_rate: number | null;
    valid_count: number;
    total: number;
  }[];
  by_team: {
    team: string;
    students: number;
    valid_students: number;
    reached_students: number;
    bring_new_total: number;
    bring_new_rate: number;
  }[];
  data_source: string;
}

function DataSourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const isDemo = source === "demo";
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        isDemo
          ? "bg-amber-50 text-amber-600 border border-amber-200"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
      }`}
    >
      {isDemo ? "演示数据" : "真实数据"}
    </span>
  );
}

export default function CohortStudentsPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useSWR<CohortStudentsResponse>(
    `/api/analysis/cohort-students`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-sm text-red-500">{t("biz.cohort-students.label.loadError")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{t("biz.cohort-students.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {data.total_students.toLocaleString()} {t("biz.cohort-students.label.records")}
          </p>
        </div>
        <DataSourceBadge source={data.data_source} />
      </div>

      <ErrorBoundary>
        {/* Overview + Team compare */}
        <Card title={t("biz.cohort-students.card.overview")}>
          <CohortStudentOverview
            totalStudents={data.total_students}
            teams={data.by_team}
          />
        </Card>

        {/* Retention curve */}
        <Card title={t("biz.cohort-students.card.retention")}>
          <RetentionCurveChart data={data.retention_curve} />
        </Card>

        {/* CC ranking */}
        <Card title={t("biz.cohort-students.card.ranking")}>
          <CCBringNewRanking data={data.cc_ranking} />
        </Card>
      </ErrorBoundary>
    </div>
  );
}

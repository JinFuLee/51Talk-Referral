"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { EnclosureCompareChart } from "@/components/charts/EnclosureCompareChart";
import { EnclosureCombinedOverview } from "@/components/charts/EnclosureCombinedOverview";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";

export default function EnclosureDetailPage() {
  const { t } = useTranslation();
  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t("biz.enclosure-detail.title")} subtitle={t("biz.enclosure-detail.subtitle")} />

      {/* Context card */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
            <p className="font-semibold text-slate-700 mb-1">围场定义</p>
            <p className="text-slate-500">
              用户<span className="font-medium">付费当日</span>起算天数分段：
              0-30 / 31-60 / 61-90 / 91-180 / 181+
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
            <p className="font-semibold text-blue-700 mb-1">D2×D3 对比视角</p>
            <p className="text-blue-600">
              同一围场内：市场渠道 vs 转介绍渠道转化率/参与率/学员数对比
            </p>
          </div>
          <div className="bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-100">
            <p className="font-semibold text-emerald-700 mb-1">D4 合并视角</p>
            <p className="text-emerald-600">
              全渠道合并，展示每围场的活跃学员、付费、参与率、动员率综合表现
            </p>
          </div>
        </div>
      </Card>

      <GlossaryBanner terms={[
        { term: "围场", definition: "用户付费当日起算天数分段(0-30/31-60/61-90/91-180/181+)" },
        { term: "窄口", definition: "员工链接绑定UserB（高质量）" },
        { term: "宽口", definition: "学员链接绑定UserB（低质量）" },
        { term: "D2", definition: "市场渠道围场数据" },
        { term: "D3", definition: "转介绍渠道围场数据" },
        { term: "D4", definition: "全渠道合并围场数据" },
      ]} />

      <ErrorBoundary>
        {/* D2×D3: Channel compare bar chart */}
        <EnclosureCompareChart />

        {/* D4: Combined overview with colored segment cards */}
        <EnclosureCombinedOverview />
      </ErrorBoundary>
    </div>
  );
}

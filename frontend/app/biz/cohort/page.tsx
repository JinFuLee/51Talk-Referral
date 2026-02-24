"use client";

import { useState } from "react";
import type { TabId } from "@/lib/types/cohort";
import CohortFilterPanel from "./CohortFilterPanel";
import CohortDataTable from "./CohortDataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";

export default function CohortPage() {
  const [activeTab, setActiveTab] = useState<TabId>("heatmap");

  return (
    <div className={BIZ_PAGE}>
      <PageHeader title="Cohort 分析中心" subtitle="C1-C5 触达率/参与率/打卡率/带新系数/带货比月龄衰减 · C6 学员级留存与带新" />

      <CohortFilterPanel activeTab={activeTab} onTabChange={setActiveTab} />
      <CohortDataTable activeTab={activeTab} />
    </div>
  );
}

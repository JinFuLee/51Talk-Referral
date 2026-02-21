"use client";

import { useState } from "react";
import type { TabId } from "@/lib/types/cohort";
import CohortFilterPanel from "./CohortFilterPanel";
import CohortDataTable from "./CohortDataTable";

export default function CohortPage() {
  const [activeTab, setActiveTab] = useState<TabId>("heatmap");

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Cohort 分析中心</h1>
        <p className="text-sm text-slate-500 mt-1">
          C1-C5 触达率/参与率/打卡率/带新系数/带货比月龄衰减 · C6 学员级留存与带新
        </p>
      </div>

      <CohortFilterPanel activeTab={activeTab} onTabChange={setActiveTab} />
      <CohortDataTable activeTab={activeTab} />
    </div>
  );
}

"use client";

import type { TabId } from "@/lib/types/cohort";
import CohortHeatmapTab from "./CohortHeatmapTab";
import CohortDecayTab from "./CohortDecayTab";
import CohortDetailTab from "./CohortDetailTab";

interface CohortDataTableProps {
  activeTab: TabId;
}

export default function CohortDataTable({ activeTab }: CohortDataTableProps) {
  if (activeTab === "heatmap") return <CohortHeatmapTab />;
  if (activeTab === "decay") return <CohortDecayTab />;
  return <CohortDetailTab />;
}

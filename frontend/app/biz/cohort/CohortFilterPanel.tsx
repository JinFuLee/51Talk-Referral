"use client";

import type { TabId } from "@/lib/types/cohort";
import { TABS } from "@/lib/types/cohort";

interface CohortFilterPanelProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function CohortFilterPanel({ activeTab, onTabChange }: CohortFilterPanelProps) {
  return (
    <div className="flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
            activeTab === tab.id
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

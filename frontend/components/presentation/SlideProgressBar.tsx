"use client";

import React, { useState } from "react";

interface Section {
  name: string;
  startIndex: number;
}

interface SlideProgressBarProps {
  current: number;
  total: number;
  sections?: Section[];
}

export function SlideProgressBar({ current, total, sections = [] }: SlideProgressBarProps) {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const progressPct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-200">
      {/* Main progress fill */}
      <div
        className="h-full bg-primary transition-all duration-500 ease-in-out"
        style={{ width: `${progressPct}%` }}
      />

      {/* Section markers */}
      {sections.map((section) => {
        const markerPct = (section.startIndex / total) * 100;
        return (
          <div
            key={section.name}
            className="absolute top-0 -translate-x-1/2 group"
            style={{ left: `${markerPct}%` }}
            onMouseEnter={() => setHoveredSection(section.name)}
            onMouseLeave={() => setHoveredSection(null)}
          >
            {/* Marker dot */}
            <div className="w-2 h-2 rounded-full bg-white border-2 border-primary -mt-0.5 cursor-pointer transition-transform group-hover:scale-150" />

            {/* Tooltip */}
            {hoveredSection === section.name && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50 shadow-lg">
                {section.name}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-900" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

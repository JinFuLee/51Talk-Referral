"use client";

import type { StageEvaluation, StageEvidence } from "@/lib/types";

interface StageBadgeProps {
  data: StageEvaluation;
}

const STAGES = [
  { num: 1, name: "基础启动" },
  { num: 2, name: "科学运营" },
  { num: 3, name: "系统思维" },
];

function ScoreBar({ score, warn }: { score: number; warn: boolean }) {
  const pct = Math.min(Math.max(score * 100, 0), 100);
  return (
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          warn ? "bg-amber-400" : "bg-indigo-500"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function EvidenceRow({ ev }: { ev: StageEvidence }) {
  const warn = ev.score < 0.5;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-600 w-24 shrink-0">{ev.dimension}</span>
      <ScoreBar score={ev.score} warn={warn} />
      <span
        className={`text-xs font-semibold w-10 text-right ${
          warn ? "text-amber-600" : "text-indigo-700"
        }`}
      >
        {ev.score.toFixed(2)}
      </span>
      <span className="text-xs text-slate-400 w-12 text-right">
        阶段 {ev.stage_indicator}
        {warn && <span className="ml-1">⚠️</span>}
      </span>
    </div>
  );
}

export function StageBadge({ data }: StageBadgeProps) {
  const confidencePct = (data.confidence * 100).toFixed(0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold mb-4">📊 转介绍阶段评估</h2>

      {/* Stage progress track */}
      <div className="flex items-center gap-2 mb-6">
        {STAGES.map((s, idx) => {
          const isActive = s.num === data.current_stage;
          const isPast = s.num < data.current_stage;
          const isLast = idx === STAGES.length - 1;

          return (
            <div key={s.num} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    isActive
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : isPast
                      ? "bg-indigo-100 border-indigo-300 text-indigo-600"
                      : "bg-slate-100 border-slate-200 text-slate-400"
                  }`}
                >
                  {s.num}
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isActive ? "text-indigo-700" : isPast ? "text-indigo-400" : "text-slate-400"
                  }`}
                >
                  {s.name}
                </span>
                {isActive && (
                  <span className="text-xs text-slate-400">
                    置信度 {confidencePct}%
                  </span>
                )}
              </div>
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mb-5 ${
                    s.num < data.current_stage ? "bg-indigo-300" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Evidence dimension scores */}
      {data.evidence.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">维度评分</h3>
          <div>
            {data.evidence.map((ev) => (
              <EvidenceRow key={ev.dimension} ev={ev} />
            ))}
          </div>
        </div>
      )}

      {/* Upgrade suggestions */}
      {data.upgrade_suggestions.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">升级建议</h3>
          <ul className="space-y-1">
            {data.upgrade_suggestions.map((s, i) => (
              <li key={i} className="text-sm text-slate-600 flex gap-2">
                <span className="text-indigo-400 shrink-0">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next stage */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-1">
          下一阶段: <span className="text-indigo-700">{data.next_stage.name}</span>
        </h3>
        <p className="text-xs text-slate-500 mb-1">关键要求</p>
        <ul className="space-y-0.5">
          {data.next_stage.key_requirements.map((req, i) => (
            <li key={i} className="text-xs text-slate-600 flex gap-1.5">
              <span className="text-indigo-400">→</span>
              {req}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

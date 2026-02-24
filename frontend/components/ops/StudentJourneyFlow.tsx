"use client";

interface JourneyStep {
  label: string;
  value: number;
  dropRate?: number; // drop from previous step
}

interface StudentJourneyFlowProps {
  steps: JourneyStep[];
}

const STEP_COLORS = ["hsl(var(--chart-2))", "hsl(var(--chart-4))", "hsl(var(--chart-4))", "#a855f7", "#d946ef"];

export function StudentJourneyFlow({ steps }: StudentJourneyFlowProps) {
  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-slate-400 text-sm">
        暂无学员旅程数据
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-0 overflow-x-auto py-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-0">
          {/* Step box */}
          <div className="flex flex-col items-center min-w-[80px]">
            <div
              className="w-full rounded-lg px-3 py-2 text-center"
              style={{ backgroundColor: `${STEP_COLORS[i % STEP_COLORS.length]}18`, borderLeft: `3px solid ${STEP_COLORS[i % STEP_COLORS.length]}` }}
            >
              <p className="text-xs text-slate-500 mb-0.5">{step.label}</p>
              <p className="text-lg font-bold text-slate-800">{step.value.toLocaleString()}</p>
            </div>
            {step.dropRate !== undefined && step.dropRate > 0 && (
              <p className="text-[10px] text-destructive mt-1">-{step.dropRate.toFixed(0)}%</p>
            )}
          </div>

          {/* Arrow connector */}
          {i < steps.length - 1 && (
            <div className="flex flex-col items-center px-1">
              <span className="text-slate-300 text-lg">→</span>
              {steps[i + 1] && steps[i].value > 0 && (
                <span className="text-[10px] text-slate-400">
                  {((steps[i + 1].value / steps[i].value) * 100).toFixed(0)}%
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

"use client";

interface SixStepsData {
  clarify: string;
  metrics: string[];
  data_source: string;
  method: string;
  insight: string;
  action: string;
}

interface SixStepSummaryProps {
  data: SixStepsData;
}

const STEPS = [
  { key: "clarify" as const, num: 1, label: "澄清问题", icon: "🎯" },
  { key: "metrics" as const, num: 2, label: "指标选择", icon: "📏" },
  { key: "data_source" as const, num: 3, label: "数据支持", icon: "🗄️" },
  { key: "method" as const, num: 4, label: "方法选择", icon: "🔬" },
  { key: "insight" as const, num: 5, label: "洞察发现", icon: "💡" },
  { key: "action" as const, num: 6, label: "行动方案", icon: "🚀" },
];

function StepCard({
  num,
  icon,
  label,
  content,
}: {
  num: number;
  icon: string;
  label: string;
  content: string | string[];
}) {
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
          {num}
        </span>
        <span className="text-sm font-semibold text-slate-700">
          {icon} {label}
        </span>
      </div>
      <div className="text-sm text-slate-600">
        {Array.isArray(content) ? (
          <ul className="space-y-1">
            {content.map((item, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-indigo-400 shrink-0">·</span>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p>{content}</p>
        )}
      </div>
    </div>
  );
}

export function SixStepSummary({ data }: SixStepSummaryProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold mb-4">📝 六步法分析摘要</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s) => {
          const raw = data[s.key];
          const content: string | string[] = Array.isArray(raw) ? raw : (raw ?? "—");
          return (
            <StepCard
              key={s.key}
              num={s.num}
              icon={s.icon}
              label={s.label}
              content={content}
            />
          );
        })}
      </div>
    </div>
  );
}

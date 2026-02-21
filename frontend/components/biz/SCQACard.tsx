"use client";

interface SCQAData {
  situation: string;
  complication: string;
  question: string;
  answer: string;
}

interface SCQACardProps {
  scqa: SCQAData;
}

const sections = [
  {
    key: "situation" as const,
    label: "背景",
    sublabel: "Situation",
    icon: "🏷️",
    bg: "bg-primary/5",
    border: "border-primary/20",
    text: "text-primary",
    badge: "bg-primary/10 text-primary",
  },
  {
    key: "complication" as const,
    label: "冲突",
    sublabel: "Complication",
    icon: "⚡",
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
    badge: "bg-warning/20 text-warning",
  },
  {
    key: "question" as const,
    label: "疑问",
    sublabel: "Question",
    icon: "❓",
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
    badge: "bg-slate-100 text-slate-600",
  },
  {
    key: "answer" as const,
    label: "答案",
    sublabel: "Answer",
    icon: "✅",
    bg: "bg-success/10",
    border: "border-success/30",
    text: "text-success",
    badge: "bg-success/20 text-success",
  },
];

export function SCQACard({ scqa }: SCQACardProps) {
  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-border/40 p-6 shadow-flash transition-all duration-500 hover:shadow-flash-lg hover:-translate-y-1">
      <h2 className="text-lg font-semibold mb-4">
        <span className="mr-2">📋</span>SCQA 分析框架
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((s) => (
          <div
            key={s.key}
            className={`rounded-lg border p-4 ${s.bg} ${s.border}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span>{s.icon}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>
                {s.label} ({s.sublabel})
              </span>
            </div>
            <p className={`text-sm leading-relaxed ${s.text}`}>
              {scqa[s.key]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

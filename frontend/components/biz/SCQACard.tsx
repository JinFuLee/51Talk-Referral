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
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    key: "complication" as const,
    label: "冲突",
    sublabel: "Complication",
    icon: "⚡",
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-800",
    badge: "bg-orange-100 text-orange-700",
  },
  {
    key: "question" as const,
    label: "疑问",
    sublabel: "Question",
    icon: "❓",
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-800",
    badge: "bg-purple-100 text-purple-700",
  },
  {
    key: "answer" as const,
    label: "答案",
    sublabel: "Answer",
    icon: "✅",
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    badge: "bg-green-100 text-green-700",
  },
];

export function SCQACard({ scqa }: SCQACardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
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

"use client";

interface PredictionCardProps {
  data: Record<string, unknown>;
}

export function PredictionCard({ data }: PredictionCardProps) {
  const reg = data.eom_registrations as number | undefined;
  const paid = data.eom_payments as number | undefined;
  const revenue = data.eom_revenue as number | undefined;
  const model = data.model_used as string | undefined;
  const conf = data.confidence as number | undefined;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="预测注册" value={reg?.toLocaleString() ?? "—"} />
        <Stat label="预测付费" value={paid?.toLocaleString() ?? "—"} />
        <Stat label="预测收入" value={revenue?.toLocaleString() ?? "—"} />
      </div>
      <div className="flex gap-4 text-xs text-slate-400">
        {model && <span>模型：{model}</span>}
        {conf !== undefined && <span>置信度：{(conf * 100).toFixed(1)}%</span>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-blue-50 p-3 text-center">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-blue-700">{value}</p>
    </div>
  );
}

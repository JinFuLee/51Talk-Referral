"use client";

interface CheckinImpactCardProps {
  checkinRate: number;   // 0~1
  referralRate: number;  // 带新系数
  causalStrength: number; // 0~1
  description?: string;
}

export function CheckinImpactCard({
  checkinRate,
  referralRate,
  causalStrength,
  description,
}: CheckinImpactCardProps) {
  const strength = Math.round(causalStrength * 100);
  const strengthColor =
    strength >= 70 ? "text-green-600" : strength >= 40 ? "text-yellow-600" : "text-slate-500";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-500 mb-3">打卡 → 带新 因果关系</p>

      {/* Arrow flow */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-0.5">打卡率</p>
          <p className="text-xl font-bold text-blue-600">{Math.round(checkinRate * 100)}%</p>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <div className="text-lg">→</div>
          <span className={`text-xs font-semibold ${strengthColor}`}>{strength}% 因果</span>
        </div>

        <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-0.5">带新系数</p>
          <p className="text-xl font-bold text-green-600">{referralRate.toFixed(2)}x</p>
        </div>
      </div>

      {description && (
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

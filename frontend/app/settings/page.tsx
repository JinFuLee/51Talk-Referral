"use client";

import { useState } from "react";
import { useExchangeRate, useMonthlyTargets } from "@/lib/hooks";
import { configAPI } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export default function SettingsPage() {
  const { data: rate, mutate: mutateRate } = useExchangeRate();
  const { data: targets } = useMonthlyTargets();
  const [rateInput, setRateInput] = useState("");
  const [rateSaving, setRateSaving] = useState(false);
  const [rateMsg, setRateMsg] = useState<string | null>(null);

  async function handleSaveRate() {
    const val = parseFloat(rateInput);
    if (isNaN(val) || val <= 0) {
      setRateMsg("请输入有效汇率（正数）");
      return;
    }
    setRateSaving(true);
    setRateMsg(null);
    try {
      await configAPI.putExchangeRate(val);
      await mutateRate();
      setRateMsg("保存成功");
      setRateInput("");
    } catch (e: unknown) {
      setRateMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setRateSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800">系统设置</h1>

      {/* Exchange Rate */}
      <Card title="汇率配置">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>当前汇率：</span>
            <span className="font-semibold text-slate-800">
              {rate ? `${rate.rate} ${rate.unit}` : "加载中…"}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              placeholder="新汇率 (THB/USD)"
              type="number"
              step="0.01"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={handleSaveRate}
              disabled={rateSaving || !rateInput}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {rateSaving ? <Spinner size="sm" /> : "保存"}
            </button>
          </div>
          {rateMsg && (
            <p className={`text-xs ${rateMsg.includes("成功") ? "text-green-600" : "text-red-500"}`}>
              {rateMsg}
            </p>
          )}
        </div>
      </Card>

      {/* Monthly Targets */}
      <Card title="月度目标">
        {targets ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 font-medium text-slate-500">月份</th>
                  <th className="text-right py-2 font-medium text-slate-500">注册</th>
                  <th className="text-right py-2 font-medium text-slate-500">付费</th>
                  <th className="text-right py-2 font-medium text-slate-500">收入</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => (
                  <tr key={t.month} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 font-medium text-slate-700">{t.month}</td>
                    <td className="py-2 text-right text-slate-600">
                      {t.registrations?.toLocaleString() ?? "-"}
                    </td>
                    <td className="py-2 text-right text-slate-600">
                      {t.payments?.toLocaleString() ?? "-"}
                    </td>
                    <td className="py-2 text-right text-slate-600">
                      {t.revenue?.toLocaleString() ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Spinner />
        )}
      </Card>
    </div>
  );
}

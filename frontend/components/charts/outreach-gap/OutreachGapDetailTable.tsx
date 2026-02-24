"use client";

import { Card } from "@/components/ui/Card";
import { formatRevenue } from "@/lib/utils";

interface CCGap {
  cc_name: string;
  total: number;
  called: number;
  not_called: number;
  coverage_rate: number;
  gap_vs_target: number;
}

interface LossEstimate {
  lost_attend: number;
  lost_paid: number;
  lost_revenue_usd: number;
  lost_revenue_thb: number;
}

interface DimensionStat {
  name: string;
  total_classes: number;
  call_rate: number;
  connect_rate: number;
  attendance_rate: number;
}

interface OutreachGapDetailTableProps {
  by_cc: CCGap[];
  loss_estimate: LossEstimate;
  by_channel_l3?: DimensionStat[];
  by_lead_grade?: DimensionStat[];
}

export default function OutreachGapDetailTable({
  by_cc,
  loss_estimate,
  by_channel_l3 = [],
  by_lead_grade = [],
}: OutreachGapDetailTableProps) {
  return (
    <div className="space-y-4">
      <Card title="CC 外呼缺口明细（按缺口排序）">
        {by_cc.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">暂无数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">CC</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">总学员</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">已拨</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">未拨</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">覆盖率</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">vs 目标</th>
                </tr>
              </thead>
              <tbody>
                {by_cc.map((cc) => {
                  const isLargeGap = cc.gap_vs_target > 0.1;
                  const isMedGap = cc.gap_vs_target > 0 && !isLargeGap;
                  return (
                    <tr
                      key={cc.cc_name}
                      className={
                        isLargeGap
                          ? "bg-red-50 border-b border-red-100"
                          : isMedGap
                          ? "bg-orange-50 border-b border-orange-100"
                          : "border-b border-slate-50 hover:bg-slate-50"
                      }
                    >
                      <td className="py-2 px-3 font-medium text-slate-700">{cc.cc_name}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{cc.total}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{cc.called}</td>
                      <td
                        className={`py-2 px-3 text-right font-medium ${
                          cc.not_called > 0 ? "text-red-600" : "text-slate-400"
                        }`}
                      >
                        {cc.not_called}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">
                        {(cc.coverage_rate * 100).toFixed(1)}%
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-semibold ${
                          cc.gap_vs_target > 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {cc.gap_vs_target > 0 ? "-" : "+"}
                        {Math.abs(cc.gap_vs_target * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-600">损失量化假设</p>
        <p>未拨学员 × 出席率 30% → 损失出席 {loss_estimate.lost_attend} 人</p>
        <p>损失出席 × 付费转化率 15% → 损失付费 {loss_estimate.lost_paid} 单</p>
        <p>
          损失付费 × 客单价 $200 → 损失收入 {formatRevenue(loss_estimate.lost_revenue_usd)}
        </p>
      </div>

      {(by_channel_l3.length > 0 || by_lead_grade.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {by_channel_l3.length > 0 && (
            <Card title="三级渠道外呼与出席表现">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 px-3 text-slate-400 font-medium">渠道 (L3)</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">线索量</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">外呼率</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">接通率</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">出席率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {by_channel_l3.slice(0, 10).map((row) => (
                      <tr key={row.name} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 px-3 font-medium text-slate-700">{row.name}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{row.total_classes}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{(row.call_rate * 100).toFixed(1)}%</td>
                        <td className="py-2 px-3 text-right text-slate-600">{(row.connect_rate * 100).toFixed(1)}%</td>
                        <td className="py-2 px-3 text-right text-slate-600 font-semibold text-emerald-600">{(row.attendance_rate * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {by_lead_grade.length > 0 && (
            <Card title="线索质量外呼与出席表现">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 px-3 text-slate-400 font-medium">线索等级</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">线索量</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">外呼率</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">接通率</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">出席率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {by_lead_grade.map((row) => (
                      <tr key={row.name} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 px-3 font-medium text-slate-700">{row.name}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{row.total_classes}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{(row.call_rate * 100).toFixed(1)}%</td>
                        <td className="py-2 px-3 text-right text-slate-600">{(row.connect_rate * 100).toFixed(1)}%</td>
                        <td className="py-2 px-3 text-right text-slate-600 font-semibold text-emerald-600">{(row.attendance_rate * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

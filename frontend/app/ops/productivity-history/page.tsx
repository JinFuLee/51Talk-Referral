"use client";

import { Card } from "@/components/ui/Card";
import { ProductivityHistoryChart } from "@/components/charts/ProductivityHistoryChart";

export default function ProductivityHistoryPage() {
  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">产能历史趋势</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          E1/E2 CC+SS 出勤人数与产能利用率历史趋势
        </p>
      </div>
      <Card title="产能历史趋势图">
        <ProductivityHistoryChart />
      </Card>
    </div>
  );
}

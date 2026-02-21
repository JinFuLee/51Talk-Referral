"use client";

import { Card } from "@/components/ui/Card";
import { ChannelMoMTrend } from "@/components/charts/ChannelMoMTrend";

export default function ChannelMoMPage() {
  return (
    <div className="max-w-none space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">渠道月度环比</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          F4 各转介绍渠道注册/转化效率月度趋势对比
        </p>
      </div>

      {/* Main chart */}
      <Card title="渠道趋势折线图">
        <ChannelMoMTrend />
      </Card>
    </div>
  );
}

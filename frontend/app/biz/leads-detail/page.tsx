"use client";

import { Card } from "@/components/ui/Card";
import { EnclosureChannelMatrix } from "@/components/charts/EnclosureChannelMatrix";
import { TimeIntervalHistogram } from "@/components/charts/TimeIntervalHistogram";

export default function LeadsDetailPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Leads 详情分析</h1>
        <p className="text-sm text-slate-400 mt-1">
          围场×渠道转化热力矩阵 · 注册→付费时间间隔分布
        </p>
      </div>

      {/* A2: 围场×渠道矩阵 */}
      <Card
        title="A2 围场×渠道转化矩阵"
        actions={
          <span className="text-xs text-slate-400">
            行 = 付费围场段 · 列 = 注册渠道 · 颜色 = 转化率
          </span>
        }
      >
        <EnclosureChannelMatrix />
      </Card>

      {/* A3: 时间间隔直方图 */}
      <Card
        title="A3 注册→付费时间间隔分布"
        actions={
          <span className="text-xs text-slate-400">
            X轴: 天数区间 · Y轴: 学员数
          </span>
        }
      >
        <TimeIntervalHistogram />
      </Card>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  ZAxis,
} from "recharts";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { useConfigStore } from "@/lib/stores/config-store";
import { Spinner } from "@/components/ui/Spinner";
import { CHART_FONT_SIZE } from "@/lib/utils";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { cn } from "@/lib/utils";

interface SectionRow {
  cc_name: string;
  contact_rate: number;
  reserve_rate: number;
  attend_rate: number;
  paid_rate: number;
}

interface SectionEfficiencyResponse {
  sections: SectionRow[];
  data_source?: string;
}

type QuadrantId = "Q1" | "Q2" | "Q3" | "Q4";

const QUADRANTS: Record<QuadrantId, { label: string; color: string; classes: string }> = {
  Q1: { label: "明星 (高触达·高转化)", color: "hsl(var(--success))", classes: "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 ring-emerald-500" },
  Q2: { label: "潜力 (高触达·低转化)", color: "hsl(var(--chart-amber))", classes: "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 ring-amber-500" },
  Q3: { label: "精准 (低触达·高转化)", color: "hsl(var(--chart-4))", classes: "text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 ring-indigo-500" },
  Q4: { label: "预警 (低触达·低转化)", color: "hsl(var(--chart-rose))", classes: "text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 ring-rose-500" },
};

function getQuadrant(contactRate: number, paidRate: number, midX: number, midY: number): QuadrantId {
  const highContact = contactRate >= midX;
  const highPaid = paidRate >= midY;
  if (highContact && highPaid) return "Q1";
  if (highContact && !highPaid) return "Q2";
  if (!highContact && highPaid) return "Q3";
  return "Q4";
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: SectionRow & { qId: QuadrantId };
  activeCc: string | null;
  activeQuadrant: QuadrantId | null;
}

function CustomDot({ cx = 0, cy = 0, payload, activeCc, activeQuadrant }: CustomDotProps) {
  if (!payload) return null;
  
  // 判断过滤逻辑
  const isFilteredOut = activeQuadrant !== null && activeQuadrant !== payload.qId;
  if (isFilteredOut) return null; // 完全隐藏非选中象限的点

  // 判断高亮逻辑
  const isHovered = activeCc === payload.cc_name;
  const isDimmed = activeCc !== null && !isHovered;

  const color = QUADRANTS[payload.qId].color;

  return (
    <g className="transition-all duration-300 ease-out origin-center">
      <circle
        cx={cx}
        cy={cy}
        r={isHovered ? 12 : 8}
        fill={color}
        fillOpacity={isDimmed ? 0.15 : (isHovered ? 1 : 0.75)}
        stroke={isDimmed ? "transparent" : "hsl(var(--background))"}
        strokeWidth={isHovered ? 2 : 1.5}
        className={cn("transition-all duration-300 ease-out cursor-pointer")}
        style={{ filter: isHovered ? "drop-shadow(0px 4px 8px rgba(0,0,0,0.4))" : "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))" }}
      />
    </g>
  );
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export function SectionEfficiencyQuadrant() {
  const period = useConfigStore((s) => s.period);
  const { data, isLoading, error } = useSWR<SectionEfficiencyResponse>(
    ["/api/analysis/section-efficiency", period],
    () => swrFetcher(`/api/analysis/section-efficiency?period=${period}`)
  );

  const [activeQuadrant, setActiveQuadrant] = useState<QuadrantId | null>(null);
  const [activeCc, setActiveCc] = useState<string | null>(null);

  const rows: SectionRow[] = data?.sections ?? [];

  const { coloredData, midX, midY } = useMemo(() => {
    if (rows.length === 0) return { coloredData: [], midX: 0, midY: 0 };
    
    const mX = rows.reduce((s, r) => s + r.contact_rate, 0) / rows.length;
    const mY = rows.reduce((s, r) => s + r.paid_rate, 0) / rows.length;
    
    const mapped = rows.map((r) => {
      const qId = getQuadrant(r.contact_rate, r.paid_rate, mX, mY);
      return { ...r, qId };
    });
    
    return { coloredData: mapped, midX: mX, midY: mY };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        数据加载失败
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        暂无截面效率数据
      </div>
    );
  }

  // 截断越界值，防止极端数据让主要象限挤凑在一起
  const maxAxisX = (dataMax: number) => Math.min(dataMax, 1.5);
  const maxAxisY = (dataMax: number) => Math.min(dataMax, 1.0);

  return (
    <div className="space-y-4">
      {/* 现代互动面板 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(QUADRANTS).map(([id, config]) => {
            const qId = id as QuadrantId;
            const isActive = activeQuadrant === qId;
            return (
              <button
                key={id}
                onClick={() => setActiveQuadrant(isActive ? null : qId)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 select-none cursor-pointer",
                  config.classes,
                  isActive 
                    ? "ring-2 ring-offset-1 dark:ring-offset-slate-900 shadow-sm scale-105" 
                    : "opacity-70 hover:opacity-100 hover:shadow-sm"
                )}
              >
                {config.label}
              </button>
            );
          })}
          {activeQuadrant && (
            <button 
              onClick={() => setActiveQuadrant(null)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              取消过滤
            </button>
          )}
        </div>
        <DataSourceBadge source={data?.data_source} />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
        
        {/* 在背景增加一个极简的玻璃反射光晕（修饰作用） */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 blur-3xl pointer-events-none" />

        <ResponsiveContainer width="100%" height={560} aria-label="效率四象限散点图">
          <ScatterChart 
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            onMouseLeave={() => setActiveCc(null)} // 鼠标离开图表区时清除高亮
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis tickLine={false} axisLine={false} type="number"
              dataKey="contact_rate"
              name="触达率"
              tickFormatter={pct}
              tick={{ fontSize: CHART_FONT_SIZE.md, fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, maxAxisX]}
              allowDataOverflow={true}
              label={{ value: "触达率", position: "insideBottom", offset: -15, fontSize: CHART_FONT_SIZE.md, fill: 'hsl(var(--foreground))', fontWeight: 500 }} />
            <YAxis tickLine={false} axisLine={false} type="number"
              dataKey="paid_rate"
              name="付费率"
              tickFormatter={pct}
              tick={{ fontSize: CHART_FONT_SIZE.md, fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, maxAxisY]}
              allowDataOverflow={true}
              label={{ value: "付费率", angle: -90, position: "insideLeft", fontSize: CHART_FONT_SIZE.md, fill: 'hsl(var(--foreground))', fontWeight: 500 }} />
            <ZAxis range={[100, 100]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
              formatter={(value: number) => pct(value)}
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;
                const d = payload[0]?.payload as SectionRow & { qId: QuadrantId };
                return (
                  <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl p-4 text-sm min-w-[180px] z-50 transition-all">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2 mb-3">
                      <p className="font-bold text-slate-800 dark:text-slate-100">
                        {d.cc_name}
                      </p>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: QUADRANTS[d.qId].color }}></span>
                    </div>
                    <div className="space-y-2 text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between items-center group/item hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded px-1 -mx-1 transition-colors"><span>触达率：</span><span className="font-medium text-slate-900 dark:text-white">{pct(d.contact_rate)}</span></div>
                      <div className="flex justify-between items-center group/item hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded px-1 -mx-1 transition-colors"><span>预约率：</span><span className="font-medium text-slate-900 dark:text-white">{pct(d.reserve_rate)}</span></div>
                      <div className="flex justify-between items-center group/item hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded px-1 -mx-1 transition-colors"><span>出席率：</span><span className="font-medium text-slate-900 dark:text-white">{pct(d.attend_rate)}</span></div>
                      <div className="flex justify-between items-center group/item hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded px-1 -mx-1 transition-colors mt-2 pt-1 border-t border-slate-50 dark:border-slate-700">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">付费转化：</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">{pct(d.paid_rate)}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine
              x={midX}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              opacity={0.5}
              label={{ value: `触达均值(${pct(midX)})`, position: "top", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <ReferenceLine
              y={midY}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              opacity={0.5}
              label={{ value: `转化均值(${pct(midY)})`, position: "right", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <Scatter
              data={coloredData}
              onMouseEnter={(e) => {
                if (e?.payload) setActiveCc((e.payload as SectionRow).cc_name);
              }}
              shape={(props: any) => (
                <CustomDot
                  {...props}
                  activeCc={activeCc}
                  activeQuadrant={activeQuadrant}
                />
              )}
            >
              {coloredData.map((entry, index) => (
                <Cell key={`cell-${index}`} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400 italic">
          <p className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            支持点击上方胶囊按钮聚焦特定象限；图表 X 轴最高截断至 150%。
          </p>
        </div>
      </div>
    </div>
  );
}



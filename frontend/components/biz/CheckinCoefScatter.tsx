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
  Label,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

interface MergedCC {
  cc_name: string;
  team?: string | null;
  checkin_24h_rate?: number | null;
  referral_coefficient_24h?: number | null;
  conversion_ratio?: number | null;
}

interface CheckinCoefScatterProps {
  data: MergedCC[];
}

type QuadrantId = "Q1" | "Q2" | "Q3" | "Q4";

const QUADRANTS: Record<QuadrantId, { label: string; color: string; classes: string }> = {
  Q1: { label: "明星 (高打卡·高系数)", color: "hsl(var(--success))", classes: "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 ring-emerald-500" },
  Q2: { label: "待激活 (高打卡·低系数)", color: "hsl(var(--chart-amber))", classes: "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 ring-amber-500" },
  Q3: { label: "天赋型 (低打卡·高系数)", color: "hsl(var(--chart-2))", classes: "text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20 ring-sky-500" },
  Q4: { label: "需关注 (低打卡·低系数)", color: "hsl(var(--destructive))", classes: "text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 ring-rose-500" },
};

function getQuadrantId(x: number, y: number, meanX: number, meanY: number): QuadrantId {
  if (x >= meanX && y >= meanY) return "Q1";
  if (x >= meanX && y < meanY) return "Q2";
  if (x < meanX && y >= meanY) return "Q3";
  return "Q4";
}

interface ProcessedPoint {
  cc_name: string;
  team?: string | null;
  x: number;
  y: number;
  z: number;
  qId: QuadrantId;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: ProcessedPoint;
  activeCc: string | null;
  activeQuadrant: QuadrantId | null;
}

function CustomDot({ cx = 0, cy = 0, payload, activeCc, activeQuadrant }: CustomDotProps) {
  if (!payload) return null;

  const isFilteredOut = activeQuadrant !== null && activeQuadrant !== payload.qId;
  if (isFilteredOut) return null;

  const isHovered = activeCc === payload.cc_name;
  const isDimmed = activeCc !== null && !isHovered;

  const color = QUADRANTS[payload.qId].color;
  // 点的大小根据转化率(z)推算，最小5，最大15
  const baseR = 5 + Math.min(payload.z * 20, 10);
  const r = isHovered ? baseR * 1.5 : baseR; 

  return (
    <g className="transition-all duration-300 ease-out origin-center">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        fillOpacity={isDimmed ? 0.15 : (isHovered ? 1 : 0.75)}
        stroke={isDimmed ? "transparent" : (isHovered ? "hsl(var(--background))" : color)}
        strokeWidth={isHovered ? 2 : 1.5}
        className={cn("transition-all duration-300 ease-out cursor-pointer")}
        style={{ filter: isHovered ? "drop-shadow(0px 4px 8px rgba(0,0,0,0.4))" : "drop-shadow(0px 1px 2px rgba(0,0,0,0.1))" }}
      />
    </g>
  );
}

export function CheckinCoefScatter({ data }: CheckinCoefScatterProps) {
  const [activeQuadrant, setActiveQuadrant] = useState<QuadrantId | null>(null);
  const [activeCc, setActiveCc] = useState<string | null>(null);

  const { points, meanX, meanY } = useMemo(() => {
    if (!data.length) return { points: [], meanX: 0, meanY: 0 };

    const rawPoints = data.map((cc) => ({
      cc_name: cc.cc_name,
      team: cc.team,
      x: cc.checkin_24h_rate ?? 0,
      y: cc.referral_coefficient_24h ?? 0,
      z: cc.conversion_ratio ?? 0,
    }));

    const mX = rawPoints.reduce((s, p) => s + p.x, 0) / rawPoints.length;
    const mY = rawPoints.reduce((s, p) => s + p.y, 0) / rawPoints.length;

    const processed = rawPoints.map(p => ({
      ...p,
      qId: getQuadrantId(p.x, p.y, mX, mY),
    }));

    return { points: processed, meanX: mX, meanY: mY };
  }, [data]);

  if (!points.length) {
    return (
      <div className="flex items-center justify-center h-52 text-slate-400 text-sm">
        暂无散点图数据
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 现代互动筛选面板 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(QUADRANTS).map(([id, config]) => {
            const qId = id as QuadrantId;
            const isActive = activeQuadrant === qId;
            return (
              <button
                key={id}
                onClick={() => setActiveQuadrant(isActive ? null : qId)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 select-none cursor-pointer flex items-center gap-1.5",
                  config.classes,
                  isActive
                    ? "ring-2 ring-offset-1 dark:ring-offset-slate-900 shadow-sm scale-105"
                    : "opacity-75 hover:opacity-100 hover:shadow-sm"
                )}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
                {config.label}
              </button>
            );
          })}
          {activeQuadrant && (
            <button
              onClick={() => setActiveQuadrant(null)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              重置
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden group">
        
        {/* 微弱的沉浸式全局光晕 */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-80 h-80 rounded-full bg-gradient-to-br from-sky-500/5 to-emerald-500/5 blur-3xl pointer-events-none" />

        <ResponsiveContainer width="100%" height={380} aria-label="打卡带新散点图">
          <ScatterChart 
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            onMouseLeave={() => setActiveCc(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="x"
              type="number"
              domain={[0, 1]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            >
              <Label
                value="24H 打卡率"
                position="insideBottom"
                offset={-15}
                style={{ fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 500 }}
              />
            </XAxis>
            <YAxis dataKey="y"
              type="number"
              tickFormatter={(v) => v.toFixed(1)}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              domain={[0, 'auto']}
              allowDataOverflow={true}
            >
              <Label
                value="带新系数"
                angle={-90}
                position="insideLeft"
                offset={0}
                style={{ fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 500 }}
              />
            </YAxis>
            
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as ProcessedPoint;
                return (
                  <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl p-4 text-sm min-w-[180px] z-50">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2 mb-3">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{d.cc_name}</p>
                        {d.team && <p className="text-xs text-slate-400 font-medium mt-0.5">{d.team}</p>}
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: QUADRANTS[d.qId].color }} />
                    </div>
                    <div className="space-y-2 text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between items-center group/item hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded px-1 -mx-1 transition-colors">
                        <span>24H 打卡率：</span>
                        <span className="font-medium text-slate-900 dark:text-white">{(d.x * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center group/item hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded px-1 -mx-1 transition-colors">
                        <span>带新系数：</span>
                        <span className="font-medium text-slate-900 dark:text-white">{d.y.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center group/item hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded px-1 -mx-1 transition-colors mt-2 pt-1 border-t border-slate-50 dark:border-slate-700">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">转化率：</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">{(d.z * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            
            <ReferenceLine
              x={meanX}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              opacity={0.5}
              label={{ value: `打卡均值(${(meanX * 100).toFixed(0)}%)`, position: "top", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <ReferenceLine
              y={meanY}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              opacity={0.5}
              label={{ value: `系数均值(${meanY.toFixed(1)})`, position: "right", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            
            <Scatter
              data={points}
              onMouseEnter={(e) => {
                if (e?.payload) setActiveCc((e.payload as ProcessedPoint).cc_name);
              }}
              shape={(props: any) => (
                <CustomDot
                  {...props}
                  activeCc={activeCc}
                  activeQuadrant={activeQuadrant}
                />
              )}
            >
              {points.map((entry, index) => (
                <Cell key={`cell-${index}`} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400 italic px-2">
          <p className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            支持点击胶囊按钮过滤特定人群。散点半径大小与个人的付费转化率呈正相关。
          </p>
        </div>
      </div>
    </div>
  );
}

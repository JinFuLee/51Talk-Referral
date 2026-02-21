"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";

export interface TeamPackageItem {
  product_type: string;
  ratio: number;
}

export interface TeamPackageRow {
  team: string;
  items: TeamPackageItem[];
}

interface TeamPackageCompareProps {
  teams: TeamPackageRow[];
}

const TEAM_COLORS = [
  "hsl(var(--chart-4))",
  "hsl(var(--success))",
  "hsl(var(--chart-amber))",
  "hsl(var(--chart-rose))",
  "hsl(var(--chart-sky))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-orange))",
];

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-xl shadow-flash p-3 text-xs max-w-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} style={{ color: entry.color }} className="text-xs">
          {entry.name}: {(entry.value * 100).toFixed(1)}%
        </p>
      ))}
    </div>
  );
}

export function TeamPackageCompare({ teams }: TeamPackageCompareProps) {
  if (!teams.length) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-slate-400">
        暂无小组套餐数据
      </div>
    );
  }

  // Collect all product types
  const allTypes = Array.from(
    new Set(teams.flatMap((t) => t.items.map((i) => i.product_type)))
  );

  // Build radar data: one row per product_type, columns = team ratios
  const radarData = allTypes.map((type) => {
    const row: Record<string, string | number> = { product_type: type };
    teams.forEach((team) => {
      const found = team.items.find((i) => i.product_type === type);
      row[team.team] = found ? found.ratio : 0;
    });
    return row;
  });

  // Limit to 6 teams max for readability
  const displayTeams = teams.slice(0, 6);

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-lg font-bold text-slate-800">{displayTeams.length} 个小组</span>
        <span className="text-xs text-slate-400">
          套餐结构雷达对比 · {allTypes.length} 种套餐
        </span>
      </div>

      <ResponsiveContainer width="100%" height={CHART_HEIGHT.lg} aria-label="小组套餐结构雷达图">
        <RadarChart data={radarData} margin={{ top: 8, right: 32, left: 32, bottom: 8 }}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="product_type"
            tick={{ fontSize: CHART_FONT_SIZE.md, fill: "hsl(var(--muted-foreground))" }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 1]}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: CHART_FONT_SIZE.sm, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: CHART_FONT_SIZE.md }} />
          {displayTeams.map((team, idx) => (
            <Radar
              key={team.team}
              name={team.team}
              dataKey={team.team}
              stroke={TEAM_COLORS[idx % TEAM_COLORS.length]}
              fill={TEAM_COLORS[idx % TEAM_COLORS.length]}
              fillOpacity={0.12}
              strokeWidth={1.5}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>

      {/* Summary table */}
      <div className="mt-3 border-t border-slate-100 pt-3 overflow-x-auto">
        <table className="w-full text-xs text-slate-600">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 pr-3 font-medium text-slate-400 whitespace-nowrap">
                套餐类型
              </th>
              {displayTeams.map((team, idx) => (
                <th
                  key={team.team}
                  className="text-right py-2 px-2 font-medium whitespace-nowrap"
                  style={{ color: TEAM_COLORS[idx % TEAM_COLORS.length] }}
                >
                  {team.team}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allTypes.map((type, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
              >
                <td className="py-1.5 pr-3 text-slate-600 whitespace-nowrap">{type}</td>
                {displayTeams.map((team, colIdx) => {
                  const found = team.items.find((i) => i.product_type === type);
                  const ratio = found ? found.ratio : null;
                  return (
                    <td key={colIdx} className="text-right py-1.5 px-2">
                      {ratio != null ? (
                        <span
                          className={
                            ratio > 0.3
                              ? "font-semibold text-indigo-600"
                              : ratio > 0.15
                              ? "text-slate-700"
                              : "text-slate-400"
                          }
                        >
                          {(ratio * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

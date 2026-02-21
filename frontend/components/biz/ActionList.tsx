"use client";

import { cn } from "@/lib/utils";

type Priority = "high" | "medium" | "low";

export interface ActionItem {
  text: string;
  priority?: Priority;
  metric?: string;
  target?: string;
}

interface ActionListProps {
  items: ActionItem[];
  className?: string;
}

const priorityStyle: Record<Priority, string> = {
  high: "bg-destructive/10 border-destructive/30 text-destructive",
  medium: "bg-warning/10 border-warning/30 text-warning",
  low: "bg-slate-50 border-slate-200 text-slate-700",
};

const priorityLabel: Record<Priority, string> = {
  high: "紧急",
  medium: "重要",
  low: "建议",
};

export function ActionList({ items, className }: ActionListProps) {
  return (
    <ol className={cn("space-y-2", className)}>
      {items.map((item, i) => {
        const p = item.priority ?? "low";
        return (
          <li
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
              priorityStyle[p]
            )}
          >
            <span className="shrink-0 font-bold w-5 text-center">{i + 1}.</span>
            <div className="flex-1">
              <span>{item.text}</span>
              {item.target && (
                <span className="ml-2 font-semibold">→ {item.target}</span>
              )}
            </div>
            <span className="shrink-0 text-xs font-medium opacity-70">
              {priorityLabel[p]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

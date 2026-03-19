"use client";

interface LifecycleBadgeProps {
  lifecycle: string;
}

function getBadgeStyle(lifecycle: string): string {
  const normalized = lifecycle.trim().toUpperCase();
  if (normalized === "0M" || normalized === "0") return "bg-green-100 text-green-700 border-green-200";
  if (normalized === "1M" || normalized === "1") return "bg-blue-100 text-blue-700 border-blue-200";
  if (normalized === "2M" || normalized === "2") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function getLifecycleLabel(lifecycle: string): string {
  const normalized = lifecycle.trim().toUpperCase();
  if (normalized === "0M" || normalized === "0") return "0M";
  if (normalized === "1M" || normalized === "1") return "1M";
  if (normalized === "2M" || normalized === "2") return "2M";
  if (normalized === "3M" || normalized === "3") return "3M";
  return lifecycle;
}

export function LifecycleBadge({ lifecycle }: LifecycleBadgeProps) {
  const style = getBadgeStyle(lifecycle);
  const label = getLifecycleLabel(lifecycle);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${style}`}
      title={`生命周期: ${label}`}
    >
      {label}
    </span>
  );
}

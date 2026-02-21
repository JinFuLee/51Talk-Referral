"use client";

interface RoleSwitcherProps {
  role: "ops" | "exec" | "finance";
  onRoleChange: (role: "ops" | "exec" | "finance") => void;
  lang: "zh" | "th";
}

const ROLE_LABELS: Record<"ops" | "exec" | "finance", { zh: string; th: string }> = {
  ops: { zh: "运营", th: "ปฏิบัติการ" },
  exec: { zh: "管理层", th: "ผู้บริหาร" },
  finance: { zh: "财务", th: "การเงิน" },
};

export function RoleSwitcher({ role, onRoleChange, lang }: RoleSwitcherProps) {
  return (
    <select
      value={role}
      onChange={(e) => onRoleChange(e.target.value as "ops" | "exec" | "finance")}
      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {(Object.keys(ROLE_LABELS) as Array<"ops" | "exec" | "finance">).map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r][lang]}
        </option>
      ))}
    </select>
  );
}

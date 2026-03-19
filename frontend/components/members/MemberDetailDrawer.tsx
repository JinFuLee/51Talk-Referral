"use client";

interface StudentDetail {
  id: number;
  name?: string;
  enclosure?: string;
  lifecycle?: string;
  cc_name?: string;
  cc_group?: string;
  ss_name?: string;
  ss_group?: string;
  lp_name?: string;
  lp_group?: string;
  registrations?: number;
  appointments?: number;
  attendance?: number;
  payments?: number;
  revenue_usd?: number;
  [key: string]: unknown;
}

interface MemberDetailDrawerProps {
  student: StudentDetail | null;
  open: boolean;
  onClose: () => void;
}

const FIELD_GROUPS: { title: string; fields: [string, string][] }[] = [
  {
    title: "基本信息",
    fields: [
      ["id", "学员 ID"],
      ["name", "姓名"],
      ["enclosure", "围场段"],
      ["lifecycle", "生命周期"],
    ],
  },
  {
    title: "CC 跟进",
    fields: [
      ["cc_name", "CC 姓名"],
      ["cc_group", "CC 组别"],
      ["ss_name", "SS 姓名"],
      ["ss_group", "SS 组别"],
      ["lp_name", "LP 姓名"],
      ["lp_group", "LP 组别"],
    ],
  },
  {
    title: "转介绍漏斗",
    fields: [
      ["registrations", "注册数"],
      ["appointments", "预约数"],
      ["attendance", "出席数"],
      ["payments", "付费数"],
      ["revenue_usd", "业绩 (USD)"],
    ],
  },
];

function formatValue(key: string, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (key === "revenue_usd" && typeof value === "number") {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return String(value);
}

export function MemberDetailDrawer({ student, open, onClose }: MemberDetailDrawerProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="学员详情"
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div
        className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-slate-900">
            {student ? `学员 #${student.id}` : "学员详情"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 transition-colors"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!student ? (
            <div className="text-center py-8 text-sm text-slate-400">未找到学员信息</div>
          ) : (
            FIELD_GROUPS.map((group) => (
              <section key={group.title}>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  {group.title}
                </h3>
                <dl className="space-y-2">
                  {group.fields.map(([key, label]) => (
                    <div key={key} className="flex items-start justify-between gap-3">
                      <dt className="text-xs text-slate-400 shrink-0 w-24">{label}</dt>
                      <dd className="text-sm font-medium text-slate-700 text-right break-all">
                        {formatValue(key, student[key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))
          )}

          {student && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                其他字段
              </h3>
              <dl className="space-y-2">
                {Object.entries(student)
                  .filter(([key]) =>
                    !FIELD_GROUPS.flatMap((g) => g.fields.map(([k]) => k)).includes(key)
                  )
                  .map(([key, val]) => (
                    <div key={key} className="flex items-start justify-between gap-3">
                      <dt className="text-xs text-slate-400 shrink-0 w-24 truncate" title={key}>
                        {key}
                      </dt>
                      <dd className="text-xs text-slate-600 text-right break-all">
                        {formatValue(key, val)}
                      </dd>
                    </div>
                  ))}
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

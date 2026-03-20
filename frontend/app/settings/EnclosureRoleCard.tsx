'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';

const ENCLOSURE_KEYS = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6+'] as const;
type EnclosureMonth = (typeof ENCLOSURE_KEYS)[number];

const ROLES = ['CC', 'SS', 'LP', '运营'] as const;
type Role = (typeof ROLES)[number];

type EnclosureRoleAssignment = Record<EnclosureMonth, Role[]>;

const DEFAULT_ASSIGNMENT: EnclosureRoleAssignment = {
  M0: ['CC'],
  M1: ['CC'],
  M2: ['CC', 'SS'],
  M3: ['LP'],
  M4: ['LP'],
  M5: ['LP'],
  'M6+': ['运营'],
};

const STORAGE_KEY = 'enclosure_role_assignment';

function load(): EnclosureRoleAssignment {
  if (typeof window === 'undefined') return DEFAULT_ASSIGNMENT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ASSIGNMENT;
    return JSON.parse(raw) as EnclosureRoleAssignment;
  } catch {
    return DEFAULT_ASSIGNMENT;
  }
}

function save(assignment: EnclosureRoleAssignment) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignment));
  } catch {
    // ignore
  }
}

export default function EnclosureRoleCard() {
  const [assignment, setAssignment] = useState<EnclosureRoleAssignment>(DEFAULT_ASSIGNMENT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAssignment(load());
  }, []);

  function toggle(month: EnclosureMonth, role: Role) {
    setAssignment((prev) => {
      const current = prev[month] ?? [];
      const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
      return { ...prev, [month]: next };
    });
    setSaved(false);
  }

  function handleSave() {
    save(assignment);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    setAssignment(DEFAULT_ASSIGNMENT);
    save(DEFAULT_ASSIGNMENT);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card
      title="围场-岗位负责配置"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            重置默认
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-brand-600 text-white rounded text-xs font-medium hover:bg-brand-700 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-500"
          >
            {saved ? '已保存' : '保存'}
          </button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--n-800)] text-white text-xs font-medium">
              <th className="text-left py-1.5 px-3">围场</th>
              {ROLES.map((role) => (
                <th key={role} className="text-center py-1.5 px-3">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ENCLOSURE_KEYS.map((month, i) => (
              <tr
                key={month}
                className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}
              >
                <td className="py-2 px-3 text-xs font-medium text-[var(--text-primary)]">
                  {month}
                </td>
                {ROLES.map((role) => {
                  const checked = (assignment[month] ?? []).includes(role);
                  return (
                    <td key={role} className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(month, role)}
                        className="w-4 h-4 rounded border-slate-300 text-brand-600 accent-[var(--brand-600)] cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500"
                        aria-label={`${month} 由 ${role} 服务`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        勾选 = 该围场由该岗位服务；允许多选（同一围场可由多岗位共同负责）。配置保存在本地浏览器。
      </p>
    </Card>
  );
}

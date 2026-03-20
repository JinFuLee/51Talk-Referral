'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';

const ENCLOSURE_KEYS = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6+'] as const;
type EnclosureMonth = (typeof ENCLOSURE_KEYS)[number];

const ROLES = ['CC', 'SS', 'LP', '运营'] as const;
type Role = (typeof ROLES)[number];

type EnclosureRoleAssignment = Record<EnclosureMonth, Role[]>;

// 窄口径默认：CC/SS/LP 主动联系，M0-M2→CC, M2→CC+SS, M3+→LP
const DEFAULT_NARROW: EnclosureRoleAssignment = {
  M0: ['CC'],
  M1: ['CC'],
  M2: ['CC', 'SS'],
  M3: ['LP'],
  M4: ['LP'],
  M5: ['LP'],
  'M6+': ['LP'],
};

// 宽口径默认：学员自主打卡，M0-M2→CC, M3→SS, M4-M5→LP, M6+→运营
const DEFAULT_WIDE: EnclosureRoleAssignment = {
  M0: ['CC'],
  M1: ['CC'],
  M2: ['CC'],
  M3: ['SS'],
  M4: ['LP'],
  M5: ['LP'],
  'M6+': ['运营'],
};

const STORAGE_KEY_NARROW = 'enclosure_role_narrow';
const STORAGE_KEY_WIDE = 'enclosure_role_wide';

// 保留旧 key 兼容（旧版只有一套配置，迁移到窄口径）
const STORAGE_KEY_LEGACY = 'enclosure_role_assignment';

function loadAssignment(key: string, defaultVal: EnclosureRoleAssignment): EnclosureRoleAssignment {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as EnclosureRoleAssignment;
    // 旧数据迁移：如果是窄口径 key 且旧 key 有数据
    if (key === STORAGE_KEY_NARROW) {
      const legacy = localStorage.getItem(STORAGE_KEY_LEGACY);
      if (legacy) return JSON.parse(legacy) as EnclosureRoleAssignment;
    }
    return defaultVal;
  } catch {
    return defaultVal;
  }
}

function saveAssignment(key: string, assignment: EnclosureRoleAssignment) {
  try {
    localStorage.setItem(key, JSON.stringify(assignment));
  } catch {
    // ignore
  }
}

interface AssignmentTableProps {
  title: string;
  subtitle: string;
  storageKey: string;
  defaultVal: EnclosureRoleAssignment;
}

function AssignmentTable({ title, subtitle, storageKey, defaultVal }: AssignmentTableProps) {
  const [assignment, setAssignment] = useState<EnclosureRoleAssignment>(defaultVal);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAssignment(loadAssignment(storageKey, defaultVal));
  }, [storageKey, defaultVal]);

  function toggle(month: EnclosureMonth, role: Role) {
    setAssignment((prev) => {
      const current = prev[month] ?? [];
      const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
      return { ...prev, [month]: next };
    });
    setSaved(false);
  }

  function handleSave() {
    saveAssignment(storageKey, assignment);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    setAssignment(defaultVal);
    saveAssignment(storageKey, defaultVal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
          <span className="ml-2 text-xs text-[var(--text-muted)]">{subtitle}</span>
        </div>
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
      </div>
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
    </div>
  );
}

export default function EnclosureRoleCard() {
  return (
    <Card title="围场-岗位负责配置">
      <div className="space-y-6">
        <AssignmentTable
          title="窄口径负责配置"
          subtitle="CC/SS/LP 主动联系场景"
          storageKey={STORAGE_KEY_NARROW}
          defaultVal={DEFAULT_NARROW}
        />
        <div className="border-t border-slate-100" />
        <AssignmentTable
          title="宽口径负责配置"
          subtitle="学员自主打卡场景（打卡面板使用）"
          storageKey={STORAGE_KEY_WIDE}
          defaultVal={DEFAULT_WIDE}
        />
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        勾选 = 该围场由该岗位服务；允许多选。配置保存在本地浏览器，打卡面板读取宽口径配置。
      </p>
    </Card>
  );
}

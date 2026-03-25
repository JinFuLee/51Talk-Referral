'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/Card';
import { configAPI, swrFetcher } from '@/lib/api';

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

// 旧 localStorage keys（一次性迁移用）
const STORAGE_KEY_NARROW = 'enclosure_role_narrow';
const STORAGE_KEY_WIDE = 'enclosure_role_wide';
const STORAGE_KEY_LEGACY = 'enclosure_role_assignment';

function readLocalStorage(key: string): EnclosureRoleAssignment | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as EnclosureRoleAssignment;
  } catch {
    /* ignore */
  }
  return null;
}

interface AssignmentTableProps {
  title: string;
  subtitle: string;
  assignment: EnclosureRoleAssignment;
  defaultVal: EnclosureRoleAssignment;
  onSave: (data: EnclosureRoleAssignment) => Promise<void>;
}

function AssignmentTable({
  title,
  subtitle,
  assignment: initialAssignment,
  defaultVal,
  onSave,
}: AssignmentTableProps) {
  const [assignment, setAssignment] = useState<EnclosureRoleAssignment>(initialAssignment);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // 当父组件 SWR 数据更新时同步
  useEffect(() => {
    setAssignment(initialAssignment);
  }, [initialAssignment]);

  function toggle(month: EnclosureMonth, role: Role) {
    setAssignment((prev) => {
      const current = prev[month] ?? [];
      const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
      return { ...prev, [month]: next };
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(assignment);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      await onSave(defaultVal);
      setAssignment(defaultVal);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
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
            disabled={saving}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
          >
            重置默认
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 bg-action text-white rounded text-xs font-medium hover:bg-action-active transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-action disabled:opacity-40"
          >
            {saving ? '保存中…' : saved ? '已保存' : '保存'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row text-xs">
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
                className={`border-b border-[var(--border-subtle)] ${i % 2 === 1 ? 'bg-[var(--bg-primary)]/50' : ''}`}
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
                        className="w-4 h-4 rounded border-[var(--border-hover)] text-action accent-action cursor-pointer focus-visible:ring-2 focus-visible:ring-action"
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
  const { data, mutate, isLoading, error } = useSWR<Record<string, Record<string, string[]>>>(
    '/api/config/enclosure-role',
    swrFetcher
  );

  // 一次性 localStorage→API 迁移
  useEffect(() => {
    if (isLoading) return;
    const apiHasData =
      data &&
      (Object.keys(data.narrow ?? {}).length > 0 || Object.keys(data.wide ?? {}).length > 0);
    if (!apiHasData) {
      // 尝试从旧 localStorage 读取
      const legacyNarrow =
        readLocalStorage(STORAGE_KEY_NARROW) ?? readLocalStorage(STORAGE_KEY_LEGACY);
      const legacyWide = readLocalStorage(STORAGE_KEY_WIDE);
      if (legacyNarrow || legacyWide) {
        const migrateData = {
          narrow: (legacyNarrow ?? DEFAULT_NARROW) as Record<string, string[]>,
          wide: (legacyWide ?? DEFAULT_WIDE) as Record<string, string[]>,
        };
        configAPI
          .putEnclosureRole(migrateData)
          .then(() => {
            mutate(migrateData, false);
            // 清除旧 localStorage
            try {
              localStorage.removeItem(STORAGE_KEY_NARROW);
              localStorage.removeItem(STORAGE_KEY_WIDE);
              localStorage.removeItem(STORAGE_KEY_LEGACY);
            } catch {
              /* ignore */
            }
          })
          .catch(() => {
            /* 迁移失败静默忽略，下次会重试 */
          });
      }
    }
  }, [isLoading, data, mutate]);

  const narrowAssignment = (data?.narrow as EnclosureRoleAssignment | undefined) ?? DEFAULT_NARROW;
  const wideAssignment = (data?.wide as EnclosureRoleAssignment | undefined) ?? DEFAULT_WIDE;

  async function handleSaveNarrow(newAssignment: EnclosureRoleAssignment) {
    const newData = {
      narrow: newAssignment as Record<string, string[]>,
      wide: (data?.wide ?? DEFAULT_WIDE) as Record<string, string[]>,
    };
    await configAPI.putEnclosureRole(newData);
    await mutate(newData, false);
    // 通知打卡面板刷新（同 tab 内 storage 事件不触发，用自定义事件）
    window.dispatchEvent(new Event('enclosure-role-changed'));
  }

  async function handleSaveWide(newAssignment: EnclosureRoleAssignment) {
    const newData = {
      narrow: (data?.narrow ?? DEFAULT_NARROW) as Record<string, string[]>,
      wide: newAssignment as Record<string, string[]>,
    };
    await configAPI.putEnclosureRole(newData);
    await mutate(newData, false);
    window.dispatchEvent(new Event('enclosure-role-changed'));
  }

  return (
    <Card title="围场-岗位负责配置">
      {isLoading && (
        <div className="py-4 text-center text-xs text-[var(--text-muted)]">加载中…</div>
      )}
      {error && !isLoading && (
        <div className="py-2 text-xs text-[var(--color-danger)]">加载配置失败，使用本地默认值</div>
      )}
      {!isLoading && (
        <div className="space-y-6">
          <AssignmentTable
            title="窄口径负责配置"
            subtitle="CC/SS/LP 主动联系场景"
            assignment={narrowAssignment}
            defaultVal={DEFAULT_NARROW}
            onSave={handleSaveNarrow}
          />
          <div className="border-t border-[var(--border-subtle)]" />
          <AssignmentTable
            title="宽口径负责配置"
            subtitle="学员自主打卡场景（打卡面板使用）"
            assignment={wideAssignment}
            defaultVal={DEFAULT_WIDE}
            onSave={handleSaveWide}
          />
        </div>
      )}
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        勾选 = 该围场由该岗位服务；允许多选。配置持久化到服务端，打卡面板读取宽口径配置。
      </p>
    </Card>
  );
}

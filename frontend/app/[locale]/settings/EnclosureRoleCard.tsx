'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { configAPI } from '@/lib/api';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';

const ENCLOSURE_KEYS = [
  'M0',
  'M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'M6',
  'M7',
  'M8',
  'M9',
  'M10',
  'M11',
  'M12',
  'M12+',
] as const;
type EnclosureMonth = (typeof ENCLOSURE_KEYS)[number];

const ENCLOSURE_DISPLAY: Record<string, string> = {
  M0: 'M0（0~30）',
  M1: 'M1（31~60）',
  M2: 'M2（61~90）',
  M3: 'M3（91~120）',
  M4: 'M4（121~150）',
  M5: 'M5（151~180）',
  M6: 'M6（181~210）',
  M7: 'M7（211~240）',
  M8: 'M8（241~270）',
  M9: 'M9（271~300）',
  M10: 'M10（301~330）',
  M11: 'M11（331~360）',
  M12: 'M12（361~390）',
  'M12+': 'M12+（391+）',
};

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
  M6: ['LP'],
  M7: ['LP'],
  M8: ['LP'],
  M9: ['LP'],
  M10: ['LP'],
  M11: ['LP'],
  M12: ['LP'],
  'M12+': ['LP'],
};

// 宽口径默认：学员自主打卡，M0-M2→CC, M3→SS, M4-M5→LP, M6+→运营
const DEFAULT_WIDE: EnclosureRoleAssignment = {
  M0: ['CC'],
  M1: ['CC'],
  M2: ['CC'],
  M3: ['SS'],
  M4: ['LP'],
  M5: ['LP'],
  M6: ['运营'],
  M7: ['运营'],
  M8: ['运营'],
  M9: ['运营'],
  M10: ['运营'],
  M11: ['运营'],
  M12: ['运营'],
  'M12+': ['运营'],
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
  t: (key: string, params?: any) => string;
}

function AssignmentTable({
  title,
  subtitle,
  assignment: initialAssignment,
  defaultVal,
  onSave,
  t,
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
          <span className="text-sm font-semibold text-primary-token">{title}</span>
          <span className="ml-2 text-xs text-muted-token">{subtitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={saving}
            className="text-xs text-secondary-token hover:text-primary-token transition-colors disabled:opacity-40"
          >
            {t('resetBtn')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 bg-action text-white rounded text-xs font-medium hover:bg-action-active transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-action disabled:opacity-40"
          >
            {saving ? t('savingBtn') : saved ? t('savedBtn') : t('saveBtn')}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row text-xs">
              <th className="text-left py-1.5 px-3">{t('enclosureCol')}</th>
              {ROLES.map((role) => (
                <th key={role} className="text-center py-1.5 px-3">
                  {role === '运营' ? t('ops') : role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ENCLOSURE_KEYS.map((month, i) => (
              <tr
                key={month}
                className={`border-b border-subtle-token ${i % 2 === 1 ? 'bg-bg-primary/50' : ''}`}
              >
                <td className="py-2 px-3 text-xs font-medium text-primary-token">
                  {ENCLOSURE_DISPLAY[month] ?? month}
                </td>
                {ROLES.map((role) => {
                  const checked = (assignment[month] ?? []).includes(role);
                  return (
                    <td key={role} className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(month, role)}
                        className="w-4 h-4 rounded border-hover-token text-action accent-action cursor-pointer focus-visible:ring-2 focus-visible:ring-action"
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
  const t = useTranslations('EnclosureRoleCard');

  const { data, mutate, isLoading, error } = useFilteredSWR<
    Record<string, Record<string, string[]>>
  >('/api/config/enclosure-role');

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
    <Card title={t('cardTitle')}>
      {isLoading && <div className="py-4 text-center text-xs text-muted-token">{t('loading')}</div>}
      {error && !isLoading && <div className="py-2 text-xs text-danger-token">{t('loadError')}</div>}
      {!isLoading && (
        <div className="space-y-6">
          <AssignmentTable
            title={t('narrowTitle')}
            subtitle={t('narrowSubtitle')}
            assignment={narrowAssignment}
            defaultVal={DEFAULT_NARROW}
            onSave={handleSaveNarrow}
            t={t}
          />
          <div className="border-t border-subtle-token" />
          <AssignmentTable
            title={t('wideTitle')}
            subtitle={t('wideSubtitle')}
            assignment={wideAssignment}
            defaultVal={DEFAULT_WIDE}
            onSave={handleSaveWide}
            t={t}
          />
        </div>
      )}
      <p className="mt-3 text-xs text-muted-token">{t('hint')}</p>
    </Card>
  );
}

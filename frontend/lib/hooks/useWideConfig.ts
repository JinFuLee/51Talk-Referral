'use client';

import { useState, useEffect, useCallback } from 'react';

const ENCLOSURE_KEYS = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6+'] as const;
type EnclosureMonth = (typeof ENCLOSURE_KEYS)[number];
type Role = 'CC' | 'SS' | 'LP' | '运营';
type EnclosureRoleAssignment = Record<EnclosureMonth, Role[]>;

const DEFAULT_WIDE: EnclosureRoleAssignment = {
  M0: ['CC'],
  M1: ['CC'],
  M2: ['CC'],
  M3: ['SS'],
  M4: ['LP'],
  M5: ['LP'],
  'M6+': ['运营'],
};

const M_TO_DAYS: Record<string, { min: number; max: number | null }> = {
  M0: { min: 0, max: 30 },
  M1: { min: 31, max: 60 },
  M2: { min: 61, max: 90 },
  M3: { min: 91, max: 120 },
  M4: { min: 121, max: 150 },
  M5: { min: 151, max: 180 },
  'M6+': { min: 181, max: null },
};

/** 从 localStorage 读取宽口径配置 → 后端格式 { role: {min_days, max_days} } */
function loadWideConfig(): Record<string, { min_days: number; max_days: number | null }> {
  let assignment: EnclosureRoleAssignment = DEFAULT_WIDE;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('enclosure_role_wide');
      if (raw) assignment = JSON.parse(raw) as EnclosureRoleAssignment;
    } catch {
      /* fallback */
    }
  }

  const roleToMonths: Record<string, EnclosureMonth[]> = {};
  for (const month of ENCLOSURE_KEYS) {
    for (const role of assignment[month] ?? []) {
      if (!roleToMonths[role]) roleToMonths[role] = [];
      roleToMonths[role].push(month);
    }
  }

  const result: Record<string, { min_days: number; max_days: number | null }> = {};
  for (const [role, months] of Object.entries(roleToMonths)) {
    const dayRanges = months.map((m) => M_TO_DAYS[m]).filter(Boolean);
    if (dayRanges.length === 0) continue;
    const minDays = Math.min(...dayRanges.map((r) => r.min));
    const sorted = months
      .slice()
      .sort((a, b) => ENCLOSURE_KEYS.indexOf(a) - ENCLOSURE_KEYS.indexOf(b));
    const maxDays = M_TO_DAYS[sorted[sorted.length - 1]]?.max ?? null;
    result[role] = { min_days: minDays, max_days: maxDays };
  }
  return result;
}

/** 从 localStorage 读取角色→围场M标签映射 */
function getWideRoleEnclosures(): Record<string, string[]> {
  let assignment: EnclosureRoleAssignment = DEFAULT_WIDE;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('enclosure_role_wide');
      if (raw) assignment = JSON.parse(raw) as EnclosureRoleAssignment;
    } catch {
      /* fallback */
    }
  }
  const result: Record<string, string[]> = {};
  for (const month of ENCLOSURE_KEYS) {
    for (const role of assignment[month] ?? []) {
      if (!result[role]) result[role] = [];
      result[role].push(month);
    }
  }
  return result;
}

/**
 * 共享 hook：读取宽口径围场配置 + 自动监听 Settings 变更
 * 返回 { config: 后端格式, roleEnclosures: 角色→M标签映射, configJson: URL 编码用 }
 */
export function useWideConfig() {
  const [config, setConfig] = useState(() => loadWideConfig());
  const [roleEnclosures, setRoleEnclosures] = useState<Record<string, string[]>>({});

  const reload = useCallback(() => {
    setConfig(loadWideConfig());
    setRoleEnclosures(getWideRoleEnclosures());
  }, []);

  useEffect(() => {
    reload(); // 初始加载
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'enclosure_role_wide') reload();
    };
    const onCustom = () => reload();
    window.addEventListener('storage', onStorage);
    window.addEventListener('enclosure-role-changed', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('enclosure-role-changed', onCustom);
    };
  }, [reload]);

  const configJson = JSON.stringify(config);
  const activeRoles = Object.keys(roleEnclosures).filter(
    (r) => (roleEnclosures[r]?.length ?? 0) > 0
  );

  return { config, roleEnclosures, activeRoles, configJson };
}

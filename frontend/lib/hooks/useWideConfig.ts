'use client';

import { useMemo, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';

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
type Role = 'CC' | 'SS' | 'LP' | '运营';
type EnclosureRoleAssignment = Record<EnclosureMonth, Role[]>;

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

const M_TO_DAYS: Record<string, { min: number; max: number | null }> = {
  M0: { min: 0, max: 30 },
  M1: { min: 31, max: 60 },
  M2: { min: 61, max: 90 },
  M3: { min: 91, max: 120 },
  M4: { min: 121, max: 150 },
  M5: { min: 151, max: 180 },
  M6: { min: 181, max: 210 },
  M7: { min: 211, max: 240 },
  M8: { min: 241, max: 270 },
  M9: { min: 271, max: 300 },
  M10: { min: 301, max: 330 },
  M11: { min: 331, max: 360 },
  M12: { min: 361, max: 390 },
  'M12+': { min: 391, max: null },
};

/** API 返回的围场配置结构 */
interface EnclosureRoleApiResponse {
  narrow?: Record<string, string[]>;
  wide?: Record<string, string[]>;
}

/** 将 API 返回的 wide 配置安全转换为 EnclosureRoleAssignment */
function parseWideFromApi(apiWide: Record<string, string[]>): EnclosureRoleAssignment {
  const result: Record<string, Role[]> = {};
  for (const month of ENCLOSURE_KEYS) {
    const roles = apiWide[month];
    if (Array.isArray(roles)) {
      result[month] = roles.filter(
        (r): r is Role => r === 'CC' || r === 'SS' || r === 'LP' || r === '运营'
      );
    } else {
      result[month] = [];
    }
  }
  return result as EnclosureRoleAssignment;
}

/** 将围场-岗位分配矩阵转为后端 role_config 格式 */
function assignmentToConfig(
  assignment: EnclosureRoleAssignment
): Record<string, { min_days: number; max_days: number | null }> {
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

/** 将围场-岗位分配矩阵转为角色→围场M标签映射 */
function assignmentToRoleEnclosures(assignment: EnclosureRoleAssignment): Record<string, string[]> {
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
 * 共享 hook：从后端 API 读取宽口径围场配置（与 Settings 页面同源）
 *
 * 数据源变更历史：
 *   旧版：localStorage('enclosure_role_wide') — Settings 迁移后已删除
 *   新版：/api/config/enclosure-role → .wide 字段
 *
 * 返回 { config, roleEnclosures, activeRoles, configJson }
 */
export function useWideConfig() {
  const { data: apiData, mutate } = useSWR<EnclosureRoleApiResponse>(
    '/api/config/enclosure-role',
    swrFetcher,
    { refreshInterval: 60_000 }
  );

  // 从 API 读取宽口径配置，类型安全转换，fallback 到默认值
  const wideAssignment = useMemo<EnclosureRoleAssignment>(() => {
    if (apiData?.wide && Object.keys(apiData.wide).length > 0) {
      return parseWideFromApi(apiData.wide);
    }
    return DEFAULT_WIDE;
  }, [apiData]);

  const config = useMemo(() => assignmentToConfig(wideAssignment), [wideAssignment]);
  const roleEnclosures = useMemo(
    () => assignmentToRoleEnclosures(wideAssignment),
    [wideAssignment]
  );

  // 监听 Settings 页面的 'enclosure-role-changed' 事件，即时刷新 SWR
  const handleChange = useCallback(() => {
    void mutate();
  }, [mutate]);

  useEffect(() => {
    window.addEventListener('enclosure-role-changed', handleChange);
    return () => {
      window.removeEventListener('enclosure-role-changed', handleChange);
    };
  }, [handleChange]);

  const configJson = JSON.stringify(config);
  const activeRoles = Object.keys(roleEnclosures).filter(
    (r) => (roleEnclosures[r]?.length ?? 0) > 0
  );

  return { config, roleEnclosures, activeRoles, configJson };
}

'use client';

import { useLocale } from 'next-intl';

type RoleKey = 'ops' | 'exec' | 'finance';

interface RoleSwitcherProps {
  role: RoleKey;
  onRoleChange: (role: RoleKey) => void;
  /** @deprecated Locale is resolved via next-intl useLocale */
  lang?: string;
}

const ROLE_LABELS: Record<RoleKey, Record<string, string>> = {
  ops: { zh: '运营', 'zh-TW': '運營', en: 'Operations', th: 'ปฏิบัติการ' },
  exec: { zh: '管理层', 'zh-TW': '管理層', en: 'Executive', th: 'ผู้บริหาร' },
  finance: { zh: '财务', 'zh-TW': '財務', en: 'Finance', th: 'การเงิน' },
};

export function RoleSwitcher({ role, onRoleChange }: RoleSwitcherProps) {
  const locale = useLocale();
  return (
    <select
      value={role}
      onChange={(e) => onRoleChange(e.target.value as RoleKey)}
      className="text-xs border border-subtle-token rounded-md px-2 py-1 bg-surface text-primary-token focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {(Object.keys(ROLE_LABELS) as RoleKey[]).map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r][locale] ?? ROLE_LABELS[r]['zh']}
        </option>
      ))}
    </select>
  );
}

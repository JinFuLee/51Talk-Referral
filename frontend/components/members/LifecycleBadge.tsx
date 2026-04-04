'use client';

import { useTranslations } from 'next-intl';

interface LifecycleBadgeProps {
  lifecycle: string;
}

function getBadgeStyle(lifecycle: string): string {
  const normalized = lifecycle.trim().toUpperCase();
  if (normalized === '0M' || normalized === '0')
    return 'bg-[var(--color-success-surface)] text-[var(--color-success)] border-[var(--color-success)]';
  if (normalized === '1M' || normalized === '1')
    return 'bg-[var(--color-accent-surface)] text-[var(--color-accent)] border-[var(--color-accent)]';
  if (normalized === '2M' || normalized === '2')
    return 'bg-[var(--color-warning-surface)] text-[var(--color-warning)] border-[var(--color-warning)]';
  if (normalized === '3M' || normalized === '3')
    return 'bg-orange-100 text-orange-700 border-orange-200';
  if (normalized === '4M' || normalized === '4')
    return 'bg-orange-100 text-orange-600 border-orange-200';
  if (normalized === '5M' || normalized === '5')
    return 'bg-orange-100 text-orange-600 border-orange-200';
  if (['6M', '7M', '8M', '9M', '10M', '11M', '12M'].includes(normalized))
    return 'bg-[var(--color-danger-surface)] text-[var(--color-danger)] border-[var(--color-danger)]';
  if (normalized === '12M+')
    return 'bg-[var(--color-danger-surface)] text-[var(--color-danger)] border-[var(--color-danger)]';
  return 'bg-[var(--color-danger-surface)] text-[var(--color-danger)] border-[var(--color-danger)]';
}

function getLifecycleLabel(lifecycle: string): string {
  const normalized = lifecycle.trim().toUpperCase();
  if (/^\d{1,2}M\+?$/.test(normalized)) return normalized;
  if (/^\d$/.test(normalized)) return `${normalized}M`;
  return lifecycle;
}

export function LifecycleBadge({ lifecycle }: LifecycleBadgeProps) {
  const t = useTranslations('members');
  const style = getBadgeStyle(lifecycle);
  const label = getLifecycleLabel(lifecycle);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${style}`}
      title={`${t('lifecycleLabel')}: ${label}`}
    >
      {label}
    </span>
  );
}

'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';
import { useLocale } from 'next-intl';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';

const I18N = {
  zh: {
    title: '无权限访问',
    subtitle: '您没有访问此页面的权限，请联系管理员为您分配角色。',
    backHome: '返回首页',
    contact: '联系管理员',
    login: '去登录',
  },
  en: {
    title: 'Access Denied',
    subtitle: 'You do not have permission to access this page. Please contact your administrator.',
    backHome: 'Back to Home',
    contact: 'Contact Admin',
    login: 'Sign in',
  },
} as const;

export default function AccessDeniedPage() {
  usePageDimensions({});
  const locale = useLocale();
  const lang = locale === 'zh' || locale === 'zh-TW' ? 'zh' : 'en';
  const t = I18N[lang];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-[var(--bg-primary)]">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[var(--color-danger-surface)]">
          <Shield className="w-10 h-10 text-[var(--color-danger)]" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t.title}</h1>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t.subtitle}</p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <Link href="/" className="btn-primary text-center">
            {t.backHome}
          </Link>
          <Link href={`/${locale}/login`} className="btn-secondary text-center">
            {t.login}
          </Link>
          <Link href="/access-control" className="btn-secondary text-center">
            {t.contact}
          </Link>
        </div>
        <p className="text-xs text-[var(--text-muted)] opacity-60">403 Forbidden</p>
      </div>
    </div>
  );
}

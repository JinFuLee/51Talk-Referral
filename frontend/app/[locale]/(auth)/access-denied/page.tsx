'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Lock, ArrowLeft, LogIn } from 'lucide-react';
import { BrandMark } from '@/components/ui/BrandMark';

const I18N = {
  zh: {
    title: '无权限访问',
    subtitle: '您没有访问此页面的权限，请联系管理员为您分配角色。',
    backHome: '返回首页',
    login: '重新登录',
    code: '403 Forbidden',
  },
  'zh-TW': {
    title: '無權限訪問',
    subtitle: '您沒有訪問此頁面的權限，請聯繫管理員為您分配角色。',
    backHome: '返回首頁',
    login: '重新登入',
    code: '403 Forbidden',
  },
  en: {
    title: 'Access Denied',
    subtitle: 'You do not have permission to access this page. Please contact your administrator.',
    backHome: 'Back to Home',
    login: 'Sign in again',
    code: '403 Forbidden',
  },
  th: {
    title: 'ไม่มีสิทธิ์เข้าถึง',
    subtitle: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบ',
    backHome: 'กลับหน้าแรก',
    login: 'เข้าสู่ระบบอีกครั้ง',
    code: '403 Forbidden',
  },
} as const;

type LocaleKey = keyof typeof I18N;

export default function AccessDeniedPage() {
  const locale = useLocale() as LocaleKey;
  const t = I18N[locale] || I18N['zh'];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[var(--n-50)] via-white to-[var(--n-100)]">
      {/* ── 背景装饰光晕（与 login 一致） ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full animate-auth-float"
          style={{
            background:
              'radial-gradient(circle, rgba(255,209,0,0.12) 0%, rgba(255,209,0,0.04) 40%, transparent 70%)',
          }}
        />
        <div
          className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full animate-auth-float-reverse"
          style={{
            background:
              'radial-gradient(circle, rgba(27,54,93,0.06) 0%, rgba(27,54,93,0.02) 40%, transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(var(--n-400) 1px, transparent 1px), linear-gradient(90deg, var(--n-400) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* ── 主体 ── */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <div
          className="max-w-md w-full text-center animate-slide-up"
          style={{ animationDelay: '0.05s', animationFillMode: 'both' }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <BrandMark size={36} className="text-[var(--brand-p1)] animate-pulse-soft" />
          </div>

          {/* 锁图标 */}
          <div className="relative mx-auto w-20 h-20 mb-8">
            <div className="absolute inset-0 rounded-full bg-[var(--color-action-surface)] animate-auth-glow" />
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-[var(--color-action-surface)] border border-[var(--brand-p1)]/20">
              <Lock className="w-8 h-8 text-[var(--brand-p2)]" />
            </div>
          </div>

          {/* 文字 */}
          <div className="auth-card rounded-2xl p-8 md:p-10 text-left">
            <h1 className="font-display text-2xl font-bold text-[var(--n-900)] text-center mb-2">
              {t.title}
            </h1>
            <p className="text-sm text-[var(--n-500)] leading-relaxed text-center mb-8">
              {t.subtitle}
            </p>

            {/* 按钮组 */}
            <div className="space-y-3">
              <Link href={`/${locale}`} className="auth-btn justify-center">
                <ArrowLeft className="w-4 h-4" />
                <span>{t.backHome}</span>
              </Link>

              <Link
                href={`/${locale}/login`}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold text-[var(--n-700)] bg-[var(--n-100)] hover:bg-[var(--n-200)] border border-[var(--n-200)] transition-all duration-200"
              >
                <LogIn className="w-4 h-4" />
                <span>{t.login}</span>
              </Link>
            </div>
          </div>

          {/* 状态码 */}
          <p className="text-xs text-[var(--n-400)] mt-6 tracking-wider font-mono">{t.code}</p>
        </div>
      </div>
    </div>
  );
}

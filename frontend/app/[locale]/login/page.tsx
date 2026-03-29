'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { BrandMark } from '@/components/ui/BrandMark';
import { BIZ_PAGE } from '@/lib/layout';
import { Loader2 } from 'lucide-react';

const I18N = {
  zh: {
    title: 'ref-ops-engine',
    subtitle: '运营分析面板',
    emailLabel: '工作邮箱',
    emailPlaceholder: '请输入您的工作邮箱',
    submit: '登录',
    loading: '登录中...',
    error: '该邮箱未授权，请联系管理员',
  },
  en: {
    title: 'ref-ops-engine',
    subtitle: 'Operations Dashboard',
    emailLabel: 'Work Email',
    emailPlaceholder: 'Enter your work email',
    submit: 'Sign in',
    loading: 'Signing in...',
    error: 'Email not authorized. Please contact your administrator.',
  },
} as const;

export default function LoginPage() {
  usePageDimensions({});
  return (
    <Suspense
      fallback={
        <div className={`${BIZ_PAGE} flex items-center justify-center min-h-[calc(100vh-7rem)]`}>
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const locale = useLocale();
  const lang = locale === 'zh' || locale === 'zh-TW' ? 'zh' : 'en';
  const t = I18N[lang];

  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/access-control/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { detail?: string }).detail || t.error);
        return;
      }
      // cookie 由后端 Set-Cookie 自动设置
      router.push(from || `/${locale}`);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className={`${BIZ_PAGE} flex items-center justify-center min-h-[calc(100vh-7rem)]`}>
      <div className="card-base p-8 w-full max-w-sm flex flex-col items-center gap-6">
        {/* Logo + 标题 */}
        <div className="flex flex-col items-center gap-3">
          <BrandMark size={48} className="text-[var(--brand-p1)]" />
          <div className="text-center">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{t.title}</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{t.subtitle}</p>
          </div>
        </div>

        {/* 表单 */}
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              {t.emailLabel}
            </label>
            <input
              type="email"
              className="input-base"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              disabled={loading}
            />
          </div>

          {/* 错误提示 */}
          {error && <p className="text-xs text-[var(--color-danger)] leading-relaxed">{error}</p>}

          {/* 登录按钮 */}
          <button
            className="btn-primary flex items-center justify-center gap-2"
            onClick={handleLogin}
            disabled={loading || !email.trim()}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? t.loading : t.submit}
          </button>
        </div>
      </div>
    </div>
  );
}

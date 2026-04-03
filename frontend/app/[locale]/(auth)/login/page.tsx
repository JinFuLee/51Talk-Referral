'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { BrandMark } from '@/components/ui/BrandMark';
import { Loader2, BarChart3, Sparkles, Activity, AlertCircle } from 'lucide-react';

/* ── 四语 i18n ── */
const I18N = {
  zh: {
    brand: '51Talk',
    subtitle: '转介绍运营分析引擎',
    tagline: '数据驱动增长，智能赋能运营',
    emailLabel: '工作邮箱',
    emailPlaceholder: '请输入您的工作邮箱',
    submit: '登录',
    loading: '验证中...',
    error: '该邮箱未授权，请联系管理员',
    features: [
      { icon: 'chart', title: '全维度分析', desc: '8 维筛选 × 4 基准对比' },
      { icon: 'sparkle', title: '智能洞察', desc: '异常检测与归因分析' },
      { icon: 'activity', title: '实时监控', desc: '日快照 + 钉钉推送' },
    ],
    langLabel: '语言',
  },
  'zh-TW': {
    brand: '51Talk',
    subtitle: '轉介紹營運分析引擎',
    tagline: '數據驅動增長，智能賦能營運',
    emailLabel: '工作信箱',
    emailPlaceholder: '請輸入您的工作信箱',
    submit: '登入',
    loading: '驗證中...',
    error: '該信箱未授權，請聯繫管理員',
    features: [
      { icon: 'chart', title: '全維度分析', desc: '8 維篩選 × 4 基準對比' },
      { icon: 'sparkle', title: '智能洞察', desc: '異常檢測與歸因分析' },
      { icon: 'activity', title: '即時監控', desc: '日快照 + 釘釘推送' },
    ],
    langLabel: '語言',
  },
  en: {
    brand: '51Talk',
    subtitle: 'Referral Ops Engine',
    tagline: 'Data-driven growth, intelligent operations',
    emailLabel: 'Work Email',
    emailPlaceholder: 'Enter your work email',
    submit: 'Sign in',
    loading: 'Verifying...',
    error: 'Email not authorized. Contact your administrator.',
    features: [
      { icon: 'chart', title: 'Multi-dimension', desc: '8 filters × 4 benchmarks' },
      { icon: 'sparkle', title: 'Smart Insights', desc: 'Anomaly detection & attribution' },
      { icon: 'activity', title: 'Real-time', desc: 'Daily snapshots + DingTalk alerts' },
    ],
    langLabel: 'Language',
  },
  th: {
    brand: '51Talk',
    subtitle: 'ระบบวิเคราะห์การแนะนำ',
    tagline: 'ขับเคลื่อนด้วยข้อมูล เสริมพลังการดำเนินงาน',
    emailLabel: 'อีเมลที่ทำงาน',
    emailPlaceholder: 'กรอกอีเมลที่ทำงานของคุณ',
    submit: 'เข้าสู่ระบบ',
    loading: 'กำลังตรวจสอบ...',
    error: 'อีเมลไม่ได้รับอนุญาต กรุณาติดต่อผู้ดูแลระบบ',
    features: [
      { icon: 'chart', title: 'วิเคราะห์ทุกมิติ', desc: '8 ตัวกรอง × 4 เกณฑ์' },
      { icon: 'sparkle', title: 'ข้อมูลเชิงลึก', desc: 'ตรวจจับความผิดปกติ' },
      { icon: 'activity', title: 'เรียลไทม์', desc: 'สแนปชอตรายวัน + แจ้งเตือน' },
    ],
    langLabel: 'ภาษา',
  },
} as const;

type LocaleKey = keyof typeof I18N;

const LANG_OPTIONS: { code: LocaleKey; label: string }[] = [
  { code: 'zh', label: '简体' },
  { code: 'zh-TW', label: '繁體' },
  { code: 'en', label: 'EN' },
  { code: 'th', label: 'ไทย' },
];

const FeatureIcon = ({ type }: { type: string }) => {
  const cls = 'w-5 h-5';
  switch (type) {
    case 'chart':
      return <BarChart3 className={cls} />;
    case 'sparkle':
      return <Sparkles className={cls} />;
    case 'activity':
      return <Activity className={cls} />;
    default:
      return null;
  }
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--n-50)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-p1)]" />
        </div>
      }
    >
      <LoginView />
    </Suspense>
  );
}

function LoginView() {
  const locale = useLocale() as LocaleKey;
  const t = I18N[locale] || I18N['zh'];
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
      // useRouter from @/i18n/navigation auto-prefixes locale, so push '/' not '/${locale}'
      router.push(from || '/');
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleLogin();
  };

  const switchLocale = (code: LocaleKey) => {
    const path = from ? `/login?from=${encodeURIComponent(from)}` : '/login';
    window.location.href = `/${code}${path}`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[var(--n-50)] via-white to-[var(--n-100)]">
      {/* ── 背景装饰光晕 ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 金色主光晕 — 右上 */}
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full animate-auth-float"
          style={{
            background:
              'radial-gradient(circle, rgba(255,209,0,0.12) 0%, rgba(255,209,0,0.04) 40%, transparent 70%)',
          }}
        />
        {/* 深蓝副光晕 — 左下 */}
        <div
          className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full animate-auth-float-reverse"
          style={{
            background:
              'radial-gradient(circle, rgba(27,54,93,0.06) 0%, rgba(27,54,93,0.02) 40%, transparent 70%)',
          }}
        />
        {/* 金色小光点 — 中央偏左 */}
        <div
          className="absolute top-1/3 left-1/4 w-[200px] h-[200px] rounded-full animate-auth-glow"
          style={{
            background: 'radial-gradient(circle, rgba(255,209,0,0.08) 0%, transparent 60%)',
          }}
        />
        {/* 网格纹理 */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(var(--n-400) 1px, transparent 1px), linear-gradient(90deg, var(--n-400) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* ── 主体内容 ── */}
      <div className="relative z-10 min-h-screen flex">
        {/* 左侧品牌区（桌面端） */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-center px-16 xl:px-24">
          <div className="max-w-lg animate-fade-in">
            {/* Logo + 品牌名 */}
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                <BrandMark size={64} className="text-[var(--brand-p1)] animate-pulse-soft" />
                {/* logo 背后光效 */}
                <div
                  className="absolute inset-0 -m-3 rounded-full animate-auth-glow"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,209,0,0.15) 0%, transparent 70%)',
                  }}
                />
              </div>
              <div>
                <h1 className="font-display text-4xl font-bold text-[var(--n-900)] tracking-tight">
                  {t.brand}
                </h1>
                <p className="text-lg text-[var(--n-600)] font-medium mt-0.5">{t.subtitle}</p>
              </div>
            </div>

            {/* Tagline */}
            <p className="text-xl text-[var(--n-500)] leading-relaxed mb-12 font-light">
              {t.tagline}
            </p>

            {/* 三个特性 */}
            <div className="space-y-5">
              {t.features.map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 animate-slide-up"
                  style={{ animationDelay: `${0.15 + i * 0.1}s`, animationFillMode: 'both' }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--color-action-surface)] flex items-center justify-center text-[var(--brand-p2)]">
                    <FeatureIcon type={f.icon} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--n-800)]">{f.title}</h3>
                    <p className="text-sm text-[var(--n-500)] mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧登录卡片 */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
          <div
            className="w-full max-w-[420px] animate-slide-up"
            style={{ animationDelay: '0.05s', animationFillMode: 'both' }}
          >
            {/* 移动端 logo */}
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <BrandMark size={40} className="text-[var(--brand-p1)] animate-pulse-soft" />
              <div>
                <h1 className="font-display text-2xl font-bold text-[var(--n-900)]">{t.brand}</h1>
                <p className="text-sm text-[var(--n-600)]">{t.subtitle}</p>
              </div>
            </div>

            {/* 毛玻璃卡片 */}
            <div className="auth-card rounded-2xl p-8 md:p-10">
              {/* 桌面端卡片标题 */}
              <div className="hidden lg:block mb-8">
                <h2 className="font-display text-2xl font-bold text-[var(--n-900)]">
                  {locale === 'en' ? 'Welcome back' : locale === 'th' ? 'ยินดีต้อนรับ' : '欢迎回来'}
                </h2>
                <p className="text-sm text-[var(--n-500)] mt-1">
                  {locale === 'en'
                    ? 'Sign in to access the operations dashboard'
                    : locale === 'th'
                      ? 'เข้าสู่ระบบเพื่อเข้าถึงแดชบอร์ด'
                      : '登录以访问运营分析面板'}
                </p>
              </div>

              {/* 表单 */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--n-600)] uppercase tracking-wider">
                    {t.emailLabel}
                  </label>
                  <input
                    type="email"
                    className="auth-input"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    disabled={loading}
                  />
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[var(--color-danger-surface)] border border-red-200/60 animate-slide-up">
                    <AlertCircle className="w-4 h-4 text-[var(--color-danger)] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[var(--color-danger)] leading-relaxed">{error}</p>
                  </div>
                )}

                {/* 登录按钮 */}
                <button
                  className="auth-btn group"
                  onClick={handleLogin}
                  disabled={loading || !email.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t.loading}</span>
                    </>
                  ) : (
                    <>
                      <span>{t.submit}</span>
                      <svg
                        className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {/* 分隔线 + 语言切换 */}
              <div className="mt-8 pt-6 border-t border-[var(--n-200)]/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--n-400)] font-medium">{t.langLabel}</span>
                  <div className="flex gap-1">
                    {LANG_OPTIONS.map((opt) => (
                      <button
                        key={opt.code}
                        onClick={() => switchLocale(opt.code)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all duration-200 ${
                          locale === opt.code
                            ? 'bg-[var(--brand-p2)] text-white shadow-sm'
                            : 'text-[var(--n-500)] hover:text-[var(--n-800)] hover:bg-[var(--n-100)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 底部版权 */}
            <p className="text-center text-xs text-[var(--n-400)] mt-6">
              &copy; {new Date().getFullYear()} 51Talk &middot; Referral Operations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

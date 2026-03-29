import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { SWRProvider } from '@/components/providers/SWRProvider';
import { NavSidebar } from '@/components/layout/NavSidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ComparisonBanner } from '@/components/shared/ComparisonBanner';
import { UnifiedFilterBar } from '@/components/ui/UnifiedFilterBar';
import { FilterSyncActivator } from '@/components/providers/FilterSyncActivator';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';
import { ChunkErrorGuard } from '@/components/providers/ChunkErrorGuard';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { ContentTransitionWrapper } from '@/components/providers/ContentTransitionWrapper';
import {
  CoPilotTerminalClient,
  PresentationOverlayClient,
} from '@/components/providers/ClientOnlyDynamics';
import { BrandMark } from '@/components/ui/BrandMark';
import { BottomTabBar } from '@/components/layout/BottomTabBar';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const TITLES: Record<string, string> = {
  zh: 'ref-ops-engine — 运营分析面板',
  'zh-TW': 'ref-ops-engine — 營運分析面板',
  en: 'ref-ops-engine — Operations Dashboard',
  th: 'ref-ops-engine — แดชบอร์ดวิเคราะห์',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: TITLES[locale] || TITLES['zh'],
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: '/en',
        zh: '/zh',
        'zh-TW': '/zh-TW',
        th: '/th',
        'x-default': '/zh',
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // 支持静态渲染（SSG）
  setRequestLocale(locale);

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ErrorBoundary>
        <ChunkErrorGuard />
        <SWRProvider>
          <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)] presentation-expand relative">
            <div className="hide-in-presentation shrink-0 h-full">
              <NavSidebar />
            </div>
            <div className="flex flex-col flex-1 overflow-hidden presentation-expand">
              <div className="hide-in-presentation shrink-0">
                <Topbar />
                <ComparisonBanner />
                <UnifiedFilterBar />
                <FilterSyncActivator />
              </div>
              <main className="flex-1 overflow-auto p-3 md:p-6 pb-20 md:pb-6 presentation-expand relative">
                <ContentTransitionWrapper>{children}</ContentTransitionWrapper>
                <div className="brand-watermark fixed bottom-4 right-4 pointer-events-none">
                  <BrandMark size={32} className="text-[var(--brand-p1)]" />
                </div>
              </main>
            </div>
          </div>
          <BottomTabBar />
          <div className="hide-in-presentation">
            <CoPilotTerminalClient />
          </div>
          <PresentationOverlayClient />
          <ToastProvider />
        </SWRProvider>
      </ErrorBoundary>
    </NextIntlClientProvider>
  );
}

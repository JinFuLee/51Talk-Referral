import type { Metadata } from 'next';
import { Space_Grotesk, Inter, IBM_Plex_Mono } from 'next/font/google';
import { SWRProvider } from '@/components/providers/SWRProvider';
import { NavSidebar } from '@/components/layout/NavSidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ComparisonBanner } from '@/components/shared/ComparisonBanner';
import { GlobalFilterBar } from '@/components/ui/GlobalFilterBar';
import { FilterSyncActivator } from '@/components/providers/FilterSyncActivator';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { HtmlLangUpdater } from '@/components/providers/HtmlLangUpdater';
import {
  CoPilotTerminalClient,
  PresentationOverlayClient,
} from '@/components/providers/ClientOnlyDynamics';
import { BrandMark } from '@/components/ui/BrandMark';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'ref-ops-engine — 运营分析面板',
  description: '51Talk 泰国转介绍运营自动化分析引擎',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
  try {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && matchMedia('(prefers-color-scheme:dark)').matches))
      document.documentElement.classList.add('dark')
  } catch(e){}
`,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Noto+Serif+Thai:wght@400;600;700&family=Noto+Serif+SC:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable} font-sans`}
        style={{
          fontFamily:
            "var(--font-sans), 'IBM Plex Sans Thai', 'Prompt', 'Noto Sans Thai', 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif",
        }}
      >
        <ErrorBoundary>
          <SWRProvider>
            <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)] presentation-expand relative">
              <div className="hide-in-presentation shrink-0 h-full">
                <NavSidebar />
              </div>
              <div className="flex flex-col flex-1 overflow-hidden presentation-expand">
                <div className="hide-in-presentation shrink-0">
                  <Topbar />
                  <ComparisonBanner />
                  <GlobalFilterBar />
                  <FilterSyncActivator />
                </div>
                <main className="flex-1 overflow-auto p-3 md:p-6 presentation-expand relative">
                  {children}
                  <div className="brand-watermark fixed bottom-4 right-4 pointer-events-none">
                    <BrandMark size={32} className="text-[var(--brand-p1)]" />
                  </div>
                </main>
              </div>
            </div>
            <div className="hide-in-presentation">
              <CoPilotTerminalClient />
            </div>
            <PresentationOverlayClient />
            <ToastProvider />
            <HtmlLangUpdater />
          </SWRProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

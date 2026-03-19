import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import { SWRProvider } from "@/components/providers/SWRProvider";
import { NavSidebar } from "@/components/layout/NavSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ComparisonBanner } from "@/components/shared/ComparisonBanner";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { HtmlLangUpdater } from "@/components/providers/HtmlLangUpdater";
import { CoPilotTerminalClient, PresentationOverlayClient } from "@/components/providers/ClientOnlyDynamics";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ref-ops-engine — 运营分析面板",
  description: "51Talk 泰国转介绍运营自动化分析引擎",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
  try {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && matchMedia('(prefers-color-scheme:dark)').matches))
      document.documentElement.classList.add('dark')
  } catch(e){}
` }} />
      </head>
      <body className={`${manrope.variable} ${ibmPlexMono.variable} font-sans`}
        style={{ fontFamily: "var(--font-manrope), 'Noto Sans Thai', 'PingFang SC', 'Hiragino Sans GB', sans-serif" }}>
        <ErrorBoundary>
            <SWRProvider>
              <div className="flex h-screen overflow-hidden bg-slate-50 presentation-expand relative">
                <div className="hide-in-presentation shrink-0 h-full">
                  <NavSidebar />
                </div>
                <div className="flex flex-col flex-1 overflow-hidden presentation-expand">
                  <div className="hide-in-presentation shrink-0">
                    <Topbar />
                    <ComparisonBanner />
                  </div>
                  <main className="flex-1 overflow-auto p-6 presentation-expand relative">
                    {children}
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

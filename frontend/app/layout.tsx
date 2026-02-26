import type { Metadata } from "next";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import { SWRProvider } from "@/components/providers/SWRProvider";
import { NavSidebar } from "@/components/layout/NavSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ComparisonBanner } from "@/components/shared/ComparisonBanner";
import { WebMCPProvider } from "@/lib/webmcp";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { HtmlLangUpdater } from "@/components/providers/HtmlLangUpdater";
import "./globals.css";

const CoPilotTerminal = dynamic(
  () => import("@/components/ui/CoPilotTerminal").then((m) => ({ default: m.CoPilotTerminal })),
  { ssr: false }
);
const PresentationOverlay = dynamic(
  () => import("@/components/ui/PresentationOverlay").then((m) => ({ default: m.PresentationOverlay })),
  { ssr: false }
);

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="zh-CN">
      <body className={inter.className}>
        <ErrorBoundary>
          <WebMCPProvider>
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
                <CoPilotTerminal />
              </div>
              <PresentationOverlay />
              <ToastProvider />
              <HtmlLangUpdater />
            </SWRProvider>
          </WebMCPProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

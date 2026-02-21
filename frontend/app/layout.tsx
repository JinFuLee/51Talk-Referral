import type { Metadata } from "next";
import "./globals.css";
import { SWRProvider } from "@/components/providers/SWRProvider";
import { NavSidebar } from "@/components/layout/NavSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { WebMCPProvider } from "@/lib/webmcp";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

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
      <body>
        <ErrorBoundary>
          <WebMCPProvider>
            <SWRProvider>
              <div className="flex h-screen overflow-hidden bg-slate-50">
              <NavSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-auto p-6">{children}</main>
              </div>
            </div>
            </SWRProvider>
          </WebMCPProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

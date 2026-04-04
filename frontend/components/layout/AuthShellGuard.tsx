'use client';

import { usePathname } from 'next/navigation';

const SHELL_BYPASS_PAGES = ['/login', '/access-denied', '/present'];

/**
 * 检测当前路径是否为 auth 页面（login/access-denied）。
 * auth 页面不渲染 Shell（侧边栏/Topbar/FilterBar），只渲染 children。
 */
export function AuthShellGuard({
  shell,
  children,
}: {
  shell: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // 剥离 locale 前缀（/zh/login → /login）
  const pagePath = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, '') || '/';
  const isAuthPage = SHELL_BYPASS_PAGES.some((p) => pagePath === p || pagePath.startsWith(p + '/'));

  if (isAuthPage) {
    // auth 页面：全屏裸渲染，无 Shell
    return <>{children}</>;
  }

  // 业务页面：完整 Shell
  return <>{shell}</>;
}

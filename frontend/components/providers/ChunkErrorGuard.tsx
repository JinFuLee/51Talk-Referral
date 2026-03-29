'use client';

import { useEffect } from 'react';
import { isChunkLoadError, tryAutoReload } from '@/lib/chunk-error';

/**
 * 全局 window 级 chunk 错误监听。
 *
 * 覆盖 ErrorBoundary 捕获不到的场景：
 * - SWR 回调中的动态 import 失败
 * - Next.js 路由 prefetch 失败
 * - 其他非 React 渲染路径的 chunk 加载失败
 */
export function ChunkErrorGuard() {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        event.preventDefault();
        tryAutoReload();
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (event.error && isChunkLoadError(event.error)) {
        event.preventDefault();
        tryAutoReload();
      }
    };

    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
}

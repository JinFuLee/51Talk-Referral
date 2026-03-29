'use client';

import { useEffect } from 'react';

const CHUNK_RELOAD_KEY = 'chunk_reload_attempted';

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    (error.name === 'TypeError' && error.message.includes('Failed to fetch'))
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // ChunkLoadError: 部署后旧 chunk 失效，自动刷新一次
    if (isChunkLoadError(error)) {
      const lastAttempt = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      const now = Date.now();
      if (!lastAttempt || now - Number(lastAttempt) > 30_000) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
        window.location.reload();
        return;
      }
    }
  }, [error]);

  const isChunk = isChunkLoadError(error);

  if (isChunk) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">页面版本已更新</h2>
          <p className="text-[var(--text-secondary)] mb-4">
            检测到新版本部署，请刷新页面加载最新内容。
          </p>
          <button
            onClick={() => {
              sessionStorage.removeItem(CHUNK_RELOAD_KEY);
              window.location.reload();
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            刷新页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-destructive mb-2">页面加载出错</h2>
        <p className="text-[var(--text-secondary)] mb-4">{error.message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            重试
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-[var(--border-default)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            刷新页面
          </button>
        </div>
      </div>
    </div>
  );
}

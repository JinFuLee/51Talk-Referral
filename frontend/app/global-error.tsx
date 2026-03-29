'use client';

/**
 * 终极兜底：当 layout.tsx 本身崩溃时（如侧边栏/顶栏的 chunk 加载失败），
 * error.tsx 在 layout 内部捕获不到，需要这个全局错误页面。
 *
 * global-error.tsx 必须自带 <html> + <body>，因为 layout 已经崩了。
 */

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

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      const lastAttempt = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      const now = Date.now();
      if (!lastAttempt || now - Number(lastAttempt) > 30_000) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <html lang="zh">
      <body
        style={{
          margin: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#fafafa',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 32 }}>
          {isChunkLoadError(error) ? (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>页面版本已更新</h2>
              <p style={{ color: '#666', marginBottom: 16 }}>
                检测到新版本部署，请刷新页面加载最新内容。
              </p>
              <button
                onClick={() => {
                  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
                  window.location.reload();
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#171717',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                刷新页面
              </button>
            </>
          ) : (
            <>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#dc2626',
                  marginBottom: 8,
                }}
              >
                系统错误
              </h2>
              <p style={{ color: '#666', marginBottom: 16 }}>{error.message}</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={reset}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#171717',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  重试
                </button>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#fff',
                    color: '#171717',
                    border: '1px solid #e5e5e5',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  刷新页面
                </button>
              </div>
            </>
          )}
        </div>
      </body>
    </html>
  );
}

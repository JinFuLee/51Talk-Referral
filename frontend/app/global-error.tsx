'use client';

/**
 * 终极兜底：当 layout.tsx 本身崩溃时（如侧边栏/顶栏的 chunk 加载失败），
 * error.tsx 在 layout 内部捕获不到，需要这个全局错误页面。
 *
 * global-error.tsx 必须自带 <html> + <body>，因为 layout 已经崩了。
 * next-intl hooks 在此处不可用（layout 已崩），使用 navigator.language 推断语言。
 */

import { useEffect } from 'react';

const CHUNK_RELOAD_KEY = 'chunk_reload_attempted';

const GLOBAL_ERROR_I18N = {
  zh: {
    chunkTitle: '页面版本已更新',
    chunkDesc: '检测到新版本部署，请刷新页面加载最新内容。',
    reload: '刷新页面',
    sysError: '系统错误',
    retry: '重试',
  },
  'zh-TW': {
    chunkTitle: '頁面版本已更新',
    chunkDesc: '偵測到新版本部署，請重新整理頁面以載入最新內容。',
    reload: '重新整理',
    sysError: '系統錯誤',
    retry: '重試',
  },
  en: {
    chunkTitle: 'New version available',
    chunkDesc: 'A new deployment was detected. Please reload to get the latest version.',
    reload: 'Reload',
    sysError: 'System Error',
    retry: 'Retry',
  },
  th: {
    chunkTitle: 'มีเวอร์ชันใหม่',
    chunkDesc: 'ตรวจพบการอัปเดตใหม่ กรุณาโหลดหน้าใหม่',
    reload: 'โหลดใหม่',
    sysError: 'เกิดข้อผิดพลาด',
    retry: 'ลองใหม่',
  },
} as const;

type GELang = keyof typeof GLOBAL_ERROR_I18N;

function detectLang(): GELang {
  if (typeof navigator === 'undefined') return 'zh';
  const l = navigator.language?.toLowerCase() ?? '';
  if (l.startsWith('th')) return 'th';
  if (l === 'zh-tw' || l === 'zh-hant') return 'zh-TW';
  if (l.startsWith('zh')) return 'zh';
  return 'en';
}

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
  const t = GLOBAL_ERROR_I18N[detectLang()];

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
    <html lang={detectLang()}>
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
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{t.chunkTitle}</h2>
              <p style={{ color: '#666', marginBottom: 16 }}>{t.chunkDesc}</p>
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
                {t.reload}
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
                {t.sysError}
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
                  {t.retry}
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
                  {t.reload}
                </button>
              </div>
            </>
          )}
        </div>
      </body>
    </html>
  );
}

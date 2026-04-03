'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { isChunkLoadError, tryAutoReload, clearReloadFlag } from '@/lib/chunk-error';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorPage');

  useEffect(() => {
    if (isChunkLoadError(error)) {
      tryAutoReload();
    }
  }, [error]);

  if (isChunkLoadError(error)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">{t('chunkTitle')}</h2>
          <p className="text-[var(--text-secondary)] mb-4">{t('chunkDesc')}</p>
          <button
            onClick={() => {
              clearReloadFlag();
              window.location.reload();
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('reload')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-destructive mb-2">{t('genericTitle')}</h2>
        <p className="text-[var(--text-secondary)] mb-4">{error.message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('retry')}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-[var(--border-default)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('reload')}
          </button>
        </div>
      </div>
    </div>
  );
}

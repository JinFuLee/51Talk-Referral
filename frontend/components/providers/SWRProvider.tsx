'use client';

import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
import { errorLogger } from '@/lib/error-logger';

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        dedupingInterval: 5000,
        onError: (error: Error, key: string) => {
          errorLogger.capture({
            type: 'api_error',
            message: error.message,
            api: key,
          });
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}

'use client';

import { useEffect } from 'react';
import { registerAllTools } from './tools';

export function WebMCPProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 动态 import 确保 @mcp-b/global polyfill 先加载
      import('@mcp-b/global')
        .then(() => {
          registerAllTools();
          console.log('[WebMCP] 8 tools registered');
        })
        .catch((e) => {
          console.warn('[WebMCP] polyfill load failed, skipping:', e);
        });
    }
  }, []);

  return <>{children}</>;
}

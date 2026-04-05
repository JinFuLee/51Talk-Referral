'use client';
import { Component, ErrorInfo, ReactNode } from 'react';
import { errorLogger } from '@/lib/error-logger';
import { isChunkLoadError, tryAutoReload, clearReloadFlag } from '@/lib/chunk-error';

const EB_I18N = {
  zh: {
    chunkTitle: '页面版本已更新',
    chunkDesc: '检测到新版本部署，请刷新页面加载最新内容。',
    reload: '刷新页面',
    renderError: '页面渲染错误',
    retry: '重试',
  },
  'zh-TW': {
    chunkTitle: '頁面版本已更新',
    chunkDesc: '檢測到新版本部署，請重新整理頁面。',
    reload: '重新整理',
    renderError: '頁面渲染錯誤',
    retry: '重試',
  },
  en: {
    chunkTitle: 'New version available',
    chunkDesc: 'A new deployment was detected. Please reload to get the latest version.',
    reload: 'Reload',
    renderError: 'Render Error',
    retry: 'Retry',
  },
  th: {
    chunkTitle: 'มีเวอร์ชันใหม่',
    chunkDesc: 'ตรวจพบการอัปเดตใหม่ กรุณาโหลดหน้าใหม่',
    reload: 'โหลดใหม่',
    renderError: 'เกิดข้อผิดพลาดในการแสดงผล',
    retry: 'ลองใหม่',
  },
} as const;

type EBLang = keyof typeof EB_I18N;

function getEBLang(): EBLang {
  if (typeof document === 'undefined') return 'zh';
  const lang = document.documentElement.lang?.toLowerCase() ?? '';
  if (lang.startsWith('zh-tw') || lang === 'zh-tw') return 'zh-TW';
  if (lang.startsWith('th')) return 'th';
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('zh')) return 'zh';
  return 'zh';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error)) {
      if (tryAutoReload()) return;
    }

    errorLogger.capture({
      type: 'render_error',
      message: error.message,
      stack: error.stack,
      component: info.componentStack?.split('\n')[1]?.trim(),
    });
  }

  render() {
    if (this.state.hasError) {
      const t = EB_I18N[getEBLang()];
      if (this.state.error && isChunkLoadError(this.state.error)) {
        return (
          <div className="p-8 text-center">
            <h2 className="text-xl font-bold mb-2">{t.chunkTitle}</h2>
            <p className="text-secondary-token mb-4">{t.chunkDesc}</p>
            <button
              onClick={() => {
                clearReloadFlag();
                window.location.reload();
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t.reload}
            </button>
          </div>
        );
      }

      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">{t.renderError}</h2>
          <p className="text-secondary-token mb-4">{this.state.error?.message}</p>
          <pre className="text-left text-xs bg-surface p-2 overflow-auto max-h-96">
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t.retry}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

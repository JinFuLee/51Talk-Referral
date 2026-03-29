'use client';
import { Component, ErrorInfo, ReactNode } from 'react';
import { errorLogger } from '@/lib/error-logger';

interface State {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    (error.name === 'TypeError' && error.message.includes('Failed to fetch'))
  );
}

const CHUNK_RELOAD_KEY = 'chunk_reload_attempted';

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // ChunkLoadError: 部署后旧 chunk 失效，自动刷新一次（用户无感）
    if (isChunkLoadError(error)) {
      const lastAttempt = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      const now = Date.now();
      // 30 秒内只刷新一次，防无限循环
      if (!lastAttempt || now - Number(lastAttempt) > 30_000) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
        window.location.reload();
        return;
      }
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
      const isChunk = this.state.error && isChunkLoadError(this.state.error);

      if (isChunk) {
        return (
          <div className="p-8 text-center">
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
        );
      }

      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">页面渲染错误</h2>
          <p className="text-[var(--text-secondary)] mb-4">{this.state.error?.message}</p>
          <pre className="text-left text-xs bg-[var(--bg-surface)] p-2 overflow-auto max-h-96">
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

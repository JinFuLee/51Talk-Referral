'use client';
import { Component, ErrorInfo, ReactNode } from 'react';
import { errorLogger } from '@/lib/error-logger';
import { isChunkLoadError, tryAutoReload, clearReloadFlag } from '@/lib/chunk-error';

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
      if (this.state.error && isChunkLoadError(this.state.error)) {
        return (
          <div className="p-8 text-center">
            <h2 className="text-xl font-bold mb-2">页面版本已更新</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              检测到新版本部署，请刷新页面加载最新内容。
            </p>
            <button
              onClick={() => {
                clearReloadFlag();
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

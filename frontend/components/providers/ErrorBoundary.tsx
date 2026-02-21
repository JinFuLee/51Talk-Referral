"use client";
import { Component, ReactNode } from "react";
import { errorLogger } from "@/lib/error-logger";

interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    errorLogger.capture({
      type: "render_error",
      message: error.message,
      stack: error.stack,
      component: info.componentStack?.split("\n")[1]?.trim(),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">页面渲染错误</h2>
          <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

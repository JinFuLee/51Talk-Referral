interface ErrorEntry {
  ts: string;
  type: "api_error" | "render_error" | "unhandled_error" | "console_error";
  page: string;
  component?: string;
  message: string;
  stack?: string;
  api?: string;
  status?: number;
  response?: string;
}

class ErrorLogger {
  private buffer: ErrorEntry[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  capture(entry: Partial<ErrorEntry> & { message: string; type: ErrorEntry["type"] }) {
    this.buffer.push({
      ts: new Date().toISOString(),
      page: typeof window !== "undefined" ? window.location.pathname : "",
      ...entry,
    });
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), 3000);
  }

  private async flush() {
    this.timer = null;
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);
    try {
      await fetch("/api/system/error-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: batch }),
      });
    } catch {
      // 后端不可达时静默丢弃
    }
  }
}

export const errorLogger = new ErrorLogger();

if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    errorLogger.capture({
      type: "unhandled_error",
      message: e.message,
      stack: e.error?.stack,
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    errorLogger.capture({
      type: "unhandled_error",
      message: String(e.reason),
      stack: e.reason?.stack,
    });
  });
}

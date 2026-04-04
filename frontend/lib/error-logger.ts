export interface ErrorEntry {
  ts: string;
  type: 'api_error' | 'render_error' | 'unhandled_error' | 'console_error';
  page: string;
  component?: string;
  message: string;
  stack?: string;
  api?: string;
  status?: number;
  response?: string;
  /** 从 stack trace 提取的源文件路径（app/ 相对路径） */
  source_file?: string;
  /** 用于去重的指纹 = type + source_file + message 前 80 字符 */
  fingerprint?: string;
  /** 用户代理 */
  ua?: string;
}

/** 从 stack trace 提取第一个 app/ 源文件路径 */
function extractSourceFile(stack?: string): string | undefined {
  if (!stack) return undefined;
  // 匹配 app/ 或 components/ 或 lib/ 开头的路径
  const m = stack.match(/\/(app|components|lib)\/[^\s:)]+/);
  return m ? m[0] : undefined;
}

/** 生成去重指纹 */
function fingerprint(type: string, source?: string, message?: string): string {
  const raw = `${type}|${source ?? 'unknown'}|${(message ?? '').slice(0, 80)}`;
  // 简单 hash — 不需要密码学强度
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

class ErrorLogger {
  private buffer: ErrorEntry[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** 最近 5 分钟内已上报的指纹（窗口去重） */
  private recentFingerprints = new Set<string>();

  capture(entry: Partial<ErrorEntry> & { message: string; type: ErrorEntry['type'] }) {
    const source = entry.source_file ?? extractSourceFile(entry.stack);
    const fp = fingerprint(entry.type, source, entry.message);

    // 5 分钟窗口去重
    if (this.recentFingerprints.has(fp)) return;
    this.recentFingerprints.add(fp);
    setTimeout(() => this.recentFingerprints.delete(fp), 5 * 60 * 1000);

    this.buffer.push({
      ts: new Date().toISOString(),
      page: typeof window !== 'undefined' ? window.location.pathname : '',
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      source_file: source,
      fingerprint: fp,
      ...entry,
    });
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), 2000);
  }

  private async flush() {
    this.timer = null;
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);
    try {
      await fetch('/api/system/error-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: batch }),
      });
    } catch {
      // 后端不可达时静默丢弃
    }
  }
}

export const errorLogger = new ErrorLogger();

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    errorLogger.capture({
      type: 'unhandled_error',
      message: e.message,
      stack: e.error?.stack,
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    errorLogger.capture({
      type: 'unhandled_error',
      message: String(e.reason),
      stack: e.reason?.stack,
    });
  });
}

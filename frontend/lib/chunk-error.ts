/**
 * ChunkLoadError 检测与自动恢复工具。
 *
 * 部署新版本后，浏览器缓存的旧 chunk hash 失效，
 * webpack 加载旧文件 → 404 → ChunkLoadError。
 * 自动刷新一次即可加载新版本。
 */

const CHUNK_RELOAD_KEY = 'chunk_reload_attempted';

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    (error.name === 'TypeError' && error.message.includes('Failed to fetch'))
  );
}

/**
 * 尝试自动刷新（30 秒 cooldown 防无限循环）。
 * 返回 true 表示正在刷新，调用方应中止后续逻辑。
 */
export function tryAutoReload(): boolean {
  const lastAttempt = sessionStorage.getItem(CHUNK_RELOAD_KEY);
  const now = Date.now();
  if (!lastAttempt || now - Number(lastAttempt) > 30_000) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
    window.location.reload();
    return true;
  }
  return false;
}

export function clearReloadFlag(): void {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}

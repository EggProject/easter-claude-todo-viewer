declare global {
  interface Window {
    __DEBUG_ROUTER__?: boolean;
  }
}

export function isDebugLogs(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.localStorage?.getItem('debug-logs') === '1' ||
      window.__DEBUG_ROUTER__ === true ||
      new URLSearchParams(window.location?.search ?? '').get('debug') === '1'
    );
  } catch {
    return false;
  }
}

export function debugLog(category: string, ...args: unknown[]): void {
  if (isDebugLogs()) {
    console.log(`[${category}]`, ...args);
  }
}

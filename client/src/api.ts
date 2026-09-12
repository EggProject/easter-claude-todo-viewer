import { isRecord } from './types.js';

declare global {
  interface Window {
    CLAUDE_TODOS_API_BASE?: string | undefined;
  }
}

const getApiBase = (): string => {
  if (typeof window !== 'undefined' && typeof window.CLAUDE_TODOS_API_BASE === 'string') {
    return window.CLAUDE_TODOS_API_BASE.replace(/\/$/, '');
  }
  return 'http://127.0.0.1:8765';
};

export const API_BASE = getApiBase();

export function apiUrl(path: string): string {
  return /^https?:\/\//.test(path)
    ? path
    : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function api(path: string, options: RequestInit = {}): Promise<unknown> {
  const defaultHeaders: Record<string, string> = { 'content-type': 'application/json' };
  let customHeaders: Record<string, string> = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      customHeaders = Object.fromEntries(options.headers.entries());
    } else if (Array.isArray(options.headers)) {
      customHeaders = Object.fromEntries(options.headers);
    } else {
      customHeaders = Object.fromEntries(
        Object.entries(options.headers).map(([k, v]) => [k, String(v)]),
      );
    }
  }

  const r = await fetch(apiUrl(path), {
    cache: 'no-store',
    ...options,
    headers: { ...defaultHeaders, ...customHeaders },
  });

  const data: unknown = await r.json().catch(() => ({}));
  if (!r.ok) {
    const message =
      isRecord(data) && typeof data['error'] === 'string'
        ? data['error']
        : `HTTP ${r.status.toString()}`;
    throw new Error(message);
  }
  return data;
}

export const getJSON = (path: string): Promise<unknown> => api(path);
export const postJSON = (path: string, body: unknown = {}): Promise<unknown> =>
  api(path, { method: 'POST', body: JSON.stringify(body) });
export const patchJSON = (path: string, body: unknown = {}): Promise<unknown> =>
  api(path, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteJSON = (path: string): Promise<unknown> => api(path, { method: 'DELETE' });

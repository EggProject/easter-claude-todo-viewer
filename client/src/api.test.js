import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as apiModule from './api.js';
import { API_BASE, apiUrl, api, getJSON, postJSON, patchJSON, deleteJSON } from './api.js';

describe('api module', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('API_BASE and apiUrl', () => {
    it('handles absolute urls starting with http:// or https://', () => {
      expect(apiUrl('https://example.com/data')).toBe('https://example.com/data');
      expect(apiUrl('http://example.com/data')).toBe('http://example.com/data');
    });

    it('handles relative paths with and without leading slash', () => {
      expect(apiUrl('/api/tasks')).toBe(`${API_BASE}/api/tasks`);
      expect(apiUrl('api/tasks')).toBe(`${API_BASE}/api/tasks`);
    });

    it('normalizes API_BASE when CLAUDE_TODOS_API_BASE has trailing slash or is missing', async () => {
      const original = window.CLAUDE_TODOS_API_BASE;
      try {
        window.CLAUDE_TODOS_API_BASE = 'http://custom-host:9999/';
        vi.resetModules();
        const modWithSlash = await import('./api.js');
        expect(modWithSlash.API_BASE).toBe('http://custom-host:9999');

        delete window.CLAUDE_TODOS_API_BASE;
        vi.resetModules();
        const modDefault = await import('./api.js');
        expect(modDefault.API_BASE).toBe('http://127.0.0.1:8765');
      } finally {
        window.CLAUDE_TODOS_API_BASE = original;
      }
    });
  });

  describe('api function', () => {
    it('makes a successful request with default options and content-type header', async () => {
      const mockData = { ok: true, items: [1, 2] };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await api('/test');
      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          cache: 'no-store',
          headers: expect.objectContaining({
            'content-type': 'application/json',
          }),
        }),
      );
    });

    it('merges custom options and headers correctly', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ updated: true }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await api('/custom', {
        method: 'POST',
        headers: { 'x-test': '123' },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/custom'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-test': '123',
          },
        }),
      );
    });

    it('handles Headers instance and entries array in options.headers', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await apiModule.api('/test-headers-instance', {
        headers: new Headers({ 'x-custom-header': 'value1' }),
      });
      await apiModule.api('/test-headers-array', {
        headers: [['x-custom-header-2', 'value2']],
      });
    });

    it('handles non-json response gracefully', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await api('/empty');
      expect(result).toEqual({});
    });

    it('throws error with server message on error response', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad Request Parameter' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(api('/bad')).rejects.toThrow('Bad Request Parameter');
    });

    it('throws fallback HTTP status error when response has no error message', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(api('/fail')).rejects.toThrow('HTTP 500');
    });
  });

  describe('shorthand HTTP methods', () => {
    it('getJSON calls api with path', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ hello: 'world' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const res = await getJSON('/get-endpoint');
      expect(res).toEqual({ hello: 'world' });
    });

    it('postJSON sends POST with body and default body', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ created: true }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await postJSON('/post-endpoint', { name: 'item' });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'item' }),
        }),
      );

      await postJSON('/post-default');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({}),
        }),
      );
    });

    it('patchJSON sends PATCH with body and default body', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ patched: true }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await patchJSON('/patch-endpoint', { active: true });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ active: true }),
        }),
      );

      await patchJSON('/patch-default');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({}),
        }),
      );
    });

    it('deleteJSON sends DELETE request', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ deleted: true }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await deleteJSON('/del-endpoint');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });
  });
});

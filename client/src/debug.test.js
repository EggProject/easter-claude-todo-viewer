import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isDebugLogs, debugLog } from './debug.js';

describe('debug module', () => {
  beforeEach(() => {
    window.localStorage.removeItem('debug-logs');
    delete window.__DEBUG_ROUTER__;
    window.history.pushState(null, '', '/');
  });

  afterEach(() => {
    window.localStorage.removeItem('debug-logs');
    delete window.__DEBUG_ROUTER__;
    window.history.pushState(null, '', '/');
    vi.restoreAllMocks();
  });

  describe('isDebugLogs', () => {
    it('returns false by default when no debug triggers are set', () => {
      expect(isDebugLogs()).toBe(false);
    });

    it('returns true when localStorage debug-logs is set to 1', () => {
      window.localStorage.setItem('debug-logs', '1');
      expect(isDebugLogs()).toBe(true);
    });

    it('returns false when localStorage debug-logs has value other than 1', () => {
      window.localStorage.setItem('debug-logs', '0');
      expect(isDebugLogs()).toBe(false);

      window.localStorage.setItem('debug-logs', 'true');
      expect(isDebugLogs()).toBe(false);
    });

    it('returns true when window.__DEBUG_ROUTER__ is true', () => {
      window.__DEBUG_ROUTER__ = true;
      expect(isDebugLogs()).toBe(true);
    });

    it('returns false when window.__DEBUG_ROUTER__ is false', () => {
      window.__DEBUG_ROUTER__ = false;
      expect(isDebugLogs()).toBe(false);
    });

    it('returns true when URL search contains debug=1 query parameter', () => {
      window.history.pushState(null, '', '/test?debug=1');
      expect(isDebugLogs()).toBe(true);
    });

    it('returns false when URL search contains debug param with value other than 1', () => {
      window.history.pushState(null, '', '/test?debug=0');
      expect(isDebugLogs()).toBe(false);

      window.history.pushState(null, '', '/test?other=1');
      expect(isDebugLogs()).toBe(false);
    });

    it('returns false when localStorage access throws an error', () => {
      vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Access denied (e.g. private browsing)');
      });
      expect(isDebugLogs()).toBe(false);
    });

    it('returns false when window is undefined in SSR environment', () => {
      const originalWindow = globalThis.window;
      try {
        delete globalThis.window;
        expect(isDebugLogs()).toBe(false);
      } finally {
        globalThis.window = originalWindow;
      }
    });

    it('handles window.location search being empty gracefully', () => {
      window.history.pushState(null, '', '');
      expect(isDebugLogs()).toBe(false);
    });

    it('handles null or missing window.location.search gracefully', () => {
      const originalLocation = window.location;
      try {
        Object.defineProperty(window, 'location', {
          value: { search: undefined },
          configurable: true,
        });
        expect(isDebugLogs()).toBe(false);
      } finally {
        Object.defineProperty(window, 'location', {
          value: originalLocation,
          configurable: true,
        });
      }
    });

    it('handles undefined localStorage gracefully', () => {
      const originalStorage = window.localStorage;
      try {
        Object.defineProperty(window, 'localStorage', {
          value: undefined,
          configurable: true,
        });
        expect(isDebugLogs()).toBe(false);
      } finally {
        Object.defineProperty(window, 'localStorage', {
          value: originalStorage,
          configurable: true,
        });
      }
    });
  });

  describe('debugLog', () => {
    it('does not log to console when isDebugLogs is false', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      debugLog('TestCategory', 'should not appear');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('logs to console when isDebugLogs is true', () => {
      window.localStorage.setItem('debug-logs', '1');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      debugLog('CategoryA', 'message 1', { detail: 123 });
      expect(consoleSpy).toHaveBeenCalledWith('[CategoryA]', 'message 1', { detail: 123 });
    });
  });
});

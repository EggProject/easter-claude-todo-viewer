import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

describe('main module and BootstrapGate', () => {
  let rootContainer;

  beforeEach(() => {
    vi.resetModules();
    rootContainer = document.createElement('div');
    rootContainer.id = 'root';
    document.body.appendChild(rootContainer);
  });

  afterEach(() => {
    rootContainer?.remove();
    vi.clearAllMocks();
  });

  it('renders error splash when bootstrapStatus is error', async () => {
    const retryBootstrap = vi.fn();
    vi.doMock('./app-context.js', () => ({
      AppProvider: ({ children }) => React.createElement('div', null, children),
      useApp: () => ({
        bootstrapStatus: 'error',
        bootstrapError: 'Connection refused',
        retryBootstrap,
      }),
    }));

    vi.doMock('./components/app-splash.js', () => ({
      AppSplash: ({ error, onRetry }) =>
        React.createElement(
          'button',
          { 'data-testid': 'splash-error', onClick: onRetry },
          String(error),
        ),
    }));

    vi.doMock('./router.js', () => ({
      default: () => React.createElement('div', null, 'Mock Router'),
    }));

    await import('./main.js');

    await waitFor(() => {
      expect(screen.getByTestId('splash-error')).toBeDefined();
      expect(screen.getByText('Connection refused')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('splash-error'));
    expect(retryBootstrap).toHaveBeenCalled();
  });

  it('renders loading splash when bootstrapStatus is loading / not ready', async () => {
    vi.doMock('./app-context.js', () => ({
      AppProvider: ({ children }) => React.createElement('div', null, children),
      useApp: () => ({
        bootstrapStatus: 'loading',
        bootstrapPhase: 'Connecting to daemon',
      }),
    }));

    vi.doMock('./components/app-splash.js', () => ({
      AppSplash: ({ phase }) =>
        React.createElement('div', { 'data-testid': 'splash-loading' }, phase),
    }));

    vi.doMock('./router.js', () => ({
      default: () => React.createElement('div', null, 'Mock Router'),
    }));

    await import('./main.js');

    await waitFor(() => {
      expect(screen.getByTestId('splash-loading')).toBeDefined();
      expect(screen.getByText('Connecting to daemon')).toBeDefined();
    });
  });

  it('renders Router wrapped in Suspense when bootstrapStatus is ready', async () => {
    vi.doMock('./app-context.js', () => ({
      AppProvider: ({ children }) => React.createElement('div', null, children),
      useApp: () => ({
        bootstrapStatus: 'ready',
      }),
    }));

    vi.doMock('./components/app-splash.js', () => ({
      AppSplash: ({ phase }) =>
        React.createElement('div', { 'data-testid': 'splash-loading' }, phase),
    }));

    vi.doMock('./router.js', () => ({
      default: () =>
        React.createElement('div', { 'data-testid': 'active-router' }, 'Active Router'),
    }));

    await import('./main.js');

    await waitFor(() => {
      expect(screen.getByTestId('active-router')).toBeDefined();
    });
  });

  it('does not crash when root element is absent', async () => {
    rootContainer?.remove();
    await import('./main.js');
  });
});

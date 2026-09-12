import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import * as debugModule from './debug.js';
import Router from './router.js';

vi.mock('./components/topbar.js', () => ({
  Topbar: () => React.createElement('div', { 'data-testid': 'topbar' }, 'Topbar'),
}));

vi.mock('./components/overlays.js', () => ({
  NotificationSidebar: () => React.createElement('div', { 'data-testid': 'sidebar' }),
  RequiredModal: () => React.createElement('div', { 'data-testid': 'modal' }),
}));

vi.mock('./pages/sessions.js', () => ({
  default: () => React.createElement('div', null, 'Sessions Page'),
}));

vi.mock('./pages/tasks.js', () => ({
  default: () => React.createElement('div', null, 'Tasks Page'),
}));

vi.mock('./pages/flow.js', () => ({
  default: () => React.createElement('div', null, 'Flow Page'),
}));

vi.mock('./pages/translations.js', () => ({
  default: () => React.createElement('div', null, 'Translations Page'),
}));

vi.mock('./pages/prompts.js', () => ({
  default: () => React.createElement('div', null, 'Prompts Page'),
}));

vi.mock('./pages/settings.js', () => ({
  default: () => React.createElement('div', null, 'Settings Page'),
}));

describe('router module', () => {
  function renderWithRoute(url) {
    window.history.pushState(null, '', url);
    return render(
      React.createElement(
        Suspense,
        { fallback: React.createElement('div', null, 'Loading...') },
        React.createElement(Router),
      ),
    );
  }

  it('redirects root / to /sessions', async () => {
    renderWithRoute('/');
    await waitFor(() => {
      expect(screen.getByText('Sessions Page')).toBeDefined();
      expect(screen.getByTestId('topbar')).toBeDefined();
    });
  });

  it('routes /tasks and param routes to Tasks page', async () => {
    renderWithRoute('/tasks/sess-1/task-1');
    await waitFor(() => {
      expect(screen.getByText('Tasks Page')).toBeDefined();
    });
  });

  it('redirects /execution to /flow', async () => {
    renderWithRoute('/execution');
    await waitFor(() => {
      expect(screen.getByText('Flow Page')).toBeDefined();
    });
  });

  it('redirects /execution/:uid to /flow/:uid', async () => {
    renderWithRoute('/execution/task-42');
    await waitFor(() => {
      expect(screen.getByText('Flow Page')).toBeDefined();
      expect(window.location.pathname).toBe('/flow/task-42');
    });
  });

  it('routes to translations, prompts, and settings pages', async () => {
    const { unmount: u1 } = renderWithRoute('/translations/sess-1/job-1');
    await waitFor(() => expect(screen.getByText('Translations Page')).toBeDefined());
    u1();

    const { unmount: u2 } = renderWithRoute('/prompts/p-1');
    await waitFor(() => expect(screen.getByText('Prompts Page')).toBeDefined());
    u2();

    const { unmount: u3 } = renderWithRoute('/settings');
    await waitFor(() => expect(screen.getByText('Settings Page')).toBeDefined());
    u3();
  });

  it('redirects unknown route to /tasks', async () => {
    renderWithRoute('/non-existent-route-path');
    await waitFor(() => {
      expect(screen.getByText('Tasks Page')).toBeDefined();
    });
  });

  it('renders BrowserRouter with useTransitions={false} and ShellLayout route wrapper', () => {
    const tree = Router();
    expect(tree.props.useTransitions).toBe(false);

    const children = React.Children.toArray(tree.props.children);
    const routesElement = children.find((child) => child && child.props && child.props.children);
    expect(routesElement).toBeDefined();

    const rootRoute = routesElement.props.children;
    expect(rootRoute.props.element).toBeDefined();

    function SuspendingComponent() {
      throw new Promise(() => {});
    }

    const { container } = render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/testing-suspense'] },
        React.createElement(
          Routes,
          null,
          React.createElement(
            Route,
            { element: rootRoute.props.element },
            React.createElement(Route, {
              path: '/testing-suspense',
              element: React.createElement(SuspendingComponent),
            }),
          ),
        ),
      ),
    );

    expect(container.querySelector('.boot')).not.toBeNull();
    expect(container.querySelector('.splash-spinner')).not.toBeNull();
  });

  it('logs route changes via NavigationLogger and navigates across routes with Outlet and Suspense', async () => {
    const debugSpy = vi.spyOn(debugModule, 'debugLog');

    const { unmount } = renderWithRoute('/flow/sess-1/task-1');
    await waitFor(() => {
      expect(screen.getByText('Flow Page')).toBeDefined();
      expect(debugSpy).toHaveBeenCalledWith(
        'Router',
        expect.stringContaining('/flow/sess-1/task-1'),
      );
    });
    unmount();

    const { unmount: u2 } = renderWithRoute('/sessions');
    await waitFor(() => {
      expect(screen.getByText('Sessions Page')).toBeDefined();
      expect(debugSpy).toHaveBeenCalledWith('Router', expect.stringContaining('/sessions'));
    });
    u2();
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppSplash } from './app-splash.js';

describe('AppSplash component', () => {
  it('renders default phase and robot orb when no props are provided', () => {
    const { container } = render(React.createElement(AppSplash));
    expect(screen.getByText('Claude Tasks')).toBeDefined();
    expect(screen.getByText('multi-session workspace')).toBeDefined();
    expect(screen.getByText('Preparing session workspace')).toBeDefined();
    expect(container.querySelector('.splash-orb')).not.toBeNull();
    expect(container.querySelector('.app-splash.error')).toBeNull();
    expect(container.querySelector('.splash-spinner')).not.toBeNull();
  });

  it('renders custom phase when provided', () => {
    render(React.createElement(AppSplash, { phase: 'Connecting to daemon' }));
    expect(screen.getByText('Connecting to daemon')).toBeDefined();
  });

  it('falls back to default text when phase is empty string', () => {
    render(React.createElement(AppSplash, { phase: '' }));
    expect(screen.getByText('Preparing session workspace')).toBeDefined();
  });

  it('renders error state and handles onRetry callback', () => {
    const onRetry = vi.fn();
    const { container } = render(
      React.createElement(AppSplash, {
        error: new Error('Daemon unreachable'),
        onRetry,
      }),
    );

    expect(screen.getByText('⚠️')).toBeDefined();
    expect(screen.getByText('Dashboard could not start')).toBeDefined();
    expect(screen.getByText('Error: Daemon unreachable')).toBeDefined();
    expect(container.querySelector('.app-splash.error')).not.toBeNull();

    const retryBtn = screen.getByRole('button', { name: '↻ Retry' });
    expect(retryBtn.classList.contains('btn')).toBe(true);
    expect(retryBtn.classList.contains('btn--primary')).toBe(true);
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

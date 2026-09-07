import React, { ReactElement } from 'react';

export interface AppSplashProps {
  phase?: string | null | undefined;
  error?: unknown;
  onRetry?: (() => void) | undefined;
}

export function AppSplash({
  phase = 'Preparing session workspace',
  error = null,
  onRetry,
}: AppSplashProps): ReactElement {
  return (
    <div className={`app-splash${error ? ' error' : ''}`}>
      <div className="splash-orb">{error ? '⚠️' : '🤖'}</div>
      <div className="splash-brand">
        <strong>Claude Tasks</strong>
        <span>multi-session workspace</span>
      </div>
      {error ? (
        <>
          <h2>Dashboard could not start</h2>
          <pre className="splash-error">{String(error)}</pre>
          <button className="primary" onClick={onRetry}>
            ↻ Retry
          </button>
        </>
      ) : (
        <>
          <span className="splash-spinner" aria-hidden="true" />
          <p>{phase || 'Preparing session workspace'}</p>
        </>
      )}
    </div>
  );
}

import React, { ReactElement, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import Router from './router.js';
import { AppProvider, useApp } from './app-context.js';
import { AppSplash } from './components/app-splash.js';

function BootstrapGate(): ReactElement {
  const app = useApp();
  if (app.bootstrapStatus === 'error') {
    return (
      <AppSplash
        error={app.bootstrapError}
        onRetry={() => {
          void app.retryBootstrap();
        }}
      />
    );
  }
  if (app.bootstrapStatus !== 'ready') {
    return <AppSplash phase={app.bootstrapPhase} />;
  }
  return (
    <Suspense fallback={<AppSplash phase="Loading interface" />}>
      <Router />
    </Suspense>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <AppProvider>
      <BootstrapGate />
    </AppProvider>,
  );
}

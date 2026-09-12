import React, { lazy, ReactElement, Suspense, useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router';
import { Shell } from './components/shell.js';
import { debugLog } from './debug.js';

const Sessions = lazy(() => import('./pages/sessions.js'));
const Tasks = lazy(() => import('./pages/tasks.js'));
const Flow = lazy(() => import('./pages/flow.js'));
const Translations = lazy(() => import('./pages/translations.js'));
const Prompts = lazy(() => import('./pages/prompts.js'));
const Settings = lazy(() => import('./pages/settings.js'));

function ExecutionRedirect(): ReactElement {
  const { uid } = useParams();
  return <Navigate to={uid ? `/flow/${encodeURIComponent(uid)}` : '/flow'} replace />;
}

function NavigationLogger(): null {
  const location = useLocation();
  useEffect(() => {
    debugLog('Router', `Navigation to: ${location.pathname}${location.search}`);
  }, [location]);
  return null;
}

function ShellLayout(): ReactElement {
  return (
    <Shell>
      <Suspense
        fallback={
          <div className="boot">
            <span className="splash-spinner" aria-hidden="true" />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </Shell>
  );
}

export default function Router(): ReactElement {
  return (
    <BrowserRouter useTransitions={false}>
      <NavigationLogger />
      <Routes>
        <Route element={<ShellLayout />}>
          <Route path="/" element={<Navigate to="/sessions" replace />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/:sessionId/:uid" element={<Tasks />} />
          <Route path="/tasks/:uid" element={<Tasks />} />
          <Route path="/execution" element={<ExecutionRedirect />} />
          <Route path="/execution/:uid" element={<ExecutionRedirect />} />
          <Route path="/flow" element={<Flow />} />
          <Route path="/flow/:sessionId/:uid" element={<Flow />} />
          <Route path="/flow/:uid" element={<Flow />} />
          <Route path="/translations" element={<Translations />} />
          <Route path="/translations/:sessionId/:jobId" element={<Translations />} />
          <Route path="/translations/:jobId" element={<Translations />} />
          <Route path="/prompts" element={<Prompts />} />
          <Route path="/prompts/:promptId" element={<Prompts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/tasks" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

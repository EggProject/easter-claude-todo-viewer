import React, { ComponentType, lazy, ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router';
import { Shell } from './components/shell.js';

const Sessions = lazy(() => import('./pages/sessions.js'));
const Tasks = lazy(() => import('./pages/tasks.js'));
const Flow = lazy(() => import('./pages/flow.js'));
const Translations = lazy(() => import('./pages/translations.js'));
const Prompts = lazy(() => import('./pages/prompts.js'));
const Settings = lazy(() => import('./pages/settings.js'));

const page = (Component: ComponentType): ReactElement => (
  <Shell>
    <Component />
  </Shell>
);

function ExecutionRedirect(): ReactElement {
  const { uid } = useParams();
  return <Navigate to={uid ? `/flow/${encodeURIComponent(uid)}` : '/flow'} replace />;
}

export default function Router(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/sessions" replace />} />
        <Route path="/sessions" element={page(Sessions)} />
        <Route path="/tasks" element={page(Tasks)} />
        <Route path="/tasks/:sessionId/:uid" element={page(Tasks)} />
        <Route path="/tasks/:uid" element={page(Tasks)} />
        <Route path="/execution" element={<ExecutionRedirect />} />
        <Route path="/execution/:uid" element={<ExecutionRedirect />} />
        <Route path="/flow" element={page(Flow)} />
        <Route path="/flow/:sessionId/:uid" element={page(Flow)} />
        <Route path="/flow/:uid" element={page(Flow)} />
        <Route path="/translations" element={page(Translations)} />
        <Route path="/translations/:sessionId/:jobId" element={page(Translations)} />
        <Route path="/translations/:jobId" element={page(Translations)} />
        <Route path="/prompts" element={page(Prompts)} />
        <Route path="/prompts/:promptId" element={page(Prompts)} />
        <Route path="/settings" element={page(Settings)} />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

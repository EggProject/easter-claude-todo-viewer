import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
  ReactElement,
} from 'react';
import { API_BASE, apiUrl, getJSON, postJSON, deleteJSON } from './api.js';
import {
  AppContextValue,
  AppStateData,
  HistoryEvent,
  ModalState,
  Prompt,
  Session,
  SessionsState,
  Settings,
  TranslationJob,
  TranslationTableRow,
  isRecord,
  isSession,
  isTranslationJob,
  isPrompt,
  errorMessage,
} from './types.js';
import { debugLog } from './debug.js';

const AppContext = createContext<AppContextValue | null>(null);

export const useOptionalApp = (): AppContextValue | null => useContext(AppContext);

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
};

export function parseSessionsState(value: unknown): SessionsState {
  const fallback = {
    sessions: [],
    currentSessionId: null,
    watchedSessionIds: [],
  } satisfies SessionsState;

  if (!isRecord(value)) return fallback;
  const sessionsRaw = value['sessions'];
  const sessions: Session[] = Array.isArray(sessionsRaw) ? sessionsRaw.filter(isSession) : [];
  const currentSessionId =
    typeof value['currentSessionId'] === 'string' ? value['currentSessionId'] : null;
  const watchedRaw = value['watchedSessionIds'];
  const watchedSessionIds: string[] = Array.isArray(watchedRaw)
    ? watchedRaw.filter((id): id is string => typeof id === 'string')
    : [];

  return { sessions, currentSessionId, watchedSessionIds };
}

export function parseAppState(value: unknown): AppStateData | null {
  if (!isRecord(value)) return null;
  return value satisfies AppStateData;
}

export function parseHistory(value: unknown): HistoryEvent[] {
  if (!isRecord(value)) return [];
  const history = value['history'];
  if (Array.isArray(history)) {
    return history.filter(isRecord) satisfies HistoryEvent[];
  }
  return [];
}

export function parseJobs(value: unknown): TranslationJob[] {
  if (!isRecord(value)) return [];
  const jobs = value['jobs'];
  if (Array.isArray(jobs)) {
    return jobs.filter(isTranslationJob);
  }
  return [];
}

export function parseCatalog(value: unknown): TranslationTableRow[] {
  if (!isRecord(value)) return [];
  const tasks = value['tasks'];
  if (Array.isArray(tasks)) {
    return tasks.filter((x): x is TranslationTableRow => isRecord(x));
  }
  return [];
}

export function parseSettings(value: unknown): Settings | null {
  if (!isRecord(value)) return null;
  return value satisfies Settings;
}

export function parsePrompts(value: unknown): Prompt[] {
  if (!isRecord(value)) return [];
  const prompts = value['prompts'];
  if (Array.isArray(prompts)) {
    return prompts.filter(isPrompt);
  }
  return [];
}

export function AppProvider({ children }: { children?: ReactNode }): ReactElement {
  const [sessionsState, setSessionsState] = useState<SessionsState>({
    sessions: [],
    currentSessionId: null,
    watchedSessionIds: [],
  });
  const [state, setState] = useState<AppStateData | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [jobs, setJobs] = useState<TranslationJob[]>([]);
  const [translationCatalog, setTranslationCatalog] = useState<TranslationTableRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [live, setLive] = useState('CONNECTING');
  const [sidebar, setSidebar] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [revision, setRevision] = useState(0);
  const [bootstrapStatus, setBootstrapStatus] = useState('loading');
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapPhase, setBootstrapPhase] = useState('Connecting to multi-session daemon');
  const modalQueue = useRef<ModalState[]>([]);
  const loadedSessionIdRef = useRef<string | null>(null);
  const lastSwitchedTimeRef = useRef<number>(0);
  const inFlightSwitchRef = useRef<Map<string, Promise<void>>>(new Map());

  const currentSessionId = sessionsState.currentSessionId;
  const currentSession = useMemo<Session | null>(
    () => sessionsState.sessions.find((x) => x.id === currentSessionId) || null,
    [sessionsState.sessions, currentSessionId],
  );
  const watchedSessions = useMemo<Session[]>(
    () => sessionsState.sessions.filter((x) => sessionsState.watchedSessionIds.includes(x.id)),
    [sessionsState.sessions, sessionsState.watchedSessionIds],
  );

  const loadSessionsSnapshot = useCallback(async () => {
    const raw = await getJSON('/api/sessions');
    return parseSessionsState(raw);
  }, []);

  const refreshSessions = useCallback(async () => {
    const raw = await postJSON('/api/sessions/refresh', {});
    const next = parseSessionsState(raw);
    setSessionsState(next);
    return next;
  }, []);

  const refreshSessionsSnapshot = useCallback(async () => {
    const next = await loadSessionsSnapshot();
    setSessionsState(next);
    return next;
  }, [loadSessionsSnapshot]);

  const loadState = useCallback(async (sessionIds?: string[]) => {
    const query = sessionIds?.length
      ? `?sessionIds=${encodeURIComponent(sessionIds.join(','))}`
      : '';
    const raw = await getJSON(`/api/state${query}`);
    return parseAppState(raw);
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const nextState = await loadState(currentSessionId ? [currentSessionId] : []);
      setState(nextState);
      loadedSessionIdRef.current = currentSessionId;
    } catch {}
  }, [loadState, currentSessionId]);

  const loadHistory = useCallback(async (sessionIds?: string[]) => {
    const query = sessionIds?.length
      ? `?sessionIds=${encodeURIComponent(sessionIds.join(','))}`
      : '';
    const raw = await getJSON(`/api/history${query}`);
    return parseHistory(raw);
  }, []);

  const refreshHistory = useCallback(async () => {
    setHistory(await loadHistory());
  }, [loadHistory]);

  const refreshJobs = useCallback(async () => {
    const raw = await getJSON('/api/translations');
    setJobs(parseJobs(raw));
  }, []);

  const refreshCatalog = useCallback(async () => {
    const raw = await getJSON('/api/translation-catalog');
    setTranslationCatalog(parseCatalog(raw));
  }, []);

  const refreshSettings = useCallback(async () => {
    const raw = await getJSON('/api/settings');
    setSettings(parseSettings(raw));
  }, []);

  const refreshPrompts = useCallback(async () => {
    const raw = await getJSON('/api/prompts');
    setPrompts(parsePrompts(raw));
  }, []);

  const enqueue = useCallback((item: ModalState) => {
    setModal((current) => {
      if (current) {
        modalQueue.current.push(item);
        return current;
      }
      return item;
    });
  }, []);

  const acknowledge = useCallback(() => {
    setModal(() => modalQueue.current.shift() || null);
  }, []);

  const loadHeavyData = useCallback(async () => {
    await Promise.all([refreshHistory(), refreshJobs(), refreshCatalog()]);
    setRevision((x) => x + 1);
  }, [refreshHistory, refreshJobs, refreshCatalog]);

  const retryBootstrap = useCallback(async () => {
    setBootstrapStatus('loading');
    setBootstrapError(null);
    setBootstrapPhase('Loading session registry');
    try {
      const sessions = await loadSessionsSnapshot();
      setSessionsState(sessions);
      setBootstrapPhase('Preparing session workspace');
      const current = sessions.currentSessionId;
      const [nextSettingsRaw, nextPromptsRaw, nextState] = await Promise.all([
        getJSON('/api/settings'),
        getJSON('/api/prompts'),
        current ? loadState([current]) : Promise.resolve(null),
      ]);
      setSettings(parseSettings(nextSettingsRaw));
      setPrompts(parsePrompts(nextPromptsRaw));
      setState(nextState);
      loadedSessionIdRef.current = current;
      setBootstrapPhase('Loading interface');
      setBootstrapStatus('ready');
      loadHeavyData().catch((error: unknown) => {
        const message = errorMessage(error);
        enqueue({ kind: 'error', title: 'Background data load failed', message });
      });
    } catch (error: unknown) {
      const message = errorMessage(error);
      setBootstrapError(message);
      setBootstrapStatus('error');
    }
  }, [loadSessionsSnapshot, loadState, loadHeavyData, enqueue]);

  useEffect(() => {
    void retryBootstrap();
  }, [retryBootstrap]);

  useEffect(() => {
    if (bootstrapStatus !== 'ready') return;
    if (currentSessionId) {
      if (loadedSessionIdRef.current === currentSessionId) {
        debugLog(
          'AppState',
          `Skipping redundant refreshState() for session ${currentSessionId} (already in state)`,
        );
        return;
      }
      void refreshState();
    } else {
      setState(null);
      loadedSessionIdRef.current = null;
    }
  }, [currentSessionId, revision, bootstrapStatus, refreshState]);

  useEffect(() => {
    const es = new EventSource(apiUrl('/events'));
    es.onopen = () => setLive('LIVE');
    es.onerror = () => setLive('RECONNECTING');

    let stateInvalidatedTimer: ReturnType<typeof setTimeout> | null = null;
    let appStateChangedTimer: ReturnType<typeof setTimeout> | null = null;
    let sessionsChangedTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingReasons: string[] = [];

    const handleStateInvalidated = (e?: unknown): void => {
      let reason: string | undefined;
      let parsedData: unknown = isRecord(e) && 'data' in e ? e.data : e;
      if (typeof parsedData === 'string') {
        try {
          parsedData = JSON.parse(parsedData);
        } catch {}
      }
      if (isRecord(parsedData) && typeof parsedData['reason'] === 'string') {
        reason = parsedData['reason'];
      }
      if (reason) {
        pendingReasons.push(reason);
      }

      if (stateInvalidatedTimer !== null) {
        clearTimeout(stateInvalidatedTimer);
      }
      stateInvalidatedTimer = setTimeout(() => {
        stateInvalidatedTimer = null;
        const reasons = pendingReasons;
        pendingReasons = [];
        const onlySessionSwitched =
          reasons.length > 0 && reasons.every((r) => r === 'session-switched');
        const now = Date.now();
        const justSwitched = now - lastSwitchedTimeRef.current < 1500;

        if (justSwitched && onlySessionSwitched) {
          debugLog(
            'SSE',
            'Skipping state-invalidated refetches because session switch was just performed',
          );
          return;
        }

        if (!onlySessionSwitched) {
          loadedSessionIdRef.current = null;
        }

        setRevision((x) => x + 1);
        const tasks = [refreshSessionsSnapshot(), refreshHistory()];
        if (!onlySessionSwitched) {
          tasks.push(refreshJobs(), refreshCatalog());
        }
        Promise.all(tasks).catch(() => {});
      }, 100);
    };

    es.addEventListener('state-invalidated', (e: Event) => {
      handleStateInvalidated(e);
    });

    const handleAppStateChanged = (): void => {
      if (appStateChangedTimer !== null) {
        clearTimeout(appStateChangedTimer);
      }
      appStateChangedTimer = setTimeout(() => {
        appStateChangedTimer = null;
        const now = Date.now();
        const justSwitched = now - lastSwitchedTimeRef.current < 1500;
        if (justSwitched) {
          debugLog(
            'SSE',
            'Skipping app-state-changed refetch because session switch was just performed',
          );
          return;
        }
        refreshSessionsSnapshot()
          .then(() => setRevision((x) => x + 1))
          .catch(() => {});
      }, 100);
    };
    es.addEventListener('app-state-changed', handleAppStateChanged);

    const handleSessionsChanged = (): void => {
      if (sessionsChangedTimer !== null) {
        clearTimeout(sessionsChangedTimer);
      }
      sessionsChangedTimer = setTimeout(() => {
        sessionsChangedTimer = null;
        const now = Date.now();
        const justSwitched = now - lastSwitchedTimeRef.current < 1500;
        if (justSwitched) {
          debugLog(
            'SSE',
            'Skipping sessions-changed refetch because session switch was just performed',
          );
          return;
        }
        refreshSessionsSnapshot()
          .then(() => setRevision((x) => x + 1))
          .catch(() => {});
      }, 100);
    };
    es.addEventListener('sessions-changed', handleSessionsChanged);

    es.addEventListener('notification', (e: MessageEvent) => {
      try {
        const parsed: unknown = JSON.parse(String(e.data));
        if (isRecord(parsed)) {
          enqueue({ kind: 'notification', ...parsed });
        }
      } catch {}
      void refreshHistory();
      setRevision((x) => x + 1);
    });
    es.addEventListener('translation-error', (e: MessageEvent) => {
      try {
        const parsed: unknown = JSON.parse(String(e.data));
        if (isRecord(parsed)) {
          enqueue({ kind: 'translation-error', ...parsed });
        }
      } catch {}
      handleStateInvalidated({ reason: 'translation-error' });
    });
    let translationJobsTimer: ReturnType<typeof setTimeout> | null = null;
    es.addEventListener('translation-jobs-changed', () => {
      if (translationJobsTimer !== null) {
        clearTimeout(translationJobsTimer);
      }
      translationJobsTimer = setTimeout(() => {
        translationJobsTimer = null;
        Promise.all([refreshJobs(), refreshCatalog(), refreshSessionsSnapshot()])
          .then(() => setRevision((x) => x + 1))
          .catch(() => {});
      }, 250);
    });
    es.addEventListener('settings-changed', () => {
      refreshSettings().catch(() => {});
    });
    es.addEventListener('prompts-changed', () => {
      refreshPrompts().catch(() => {});
    });

    return () => {
      if (stateInvalidatedTimer !== null) {
        clearTimeout(stateInvalidatedTimer);
      }
      if (appStateChangedTimer !== null) {
        clearTimeout(appStateChangedTimer);
      }
      if (sessionsChangedTimer !== null) {
        clearTimeout(sessionsChangedTimer);
      }
      if (translationJobsTimer !== null) {
        clearTimeout(translationJobsTimer);
      }
      es.close();
    };
  }, [
    enqueue,
    refreshSessionsSnapshot,
    refreshHistory,
    refreshJobs,
    refreshCatalog,
    refreshSettings,
    refreshPrompts,
  ]);

  const switchSessionOptimistic = useCallback(
    async (sessionId: string) => {
      const pending = inFlightSwitchRef.current.get(sessionId);
      if (pending) {
        debugLog('Session', `Reusing in-flight switch for session: ${sessionId}`);
        return pending;
      }

      debugLog('Session', `Starting switchSessionOptimistic for: ${sessionId}`);
      const previous = sessionsState;
      const watched = new Set(previous.watchedSessionIds);
      watched.add(sessionId);
      const optimistic: SessionsState = {
        ...previous,
        currentSessionId: sessionId,
        watchedSessionIds: [...watched],
        sessions: previous.sessions.map((item) => ({
          ...item,
          current: item.id === sessionId,
          watched: watched.has(item.id),
        })),
      };
      setSessionsState(optimistic);

      const runSwitch = async (): Promise<void> => {
        try {
          await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/switch`, {});
          const [snapshot, nextState] = await Promise.all([
            loadSessionsSnapshot(),
            loadState([sessionId]),
          ]);
          setSessionsState(snapshot);
          setState(nextState);
          loadedSessionIdRef.current = sessionId;
          lastSwitchedTimeRef.current = Date.now();
          debugLog('Session', `Successfully switched to session: ${sessionId}`);
          setRevision((x) => x + 1);
        } catch (error: unknown) {
          setSessionsState(previous);
          const message = errorMessage(error);
          enqueue({ kind: 'error', title: 'Session switch failed', message });
          throw error;
        } finally {
          inFlightSwitchRef.current.delete(sessionId);
        }
      };

      const promise = runSwitch();
      inFlightSwitchRef.current.set(sessionId, promise);
      return promise;
    },
    [sessionsState, loadSessionsSnapshot, loadState, enqueue],
  );

  const setSessionLanguage = useCallback(
    async (sessionId: string, language: string) => {
      const previous = sessionsState;
      const watched = new Set(previous.watchedSessionIds);
      if (language === 'hu') watched.add(sessionId);
      setSessionsState({
        ...previous,
        watchedSessionIds: [...watched],
        sessions: previous.sessions.map((item) =>
          item.id === sessionId
            ? {
                ...item,
                watched: watched.has(item.id),
                globalLanguage: language,
                globalTranslationPending: language === 'hu',
              }
            : item,
        ),
      });
      try {
        await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/language`, { language });
        const snapshot = await loadSessionsSnapshot();
        setSessionsState(snapshot);
        if (sessionId === currentSessionId) {
          const nextState = await loadState([sessionId]);
          setState(nextState);
          loadedSessionIdRef.current = sessionId;
        }
        setRevision((x) => x + 1);
      } catch (error: unknown) {
        setSessionsState(previous);
        const message = errorMessage(error);
        enqueue({ kind: 'error', title: 'Session language change failed', message });
        throw error;
      }
    },
    [sessionsState, currentSessionId, loadSessionsSnapshot, loadState, enqueue],
  );

  const actions = useMemo(
    () => ({
      setSidebar,
      showModal: enqueue,
      acknowledge,
      refreshSessions,
      refreshSessionsSnapshot,
      refreshState,
      loadState,
      refreshHistory,
      loadHistory,
      refreshJobs,
      refreshCatalog,
      refreshSettings,
      refreshPrompts,
      retryBootstrap,
      switchSession: switchSessionOptimistic,
      switchSessionOptimistic,
      setSessionWatched: async (sessionId: string, watched: boolean): Promise<void> => {
        if (watched) {
          await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/watch`, {});
        } else {
          await deleteJSON(`/api/sessions/${encodeURIComponent(sessionId)}/watch`);
        }
        await refreshSessionsSnapshot();
        setRevision((x) => x + 1);
      },
      setSessionLanguage,
      cancelSessionLanguage: async (sessionId: string): Promise<void> => {
        await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/language/cancel`, {});
        await refreshSessionsSnapshot();
        setRevision((x) => x + 1);
      },
      toggleTaskLanguage: async (
        sessionId: string,
        uid: string,
        viewLanguage: string | undefined,
      ): Promise<void> => {
        await postJSON(
          `/api/sessions/${encodeURIComponent(sessionId)}/tasks/${encodeURIComponent(uid)}/language`,
          { language: viewLanguage === 'hu' ? 'en' : 'hu' },
        );
        setRevision((x) => x + 1);
        await Promise.all([refreshJobs(), refreshCatalog()]);
      },
      cancelTask: async (sessionId: string, uid: string): Promise<void> => {
        await postJSON(
          `/api/sessions/${encodeURIComponent(sessionId)}/tasks/${encodeURIComponent(uid)}/translation/cancel`,
        );
        setRevision((x) => x + 1);
        await Promise.all([refreshJobs(), refreshCatalog()]);
      },
      retryJob: async (sessionId: string, id: string): Promise<void> => {
        await postJSON(
          `/api/sessions/${encodeURIComponent(sessionId)}/translations/${encodeURIComponent(id)}/retry`,
          {},
        );
        await Promise.all([refreshJobs(), refreshCatalog()]);
      },
      cancelJob: async (sessionId: string, id: string): Promise<void> => {
        await postJSON(
          `/api/sessions/${encodeURIComponent(sessionId)}/translations/${encodeURIComponent(id)}/cancel`,
          {},
        );
        await Promise.all([refreshJobs(), refreshCatalog()]);
      },
      deleteJob: async (sessionId: string, id: string): Promise<void> => {
        await deleteJSON(
          `/api/sessions/${encodeURIComponent(sessionId)}/translations/${encodeURIComponent(id)}`,
        );
        await Promise.all([refreshJobs(), refreshCatalog()]);
        setRevision((x) => x + 1);
      },
    }),
    [
      enqueue,
      acknowledge,
      refreshSessions,
      refreshSessionsSnapshot,
      refreshState,
      loadState,
      refreshHistory,
      loadHistory,
      refreshJobs,
      refreshCatalog,
      refreshSettings,
      refreshPrompts,
      retryBootstrap,
      switchSessionOptimistic,
      setSessionLanguage,
    ],
  );

  const contextValue: AppContextValue = useMemo(
    () => ({
      API_BASE,
      sessionsState,
      currentSessionId,
      currentSession,
      watchedSessions,
      state,
      history,
      jobs,
      translationCatalog,
      settings,
      prompts,
      live,
      sidebar,
      modal,
      revision,
      bootstrapStatus,
      bootstrapError,
      bootstrapPhase,
      ...actions,
    }),
    [
      sessionsState,
      currentSessionId,
      currentSession,
      watchedSessions,
      state,
      history,
      jobs,
      translationCatalog,
      settings,
      prompts,
      live,
      sidebar,
      modal,
      revision,
      bootstrapStatus,
      bootstrapError,
      bootstrapPhase,
      actions,
    ],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

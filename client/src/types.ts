export interface TaskLifecycle {
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  createdAt?: string | undefined;
  firstSeenAt?: string | undefined;
  lastChangedAt?: string | undefined;
  deletedAt?: string | undefined;
}

export interface TaskSessionInfo {
  id?: string | undefined;
  label?: string | undefined;
  summary?: string | undefined;
  cwd?: string | undefined;
  gitBranch?: string | undefined;
  globalLanguage?: string | undefined;
}

export interface Task {
  uid: string;
  id: string;
  sessionId: string;
  storeId?: string | undefined;
  status: string;
  lastKnownStatus?: string | undefined;
  subject: string;
  description?: string | undefined;
  owner?: string | undefined;
  activeForm?: string | undefined;
  blockedBy?: string[] | undefined;
  blocks?: string[] | undefined;
  viewLanguage?: string | undefined;
  desiredLanguage?: string | undefined;
  effectiveLanguage?: string | undefined;
  translationState?: string | undefined;
  translationPending?: boolean | undefined;
  translationError?: string | undefined;
  sessionGlobalLanguage?: string | undefined;
  deletedAt?: string | undefined;
  lifecycle?: TaskLifecycle | undefined;
  session?: TaskSessionInfo | undefined;
}

export interface Session {
  id: string;
  label?: string | undefined;
  summary?: string | undefined;
  cwd?: string | undefined;
  gitBranch?: string | undefined;
  firstPrompt?: string | undefined;
  createdAt?: string | undefined;
  lastActivity?: string | undefined;
  messageCount?: number | undefined;
  fileSize?: number | undefined;
  taskCount?: number | undefined;
  deletedTaskCount?: number | undefined;
  translationCount?: number | undefined;
  current?: boolean | undefined;
  watched?: boolean | undefined;
  globalLanguage?: string | undefined;
  globalTranslationPending?: boolean | undefined;
}

export interface SessionsState {
  sessions: Session[];
  currentSessionId: string | null;
  watchedSessionIds: string[];
}

export interface PromptConflict {
  path: string;
  content: string;
}

export interface Prompt {
  id: string;
  status: string;
  installedVersion?: number | string | undefined;
  builtinVersion?: number | string | undefined;
  path?: string | undefined;
  body?: string | undefined;
  requiredVariables?: string[] | undefined;
  conflicts?: PromptConflict[] | undefined;
  diff?: string | undefined;
}

export interface ProviderSettings {
  baseUrl?: string | undefined;
  apiKey?: string | undefined;
  apiKeyConfigured?: boolean | undefined;
  model?: string | undefined;
  maxConcurrency?: number | undefined;
}

export interface AgyModelOption {
  slug: string;
  label: string;
}

export interface Settings {
  translation?:
    | {
        provider?: string | undefined;
        anthropic?: ProviderSettings | undefined;
        agy?: { model?: string | undefined; maxConcurrency?: number | undefined } | undefined;
      }
    | undefined;
  agyModels?: AgyModelOption[] | undefined;
  prompts?: { autoMigrate?: boolean | undefined } | undefined;
}

export interface TranslationUsage {
  total_tokens?: number | undefined;
  totalTokens?: number | undefined;
}

export interface TranslationAgentMeta {
  agentInstructions?: string | undefined;
  exactPrompt?: string | undefined;
  protectedSource?: { title?: string | undefined; description?: string | undefined } | undefined;
  rawResponse?: string | undefined;
  structuredOutput?: unknown;
  parsedCandidateRestored?:
    { title?: string | undefined; description?: string | undefined } | undefined;
  parsedVerdict?: { valid?: boolean | undefined; issues?: string[] | undefined } | undefined;
  deterministicChecks?: { valid?: boolean | undefined; issues?: string[] | undefined } | undefined;
  durationSeconds?: number | undefined;
  usage?: TranslationUsage | undefined;
}

export interface TranslationAttempt {
  index?: number | undefined;
  issues?: string[] | undefined;
  translator?: TranslationAgentMeta | undefined;
  validator?: TranslationAgentMeta | undefined;
}

export interface TranslationRun {
  run?: number | undefined;
  trigger?: string | undefined;
  attempts?: TranslationAttempt[] | undefined;
}

export interface TranslationJob {
  id: string;
  sessionId: string;
  taskId?: string | undefined;
  versionNumber?: number | undefined;
  current?: boolean | undefined;
  status: string;
  textFingerprint?: string | undefined;
  provider?: string | undefined;
  model?: string | undefined;
  trigger?: string | undefined;
  attempt?: number | undefined;
  maxAttempts?: number | undefined;
  queuedAt?: string | undefined;
  startedAt?: string | undefined;
  finishedAt?: string | undefined;
  durationSeconds?: number | undefined;
  totalTokens?: number | undefined;
  run?: number | undefined;
  error?: string | undefined;
  attempts?: TranslationAttempt[] | undefined;
  runs?: TranslationRun[] | undefined;
}

export interface HistoryChange {
  field?: string | undefined;
  label?: string | undefined;
  before?: unknown;
  after?: unknown;
}

export interface HistoryEvent {
  id?: string | undefined;
  sessionId?: string | undefined;
  session?: TaskSessionInfo | undefined;
  kind?: string | undefined;
  source?: string | undefined;
  title?: string | undefined;
  subject?: string | undefined;
  taskId?: string | undefined;
  uid?: string | undefined;
  detectedAt?: string | undefined;
  provider?: string | undefined;
  model?: string | undefined;
  run?: number | undefined;
  taskSnapshot?: Task | undefined;
  changes?: HistoryChange[] | undefined;
}

export interface ModalSummaryItem {
  sessionId?: string | undefined;
  jobId?: string | undefined;
  message?: string | undefined;
}

export interface ModalSummary {
  selected?: number | undefined;
  stopped?: number | undefined;
  retryStarted?: number | undefined;
  deleted?: number | undefined;
  skippedSuccess?: number | undefined;
  skippedActive?: number | undefined;
  skippedTerminal?: number | undefined;
  skippedNotRetryable?: number | undefined;
  skippedMissing?: number | undefined;
  errors?: ModalSummaryItem[] | undefined;
  [key: string]: unknown;
}

export interface ModalState {
  kind: string;
  title?: string | undefined;
  message?: string | undefined;
  taskId?: string | undefined;
  session?: TaskSessionInfo | undefined;
  changes?: HistoryChange[] | HistoryEvent[] | undefined;
  summary?: ModalSummary | undefined;
  failures?: Array<{ taskId?: string | undefined; message?: string | undefined }> | undefined;
}

export interface AppStateData {
  tasks?: Task[] | undefined;
  initialStatus?: string | undefined;
  initialSort?: string | undefined;
}

export interface TranslationTaskRow {
  kind: 'task';
  taskId: string;
  uid: string;
  sessionId: string;
  session?: Session | TaskSessionInfo | undefined;
  title?: string | undefined;
  viewLanguage?: string | undefined;
  effectiveLanguage?: string | undefined;
  translationState?: string | undefined;
  versionCount?: number | undefined;
  present?: boolean | undefined;
  children?: TranslationVersionRow[] | undefined;
  [key: string]: unknown;
}

export interface TranslationVersionRow extends TranslationJob {
  kind: 'version';
  session?: Session | TaskSessionInfo | undefined;
  [key: string]: unknown;
}

export type TranslationTableRow = TranslationTaskRow | TranslationVersionRow;

export interface AppContextValue {
  API_BASE: string;
  sessionsState: SessionsState;
  currentSessionId: string | null;
  currentSession: Session | null;
  watchedSessions: Session[];
  state: AppStateData | null;
  history: HistoryEvent[];
  jobs: TranslationJob[];
  translationCatalog: TranslationTableRow[];
  settings: Settings | null;
  prompts: Prompt[];
  live: string;
  sidebar: boolean;
  modal: ModalState | null;
  revision: number;
  bootstrapStatus: string;
  bootstrapError: string | null;
  bootstrapPhase: string;
  setSidebar: (open: boolean) => void;
  showModal: (modal: ModalState) => void;
  acknowledge: () => void;
  refreshSessions: () => Promise<SessionsState>;
  refreshSessionsSnapshot: () => Promise<SessionsState>;
  refreshState: () => Promise<void>;
  loadState: (sessionIds?: string[]) => Promise<AppStateData | null>;
  refreshHistory: () => Promise<void>;
  loadHistory: (sessionIds?: string[]) => Promise<HistoryEvent[]>;
  refreshJobs: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshPrompts: () => Promise<void>;
  retryBootstrap: () => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  switchSessionOptimistic: (sessionId: string) => Promise<void>;
  setSessionWatched: (sessionId: string, watched: boolean) => Promise<void>;
  setSessionLanguage: (sessionId: string, language: string) => Promise<void>;
  cancelSessionLanguage: (sessionId: string) => Promise<void>;
  toggleTaskLanguage: (
    sessionId: string,
    uid: string,
    viewLanguage: string | undefined,
  ) => Promise<void>;
  cancelTask: (sessionId: string, uid: string) => Promise<void>;
  retryJob: (sessionId: string, id: string) => Promise<void>;
  cancelJob: (sessionId: string, id: string) => Promise<void>;
  deleteJob: (sessionId: string, id: string) => Promise<void>;
}

// Typeguards
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;
  return (
    typeof value['uid'] === 'string' &&
    typeof value['id'] === 'string' &&
    typeof value['sessionId'] === 'string' &&
    typeof value['status'] === 'string' &&
    typeof value['subject'] === 'string'
  );
}

export function isSession(value: unknown): value is Session {
  if (!isRecord(value)) return false;
  return typeof value['id'] === 'string';
}

export function isTranslationJob(value: unknown): value is TranslationJob {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['sessionId'] === 'string' &&
    typeof value['status'] === 'string'
  );
}

export function isPrompt(value: unknown): value is Prompt {
  if (!isRecord(value)) return false;
  return typeof value['id'] === 'string';
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

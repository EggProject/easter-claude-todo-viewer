import React, { ReactElement } from 'react';
import { Task } from '../types.js';

export interface LanguageBadgeSpec {
  key: string;
  label: string;
  title: string;
}

export function languageBadgeSpec(task: Partial<Task> = {}): LanguageBadgeSpec {
  const wanted = task.viewLanguage || task.desiredLanguage || 'en';
  const shown = task.effectiveLanguage || 'en';
  const state = task.translationState || 'missing';
  const sessionGlobalLanguage = task.sessionGlobalLanguage || task.session?.globalLanguage || 'en';
  if (wanted === 'hu') {
    if (shown === 'hu' && state === 'ready')
      return { key: 'hu-ready', label: '🌐 HU', title: 'Hungarian translation is ready and shown' };
    if (state === 'failed')
      return {
        key: 'hu-failed',
        label: '⚠ HU',
        title: 'Hungarian requested, but the current translation failed',
      };
    return {
      key: 'hu-pending',
      label: '⏳ HU',
      title: `Hungarian requested; current translation state: ${state}`,
    };
  }
  if (sessionGlobalLanguage === 'hu')
    return {
      key: 'en-override',
      label: 'EN override',
      title: 'This task is explicitly English while the session default is Hungarian',
    };
  if (state === 'ready')
    return {
      key: 'hu-cached',
      label: '✓ HU cached',
      title: 'Showing English; a valid Hungarian translation is cached for this version',
    };
  return { key: 'en', label: 'EN', title: 'Showing English' };
}

const EGG_BADGE_CLASSES: Record<string, string> = {
  'hu-ready': 'badge badge--success',
  'hu-failed': 'badge badge--danger',
  'hu-pending': 'badge badge--warning',
  'en-override': 'badge badge--info',
  'hu-cached': 'badge badge--yolk',
  en: 'badge badge--outline',
};

export interface TaskLanguageBadgeProps {
  task: Partial<Task>;
  compact?: boolean | undefined;
}

export function TaskLanguageBadge({ task, compact = false }: TaskLanguageBadgeProps): ReactElement {
  const spec = languageBadgeSpec(task);
  const eggBadgeClass = EGG_BADGE_CLASSES[spec.key];
  return (
    <span
      className={`task-language-badge ${eggBadgeClass} ${spec.key}${compact ? ' compact' : ''}`}
      title={spec.title}
    >
      {spec.label}
    </span>
  );
}

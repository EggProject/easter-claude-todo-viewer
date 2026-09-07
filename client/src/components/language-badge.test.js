import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { languageBadgeSpec, TaskLanguageBadge } from './language-badge.js';

describe('language-badge module', () => {
  describe('languageBadgeSpec', () => {
    it('returns default en spec when task is empty or omitted', () => {
      expect(languageBadgeSpec()).toEqual({
        key: 'en',
        label: 'EN',
        title: 'Showing English',
      });
    });

    it('returns hu-ready when wanted and shown is hu with ready state', () => {
      const task = {
        viewLanguage: 'hu',
        effectiveLanguage: 'hu',
        translationState: 'ready',
      };
      expect(languageBadgeSpec(task)).toEqual({
        key: 'hu-ready',
        label: '🌐 HU',
        title: 'Hungarian translation is ready and shown',
      });
    });

    it('returns hu-failed when wanted is hu and state is failed', () => {
      const task = {
        desiredLanguage: 'hu',
        translationState: 'failed',
      };
      expect(languageBadgeSpec(task)).toEqual({
        key: 'hu-failed',
        label: '⚠ HU',
        title: 'Hungarian requested, but the current translation failed',
      });
    });

    it('returns hu-pending when wanted is hu and state is pending/translating', () => {
      const task = {
        viewLanguage: 'hu',
        translationState: 'translating',
      };
      expect(languageBadgeSpec(task)).toEqual({
        key: 'hu-pending',
        label: '⏳ HU',
        title: 'Hungarian requested; current translation state: translating',
      });
    });

    it('returns en-override when session global language is hu but task is en', () => {
      expect(languageBadgeSpec({ viewLanguage: 'en', sessionGlobalLanguage: 'hu' })).toEqual({
        key: 'en-override',
        label: 'EN override',
        title: 'This task is explicitly English while the session default is Hungarian',
      });
      expect(languageBadgeSpec({ viewLanguage: 'en', session: { globalLanguage: 'hu' } })).toEqual({
        key: 'en-override',
        label: 'EN override',
        title: 'This task is explicitly English while the session default is Hungarian',
      });
    });

    it('returns hu-cached when task is en but translation state is ready', () => {
      const task = {
        viewLanguage: 'en',
        translationState: 'ready',
      };
      expect(languageBadgeSpec(task)).toEqual({
        key: 'hu-cached',
        label: '✓ HU cached',
        title: 'Showing English; a valid Hungarian translation is cached for this version',
      });
    });
  });

  describe('TaskLanguageBadge component', () => {
    it('renders badge with correct title and class in normal mode', () => {
      const task = { viewLanguage: 'hu', effectiveLanguage: 'hu', translationState: 'ready' };
      const { container } = render(React.createElement(TaskLanguageBadge, { task }));

      const badge = screen.getByText('🌐 HU');
      expect(badge).toBeDefined();
      expect(badge.getAttribute('title')).toBe('Hungarian translation is ready and shown');
      expect(container.querySelector('.task-language-badge.hu-ready')).not.toBeNull();
      expect(container.querySelector('.compact')).toBeNull();
    });

    it('renders badge in compact mode', () => {
      const task = { viewLanguage: 'en' };
      const { container } = render(React.createElement(TaskLanguageBadge, { task, compact: true }));

      expect(container.querySelector('.task-language-badge.en.compact')).not.toBeNull();
    });
  });
});

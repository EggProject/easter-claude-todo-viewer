import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationSidebar, RequiredModal } from './overlays.js';
import * as appContextModule from '../app-context.js';

vi.mock('../app-context.js', () => ({
  useApp: vi.fn(),
}));

describe('overlays module', () => {
  let mockApp;

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockApp = {
      sidebar: false,
      modal: null,
      history: [],
      watchedSessions: [],
      setSidebar: vi.fn(),
      acknowledge: vi.fn(),
    };
    vi.mocked(appContextModule.useApp).mockReturnValue(mockApp);
  });

  describe('NotificationSidebar component', () => {
    it('returns null when app.sidebar is false', () => {
      const { container } = render(React.createElement(NotificationSidebar));
      expect(container.firstChild).toBeNull();
    });

    it('renders sidebar, handles close triggers, filters, and displays cards', () => {
      mockApp.sidebar = true;
      mockApp.watchedSessions = [
        { id: 'sess-1', label: 'Session One' },
        { id: 'sess-2', summary: 'Session Two' },
      ];
      mockApp.history = [
        {
          id: 'ev-1',
          sessionId: 'sess-1',
          session: { label: 'Session One' },
          taskId: '10',
          kind: 'created',
          source: 'source',
          detectedAt: '2026-01-01T00:00:00Z',
          taskSnapshot: { viewLanguage: 'en' },
          changes: [{ field: 'status', label: 'Status', before: null, after: 'pending' }],
        },
        {
          id: 'ev-2',
          sessionId: 'sess-2',
          taskId: '20',
          kind: 'translated',
          source: 'translation',
          provider: 'ollama',
          model: 'qwen',
          run: 1,
          detectedAt: '2026-01-02T00:00:00Z',
          changes: [{ field: 'subject', before: 'Old', after: 'New' }],
        },
        {
          id: 'ev-3',
          sessionId: 'sess-1',
          taskId: '30',
          kind: 'deleted',
          source: 'source',
          detectedAt: '2026-01-03T00:00:00Z',
          changes: [],
        },
      ];

      const { unmount } = render(React.createElement(NotificationSidebar));

      expect(screen.getByText('🔔 Session history')).toBeDefined();
      expect(screen.getByText('3 matching event(s)')).toBeDefined();

      // Filter by session
      const sessionSelect = screen.getByLabelText('Filter history session');
      fireEvent.change(sessionSelect, { target: { value: 'sess-1' } });
      expect(screen.getByText('2 matching event(s)')).toBeDefined();

      // Filter by event type
      const typeSelect = screen.getByLabelText('Filter history event type');
      fireEvent.change(typeSelect, { target: { value: 'lifecycle' } });
      expect(screen.getByText('2 matching event(s)')).toBeDefined();

      // Filter by search query
      const queryInput = screen.getByPlaceholderText('Filter history…');
      fireEvent.change(queryInput, { target: { value: 'nonexistent' } });
      expect(screen.getByText('0 matching event(s)')).toBeDefined();
      expect(screen.getByText('No history events match the current filters.')).toBeDefined();

      // Reset query and sort
      fireEvent.change(queryInput, { target: { value: '' } });
      fireEvent.change(typeSelect, { target: { value: 'all' } });
      fireEvent.change(sessionSelect, { target: { value: 'all' } });
      const sortSelect = screen.getByLabelText('Sort history');
      fireEvent.change(sortSelect, { target: { value: 'oldest' } });

      // Close via close button
      const closeBtn = screen.getByRole('button', { name: '✕' });
      fireEvent.click(closeBtn);
      expect(mockApp.setSidebar).toHaveBeenCalledWith(false);

      // Close via Escape key
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(mockApp.setSidebar).toHaveBeenCalledWith(false);

      // Close via backdrop click
      const backdrop = document.querySelector('.panel-backdrop');
      fireEvent.click(backdrop);
      expect(mockApp.setSidebar).toHaveBeenCalledWith(false);

      unmount();
    });

    it('covers all history event type categories in historyEventType', () => {
      mockApp.sidebar = true;
      mockApp.history = [
        {
          id: 'ev-owner',
          sessionId: 's1',
          changes: [{ field: 'owner', before: 'a', after: 'b' }],
        },
        {
          id: 'ev-dep',
          sessionId: 's1',
          changes: [{ field: 'blockedBy', before: [], after: ['1'] }],
        },
        {
          id: 'ev-text',
          sessionId: 's1',
          changes: [{ field: 'description', before: 'a', after: 'b' }],
        },
        {
          id: 'ev-other',
          sessionId: 's1',
          changes: [{ field: 'extra', before: 'x', after: 'y' }],
        },
      ];

      render(React.createElement(NotificationSidebar));
      expect(screen.getByText('4 matching event(s)')).toBeDefined();
    });
  });

  describe('RequiredModal component', () => {
    it('returns null when app.modal is null', () => {
      const { container } = render(React.createElement(RequiredModal));
      expect(container.firstChild).toBeNull();
    });

    it('renders notification modal with single task update', () => {
      mockApp.modal = {
        kind: 'notification',
        session: { id: 'sess-1', label: 'Primary' },
        changes: [
          {
            id: 'ev-1',
            taskId: '42',
            title: 'Refactor Auth',
            taskSnapshot: { viewLanguage: 'hu', effectiveLanguage: 'hu', translationState: 'ready' },
            changes: [{ field: 'status', label: 'Status', before: 'pending', after: 'in_progress' }],
          },
        ],
      };

      render(React.createElement(RequiredModal));
      expect(screen.getByText('✨ CLAUDE TASK UPDATE')).toBeDefined();
      expect(screen.getByText('Task #42 updated')).toBeDefined();
      expect(screen.getByText('🧵 Primary')).toBeDefined();

      const okBtn = screen.getByRole('button', { name: 'OK' });
      fireEvent.click(okBtn);
      expect(mockApp.acknowledge).toHaveBeenCalledTimes(1);
    });

    it('renders notification modal with multiple task updates', () => {
      mockApp.modal = {
        kind: 'notification',
        changes: [
          { id: '1', taskId: '1', changes: [] },
          { id: '2', taskId: '2', changes: [] },
        ],
      };

      render(React.createElement(RequiredModal));
      expect(screen.getByText('2 task updates')).toBeDefined();
    });

    it('renders translation error modal with debug hint and error kicker', () => {
      mockApp.modal = {
        kind: 'translation-error',
        taskId: '99',
        message: 'Ollama timed out during translation',
      };

      render(React.createElement(RequiredModal));
      expect(screen.getByText('❌ TRANSLATION FAILED')).toBeDefined();
      expect(screen.getByText('Task #99 could not be translated')).toBeDefined();
      expect(screen.getByText('Ollama timed out during translation')).toBeDefined();
      expect(
        screen.getByText('Run the server with --log-output --log-file for detailed diagnostics.', { exact: false }),
      ).toBeDefined();
    });

    it('renders bulk summary modal with summary stats and error messages', () => {
      mockApp.modal = {
        kind: 'bulk-summary',
        title: 'Bulk Translation Summary',
        summary: {
          selected: 10,
          stopped: 2,
          retryStarted: 3,
          deleted: 1,
          skippedSuccess: 2,
          skippedActive: 1,
          skippedTerminal: 1,
          errors: [
            { sessionId: 'sess-long-string-to-compact-properly', jobId: 'job-1', message: 'API rate limit' },
          ],
        },
      };

      render(React.createElement(RequiredModal));
      expect(screen.getByText('Bulk Translation Summary')).toBeDefined();
      expect(screen.getByText('Selected / considered')).toBeDefined();
      expect(screen.getByText('Stopped')).toBeDefined();
      expect(screen.getByText('Retry started')).toBeDefined();
      expect(screen.getByText('Errors · 1')).toBeDefined();
      expect(screen.getByText('API rate limit', { exact: false })).toBeDefined();
    });

    it('renders modal with failures list and fallback title', () => {
      mockApp.modal = {
        kind: 'error',
        message: 'Global fallback failure message',
        failures: [
          { taskId: '12', message: 'Syntax error in source' },
          { message: '' }, // missing taskId and empty message falling back to modal.message
        ],
      };

      render(React.createElement(RequiredModal));
      expect(screen.getByText('Session updated')).toBeDefined();
      expect(screen.getByText('Task #12')).toBeDefined();
      expect(screen.getByText('Syntax error in source')).toBeDefined();
      expect(screen.getByText('Global fallback failure message')).toBeDefined();
    });

    it('renders modal with plain message when no body produced', () => {
      mockApp.modal = {
        message: 'Plain informational notice',
      };

      render(React.createElement(RequiredModal));
      expect(screen.getByText('Plain informational notice')).toBeDefined();
      expect(screen.getByText('Session updated')).toBeDefined();
    });

    it('renders notification modal with 0 events fallback title and session without label', () => {
      mockApp.modal = {
        kind: 'notification',
        session: { id: 'sess-bare' },
        changes: [],
      };

      render(React.createElement(RequiredModal));
      expect(screen.getByText('0 task updates')).toBeDefined();
      expect(screen.getByText('🧵 sess-bare')).toBeDefined();
    });

    it('renders modal with generic changes array when not notification', () => {
      mockApp.modal = {
        kind: 'update',
        title: 'Custom Changes',
        changes: [
          { field: 'owner', label: 'Assignee', before: 'devA', after: 'devB' },
          { field: 'unknown_custom_field', before: { complex: 1 }, after: 123 },
          { before: null, after: null },
        ],
      };

      render(React.createElement(RequiredModal));
      expect(screen.getByText('Custom Changes')).toBeDefined();
      expect(screen.getByText('👤 Assignee')).toBeDefined();
    });

    it('renders bulk summary with minimal selected-only counters and bare error items', () => {
      mockApp.modal = {
        kind: 'bulk-summary',
        summary: {
          selected: 0,
          errors: [{ message: 'Unknown error occurred' }],
        },
      };

      render(React.createElement(RequiredModal));
      expect(screen.getByText('Selected / considered')).toBeDefined();
      expect(screen.getByText('job: Unknown error occurred')).toBeDefined();
    });
  });

  describe('overlays formatters and icons edge cases', () => {
    it('covers formatDate with throw/invalid date and compact formatting', () => {
      mockApp.sidebar = true;
      const throwingDateObj = {
        toString() { throw new Error('date toString fail'); },
      };
      // Date spy to force catch in formatDate
      const spy = vi.spyOn(Date.prototype, 'toLocaleString').mockImplementationOnce(() => {
        throw new Error('format fail');
      });

      mockApp.history = [
        {
          id: 'ev-err',
          sessionId: 's-short',
          detectedAt: '2026-01-01',
          source: 'unknown-source',
          kind: 'other',
          provider: 'local',
          changes: [{ field: 'metadata' }],
        },
        {
          id: 'ev-no-session',
          changes: [],
        },
      ];

      render(React.createElement(NotificationSidebar));
      expect(screen.getByText('2 matching event(s)')).toBeDefined();
      spy.mockRestore();
    });

    it('filters out events when historyTypeFilter does not match', () => {
      mockApp.sidebar = true;
      mockApp.history = [
        { id: '1', changes: [{ field: 'status' }] },
        { id: '2', changes: [{ field: 'owner' }] },
      ];

      render(React.createElement(NotificationSidebar));
      const typeSelect = screen.getByLabelText('Filter history event type');
      fireEvent.change(typeSelect, { target: { value: 'owner' } });
      expect(screen.getByText('1 matching event(s)')).toBeDefined();
    });

    it('covers fallbacks in NotificationSidebar and HistoryCard', () => {
      // Set empty strings in localStorage for historyFilters to cover lines 28-30
      window.localStorage.setItem(
        'claude-todos:history-filters',
        JSON.stringify({ q: '', session: '', type: '', sort: '' }),
      );
      mockApp.sidebar = true;
      mockApp.watchedSessions = null; // covers line 52: app.watchedSessions || []
      mockApp.history = null; // covers line 41: app.history || []

      const { unmount } = render(React.createElement(NotificationSidebar));
      expect(screen.getByText('0 matching event(s)')).toBeDefined();

      // Keydown other than Escape covers line 34 false branch
      fireEvent.keyDown(window, { key: 'Enter' });
      expect(mockApp.setSidebar).not.toHaveBeenCalledWith(false);

      unmount();

      // Render with sessions having missing labels/summaries, and events with missing sessionIds, changes, etc.
      mockApp.watchedSessions = [{ id: 'bare-id' }]; // covers line 61
      mockApp.history = [
        {
          id: 'ev-subject-title',
          sessionId: '', // covers line 68: event.sessionId || 'session'
          kind: 'other',
          subject: 'Subject Title',
          changes: null, // covers line 83 and line 122: event.changes || []
        },
        {
          id: 'ev-no-subject',
          sessionId: null,
          kind: 'other',
          changes: [{ field: 'status' }], // no label, covers line 130 changes[0].label || changes[0].field
        },
      ];

      render(React.createElement(NotificationSidebar));
      expect(screen.getByText('2 matching event(s)')).toBeDefined();
      expect(screen.getByText('bare-id')).toBeDefined();
    });

    it('covers modal notificationBlocks fallbacks and modalSession fallbacks', () => {
      // Single event notification with no taskId and no id, no title, with subject
      mockApp.modal = {
        kind: 'notification',
        session: { cwd: '/test' }, // no label, no id covers line 112
        changes: [
          {
            // no id, no taskId covers line 19
            subject: 'Subject Only', // no title covers line 20
            changes: null, // covers line 21
          },
        ],
      };

      render(React.createElement(RequiredModal));
      expect(screen.getByText('Task #— updated')).toBeDefined();
      expect(screen.getByText('🧵 Session')).toBeDefined();
    });

    it('covers modal summary with no errors and error without sessionId', () => {
      mockApp.modal = {
        kind: 'bulk-summary',
        summary: {
          selected: 1,
          errors: null, // covers line 101: modal.summary.errors || []
        },
      };

      const { unmount } = render(React.createElement(RequiredModal));
      expect(screen.getByText('Selected / considered')).toBeDefined();
      unmount();

      mockApp.modal = {
        kind: 'bulk-summary',
        summary: {
          selected: 1,
          errors: [{ jobId: '', message: 'Err message' }], // covers item.sessionId falsy and jobId || 'job'
        },
      };

      render(React.createElement(RequiredModal));
      expect(screen.getByText('job: Err message')).toBeDefined();
    });

    it('covers compact with null and historySearchText with empty changes', () => {
      mockApp.sidebar = true;
      mockApp.history = [
        {
          // no id covers line 68: event.id || index
          sessionId: 'sess-1',
          changes: null, // covers line 132: event.changes || [] in historySearchText
        },
      ];

      const { unmount } = render(React.createElement(NotificationSidebar));
      // Type query to trigger historySearchText with event having changes: null
      const queryInput = screen.getByPlaceholderText('Filter history…');
      fireEvent.change(queryInput, { target: { value: 'sess-1' } });
      expect(screen.getByText('1 matching event(s)')).toBeDefined();
      unmount();

      // Test 1: Getter for modal.summary.errors to cover line 101 ...(modal.summary.errors || [])
      let errorAccessCount = 0;
      mockApp.modal = {
        kind: 'bulk-summary',
        summary: {
          selected: 1,
          get errors() {
            errorAccessCount++;
            // First access is length check in if, second access is length in text, third access is in body.push map
            if (errorAccessCount >= 3) return null;
            return [{ jobId: 'j1', message: 'msg' }];
          },
        },
      };

      const { unmount: unmountSummary } = render(React.createElement(RequiredModal));
      expect(screen.getByText('Errors · 1')).toBeDefined();
      unmountSummary();

      // Test 2: Getter for item.sessionId to cover line 134 compact(null)
      let sessionAccessCount = 0;
      mockApp.modal = {
        kind: 'bulk-summary',
        summary: {
          selected: 1,
          errors: [
            {
              get sessionId() {
                sessionAccessCount++;
                return sessionAccessCount === 1 ? 'truthy-sess' : null;
              },
              jobId: 'j2',
              message: 'msg2',
            },
          ],
        },
      };

      render(React.createElement(RequiredModal));
      expect(screen.getByText('Errors · 1')).toBeDefined();
    });
  });
});

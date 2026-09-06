import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskHistory } from './task-history.js';
import * as appContextModule from '../app-context.js';

vi.mock('../app-context.js', () => ({
  useApp: vi.fn(),
}));

vi.mock('react-diff-viewer-continued', () => ({
  default: ({ oldValue, newValue }) =>
    React.createElement('div', { 'data-testid': 'diff-viewer' }, `${oldValue} -> ${newValue}`),
  DiffMethod: { WORDS: 'words' },
}));

describe('TaskHistory component', () => {
  let mockApp;
  const sampleTask = { uid: 's1:task-1', sessionId: 's1', id: '1' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApp = { history: [] };
    vi.mocked(appContextModule.useApp).mockReturnValue(mockApp);
  });

  it('renders empty message when no events exist', () => {
    render(React.createElement(TaskHistory, { task: sampleTask }));
    expect(screen.getByText('No history events match the current filters.')).toBeDefined();
  });

  it('filters by origin, change types, and search text, and supports sorting', () => {
    mockApp.history = [
      {
        id: 'ev-1',
        sessionId: 's1',
        uid: 's1:task-1',
        kind: 'created',
        source: 'source',
        detectedAt: '2026-01-01T10:00:00Z',
        changes: [{ field: 'status', before: null, after: 'pending' }],
      },
      {
        id: 'ev-2',
        sessionId: 's1',
        uid: 's1:task-1',
        kind: 'translated',
        source: 'translation',
        provider: 'ollama',
        model: 'qwen',
        run: 2,
        detectedAt: '2026-01-02T10:00:00Z',
        changes: [{ field: 'subject', before: 'Old Title', after: 'New Title' }],
      },
      {
        id: 'ev-3',
        sessionId: 's1',
        uid: 's1:task-1',
        kind: 'updated',
        source: 'source',
        detectedAt: '2026-01-03T10:00:00Z',
        changes: [
          { field: 'owner', before: 'alice', after: 'bob' },
          { field: 'blockedBy', before: [], after: ['2'] },
        ],
      },
    ];

    render(React.createElement(TaskHistory, { task: sampleTask }));

    expect(screen.getByText('Task created')).toBeDefined();
    expect(screen.getByText('Hungarian translation ready')).toBeDefined();
    expect(screen.getByText('2 fields changed')).toBeDefined();
    expect(screen.getAllByTestId('diff-viewer')).toHaveLength(1);

    // Search query filter
    const input = screen.getByPlaceholderText('Filter history…');
    fireEvent.change(input, { target: { value: 'qwen' } });
    expect(screen.queryByText('Task created')).toBeNull();
    expect(screen.getByText('Hungarian translation ready')).toBeDefined();

    // Clear search
    fireEvent.change(input, { target: { value: '' } });

    // Toggle origin chip off
    const translationChip = screen.getByLabelText('🌐 Translation');
    fireEvent.click(translationChip);
    expect(screen.queryByText('Hungarian translation ready')).toBeNull();

    // Toggle origin chip back on
    fireEvent.click(translationChip);
    expect(screen.getByText('Hungarian translation ready')).toBeDefined();

    // Toggle change type chip
    const ownerChip = screen.getByLabelText(/Owner/i);
    fireEvent.click(ownerChip);
    fireEvent.click(ownerChip);

    // Change sorting to oldest first
    const sortSelect = screen.getByLabelText('Sort history');
    fireEvent.change(sortSelect, { target: { value: 'oldest' } });
    expect(sortSelect.value).toBe('oldest');
  });

  it('covers all event icons, titles, and change types', () => {
    mockApp.history = [
      {
        id: 'ev-del',
        sessionId: 's1',
        uid: 's1:task-1',
        kind: 'deleted',
        source: 'source',
        changes: [],
      },
      {
        id: 'ev-desc',
        sessionId: 's1',
        uid: 's1:task-1',
        kind: 'updated',
        source: 'source',
        changes: [{ field: 'description', label: 'Details', before: { a: 1 }, after: '' }],
      },
      {
        id: 'ev-dep',
        sessionId: 's1',
        uid: 's1:task-1',
        kind: 'updated',
        source: 'source',
        changes: [{ field: 'blocks', before: null, after: ['3'] }],
      },
      {
        id: 'ev-other',
        sessionId: 's1',
        uid: 's1:task-1',
        kind: 'custom_kind',
        source: 'source',
        provider: 'anthropic',
        changes: [{ field: 'metadata', before: '1', after: '2' }],
      },
      {
        id: 'ev-activeForm',
        sessionId: 's1',
        uid: 's1:task-1',
        kind: 'updated',
        source: 'source',
        changes: [{ field: 'activeForm', before: 'a', after: 'b' }],
      },
      {
        id: 'ev-fallback',
        sessionId: 's1',
        uid: 's1:task-1',
        kind: 'updated',
        source: 'source',
        changes: [{ field: 'unknownField', before: 'x', after: 'y' }],
      },
      {
        id: 'ev-status-only',
        sessionId: 's1',
        uid: 's1:task-1',
        detectedAt: '2026-01-01',
        changes: [{ field: 'status', before: 'pending', after: 'completed' }],
      },
      {
        id: 'ev-owner-only',
        sessionId: 's1',
        uid: 's1:task-1',
        changes: [{ field: 'owner', before: 'alice', after: 'bob' }],
      },
      {
        id: 'ev-empty-changes',
        sessionId: 's1',
        uid: 's1:task-1',
        changes: [],
      },
      {
        id: 'ev-multi-changes',
        sessionId: 's1',
        uid: 's1:task-1',
        changes: [
          { field: 'status', before: 'pending', after: 'completed' },
          { field: 'owner', before: 'alice', after: 'bob' },
        ],
      },
    ];

    const spy = vi.spyOn(Date.prototype, 'toLocaleString').mockImplementationOnce(() => {
      throw new Error('time format fail');
    });

    const { unmount } = render(React.createElement(TaskHistory, { task: sampleTask }));

    expect(screen.getByText('Task removed')).toBeDefined();
    expect(screen.getByText('Details changed')).toBeDefined();
    expect(screen.getByText('2 fields changed')).toBeDefined();

    // Test unchecking a filter to filter out an event
    const chips = screen.getAllByRole('checkbox');
    // Change filter chip
    fireEvent.click(chips[chips.length - 1]);

    // Test search filter filtering out events
    const input = screen.getByPlaceholderText('Filter history…');
    fireEvent.change(input, { target: { value: 'nonexistent-filter-query' } });
    expect(screen.getByText('No history events match the current filters.')).toBeDefined();

    spy.mockRestore();
    unmount();
  });

  it('covers null app.history and null event.changes fallbacks and missing change.field key', () => {
    // Test null app.history (covers line 52 and line 70)
    mockApp.history = null;
    const { unmount } = render(React.createElement(TaskHistory, { task: sampleTask }));
    expect(screen.getByText('No history events match the current filters.')).toBeDefined();
    unmount();

    // Test event with null changes (covers lines 101, 141, 156, 168, 179)
    // and a change with missing field (covers line 101 change.field || index)
    mockApp.history = [
      {
        id: 'ev-null-changes',
        sessionId: 's1',
        uid: 's1:task-1',
        kind: 'other',
        title: 'null-title',
        source: 'source',
        changes: null,
      },
      {
        id: 'ev-no-field',
        sessionId: 's1',
        uid: 's1:task-1',
        kind: 'other',
        source: 'source',
        changes: [{ label: 'Fieldless change', before: '1', after: '2' }],
      },
    ];

    render(React.createElement(TaskHistory, { task: sampleTask }));
    expect(screen.getByText('Fieldless change changed')).toBeDefined();
    expect(screen.getByText('0 fields changed')).toBeDefined();

    // Trigger searchable by typing query when event has null changes (covers line 179)
    const input = screen.getByPlaceholderText('Filter history…');
    fireEvent.change(input, { target: { value: 'null-title' } });
    expect(screen.getByText('0 fields changed')).toBeDefined();
  });
});

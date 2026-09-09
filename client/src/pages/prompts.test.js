import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import PromptsPage from './prompts.js';
import * as appContextModule from '../app-context.js';
import * as apiModule from '../api.js';

vi.mock('../app-context.js', () => ({
  useApp: vi.fn(),
}));

vi.mock('../api.js', () => ({
  getJSON: vi.fn(),
  postJSON: vi.fn(),
}));

describe('PromptsPage', () => {
  let mockApp;

  const samplePrompts = [
    {
      id: 'task-translator',
      status: 'current',
      installedVersion: '1.0.0',
      builtinVersion: '1.0.0',
      path: '/path/to/task-translator.txt',
    },
    {
      id: 'task-validator',
      status: 'modified',
      installedVersion: '1.0.0',
      builtinVersion: '1.1.0',
      path: '/path/to/task-validator.txt',
    },
    {
      id: 'prompt-conflict',
      status: 'conflict',
      installedVersion: '1.0.0',
      builtinVersion: '2.0.0',
      path: '/path/to/prompt-conflict.txt',
    },
    {
      id: 'prompt-custom',
      status: 'custom_status',
      installedVersion: '1.0.0',
      builtinVersion: '1.0.0',
      path: '/path/to/prompt-custom.txt',
    },
    {
      id: 'prompt-update-available',
      status: 'update_available',
      installedVersion: '1.0.0',
      builtinVersion: '1.2.0',
      path: '/path/to/prompt-update.txt',
    },
  ];

  const samplePromptDetail = {
    id: 'task-translator',
    status: 'modified',
    installedVersion: '1.0.0',
    builtinVersion: '1.1.0',
    path: '/path/to/task-translator.txt',
    requiredVariables: ['sourceText', 'targetLanguage'],
    body: 'Translate {{sourceText}} to {{targetLanguage}}.',
    diff: '+ Added custom guidance',
    conflicts: [
      {
        path: '/path/to/task-translator.txt.conflict',
        content: '<<<<<<< HEAD\nMine\n=======\nTheirs\n>>>>>>> builtin',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApp = {
      prompts: [...samplePrompts],
      refreshPrompts: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(appContextModule.useApp).mockReturnValue(mockApp);
    vi.mocked(apiModule.getJSON).mockResolvedValue(structuredClone(samplePromptDetail));
    vi.mocked(apiModule.postJSON).mockResolvedValue(structuredClone(samplePromptDetail));
  });

  function renderPage(initialEntry = '/prompts', path = '/prompts') {
    return render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path,
            element: React.createElement(PromptsPage, null),
          }),
        ),
      ),
    );
  }

  it('renders prompt cards with statuses and versions', () => {
    renderPage();

    expect(screen.getByText('Prompt files')).toBeDefined();
    expect(screen.getByText('task-translator')).toBeDefined();
    expect(screen.getByText('task-validator')).toBeDefined();
    expect(screen.getByText('prompt-conflict')).toBeDefined();

    // Check status labels
    expect(screen.getByText('✅ Current')).toBeDefined();
    expect(screen.getByText('✏️ Modified')).toBeDefined();
    expect(screen.getByText('⚠ Conflict')).toBeDefined();
    expect(screen.getByText('⬆ Update available')).toBeDefined();
    expect(screen.getByText('custom_status')).toBeDefined();
  });

  it('handles clicking card to navigate and migrate updates button', async () => {
    renderPage();

    // Migrate button
    const migrateBtn = screen.getByRole('button', { name: '↻ Check / migrate updates' });
    fireEvent.click(migrateBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalledWith('/api/prompts/migrate');
      expect(mockApp.refreshPrompts).toHaveBeenCalled();
    });

    // Card click
    const card = screen.getByText('task-translator').closest('button');
    fireEvent.click(card);
  });

  it('renders prompt editor when promptId param is present', async () => {
    renderPage('/prompts/task-translator', '/prompts/:promptId');

    await waitFor(() => {
      expect(screen.getByText('PROMPT EDITOR')).toBeDefined();
    });

    // Check editor details
    expect(screen.getByText(/Required variables:/)).toBeDefined();
    expect(screen.getAllByText(/sourceText/)).toHaveLength(2);

    // Check textarea
    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe('Translate {{sourceText}} to {{targetLanguage}}.');

    // Edit textarea
    fireEvent.change(textarea, { target: { value: 'Updated prompt content' } });
    expect(textarea.value).toBe('Updated prompt content');

    // Save prompt
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalledWith('/api/prompts/task-translator', {
        body: 'Updated prompt content',
      });
      expect(screen.getByText('✅ Saved')).toBeDefined();
      expect(mockApp.refreshPrompts).toHaveBeenCalled();
    });

    // Check conflict block
    expect(screen.getByText('⚠ Migration conflict')).toBeDefined();

    // Check diff block
    expect(screen.getByText('Diff vs builtin')).toBeDefined();
    expect(screen.getByText('+ Added custom guidance')).toBeDefined();

    // Close editor
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
  });

  it('handles restore builtin prompt with confirm dialog', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage('/prompts/task-translator', '/prompts/:promptId');

    await waitFor(() => {
      expect(screen.getByText('PROMPT EDITOR')).toBeDefined();
    });

    const restoreBtn = screen.getByRole('button', { name: 'Restore builtin' });
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalledWith('/api/prompts/task-translator/restore');
      expect(screen.getByText('✅ Restored')).toBeDefined();
      expect(mockApp.refreshPrompts).toHaveBeenCalled();
    });

    // When confirm is cancelled
    confirmSpy.mockReturnValue(false);
    fireEvent.click(restoreBtn);
    expect(apiModule.postJSON).toHaveBeenCalledTimes(1);

    confirmSpy.mockRestore();
  });

  it('handles errors in loading, saving, and restoring prompt', async () => {
    // Error loading prompt
    vi.mocked(apiModule.getJSON).mockRejectedValueOnce(new Error('Load prompt error'));
    renderPage('/prompts/task-translator', '/prompts/:promptId');

    await waitFor(() => {
      expect(screen.getByText('Loading prompt…')).toBeDefined();
    });

    // Re-render with success load then test save and restore error
    const { unmount } = renderPage('/prompts/task-translator', '/prompts/:promptId');
    await waitFor(() => {
      expect(screen.getByText('PROMPT EDITOR')).toBeDefined();
    });

    // Save failure
    vi.mocked(apiModule.postJSON).mockRejectedValueOnce(new Error('Save prompt failed'));
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('❌ Save prompt failed')).toBeDefined();
    });

    // Restore failure
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(apiModule.postJSON).mockRejectedValueOnce(new Error('Restore prompt failed'));
    const restoreBtn = screen.getByRole('button', { name: 'Restore builtin' });
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(screen.getByText('❌ Restore prompt failed')).toBeDefined();
    });
    confirmSpy.mockRestore();
    unmount();
  });

  it('handles non-Error string rejection in loading, saving, and restoring prompt', async () => {
    vi.mocked(apiModule.getJSON).mockRejectedValueOnce('Raw string load error');
    renderPage('/prompts/task-translator', '/prompts/:promptId');

    await waitFor(() => {
      expect(screen.getByText('Loading prompt…')).toBeDefined();
    });

    const { unmount } = renderPage('/prompts/task-translator', '/prompts/:promptId');
    await waitFor(() => {
      expect(screen.getByText('PROMPT EDITOR')).toBeDefined();
    });

    vi.mocked(apiModule.postJSON).mockRejectedValueOnce('Raw string save error');
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('❌ Raw string save error')).toBeDefined();
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(apiModule.postJSON).mockRejectedValueOnce('Raw string restore error');
    const restoreBtn = screen.getByRole('button', { name: 'Restore builtin' });
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(screen.getByText('❌ Raw string restore error')).toBeDefined();
    });
    confirmSpy.mockRestore();
    unmount();
  });

  it('renders diff fallback when diff is empty and handles empty conflicts/variables', async () => {
    vi.mocked(apiModule.getJSON).mockResolvedValueOnce({
      id: 'task-clean',
      status: 'current',
      installedVersion: '1.0.0',
      builtinVersion: '1.0.0',
      path: '/path/clean.txt',
      body: '',
      diff: '',
      conflicts: [],
      requiredVariables: [],
    });

    renderPage('/prompts/task-clean', '/prompts/:promptId');

    await waitFor(() => {
      expect(screen.getByText('No differences.')).toBeDefined();
    });
    expect(screen.queryByText(/Required variables:/)).toBeNull();
    expect(screen.queryByText('Migration conflict')).toBeNull();
  });

  it('handles null app.prompts gracefully', () => {
    mockApp.prompts = null;
    renderPage();
    expect(screen.getByText('Prompt files')).toBeDefined();
  });

  it('handles unmounting during fetch and null body returns on save/restore', async () => {
    // Unmount during getJSON to trigger if (!active) return
    let resolveGet;
    vi.mocked(apiModule.getJSON).mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveGet = r;
        }),
    );
    const { unmount } = renderPage('/prompts/task-unmount', '/prompts/:promptId');
    unmount();
    resolveGet({ id: 'task-unmount' });

    // Save and restore returning empty/null body
    vi.mocked(apiModule.getJSON).mockResolvedValueOnce({
      id: 'task-nullbody',
      status: 'unknown_status_fallback',
      installedVersion: null,
      body: null,
    });
    vi.mocked(apiModule.postJSON).mockResolvedValueOnce({ body: null });

    const r2 = renderPage('/prompts/task-nullbody', '/prompts/:promptId');
    await waitFor(() => {
      expect(screen.getByText('task-nullbody')).toBeDefined();
    });

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(screen.getByText('✅ Saved')).toBeDefined();
    });

    // Restore returning null body
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(apiModule.postJSON).mockResolvedValueOnce({ body: null });
    const restoreBtn = screen.getByRole('button', { name: 'Restore builtin' });
    fireEvent.click(restoreBtn);
    await waitFor(() => {
      expect(screen.getByText('✅ Restored')).toBeDefined();
    });
    confirmSpy.mockRestore();

    r2.unmount();

    // Test detail.conflicts getter to cover line 136 ...(detail.conflicts || [])
    let conflictsAccessCount = 0;
    const dynamicPromptDetail = {
      id: 'task-dynamic-conflicts',
      body: 'body',
      get conflicts() {
        conflictsAccessCount++;
        if (conflictsAccessCount === 1)
          return [{ path: '/conflict.txt', content: 'conflict text' }];
        return null;
      },
    };
    vi.mocked(apiModule.getJSON).mockResolvedValueOnce(dynamicPromptDetail);

    const r3 = renderPage('/prompts/task-dynamic-conflicts', '/prompts/:promptId');
    await waitFor(() => {
      expect(screen.getByText('⚠ Migration conflict')).toBeDefined();
    });
    r3.unmount();
  });

  it('renders prompt detail with null metric values', async () => {
    vi.mocked(apiModule.getJSON).mockResolvedValueOnce({
      id: 'task-null-metrics',
      body: 'Prompt body with null metrics',
      installedVersion: null,
      builtinVersion: null,
      status: null,
      path: null,
    });

    const { unmount } = renderPage('/prompts/task-null-metrics', '/prompts/:promptId');
    await waitFor(() => {
      expect(screen.getByText('PROMPT EDITOR')).toBeDefined();
    });
    unmount();
  });
});

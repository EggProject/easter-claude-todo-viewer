import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SettingsPage from './settings.js';
import * as appContextModule from '../app-context.js';
import * as apiModule from '../api.js';

vi.mock('../app-context.js', () => ({
  useApp: vi.fn(),
}));

vi.mock('../api.js', () => ({
  getJSON: vi.fn(),
  postJSON: vi.fn(),
}));

describe('SettingsPage', () => {
  let mockApp;

  const defaultSettings = {
    translation: {
      provider: 'agy',
      agy: {
        model: 'omlx-medium',
        maxConcurrency: 2,
      },
      anthropic: {
        baseUrl: 'http://127.0.0.1:8000',
        apiKey: '',
        apiKeyConfigured: false,
        model: 'claude-3-5-sonnet-20241022',
        maxConcurrency: 3,
      },
    },
    agyModels: [
      { slug: 'omlx-small', label: 'OMLX Small' },
      { slug: 'omlx-medium', label: 'OMLX Medium' },
    ],
    prompts: {
      autoMigrate: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApp = {
      settings: structuredClone(defaultSettings),
      refreshSettings: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(appContextModule.useApp).mockReturnValue(mockApp);
    vi.mocked(apiModule.getJSON).mockResolvedValue({
      models: [
        { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
      ],
    });
    vi.mocked(apiModule.postJSON).mockResolvedValue(structuredClone(defaultSettings));
  });

  function renderPage() {
    return render(React.createElement(SettingsPage, null));
  }

  it('renders loading state when settings are not yet loaded', () => {
    mockApp.settings = null;
    renderPage();
    expect(screen.getByText(/Loading settings/i)).toBeDefined();
  });

  it('renders agy provider settings and updates agy inputs', async () => {
    renderPage();

    expect(screen.getByText('Configuration')).toBeDefined();
    expect(screen.getByText('Translation provider')).toBeDefined();

    // Select provider dropdown
    const providerSelect = screen.getByRole('combobox', { name: /Provider/i });
    expect(providerSelect.value).toBe('agy');

    // Agy model select
    const modelSelect = screen.getByRole('combobox', { name: /Model/i });
    expect(modelSelect.value).toBe('omlx-medium');
    fireEvent.change(modelSelect, { target: { value: 'omlx-small' } });

    // Concurrency input
    const concurrencyInput = screen.getByRole('spinbutton', { name: /Maximum concurrent jobs/i });
    expect(concurrencyInput.value).toBe('2');
    fireEvent.change(concurrencyInput, { target: { value: '4' } });

    // Save provider settings
    const saveButtons = screen.getAllByRole('button', { name: /Save provider settings/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          translation: expect.objectContaining({
            provider: 'agy',
            agy: { model: 'omlx-small', maxConcurrency: 4 },
          }),
        }),
      );
      expect(screen.getByText('✅ Settings saved')).toBeDefined();
      expect(mockApp.refreshSettings).toHaveBeenCalled();
    });
  });

  it('switches to anthropic provider, loads models, tests connection, and saves api key', async () => {
    renderPage();

    // Switch provider to anthropic
    const providerSelect = screen.getByRole('combobox', { name: /Provider/i });
    fireEvent.change(providerSelect, { target: { value: 'anthropic' } });

    await waitFor(() => {
      expect(apiModule.getJSON).toHaveBeenCalledWith('/api/providers/anthropic/models');
    });

    // Base URL input
    const baseUrlInput = screen.getByRole('textbox', { name: /Base URL/i });
    fireEvent.change(baseUrlInput, { target: { value: 'https://api.anthropic.com' } });

    // Anthropic model change
    const modelSelect = screen.getByRole('combobox', { name: /Model/i });
    fireEvent.change(modelSelect, { target: { value: 'claude-3-haiku-20240307' } });

    // Anthropic concurrency change
    const concurrencyInput = screen.getByRole('spinbutton', { name: /Maximum concurrent jobs/i });
    fireEvent.change(concurrencyInput, { target: { value: '5' } });

    // API key input
    const apiKeyInput = screen.getByLabelText(/API key/i);
    fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-test-key' } });

    // Test connection button
    vi.mocked(apiModule.postJSON).mockResolvedValueOnce({
      models: [
        { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { id: 'claude-no-label' },
      ],
      count: 0,
    });
    const testBtn = screen.getByRole('button', { name: /Test connection/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText(/✅ Connection OK · 0 model\(s\)/i)).toBeDefined();
    });

    // Refresh models button
    vi.mocked(apiModule.postJSON).mockResolvedValueOnce({
      models: [
        { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { id: 'claude-no-label' },
      ],
      count: 2,
    });
    const refreshBtn = screen.getByRole('button', { name: /Refresh models/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByText(/✅ 2 model\(s\) discovered/i)).toBeDefined();
    });

    // Save with API key
    vi.mocked(apiModule.postJSON).mockResolvedValueOnce(defaultSettings);
    const saveBtn = screen.getByRole('button', { name: /Save provider settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          translation: expect.objectContaining({
            provider: 'anthropic',
            anthropic: expect.objectContaining({
              apiKey: 'sk-ant-test-key',
              baseUrl: 'https://api.anthropic.com',
            }),
          }),
        }),
      );
    });
  });

  it('handles error messages on failed test connection and failed save', async () => {
    renderPage();

    // Switch to anthropic
    const providerSelect = screen.getByRole('combobox', { name: /Provider/i });
    fireEvent.change(providerSelect, { target: { value: 'anthropic' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Test connection/i }).disabled).toBe(false);
    });

    // Test connection failure
    vi.mocked(apiModule.postJSON).mockRejectedValueOnce(new Error('Unauthorized'));
    const testBtn = screen.getByRole('button', { name: /Test connection/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText(/❌ Unauthorized/)).toBeDefined();
    });

    // Save failure
    vi.mocked(apiModule.postJSON).mockRejectedValueOnce(new Error('Save failed'));
    const saveBtn = screen.getByRole('button', { name: /Save provider settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/❌ Save failed/)).toBeDefined();
    });
  });

  it('updates prompts autoMigrate checkbox and saves prompt settings', async () => {
    renderPage();

    const autoMigrateCheckbox = screen.getByRole('checkbox', {
      name: /Automatically migrate built-in prompt updates/i,
    });
    expect(autoMigrateCheckbox.checked).toBe(true);

    fireEvent.click(autoMigrateCheckbox);
    expect(autoMigrateCheckbox.checked).toBe(false);

    const savePromptBtn = screen.getByRole('button', { name: /Save prompt settings/i });
    fireEvent.click(savePromptBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          prompts: { autoMigrate: false },
        }),
      );
    });
  });

  it('displays configured placeholder when apiKeyConfigured is true', () => {
    mockApp.settings.translation.provider = 'anthropic';
    mockApp.settings.translation.anthropic.apiKeyConfigured = true;
    renderPage();

    const apiKeyInput = screen.getByLabelText(/API key/i);
    expect(apiKeyInput.getAttribute('placeholder')).toMatch(/Configured/);
  });

  it('covers model fetch failure catch, refresh failure catch, and model already in options', async () => {
    // Initial fetch of models rejects (covers line 12 catch)
    vi.mocked(apiModule.getJSON).mockRejectedValueOnce(new Error('Fetch models failed'));
    mockApp.settings.translation.provider = 'anthropic';
    mockApp.settings.translation.anthropic.model = 'claude-3-5-sonnet-20241022';
    mockApp.settings.translation.anthropic.apiKey = '';

    const { unmount } = renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /↻ Refresh models/i })).toBeDefined();
    });

    // Refresh models rejects (covers line 19 catch)
    vi.mocked(apiModule.postJSON).mockRejectedValueOnce(new Error('Refresh models failed'));
    const refreshBtn = screen.getByRole('button', { name: /↻ Refresh models/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByText(/❌ Refresh models failed/)).toBeDefined();
    });

    // Save with empty apiKey (tests false branch of if (anth.apiKey))
    vi.mocked(apiModule.postJSON).mockResolvedValueOnce(defaultSettings);
    const saveBtn = screen.getByRole('button', { name: /Save provider settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          translation: expect.objectContaining({
            provider: 'anthropic',
          }),
        }),
      );
    });

    // Test concurrency input with empty string / clamped values
    const concurrencyInput = screen.getByRole('spinbutton', { name: /Maximum concurrent jobs/i });
    fireEvent.change(concurrencyInput, { target: { value: '' } });
    fireEvent.change(concurrencyInput, { target: { value: '99' } });
    fireEvent.change(concurrencyInput, { target: { value: '0' } });

    unmount();
  });

  it('covers empty and missing translation configs, agyModels missing, and unconfigured fields', async () => {
    vi.mocked(apiModule.getJSON).mockResolvedValueOnce({}); // Covers d.models || [] in line 12
    mockApp.settings = {
      translation: null, // tr fallback
      prompts: null, // form.prompts fallback
    };

    renderPage();
    expect(screen.getByText('Configuration')).toBeDefined();

    // Provider default 'agy'
    const providerSelect = screen.getByRole('combobox', { name: /Provider/i });
    expect(providerSelect.value).toBe('agy');

    // Change provider on empty translation object to trigger ??= {}
    fireEvent.change(providerSelect, { target: { value: 'anthropic' } });

    // Save with missing agy/anth fields
    const saveBtn = screen.getByRole('button', { name: /Save provider settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalled();
    });
  });

  it('covers anthropic models without label, empty model, missing d.models, and discover without args', async () => {
    // Model option with no label (triggers m.label || m.id)
    vi.mocked(apiModule.getJSON).mockResolvedValueOnce({
      models: [{ id: 'custom-model-without-label' }],
    });

    mockApp.settings = {
      translation: {
        provider: 'anthropic',
        anthropic: {
          baseUrl: '', // empty baseUrl to trigger || 'http://127.0.0.1:8000'
          apiKey: 'some-key',
          model: '', // empty model to trigger || ''
          maxConcurrency: 0, // falsy maxConcurrency to trigger || 2
        },
      },
      prompts: { autoMigrate: false },
    };

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('custom-model-without-label')).toBeDefined();
    });

    // Test discover with d.models = null (covers d.models || [] and d.models?.length || 0)
    vi.mocked(apiModule.postJSON).mockResolvedValueOnce({
      models: null,
      count: 0,
    });

    const refreshBtn = screen.getByRole('button', { name: /↻ Refresh models/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByText(/✅ 0 model\(s\) discovered/)).toBeDefined();
    });
  });

  it('covers unmounting during anthropic models getJSON fetch', () => {
    let resolveGet;
    vi.mocked(apiModule.getJSON).mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveGet = r;
        }),
    );

    mockApp.settings = {
      translation: {
        provider: 'anthropic',
        anthropic: { baseUrl: 'http://test', model: 'test-m' },
      },
    };

    const { unmount } = renderPage();
    unmount();
    resolveGet({ models: [] });
  });

  it('asserts that SettingsPage structure places cards inside .settings-grid', () => {
    const { container } = renderPage();
    const grid = container.querySelector('.settings-grid');
    expect(grid).not.toBeNull();
    const cards = grid?.querySelectorAll('.settings-card') ?? [];
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(grid?.querySelector('.provider-card')).not.toBeNull();
    expect(grid?.querySelector('.prompts-card')).not.toBeNull();
  });
});


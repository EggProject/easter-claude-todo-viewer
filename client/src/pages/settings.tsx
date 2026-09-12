import React, { ReactElement, useEffect, useState } from 'react';
import { Settings as SettingsIcon, Plug, FlaskConical, Save, Brain, FileEdit } from 'lucide-react';
import { useApp } from '../app-context.js';
import { getJSON, postJSON } from '../api.js';
import { Settings, isRecord, errorMessage } from '../types.js';

interface ModelOption {
  id: string;
  label?: string | undefined;
}

export default function SettingsPage(): ReactElement {
  const a = useApp();
  const [form, setForm] = useState<Settings | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [msg, setMsg] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (a.settings) setForm(structuredClone(a.settings));
  }, [a.settings]);

  const provider = form?.translation?.provider;

  useEffect(() => {
    if (provider !== 'anthropic') return;
    let alive = true;
    setLoadingModels(true);
    getJSON('/api/providers/anthropic/models')
      .then((d: unknown) => {
        if (alive && isRecord(d) && Array.isArray(d['models'])) {
          const rawModels = d['models'].filter(isRecord);
          setModels(
            rawModels.map((m) => ({
              id: String(m['id']),
              label: m['label'] ? String(m['label']) : undefined,
            })),
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoadingModels(false);
      });
    return () => {
      alive = false;
    };
  }, [provider]);

  if (!form) return <div className="page">Loading settings…</div>;

  const tr = form.translation || {};
  const anth = tr.anthropic || {};
  const agy = tr.agy || {};

  const updateForm = (fn: (current: Settings) => Settings): void => {
    setForm((f) => {
      /* v8 ignore next */
      if (!f) return f;
      return fn(f);
    });
  };

  const setProvider = (p: string): void =>
    updateForm((f) => ({ ...f, translation: { ...f.translation, provider: p } }));
  const setAgyModel = (m: string): void =>
    updateForm((f) => ({
      ...f,
      translation: { ...f.translation, agy: { ...f.translation?.agy, model: m } },
    }));
  const setAgyConcurrency = (c: number): void =>
    updateForm((f) => ({
      ...f,
      translation: { ...f.translation, agy: { ...f.translation?.agy, maxConcurrency: c } },
    }));
  const setAnthropicBaseUrl = (b: string): void =>
    updateForm((f) => ({
      ...f,
      translation: { ...f.translation, anthropic: { ...f.translation?.anthropic, baseUrl: b } },
    }));
  const setAnthropicApiKey = (k: string): void =>
    updateForm((f) => ({
      ...f,
      translation: { ...f.translation, anthropic: { ...f.translation?.anthropic, apiKey: k } },
    }));
  const setAnthropicModel = (m: string): void =>
    updateForm((f) => ({
      ...f,
      translation: { ...f.translation, anthropic: { ...f.translation?.anthropic, model: m } },
    }));
  const setAnthropicConcurrency = (c: number): void =>
    updateForm((f) => ({
      ...f,
      translation: {
        ...f.translation,
        anthropic: { ...f.translation?.anthropic, maxConcurrency: c },
      },
    }));
  const setAutoMigrate = (checked: boolean): void =>
    updateForm((f) => ({ ...f, prompts: { ...f.prompts, autoMigrate: checked } }));

  const discover = async (labelText = 'model(s) discovered'): Promise<unknown> => {
    setLoadingModels(true);
    try {
      const d: unknown = await postJSON('/api/providers/anthropic/test', {
        baseUrl: anth.baseUrl,
        apiKey: anth.apiKey || '',
        model: anth.model,
      });
      const rawList = isRecord(d) && Array.isArray(d['models']) ? d['models'] : [];
      const rawModels = rawList.filter(isRecord);
      const nextModels: ModelOption[] = rawModels.map((m) => ({
        id: String(m['id']),
        label: m['label'] ? String(m['label']) : undefined,
      }));
      setModels(nextModels);
      setMsg(`✅ ${nextModels.length.toString()} ${labelText}`);
      return d;
    } catch (e: unknown) {
      const errorMsg = errorMessage(e);
      setMsg(`❌ ${errorMsg}`);
      throw e;
    } finally {
      setLoadingModels(false);
    }
  };

  const refresh = (): void => {
    void discover('model(s) discovered').catch(() => {});
  };

  const test = async (): Promise<void> => {
    try {
      const d = await discover('model(s) discovered');
      /* v8 ignore next */
      if (!isRecord(d)) return;
      setMsg(`✅ Connection OK · ${String(d['count'])} model(s)`);
    } catch {}
  };

  const save = async (): Promise<void> => {
    try {
      const anthropicPayload: {
        baseUrl?: string | undefined;
        model?: string | undefined;
        maxConcurrency: number;
        apiKey?: string | undefined;
      } = {
        baseUrl: anth.baseUrl,
        model: anth.model,
        maxConcurrency: Number(anth.maxConcurrency || 2),
      };
      if (anth.apiKey) {
        anthropicPayload.apiKey = anth.apiKey;
      }

      const payload = {
        translation: {
          provider: tr.provider,
          agy: { model: agy.model, maxConcurrency: Number(agy.maxConcurrency || 2) },
          anthropic: anthropicPayload,
        },
        prompts: { autoMigrate: form.prompts?.autoMigrate !== false },
      };

      const d = await postJSON('/api/settings', payload);
      /* v8 ignore next */
      if (!isRecord(d)) return;
      setForm(d satisfies Settings);
      setMsg('✅ Settings saved');
      await a.refreshSettings();
    } catch (e: unknown) {
      const errorMsg = errorMessage(e);
      setMsg(`❌ ${errorMsg}`);
    }
  };

  const modelOptions = [...models];
  if (anth.model && !modelOptions.some((m) => m.id === anth.model)) {
    modelOptions.unshift({ id: anth.model, label: `${anth.model} · configured` });
  }

  return (
    <div className="page settings-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <SettingsIcon size={14} className="inline-icon" /> Settings
          </div>
          <h1>Configuration</h1>
        </div>
      </div>
      <div className="settings-grid">
        <section className="card settings-card provider-card">
          <div className="settings-card-head">
            <div>
              <div className="eyebrow">Translation</div>
              <h2>Translation provider</h2>
            </div>
            <span className="settings-card-icon">
              <Plug size={16} />
            </span>
          </div>
          {label(
            'Provider',
            <select
              id="provider-select"
              name="provider"
              aria-label="Provider"
              className="select"
              value={tr.provider || 'agy'}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="agy">Antigravity CLI (agy)</option>
              <option value="anthropic">Anthropic-compatible API</option>
            </select>,
          )}
          {tr.provider !== 'anthropic' ? (
            <>
              {label(
                'Model',
                <select
                  id="agy-model-select"
                  name="agyModel"
                  aria-label="Model"
                  className="select"
                  value={agy.model || ''}
                  onChange={(e) => setAgyModel(e.target.value)}
                >
                  {(form.agyModels || []).map((m) => (
                    <option value={m.slug} key={m.slug}>
                      {m.label}
                    </option>
                  ))}
                </select>,
              )}
              {concurrencySetting(agy.maxConcurrency, (value) => setAgyConcurrency(value))}
            </>
          ) : (
            <>
              {label(
                'Base URL',
                <input
                  id="anthropic-base-url-input"
                  name="anthropicBaseUrl"
                  aria-label="Base URL"
                  className="input"
                  value={anth.baseUrl || 'http://127.0.0.1:8000'}
                  onChange={(e) => setAnthropicBaseUrl(e.target.value)}
                />,
              )}
              {label(
                'API key',
                <input
                  id="anthropic-api-key-input"
                  name="anthropicApiKey"
                  aria-label="API key"
                  type="password"
                  className="input"
                  placeholder={
                    anth.apiKeyConfigured ? 'Configured - enter only to replace' : 'Optional'
                  }
                  value={anth.apiKey || ''}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                />,
              )}
              {label(
                'Model',
                <select
                  id="anthropic-model-select"
                  name="anthropicModel"
                  aria-label="Model"
                  className="select"
                  value={anth.model || ''}
                  disabled={loadingModels}
                  onChange={(e) => setAnthropicModel(e.target.value)}
                >
                  <option value="">{loadingModels ? 'Loading models…' : 'Select model…'}</option>
                  {modelOptions.map((m) => (
                    <option value={m.id} key={m.id}>
                      {m.label || m.id}
                    </option>
                  ))}
                </select>,
              )}
              {concurrencySetting(anth.maxConcurrency, (value) => setAnthropicConcurrency(value))}
              <div className="actions">
                <button
                  className="btn btn--secondary btn--sm"
                  disabled={loadingModels}
                  onClick={refresh}
                >
                  {loadingModels ? '⟳ Loading…' : '↻ Refresh models'}
                </button>
                <button
                  className="btn btn--secondary btn--sm"
                  disabled={loadingModels}
                  onClick={() => void test()}
                >
                  <FlaskConical size={14} className="inline-icon" /> Test connection
                </button>
              </div>
            </>
          )}
          <div className="card-actions">
            <button className="btn btn--primary btn--sm" onClick={() => void save()}>
              <Save size={14} className="inline-icon" /> Save provider settings
            </button>
          </div>
        </section>
        <section className="card settings-card prompts-card">
          <div className="settings-card-head">
            <div>
              <div className="eyebrow">
                <Brain size={14} className="inline-icon" /> Prompts
              </div>
              <h2>Prompt management</h2>
            </div>
            <span className="settings-card-icon">
              <FileEdit size={16} />
            </span>
          </div>
          {label(
            'Automatically migrate built-in prompt updates',
            <input
              id="auto-migrate-checkbox"
              name="autoMigrate"
              aria-label="Automatically migrate built-in prompt updates"
              type="checkbox"
              checked={form.prompts?.autoMigrate !== false}
              onChange={(e) => setAutoMigrate(e.target.checked)}
            />,
          )}
          <p className="muted">
            Custom prompts are backed up and three-way merged. Conflicts never overwrite the active
            prompt.
          </p>
          <div className="card-actions">
            <button className="btn btn--primary btn--sm" onClick={() => void save()}>
              <Save size={14} className="inline-icon" /> Save prompt settings
            </button>
          </div>
        </section>
      </div>
      {msg ? <div className="info">{msg}</div> : null}
    </div>
  );
}

function concurrencySetting(
  value: number | undefined,
  onChange: (val: number) => void,
): ReactElement {
  return (
    <div className="setting-stack">
      {label(
        'Maximum concurrent jobs',
        <input
          id="concurrency-input"
          name="concurrency"
          aria-label="Maximum concurrent jobs"
          type="number"
          className="input"
          min={1}
          max={32}
          step={1}
          value={Number(value || 2)}
          onChange={(e) => onChange(Math.max(1, Math.min(32, Number(e.target.value || 1))))}
        />,
      )}
      <p className="setting-help">
        Maximum number of task translation lifecycles that may execute simultaneously on this
        provider. Queued jobs are not discarded.
      </p>
    </div>
  );
}

function label(text: string, control: ReactElement): ReactElement {
  return (
    <label className="setting-row">
      <span>{text}</span>
      {control}
    </label>
  );
}

import { useEffect, useState } from 'react';
import { X, Eye, EyeOff, Check, Loader, AlertTriangle, ChevronRight } from 'lucide-react';
import { fetchConfig, saveConfig } from '../lib/client.ts';
import type { LLMConfig } from '../types.ts';

// ── Provider presets ──────────────────────────────────────────────────────────

type ModelPreset = { label: string; model: string; description: string };

type Provider = {
  id: string;
  name: string;
  baseUrl: string;
  keyPrefix: string;
  keyPlaceholder: string;
  models: ModelPreset[];
  needsKey: boolean;
};

const PROVIDERS: Provider[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-xxxxxxxxxxxxxxxx',
    needsKey: true,
    models: [
      { label: 'DeepSeek Chat', model: 'deepseek-chat', description: 'Fast · general purpose' },
      { label: 'DeepSeek Coder', model: 'deepseek-coder', description: 'Optimised for code' },
      { label: 'DeepSeek Reasoner', model: 'deepseek-reasoner', description: 'Extended reasoning' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-proj-xxxxxxxx',
    needsKey: true,
    models: [
      { label: 'GPT-4o', model: 'gpt-4o', description: 'Most capable · multimodal' },
      { label: 'GPT-4o mini', model: 'gpt-4o-mini', description: 'Fast · affordable' },
      { label: 'o3-mini', model: 'o3-mini', description: 'Advanced reasoning' },
      { label: 'o1', model: 'o1', description: 'Deep reasoning' },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyPrefix: 'gsk_',
    keyPlaceholder: 'gsk_xxxxxxxxxxxxxxxx',
    needsKey: true,
    models: [
      { label: 'Llama 3.3 70B', model: 'llama-3.3-70b-versatile', description: 'Fastest open model' },
      { label: 'Llama 3.1 8B', model: 'llama-3.1-8b-instant', description: 'Ultra fast · small' },
      { label: 'Mixtral 8×7B', model: 'mixtral-8x7b-32768', description: '32k context' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyPrefix: 'sk-or-',
    keyPlaceholder: 'sk-or-xxxxxxxxxxxxxxxx',
    needsKey: true,
    models: [
      { label: 'Claude 3.5 Sonnet', model: 'anthropic/claude-3.5-sonnet', description: 'Best for coding' },
      { label: 'Gemini 2.0 Flash', model: 'google/gemini-2.0-flash-001', description: 'Fast · long context' },
      { label: 'Llama 3.3 70B', model: 'meta-llama/llama-3.3-70b-instruct', description: 'Open source' },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    keyPrefix: '',
    keyPlaceholder: 'ollama (any value)',
    needsKey: false,
    models: [
      { label: 'Llama 3.2', model: 'llama3.2', description: 'General purpose' },
      { label: 'Qwen 2.5 Coder', model: 'qwen2.5-coder', description: 'Code specialist' },
      { label: 'CodeLlama', model: 'codellama', description: 'Code generation' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    baseUrl: '',
    keyPrefix: '',
    keyPlaceholder: 'your-api-key',
    needsKey: false,
    models: [],
  },
];

// ── Provider icon (initials badge) ───────────────────────────────────────────

const PROVIDER_COLORS: Record<string, string> = {
  deepseek: 'from-blue-600 to-cyan-500',
  openai:   'from-emerald-600 to-teal-500',
  groq:     'from-orange-500 to-amber-400',
  openrouter: 'from-violet-600 to-purple-500',
  ollama:   'from-slate-600 to-slate-500',
  custom:   'from-zinc-600 to-zinc-500',
};

function ProviderIcon({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' }) {
  const gradient = PROVIDER_COLORS[id] ?? 'from-zinc-600 to-zinc-500';
  const cls = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-9 h-9 text-xs';
  const provider = PROVIDERS.find((p) => p.id === id);
  const initials = provider ? provider.name.slice(0, 2).toUpperCase() : '??';
  return (
    <div className={`${cls} rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── Model preset card ─────────────────────────────────────────────────────────

function ModelCard({
  preset,
  selected,
  onClick,
}: {
  preset: ModelPreset;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative text-left rounded-xl border px-4 py-3 transition-all ${
        selected
          ? 'border-accent bg-accent/10 text-fg'
          : 'border-border hover:border-[#333] bg-[#0f0f0f] text-muted-fg hover:text-fg'
      }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
          <Check size={10} className="text-white" />
        </span>
      )}
      <div className="text-sm font-medium leading-tight">{preset.label}</div>
      <div className="text-[11px] mt-0.5 opacity-70">{preset.description}</div>
      <div className="text-[10px] mt-1 font-mono opacity-50 truncate">{preset.model}</div>
    </button>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

type Props = { onClose: () => void };

export function LLMConfigModal({ onClose }: Props) {
  const [draft, setDraft] = useState<LLMConfig>({
    provider: 'deepseek',
    apiKey: '',
    baseUrl: '',
    model: '',
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const activeProvider = PROVIDERS.find((p) => p.id === draft.provider) ?? PROVIDERS[PROVIDERS.length - 1];

  // Load existing config on mount
  useEffect(() => {
    fetchConfig()
      .then((cfg) => {
        setDraft({
          provider: cfg.llm.provider,
          apiKey: cfg.llm.apiKeySet ? '••••••••' : '',
          baseUrl: cfg.llm.baseUrl ?? activeProvider.baseUrl,
          model: cfg.llm.model ?? activeProvider.models[0]?.model ?? '',
        });
      })
      .catch(() => {
        // backend not running — use defaults
      })
      .finally(() => setLoading(false));
  }, []);

  // When provider changes, auto-fill baseUrl and reset model
  const selectProvider = (id: string) => {
    const p = PROVIDERS.find((pr) => pr.id === id)!;
    setDraft((d) => ({
      ...d,
      provider: id,
      baseUrl: p.baseUrl,
      model: p.models[0]?.model ?? '',
    }));
  };

  const selectModel = (model: string) => setDraft((d) => ({ ...d, model }));

  const handleSave = async () => {
    if (!(draft.model ?? '').trim()) { setError('Model name is required'); return; }
    if (activeProvider.needsKey && !draft.apiKey && !draft.apiKey?.startsWith('••')) {
      setError('API key is required for this provider');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveConfig({ llm: draft });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 800);
    } catch {
      setError('Failed to save — is the server running?');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <div>
            <h2 className="font-semibold text-fg">LLM Configuration</h2>
            <p className="text-xs text-muted-fg mt-0.5">Choose a provider and model for the AI agent</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1e1e1e] text-muted-fg hover:text-fg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader size={20} className="animate-spin text-muted-fg" />
            </div>
          ) : (
            <div className="px-6 py-5 flex flex-col gap-6">

              {/* ── Provider picker ── */}
              <section>
                <h3 className="text-xs font-semibold text-muted-fg uppercase tracking-wider mb-3">Provider</h3>
                <div className="grid grid-cols-3 gap-2">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectProvider(p.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left ${
                        draft.provider === p.id
                          ? 'border-accent bg-accent/10 text-fg'
                          : 'border-border hover:border-[#333] text-muted-fg hover:text-fg bg-[#0f0f0f]'
                      }`}
                    >
                      <ProviderIcon id={p.id} size="sm" />
                      <span className="text-sm font-medium truncate">{p.name}</span>
                      {draft.provider === p.id && (
                        <Check size={12} className="text-accent ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* ── Credentials ── */}
              <section className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold text-muted-fg uppercase tracking-wider">Credentials</h3>

                {/* API Key */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-fg">
                    API Key
                    {!activeProvider.needsKey && (
                      <span className="ml-2 text-emerald-500/80">(not required for {activeProvider.name})</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2.5 focus-within:border-accent/40 transition-colors">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={draft.apiKey ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
                      placeholder={activeProvider.keyPlaceholder}
                      className="flex-1 bg-transparent outline-none text-sm text-fg placeholder-muted-fg font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="text-muted-fg hover:text-fg transition-colors flex-shrink-0"
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </label>

                {/* Base URL */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-fg">Base URL</span>
                  <input
                    value={draft.baseUrl ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}
                    placeholder={activeProvider.baseUrl || 'https://your-endpoint/v1'}
                    className="bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-fg placeholder-muted-fg outline-none focus:border-accent/40 transition-colors font-mono"
                  />
                </label>
              </section>

              {/* ── Model ── */}
              <section className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold text-muted-fg uppercase tracking-wider">Model</h3>

                {/* Free-text input */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-fg">Model name</span>
                  <input
                    value={draft.model ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
                    placeholder={activeProvider.models[0]?.model ?? 'model-name'}
                    className="bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-fg placeholder-muted-fg outline-none focus:border-accent/40 transition-colors font-mono"
                  />
                </label>

                {/* Preset cards */}
                {activeProvider.models.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {activeProvider.models.map((preset) => (
                      <ModelCard
                        key={preset.model}
                        preset={preset}
                        selected={draft.model === preset.model}
                        onClick={() => selectModel(preset.model)}
                      />
                    ))}
                  </div>
                )}

                {activeProvider.id === 'ollama' && (
                  <div className="flex items-start gap-2 text-xs text-muted-fg bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl px-3 py-2.5">
                    <ChevronRight size={12} className="mt-0.5 flex-shrink-0" />
                    <span>
                      Make sure Ollama is running locally and the model is pulled:
                      <code className="ml-1 text-accent font-mono">ollama pull {draft.model ?? 'llama3.2'}</code>
                    </span>
                  </div>
                )}
              </section>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e1e1e] flex items-center gap-3">
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 flex-1">
              <AlertTriangle size={12} />
              {error}
            </div>
          )}
          {!error && (
            <div className="flex items-center gap-2 text-xs text-muted-fg flex-1">
              <ProviderIcon id={draft.provider} size="sm" />
              <span className="font-mono truncate">{draft.model || '—'}</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-fg hover:text-fg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || saved}
            className="px-5 py-2 text-sm bg-accent/90 hover:bg-accent disabled:opacity-60 text-white rounded-xl transition-all flex items-center gap-2 min-w-[80px] justify-center"
          >
            {saving ? <Loader size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

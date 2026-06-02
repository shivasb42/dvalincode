import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatThread } from './components/ChatThread.tsx';
import { Composer } from './components/Composer.tsx';
import { SettingsPanel } from './components/SettingsPanel.tsx';
import { LLMConfigModal } from './components/LLMConfigModal.tsx';
import { ApprovalDialog } from './components/ApprovalDialog.tsx';
import { ApprovalModeSwitch } from './components/ApprovalModeSwitch.tsx';
import { useChat } from './hooks/useChat.ts';
import { fetchSessions, fetchConfig } from './lib/client.ts';
import type { ChatSettings } from './components/SettingsPanel.tsx';
import type { ApprovalMode } from './types.ts';

export default function App() {
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [showLLMConfig, setShowLLMConfig] = useState(false);
  const [activeModel, setActiveModel] = useState('');
  const [settings, setSettings] = useState<ChatSettings>({
    cwd: '',
    provider: 'deepseek',
    approvalMode: 'readonly',
  });

  const chat = useChat({
    cwd: settings.cwd || undefined,
    approvalMode: settings.approvalMode,
  });

  // Auto-detect cwd from first session; load saved LLM config for topbar display
  useEffect(() => {
    fetchSessions()
      .then((sessions) => {
        if (sessions[0]?.cwd && !settings.cwd) {
          setSettings((s) => ({ ...s, cwd: sessions[0].cwd }));
        }
      })
      .catch(() => {});

    fetchConfig()
      .then((cfg) => {
        setActiveModel(cfg.llm.model ?? '');
        setSettings((s) => ({ ...s, provider: cfg.llm.provider }));
      })
      .catch(() => {});
  }, []);

  // Connect WebSocket on mount
  useEffect(() => {
    chat.connect();
  }, [chat.connect]);

  // Reconnect when settings change
  useEffect(() => {
    if (!chat.connected) chat.connect();
  }, [settings]);

  const handleNewChat = useCallback(() => {
    chat.reset();
    setSidebarRefresh((n) => n + 1);
  }, [chat]);

  const handleSelectSession = useCallback((id: string) => {
    void chat.loadSession(id);
  }, [chat]);

  const handleSend = useCallback(
    (text: string) => {
      if (!chat.connected) {
        chat.connect();
        setTimeout(() => chat.send(text), 300);
      } else {
        chat.send(text);
      }
      setTimeout(() => setSidebarRefresh((n) => n + 1), 2000);
    },
    [chat],
  );

  const handleConfigClose = () => {
    setShowLLMConfig(false);
    fetchConfig()
      .then((cfg) => {
        setActiveModel(cfg.llm.model ?? '');
        setSettings((s) => ({ ...s, provider: cfg.llm.provider }));
      })
      .catch(() => {});
  };

  const usage = chat.lastUsage;

  return (
    <div className="flex h-full bg-bg text-fg">
      <Sidebar
        currentSessionId={chat.currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onOpenConfig={() => setShowLLMConfig(true)}
        refreshKey={sidebarRefresh}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface">
          <div className="flex items-center gap-2 min-w-0">
            {chat.currentSessionId && (
              <span className="text-xs text-muted-fg font-mono truncate max-w-[160px]">
                {chat.currentSessionId}
              </span>
            )}
            <span
              className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                chat.connected ? 'bg-emerald-500' : 'bg-red-500/70'
              }`}
              title={chat.connected ? 'Connected' : 'Disconnected'}
            />
            {usage && (
              <span
                className="text-[11px] text-muted-fg/70 font-mono flex-shrink-0"
                title={`Input: ${usage.inputTokens.toLocaleString()} · Output: ${usage.outputTokens.toLocaleString()}`}
              >
                {(usage.inputTokens + usage.outputTokens).toLocaleString()} tok
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ApprovalModeSwitch
              value={settings.approvalMode}
              onChange={(mode: ApprovalMode) => setSettings((s) => ({ ...s, approvalMode: mode }))}
            />
            {/* Active model badge — clickable */}
            {activeModel && (
              <button
                onClick={() => setShowLLMConfig(true)}
                className="text-[11px] text-muted-fg bg-[#1a1a1a] border border-border hover:border-accent/40 hover:text-fg rounded-lg px-2.5 py-1 font-mono transition-colors truncate max-w-[180px]"
                title="Change LLM model"
              >
                {settings.provider} · {activeModel}
              </button>
            )}
            <SettingsPanel settings={settings} onChange={setSettings} />
          </div>
        </div>

        {/* Thread */}
        <ChatThread messages={chat.messages} connected={chat.connected} />

        {/* Composer */}
        <Composer
          onSend={handleSend}
          onInterrupt={chat.interrupt}
          sending={chat.sending}
          disabled={false}
        />
      </div>

      {/* LLM Config Modal */}
      {showLLMConfig && <LLMConfigModal onClose={handleConfigClose} />}

      {/* Approval dialogs — show one at a time (oldest first) */}
      {chat.pendingApprovals[0] && (
        <ApprovalDialog
          approval={chat.pendingApprovals[0]}
          onRespond={chat.respondToApproval}
        />
      )}
    </div>
  );
}

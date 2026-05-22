import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatThread } from './components/ChatThread.tsx';
import { Composer } from './components/Composer.tsx';
import { SettingsPanel } from './components/SettingsPanel.tsx';
import { useChat } from './hooks/useChat.ts';
import { fetchSessions } from './lib/client.ts';
import type { ChatSettings } from './components/SettingsPanel.tsx';

export default function App() {
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [settings, setSettings] = useState<ChatSettings>({
    cwd: '',
    allowWrite: false,
    allowExecute: false,
    provider: 'deepseek',
  });

  const chat = useChat({
    cwd: settings.cwd || undefined,
    allowWrite: settings.allowWrite,
    allowExecute: settings.allowExecute,
  });

  // Auto-detect cwd from first session on load
  useEffect(() => {
    fetchSessions()
      .then((sessions) => {
        if (sessions[0]?.cwd && !settings.cwd) {
          setSettings((s) => ({ ...s, cwd: sessions[0].cwd }));
        }
      })
      .catch(() => {});
  }, []);

  // Connect WebSocket on mount
  useEffect(() => {
    chat.connect();
  }, [chat.connect]);

  // Reconnect when settings change
  useEffect(() => {
    if (!chat.connected) {
      chat.connect();
    }
  }, [settings]);

  const handleNewChat = useCallback(() => {
    chat.reset();
    setSidebarRefresh((n) => n + 1);
  }, [chat]);

  const handleSelectSession = useCallback((_id: string) => {
    // For now, just start a new chat — full session restore would require
    // loading history from the REST API and replaying into UI state
    chat.reset();
  }, [chat]);

  const handleSend = useCallback(
    (text: string) => {
      if (!chat.connected) {
        chat.connect();
        // Give WS time to open
        setTimeout(() => chat.send(text), 300);
      } else {
        chat.send(text);
      }
      // Refresh sidebar after turn completes
      setTimeout(() => setSidebarRefresh((n) => n + 1), 2000);
    },
    [chat],
  );

  return (
    <div className="flex h-full bg-bg text-fg">
      <Sidebar
        currentSessionId={chat.currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        refreshKey={sidebarRefresh}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface">
          <div className="flex items-center gap-2">
            {chat.currentSessionId && (
              <span className="text-xs text-muted-fg font-mono truncate max-w-[200px]">
                {chat.currentSessionId}
              </span>
            )}
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                chat.connected ? 'bg-emerald-500' : 'bg-red-500/70'
              }`}
              title={chat.connected ? 'Connected' : 'Disconnected'}
            />
          </div>
          <div className="flex items-center gap-2">
            {settings.allowWrite && (
              <span className="text-[11px] text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-0.5">
                writes on
              </span>
            )}
            {settings.allowExecute && (
              <span className="text-[11px] text-orange-500/80 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-0.5">
                exec on
              </span>
            )}
            <SettingsPanel settings={settings} onChange={setSettings} />
          </div>
        </div>

        {/* Thread */}
        <ChatThread messages={chat.messages} connected={chat.connected} />

        {/* Composer */}
        <Composer
          onSend={handleSend}
          sending={chat.sending}
          disabled={false}
        />
      </div>
    </div>
  );
}

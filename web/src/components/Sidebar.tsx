import { useEffect, useState } from 'react';
import { Plus, Trash2, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchSessions, deleteSession } from '../lib/client.ts';
import type { SessionMeta } from '../types.ts';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Props = {
  currentSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  refreshKey?: number;
};

export function Sidebar({ currentSessionId, onNewChat, onSelectSession, refreshKey }: Props) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const load = async () => {
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch {
      // server not available
    }
  };

  useEffect(() => {
    void load();
  }, [refreshKey, currentSessionId]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === currentSessionId) onNewChat();
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center w-12 h-full bg-surface border-r border-border py-3 gap-3 flex-shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg hover:bg-[#1a1a1a] text-muted-fg hover:text-fg transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={onNewChat}
          className="p-2 rounded-lg hover:bg-[#1a1a1a] text-muted-fg hover:text-fg transition-colors"
          title="New chat"
        >
          <Plus size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60 h-full bg-surface border-r border-border flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent/20 border border-accent/40 flex items-center justify-center text-xs font-bold text-accent">
            D
          </div>
          <span className="font-semibold text-sm text-fg">DvalinCode</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-[#1a1a1a] text-muted-fg hover:text-fg transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* New chat button */}
      <div className="px-3 py-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-accent/40 hover:bg-accent/5 text-muted-fg hover:text-fg transition-all text-sm"
        >
          <Plus size={14} />
          New chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {sessions.length === 0 ? (
          <p className="text-xs text-muted-fg px-3 py-4 text-center">No sessions yet</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className={`group w-full text-left px-3 py-2 rounded-lg transition-colors flex items-start gap-2 ${
                  s.id === currentSessionId
                    ? 'bg-accent/10 border border-accent/20 text-fg'
                    : 'hover:bg-[#1a1a1a] text-muted-fg hover:text-fg border border-transparent'
                }`}
              >
                <MessageSquare size={13} className="mt-0.5 flex-shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate leading-tight">
                    {s.summary
                      ? s.summary.replace(/^User wanted: /, '').slice(0, 40)
                      : s.cwd.split('/').pop() ?? s.id}
                  </div>
                  <div className="text-[11px] text-muted-fg mt-0.5">
                    {timeAgo(s.updatedAt)} · {s.messageCount} msg
                  </div>
                </div>
                <button
                  onClick={(e) => void handleDelete(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 transition-all flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

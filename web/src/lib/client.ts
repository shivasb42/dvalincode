import type { ServerEvent, SessionMeta, AppConfig, BackendChatMessage, ApprovalMode, AgentMode } from '../types.ts';

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

export type SendOptions = {
  content: string;
  sessionId?: string;
  cwd?: string;
  approvalMode?: ApprovalMode;
  mode?: AgentMode;
  provider?: string;
};

export type WsCallbacks = {
  onEvent: (event: ServerEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export class DvalinClient {
  private ws: WebSocket | null = null;
  private callbacks: WsCallbacks | null = null;

  connect(callbacks: WsCallbacks): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.callbacks = callbacks;
      callbacks.onOpen?.();
      return;
    }

    this.callbacks = callbacks;
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      this.callbacks?.onOpen?.();
    };

    this.ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as ServerEvent;
        this.callbacks?.onEvent(event);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.callbacks?.onClose?.();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  send(opts: SendOptions): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    this.ws.send(
      JSON.stringify({
        type: 'send',
        content: opts.content,
        sessionId: opts.sessionId,
        cwd: opts.cwd,
        approvalMode: opts.approvalMode,
        mode: opts.mode ?? 'code',
        provider: opts.provider,
      }),
    );
  }

  interrupt(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
  }

  sendApprovalResponse(id: string, approved: boolean): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'approval_response', id, approved }));
    }
  }

  compact(sessionId?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    this.ws.send(JSON.stringify({ type: 'compact', sessionId }));
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const client = new DvalinClient();

// REST API helpers
export async function fetchSessions(): Promise<SessionMeta[]> {
  const res = await fetch('/api/sessions');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as SessionMeta[]) : [];
}

export async function deleteSession(id: string): Promise<void> {
  await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
}

export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<AppConfig>;
}

export async function saveConfig(config: AppConfig): Promise<AppConfig> {
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<AppConfig>;
}

export type SessionDetail = {
  id: string;
  cwd: string;
  messages: BackendChatMessage[];
  summary?: string;
};

export async function fetchSessionDetail(id: string): Promise<SessionDetail> {
  const res = await fetch(`/api/sessions/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<SessionDetail>;
}

export async function fetchFiles(cwd: string): Promise<string[]> {
  const res = await fetch(`/api/files?cwd=${encodeURIComponent(cwd)}`);
  if (!res.ok) return [];
  return res.json() as Promise<string[]>;
}

export type GitInfo = { branch: string | null; lastCommit: string | null };

export async function fetchGitInfo(cwd: string): Promise<GitInfo> {
  try {
    const res = await fetch(`/api/git?cwd=${encodeURIComponent(cwd)}`);
    if (!res.ok) return { branch: null, lastCommit: null };
    return res.json() as Promise<GitInfo>;
  } catch {
    return { branch: null, lastCommit: null };
  }
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export type Profile = {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

export async function fetchProfiles(): Promise<Record<string, Profile>> {
  try {
    const res = await fetch('/api/config/profiles');
    if (!res.ok) return {};
    return res.json() as Promise<Record<string, Profile>>;
  } catch {
    return {};
  }
}

export async function saveProfile(name: string, profile: Profile): Promise<void> {
  await fetch(`/api/config/profiles/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
}

export async function deleteProfile(name: string): Promise<void> {
  await fetch(`/api/config/profiles/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

export async function applyProfile(name: string): Promise<AppConfig> {
  const res = await fetch(`/api/config/profiles/${encodeURIComponent(name)}/apply`, { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<AppConfig>;
}

// ── Playbook ──────────────────────────────────────────────────────────────────

export type PlaybookRoutine = { label: string; prompt: string };

export async function fetchPlaybook(cwd: string): Promise<PlaybookRoutine[]> {
  try {
    const res = await fetch(`/api/playbook?cwd=${encodeURIComponent(cwd)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { routines: PlaybookRoutine[] };
    return Array.isArray(data.routines) ? data.routines : [];
  } catch {
    return [];
  }
}

export async function savePlaybook(cwd: string, routines: PlaybookRoutine[]): Promise<void> {
  await fetch('/api/playbook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cwd, routines }),
  });
}

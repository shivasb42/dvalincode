import type { ServerEvent, SessionMeta } from '../types.ts';

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

export type SendOptions = {
  content: string;
  sessionId?: string;
  cwd?: string;
  allowWrite?: boolean;
  allowExecute?: boolean;
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
        allowWrite: opts.allowWrite ?? false,
        allowExecute: opts.allowExecute ?? false,
        provider: opts.provider,
      }),
    );
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

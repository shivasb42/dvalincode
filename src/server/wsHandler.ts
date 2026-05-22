import type { WebSocket } from 'ws';
import { ProviderManager } from '../providers/manager.js';
import { scanProject } from '../core/projectScanner.js';
import { AgentLoop } from '../agent/loop.js';
import { createDvalinContext } from '../core/context.js';
import { createDefaultToolRegistry } from '../tools/registry.js';
import {
  createSession,
  saveSession,
  loadSession,
  summarizeSession,
} from '../sessions/store.js';
import { readConfig } from './configStore.js';
import type { AgentEvent } from '../agent/types.js';

type ClientMessage =
  | {
      type: 'send';
      content: string;
      sessionId?: string;
      cwd?: string;
      allowWrite?: boolean;
      allowExecute?: boolean;
      /** Optional override — falls back to saved config */
      provider?: string;
    }
  | { type: 'interrupt' };

type ServerMessage =
  | { type: 'session_id'; sessionId: string }
  | { type: 'token_delta'; content: string }
  | { type: 'tool_call'; name: string; id: string; input: unknown }
  | { type: 'tool_result'; name: string; id: string; output: string; metadata?: Record<string, unknown> }
  | { type: 'tool_error'; name: string; id: string; error: string }
  | { type: 'response'; content: string }
  | { type: 'done'; sessionId: string; iterations: number; usage?: { inputTokens: number; outputTokens: number } }
  | { type: 'interrupted' }
  | { type: 'error'; message: string };

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === 1 /* OPEN */) {
    ws.send(JSON.stringify(msg));
  }
}

export function handleWebSocket(ws: WebSocket): void {
  let currentAbort: AbortController | null = null;

  ws.on('message', async (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    // ── Interrupt ─────────────────────────────────────────────
    if (msg.type === 'interrupt') {
      currentAbort?.abort();
      currentAbort = null;
      send(ws, { type: 'interrupted' });
      return;
    }

    if (msg.type !== 'send') return;

    // Abort any in-flight turn before starting a new one
    currentAbort?.abort();
    const abort = new AbortController();
    currentAbort = abort;

    const cwd = msg.cwd ?? process.cwd();

    // Load or create session
    let session;
    if (msg.sessionId) {
      session = await loadSession(msg.sessionId);
      if (!session) {
        send(ws, { type: 'error', message: `Session not found: ${msg.sessionId}` });
        return;
      }
    } else {
      session = createSession(cwd);
    }

    send(ws, { type: 'session_id', sessionId: session.id });

    // Set up provider — config file takes precedence over env vars
    let provider;
    try {
      const cfg = await readConfig();
      const llm = cfg.llm;
      const providerName = msg.provider ?? llm.provider;
      const manager = new ProviderManager();
      manager.addOpenAI(providerName, {
        apiKey: llm.apiKey,
        baseUrl: llm.baseUrl,
        model: llm.model,
      });
      provider = manager.get(providerName);
    } catch (err) {
      send(ws, {
        type: 'error',
        message: `Provider error: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }

    // Scan workspace
    const summary = await scanProject(cwd);
    const registry = createDefaultToolRegistry();
    const tools = registry.list();
    const toolsDesc = tools
      .map((t) => `- ${t.name}: ${t.description} (access: ${t.access})`)
      .join('\n');

    const sessionContext = session.summary
      ? `\nPrevious session summary: ${session.summary}\n`
      : '';

    const systemPrompt = [
      'You are DvalinCode, an AI coding assistant.',
      'The user is working on the following project. You can inspect files, run commands, and make changes.',
      '',
      `Project root: ${summary.root}`,
      `Files: ${summary.fileCount} files`,
      `Package manager(s): ${summary.packageManagers.join(', ') || 'none'}`,
      summary.signals.length > 0 ? `Signals: ${summary.signals.join(', ')}` : '',
      sessionContext,
      '',
      '=== HOW TO USE TOOLS ===',
      '',
      `You have ${tools.length} tools available. To use a tool, embed this syntax in your response:`,
      '',
      '@tool("tool_name", {"param": "value"})',
      '',
      'Available tools:',
      toolsDesc,
      '',
      'RULES:',
      '- Always use read tools first to understand the codebase before making changes.',
      '- Prefer focused, surgical changes.',
    ]
      .filter(Boolean)
      .join('\n');

    const loop = new AgentLoop({
      provider,
      registry,
      context: createDvalinContext({
        cwd,
        allowWrite: msg.allowWrite ?? false,
        allowExecute: msg.allowExecute ?? false,
      }),
      systemPrompt,
    });

    // Accumulate usage across all LLM calls in this turn
    let totalUsage: { inputTokens: number; outputTokens: number } | undefined;

    const onEvent = (event: AgentEvent): void => {
      if (abort.signal.aborted) return;
      switch (event.type) {
        case 'token_delta':
          send(ws, { type: 'token_delta', content: event.content });
          break;
        case 'tool_call':
          send(ws, { type: 'tool_call', name: event.name, id: event.id, input: event.input });
          break;
        case 'tool_result':
          send(ws, {
            type: 'tool_result',
            name: event.name,
            id: event.id,
            output: event.output,
            metadata: event.metadata,
          });
          break;
        case 'tool_error':
          send(ws, { type: 'tool_error', name: event.name, id: event.id, error: event.error });
          break;
      }
    };

    try {
      const result = await loop.processMessage(msg.content, session.messages, onEvent, abort.signal);

      if (abort.signal.aborted) return; // Don't save or respond if interrupted

      session.messages = result.messages;
      session.updatedAt = new Date().toISOString();
      session.summary = summarizeSession(session);
      await saveSession(session);

      send(ws, { type: 'response', content: result.output });
      send(ws, {
        type: 'done',
        sessionId: session.id,
        iterations: result.iterationsUsed,
        usage: totalUsage,
      });
    } catch (err) {
      if (abort.signal.aborted) {
        send(ws, { type: 'interrupted' });
        return;
      }
      send(ws, {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      if (currentAbort === abort) currentAbort = null;
    }
  });

  ws.on('close', () => {
    currentAbort?.abort();
  });
}

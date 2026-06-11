import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execAsync = promisify(execFile);
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
import { estimateTokens, summarizeWithLLM, buildCompactedHistory } from '../agent/compact.js';
import { readConfig } from './configStore.js';
import type { AgentEvent } from '../agent/types.js';

type AgentMode = 'chat' | 'cowork' | 'code';

const MODE_TOOLS: Record<AgentMode, string[] | null> = {
  chat:   ['read_file', 'list_files', 'search_text'],
  cowork: null, // all tools
  code:   null, // all tools
};

const MODE_APPROVAL: Record<AgentMode, 'readonly' | 'auto-edit' | 'full-auto'> = {
  chat:   'readonly',
  cowork: 'auto-edit',
  code:   'full-auto',
};

const MODE_PROMPT: Record<AgentMode, string> = {
  chat:
    'You are in Chat mode. Answer questions, explain code, and discuss ideas. Do NOT write, edit, delete files or run shell commands — read-only tools only.',
  cowork:
    'You are in Cowork mode. Work collaboratively. Briefly explain your plan before making changes. Prefer focused, surgical edits. File writes and shell commands require user approval.',
  code:
    'You are in Code mode. Work autonomously to complete the task efficiently. Use all available tools as needed.',
};

type ClientMessage =
  | {
      type: 'send';
      content: string;
      sessionId?: string;
      cwd?: string;
      allowWrite?: boolean;
      allowExecute?: boolean;
      approvalMode?: 'readonly' | 'auto-edit' | 'full-auto';
      mode?: AgentMode;
      provider?: string;
    }
  | { type: 'interrupt' }
  | { type: 'approval_response'; id: string; approved: boolean }
  | { type: 'compact'; sessionId?: string };

type ServerMessage =
  | { type: 'session_id'; sessionId: string }
  | { type: 'token_delta'; content: string }
  | { type: 'tool_call'; name: string; id: string; input: unknown }
  | { type: 'tool_result'; name: string; id: string; output: string; metadata?: Record<string, unknown> }
  | { type: 'tool_error'; name: string; id: string; error: string }
  | { type: 'approval_request'; id: string; toolName: string; input: unknown }
  | { type: 'response'; content: string }
  | { type: 'done'; sessionId: string; iterations: number; usage?: { inputTokens: number; outputTokens: number } }
  | { type: 'interrupted' }
  | { type: 'error'; message: string }
  | { type: 'compact_done'; tokensBefore: number; tokensAfter: number; summary: string };

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === 1 /* OPEN */) {
    ws.send(JSON.stringify(msg));
  }
}

async function readTextFileSafe(filePath: string): Promise<string | null> {
  try { return await readFile(filePath, 'utf8'); } catch { return null; }
}

/** Expand @filepath references in the user's message by injecting file contents. */
async function expandAtMentions(content: string, cwd: string): Promise<string> {
  const mentionRegex = /@([\w./\-]+)/g;
  const mentions = [...content.matchAll(mentionRegex)];
  if (mentions.length === 0) return content;

  let result = content;
  for (const match of mentions) {
    const relPath = match[1];
    const absPath = path.resolve(cwd, relPath);
    // Safety: must stay inside cwd
    if (!absPath.startsWith(path.resolve(cwd))) continue;
    try {
      const fileContent = await readFile(absPath, 'utf8');
      result = result.replace(
        match[0],
        `<file path="${relPath}">\n\`\`\`\n${fileContent}\n\`\`\`\n</file>`,
      );
    } catch {
      // File not found — leave mention as-is
    }
  }
  return result;
}

export function handleWebSocket(ws: WebSocket): void {
  let currentAbort: AbortController | null = null;
  const pendingApprovals = new Map<string, (approved: boolean) => void>();

  ws.on('message', async (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    if (msg.type === 'interrupt') {
      currentAbort?.abort();
      currentAbort = null;
      send(ws, { type: 'interrupted' });
      return;
    }

    if (msg.type === 'approval_response') {
      const resolve = pendingApprovals.get(msg.id);
      if (resolve) {
        pendingApprovals.delete(msg.id);
        resolve(msg.approved);
      }
      return;
    }

    if (msg.type === 'compact') {
      if (!msg.sessionId) {
        send(ws, { type: 'error', message: 'compact requires a sessionId' });
        return;
      }
      const session = await loadSession(msg.sessionId);
      if (!session) {
        send(ws, { type: 'error', message: `Session not found: ${msg.sessionId}` });
        return;
      }
      let provider;
      try {
        const cfg = await readConfig();
        const manager = new ProviderManager();
        manager.addOpenAI(cfg.llm.provider, {
          apiKey: cfg.llm.apiKey,
          baseUrl: cfg.llm.baseUrl,
          model: cfg.llm.model,
        });
        provider = manager.get(cfg.llm.provider);
      } catch (err) {
        send(ws, { type: 'error', message: `Provider error: ${err instanceof Error ? err.message : String(err)}` });
        return;
      }
      const tokensBefore = estimateTokens(session.messages);
      const summary = await summarizeWithLLM(session.messages, provider);
      const compacted = buildCompactedHistory(summary);
      const tokensAfter = estimateTokens(compacted);
      session.messages = compacted;
      session.updatedAt = new Date().toISOString();
      await saveSession(session);
      send(ws, { type: 'compact_done', tokensBefore, tokensAfter, summary });
      return;
    }

    if (msg.type !== 'send') return;

    currentAbort?.abort();
    const abort = new AbortController();
    currentAbort = abort;

    const cwd = msg.cwd ?? process.cwd();
    const mode: AgentMode = msg.mode ?? 'code';
    const approvalMode = msg.approvalMode ?? MODE_APPROVAL[mode];

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

    // Set up provider
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

    // Expand @mentions in user message
    const userContent = await expandAtMentions(msg.content, cwd);

    // Build tool registry filtered by mode
    const registry = createDefaultToolRegistry();
    const allowedTools = MODE_TOOLS[mode];
    registry.setAllowedTools(allowedTools);

    const tools = registry.list();
    const toolsDesc = tools
      .map((t) => `- ${t.name}: ${t.description} (access: ${t.access})`)
      .join('\n');

    const summary = await scanProject(cwd);
    const sessionContext = session.summary ? `\nPrevious session summary: ${session.summary}\n` : '';

    // ── AGENTS.md project memory ─────────────────────────────────────────────
    const agentsMd = await readTextFileSafe(path.join(cwd, 'AGENTS.md'));
    const projectInstructions = agentsMd
      ? `\n=== PROJECT INSTRUCTIONS (from AGENTS.md) ===\n${agentsMd}\n`
      : '';

    // ── Git context ──────────────────────────────────────────────────────────
    let gitContext = '';
    try {
      const branch = (await execAsync('git', ['branch', '--show-current'], { cwd })).stdout.trim();
      const status = (await execAsync('git', ['status', '--porcelain'], { cwd })).stdout.trim();
      const changedCount = status ? status.split('\n').length : 0;
      gitContext = `\nGit branch: ${branch || '(detached)'}${changedCount > 0 ? ` · ${changedCount} changed file(s)` : ' · clean'}\n`;
    } catch {
      // Not a git repo — silently skip
    }

    const systemPrompt = [
      'You are DvalinCode, an AI coding assistant.',
      MODE_PROMPT[mode],
      '',
      `Project root: ${summary.root}`,
      `Files: ${summary.fileCount} files`,
      `Package manager(s): ${summary.packageManagers.join(', ') || 'none'}`,
      summary.signals.length > 0 ? `Signals: ${summary.signals.join(', ')}` : '',
      gitContext,
      projectInstructions,
      sessionContext,
      '',
      '=== TOOLS ===',
      `You have ${tools.length} tools available. Use this syntax in your response:`,
      '',
      '@tool("tool_name", {"param": "value"})',
      '',
      'Available tools:',
      toolsDesc,
      '',
      'RULES:',
      '- Always read files before modifying them.',
      '- Prefer focused, surgical changes.',
    ]
      .filter(Boolean)
      .join('\n');

    const requestApproval = (id: string, toolName: string, input: unknown): Promise<boolean> => {
      return new Promise((resolve) => {
        if (abort.signal.aborted) { resolve(false); return; }
        pendingApprovals.set(id, resolve);
        send(ws, { type: 'approval_request', id, toolName, input });
        abort.signal.addEventListener('abort', () => {
          if (pendingApprovals.has(id)) {
            pendingApprovals.delete(id);
            resolve(false);
          }
        }, { once: true });
      });
    };

    const loop = new AgentLoop({
      provider,
      registry,
      context: createDvalinContext({
        cwd,
        approvalMode,
        requestApproval,
      }),
      systemPrompt,
    });

    const onEvent = (event: AgentEvent): void => {
      if (abort.signal.aborted) return;
      switch (event.type) {
        case 'token_delta':
          send(ws, { type: 'token_delta', content: event.content });
          break;
        case 'tool_call':
          send(ws, { type: 'tool_call', name: event.name, id: event.id, input: event.input });
          break;
        case 'tool_result': {
          // Strip large/internal-only fields before sending over WebSocket
          const { originalContent: _omit, ...safeMetadata } = (event.metadata ?? {}) as Record<string, unknown> & { originalContent?: unknown };
          send(ws, {
            type: 'tool_result',
            name: event.name,
            id: event.id,
            output: event.output,
            metadata: Object.keys(safeMetadata).length > 0 ? safeMetadata : undefined,
          });
          break;
        }
        case 'tool_error':
          send(ws, { type: 'tool_error', name: event.name, id: event.id, error: event.error });
          break;
      }
    };

    try {
      const result = await loop.processMessage(userContent, session.messages, onEvent, abort.signal);

      if (abort.signal.aborted) return;

      session.messages = result.messages;
      session.updatedAt = new Date().toISOString();
      session.summary = summarizeSession(session);
      await saveSession(session);

      send(ws, { type: 'response', content: result.output });
      send(ws, {
        type: 'done',
        sessionId: session.id,
        iterations: result.iterationsUsed,
        usage: result.usage,
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

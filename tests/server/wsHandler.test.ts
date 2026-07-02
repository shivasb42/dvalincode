import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { handleWebSocket } from '../../src/server/wsHandler.js';
import type { ChatMessage } from '../../src/providers/types.js';

const runAgentTurnMock = vi.fn();

vi.mock('../../src/agent/session.js', () => ({
  runAgentTurn: (...args: unknown[]) => runAgentTurnMock(...args),
  resolveProvider: vi.fn(),
}));

type WsMessage = { type: string; [key: string]: unknown };

function waitForDone(ws: WebSocket): Promise<{ all: WsMessage[]; done: WsMessage }> {
  const all: WsMessage[] = [];
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out waiting for done')), 5_000);
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as WsMessage;
      all.push(msg);
      if (msg.type === 'done') {
        clearTimeout(timer);
        resolve({ all, done: msg });
      }
      if (msg.type === 'error') {
        clearTimeout(timer);
        reject(new Error(String(msg.message)));
      }
    });
  });
}

describe('wsHandler messageId idempotency', () => {
  let httpServer: Server;
  let wss: WebSocketServer;
  let port: number;

  beforeEach(async () => {
    runAgentTurnMock.mockReset();
    httpServer = createServer();
    wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    wss.on('connection', (ws) => handleWebSocket(ws));
    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = httpServer.address();
    if (!addr || typeof addr === 'string') throw new Error('no port');
    port = addr.port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      wss.close((err) => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
  });

  function connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  it('forwards messageId to runAgentTurn on a fresh send', async () => {
    runAgentTurnMock.mockResolvedValueOnce({
      sessionId: 'dc_test_1',
      result: {
        messages: [
          { role: 'user', content: 'hello' },
          { role: 'assistant', content: 'hi there' },
        ] satisfies ChatMessage[],
        output: 'hi there',
        iterationsUsed: 1,
      },
      providerId: 'mock',
      model: 'mock-model',
    });

    const ws = await connect();
    ws.send(
      JSON.stringify({
        type: 'send',
        content: 'hello',
        messageId: 'client-msg-1',
        cwd: process.cwd(),
        mode: 'chat',
      }),
    );

    const { done } = await waitForDone(ws);
    expect(runAgentTurnMock).toHaveBeenCalledTimes(1);
    expect(runAgentTurnMock.mock.calls[0]?.[0]).toMatchObject({
      content: 'hello',
      messageId: 'client-msg-1',
    });
    expect(done.replayed).toBeUndefined();
    ws.close();
  });

  it('returns replayed: true and journaled response when messageId was already completed', async () => {
    const journaledMessages: ChatMessage[] = [
      { role: 'user', content: 'explain loop.ts' },
      { role: 'assistant', content: 'The agent loop is an 8-state machine.' },
    ];

    runAgentTurnMock
      .mockResolvedValueOnce({
        sessionId: 'dc_test_2',
        result: {
          messages: journaledMessages,
          output: 'The agent loop is an 8-state machine.',
          iterationsUsed: 1,
          runId: 'run-abc',
        },
        providerId: 'mock',
        model: 'mock-model',
      })
      .mockResolvedValueOnce({
        sessionId: 'dc_test_2',
        result: {
          messages: journaledMessages,
          output: '(replayed: this message was already processed)',
          iterationsUsed: 0,
          runId: 'run-abc',
        },
        providerId: 'mock',
        model: 'mock-model',
        replayed: true,
      });

    const ws = await connect();

    const firstPayload = {
      type: 'send',
      content: 'explain loop.ts',
      messageId: 'client-msg-dup',
      sessionId: 'dc_test_2',
      cwd: process.cwd(),
      mode: 'chat',
    };
    ws.send(JSON.stringify(firstPayload));
    const first = await waitForDone(ws);
    expect(first.done.replayed).toBeUndefined();

    ws.send(JSON.stringify(firstPayload));
    const second = await waitForDone(ws);

    expect(runAgentTurnMock).toHaveBeenCalledTimes(2);
    expect(runAgentTurnMock.mock.calls[1]?.[0]).toMatchObject({ messageId: 'client-msg-dup' });
    expect(second.done.replayed).toBe(true);
    expect(second.done.iterations).toBe(0);
    expect(second.all.find((m) => m.type === 'response')).toMatchObject({
      content: 'The agent loop is an 8-state machine.',
    });
    expect(second.all.some((m) => m.type === 'run_report')).toBe(false);

    ws.close();
  });

  it('omits messageId when the client does not send one', async () => {
    runAgentTurnMock.mockResolvedValueOnce({
      sessionId: 'dc_test_3',
      result: { messages: [], output: 'ok', iterationsUsed: 1 },
      providerId: 'mock',
      model: 'mock-model',
    });

    const ws = await connect();
    ws.send(
      JSON.stringify({
        type: 'send',
        content: 'no id',
        cwd: process.cwd(),
        mode: 'chat',
      }),
    );

    await waitForDone(ws);
    expect(runAgentTurnMock.mock.calls[0]?.[0]).toMatchObject({
      content: 'no id',
      messageId: undefined,
    });
    ws.close();
  });
});

import { useState, useCallback, useRef } from 'react';
import { client } from '../lib/client.ts';
import type { ChatMessage, ToolCallEvent, ServerEvent } from '../types.ts';

export type UseChatOptions = {
  sessionId?: string;
  cwd?: string;
  allowWrite?: boolean;
  allowExecute?: boolean;
};

export function useChat(opts: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(opts.sessionId);
  const pendingToolCallsRef = useRef<Map<string, ToolCallEvent>>(new Map());

  const connect = useCallback(() => {
    client.connect({
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onEvent: (event: ServerEvent) => {
        switch (event.type) {
          case 'session_id':
            setCurrentSessionId(event.sessionId);
            break;

          case 'tool_call': {
            const tc: ToolCallEvent = {
              id: event.id,
              name: event.name,
              input: event.input,
              status: 'running',
            };
            pendingToolCallsRef.current.set(event.id, tc);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && last.pending) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, toolCalls: [...last.toolCalls, tc] },
                ];
              }
              return prev;
            });
            break;
          }

          case 'tool_result': {
            const tc = pendingToolCallsRef.current.get(event.id);
            if (tc) {
              const updated = { ...tc, output: event.output, metadata: event.metadata, status: 'done' as const };
              pendingToolCallsRef.current.set(event.id, updated);
            }
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && last.pending) {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    toolCalls: last.toolCalls.map((t) =>
                      t.id === event.id
                        ? { ...t, output: event.output, metadata: event.metadata, status: 'done' as const }
                        : t,
                    ),
                  },
                ];
              }
              return prev;
            });
            break;
          }

          case 'tool_error': {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && last.pending) {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    toolCalls: last.toolCalls.map((t) =>
                      t.id === event.id ? { ...t, error: event.error, status: 'error' as const } : t,
                    ),
                  },
                ];
              }
              return prev;
            });
            break;
          }

          case 'response':
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && last.pending) {
                return [...prev.slice(0, -1), { ...last, content: event.content }];
              }
              return prev;
            });
            break;

          case 'done':
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && last.pending) {
                return [...prev.slice(0, -1), { ...last, pending: false }];
              }
              return prev;
            });
            pendingToolCallsRef.current.clear();
            setSending(false);
            break;

          case 'error':
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && last.pending) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: `Error: ${event.message}`, pending: false },
                ];
              }
              return [
                ...prev,
                { role: 'assistant', content: `Error: ${event.message}`, toolCalls: [], pending: false },
              ];
            });
            setSending(false);
            break;
        }
      },
    });
  }, []);

  const send = useCallback(
    (content: string) => {
      if (sending) return;
      setSending(true);
      pendingToolCallsRef.current.clear();

      setMessages((prev) => [
        ...prev,
        { role: 'user', content },
        { role: 'assistant', content: '', toolCalls: [], pending: true },
      ]);

      try {
        client.send({
          content,
          sessionId: currentSessionId,
          cwd: opts.cwd,
          allowWrite: opts.allowWrite,
          allowExecute: opts.allowExecute,
        });
      } catch (err) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: 'assistant',
            content: `Error: ${err instanceof Error ? err.message : 'Not connected'}`,
            toolCalls: [],
            pending: false,
          },
        ]);
        setSending(false);
      }
    },
    [sending, currentSessionId, opts.cwd, opts.allowWrite, opts.allowExecute],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(undefined);
    pendingToolCallsRef.current.clear();
    setSending(false);
  }, []);

  return { messages, connected, sending, currentSessionId, connect, send, reset };
}

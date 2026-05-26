import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble.tsx';
import type { ChatMessage } from '../types.ts';

type Props = {
  messages: ChatMessage[];
  connected: boolean;
};

export function ChatThread({ messages, connected }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <img src="/logo.svg" alt="DvalinCode" className="w-16 h-16 rounded-xl object-cover" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-fg mb-1">DvalinCode</h2>
          <p className="text-sm text-muted-fg max-w-sm">
            An agentic coding assistant. Ask me to read files, write code, run commands, or explain anything in your project.
          </p>
        </div>
        {!connected && (
          <div className="text-xs text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            Connecting to server…
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-2xl mx-auto">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

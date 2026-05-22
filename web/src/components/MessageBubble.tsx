import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentActivity } from './AgentActivity.tsx';
import type { ChatMessage } from '../types.ts';

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <div className="w-1.5 h-1.5 rounded-full bg-muted-fg animate-dot-1" />
      <div className="w-1.5 h-1.5 rounded-full bg-muted-fg animate-dot-2" />
      <div className="w-1.5 h-1.5 rounded-full bg-muted-fg animate-dot-3" />
    </div>
  );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div className="max-w-[75%] bg-[#1a1a2e] border border-[#2a2a4e] rounded-2xl rounded-tr-sm px-4 py-2.5 text-fg text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message
  const { content, toolCalls, pending } = message;
  const showDots = pending && toolCalls.length === 0 && !content;

  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-[10px] text-accent font-bold">
          D
        </div>
        <span className="text-xs text-muted-fg font-medium">DvalinCode</span>
        {pending && (
          <span className="text-xs text-accent/60 animate-pulse">thinking…</span>
        )}
      </div>

      {/* Agent tool activity */}
      {toolCalls.length > 0 && (
        <div className="ml-7">
          <AgentActivity toolCalls={toolCalls} pending={pending} />
        </div>
      )}

      {/* Final response */}
      <div className="ml-7">
        {showDots ? (
          <ThinkingDots />
        ) : content ? (
          <div className="prose text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : null}
      </div>
    </div>
  );
}

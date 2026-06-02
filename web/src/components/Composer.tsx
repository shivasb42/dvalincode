import { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';

type Props = {
  onSend: (text: string) => void;
  onInterrupt?: () => void;
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
};

export function Composer({ onSend, onInterrupt, disabled, sending, placeholder }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled || sending) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-border bg-surface px-4 py-3">
      <div className="flex items-end gap-3 bg-[#0f0f0f] border border-border rounded-xl px-4 py-3 focus-within:border-accent/40 transition-colors">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Ask DvalinCode anything…'}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent resize-none outline-none text-fg placeholder-muted-fg text-sm leading-relaxed min-h-[24px] disabled:opacity-50"
        />
        {sending ? (
          <button
            onClick={onInterrupt}
            title="Stop generation"
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-colors"
          >
            <Square size={12} className="text-white fill-white" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!text.trim() || disabled}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/90 hover:bg-accent disabled:bg-muted/30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Send size={13} className="text-white" />
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-fg mt-2 text-center">
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  );
}

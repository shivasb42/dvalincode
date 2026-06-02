import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, File } from 'lucide-react';
import { fetchFiles } from '../lib/client.ts';

type Props = {
  onSend: (text: string) => void;
  onInterrupt?: () => void;
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
  cwd?: string;
};

const MAX_MENTION_RESULTS = 8;

export function Composer({ onSend, onInterrupt, disabled, sending, placeholder, cwd }: Props) {
  const [text, setText] = useState('');
  const [allFiles, setAllFiles] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionFiles, setMentionFiles] = useState<string[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  // Load file list once when cwd changes and @mention is first needed
  const loadFiles = useCallback(async () => {
    if (!cwd || allFiles.length > 0) return;
    try {
      const files = await fetchFiles(cwd);
      setAllFiles(files);
    } catch {
      // ignore — file list is optional
    }
  }, [cwd, allFiles.length]);

  /** Detect @mention in text up to cursor and return the query string (or null). */
  const detectMention = (value: string, cursorPos: number): string | null => {
    const before = value.slice(0, cursorPos);
    const match = before.match(/@([\w./\-]*)$/);
    return match ? match[1] : null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    const cursor = e.target.selectionStart ?? val.length;
    const query = detectMention(val, cursor);
    if (query !== null) {
      setMentionQuery(query);
      const filtered = allFiles
        .filter((f) => f.toLowerCase().includes(query.toLowerCase()))
        .slice(0, MAX_MENTION_RESULTS);
      setMentionFiles(filtered);
      setMentionIndex(0);
      if (allFiles.length === 0) void loadFiles();
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (file: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    const match = before.match(/@([\w./\-]*)$/);
    if (!match) return;
    const newBefore = before.slice(0, before.length - match[0].length) + `@${file}`;
    setText(newBefore + after);
    setMentionQuery(null);
    // Restore focus and position cursor after the inserted mention
    setTimeout(() => {
      textarea.focus();
      const pos = newBefore.length;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled || sending) return;
    onSend(trimmed);
    setText('');
    setMentionQuery(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mention navigation
    if (mentionQuery !== null && mentionFiles.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, mentionFiles.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        const selected = mentionFiles[mentionIndex];
        if (selected) {
          e.preventDefault();
          insertMention(selected);
          return;
        }
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const showDropdown = mentionQuery !== null && mentionFiles.length > 0;

  return (
    <div className="border-t border-border bg-surface px-4 py-3">
      <div className="relative">
        {/* @mention dropdown */}
        {showDropdown && (
          <div className="absolute bottom-full mb-1 left-0 w-full max-w-sm bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="px-3 py-1.5 border-b border-border flex items-center gap-1.5 text-[11px] text-muted-fg">
              <File size={10} />
              <span>Files matching <span className="text-accent font-mono">@{mentionQuery}</span></span>
            </div>
            {mentionFiles.map((file, i) => (
              <button
                key={file}
                onMouseDown={(e) => { e.preventDefault(); insertMention(file); }}
                className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors flex items-center gap-2 ${
                  i === mentionIndex
                    ? 'bg-accent/10 text-fg'
                    : 'text-muted-fg hover:bg-[#1a1a1a] hover:text-fg'
                }`}
              >
                <File size={10} className="flex-shrink-0 opacity-60" />
                {file}
              </button>
            ))}
            <div className="px-3 py-1 border-t border-border text-[10px] text-muted-fg/50">
              ↑↓ navigate · Tab/Enter select · Esc dismiss
            </div>
          </div>
        )}

        <div className="flex items-end gap-3 bg-[#0f0f0f] border border-border rounded-xl px-4 py-3 focus-within:border-accent/40 transition-colors">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? 'Ask DvalinCode anything… (type @ to reference a file)'}
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
      </div>
      <p className="text-[11px] text-muted-fg mt-2 text-center">
        Enter to send · Shift+Enter for newline · @ to reference a file
      </p>
    </div>
  );
}

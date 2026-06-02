import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, File, Terminal } from 'lucide-react';
import { fetchFiles } from '../lib/client.ts';

type Props = {
  onSend: (text: string) => void;
  onClear?: () => void;
  onInterrupt?: () => void;
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
  cwd?: string;
};

/* ── Slash commands ─────────────────────────────────────────────── */

type SlashCommand = {
  name: string;
  description: string;
  icon: React.ReactNode;
  /** If provided, insert this text; if null, handle via onClear/etc. */
  insertText: string | null;
};

const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: '/clear',
    description: 'Clear the current conversation',
    icon: <Terminal size={11} />,
    insertText: null, // handled by onClear
  },
  {
    name: '/compact',
    description: 'Compress conversation context to save tokens',
    icon: <Terminal size={11} />,
    insertText: '/compact',
  },
  {
    name: '/git',
    description: 'Show current git branch, commits, and changed files',
    icon: <Terminal size={11} />,
    insertText: '/git',
  },
  {
    name: '/plan',
    description: 'Ask the agent to plan the task before executing',
    icon: <Terminal size={11} />,
    insertText: '/plan',
  },
  {
    name: '/help',
    description: 'Show available slash commands',
    icon: <Terminal size={11} />,
    insertText: '/help',
  },
];

const MAX_MENTION_RESULTS = 8;

export function Composer({ onSend, onClear, onInterrupt, disabled, sending, placeholder, cwd }: Props) {
  const [text, setText] = useState('');
  const [allFiles, setAllFiles] = useState<string[]>([]);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionFiles, setMentionFiles] = useState<string[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);

  // slash command state
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashMatches, setSlashMatches] = useState<SlashCommand[]>([]);
  const [slashIndex, setSlashIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const loadFiles = useCallback(async () => {
    if (!cwd || allFiles.length > 0) return;
    try { setAllFiles(await fetchFiles(cwd)); } catch { /* ignore */ }
  }, [cwd, allFiles.length]);

  const detectMention = (value: string, cursorPos: number): string | null => {
    const match = value.slice(0, cursorPos).match(/@([\w./\-]*)$/);
    return match ? match[1] : null;
  };

  const detectSlash = (value: string, cursorPos: number): string | null => {
    // Only show slash menu when / is at the very start (or after a newline)
    const before = value.slice(0, cursorPos);
    const match = before.match(/(?:^|\n)(\/[\w]*)$/);
    return match ? match[1] : null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart ?? val.length;

    // @mention detection
    const mq = detectMention(val, cursor);
    if (mq !== null) {
      setMentionQuery(mq);
      const filtered = allFiles
        .filter((f) => f.toLowerCase().includes(mq.toLowerCase()))
        .slice(0, MAX_MENTION_RESULTS);
      setMentionFiles(filtered);
      setMentionIndex(0);
      setSlashQuery(null);
      if (allFiles.length === 0) void loadFiles();
      return;
    }
    setMentionQuery(null);

    // slash command detection
    const sq = detectSlash(val, cursor);
    if (sq !== null) {
      setSlashQuery(sq);
      const q = sq.slice(1).toLowerCase();
      setSlashMatches(SLASH_COMMANDS.filter((c) => c.name.slice(1).startsWith(q)));
      setSlashIndex(0);
      return;
    }
    setSlashQuery(null);
  };

  const insertMention = (file: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    const match = before.match(/@([\w./\-]*)$/);
    if (!match) return;
    const newBefore = before.slice(0, before.length - match[0].length) + `@${file}`;
    setText(newBefore + after);
    setMentionQuery(null);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(newBefore.length, newBefore.length);
    }, 0);
  };

  const applySlashCommand = (cmd: SlashCommand) => {
    setSlashQuery(null);
    setSlashMatches([]);
    if (cmd.name === '/clear') {
      setText('');
      onClear?.();
      return;
    }
    if (cmd.insertText !== null) {
      // Replace the /... text with the command
      const ta = textareaRef.current;
      if (!ta) return;
      const cursor = ta.selectionStart ?? text.length;
      const before = text.slice(0, cursor);
      const after = text.slice(cursor);
      const match = before.match(/(?:^|\n)(\/[\w]*)$/);
      if (!match) return;
      const newBefore = before.slice(0, before.length - match[1].length) + cmd.insertText + ' ';
      setText(newBefore + after);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(newBefore.length, newBefore.length);
      }, 0);
    }
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled || sending) return;
    onSend(trimmed);
    setText('');
    setMentionQuery(null);
    setSlashQuery(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // @mention navigation
    if (mentionQuery !== null && mentionFiles.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, mentionFiles.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if ((e.key === 'Tab' || e.key === 'Enter') && mentionFiles[mentionIndex]) { e.preventDefault(); insertMention(mentionFiles[mentionIndex]); return; }
      if (e.key === 'Escape') { setMentionQuery(null); return; }
    }

    // slash command navigation
    if (slashQuery !== null && slashMatches.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex((i) => Math.min(i + 1, slashMatches.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashIndex((i) => Math.max(i - 1, 0)); return; }
      if ((e.key === 'Tab' || e.key === 'Enter') && slashMatches[slashIndex]) { e.preventDefault(); applySlashCommand(slashMatches[slashIndex]); return; }
      if (e.key === 'Escape') { setSlashQuery(null); return; }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const showMentionDropdown = mentionQuery !== null && mentionFiles.length > 0;
  const showSlashDropdown   = slashQuery !== null && slashMatches.length > 0;

  return (
    <div className="border-t border-border bg-surface px-4 py-3">
      <div className="relative">
        {/* @mention dropdown */}
        {showMentionDropdown && (
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
                  i === mentionIndex ? 'bg-accent/10 text-fg' : 'text-muted-fg hover:bg-[#1a1a1a] hover:text-fg'
                }`}
              >
                <File size={10} className="flex-shrink-0 opacity-60" />
                {file}
              </button>
            ))}
            <div className="px-3 py-1 border-t border-border text-[10px] text-muted-fg/50">↑↓ navigate · Tab/Enter select · Esc dismiss</div>
          </div>
        )}

        {/* Slash command dropdown */}
        {showSlashDropdown && (
          <div className="absolute bottom-full mb-1 left-0 w-72 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="px-3 py-1.5 border-b border-border text-[11px] text-muted-fg flex items-center gap-1.5">
              <Terminal size={10} />
              Commands
            </div>
            {slashMatches.map((cmd, i) => (
              <button
                key={cmd.name}
                onMouseDown={(e) => { e.preventDefault(); applySlashCommand(cmd); }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-start gap-2.5 ${
                  i === slashIndex ? 'bg-accent/10 text-fg' : 'text-muted-fg hover:bg-[#1a1a1a] hover:text-fg'
                }`}
              >
                <span className="mt-0.5 opacity-60">{cmd.icon}</span>
                <div>
                  <div className="font-mono font-medium">{cmd.name}</div>
                  <div className="text-[11px] opacity-70 mt-0.5">{cmd.description}</div>
                </div>
              </button>
            ))}
            <div className="px-3 py-1 border-t border-border text-[10px] text-muted-fg/50">↑↓ navigate · Tab/Enter select · Esc dismiss</div>
          </div>
        )}

        <div className="flex items-end gap-3 bg-[#0f0f0f] border border-border rounded-xl px-4 py-3 focus-within:border-accent/40 transition-colors">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? 'Ask DvalinCode… ( / for commands · @ for files )'}
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
        Enter to send · Shift+Enter for newline · <span className="font-mono">/</span> commands · <span className="font-mono">@</span> files
      </p>
    </div>
  );
}

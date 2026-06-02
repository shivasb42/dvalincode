import { useState } from 'react';
import { ChevronRight, Terminal, CheckCircle, XCircle, Loader } from 'lucide-react';
import type { ToolCallEvent, DiffLine } from '../types.ts';
import { DiffViewer } from './DiffViewer.tsx';

const TOOL_ICONS: Record<string, string> = {
  read_file: '📄',
  write_file: '✏️',
  edit_file: '✏️',
  delete_file: '🗑️',
  list_files: '📁',
  search_text: '🔍',
  shell: '⚡',
};

function StatusIcon({ status }: { status: ToolCallEvent['status'] }) {
  if (status === 'running') return <Loader size={12} className="animate-spin text-accent" />;
  if (status === 'done') return <CheckCircle size={12} className="text-emerald-500" />;
  return <XCircle size={12} className="text-red-500" />;
}

function ToolCallItem({ tc }: { tc: ToolCallEvent }) {
  const [open, setOpen] = useState(false);
  const icon = TOOL_ICONS[tc.name] ?? '🔧';

  return (
    <div className="border border-border rounded overflow-hidden text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-tool-bg hover:bg-[#141420] transition-colors text-left"
      >
        <StatusIcon status={tc.status} />
        <span className="font-mono text-muted-fg">{icon}</span>
        <span className="font-mono text-accent">{tc.name}</span>
        {tc.status === 'error' && <span className="text-red-400 ml-1">failed</span>}
        <ChevronRight
          size={12}
          className={`ml-auto text-muted transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-border bg-[#0a0a0f]">
          {/* Input */}
          <div className="px-3 py-2">
            <div className="text-muted-fg mb-1 flex items-center gap-1">
              <Terminal size={10} />
              <span>input</span>
            </div>
            <pre className="font-mono text-fg overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(tc.input, null, 2)}
            </pre>
          </div>

          {/* Diff viewer for write/edit tools */}
          {Array.isArray(tc.metadata?.diff) && (
            <div className="border-t border-border px-3 py-2">
              <DiffViewer
                diff={tc.metadata!.diff as DiffLine[]}
                filePath={typeof tc.metadata!.path === 'string' ? tc.metadata!.path : undefined}
              />
            </div>
          )}

          {/* Raw output / error (skip output for write tools that already show diff) */}
          {(tc.error || (tc.output && !tc.metadata?.diff)) && (
            <div className="border-t border-border px-3 py-2">
              <div className="text-muted-fg mb-1">
                {tc.error ? <span className="text-red-400">error</span> : 'output'}
              </div>
              <pre className="font-mono text-fg overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-64">
                {tc.error ?? tc.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentActivity({ toolCalls, pending }: { toolCalls: ToolCallEvent[]; pending?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);

  if (toolCalls.length === 0 && !pending) return null;

  const running = toolCalls.filter((t) => t.status === 'running');

  return (
    <div className="my-2">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 text-xs text-muted-fg hover:text-fg transition-colors mb-2"
      >
        <ChevronRight size={12} className={`transition-transform ${collapsed ? '' : 'rotate-90'}`} />
        {running.length > 0 ? (
          <span className="flex items-center gap-1">
            <Loader size={11} className="animate-spin text-accent" />
            <span className="text-accent">Working…</span>
          </span>
        ) : (
          <span>{toolCalls.length} tool {toolCalls.length === 1 ? 'call' : 'calls'}</span>
        )}
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-1.5 ml-4">
          {toolCalls.map((tc) => (
            <ToolCallItem key={tc.id} tc={tc} />
          ))}
        </div>
      )}
    </div>
  );
}

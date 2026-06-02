import { Check, X } from 'lucide-react';
import type { PendingApproval } from '../types.ts';

type Props = {
  approval: PendingApproval;
  onRespond: (id: string, approved: boolean) => void;
};

const TOOL_ICONS: Record<string, string> = {
  shell: '⚡',
  write_file: '📝',
  edit_file: '✏️',
  delete_file: '🗑️',
};

function formatInput(toolName: string, input: unknown): string {
  if (!input || typeof input !== 'object') return String(input);
  const obj = input as Record<string, unknown>;

  if (toolName === 'shell' && typeof obj.command === 'string') {
    return obj.command;
  }
  if ((toolName === 'write_file' || toolName === 'edit_file') && typeof obj.path === 'string') {
    const lines = [`path: ${obj.path}`];
    if (typeof obj.old_string === 'string') lines.push(`- ${obj.old_string.slice(0, 120)}`);
    if (typeof obj.new_string === 'string') lines.push(`+ ${obj.new_string.slice(0, 120)}`);
    if (typeof obj.content === 'string') lines.push(`content: ${obj.content.length} chars`);
    return lines.join('\n');
  }
  return JSON.stringify(input, null, 2);
}

export function ApprovalDialog({ approval, onRespond }: Props) {
  const icon = TOOL_ICONS[approval.toolName] ?? '🔧';
  const isShell = approval.toolName === 'shell';
  const preview = formatInput(approval.toolName, approval.input);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-24 px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className={`flex items-center gap-2 px-4 py-3 border-b border-border ${isShell ? 'bg-orange-500/5' : 'bg-yellow-500/5'}`}>
          <span className="text-base">{icon}</span>
          <span className="text-sm font-medium text-fg">{approval.toolName}</span>
          <span className={`ml-auto text-[11px] px-2 py-0.5 rounded font-mono ${isShell ? 'text-orange-400 bg-orange-500/10 border border-orange-500/20' : 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20'}`}>
            {isShell ? 'execute' : 'write'}
          </span>
        </div>

        {/* Preview */}
        <pre className="px-4 py-3 text-xs font-mono text-muted-fg bg-[#0a0a0a] overflow-x-auto max-h-32 whitespace-pre-wrap break-all">
          {preview}
        </pre>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={() => onRespond(approval.id, false)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 rounded-lg transition-colors"
          >
            <X size={12} />
            Deny
          </button>
          <button
            onClick={() => onRespond(approval.id, true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-lg transition-colors"
          >
            <Check size={12} />
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}

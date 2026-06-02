import type { ApprovalMode } from '../types.ts';

type Props = {
  value: ApprovalMode;
  onChange: (mode: ApprovalMode) => void;
};

const MODES: { value: ApprovalMode; label: string; title: string; color: string }[] = [
  { value: 'readonly',  label: 'Read only',  title: 'Agent can only read files — no writes or shell commands', color: 'text-emerald-400' },
  { value: 'auto-edit', label: 'Auto-edit',  title: 'File writes and shell commands require approval before execution', color: 'text-yellow-400' },
  { value: 'full-auto', label: 'Full auto',  title: 'All operations run automatically without confirmation', color: 'text-orange-400' },
];

export function ApprovalModeSwitch({ value, onChange }: Props) {
  return (
    <div className="flex items-center bg-[#111] border border-border rounded-lg p-0.5 gap-0.5">
      {MODES.map((mode) => {
        const active = value === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value)}
            title={mode.title}
            className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-all ${
              active
                ? `${mode.color} bg-[#1a1a1a] border border-border shadow-sm`
                : 'text-muted-fg hover:text-fg'
            }`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

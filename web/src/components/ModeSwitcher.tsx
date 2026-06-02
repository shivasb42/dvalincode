import { MessageCircle, Users, Zap, type LucideIcon } from 'lucide-react';
import type { AgentMode } from '../types.ts';

type Props = {
  value: AgentMode;
  onChange: (mode: AgentMode) => void;
  /** When true, fills the parent width with equal-width tabs */
  fullWidth?: boolean;
};

const MODES: {
  value: AgentMode;
  label: string;
  Icon: LucideIcon;
  color: string;
  activeBg: string;
  title: string;
}[] = [
  {
    value: 'chat',
    label: 'Chat',
    Icon: MessageCircle,
    color: 'text-blue-400',
    activeBg: 'bg-blue-500/10 border-blue-500/25',
    title: 'Chat — Q&A only, no file changes',
  },
  {
    value: 'cowork',
    label: 'Cowork',
    Icon: Users,
    color: 'text-violet-400',
    activeBg: 'bg-violet-500/10 border-violet-500/25',
    title: 'Cowork — explain plan then execute, writes need approval',
  },
  {
    value: 'code',
    label: 'Code',
    Icon: Zap,
    color: 'text-orange-400',
    activeBg: 'bg-orange-500/10 border-orange-500/25',
    title: 'Code — autonomous agent, full tool access',
  },
];

export function ModeSwitcher({ value, onChange, fullWidth }: Props) {
  if (fullWidth) {
    return (
      <div className="flex w-full rounded-lg overflow-hidden border border-border">
        {MODES.map((mode, i) => {
          const active = value === mode.value;
          return (
            <button
              key={mode.value}
              onClick={() => onChange(mode.value)}
              title={mode.title}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-all',
                i > 0 ? 'border-l border-border' : '',
                active
                  ? `${mode.color} ${mode.activeBg}`
                  : 'text-muted-fg hover:text-fg hover:bg-[#1a1a1a]',
              ].join(' ')}
            >
              <mode.Icon size={12} />
              {mode.label}
            </button>
          );
        })}
      </div>
    );
  }

  /* Compact inline variant (kept for potential reuse) */
  return (
    <div className="flex items-center bg-[#111] border border-border rounded-lg p-0.5 gap-0.5">
      {MODES.map((mode) => {
        const active = value === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value)}
            title={mode.title}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              active
                ? `${mode.color} bg-[#1a1a1a] border border-border shadow-sm`
                : 'text-muted-fg hover:text-fg'
            }`}
          >
            <mode.Icon size={11} />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

import { useState } from 'react';
import { X, Settings } from 'lucide-react';

export type ChatSettings = {
  cwd: string;
  allowWrite: boolean;
  allowExecute: boolean;
  provider: string;
};

type Props = {
  settings: ChatSettings;
  onChange: (s: ChatSettings) => void;
};

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg hover:bg-[#1a1a1a] text-muted-fg hover:text-fg transition-colors"
      title="Settings"
    >
      <Settings size={15} />
    </button>
  );
}

export function SettingsPanel({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(settings);

  const save = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => { setDraft(settings); setOpen(true); }}
        className="p-1.5 rounded-lg hover:bg-[#1a1a1a] text-muted-fg hover:text-fg transition-colors"
        title="Settings"
      >
        <Settings size={15} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl w-96 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-fg">Settings</h2>
              <button onClick={() => setOpen(false)} className="text-muted-fg hover:text-fg">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-fg font-medium">Working directory (cwd)</span>
                <input
                  value={draft.cwd}
                  onChange={(e) => setDraft({ ...draft, cwd: e.target.value })}
                  className="bg-[#0f0f0f] border border-border rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-accent/40 font-mono"
                  placeholder="/path/to/project"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-fg font-medium">Provider</span>
                <input
                  value={draft.provider}
                  onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
                  className="bg-[#0f0f0f] border border-border rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-accent/40"
                  placeholder="deepseek"
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-fg font-medium">Permissions</span>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.allowWrite}
                    onChange={(e) => setDraft({ ...draft, allowWrite: e.target.checked })}
                    className="w-4 h-4 accent-[#818cf8]"
                  />
                  <span className="text-sm text-fg">Allow file writes & edits</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.allowExecute}
                    onChange={(e) => setDraft({ ...draft, allowExecute: e.target.checked })}
                    className="w-4 h-4 accent-[#818cf8]"
                  />
                  <span className="text-sm text-fg">Allow shell execution</span>
                </label>
                {(draft.allowWrite || draft.allowExecute) && (
                  <p className="text-xs text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1">
                    Granting these permissions lets the AI modify files and run commands.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-muted-fg hover:text-fg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="px-4 py-2 text-sm bg-accent/90 hover:bg-accent text-white rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

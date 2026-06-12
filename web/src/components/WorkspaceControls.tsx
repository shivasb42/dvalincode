import { useState } from 'react';
import { FolderOpen, GitBranch, GitPullRequest, Loader2 } from 'lucide-react';
import { cloneGitProject, createGitWorktree, openProjectFolder } from '../lib/client.ts';

type Accent = 'violet' | 'orange';

type Props = {
  cwd?: string;
  accent: Accent;
  onCwdChange: (cwd: string) => void;
};

const tone = {
  violet: {
    text: 'text-violet-300',
    border: 'border-violet-500/25',
    bg: 'bg-violet-500/10 hover:bg-violet-500/15',
    focus: 'focus:border-violet-500/40',
  },
  orange: {
    text: 'text-orange-300',
    border: 'border-orange-500/25',
    bg: 'bg-orange-500/10 hover:bg-orange-500/15',
    focus: 'focus:border-orange-500/40',
  },
};

export function WorkspaceControls({ cwd, accent, onCwdChange }: Props) {
  const [gitUrl, setGitUrl] = useState('');
  const [parentDir, setParentDir] = useState('');
  const [branch, setBranch] = useState('');
  const [worktreePath, setWorktreePath] = useState('');
  const [createBranch, setCreateBranch] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const t = tone[accent];

  const run = async (label: string, action: () => Promise<{ cwd: string }>) => {
    setBusy(label);
    setError('');
    try {
      const result = await action();
      onCwdChange(result.cwd);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const inputClass = `w-full bg-[#0f0f0f] border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg placeholder-muted-fg outline-none ${t.focus}`;
  const buttonClass = `w-full flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border transition-colors disabled:opacity-45 ${t.bg} ${t.border} ${t.text}`;

  return (
    <div className="px-3 pb-2 border-b border-border">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-[10px] font-semibold text-muted-fg/50 uppercase tracking-wider">
          Workspace
        </span>
        {cwd && <span className="text-[10px] text-muted-fg/50 truncate max-w-[120px]">{cwd.split(/[\\/]/).pop()}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => void run('open', () => openProjectFolder())}
          disabled={busy !== null}
          className={buttonClass}
          title="Open local folder"
        >
          {busy === 'open' ? <Loader2 size={11} className="animate-spin" /> : <FolderOpen size={11} />}
          Open folder
        </button>

        <input
          value={gitUrl}
          onChange={(e) => setGitUrl(e.target.value)}
          placeholder="Git URL"
          className={inputClass}
        />
        <input
          value={parentDir}
          onChange={(e) => setParentDir(e.target.value)}
          placeholder="Parent folder"
          className={inputClass}
        />
        <button
          onClick={() => void run('clone', () => cloneGitProject(gitUrl, parentDir || undefined))}
          disabled={busy !== null || !gitUrl.trim()}
          className={buttonClass}
          title="Clone Git project"
        >
          {busy === 'clone' ? <Loader2 size={11} className="animate-spin" /> : <GitPullRequest size={11} />}
          Import Git
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="Branch"
            className={inputClass}
          />
          <label className="flex items-center gap-1.5 text-[10px] text-muted-fg bg-[#0f0f0f] border border-border rounded-lg px-2">
            <input
              type="checkbox"
              checked={createBranch}
              onChange={(e) => setCreateBranch(e.target.checked)}
              className="accent-current"
            />
            New
          </label>
        </div>
        <input
          value={worktreePath}
          onChange={(e) => setWorktreePath(e.target.value)}
          placeholder="Worktree path"
          className={inputClass}
        />
        <button
          onClick={() => void run('worktree', () => createGitWorktree(cwd ?? '', branch, worktreePath, createBranch))}
          disabled={busy !== null || !cwd || !branch.trim() || !worktreePath.trim()}
          className={buttonClass}
          title="Create Git worktree"
        >
          {busy === 'worktree' ? <Loader2 size={11} className="animate-spin" /> : <GitBranch size={11} />}
          Add worktree
        </button>

        {error && (
          <div className="px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

# Plan: Team AI Playbook — `dvalin.json`

## Goal

Make the Routines panel (currently stored in `localStorage`, machine-local) into a project-level git artifact. A `dvalin.json` file committed to the repo delivers every team member — and every new clone — the same set of AI automation commands.

## Why P2?

- Score: 4.0 (REQUIREMENTS.md #18)
- **AGENTS.md** gives the AI context about the project. **`dvalin.json`** gives the AI the runbook — the team's agreed set of quick commands. Together they form a complete "AI onboarding package" for any project.
- No competitor (Cline, Aider, Claude Code) makes team AI commands a first-class git artifact.
- The Routines panel already exists in the UI; this is mostly a read/write/merge layer.

## Design

### Schema (`dvalin.json` v1)

Minimal and forwards-compatible:

```json
{
  "version": 1,
  "routines": [
    {
      "label": "Run tests",
      "prompt": "Run the full test suite and report any failures"
    },
    {
      "label": "Type check",
      "prompt": "Run tsc --noEmit and list all type errors with file paths and line numbers"
    },
    {
      "label": "Build",
      "prompt": "Build the project and report any build errors"
    },
    {
      "label": "Git status",
      "prompt": "Show the current git status, staged changes, and recent commits"
    },
    {
      "label": "Lint",
      "prompt": "Run the linter and auto-fix what's safe; list remaining warnings"
    }
  ]
}
```

### Behaviour

#### On startup (read)

When DvalinCode starts and the WebSocket handshake delivers `cwd`, the backend checks for `<cwd>/dvalin.json`:

```ts
// src/server/wsHandler.ts  (or a new src/config/playbook.ts)
async function loadPlaybook(cwd: string): Promise<Routine[]> {
  const p = path.join(cwd, 'dvalin.json');
  try {
    const raw = await fs.readFile(p, 'utf-8');
    const data = JSON.parse(raw);
    if (data.version === 1 && Array.isArray(data.routines)) {
      return data.routines;               // { label, prompt }[]
    }
  } catch { /* file absent or invalid — silent */ }
  return [];
}
```

The routines are sent to the frontend via a new WS event `{ type: 'playbook', routines }` (or piggybacked on the existing session-init payload).

**Merge strategy**: project routines from `dvalin.json` are shown first; any user-added routines (localStorage) that don't share a label with a project routine are appended below a visual separator — "Project routines" vs. "My routines".

#### Export button (write)

In the Routines panel sidebar, add an **Export** button (icon: `ti-download`). Clicking it:

1. POSTs the current routines list to `POST /api/playbook` with `{ cwd, routines }`
2. Backend writes `<cwd>/dvalin.json` atomically (write to `.dvalin.json.tmp`, then rename)
3. Frontend shows a toast: **"Saved to dvalin.json — commit it to share with your team"**

#### `GET /api/playbook?cwd=…`

Returns the parsed `dvalin.json` (or `{ routines: [] }` if absent). Frontend calls this once on session load.

### Frontend changes

**Routines panel** (`web/src/components/Sidebar.tsx` or equivalent):

```
ROUTINES                              [Export ↓]
──────────────────────────────────────
▸ Run tests          (from dvalin.json)
▸ Type check         (from dvalin.json)
▸ Build              (from dvalin.json)
──────────────────────────────────────
▸ My custom routine  (local only)
                                    [+ Add]
```

Each project routine shows a small "project" badge so users understand the source.

### API routes (backend)

```ts
// src/server/index.ts
app.get('/api/playbook',  playbookHandler.get);   // returns { routines }
app.post('/api/playbook', playbookHandler.save);  // writes dvalin.json
```

```ts
// src/server/playbookHandler.ts
export async function get(req, res) {
  const cwd = req.query.cwd as string;
  res.json({ routines: await loadPlaybook(cwd) });
}

export async function save(req, res) {
  const { cwd, routines } = req.body;
  const out = JSON.stringify({ version: 1, routines }, null, 2);
  const tmp = path.join(cwd, '.dvalin.json.tmp');
  const dest = path.join(cwd, 'dvalin.json');
  await fs.writeFile(tmp, out, 'utf-8');
  await fs.rename(tmp, dest);
  res.json({ ok: true });
}
```

## Files to touch

| File | Change |
|---|---|
| `src/server/index.ts` | Register `GET/POST /api/playbook` |
| `src/server/playbookHandler.ts` | New: read/write `dvalin.json` |
| `src/server/wsHandler.ts` | Load playbook on session init, include in session payload |
| `web/src/components/Sidebar.tsx` | Show project routines with badge, Export button |
| `web/src/hooks/usePlaybook.ts` | New: fetch + cache playbook, merge with localStorage routines |

## Acceptance criteria

- [ ] Clone a repo with `dvalin.json` → Routines panel shows project routines on first launch
- [ ] Export button → `dvalin.json` written to workspace root, `git diff` shows expected JSON
- [ ] Routines from `dvalin.json` and localStorage routines both appear in panel (project first)
- [ ] Deleting a project routine from the panel does NOT modify `dvalin.json` (local override only)
- [ ] Missing or malformed `dvalin.json` → silent fallback to localStorage routines only
- [ ] The default routines (Run tests / Type check / Build / Git status / Lint) remain in localStorage for new projects

## Open questions

- Should routine execution validate that `prompt` is non-empty? Yes — skip empty-prompt routines silently.
- Should `dvalin.json` support routine categories / groups? Defer — keep v1 flat for simplicity.
- Should the export include the workspace's existing AGENTS.md content? No — AGENTS.md and `dvalin.json` are separate concerns; keep them independent.

# Plan: Execution Safety Hardening

## Goal
Close the three write/exec safety gaps competitors fixed this cycle: ambiguous edits, silent overwrites/sensitive-config writes, and the missing Linux sandbox.

## Why P1?
- Score: 11.1 (REQUIREMENTS.md #16) — and it continues our #1 community signal (vibe-coding guardrails, ↑7061)
- opencode v1.16.2: "Edit operations now refuse loose matches that could overwrite the wrong code or replace an existing file by mistake"
- Claude Code 2.1.160: prompts before writing shell startup files and build-tool configs that grant code execution
- Codex rust-v0.136/v0.139: command-safety hardening, sandbox escalation decisions, proxy-only networking
- "The agent that writes maintainable code" is our stated positioning — safety parity is not optional

## Design

### 4a — Strict edit matching (`edit_file`)

Today `src/tools/editFile.ts` computes `occurrences` but silently replaces the
first match. Change `run()`:
- `occurrences > 1` and `replaceAll` not set → throw:
  `oldString matches N locations in <file>. Add surrounding context to make it unique, or pass replaceAll: true.`
  (the error text teaches the model the fix — keeps retry cost low)
- New optional input `replaceAll?: boolean` (default false) → replaces all
  occurrences (`split().join()`), reports count in output
- Undo: single-occurrence edits keep the existing string-swap `reverse()`;
  `replaceAll` edits return `isUndoable: false` (reverse-swap is ambiguous if
  `newString` already occurred elsewhere)

### 4b — Overwrite + guarded-path approvals

**`write_file` overwrite flag**: if the target exists and input
`overwrite: true` is absent → throw
`File exists: <path>. Pass overwrite: true to replace it (a diff will be reported).`
Backup/diff machinery already exists for undo, so behavior past the gate is unchanged.

**Guarded sensitive paths** — `src/core/guardedPaths.ts`:
```ts
const GUARDED = ['.npmrc', '.yarnrc', '.yarnrc.yml', 'bunfig.toml', '.bazelrc',
  '.pre-commit-config.yaml', '.devcontainer/', '.git/hooks/', '.husky/',
  '.vscode/tasks.json', '.envrc'];   // files that grant code execution implicitly
export function isGuardedPath(relPath: string): boolean
```
Enforcement in `ToolRegistry.run()` after `inputSchema.parse()`: when
`tool.access !== 'read'` and the parsed input has a `filePath` hitting the
guard list, require `context.requestApproval` **even in full-auto mode**
(approval request carries a `reason: 'guarded-path'` field so
`ApprovalDialog` can explain *why*). Headless CLI runs without a
`requestApproval` callback throw with a pointer to the new
`--allow-guarded` flag (`DvalinContext.allowGuardedPaths`).

### 4c — Linux sandbox parity (`shell` tool)

`src/tools/shell.ts` already wraps commands with `sandbox-exec` on macOS
(network denied, writes limited to cwd/tmp). Mirror it on Linux when `bwrap`
is on PATH:
```
bwrap --ro-bind / / --bind <cwd> <cwd> --tmpfs /tmp --unshare-net
      --die-with-parent --proc /proc --dev /dev -- <command> <args...>
```
- `DvalinContext.sandboxMode: 'auto' | 'off'` (default `auto`; `off` preserves
  today's unsandboxed escape hatch for trusted workflows)
- `ToolResult.metadata.sandbox: 'seatbelt' | 'bwrap' | 'none'` so the UI can
  badge unsandboxed runs (Windows and bwrap-less Linux report `none`)
- Sandbox-denied failures (non-zero exit + EPERM/network patterns in output)
  set `metadata.sandboxDenied: true` so the model understands *why* the
  command failed and can ask the user instead of flailing

### Stage 2 (not this cycle)
Escalation memory à la Codex v0.139: an approved "re-run unsandboxed" decision
is remembered per command per session.

## File Changes
1. `src/tools/editFile.ts` — uniqueness check, `replaceAll` input, undo rules
2. `src/tools/writeFile.ts` — `overwrite` input gate
3. `src/core/guardedPaths.ts` — new: guard list + matcher
4. `src/tools/registry.ts` — guarded-path approval hook in `run()`
5. `src/core/context.ts` — `sandboxMode`, `allowGuardedPaths` options
6. `src/tools/shell.ts` — bwrap wrapper, sandbox metadata, denial detection
7. `src/server/wsHandler.ts` — pass `reason` through `approval_request`; expose `sandboxMode` from client settings
8. `web/src/components/ApprovalDialog.tsx` — render guarded-path reason
9. `tests/editFile.test.ts`, `tests/writeFile.test.ts` — extend; `tests/guardedPaths.test.ts`, `tests/shellSandbox.test.ts` — new (sandbox test skips when bwrap/sandbox-exec unavailable)

## Verification
- Ambiguous edit (2+ occurrences) fails with the teaching error; `replaceAll: true` replaces all and reports count; unique edit behavior unchanged (existing tests stay green)
- `write_file` on an existing file fails without `overwrite: true`; undo still restores the backup
- Writing `.git/hooks/pre-commit` in full-auto triggers an approval request with `reason: 'guarded-path'`; headless run without callback throws mentioning `--allow-guarded`
- On Linux with bwrap: `curl` from shell tool fails (network unshared), writes outside cwd fail, `metadata.sandbox === 'bwrap'`
- `npm run check` passes

## Risk note
Strict matching will surface previously-silent ambiguous edits as errors — expected and desired, but watch the agent-retry rate after rollout; the error messages are written to make self-correction one-shot.

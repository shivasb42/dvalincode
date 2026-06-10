# Plan: Subagent & Background Tasks

## Goal
Add a `task` tool so the agent can delegate scoped work to a child agent, then add background execution so long-running tasks don't block the conversation.

## Why P1?
- Score: 13.3 (REQUIREMENTS.md #14) — strongest cross-vendor theme of the 2026-06 cycle
- Claude Code 2.1.157–2.1.170: `claude agents` background sessions dominate every release
- opencode v1.16.2: "Running subagents can now be sent to the background"
- Codex rust-v0.137+: multi-agent v2 (per-thread runtime, spawn metadata, subagent identity in hooks)
- DvalinCode has zero delegation capability today

## Design

### Stage 1 — Synchronous subagent (`task` tool)

A new tool the LLM can call to fan out a focused job (e.g. "find every caller of X", "summarize the auth flow"):

```ts
// input
{ prompt: string, tools?: string[] }   // tools defaults to read-only set
```

- `access: 'read'` — the *tool itself* is safe; the child's own tool calls are
  individually gated by the child context (below).
- Builds a **fresh registry** via `createDefaultToolRegistry()` +
  `setAllowedTools(input.tools ?? READ_ONLY_TOOLS)` where
  `READ_ONLY_TOOLS = ['read_file', 'list_files', 'search_text', 'git_status']`.
  Never mutate the parent's registry (`setAllowedTools` is instance-level state).
- Child context derives from the parent `DvalinContext`:
  - `agentDepth: (parent.agentDepth ?? 0) + 1` — new field; `task` throws if
    parent depth ≥ 1 (no recursive subagents)
  - `allowWrite`/`allowExecute` can only be narrowed, never widened; non-read
    child tools still flow through the existing `requestApproval` callback in
    auto-edit mode (free integration with `ApprovalDialog`)
- Runs a child `AgentRunner` (`RunnerOptions` reuses parent provider + config
  with a lower `maxIterations`) and returns the child's `finalResponse` as the
  `ToolResult.output`. Child `usage` goes in `metadata.usage`; parent
  accumulates it into the turn total in `runner.ts` alongside its own provider
  usage.
- Abort: child `runTurn` receives the parent's `AbortSignal` so interrupt
  (`wsHandler.ts` `currentAbort`) kills the whole tree.
- Events: child events are forwarded to the parent `AgentEventHandler` wrapped
  as `{ type: 'task_progress', taskId, inner }` so `AgentActivity` can render a
  nested timeline.
- `isConcurrencySafe: () => true` for read-only tool sets — enables future
  parallel fan-out.

### Stage 2 — Background execution

- `task` input gains `background?: boolean`. When true, the tool registers the
  run with a new `TaskManager` and immediately returns `Task started: tsk_xxx`.
- `src/agent/taskManager.ts`: `Map<taskId, { status: 'running'|'done'|'failed', promise, outputBuffer, abort: AbortController, usage }>` — server-process scoped.
- New read-only tool `task_status` (`{ taskId?: string }`) returns one/all task
  states + accumulated output, so the model can check back later.
- WS: new server event `{ type: 'task_update', taskId, status, title }` pushed
  on state change; web UI badges running tasks in `AgentActivity`.
- Interrupt semantics: `interrupt` aborts the foreground turn only; background
  tasks keep running and are listed for explicit cancellation (matches Claude
  Code/opencode behavior). WS disconnect aborts everything.

### Stage 3 — Future (out of scope here)
- Parallel fan-out UI, per-task git worktree isolation (opencode workspace
  cloning, Claude Code worktree agents), cross-session task persistence.

## File Changes
1. `src/tools/task.ts` — new: `task` tool, child registry/context construction, depth guard
2. `src/agent/taskManager.ts` — new (stage 2): background task registry
3. `src/tools/taskStatus.ts` — new (stage 2): `task_status` tool
4. `src/core/context.ts` — add `agentDepth?: number` to `DvalinContext`
5. `src/tools/registry.ts` — register new tools in `createDefaultToolRegistry()`; export `READ_ONLY_TOOLS`
6. `src/agent/runner.ts` — accumulate `metadata.usage` from task results into turn usage
7. `src/agent/types.ts` — add `task_progress` to `AgentEventHandler` event union
8. `src/server/wsHandler.ts` — `task_update` server event (stage 2); leave background tasks alive on foreground interrupt
9. `web/src/components/AgentActivity.tsx` — render nested task progress + running-task badge (stage 2)
10. `tests/task.test.ts` — new test suite

## Verification
- Child with default tools cannot write: `task` running a prompt that triggers `write_file` → child throws permission error, parent receives it as tool output (test with mock provider)
- Depth guard: a child calling `task` fails with a clear error
- Abort: aborting the parent signal settles the child run promptly
- Usage: parent turn usage includes child tokens
- Stage 2: `task(background:true)` returns immediately; `task_status` reflects running → done; WS `task_update` fires
- `npm run check` passes

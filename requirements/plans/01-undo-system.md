# Plan: Undo/Rollback System

## Goal
Add `/undo` support to `dvalincode chat` so users can revert the last tool action.

## Why P1?
- Score: 13.3 (highest in backlog)
- Codex CLI #9203: "Please make /undo back" (↑510) — users actively miss it
- Directly addresses "destructive changes without review" pain point

## Design

### Tool Interface Changes
Every tool can optionally declare:
```ts
interface Tool<Input> {
  // ... existing fields ...
  isUndoable: (input: Input) => boolean;
  reverse: (input: Input, result: ToolResult, context: ForgeContext) => Promise<ToolResult>;
}
```

### Undo Stack
`AgentRunner` maintains a stack of executed tool calls. Each entry stores:
- The tool name and original input
- The tool result
- Any state needed for reversal

### Tool Reversals

| Tool | Undoable? | Reverse Operation |
|------|-----------|-------------------|
| write_file | Yes | If file was new → delete it. If existing → restore from backup (store content before write) |
| edit_file | Yes | Re-run edit with old_string↔new_string swapped |
| list_files | No | No-op (pure read) |
| read_file | No | No-op (pure read) |
| search_text | No | No-op (pure read) |
| shell | Conditional | Warn: "Shell command executed. Undo may not fully reverse side effects." |

### CLI Integration
- In `dvalincode chat`: type `/undo` to revert the last tool call
- Type `/undo 3` to revert the last 3 tool calls
- Each undo is logged as a tool_result message in the session
- Undo state only persists across a session (not across sessions)

### File Changes
1. `src/tools/types.ts` — Add `isUndoable()` and `reverse()` to Tool interface
2. `src/tools/writeFile.ts` — Implement backup-before-write + reverse
3. `src/tools/editFile.ts` — Implement string-swap reverse
4. `src/agent/types.ts` — Add `TurnState.UNDO`
5. `src/agent/runner.ts` — Add undo stack tracking
6. `src/agent/loop.ts` — Handle `/undo` command in COMMAND state
7. `src/commands/chat.ts` — Nothing to change (loop.ts handles it)
8. `tests/undo.test.ts` — Test suite

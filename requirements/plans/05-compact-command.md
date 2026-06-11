# Plan: `/compact` — User-Triggered Context Compression

## Goal

Turn the existing (but unexposed) `COMPACT` state in `AgentLoop` into a first-class user command with a structured output format. Primary audience: local model users (Ollama/Qwen) and cheap-model users (DeepSeek) who hit context limits mid-session and start hallucinating.

## Why P2?

- Score: 8.0 (REQUIREMENTS.md #17) — upgrade from P2 #2 (Token Efficiency, score 6.4)
- Gemini analysis: no competitor surfaces context compression as an explicit command with user-visible output
- Local/cheap models have 8k–32k effective context windows; long coding sessions overflow in 20–40 turns
- Existing `summarizeSession()` in `AgentLoop` does the heavy lifting — this is mostly a UX/exposure task

## Design

### User flow

1. User types `/compact` in the chat input (or clicks a "Compact" button in the overflow menu)
2. Frontend sends `{ type: 'compact' }` over WebSocket
3. Backend calls `summarizeSession(messages)` → receives the summary
4. Backend replaces the in-memory message history with:
   - One `system` message: the structured summary (see format below)
   - One `user` message: "Context was compacted. Continue from the Pending list."
5. Backend responds with a special `{ type: 'compact_done', before, after }` WS event
6. Frontend shows a dismissable toast: **"Context compressed: 12 400 → 800 tokens (−94%)"**
7. Chat scrolls to a visual separator: `── context compacted ──`

### Structured summary format

The LLM prompt passed to `summarizeSession()` should request this exact structure:

```
## Goal
<one sentence: what the user is trying to accomplish this session>

## Completed
- <task or file changed, with file path if applicable>
- ...

## Key decisions
- <non-obvious architectural choice or API design decision>
- ...

## Pending
- <remaining work items in order of priority>
- ...
```

This structure is optimised for re-priming a fresh model context: Goal orients it, Completed prevents re-doing work, Key decisions prevent undoing choices, Pending gives the next action.

### Slash-command registration

DvalinCode already handles `/` commands in `wsHandler.ts` (e.g. `/load`). Add:

```ts
// src/server/wsHandler.ts
if (msg.type === 'compact') {
  const summary = await summarizeSession(session.messages, llmClient);
  const compactedMessages = buildCompactedHistory(summary);
  session.messages = compactedMessages;
  const tokensBefore = estimateTokens(originalMessages);
  const tokensAfter = estimateTokens(compactedMessages);
  ws.send(JSON.stringify({
    type: 'compact_done',
    summary,
    tokensBefore,
    tokensAfter,
  }));
  return;
}
```

### Frontend: slash-command trigger

In `web/src/`, the chat input already parses `/` commands. Register `/compact`:

```ts
// web/src/components/ChatInput.tsx (or equivalent)
if (text === '/compact') {
  sendWsMessage({ type: 'compact' });
  return;
}
```

Also add a **"Compact context"** entry to the `⋮` (more options) menu in the chat toolbar — one-click for users who don't know the slash command.

### Visual separator

When the frontend receives `compact_done`, insert a divider message in the chat thread:

```
── context compacted · 12 400 → 800 tokens (−94%) ──
```

Styled as a muted horizontal rule, not a chat bubble.

## Files to touch

| File | Change |
|---|---|
| `src/server/wsHandler.ts` | Handle `type: 'compact'` message |
| `src/agent/loop.ts` | Export / clean up `summarizeSession()` signature |
| `src/agent/compact.ts` | New: `buildCompactedHistory(summary)` + structured prompt |
| `web/src/components/ChatInput.tsx` | Register `/compact` slash command |
| `web/src/components/ChatThread.tsx` | Render compact-done divider |
| `web/src/hooks/useWebSocket.ts` | Handle `compact_done` WS event |

## Acceptance criteria

- [ ] `/compact` typed in chat → toast shows token reduction, divider appears in thread
- [ ] After compact, LLM response references the summary (Goal / Pending) not raw prior messages
- [ ] Token count in topbar decreases to reflect compacted context
- [ ] Works with all three providers (DeepSeek, OpenAI, Ollama)
- [ ] Second `/compact` in same session works (can compact already-compacted history)

## Open questions

- Should `/compact` be auto-triggered when context exceeds a threshold (e.g. 80% of model's `maxTokens`)? Start manual-only; auto-compact in a follow-up.
- Should the compacted summary be persisted to the session store so restoring the session still works? Yes — store the compacted messages as the session's message list.

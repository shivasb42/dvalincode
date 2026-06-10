# Plan: MCP Client Support

## Goal
Let users connect MCP (Model Context Protocol) servers so their tools become available to the agent — stdio transport first, zero new dependencies.

## Why P1?
- Score: 12.5 (REQUIREMENTS.md #15) — all three competitors hardened MCP in the 2026-06 cycle
- opencode v1.17.0: MCP abort signals, catalog pagination, capability respect, non-interactive `mcp add`
- Codex rust-v0.134+: per-server env, OAuth for streamable HTTP, concurrent read-only tools via `readOnlyHint`, `oneOf`/`allOf`/`$ref` schema preservation
- Claude Code 2.1.161+: managed MCP policies, secrets redaction in `mcp list/get`
- MCP multiplies DvalinCode's provider-neutral, open-REST-API positioning; without it we're locked out of the ecosystem

## Design

### Stage 1 — stdio transport + tool bridging

**Config** (`configStore.ts`, same JSON config the GUI edits):
```jsonc
"mcpServers": [
  { "name": "github", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": { "GITHUB_TOKEN": "..." }, "enabled": true }
]
```

**Client** — `src/mcp/client.ts`, no SDK dependency (aligns with the zero-dep
philosophy). MCP stdio framing is newline-delimited JSON-RPC 2.0:
- `spawn(command, args, { env })`, write requests to stdin, parse stdout lines
- Handshake: `initialize` (protocolVersion `2025-03-26`, client info) →
  `notifications/initialized`
- Respect advertised capabilities: only call `tools/list` when
  `capabilities.tools` is present (opencode v1.17.0 fix — bake in from day one)
- `tools/list` with cursor pagination loop (ditto)
- `tools/call` with per-call timeout (default 30s); on `AbortSignal` send
  `notifications/cancelled` and reject (ditto)
- Server crash → mark server `failed`, surface a clear status message; never
  take the agent down

**Bridge** — `src/mcp/bridge.ts` maps each MCP tool to our `Tool<unknown>`:
- Name: `mcp__<server>__<tool>` (collision-proof, recognizable in approval UI)
- `access`: `annotations.readOnlyHint === true ? 'read' : 'write'` — mirrors
  Codex; non-read MCP tools then flow through the existing
  `assertToolPermission` + auto-edit `requestApproval` gates in
  `ToolRegistry.run()` for free
- Schema: MCP supplies raw JSON Schema, but `Tool.inputSchema` is zod and
  `AgentRunner.buildToolDefs()` calls `inputSchema.toJSONSchema?.()`. Add an
  optional `jsonSchema?: Record<string, unknown>` field to `Tool` that
  `buildToolDefs()` prefers over the zod conversion; bridge tools use it and
  set `inputSchema` to a permissive object schema (server-side validation is
  authoritative). Preserve the schema as-is — no lossy flattening (Codex
  v0.139 lesson)
- `isConcurrencySafe: () => access === 'read'`
- Result: concatenate `content[]` text parts into `ToolResult.output`;
  non-text parts noted as `[image]`/`[resource]` placeholders

**Manager** — `src/mcp/manager.ts`: reads config, starts enabled servers,
registers bridged tools into the session's `ToolRegistry`, exposes
`statuses()`, `dispose()`. Wired up in `wsHandler.ts` (web) and
`commands/chat.ts` (CLI) at session start.

**CLI** — `src/commands/mcp.ts`: `dvalincode mcp add|list|remove`,
non-interactive friendly. `list` redacts `env` values (Claude Code 2.1.161
lesson: never print secrets).

### Stage 2 — later
- Streamable HTTP transport + OAuth, MCP resources/prompts, server management
  panel in `SettingsPanel`, per-server tool allowlists.

## File Changes
1. `src/mcp/client.ts` — new: stdio JSON-RPC client (handshake, list, call, cancel)
2. `src/mcp/bridge.ts` — new: MCP tool → `Tool<unknown>` mapping
3. `src/mcp/manager.ts` — new: lifecycle + registration
4. `src/commands/mcp.ts` — new: `mcp add|list|remove` subcommands; register in `src/index.ts`
5. `src/server/configStore.ts` — `mcpServers` config section + validation
6. `src/tools/types.ts` — optional `jsonSchema` field on `Tool`
7. `src/agent/runner.ts` — `buildToolDefs()` prefers `tool.jsonSchema` when present
8. `src/server/wsHandler.ts` — start/dispose manager per session; surface server statuses to the UI
9. `tests/mcp.test.ts` — new: fixture MCP server (small node script speaking stdio JSON-RPC) + client/bridge tests

## Verification
- Fixture server: handshake completes, tools listed across two pages, `tools/call` round-trips
- A `readOnlyHint: false` MCP tool in auto-edit mode triggers `requestApproval`; rejection produces "User rejected" without calling the server
- Abort mid-call sends `notifications/cancelled` and settles the tool promise
- Killing the fixture server mid-session degrades gracefully (status `failed`, agent keeps working)
- `dvalincode mcp list` never prints env secret values
- `npm run check` passes

## Out of scope (v1)
HTTP/OAuth transports, MCP resources & prompts, sampling, GUI management panel.

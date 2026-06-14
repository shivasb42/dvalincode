# DvalinCode Design

DvalinCode is a small, original CLI foundation for agentic coding workflows.

## Goals

- Keep the first version understandable.
- Make every tool explicit and typed.
- Make permissions simple enough to audit.
- Keep the project provider-neutral.
- Prefer local context and deterministic behavior before model calls.

## Non-Goals

- Clone any existing commercial assistant.
- Provide a full autonomous coding agent in the first release.
- Execute write or shell operations without explicit permission.
- Bind the project to one model vendor.

## User-Facing Behavior

DvalinCode starts as a normal CLI with subcommands:

- `scan` summarizes a project.
- `tools` lists available capabilities.
- `run-tool` invokes a specific tool with JSON input.
- `ask` creates a local execution brief for a goal.
- `chat` runs the agent loop against a project.
- `init` scaffolds project config.
- `report` renders / verifies a run's audit trail (`--last`, `<run-id>`, `verify`).

The CLI is plain by design; the bundled web GUI is the richer reference client over the same core contracts.

## Core Interfaces

### Tool

```ts
type Tool<Input> = {
  name: string;
  description: string;
  access: 'read' | 'write' | 'execute';
  inputSchema: ZodType<Input>;
  isConcurrencySafe?: (input: Input) => boolean;
  run(input: Input, context: DvalinContext): Promise<ToolResult>;
};
```

### Context

```ts
type DvalinContext = {
  cwd: string;
  allowWrite: boolean;
  allowExecute: boolean;
  maxBytes: number;
  approvalMode: 'readonly' | 'auto-edit' | 'full-auto' | 'bypass';
  requestApproval?: (id: string, toolName: string, input: unknown) => Promise<boolean>;
  audit?: AuditSink;   // per-run audit sink; tool taps emit events when present
};
```

### Tool Result

```ts
type ToolResult = {
  title: string;
  output: string;
  metadata?: Record<string, unknown>;
};
```

## Permission Model

Read tools run by default.

Write and execute tools are blocked unless the caller opts in. The original CLI used a `--yes` flag; the agent runtime now expresses this through `approvalMode` — `readonly` (no writes), `auto-edit` (approve each write), `full-auto`, and `bypass`. Every run is also recorded to a tamper-evident audit log (see [AUDIT-TRAIL.md](AUDIT-TRAIL.md)). A future policy file can enforce constraints at the registry gating layer.

## Provider Model

The current `ask` command uses a deterministic local planner. Future model adapters should live behind a provider interface and receive only curated context plus tool manifests.

Provider adapters should not call tools directly. They should request tool use through the same validated registry used by the CLI.

## Module Layout

```text
src/
├── agent/         AgentLoop state machine, runner, compaction
├── audit/         hash-chained run log, Run Report renderer, taps
├── commands/      CLI command registration (incl. `report`)
├── core/          context, permissions, workspace scanning
├── providers/     planner and model adapters
├── server/        Express + WebSocket runtime for the GUI
├── sessions/      session persistence
├── tools/         tool contracts and built-in tools
└── ui/            terminal rendering helpers
```

## Safety Principles

- Validate inputs before running a tool.
- Resolve file paths inside the workspace.
- Keep process execution opt-in.
- Prefer small, inspectable outputs.
- Keep dangerous capabilities out of default flows.


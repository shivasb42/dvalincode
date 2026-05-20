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

The interface is plain by design. Richer terminal UI can be added later without changing the core contracts.

## Core Interfaces

### Tool

```ts
type Tool<Input> = {
  name: string;
  description: string;
  access: 'read' | 'write' | 'execute';
  inputSchema: ZodType<Input>;
  isConcurrencySafe?: (input: Input) => boolean;
  run(input: Input, context: ForgeContext): Promise<ToolResult>;
};
```

### Context

```ts
type ForgeContext = {
  cwd: string;
  allowWrite: boolean;
  allowExecute: boolean;
  maxBytes: number;
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

Write and execute tools are blocked unless the caller opts in. The current CLI uses `--yes` for explicit permission. Future versions can replace this with an interactive approval prompt or policy file.

## Provider Model

The current `ask` command uses a deterministic local planner. Future model adapters should live behind a provider interface and receive only curated context plus tool manifests.

Provider adapters should not call tools directly. They should request tool use through the same validated registry used by the CLI.

## Module Layout

```text
src/
├── commands/      CLI command registration
├── core/          context, permissions, workspace scanning
├── providers/     planner and future model adapters
├── tools/         tool contracts and built-in tools
└── ui/            terminal rendering helpers
```

## Safety Principles

- Validate inputs before running a tool.
- Resolve file paths inside the workspace.
- Keep process execution opt-in.
- Prefer small, inspectable outputs.
- Keep dangerous capabilities out of default flows.


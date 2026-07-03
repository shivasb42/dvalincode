# Reference Notes

These notes summarize high-level architecture ideas observed while studying public terminal coding-assistant behavior and documentation. They describe patterns and product behaviors only. They do not include copied source code, prompts, proprietary names, or UI text.

## Useful Ideas To Learn From

1. CLI startup should mostly assemble services, parse flags, and choose an execution mode.
2. Commands and tools should be registered through explicit registries rather than scattered conditionals.
3. Tools need typed input schemas so model output can be validated before execution.
4. Permission checks should be central, predictable, and visible to users.
5. Read-only tools can run with fewer restrictions than write or execute tools.
6. Context gathering should be incremental: scan first, read exact files second.
7. Long-running or risky operations should produce progress and structured results.
8. Terminal UI should be separate from execution logic.
9. Provider/model code should be isolated from local workspace tools.
10. Plugin and skill systems work best when they are additive rather than invasive.

## Features Worth Building

- Workspace scanner
- Tool registry
- Command registry
- Permission policy
- Local task planner
- Provider adapter interface
- Session transcript storage
- Diff-first write tools
- Plugin loading
- Focused validation commands

## Things To Avoid

- Copying implementation details from the reference source.
- Reusing brand-specific command names or product copy.
- Hiding filesystem or process execution behind vague UI language.
- Treating a model response as trusted input.
- Mixing provider-specific logic into core tools.

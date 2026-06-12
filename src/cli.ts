import { Command } from 'commander';
import { registerAskCommand } from './commands/ask.js';
import { registerChatCommand } from './commands/chat.js';
import { registerInitCommand } from './commands/init.js';
import { registerRunToolCommand } from './commands/runTool.js';
import { registerScanCommand } from './commands/scan.js';
import { registerToolsCommand } from './commands/tools.js';
import { createDefaultToolRegistry } from './tools/registry.js';

export function buildProgram(): Command {
  const program = new Command();
  const registry = createDefaultToolRegistry();

  program
    .name('dvalincode')
    .description('Local-first CLI foundation for agentic coding workflows')
    .version('0.4.3');

  registerScanCommand(program);
  registerToolsCommand(program, registry);
  registerRunToolCommand(program, registry);
  registerAskCommand(program, registry);
  registerChatCommand(program, registry);
  registerInitCommand(program);

  return program;
}

export async function runCli(argv: string[]): Promise<void> {
  await buildProgram().parseAsync(argv);
}

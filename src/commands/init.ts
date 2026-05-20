import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Command } from 'commander';

type DvalincodeConfig = {
  provider: string;
  model: string;
  systemPrompt: string;
};

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize .dvalincode.json in the current directory')
    .action(async () => {
      const config: DvalincodeConfig = {
        provider: process.env.DVALINCODE_PROVIDER ?? 'deepseek',
        model: process.env.DVALINCODE_MODEL ?? 'deepseek-chat',
        systemPrompt: 'You are an AI coding assistant.',
      };

      const configPath = path.resolve(process.cwd(), '.dvalincode.json');

      await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

      console.log(`Created ${configPath}`);
    });
}

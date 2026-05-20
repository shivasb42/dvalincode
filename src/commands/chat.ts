import type { Command } from 'commander';
import type { ToolRegistry } from '../tools/registry.js';
import { ProviderManager } from '../providers/manager.js';
import { scanProject } from '../core/projectScanner.js';
import { AgentLoop } from '../agent/loop.js';
import { createForgeContext } from '../core/context.js';
import { createSession, saveSession, loadSession, summarizeSession } from '../sessions/store.js';

export function registerChatCommand(program: Command, registry: ToolRegistry): void {
  program
    .command('chat')
    .description('Chat with an AI coding assistant about the current project')
    .argument('<message...>', 'message to send')
    .option('--session <id>', 'resume an existing session by ID')
    .option('--provider <name>', 'provider name', 'deepseek')
    .option('--model <name>', 'model name')
    .action(async (messageParts: string[], options: { session?: string; provider: string; model?: string }) => {
      const message = messageParts.join(' ');
      const cwd = process.cwd();

      // Load or create session
      let session;
      if (options.session) {
        const loaded = await loadSession(options.session);
        if (!loaded) {
          console.error(`Session not found: ${options.session}`);
          process.exit(1);
        }
        session = loaded;
      } else {
        session = createSession(cwd);
      }

      // Set up provider
      const manager = new ProviderManager().loadFromEnv();
      const provider = manager.get(options.provider);

      // Scan workspace for context
      const summary = await scanProject(cwd);

      // Build available tools description
      const tools = registry.list();
      const toolsDesc = tools
        .map((t) => `- ${t.name}: ${t.description} (access: ${t.access})`)
        .join('\n');

      // Build system prompt — include session summary if available for cross-session memory
      const sessionContext = session.summary
        ? `\nPrevious session summary: ${session.summary}\n`
        : '';

      const systemPrompt = [
        'You are an AI coding assistant. The user is working on the following project:',
        '',
        `Project root: ${summary.root}`,
        `Files: ${summary.fileCount} files`,
        `Extensions: ${summary.topExtensions.map((e) => `${e.extension} (${e.count})`).join(', ')}`,
        `Directories: ${summary.directories.join(', ')}`,
        summary.signals.length > 0 ? `Signals: ${summary.signals.join(', ')}` : '',
        summary.packageManagers.length > 0 ? `Package manager(s): ${summary.packageManagers.join(', ')}` : '',
        sessionContext,
        'Available tools:',
        toolsDesc,
        '',
        'To use a tool, include @tool(name, {...}) in your response.',
        'Use these tools when appropriate to help the user.',
      ]
        .filter(Boolean)
        .join('\n');

      // Create agent loop
      const loop = new AgentLoop({
        provider,
        registry,
        context: createForgeContext({
          cwd,
          // Aggressive: allow execute by default, but user can change via config later
          allowWrite: true,
          allowExecute: true,
        }),
        systemPrompt,
      });

      // Process message through the state machine
      const result = await loop.processMessage(message, session.messages);

      // Update session with new messages
      session.messages = result.messages;
      session.updatedAt = new Date().toISOString();

      // Generate and save session summary for cross-session memory
      session.summary = summarizeSession(session);

      // Save session
      await saveSession(session);

      // Output results
      console.log(result.output);
      console.log('');
      console.log(
        `--- Session: ${session.id} | ${result.iterationsUsed > 1 ? `(${result.iterationsUsed} iterations) ` : ''}Model: ${provider.name} ---`,
      );
      if (session.summary) {
        console.log(`\n📋 Session summary: ${session.summary}`);
      }
    });
}

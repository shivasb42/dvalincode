import type { DvalinContext } from './context.js';
import type { ToolAccess } from '../tools/types.js';

export function assertToolPermission(access: ToolAccess, context: DvalinContext): void {
  if (access === 'write' && !context.allowWrite) {
    throw new Error('This tool can modify files. Re-run with --yes to allow write access.');
  }

  if (access === 'execute' && !context.allowExecute) {
    throw new Error('This tool can execute processes. Re-run with --yes to allow execution.');
  }
}


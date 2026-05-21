import { realpath } from 'node:fs/promises';
import path from 'node:path';

/**
 * Resolve a user-provided path and ensure it stays inside the workspace.
 * Resolves symlinks to prevent symbolic-link-based path traversal.
 */
export async function resolveInsideWorkspace(cwd: string, inputPath: string): Promise<string> {
  const root = await realpath(cwd);
  // Resolve the target relative to the resolved root
  const target = path.resolve(root, inputPath);
  const resolvedTarget = await realpath(target).catch(async () => {
    // If target doesn't exist yet, resolve its parent to check boundaries
    const parent = await realpath(path.dirname(target));
    return path.join(parent, path.basename(target));
  });
  const relative = path.relative(root, resolvedTarget);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path escapes workspace: ${inputPath}`);
  }

  return resolvedTarget;
}

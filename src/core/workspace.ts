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
    // Target doesn't exist yet — walk up the tree to find the nearest existing ancestor.
    let ancestor = path.dirname(target);
    const segments: string[] = [path.basename(target)];
    while (ancestor !== path.dirname(ancestor)) {
      try {
        const resolvedAncestor = await realpath(ancestor);
        return path.join(resolvedAncestor, ...segments);
      } catch {
        segments.unshift(path.basename(ancestor));
        ancestor = path.dirname(ancestor);
      }
    }
    throw new Error(`Cannot resolve path: no existing ancestor found for ${target}`);
  });
  const relative = path.relative(root, resolvedTarget);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path escapes workspace: ${inputPath}`);
  }

  return resolvedTarget;
}

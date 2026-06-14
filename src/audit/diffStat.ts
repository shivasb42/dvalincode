import type { DiffLine } from '../core/diffPreview.js';

/** Count added/removed lines from a generated diff. */
export function countDiffLines(diff: DiffLine[] | undefined): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff ?? []) {
    if (line.type === 'add') added += 1;
    else if (line.type === 'remove') removed += 1;
  }
  return { added, removed };
}

/** Line count of a string (empty string → 0 lines). */
export function lineCount(content: string): number {
  return content.length === 0 ? 0 : content.split('\n').length;
}

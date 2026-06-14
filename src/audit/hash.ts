import { createHash } from 'node:crypto';

/** SHA-256 hex digest of a UTF-8 string or buffer. */
export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Canonical JSON serialization with stable key order so that hashing is
 * deterministic across machines and runs. Object keys are sorted recursively;
 * arrays keep their order. Used to hash audit records for the chain.
 */
export function canonicalJSON(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortValue((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** SHA-256 of file content; null when the content is unavailable. */
export function hashContent(content: string | null | undefined): string | null {
  if (content === null || content === undefined) return null;
  return sha256(content);
}

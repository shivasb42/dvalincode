import { realpath } from 'node:fs/promises';
import path from 'node:path';

let cachedRoots: string[] | undefined;

function normalizeHost(value: string | undefined): string {
  return (value ?? '').replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
}

function hostFromHeader(hostHeader: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  if (!raw) return undefined;
  try {
    return new URL(`http://${raw}`).hostname;
  } catch {
    return raw.split(':')[0];
  }
}

export function isLoopbackHost(hostname: string | undefined): boolean {
  const host = normalizeHost(hostname);
  return host === 'localhost' || host === '::1' || host.startsWith('127.');
}

function explicitAllowedOrigins(): Set<string> {
  return new Set(
    (process.env.DVALINCODE_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean),
  );
}

export function isAllowedRequestOrigin(origin: string | undefined, hostHeader: string | string[] | undefined): boolean {
  if (!origin) return true;

  const explicit = explicitAllowedOrigins();
  if (explicit.has(origin)) return true;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  const requestHost = hostFromHeader(hostHeader);
  const sameHost = normalizeHost(parsed.hostname) === normalizeHost(requestHost);

  return isLoopbackHost(requestHost) && (sameHost || isLoopbackHost(parsed.hostname));
}

function configuredWorkspaceRoots(): string[] {
  const raw = process.env.DVALINCODE_WORKSPACE_ROOTS;
  if (!raw) return [process.cwd()];
  return raw
    .split(path.delimiter)
    .map(root => root.trim())
    .filter(Boolean);
}

async function allowedWorkspaceRoots(): Promise<string[]> {
  if (cachedRoots) return cachedRoots;
  cachedRoots = await Promise.all(configuredWorkspaceRoots().map(root => realpath(path.resolve(root))));
  return cachedRoots;
}

export function pathIsInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export async function resolveAllowedCwd(input?: string): Promise<string> {
  const requested = await realpath(path.resolve(input ?? process.cwd()));
  const roots = await allowedWorkspaceRoots();
  if (!roots.some(root => pathIsInside(root, requested))) {
    throw new Error(`Workspace is not allowed: ${requested}`);
  }
  return requested;
}

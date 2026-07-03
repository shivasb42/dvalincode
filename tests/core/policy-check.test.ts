import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  validatePolicyFile,
  resolveCheckedPolicy,
  resolvePolicy,
  policyHash,
  permissivePolicy,
} from '../../src/core/policy.js';

describe('validatePolicyFile', () => {
  const cleanups: Array<() => void> = [];
  afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
  });

  function tempDir(): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'dvalin-policy-check-'));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    return dir;
  }

  it('accepts a valid policy file', () => {
    const dir = tempDir();
    const file = path.join(dir, 'dvalin.policy.json');
    writeFileSync(file, JSON.stringify({ modes: ['chat'], network: 'endpoint-only' }));

    const result = validatePolicyFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parsed.modes).toEqual(['chat']);
      expect(result.fileHash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('rejects a missing file', () => {
    const result = validatePolicyFile(path.join(tempDir(), 'missing.json'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('missing');
      expect(result.errors[0]).toContain('does not exist');
    }
  });

  it('rejects invalid JSON', () => {
    const dir = tempDir();
    const file = path.join(dir, 'dvalin.policy.json');
    writeFileSync(file, '{ not json');

    const result = validatePolicyFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('json');
  });

  it('rejects schema violations with per-field errors', () => {
    const dir = tempDir();
    const file = path.join(dir, 'dvalin.policy.json');
    writeFileSync(
      file,
      JSON.stringify({ modes: ['agent'], network: 'full', extra: true }),
    );

    const result = validatePolicyFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('schema');
      expect(result.errors.some(e => e.includes('modes'))).toBe(true);
      expect(result.errors.some(e => e.includes('network'))).toBe(true);
      expect(result.errors.some(e => e.includes('extra'))).toBe(true);
    }
  });
});

describe('resolveCheckedPolicy', () => {
  const cleanups: Array<() => void> = [];
  afterEach(() => {
    delete process.env.DVALINCODE_POLICY_FILE;
    while (cleanups.length) cleanups.pop()!();
  });

  function tempDir(): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'dvalin-policy-resolve-'));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    return dir;
  }

  it('resolves a valid repo file with no machine layer', () => {
    process.env.DVALINCODE_POLICY_FILE = path.join(tempDir(), 'absent.json');
    const repoDir = tempDir();
    const file = path.join(repoDir, 'dvalin.policy.json');
    writeFileSync(file, JSON.stringify({ modes: ['chat'], network: 'off' }));

    const result = resolveCheckedPolicy(file, repoDir);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.policy.modes).toEqual(['chat']);
      expect(result.policy.network).toBe('off');
      expect(result.hash).toBe(policyHash(resolvePolicy([{ modes: ['chat'], network: 'off' }])));
    }
  });

  it('narrows with a valid machine layer', () => {
    const machineDir = tempDir();
    const machineFile = path.join(machineDir, 'policy.json');
    writeFileSync(machineFile, JSON.stringify({ modes: ['chat', 'cowork'], network: 'endpoint-only' }));
    process.env.DVALINCODE_POLICY_FILE = machineFile;

    const repoDir = tempDir();
    const file = path.join(repoDir, 'dvalin.policy.json');
    writeFileSync(file, JSON.stringify({ modes: ['chat', 'cowork', 'code'], network: 'on' }));

    const result = resolveCheckedPolicy(file, repoDir);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.policy.modes).toEqual(['chat', 'cowork']);
      expect(result.policy.network).toBe('endpoint-only');
      expect(result.sources.some(s => s.layer === 'machine')).toBe(true);
    }
  });

  it('fails on a malformed checked file', () => {
    process.env.DVALINCODE_POLICY_FILE = path.join(tempDir(), 'absent.json');
    const repoDir = tempDir();
    const file = path.join(repoDir, 'dvalin.policy.json');
    writeFileSync(file, '{ broken');

    const result = resolveCheckedPolicy(file, repoDir);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('json');
  });

  it('skips a malformed machine layer but still resolves the checked file', () => {
    const machineDir = tempDir();
    const machineFile = path.join(machineDir, 'policy.json');
    writeFileSync(machineFile, '{ broken');
    process.env.DVALINCODE_POLICY_FILE = machineFile;

    const repoDir = tempDir();
    const file = path.join(repoDir, 'dvalin.policy.json');
    writeFileSync(file, JSON.stringify({ network: 'off' }));

    const result = resolveCheckedPolicy(file, repoDir);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.machineWarning).toBeTruthy();
      expect(result.policy.network).toBe('off');
      expect(result.policy.modes).toEqual(permissivePolicy().modes);
    }
  });
});

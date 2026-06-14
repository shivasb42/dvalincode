import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AuditSink, verifyChain, readRecords, newRunId, listRuns, latestRun } from '../../src/audit/log.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'dvalin-audit-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('AuditSink + verifyChain', () => {
  it('writes one JSONL record per event with monotonic seq', () => {
    const runId = newRunId();
    const sink = new AuditSink(runId, dir);
    sink.append({ type: 'run_start', task: 't', mode: 'full-auto', provider: 'p', model: 'm', cwd: '/x', gitHead: null });
    sink.append({ type: 'tool_call', tool: 'read_file', argsSummary: '{}', status: 'ok', durationMs: 3 });
    sink.append({ type: 'run_end', status: 'done', iterations: 1 });

    const records = readRecords(runId, dir);
    expect(records).toHaveLength(3);
    expect(records.map(r => r.seq)).toEqual([0, 1, 2]);
    expect(records[0].type).toBe('run_start');
  });

  it('verifies an untampered chain', () => {
    const runId = newRunId();
    const sink = new AuditSink(runId, dir);
    sink.append({ type: 'run_start', task: 't', mode: 'full-auto', provider: 'p', model: 'm', cwd: '/x', gitHead: null });
    sink.append({ type: 'file_write', path: 'a.ts', added: 2, removed: 1, beforeHash: null, afterHash: 'abc' });
    sink.append({ type: 'run_end', status: 'done', iterations: 1 });

    expect(verifyChain(runId, dir)).toEqual({ ok: true });
  });

  it('detects a tampered line and reports its seq', () => {
    const runId = newRunId();
    const sink = new AuditSink(runId, dir);
    sink.append({ type: 'run_start', task: 't', mode: 'full-auto', provider: 'p', model: 'm', cwd: '/x', gitHead: null });
    sink.append({ type: 'shell_exec', command: 'npm test', exitCode: 0, sandbox: 'none' });
    sink.append({ type: 'run_end', status: 'done', iterations: 1 });

    // Hand-edit the middle record's content without recomputing the chain.
    const file = path.join(dir, `run-${runId}.jsonl`);
    const lines = readFileSync(file, 'utf8').trimEnd().split('\n');
    const record = JSON.parse(lines[1]);
    record.command = 'rm -rf /'; // tamper
    lines[1] = JSON.stringify(record);
    writeFileSync(file, lines.join('\n') + '\n');

    const result = verifyChain(runId, dir);
    expect(result.ok).toBe(false);
    // The break surfaces at the record after the tampered one (its prevHash no longer matches).
    expect(result.brokenAtSeq).toBe(2);
  });

  it('detects a deleted line', () => {
    const runId = newRunId();
    const sink = new AuditSink(runId, dir);
    sink.append({ type: 'run_start', task: 't', mode: 'full-auto', provider: 'p', model: 'm', cwd: '/x', gitHead: null });
    sink.append({ type: 'tool_call', tool: 'shell', argsSummary: '{}', status: 'ok', durationMs: 1 });
    sink.append({ type: 'run_end', status: 'done', iterations: 1 });

    const file = path.join(dir, `run-${runId}.jsonl`);
    const lines = readFileSync(file, 'utf8').trimEnd().split('\n');
    lines.splice(1, 1); // drop the middle event
    writeFileSync(file, lines.join('\n') + '\n');

    expect(verifyChain(runId, dir).ok).toBe(false);
  });

  it('lists runs newest-first and resolves the latest', () => {
    const a = '2026-01-01T00-00-00-000Z-aaaaaa';
    const b = '2026-02-01T00-00-00-000Z-bbbbbb';
    new AuditSink(a, dir).append({ type: 'run_end', status: 'done', iterations: 0 });
    new AuditSink(b, dir).append({ type: 'run_end', status: 'done', iterations: 0 });

    expect(listRuns(dir)).toEqual([b, a]);
    expect(latestRun(dir)).toBe(b);
  });
});

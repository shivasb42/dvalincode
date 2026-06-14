import { defineConfig } from 'vitest/config';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Route audit-trail writes to a throwaway temp dir during tests so the suite
// (which exercises AgentLoop.processMessage) never pollutes ~/.dvalincode/audit.
const auditDir = mkdtempSync(path.join(tmpdir(), 'dvalin-test-audit-'));

export default defineConfig({
  test: {
    env: {
      DVALINCODE_AUDIT_DIR: auditDir,
    },
  },
});

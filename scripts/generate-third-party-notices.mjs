#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const lockfiles = [
  { label: 'CLI package', file: 'package-lock.json' },
  { label: 'Web package', file: 'web/package-lock.json' },
];

function readJson(file) {
  return JSON.parse(readFileSync(path.join(root, file), 'utf8'));
}

function packageNameFromPath(pkgPath) {
  return pkgPath.replace(/^node_modules\//, '').replace(/^web\/node_modules\//, '');
}

function normalizeRepository(repository) {
  if (!repository) return '';
  if (typeof repository === 'string') return repository;
  if (typeof repository.url === 'string') return repository.url;
  return '';
}

const byName = new Map();

for (const lock of lockfiles) {
  const data = readJson(lock.file);
  for (const [pkgPath, meta] of Object.entries(data.packages ?? {})) {
    if (!pkgPath.includes('node_modules/')) continue;
    const name = packageNameFromPath(pkgPath);
    const key = `${name}@${meta.version ?? 'unknown'}`;
    const existing = byName.get(key);
    const entry = existing ?? {
      name,
      version: meta.version ?? 'unknown',
      license: meta.license ?? 'UNKNOWN',
      repository: normalizeRepository(meta.repository),
      usedBy: new Set(),
    };
    entry.usedBy.add(lock.label);
    if (!entry.repository) entry.repository = normalizeRepository(meta.repository);
    byName.set(key, entry);
  }
}

const entries = [...byName.values()].sort((a, b) => {
  const name = a.name.localeCompare(b.name);
  return name || a.version.localeCompare(b.version);
});

const counts = new Map();
for (const entry of entries) counts.set(entry.license, (counts.get(entry.license) ?? 0) + 1);

const lines = [
  '# Third-Party Notices',
  '',
  'DvalinCode is released under the MIT license. This file summarizes third-party npm packages referenced by the CLI and web lockfiles so release reviewers can audit dependency provenance.',
  '',
  'Generated with:',
  '',
  '```sh',
  'npm run notices:update',
  '```',
  '',
  'The project does not intentionally vendor third-party source code into this repository. Release binaries and web bundles may include compiled/transformed dependency code from the packages listed below. Consult each package repository or npm package for the complete upstream license text and copyright notices.',
  '',
  '## License Summary',
  '',
  '| License | Packages |',
  '|---|---:|',
  ...[...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([license, count]) => `| ${license} | ${count} |`),
  '',
  '## Packages',
  '',
  '| Package | Version | License | Used by | Repository |',
  '|---|---:|---|---|---|',
  ...entries.map(entry => {
    const repository = entry.repository ? entry.repository.replace(/^git\+/, '') : '';
    return `| \`${entry.name}\` | ${entry.version} | ${entry.license} | ${[...entry.usedBy].sort().join(', ')} | ${repository} |`;
  }),
  '',
];

writeFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), `${lines.join('\n')}\n`);

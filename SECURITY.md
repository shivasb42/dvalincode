# Security Policy

DvalinCode is early-stage software for local developer workflows.

## Reporting

Please open a GitHub issue for non-sensitive security concerns.

For sensitive issues, contact the repository owner privately through GitHub.

## Security Expectations

- Tools must validate input before execution.
- File access should remain inside the active workspace.
- Process execution must require explicit permission.
- Future provider adapters should treat model output as untrusted input.

## Audit Trail

Every agent run emits a tamper-evident, hash-chained JSONL log under
`~/.dvalincode/audit/`. It is **tamper-evident, not tamper-proof**: its value is
post-hoc forensics and accountability, not cryptographic custody against a local
root attacker. See [docs/AUDIT-TRAIL.md](docs/AUDIT-TRAIL.md) for the format and
full threat model. Verify a run's chain with `dvalincode report verify <run-id>`.


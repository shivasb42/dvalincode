# Roadmap

## 0.1 Foundation

- CLI shell
- Project scanner
- Tool registry
- Read tools
- Explicit execution permission
- Local task brief
- Tests and CI

## 0.2 Editing Workflow

- Add write-file and patch tools.
- Show a diff before applying changes.
- Add dry-run mode for write tools.
- Persist simple session records.

## 0.3 Provider Adapters

- Add a provider interface.
- Add one optional model adapter.
- Add structured tool-call planning.
- Add redaction hooks for sensitive files.

## 0.4 Extensions

- Add plugin manifest loading.
- Add project-local command packs.
- Add reusable workflow definitions.
- Add richer terminal rendering.

## 0.5 Security Differentiation

- **[done] Audit trail (P0-1):** tamper-evident hash-chained JSONL per run;
  `dvalincode report --last | <id> | verify`; GUI Run Report card. See
  [AUDIT-TRAIL.md](AUDIT-TRAIL.md).
- Enforced policy engine (P0-2): `dvalin.json` policies intercepted in the tool
  gating layer; `policy_violation` audit events; `THREAT-MODEL.md`.
- Checkpoint / rollback (P1-1): run-level snapshot + one-click rollback.


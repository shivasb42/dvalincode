export type ApprovalMode = 'readonly' | 'auto-edit' | 'full-auto';

export type DvalinContextOptions = {
  cwd?: string;
  allowWrite?: boolean;
  allowExecute?: boolean;
  maxBytes?: number;
  approvalMode?: ApprovalMode;
  requestApproval?: (id: string, toolName: string, input: unknown) => Promise<boolean>;
};

export type DvalinContext = {
  cwd: string;
  allowWrite: boolean;
  allowExecute: boolean;
  maxBytes: number;
  approvalMode: ApprovalMode;
  requestApproval?: (id: string, toolName: string, input: unknown) => Promise<boolean>;
};

export function createDvalinContext(options: DvalinContextOptions = {}): DvalinContext {
  const mode = options.approvalMode;

  let allowWrite: boolean;
  let allowExecute: boolean;
  if (mode === 'readonly') {
    allowWrite = false;
    allowExecute = false;
  } else if (mode === 'auto-edit' || mode === 'full-auto') {
    allowWrite = true;
    allowExecute = true;
  } else {
    allowWrite = options.allowWrite ?? false;
    allowExecute = options.allowExecute ?? false;
  }

  return {
    cwd: options.cwd ?? process.cwd(),
    allowWrite,
    allowExecute,
    maxBytes: options.maxBytes ?? 256_000,
    approvalMode: mode ?? 'full-auto',
    requestApproval: options.requestApproval,
  };
}

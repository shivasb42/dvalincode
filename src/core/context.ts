export type DvalinContextOptions = {
  cwd?: string;
  allowWrite?: boolean;
  allowExecute?: boolean;
  maxBytes?: number;
};

export type DvalinContext = {
  cwd: string;
  allowWrite: boolean;
  allowExecute: boolean;
  maxBytes: number;
};

export function createDvalinContext(options: DvalinContextOptions = {}): DvalinContext {
  return {
    cwd: options.cwd ?? process.cwd(),
    allowWrite: options.allowWrite ?? false,
    allowExecute: options.allowExecute ?? false,
    maxBytes: options.maxBytes ?? 256_000,
  };
}

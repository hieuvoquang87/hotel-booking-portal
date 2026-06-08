export interface LogEntry {
  route: string;
  method: string;
  status: number;
  durationMs: number;
  outcome: 'ok' | 'error';
  error?: unknown;
}

export function logRequest(entry: LogEntry): void {
  const { error, ...rest } = entry;
  const line = JSON.stringify({
    ...rest,
    ...(error !== undefined
      ? { error: error instanceof Error ? { name: error.name, message: error.message } : String(error) }
      : {}),
  });
  if (entry.status >= 500) {
    console.error(line, error instanceof Error ? error.stack : '');
  } else {
    console.log(line);
  }
}

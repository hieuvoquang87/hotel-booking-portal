export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function fail(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

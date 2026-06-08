/** @jest-environment node */
import { logRequest } from '@/app/api/_lib/logger';

describe('logRequest', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs one JSON line with the request fields on success', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logRequest({ route: 'GET /api/locations', method: 'GET', status: 200, durationMs: 3, outcome: 'ok' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(spy.mock.calls[0][0])).toMatchObject({
      route: 'GET /api/locations', method: 'GET', status: 200, outcome: 'ok',
    });
  });

  it('uses console.error and includes the error name/message for 5xx', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logRequest({ route: 'GET /api/x', method: 'GET', status: 500, durationMs: 1, outcome: 'error', error: new Error('boom') });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(spy.mock.calls[0][0]);
    expect(line.outcome).toBe('error');
    expect(line.error).toMatchObject({ name: 'Error', message: 'boom' });
  });
});

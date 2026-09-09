import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, request, setTokens } from './api';

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
    setTokens(null, null);
  });
  afterEach(() => vi.restoreAllMocks());

  it('turns a non-2xx {error} body into an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        async () =>
          new Response(JSON.stringify({ error: { code: 'conflict', message: 'taken' } }), {
            status: 409,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );
    const err = await request('/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'conflict', message: 'taken' });
  });

  it('refreshes once on 401 then retries', async () => {
    localStorage.setItem('alz_refresh', 'rt-1');
    const fetchMock = vi
      .fn()
      // first call: 401
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      // refresh call: new tokens
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'a2', refresh_token: 'r2' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      // retry: ok
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const res = await request<{ ok: boolean }>('/protected');
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem('alz_refresh')).toBe('r2');
  });
});

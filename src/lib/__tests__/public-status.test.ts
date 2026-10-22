import { afterEach, expect, it, vi } from 'vitest';
import { readPublicStatus } from '../public-status';
import backend from '../public-backend.json';
afterEach(() => { vi.unstubAllGlobals(); });
it('reads seven live public endpoints with an anonymous identity and distinguishes zero from failure', async () => {
  const claims = JSON.parse(atob(backend.anonKey.split('.')[1])); expect(claims.role).toBe('anon');
  const fetcher = vi.fn(async (url: string) => {
    if (url.includes('public_editorial_reviews')) return new Response(null, { status: 503 });
    if (url.includes('public_content_status')) return new Response(JSON.stringify('25:100'));
    return new Response(null, { status: 200, headers: { 'content-range': '*/0' } });
  });
  vi.stubGlobal('fetch', fetcher);
  const rows = await readPublicStatus();
  expect(rows.find(row => row.key === 'places')).toEqual({ key: 'places', ok: true, count: 0 });
  expect(rows.find(row => row.key === 'editorials')).toEqual({ key: 'editorials', ok: false });
  expect(rows.find(row => row.key === 'sync')?.ok).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(7);
});

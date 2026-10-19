import backend from './public-backend.json';

export type ContentKey = 'places' | 'editorials' | 'collections' | 'announcements' | 'sync';
export interface PublicCheck { key: ContentKey; ok: boolean; count?: number }
export const PUBLIC_API_ORIGIN = backend.url;
const paths: Record<ContentKey, string> = {
  places: 'places?select=id&is_published=eq.true&limit=1',
  editorials: 'public_editorial_reviews?select=id&limit=1',
  collections: 'explore_collections?select=id&is_published=eq.true&limit=1',
  announcements: 'public_announcements?select=id&or=(city_code.is.null,city_code.eq.abidjan)&limit=1',
  sync: 'rpc/public_content_status',
};
/** Independent live reads, with the same public identity embedded in the APK.
 * No login, cookies, service credential, cached inventory or fallback counts. */
export async function readPublicStatus(): Promise<PublicCheck[]> {
  return Promise.all((Object.keys(paths) as ContentKey[]).map(async key => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(`${PUBLIC_API_ORIGIN}/rest/v1/${paths[key]}`, {
        method: key === 'sync' ? 'GET' : 'HEAD', signal: controller.signal,
        headers: { apikey: backend.anonKey, Authorization: `Bearer ${backend.anonKey}`, Prefer: 'count=exact' },
        credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
      });
      if (!response.ok) throw new Error('unavailable');
      if (key === 'sync') {
        if (typeof await response.json() !== 'string') throw new Error('invalid_revision');
        return { key, ok: true };
      }
      const total = response.headers.get('content-range')?.split('/')[1];
      if (!total || !/^\d+$/.test(total)) throw new Error('invalid_count');
      return { key, ok: true, count: Number(total) };
    } catch { return { key, ok: false }; }
    finally { clearTimeout(timer); }
  }));
}

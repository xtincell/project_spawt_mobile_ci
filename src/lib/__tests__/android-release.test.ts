import { afterEach, describe, expect, it, vi } from 'vitest';
import pinned from '../../../scripts/android-release.json';

function nextRelease(build = pinned.build + 1) {
  const version = '1.1.1';
  const fileName = `spawt-${version}-build${build}.apk`;
  return { schemaVersion: 1, packageName: 'com.upgraders.spawt', version, build, buildDate: '2026-10-18', fileName,
    url: `https://github.com/xtincell/spawt-ci-mobile-v1-mvp/releases/download/local-build-android-2026-10-18-${build}/${fileName}`,
    sha256: 'a'.repeat(64), sourceCommit: 'b'.repeat(40), bytes: 160_000_000 };
}
function availableMirror() {
  const release = nextRelease();
  return vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    if (options?.method === 'HEAD') return new Response(null, { headers: {
      'Content-Type': 'application/vnd.android.package-archive', 'Content-Length': String(release.bytes), 'Accept-Ranges': 'bytes',
    } });
    if (url.endsWith('.sha256')) return new Response(`${release.sha256}  ${release.fileName}\n`);
    return new Response(JSON.stringify(release));
  });
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules(); });

describe('Android publication channel', () => {
  it('accepts a newer verified release and refuses unrelated links or downgrades', async () => {
    const { parseAndroidRelease } = await import('../android-release');
    expect(parseAndroidRelease(nextRelease())?.build).toBe(pinned.build + 1);
    expect(parseAndroidRelease({ ...nextRelease(), url: 'https://example.com/app.apk' })).toBeNull();
    expect(parseAndroidRelease({ ...nextRelease(), packageName: 'another.app' })).toBeNull();
    expect(parseAndroidRelease(nextRelease(pinned.build - 1))).toBeNull();
  });
  it('shares one request between the two download buttons', async () => {
    const fetcher = availableMirror();
    vi.stubGlobal('fetch', fetcher);
    const { refreshAndroidRelease } = await import('../android-release');
    await Promise.all([refreshAndroidRelease(), refreshAndroidRelease()]);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.filter(([url]) => url.includes('latest.json'))).toHaveLength(1);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'omit', redirect: 'error' });
  });
  it('reads new publications in browsers without the static AbortSignal timeout helper', async () => {
    vi.stubGlobal('AbortSignal', class LegacyAbortSignal {});
    const fetcher = availableMirror();
    vi.stubGlobal('fetch', fetcher);
    const { refreshAndroidRelease } = await import('../android-release');
    await refreshAndroidRelease();
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(false);
  });
  it('keeps a usable local fallback if GitHub is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { refreshAndroidRelease, FALLBACK_ANDROID_RELEASE } = await import('../android-release');
    await expect(refreshAndroidRelease()).resolves.toBeUndefined();
    expect(FALLBACK_ANDROID_RELEASE.url).toBe(`/downloads/${pinned.fileName}`);
  });
  it.each(['missing', 'wrong-size', 'wrong-hash', 'html', 'no-resume'])('refuses a mirror with %s delivery', async fault => {
    const release = nextRelease();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('.sha256')) return new Response(`${fault === 'wrong-hash' ? '0'.repeat(64) : release.sha256}  ${release.fileName}\n`);
      return new Response(null, { status: fault === 'missing' ? 404 : 200, headers: {
        'Content-Type': fault === 'html' ? 'text/html' : 'application/vnd.android.package-archive',
        'Content-Length': String(fault === 'wrong-size' ? 100 : release.bytes),
        'Accept-Ranges': fault === 'no-resume' ? 'none' : 'bytes',
      } });
    }));
    const { verifyLocalAndroidRelease } = await import('../android-release');
    await expect(verifyLocalAndroidRelease(release, new AbortController().signal)).resolves.toBeNull();
  });
});

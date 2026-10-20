import { afterEach, describe, expect, it, vi } from 'vitest';
import pinned from '../../../scripts/android-release.json';

function nextRelease(build = pinned.build + 1) {
  const version = '1.1.1';
  const fileName = `spawt-${version}-build${build}.apk`;
  return { schemaVersion: 1, packageName: 'com.upgraders.spawt', version, build, buildDate: '2026-10-18', fileName,
    url: `https://github.com/xtincell/spawt-ci-mobile-v1-mvp/releases/download/local-build-android-2026-10-18-${build}/${fileName}`,
    sha256: 'a'.repeat(64), sourceCommit: 'b'.repeat(40), bytes: 160_000_000 };
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
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => nextRelease() });
    vi.stubGlobal('fetch', fetcher);
    const { refreshAndroidRelease } = await import('../android-release');
    await Promise.all([refreshAndroidRelease(), refreshAndroidRelease()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'omit', redirect: 'error' });
  });
  it('reads new publications in browsers without the static AbortSignal timeout helper', async () => {
    vi.stubGlobal('AbortSignal', class LegacyAbortSignal {});
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => nextRelease() });
    vi.stubGlobal('fetch', fetcher);
    const { refreshAndroidRelease } = await import('../android-release');
    await refreshAndroidRelease();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(false);
  });
  it('keeps a usable local fallback if GitHub is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { refreshAndroidRelease, FALLBACK_ANDROID_RELEASE } = await import('../android-release');
    await expect(refreshAndroidRelease()).resolves.toBeUndefined();
    expect(FALLBACK_ANDROID_RELEASE.url).toBe(`/downloads/${pinned.fileName}`);
  });
});

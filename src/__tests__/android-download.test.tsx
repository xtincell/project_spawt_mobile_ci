import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import pinned from '../../scripts/android-release.json';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules(); });

it('updates both buttons together and preserves the last link after a downgrade or outage', async () => {
  const build = pinned.build + 2;
  const fileName = `spawt-1.1.1-build${build}.apk`;
  const url = `https://github.com/xtincell/spawt-ci-mobile-v1-mvp/releases/download/local-build-android-2026-10-18-${build}/${fileName}`;
  const publication = { ...pinned, schemaVersion: 1, packageName: 'com.upgraders.spawt', buildDate: '2026-10-18', build, fileName, url };
  const localUrl = `/downloads/${fileName}`;
  const fetcher = vi.fn().mockImplementation(async (request: string, options?: RequestInit) => {
    if (options?.method === 'HEAD') return new Response(null, { headers: {
      'Content-Type': 'application/vnd.android.package-archive', 'Content-Length': String(publication.bytes), 'Accept-Ranges': 'bytes',
    } });
    if (request.endsWith('.sha256')) return new Response(`${publication.sha256}  ${fileName}\n`);
    return new Response(JSON.stringify(publication));
  });
  vi.stubGlobal('fetch', fetcher);
  const { default: StoreBadges } = await import('../components/StoreBadges');
  render(<><StoreBadges /><StoreBadges /></>);
  const buttons = () => screen.getAllByRole('link', { name: /Télécharger SPAWT pour Android/ });
  expect(buttons()).toHaveLength(2);
  expect(buttons()[0]).toHaveAttribute('href', `/downloads/${pinned.fileName}`);
  await waitFor(() => buttons().forEach(button => expect(button).toHaveAttribute('href', localUrl)));
  expect(fetcher).toHaveBeenCalledTimes(3);

  let now = Date.now();
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  const olderBuild = build - 1;
  const olderName = `spawt-1.1.1-build${olderBuild}.apk`;
  fetcher.mockImplementation(async () => new Response(JSON.stringify({ ...publication, build: olderBuild, fileName: olderName,
    url: `https://github.com/xtincell/spawt-ci-mobile-v1-mvp/releases/download/local-build-android-2026-10-18-${olderBuild}/${olderName}` })));
  now += 31_000;
  fireEvent(window, new Event('focus'));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4));
  buttons().forEach(button => expect(button).toHaveAttribute('href', localUrl));
  fetcher.mockRejectedValue(new Error('offline'));
  now += 31_000;
  fireEvent(window, new Event('focus'));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(5));
  buttons().forEach(button => expect(button).toHaveAttribute('href', localUrl));
});

it('keeps the bundled local link while a newer release has no matching mirror', async () => {
  const build = pinned.build + 1;
  const fileName = `spawt-${pinned.version}-build${build}.apk`;
  const publication = { ...pinned, schemaVersion: 1, packageName: 'com.upgraders.spawt', buildDate: '2026-10-31', build, fileName,
    url: `https://github.com/xtincell/spawt-ci-mobile-v1-mvp/releases/download/local-build-android-2026-10-31-${build}/${fileName}` };
  const fetcher = vi.fn().mockImplementation(async (url: string) => url.includes('latest.json')
    ? new Response(JSON.stringify(publication)) : new Response(null, { status: 404 }));
  vi.stubGlobal('fetch', fetcher);
  const { default: StoreBadges } = await import('../components/StoreBadges');
  render(<StoreBadges />);
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
  expect(screen.getByRole('link', { name: /Télécharger SPAWT pour Android/ })).toHaveAttribute('href', `/downloads/${pinned.fileName}`);
});

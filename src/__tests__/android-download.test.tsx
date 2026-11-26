import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import pinned from '../../scripts/android-release.json';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules(); });

it('updates both buttons together and preserves the last link after a downgrade or outage', async () => {
  const build = pinned.build + 2;
  const fileName = `spawt-${pinned.version}-build${build}.apk`;
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
  const { default: ApkDownload } = await import('../components/ApkDownload');
  render(<><StoreBadges /><ApkDownload /></>);
  const buttons = () => screen.getAllByRole('link', { name: /Télécharger SPAWT pour Android|Télécharger l’APK/ });
  expect(buttons()).toHaveLength(2);
  expect(buttons()[0]).toHaveAttribute('href', `/downloads/${pinned.fileName}`);
  expect(buttons()[1]).toHaveAttribute('href', `/downloads/${pinned.fileName}`);
  await waitFor(() => buttons().forEach(button => expect(button).toHaveAttribute('href', localUrl)));
  buttons().forEach(button => expect(button).toHaveAttribute('download', fileName));
  expect(fetcher).toHaveBeenCalledTimes(3);

  let now = Date.now();
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  const olderBuild = build - 1;
  const olderName = `spawt-${pinned.version}-build${olderBuild}.apk`;
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

it('retains the pinned direct fallback after a failed transfer and never counts it as received', async () => {
  const { Blob } = await import('node:buffer');
  vi.stubGlobal('Blob', Blob);
  vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(); });
  const localUrl = '/downloads/' + pinned.fileName;
  const fetcher = vi.fn(async (url: string | URL) => {
    if (String(url) !== new URL(localUrl, location.origin).href) throw new Error('manifest unavailable');
    return new Response(Uint8Array.from([80,75,3,4]), {
      headers: { 'content-type': 'application/vnd.android.package-archive' },
    });
  });
  vi.stubGlobal('fetch', fetcher);
  const onDownload = vi.fn(), onReceived = vi.fn();
  const { default: ApkDownload } = await import('../components/ApkDownload');
  render(<ApkDownload onDownload={onDownload} onReceived={onReceived} />);
  const start = screen.getByRole('link', { name: /Télécharger/ });
  expect(start).toHaveAttribute('href', localUrl);
  fireEvent.click(start);
  const fallback = await screen.findByRole('link', { name: 'Télécharger directement' });
  expect(fallback).toHaveAttribute('href', localUrl);
  expect(fallback).toHaveAttribute('download', pinned.fileName);
  // jsdom cannot save files. The public browser check exercises this native link.
  fallback.addEventListener('click', event => event.preventDefault());
  fireEvent.click(fallback);
  expect(onDownload).toHaveBeenCalledTimes(1);
  expect(onReceived).not.toHaveBeenCalled();
  expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith(localUrl))).toHaveLength(1);
});

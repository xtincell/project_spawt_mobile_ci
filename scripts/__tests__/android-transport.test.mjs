// @vitest-environment node
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchVerifiedRelease, renderDownloadRoutes, validateDownloadConfig } from '../fetch-android.mjs';

const current = JSON.parse(readFileSync(new URL('../android-release.json', import.meta.url)));
const history = JSON.parse(readFileSync(new URL('../android-history.json', import.meta.url)));
const folders = [];
const directory = () => { const folder = mkdtempSync(path.join(tmpdir(), 'spawt-apk-test-')); folders.push(folder); return folder; };
const bytes = Buffer.from('PK\x03\x04bounded-download-fixture');
const fixture = { ...current, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
afterEach(() => folders.splice(0).forEach(folder => rmSync(folder, { recursive: true, force: true })));

describe('Android artifact transport', () => {
  it('retains the previous version and preserves exact public archive targets', () => {
    expect(validateDownloadConfig(current, history).map(release => release.build)).toEqual([42, 41]);
    const routes = renderDownloadRoutes(current, history);
    expect(routes).toContain('location = /downloads/spawt-latest.apk {');
    expect(routes).toContain(`return 307 "/downloads/${current.fileName}";`);
    expect(routes).toContain('add_header Cache-Control "no-store" always;');
    for (const release of history.releases.filter(release => !release.retainedLocally)) {
      expect(routes).toContain(`location = /downloads/${release.fileName} {`);
      expect(routes).toContain(`return 307 "${release.url}";`);
      if (release.checksumUrl) expect(routes).toContain(`return 307 "${release.checksumUrl}";`);
    }
    expect(routes).not.toContain('$arg_');
    expect(routes).not.toContain('location ~');
    expect(routes).not.toContain('location = /downloads/spawt-1.1.1-build41.apk');
  });

  it('rejects ambiguous versions and untrusted archive destinations', () => {
    expect(() => validateDownloadConfig(current, { releases: [history.releases[0], history.releases[0]] })).toThrow('Ambiguous');
    expect(() => validateDownloadConfig(current, { releases: [{ ...history.releases[0], url: 'https://example.com/a.apk' }] })).toThrow('origin');
    expect(() => validateDownloadConfig(current, { releases: [{ ...history.releases[0], checksumUrl: current.url }] })).toThrow('origin');
    expect(() => validateDownloadConfig({ ...current, fileName: 'spawt-1.1.1-build35.apk' }, history)).toThrow('manifest');
  });

  it('only publishes a complete verified binary and its checksum', async () => {
    const output = directory();
    const fetcher = vi.fn(async () => new Response(bytes));
    await expect(fetchVerifiedRelease(fixture, output, fetcher)).resolves.toEqual({ fileName: fixture.fileName, bytes: fixture.bytes, sha256: fixture.sha256 });
    expect(readFileSync(path.join(output, fixture.fileName))).toEqual(bytes);
    expect(readFileSync(path.join(output, `${fixture.fileName}.sha256`), 'utf8')).toBe(`${fixture.sha256}  ${fixture.fileName}\n`);
    expect(readdirSync(output).some(name => name.endsWith('.part'))).toBe(false);
  });

  it.each(['truncated', 'oversized', 'changed', 'not-apk', 'interrupted'])('rejects %s bytes without replacing an existing valid file', async fault => {
    const output = directory();
    const destination = path.join(output, fixture.fileName);
    writeFileSync(destination, bytes);
    let body = fault === 'truncated' ? bytes.subarray(0, -1) : fault === 'oversized' ? Buffer.concat([bytes, Buffer.from('x')]) : Buffer.from(bytes);
    let expected = fixture;
    if (fault === 'changed') body[8] ^= 1;
    if (fault === 'not-apk') { body[0] = 0; expected = { ...fixture, sha256: createHash('sha256').update(body).digest('hex') }; }
    const fetcher = async () => fault === 'interrupted'
      ? new Response(new ReadableStream({ pull(controller) { controller.error(new Error('connection interrupted')); } }))
      : new Response(body);
    await expect(fetchVerifiedRelease(expected, output, fetcher)).rejects.toThrow();
    expect(readFileSync(destination)).toEqual(bytes);
    expect(readdirSync(output)).toEqual([fixture.fileName]);
  });

  it('stops before publishing anything when the release does not exist', async () => {
    const output = directory();
    await expect(fetchVerifiedRelease(fixture, output, async () => new Response(null, { status: 404 }))).rejects.toThrow('HTTP 404');
    expect(readdirSync(output)).toEqual([]);
  });
});

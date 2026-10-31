// Exercise real nginx delivery with tiny fixtures, never a substitute for APK verification.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { renderDownloadRoutes, validateDownloadConfig } from './fetch-android.mjs';

const root = process.cwd();
const current = JSON.parse(readFileSync('scripts/android-release.json'));
const history = JSON.parse(readFileSync('scripts/android-history.json'));
const folder = mkdtempSync(path.join(tmpdir(), 'spawt-nginx-download-'));
const name = `spawt-download-test-${process.pid}`;
const data = Buffer.concat([Buffer.from('PK'), Buffer.from(Array.from({ length: 8190 }, (_, index) => index % 251))]);
chmodSync(folder, 0o755);
mkdirSync(path.join(folder, 'downloads'));
for (const release of validateDownloadConfig(current, history)) {
  writeFileSync(path.join(folder, 'downloads', release.fileName), data);
  writeFileSync(path.join(folder, 'downloads', `${release.fileName}.sha256`), `${createHash('sha256').update(data).digest('hex')}  ${release.fileName}\n`);
}
writeFileSync(path.join(folder, 'routes.conf'), renderDownloadRoutes(current, history));
writeFileSync(path.join(folder, 'index.html'), 'SPAWT fixture');
let started = false;
try {
  execFileSync('docker', ['run', '-d', '--rm', '--name', name, '-p', '127.0.0.1::80',
    '-v', `${root}/nginx.conf:/etc/nginx/conf.d/default.conf:ro`,
    '-v', `${root}/security-headers.conf:/etc/nginx/security-headers.conf:ro`,
    '-v', '/tmp/public-share-headers.conf:/etc/nginx/public-share-headers.conf:ro',
    '-v', `${folder}/routes.conf:/etc/nginx/android-downloads.conf:ro`,
    '-v', `${folder}:/usr/share/nginx/html:ro`, 'nginx:alpine'], { stdio: 'pipe' });
  started = true;
  const origin = 'http://' + execFileSync('docker', ['port', name, '80/tcp'], { encoding: 'utf8' }).trim();
  const request = (url, options = {}) => fetch(origin + url, { redirect: 'manual', signal: AbortSignal.timeout(5000), ...options });
  for (let attempt = 0; ; attempt++) {
    try { await request('/'); break; } catch (error) { if (attempt >= 49) throw error; await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  const url = `/downloads/${current.fileName}`;
  const latest = await request('/downloads/spawt-latest.apk?url=https://example.com/other.apk');
  assert.equal(latest.status, 307);
  assert.equal(latest.headers.get('location'), url); // Preserve the external HTTPS scheme behind a TLS proxy.
  assert.equal(latest.headers.get('cache-control'), 'no-store');
  const latestChecksum = await request('/downloads/spawt-latest.apk.sha256');
  assert.equal(latestChecksum.status, 307);
  assert.equal(latestChecksum.headers.get('location'), `${url}.sha256`);
  const head = await request(url, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(Number(head.headers.get('content-length')), data.length);
  assert.equal(head.headers.get('content-type'), 'application/vnd.android.package-archive');
  assert.equal(head.headers.get('content-disposition'), 'attachment');
  assert.equal(head.headers.get('accept-ranges'), 'bytes');
  assert.match(head.headers.get('cache-control'), /immutable/);
  const start = await request(url, { headers: { Range: 'bytes=0-2999' } });
  assert.equal(start.status, 206);
  assert.equal(start.headers.get('content-range'), `bytes 0-2999/${data.length}`);
  const resume = await request(url, { headers: { Range: 'bytes=3000-', 'If-Range': head.headers.get('etag') } });
  assert.equal(resume.status, 206);
  assert.equal(resume.headers.get('content-range'), `bytes 3000-${data.length - 1}/${data.length}`);
  assert.deepEqual(Buffer.concat([Buffer.from(await start.arrayBuffer()), Buffer.from(await resume.arrayBuffer())]), data);
  const stale = await request(url, { headers: { Range: 'bytes=3000-', 'If-Range': '"old-file"' } });
  assert.equal(stale.status, 200);
  assert.deepEqual(Buffer.from(await stale.arrayBuffer()), data);
  for (const release of history.releases) {
    const old = await request(`/downloads/${release.fileName}`, { method: 'HEAD' });
    assert.equal(old.status, release.retainedLocally ? 200 : 307);
    if (!release.retainedLocally) assert.equal(old.headers.get('location'), release.url);
    if (!release.retainedLocally && release.checksumUrl) {
      const checksum = await request(`/downloads/${release.fileName}.sha256`, { method: 'HEAD' });
      assert.equal(checksum.status, 307);
      assert.equal(checksum.headers.get('location'), release.checksumUrl);
    }
  }
  assert.equal((await request('/downloads/spawt-9.9.9-build999.apk?url=https://example.com/other.apk')).status, 404);
  assert.equal((await request('/downloads/spawt-9.9.9-build999.apk.sha256')).status, 404);
  console.log('nginx: exact historical redirects, retained APK, immutable headers, complete resumed bytes and unknown404 passed.');
} finally {
  if (started) execFileSync('docker', ['stop', name], { stdio: 'ignore' });
  rmSync(folder, { recursive: true, force: true });
}

// Preserve versioned download identities. Only verified bytes enter the nginx image.
import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

export function validateRelease(release) {
  if (!release || !/^\d+\.\d+\.\d+$/.test(release.version)
    || !Number.isSafeInteger(release.build) || release.build < 1
    || release.fileName !== `spawt-${release.version}-build${release.build}.apk`
    || !/^[a-f0-9]{64}$/.test(release.sha256)
    || !Number.isSafeInteger(release.bytes) || release.bytes < 2) throw new Error('Invalid release manifest');
  const origin = /^https:\/\/github\.com\/xtincell\/spawt-ci-mobile-v1-mvp\/releases\/download\/local-build-android-\d{4}-\d{2}-\d{2}-(\d+)\/(spawt-\d+\.\d+\.\d+-build\d+\.apk)$/.exec(release.url);
  if (!origin || Number(origin[1]) !== release.build || origin[2] !== release.fileName
    || (release.checksumUrl !== undefined && release.checksumUrl !== `${release.url}.sha256`)) throw new Error('Invalid release download origin');
  return release;
}

export function validateDownloadConfig(current, history) {
  validateRelease(current);
  if (!history || !Array.isArray(history.releases)) throw new Error('Invalid release history');
  const files = new Set([current.fileName]);
  const builds = new Set([current.build]);
  for (const release of history.releases) {
    validateRelease(release);
    if (release.build >= current.build || files.has(release.fileName) || builds.has(release.build)
      || typeof release.retainedLocally !== 'boolean') throw new Error('Ambiguous release history');
    files.add(release.fileName);
    builds.add(release.build);
  }
  return [current, ...history.releases.filter(release => release.retainedLocally)];
}

export function renderDownloadRoutes(current, history) {
  validateDownloadConfig(current, history);
  const route = (name, target, cache) => `location = /downloads/${name} {\n    include /etc/nginx/security-headers.conf;\n${target.startsWith('/') ? '    absolute_redirect off;\n' : ''}    add_header Cache-Control "${cache}" always;\n    return 307 "${target}";\n}\n`;
  const routes = [
    route('spawt-latest.apk', `/downloads/${current.fileName}`, 'no-store'),
    route('spawt-latest.apk.sha256', `/downloads/${current.fileName}.sha256`, 'no-store'),
  ];
  for (const release of history.releases.filter(release => !release.retainedLocally)) {
    routes.push(route(release.fileName, release.url, 'public, max-age=3600'));
    if (release.checksumUrl) routes.push(route(`${release.fileName}.sha256`, release.checksumUrl, 'public, max-age=3600'));
  }
  return '# Generated from the pinned release and the exact public asset allowlist.\n' + routes.join('\n');
}

export async function fetchVerifiedRelease(release, output, fetcher = fetch) {
  validateRelease(release);
  const response = await fetcher(release.url, { credentials: 'omit', signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`Android release HTTP ${response.status}`);
  if (!response.body) throw new Error('Android release body missing');
  mkdirSync(output, { recursive: true });
  const destination = path.join(output, release.fileName);
  const temporary = `${destination}.${randomUUID()}.part`;
  const hash = createHash('sha256');
  let bytes = 0;
  let magic = Buffer.alloc(0);
  const verify = new Transform({ transform(chunk, encoding, callback) {
    bytes += chunk.length;
    if (bytes > release.bytes) return callback(new Error('Android APK size exceeded'));
    if (magic.length < 2) magic = Buffer.concat([magic, chunk.subarray(0, 2 - magic.length)]);
    hash.update(chunk);
    callback(null, chunk);
  } });
  try {
    await pipeline(Readable.fromWeb(response.body), verify, createWriteStream(temporary, { flags: 'wx' }));
    const digest = hash.digest('hex');
    if (bytes !== release.bytes || digest !== release.sha256 || magic.toString() !== 'PK') throw new Error('Android APK verification failed');
    renameSync(temporary, destination);
    writeFileSync(`${destination}.sha256`, `${digest}  ${release.fileName}\n`);
    return { fileName: release.fileName, bytes, sha256: digest };
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
}

async function main() {
  const current = JSON.parse(readFileSync(new URL('./android-release.json', import.meta.url), 'utf8'));
  const history = JSON.parse(readFileSync(new URL('./android-history.json', import.meta.url), 'utf8'));
  const releases = validateDownloadConfig(current, history);
  if (!process.argv.includes('--routes-only')) {
    const output = process.env.ANDROID_OUTPUT_DIR || '/android';
    for (const release of releases) console.log(JSON.stringify(await fetchVerifiedRelease(release, output)));
  }
  writeFileSync(process.env.ANDROID_ROUTES_PATH || '/android-downloads.conf', renderDownloadRoutes(current, history));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

// Immutable Android release transport. Verify the binary before nginx serves it.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const config = JSON.parse(readFileSync(new URL('./android-release.json', import.meta.url), 'utf8'));
if (!/^spawt-\d+\.\d+\.\d+-build\d+\.apk$/.test(config.fileName) || !/^[a-f0-9]{64}$/.test(config.sha256)) throw new Error('Invalid release manifest');
const response = await fetch(config.url, { signal: AbortSignal.timeout(180000) });
if (!response.ok) throw new Error(`Android release HTTP ${response.status}`);
const apk = Buffer.from(await response.arrayBuffer());
const hash = createHash('sha256').update(apk).digest('hex');
if (apk.length !== config.bytes || hash !== config.sha256 || apk.subarray(0,2).toString() !== 'PK') throw new Error('Android APK verification failed');
const output = process.env.ANDROID_OUTPUT_DIR || '/android';
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/${config.fileName}`, apk);
writeFileSync(`${output}/${config.fileName}.sha256`, `${hash}  ${config.fileName}\n`);
console.log(`Verified ${config.fileName}: ${apk.length} bytes`);

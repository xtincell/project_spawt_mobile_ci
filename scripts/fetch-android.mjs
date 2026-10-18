// Immutable Android release transport. Only the APK is published in nginx.
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
const url = 'https://drive.usercontent.google.com/download?id=1csbvW-QFCbMf096d1NDdlVUhlTjBZRAi&export=download&confirm=t';
const compressedSha = '18f647b021c1850db6d1b653c7be8d34e3a68a45f218e5a256c0dc9a89621936';
const apkSha = 'ed1693324b285237276116396102bd76447ea08ed8caf1810eda1a82927267e1';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
if (!response.ok) throw new Error(`Android archive HTTP ${response.status}`);
const compressed = Buffer.from(await response.arrayBuffer());
if (hash(compressed) !== compressedSha) throw new Error('Android transport checksum mismatch');
const apk = gunzipSync(compressed);
if (apk.length !== 162441167 || hash(apk) !== apkSha) throw new Error('Android APK checksum mismatch');
if (apk.subarray(0, 2).toString() !== 'PK') throw new Error('Invalid APK header');
mkdirSync('/android', { recursive: true });
writeFileSync('/android/spawt-1.1.1-build32.apk', apk);
writeFileSync('/android/spawt-1.1.1-build32.apk.sha256', `${apkSha}  spawt-1.1.1-build32.apk\n`);
console.log('SPAWT Android 1.1.1 build 32 verified: 162441167 bytes');

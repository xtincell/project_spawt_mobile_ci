import fs from 'node:fs';
const { anonKey } = JSON.parse(fs.readFileSync(new URL('../src/lib/public-backend.json',import.meta.url)));
if (!/^[A-Za-z0-9_.-]+$/.test(anonKey)) throw new Error('Invalid public API identity');
fs.writeFileSync('/tmp/public-share-headers.conf', `proxy_set_header apikey "${anonKey}";\nproxy_set_header Authorization "Bearer ${anonKey}";\n`);

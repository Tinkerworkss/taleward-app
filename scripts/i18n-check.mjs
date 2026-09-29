// Findet t('…') / tn(n, '…', '…') mit deutschem Text ohne englische Übersetzung in src/i18n/en.ts.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|mjs)$/.test(f) && !p.includes('i18n') && !p.includes('mocks')) files.push(p);
  }
})('src');

const enSrc = readFileSync('src/i18n/en.ts', 'utf8');
const keys = new Set();
for (const m of enSrc.matchAll(/^\s*(['"])((?:\\.|(?!\1).)*)\1\s*:/gm)) keys.add(m[2].replace(/\\(.)/g, '$1'));

const used = new Map();
const re = /\bt[k]?\(\s*(['"])((?:\\.|(?!\1).)*)\1|\btn\([^,]+,\s*(['"])((?:\\.|(?!\3).)*)\3\s*,\s*(['"])((?:\\.|(?!\5).)*)\5/g;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(re)) {
    for (const k of [m[2], m[4], m[6]]) if (k !== undefined) used.set(k.replace(/\\(.)/g, '$1'), f);
  }
}
const missing = [...used].filter(([k]) => !keys.has(k));
const unused = [...keys].filter((k) => !used.has(k));
for (const [k, f] of missing) console.log(`fehlt: ${JSON.stringify(k)}  (${f})`);
if (unused.length) console.log(`\n${unused.length} Einträge in en.ts werden nicht mehr benutzt.`);
console.log(`\n${used.size} Texte, ${missing.length} ohne Übersetzung.`);
process.exit(missing.length ? 1 : 0);

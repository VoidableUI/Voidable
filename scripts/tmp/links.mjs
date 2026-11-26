// Internal link check over docs/dist (run on the build host after docs_build).
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const dist = resolve('docs/dist');
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const files = walk(dist).filter((f) => f.endsWith('.html'));
const ids = new Map();
const idsOf = (f) => {
  if (!ids.has(f)) {
    const s = readFileSync(f, 'utf8');
    ids.set(f, new Set([...s.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])));
  }
  return ids.get(f);
};
const skip = /^(\/storybook\/|\/gallery\/|\/llms|\/install\.sh)/;
const bad = new Map();
for (const f of files) {
  const rel = '/' + f.slice(dist.length + 1).replace(/index\.html$/, '');
  const html = readFileSync(f, 'utf8');
  for (const m of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
    let u = m[1];
    if (!u || /^(https?:|mailto:|tel:|data:|javascript:|#?$)/.test(u)) {
      if (u !== '#' && u.startsWith('#') && u.length > 1 && !idsOf(f).has(decodeURIComponent(u.slice(1)))) bad.set(`${rel} -> ${u}`, 1);
      continue;
    }
    let [path, hash] = u.split('#');
    path = path.split('?')[0];
    if (path === '') {
      if (hash && !idsOf(f).has(hash)) bad.set(`${rel} -> #${hash}`, 1);
      continue;
    }
    if (!path.startsWith('/')) path = resolve('/' + dirname(rel + 'x'), path);
    if (skip.test(path)) continue;
    let target = join(dist, path);
    if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
    else if (!existsSync(target) && existsSync(target + '.html')) target += '.html';
    if (!existsSync(target)) {
      bad.set(`${rel} -> ${u}`, 1);
      continue;
    }
    if (hash && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(hash))) bad.set(`${rel} -> ${u} (no such anchor)`, 1);
  }
}
for (const k of bad.keys()) console.log(k);
console.log(`${files.length} pages, ${bad.size} broken`);
process.exit(bad.size ? 1 : 0);

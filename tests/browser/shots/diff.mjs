// SPDX-License-Identifier: MIT
//
// Compares two capture directories image by image.
//
//   compareDirs(baseDir, headDir, outDir) -> items
//
// An image that is byte-identical in both is `same` without decoding it. One
// that differs is decoded and compared pixel by pixel (pixelmatch, with a small
// anti-aliasing tolerance), and written as a diff image: the head, faded, with
// every changed pixel in red. A size difference counts as change (the missing
// area is changed pixels). Images in only one side are `added` or `removed`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export const TOLERANCE = 0.1;

const read = (file) => PNG.sync.read(readFileSync(file));

/** Both images on a canvas the size of the larger; the extra area is transparent, so it counts as changed. */
function pad(img, width, height) {
  if (img.width === width && img.height === height) return img;
  const out = new PNG({ width, height });
  PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
  return out;
}

export function diffImages(baseFile, headFile, diffFile) {
  const a = read(baseFile);
  const b = read(headFile);
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const A = pad(a, width, height);
  const B = pad(b, width, height);
  const diff = new PNG({ width, height });
  const changed = pixelmatch(A.data, B.data, diff.data, width, height, { threshold: TOLERANCE, alpha: 0.25, diffColor: [255, 45, 85], aaColor: [255, 200, 0] });
  if (!changed) return { changed: 0, ratio: 0, size: { base: [a.width, a.height], head: [b.width, b.height] } };
  // The box around the changed pixels: the gallery crops its thumbnail to it.
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  const d = diff.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (d[i] === 255 && d[i + 1] === 45 && d[i + 2] === 85) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  mkdirSync(dirname(diffFile), { recursive: true });
  writeFileSync(diffFile, PNG.sync.write(diff));
  return {
    changed,
    ratio: changed / (width * height),
    bbox: x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 },
    size: { base: [a.width, a.height], head: [b.width, b.height] },
  };
}

const key = (s) => `${s.page}/${s.look}.${s.scheme}.${s.width}`;

/**
 * @returns {Array<{page,look,scheme,width,status:'same'|'changed'|'added'|'removed',changed?:number,ratio?:number,bbox?:object,size?:object,base?:string,head?:string,diff?:string}>}
 * Image paths are relative to the capture directories; `diff` is relative to outDir.
 */
export function compareDirs(baseDir, headDir, outDir) {
  const base = JSON.parse(readFileSync(join(baseDir, 'manifest.json'), 'utf8'));
  const head = JSON.parse(readFileSync(join(headDir, 'manifest.json'), 'utf8'));
  const baseMap = new Map(base.shots.map((s) => [key(s), s]));
  const headMap = new Map(head.shots.map((s) => [key(s), s]));
  const items = [];
  for (const [k, h] of headMap) {
    const b = baseMap.get(k);
    const item = { page: h.page, look: h.look, scheme: h.scheme, width: h.width, head: h.file };
    if (!b) {
      items.push({ ...item, status: 'added' });
      continue;
    }
    item.base = b.file;
    const bf = join(baseDir, b.file);
    const hf = join(headDir, h.file);
    if (readFileSync(bf).equals(readFileSync(hf))) {
      items.push({ ...item, status: 'same' });
      continue;
    }
    const diffRel = `${k}.png`;
    const r = diffImages(bf, hf, join(outDir, 'diff', diffRel));
    items.push(r.changed ? { ...item, status: 'changed', ...r, diff: `diff/${diffRel}` } : { ...item, status: 'same', note: 'differs below the tolerance' });
  }
  for (const [k, b] of baseMap) if (!headMap.has(k)) items.push({ page: b.page, look: b.look, scheme: b.scheme, width: b.width, base: b.file, status: 'removed' });
  return { items, base, head };
}

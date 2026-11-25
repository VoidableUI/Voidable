// SPDX-License-Identifier: MIT
//
// Compares two capture directories image by image.
//
//   compareDirs(baseDir, headDir, outDir) -> { items, base, head }
//
// An image that is byte-identical in both is `same` without decoding it. One
// that differs is decoded (sharp), the rows that differ are found by comparing
// bytes, and only those rows go through pixelmatch (with a small anti-aliasing
// tolerance). The diff image is the head, faded, with every changed pixel in red.
// A size difference counts as change (the missing area is changed pixels).
// Images in only one side are `added` or `removed`.
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';

export const TOLERANCE = 0.1;

async function decode(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** The image on a transparent canvas of the given size. */
function pad(img, width, height) {
  if (img.width === width && img.height === height) return img.data;
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < img.height; y++) img.data.copy(out, y * width * 4, y * img.width * 4, (y + 1) * img.width * 4);
  return out;
}

export async function diffImages(baseFile, headFile, diffFile) {
  const [a, b] = await Promise.all([decode(baseFile), decode(headFile)]);
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const A = pad(a, width, height);
  const B = pad(b, width, height);
  const stride = width * 4;
  let r0 = -1;
  let r1 = -1;
  for (let y = 0; y < height; y++) {
    if (A.compare(B, y * stride, (y + 1) * stride, y * stride, (y + 1) * stride) !== 0) {
      if (r0 < 0) r0 = y;
      r1 = y;
    }
  }
  const size = { base: [a.width, a.height], head: [b.width, b.height] };
  if (r0 < 0) return { changed: 0, ratio: 0, size };

  // The head, faded toward white, everywhere; pixelmatch draws the region that differs.
  const out = Buffer.allocUnsafe(width * height * 4);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = 255 - (255 - B[i]) * 0.25;
    out[i + 1] = 255 - (255 - B[i + 1]) * 0.25;
    out[i + 2] = 255 - (255 - B[i + 2]) * 0.25;
    out[i + 3] = 255;
  }
  const rows = r1 - r0 + 1;
  const region = out.subarray(r0 * stride, (r1 + 1) * stride);
  const changed = pixelmatch(A.subarray(r0 * stride, (r1 + 1) * stride), B.subarray(r0 * stride, (r1 + 1) * stride), region, width, rows, {
    threshold: TOLERANCE,
    alpha: 0.25,
    diffColor: [255, 45, 85],
    aaColor: [255, 200, 0],
  });
  if (!changed) return { changed: 0, ratio: 0, size };
  // The box around the changed pixels: the gallery crops its thumbnail to it.
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = r0; y <= r1; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (out[i] === 255 && out[i + 1] === 45 && out[i + 2] === 85) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  mkdirSync(dirname(diffFile), { recursive: true });
  await sharp(out, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 3 }).toFile(diffFile);
  return { changed, ratio: changed / (width * height), bbox: x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }, size };
}

const key = (s) => `${s.page}/${s.look}.${s.scheme}.${s.width}`;

/**
 * Image paths are relative to the capture directories; `diff` is relative to outDir.
 * Items: { page, look, scheme, width, status: same|changed|added|removed, ... }
 */
export async function compareDirs(baseDir, headDir, outDir, concurrency = 6) {
  const base = JSON.parse(readFileSync(join(baseDir, 'manifest.json'), 'utf8'));
  const head = JSON.parse(readFileSync(join(headDir, 'manifest.json'), 'utf8'));
  const baseMap = new Map(base.shots.map((s) => [key(s), s]));
  const headMap = new Map(head.shots.map((s) => [key(s), s]));
  const items = [];
  const todo = [];
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
    todo.push({ item, k, bf, hf });
  }
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const { item, k, bf, hf } = todo[next++];
      const r = await diffImages(bf, hf, join(outDir, 'diff', `${k}.png`));
      items.push(r.changed ? { ...item, status: 'changed', ...r, diff: `diff/${k}.png` } : { ...item, status: 'same', note: 'differs below the tolerance' });
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  for (const [k, b] of baseMap) if (!headMap.has(k)) items.push({ page: b.page, look: b.look, scheme: b.scheme, width: b.width, base: b.file, status: 'removed' });
  return { items, base, head };
}

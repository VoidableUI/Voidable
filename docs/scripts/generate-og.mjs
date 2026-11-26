// Rasterise docs/scripts/og-image.svg to docs/public/og.png (1200x630).
// Run with: mise run docs_og
// The PNG is committed; rerun only when the SVG changes.
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const svg = await readFile(new URL('./og-image.svg', import.meta.url));
const png = await sharp(svg, { density: 96 }).resize(1200, 630).png({ compressionLevel: 9 }).toBuffer();
await writeFile(new URL('../public/og.png', import.meta.url), png);
console.log(`wrote docs/public/og.png (${png.length} bytes)`);

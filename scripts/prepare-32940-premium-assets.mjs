#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Keep source assets outside public/32940. The legacy growth-site generator
// intentionally rebuilds that directory from scratch on every release.
const outDir = path.join(repoRoot, 'scripts', 'assets', '32940-premium');
const sources = [
  { name: 'suntree-vet', url: 'https://images.unsplash.com/photo-1770836037275-38b44e4b101f?auto=format&fit=crop&w=2200&q=92', credit: 'Alexander Mass / Unsplash', sourcePage: 'https://unsplash.com/photos/veterinarian-gives-injection-to-a-small-dog-fQeLC7WlNm8' },
  { name: 'rubio-vet', url: 'https://images.unsplash.com/photo-1770836037183-e0b4471fe2c0?auto=format&fit=crop&w=2200&q=92', credit: 'Alexander Mass / Unsplash', sourcePage: 'https://unsplash.com/photos/veterinarian-performing-ultrasound-on-a-dog-q-1iFFFN6ls' },
  { name: 'pool-water', url: 'https://images.unsplash.com/photo-1517374985980-5958a4b6677c?auto=format&fit=crop&w=2200&q=92', credit: 'Nathan Dumlao / Unsplash', sourcePage: 'https://unsplash.com/photos/swimming-pool-during-daytime-in-aerial-view-photography-yI46RxiFeQw' },
  { name: 'beachside-aerial', url: 'https://images.unsplash.com/photo-1502903111624-e54eb7c34ee4?auto=format&fit=crop&w=2200&q=92', credit: 'Josh G / Unsplash', sourcePage: 'https://unsplash.com/photos/aerial-photography-of-beach-and-swimming-pool-_c2rzUdpsso' },
];
const widths = [640, 960, 1440];

await fs.mkdir(outDir, { recursive: true });
for (const source of sources) {
  const response = await fetch(source.url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${source.name} returned ${response.status}`);
  const input = Buffer.from(await response.arrayBuffer());
  for (const width of widths) {
    const height = Math.round(width * 1100 / 1440);
    const pipeline = sharp(input).resize(width, height, { fit: 'cover', position: 'attention' });
    await pipeline.clone().avif({ quality: 54, effort: 6 }).toFile(path.join(outDir, `${source.name}-${width}.avif`));
    await pipeline.clone().webp({ quality: 80, effort: 5 }).toFile(path.join(outDir, `${source.name}-${width}.webp`));
    await pipeline.clone().jpeg({ quality: 84, progressive: true, mozjpeg: true }).toFile(path.join(outDir, `${source.name}-${width}.jpg`));
  }
}

await fs.writeFile(path.join(outDir, 'image-sources.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), license: 'Unsplash License', sources }, null, 2)}\n`, 'utf8');
console.log(`Prepared ${sources.length * widths.length * 3} responsive proposal images.`);

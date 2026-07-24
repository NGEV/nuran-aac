import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(source, '..', 'nuran-ios', 'www');

// The web folder is canonical for shared runtime code. Native app icons and native.js
// are intentionally not in this list: Xcode owns the icons, and native.js is retained
// only as an unused compatibility artifact for older native packages.
const sharedFiles = [
  'LICENSE',
  'app.js',
  'db.js',
  'index.html',
  'lucide.js',
  'manifest.webmanifest',
  'nuran-arasaac.js',
  'nuran-real-photos.js',
  'ARASAAC_CREDITS.md',
  'PHOTO_CREDITS.md',
  'nuran-user-manual.pdf',
  'seed.js',
  'speech.js',
  'styles.css',
  'visual-system.css',
  'version.js',
  'sw.js',
];
const sharedDirectories = ['arasaac', 'core', 'features', 'fonts', 'real-photos'];
const retiredFiles = ['nuran-friends.js'];

async function walk(relativeDirectory) {
  const directory = path.join(source, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(relativePath));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

async function digest(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

await mkdir(target, { recursive: true });
await Promise.all(retiredFiles.map(relativePath => rm(path.join(target, relativePath), { force: true })));
const files = [
  ...sharedFiles,
  ...(await Promise.all(sharedDirectories.map(walk))).flat(),
].sort();

for (const relativePath of files) {
  const from = path.join(source, relativePath);
  const to = path.join(target, relativePath);
  if (!(await stat(from)).isFile()) throw new Error(`Expected a file: ${relativePath}`);
  await mkdir(path.dirname(to), { recursive: true });
  await copyFile(from, to);
}

const mismatches = [];
for (const relativePath of files) {
  const [sourceHash, targetHash] = await Promise.all([
    digest(path.join(source, relativePath)),
    digest(path.join(target, relativePath)),
  ]);
  if (sourceHash !== targetHash) mismatches.push(relativePath);
}

if (mismatches.length) {
  throw new Error(`iOS checksum verification failed: ${mismatches.join(', ')}`);
}

console.log(`Synced and checksum-verified ${files.length} shared files into nuran-ios/www.`);

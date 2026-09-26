// Filet de sécurité : vérifie qu'aucune image du site ne contient de
// coordonnées GPS dans ses métadonnées (EXIF ou XMP).
// Lancé automatiquement à chaque construction sur GitHub.
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOTS = ['src', 'public'];
const EXTENSIONS = /\.(jpe?g|png|webp|tiff?|avif|heic)$/i;
const GPS_IFD_TAG = 0x8825;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (EXTENSIONS.test(entry.name)) yield path;
  }
}

// Cherche l'étiquette « GPSInfo » dans le premier répertoire EXIF (IFD0).
function exifHasGps(exif) {
  let tiff = exif;
  if (tiff.subarray(0, 6).toString('latin1') === 'Exif\0\0') tiff = tiff.subarray(6);
  if (tiff.length < 8) return false;
  const le = tiff.subarray(0, 2).toString('latin1') === 'II';
  const u16 = (o) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  const ifd = u32(4);
  if (ifd + 2 > tiff.length) return false;
  const count = u16(ifd);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > tiff.length) break;
    if (u16(entry) === GPS_IFD_TAG) return true;
  }
  return false;
}

const problems = [];
for (const root of ROOTS) {
  for await (const file of walk(root)) {
    const meta = await sharp(file).metadata();
    const gps =
      (meta.exif && exifHasGps(meta.exif)) ||
      (meta.xmp && /GPS(Latitude|Longitude)/.test(meta.xmp.toString('utf8')));
    if (gps) problems.push(file);
  }
}

if (problems.length > 0) {
  console.error('Images contenant des coordonnées GPS :');
  for (const file of problems) console.error(`  - ${file}`);
  console.error('\nVoir docs/publier-une-actualite.md, section « Photos ».');
  process.exit(1);
}
console.log('Aucune coordonnée GPS dans les images.');

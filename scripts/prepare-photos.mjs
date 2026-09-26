// Prépare une photo avant de l'ajouter au dépôt :
//  - redimensionne à 2400 px maximum (largement suffisant pour le web),
//  - applique l'orientation EXIF puis SUPPRIME toutes les métadonnées
//    (coordonnées GPS, modèle d'appareil, date…).
// Usage : node scripts/prepare-photos.mjs <source.jpg> <destination.jpg> [...]
import sharp from 'sharp';

const args = process.argv.slice(2);
if (args.length === 0 || args.length % 2 !== 0) {
  console.error('Usage : node scripts/prepare-photos.mjs <source> <destination> [...]');
  process.exit(1);
}

for (let i = 0; i < args.length; i += 2) {
  const [src, dest] = [args[i], args[i + 1]];
  const meta = await sharp(src).metadata();
  const gps = meta.exif ? meta.exif.includes(Buffer.from('GPS')) : false;
  await sharp(src)
    .rotate()
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(dest);
  const out = await sharp(dest).metadata();
  console.log(`${dest} : ${out.width}×${out.height}, EXIF source=${Boolean(meta.exif)}${gps ? ' (GPS présent)' : ''}, EXIF sortie=${Boolean(out.exif)}`);
}

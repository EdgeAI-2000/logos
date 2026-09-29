import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../eais-lab/', import.meta.url));
const originals = join(root, 'originals');
const web = join(root, 'web');
mkdirSync(join(web, 'expressions'), { recursive: true });

// Only resize/encode the supplied artwork. Framing is non-destructive SVG.
for (const [name, size] of [['mascot', '640x'], ['wordmark', '1000x'], ['badge', '384x'], ['mascot-expressions', '1536x']]) {
  execFileSync('convert', [join(originals, name + '.png'), '-resize', size,
    '-quality', '88', join(web, name + '.webp')]);
}
execFileSync('convert', [join(originals, 'badge.png'), '-resize', '180x180',
  '-background', 'none', '-gravity', 'center', '-extent', '180x180', join(web, 'apple-touch-icon.png')]);

const names = [
  ['hello', 'excited', 'coding', 'approve', 'heart'],
  ['thinking', 'idea', 'confident', 'laughing', 'sleeping'],
  ['running', 'reading', 'celebrating', 'presenting', 'sad'],
  ['peeking', 'wink', 'coffee', 'waving', 'back'],
];
const columns = [[16, 294], [310, 306], [616, 294], [910, 296], [1206, 314]];
const rows = [[0, 282], [282, 258], [540, 236], [776, 248]];
const manifest = {};
const sheet = readFileSync(join(web, 'mascot-expressions.webp')).toString('base64');
const svg = (viewBox, width, height, data) => {
  const [x, y, w, h] = viewBox.split(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}"><defs><clipPath id="crop"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs><image width="${width}" height="${height}" clip-path="url(#crop)" href="data:image/webp;base64,${data}"/></svg>\n`;
};
for (let row = 0; row < names.length; row++) {
  for (let col = 0; col < names[row].length; col++) {
    const name = names[row][col];
    // The peeking ear begins just above the regular fourth-row boundary.
    const bounds = name === 'running' ? [16, 540, 294, 230]
      : name === 'peeking' ? [16, 770, 294, 254]
      : [columns[col][0], rows[row][0], columns[col][1], rows[row][1]];
    const viewBox = bounds.join(' ');
    manifest[name] = { viewBox };
    // Self-contained raster-backed SVGs, usable directly in <img> elements.
    writeFileSync(join(web, 'expressions', name + '.svg'), svg(viewBox, 1536, 1024, sheet));
  }
}
writeFileSync(join(web, 'expressions.json'), JSON.stringify(manifest, null, 2) + '\n');
const wordmark = readFileSync(join(web, 'wordmark.webp')).toString('base64');
writeFileSync(join(web, 'wordmark.svg'), svg('40 110 2100 470', 2172, 724, wordmark));
const mascot = readFileSync(join(web, 'mascot.webp')).toString('base64');
writeFileSync(join(web, 'favicon.svg'), svg('135 40 960 820', 1231, 1277, mascot));
console.log('Built brand assets and 20 expressions in ' + web);

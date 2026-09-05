const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(__dirname, '../..');
const destination = path.resolve(__dirname, '..');
const files = [
  ...['content.ts', 'engine.ts', 'hooks.ts', 'progress.ts', 'catalog.ts', 'review.ts', 'round.ts', 'session.ts', 'editor.ts', '__check__.ts'].map((file) => `lib/games/${file}`),
  'docs/juegos-biblicos.md',
  'docs/juegos-cambios.md',
];
const check = process.argv.includes('--check');

for (const file of files) {
  const original = fs.readFileSync(path.join(source, file), 'utf8');
  // Las pruebas de Node quedan fuera del programa TypeScript de React Native.
  const target = path.join(destination, file.replace(/__check__\.ts$/, '__check__.cts'));
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== original) {
      throw new Error(`Juegos desactualizados: ${file}. Ejecuta npm run sync:games en mobile.`);
    }
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, original);
  }
}
console.log(check ? 'Reglas, contenido y guía de juegos idénticos en web y móvil.' : 'Reglas, contenido y guía de juegos copiados desde web.');

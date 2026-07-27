/*
 * Empaqueta el editor de notas (Tiptap + cinta) en un solo script para el
 * WebView.
 *
 *   node scripts/build_editor_bundle.mjs
 *
 * Metro no empaqueta código para el WebView: lo que se le entrega es una
 * cadena de texto dentro del HTML. Por eso el editor se compila aparte con
 * esbuild y el resultado se guarda en `lib/tiptap/bundle.generated.ts`, que sí
 * es un módulo normal del proyecto.
 *
 * El archivo generado se versiona a propósito: así una instalación limpia o una
 * compilación en EAS no dependen de que este script se haya ejecutado. Hay que
 * volver a lanzarlo (y commitear el resultado) al tocar cualquier archivo de
 * `lib/tiptap/`.
 */
import { build } from 'esbuild'
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const result = await build({
  entryPoints: [resolve(root, 'lib/tiptap/editor/entry.ts')],
  bundle: true,
  minify: true,
  format: 'iife',
  // WebView de Android 8 en adelante, que es el mínimo de la app.
  target: ['es2018'],
  legalComments: 'none',
  write: false,
  logLevel: 'warning',
})

// Un `</script` dentro del código minificado cerraría la etiqueta antes de
// tiempo al inyectarlo en el HTML del WebView.
const code = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')
const header = `/**
 * ARCHIVO GENERADO — no editar a mano.
 *
 * Lo produce \`node scripts/build_editor_bundle.mjs\` a partir de
 * \`lib/tiptap/editor/entry.ts\`. Es el editor de notas completo (Tiptap, la
 * cinta y el puente con React Native) listo para inyectarse en el WebView.
 */

export const NOTE_EDITOR_BUNDLE = ${JSON.stringify(code)}
`

writeFileSync(resolve(root, 'lib/tiptap/bundle.generated.ts'), header)
console.log(`  editor empaquetado: ${(code.length / 1024).toFixed(0)} kB sin comprimir`)

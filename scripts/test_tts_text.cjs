/*
 * Limpieza del texto bíblico antes de enviarlo a Kokoro / Speech.
 *
 *   node scripts/test_tts_text.cjs
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const esbuild = require('esbuild')

const outfile = path.join(os.tmpdir(), 'biblia-ttsText.cjs')
esbuild.buildSync({
  entryPoints: [path.join(__dirname, '../lib/ttsText.ts')],
  outfile,
  format: 'cjs',
  platform: 'node',
  bundle: true,
})
const { cleanTtsText, buildTtsAudioUrl } = require(outfile)
fs.unlinkSync(outfile)

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    failed += 1
    console.error('FAIL', msg)
  }
}

assert(cleanTtsText('En el principio[1] creó Dios') === 'En el principio creó Dios', 'quita marcas [n]')
assert(cleanTtsText('  hola   mundo  ') === 'hola mundo', 'colapsa espacios')
assert(cleanTtsText('') === '', 'vacío se queda vacío')
assert(cleanTtsText('Dios {H430} creó') === 'Dios creó', 'quita códigos Strong {Hnnn}')

const url = buildTtsAudioUrl('https://biblia.example', {
  text: 'Hola mundo',
  voice: 'em_alex',
  speed: 1.25,
})
assert(url.startsWith('https://biblia.example/api/tts?'), 'url base TTS')
assert(url.includes('voice=em_alex'), 'incluye voz')
assert(url.includes('speed=1.25'), 'incluye velocidad')
assert(url.includes('text=Hola'), 'incluye texto')

if (failed) {
  console.error(`${failed} aserciones fallaron`)
  process.exit(1)
}
console.log('ok ttsText')

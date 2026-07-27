#!/usr/bin/env node
/*
 * Compara la configuración de Expo con la carpeta nativa `android/` ya
 * generada.
 *
 *   node scripts/check_native_config.cjs
 *
 * Por qué existe: los APK locales se compilan con gradle sobre `android/`, que
 * NO se regenera en cada build (`expo prebuild` es manual). Así que esa carpeta
 * puede quedarse atrás respecto a app.json / app.config.ts sin que nada avise,
 * y el resultado es un APK que dice una cosa y un bundle que dice otra.
 *
 * Ya ha pasado tres veces:
 *  - versionCode: app.json en 37 y build.gradle en 38, subido a mano.
 *  - esquema/paquete: el bundle se creía la variante interna y el manifiesto
 *    registraba la pública, lo que congelaba el OAuth de Google tras elegir
 *    cuenta.
 *  - wrapper de gradle: un prebuild lo devolvió a 9.3.1 y el build ni arrancó
 *    (`JvmVendorSpec IBM_SEMERU`), con el ajuste a 8.14.3 perdido sin avisar.
 *
 * Versión y versionCode son errores (rompen las subidas a Play). El paquete y
 * el esquema salen como avisos, porque dependen de la variante con la que se
 * compile y de si ya se ha hecho prebuild con ella.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const APP_JSON = path.join(ROOT, 'app.json')
const APP_CONFIG = path.join(ROOT, 'app.config.ts')
const GRADLE = path.join(ROOT, 'android/app/build.gradle')
const MANIFEST = path.join(ROOT, 'android/app/src/main/AndroidManifest.xml')
const WRAPPER = path.join(ROOT, 'android/gradle/wrapper/gradle-wrapper.properties')
const GRADLE_PROPS = path.join(ROOT, 'android/gradle.properties')

// Gradle 9.x no arranca con este proyecto: el resolutor de toolchains pide
// vendors que el JDK no expone. android/ no está en el repo, así que cada
// prebuild devuelve la versión por omisión de Expo y hay que volver a fijarla.
const GRADLE_OK = '8.14.3'

const errors = []
const warnings = []

function fail(msg, hint) {
  errors.push(hint ? `${msg}\n   → ${hint}` : msg)
}
function warn(msg, hint) {
  warnings.push(hint ? `${msg}\n   → ${hint}` : msg)
}

const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8')).expo

if (!fs.existsSync(GRADLE)) {
  console.log('No hay carpeta android/ generada: nada que comparar.')
  console.log('Genérala con:  npm run prebuild:android')
  process.exit(0)
}

const gradle = fs.readFileSync(GRADLE, 'utf8')
const pick = (re, what) => {
  const m = gradle.match(re)
  if (!m) fail(`No se pudo leer ${what} de android/app/build.gradle`)
  return m ? m[1] : null
}

const nativeVersionCode = pick(/versionCode\s+(\d+)/, 'versionCode')
const nativeVersionName = pick(/versionName\s+"([^"]+)"/, 'versionName')
const nativeApplicationId = pick(/applicationId\s+'([^']+)'/, 'applicationId')

// — Versión y versionCode: tienen que cuadrar —

if (nativeVersionCode !== null) {
  const expected = app.android?.versionCode
  if (expected === undefined) {
    fail(
      'app.json no declara expo.android.versionCode',
      `android/ usa ${nativeVersionCode}; añádelo a app.json para que un prebuild no lo pierda`,
    )
  } else if (String(expected) !== nativeVersionCode) {
    fail(
      `versionCode desfasado: app.json dice ${expected} y android/ dice ${nativeVersionCode}`,
      'manda el nativo al compilar con gradle, así que un prebuild lo cambiaría bajo tus pies. ' +
        'Iguala app.json al valor que de verdad publicas.',
    )
  }
}

if (nativeVersionName !== null && app.version !== nativeVersionName) {
  fail(
    `versión desfasada: app.json dice ${app.version} y android/ dice ${nativeVersionName}`,
    'el nombre de versión que ve el usuario sale del nativo',
  )
}

// — Wrapper de gradle: el build ni arranca si vuelve a 9.x —

let wrapperVersion = null
if (fs.existsSync(WRAPPER)) {
  const wrapper = fs.readFileSync(WRAPPER, 'utf8')
  const m = wrapper.match(/gradle-([\d.]+)-bin\.zip/)
  wrapperVersion = m ? m[1] : null
  if (wrapperVersion && wrapperVersion !== GRADLE_OK) {
    fail(
      `gradle ${wrapperVersion} en el wrapper; este proyecto compila con ${GRADLE_OK}`,
      `con 9.x el build falla al configurar («JvmVendorSpec IBM_SEMERU»). Arréglalo con: ` +
        `sed -i 's/gradle-${wrapperVersion}-bin/gradle-${GRADLE_OK}-bin/' android/gradle/wrapper/gradle-wrapper.properties`,
    )
  }
}

if (fs.existsSync(GRADLE_PROPS)) {
  const props = fs.readFileSync(GRADLE_PROPS, 'utf8')
  if (!/org\.gradle\.jvm\.toolchain\.foojay\.enabled\s*=\s*false/.test(props)) {
    fail(
      'falta org.gradle.jvm.toolchain.foojay.enabled=false en android/gradle.properties',
      'sin eso el resolutor de toolchains busca un JDK por vendor y rompe la configuración del build',
    )
  }
}

// — Paquete y esquema: dependen de la variante —

const variant = process.env.APP_VARIANT ?? process.env.EXPO_PUBLIC_APP_VARIANT ?? null

function expectedFromAppConfig() {
  if (!fs.existsSync(APP_CONFIG)) return null
  for (const id of ['jiti', path.resolve(ROOT, '../node_modules/jiti')]) {
    try {
      const jiti = require(id)(__filename, { interopDefault: true })
      const mod = jiti(APP_CONFIG)
      const factory = typeof mod === 'function' ? mod : mod?.default
      if (typeof factory !== 'function') return null
      const resolved = factory({ config: {} })
      if (!resolved) return null
      return { package: resolved.android?.package, scheme: resolved.scheme }
    } catch {
      // sin jiti o la config exige variables que no están: se avisa abajo
    }
  }
  return null
}

const expected = expectedFromAppConfig()

if (expected?.package && nativeApplicationId && expected.package !== nativeApplicationId) {
  warn(
    `paquete desfasado: la variante ${variant ?? 'por omisión'} espera ${expected.package} y android/ tiene ${nativeApplicationId}`,
    'gradle no vuelve a hacer prebuild, así que hoy se compila con el paquete nativo. ' +
      'Si algún día se regenera android/, la app cambiará de identidad (otra instalación, otra firma OAuth).',
  )
}

if (expected?.scheme && fs.existsSync(MANIFEST)) {
  const manifest = fs.readFileSync(MANIFEST, 'utf8')
  if (!manifest.includes(`android:scheme="${expected.scheme}"`)) {
    warn(
      `el manifiesto no registra el esquema ${expected.scheme}, que es el de la variante ${variant ?? 'por omisión'}`,
      'los redirects de OAuth a ese esquema no tendrían quién los recoja',
    )
  }
}

if (fs.existsSync(APP_CONFIG) && !expected) {
  warn(
    'no se pudo evaluar app.config.ts',
    'con jiti instalado se comprobarían también el paquete y el esquema de la variante',
  )
}

// — Informe —

console.log('Configuración de Expo frente a android/ ya generado:\n')
console.log(`  versión          app.json ${app.version}  ·  android/ ${nativeVersionName}`)
console.log(`  versionCode      app.json ${app.android?.versionCode}  ·  android/ ${nativeVersionCode}`)
console.log(`  paquete          esperado ${expected?.package ?? '(sin app.config.ts)'}  ·  android/ ${nativeApplicationId}`)
console.log(`  variante         ${variant ?? '(sin APP_VARIANT: app.config.ts usa internal)'}`)
console.log(`  gradle           wrapper ${wrapperVersion ?? '(sin wrapper)'}  ·  compatible ${GRADLE_OK}`)

if (warnings.length) {
  console.log('\nAvisos:')
  for (const w of warnings) console.log(` ! ${w}`)
}

if (errors.length) {
  console.log('\nDesfases que hay que arreglar:')
  for (const e of errors) console.log(` ✗ ${e}`)
  console.log('')
  process.exit(1)
}

console.log(warnings.length ? '\nSin desfases que rompan el build.\n' : '\nTodo cuadra.\n')

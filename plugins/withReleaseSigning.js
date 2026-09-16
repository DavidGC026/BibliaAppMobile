const { withAppBuildGradle } = require('@expo/config-plugins')

/*
 * Firma de release en `android/app/build.gradle`.
 *
 * Por qué es un plugin y no una edición a mano: `android/` no está en el repo y
 * `expo prebuild` la regenera entera desde la plantilla de Expo, que firma el
 * release con la keystore de **debug**. Sin esto, cualquier prebuild devolvería
 * el proyecto a esa firma sin avisar, y el APK siguiente ya no valdría como
 * actualización de la app publicada. Es el mismo tipo de desfase que persigue
 * `scripts/check_native_config.cjs`, que además lo comprueba.
 *
 * La llave nunca entra aquí: el gradle resultante la busca en tiempo de
 * compilación (ver `docs-mobile/40-firma-de-release.md`).
 */

const MARKER = 'dvguzmanSigning'

const LOOKUP = `
/**
 * Llave de firma de release. Puesto por plugins/withReleaseSigning.js.
 *
 * Vive fuera del repo, y se busca en este orden:
 *   1. $DVGUZMAN_KEYSTORE_PROPERTIES
 *   2. ~/.dvguzman/keystore.properties
 *   3. keystore.properties en la raiz del proyecto Expo (ignorado por git)
 */
def dvguzmanSigning = null
for (candidate in [System.getenv('DVGUZMAN_KEYSTORE_PROPERTIES'),
                   "\${System.getProperty('user.home')}/.dvguzman/keystore.properties",
                   "\${rootDir}/../keystore.properties"]) {
    if (candidate == null) continue
    def propertiesFile = file(candidate)
    if (!propertiesFile.exists()) continue
    def loaded = new Properties()
    propertiesFile.withInputStream { loaded.load(it) }
    if (loaded.storeFile == null || !file(loaded.storeFile).exists()) continue
    dvguzmanSigning = loaded
    logger.lifecycle("Firma de release: \${loaded.keyAlias} (\${propertiesFile})")
    break
}

android {
`

const RELEASE_CONFIG = `        if (dvguzmanSigning != null) {
            release {
                storeFile file(dvguzmanSigning.storeFile)
                storePassword dvguzmanSigning.storePassword
                keyAlias dvguzmanSigning.keyAlias
                // El keystore es PKCS12: si no se declara aparte, la clave de la
                // llave es la del almacen.
                keyPassword dvguzmanSigning.getProperty('keyPassword', dvguzmanSigning.storePassword)
            }
        }
    }
`

/** Deja el gradle de Expo firmando el release con la llave real. */
function applyReleaseSigning(contents) {
  if (contents.includes(MARKER)) return contents

  let next = contents.replace(/\nandroid \{\n/, LOOKUP)
  if (next === contents) {
    throw new Error('withReleaseSigning: no se encontró el bloque android { } de build.gradle')
  }

  // El `signingConfigs { debug { … } }` de la plantilla: se le añade el release.
  const configs = next.match(/(signingConfigs \{[\s\S]*?\n)(    \}\n)/)
  if (!configs) {
    throw new Error('withReleaseSigning: no se encontró signingConfigs en build.gradle')
  }
  next = next.replace(configs[0], `${configs[1]}${RELEASE_CONFIG}`)

  // Y el buildType de release deja de apuntar a la firma de debug.
  const before = next
  next = next.replace(
    /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
    '$1// Sin la llave a mano se firma con la de debug, para poder compilar\n' +
      '            // igualmente; `npm run check:native` avisa de que ese APK no sirve\n' +
      '            // como actualizacion de la app publicada.\n' +
      '            signingConfig dvguzmanSigning != null ? signingConfigs.release : signingConfigs.debug',
  )
  if (next === before) {
    throw new Error('withReleaseSigning: el buildType release no firmaba con signingConfigs.debug')
  }

  return next
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    gradleConfig.modResults.contents = applyReleaseSigning(gradleConfig.modResults.contents)
    return gradleConfig
  })
}

module.exports.applyReleaseSigning = applyReleaseSigning

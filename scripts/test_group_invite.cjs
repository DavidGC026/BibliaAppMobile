/*
 * Códigos de invitación a grupos: parseo de QR, URLs y deep links.
 *
 *   node scripts/test_group_invite.cjs
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const esbuild = require('esbuild')

const outfile = path.join(os.tmpdir(), 'biblia-groupInvite.cjs')
esbuild.buildSync({
  entryPoints: [path.join(__dirname, '../lib/groupInvite.ts')],
  outfile,
  format: 'cjs',
  platform: 'node',
  bundle: true,
})
const {
  parseGroupJoinCode,
  buildGroupJoinUrl,
  buildGroupQrImageUrl,
  normalizeInviteCode,
} = require(outfile)
fs.unlinkSync(outfile)

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    failed += 1
    console.error('FAIL', msg)
  }
}

assert(normalizeInviteCode(' a7f3b2c1 ') === 'A7F3B2C1', 'normaliza a hex mayúsculas')
assert(parseGroupJoinCode('A7F3B2C1') === 'A7F3B2C1', 'código suelto')
assert(parseGroupJoinCode('nope') === null, 'rechaza basura')
assert(parseGroupJoinCode('https://biblia2.dvguzman.com/?joinGroup=A7F3B2C1') === 'A7F3B2C1', 'url web')
assert(parseGroupJoinCode('bibliaapp://join-group?code=A7F3B2C1') === 'A7F3B2C1', 'deep link')
assert(parseGroupJoinCode('https://biblia2.dvguzman.com/?joinGroup=zzzz') === null, 'código inválido en url')

const joinUrl = buildGroupJoinUrl('a7f3b2c1', 'https://biblia2.dvguzman.com')
assert(joinUrl === 'https://biblia2.dvguzman.com/?joinGroup=A7F3B2C1', 'arma url de invitación')

const qr = buildGroupQrImageUrl(joinUrl, 240)
assert(qr.includes('api.qrserver.com'), 'usa qrserver')
assert(qr.includes(encodeURIComponent(joinUrl)), 'embebe la url')

if (failed) {
  console.error(`${failed} aserciones fallaron`)
  process.exit(1)
}
console.log('ok groupInvite')

/**
 * ponytail: self-check session persistence — run: npx tsx context/__check__.ts
 * Verifies offline/network errors do NOT end the session; only 401/403 do.
 */
import { isAuthError } from '../lib/authError';

function check(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const networkErr = new Error('Network request failed'); // fetch reject: no .status
const serverErr = Object.assign(new Error('boom'), { status: 500 });
const unauthorized = Object.assign(new Error('no auth'), { status: 401 });
const forbidden = Object.assign(new Error('nope'), { status: 403 });

check(isAuthError(networkErr) === false, 'offline must keep session');
check(isAuthError(serverErr) === false, 'transient 500 must keep session');
check(isAuthError(unauthorized) === true, '401 must end session');
check(isAuthError(forbidden) === true, '403 must end session');
check(isAuthError(null) === false, 'null error must keep session');

console.log('auth __check__: ok');

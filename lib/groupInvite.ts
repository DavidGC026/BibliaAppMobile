export const GROUP_JOIN_PARAM = 'joinGroup';

const CODE_RE = /^[A-F0-9]{8}$/;

export function normalizeInviteCode(input: string): string {
  return input.trim().toUpperCase();
}

function codeFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const raw = params.get(GROUP_JOIN_PARAM) ?? params.get('code');
  if (!raw) return null;
  const code = normalizeInviteCode(raw);
  return CODE_RE.test(code) ? code : null;
}

/** Acepta un código suelto, una URL web `?joinGroup=` o un deep link. */
export function parseGroupJoinCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const asCode = normalizeInviteCode(trimmed);
  if (CODE_RE.test(asCode)) return asCode;

  try {
    const url = new URL(trimmed);
    const fromQuery = codeFromSearch(url.search);
    if (fromQuery) return fromQuery;
    const fromHash = url.hash.includes('=') ? codeFromSearch(url.hash.replace(/^#/, '')) : null;
    if (fromHash) return fromHash;
  } catch {
    // texto suelto que no es URL
  }

  const match = trimmed.match(/[?&#](?:joinGroup|code)=([A-Fa-f0-9]{8})/);
  if (match) {
    const code = normalizeInviteCode(match[1]);
    return CODE_RE.test(code) ? code : null;
  }
  return null;
}

export function buildGroupJoinUrl(inviteCode: string, origin = 'https://biblia2.dvguzman.com'): string {
  const code = normalizeInviteCode(inviteCode);
  return `${origin.replace(/\/$/, '')}/?${GROUP_JOIN_PARAM}=${code}`;
}

export function buildGroupQrImageUrl(inviteUrl: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(inviteUrl)}`;
}

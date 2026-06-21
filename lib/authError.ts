/**
 * Only an explicit unauthorized response means the session is actually dead.
 * Network errors (offline) or transient server errors (5xx) must NOT log the
 * user out — otherwise opening the app offline would end the session.
 */
export function isAuthError(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return status === 401 || status === 403;
}

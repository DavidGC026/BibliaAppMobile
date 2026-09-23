/** Desvincula push mientras el token aún sirve; una limpieza lenta no impide revocarlo. */
export async function revokeServerSession(
  token: string,
  unlinkPush: (token: string) => Promise<unknown>,
  revoke: (token: string) => Promise<unknown>,
  timeoutMs = 5000,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve().then(() => unlinkPush(token)).catch(() => {}),
      new Promise<void>(resolve => { timer = setTimeout(resolve, timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
  await revoke(token);
}

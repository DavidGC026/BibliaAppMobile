import * as SecureStore from 'expo-secure-store';

import { parseGroupJoinCode } from '@/lib/groupInvite';

const PENDING_JOIN_KEY = 'biblia_pending_group_join';

/** Guarda el código si un invitado abre una invitación antes de iniciar sesión. */
export async function savePendingGroupJoin(code: string): Promise<void> {
  const normalized = parseGroupJoinCode(code);
  if (!normalized) return;
  await SecureStore.setItemAsync(PENDING_JOIN_KEY, normalized);
}

/** Devuelve y borra el código pendiente, o null si no hay ninguno. */
export async function consumePendingGroupJoin(): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(PENDING_JOIN_KEY);
    if (stored) await SecureStore.deleteItemAsync(PENDING_JOIN_KEY);
    return stored ? parseGroupJoinCode(stored) : null;
  } catch {
    return null;
  }
}

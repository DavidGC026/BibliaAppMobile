import { isAuthError } from './authError';
import type { User } from './types';

const TOKEN_KEY = 'bibliaapp_session';
const USER_KEY = 'bibliaapp_user';

interface SessionStorage {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface SessionSnapshot {
  token: string | null;
  user: User | null;
}

interface ProfileResponse {
  user: User | null;
  token?: string;
}

/** Serializa SecureStore y descarta respuestas de un login anterior. */
export function createSessionController(storage: SessionStorage, getProfile: () => Promise<ProfileResponse>) {
  let snapshot: SessionSnapshot = { token: null, user: null };
  let generation = 0;
  let restored = false;
  let signingIn = false;
  let writes: Promise<void> = Promise.resolve();
  let pendingRefresh: { generation: number; promise: Promise<void> } | null = null;
  const listeners = new Set<(value: SessionSnapshot) => void>();

  function publish(value: SessionSnapshot) {
    snapshot = value;
    listeners.forEach(listener => listener(value));
  }

  function persist(expected: number | null, operation: () => Promise<void>): Promise<void> {
    const result = writes.then(async () => {
      if (expected === null || generation === expected) await operation();
    });
    writes = result.catch(() => {});
    return result;
  }

  async function save(expected: number, token: string, user: User | null) {
    await persist(expected, async () => {
      await storage.setItemAsync(TOKEN_KEY, token);
      // Una caché de perfil fallida no debe invalidar un token que sí se guardó.
      if (user) await storage.setItemAsync(USER_KEY, JSON.stringify({ sessionToken: token, user })).catch(() => {});
      else await storage.deleteItemAsync(USER_KEY).catch(() => {});
    });
    if (generation === expected) publish({ token, user });
  }

  async function clear() {
    generation++;
    restored = true;
    signingIn = false;
    publish({ token: null, user: null });
    // El borrado conserva su lugar en la cola incluso si se desmonta el proveedor.
    // Un login posterior escribe después, así que tampoco se borra su credencial.
    await persist(null, async () => {
      await storage.deleteItemAsync(TOKEN_KEY);
      await storage.deleteItemAsync(USER_KEY);
    });
  }

  async function validate(expected: number) {
    try {
      const result = await getProfile();
      if (generation !== expected) return;
      if (result.user === null) {
        await clear();
        return;
      }
      if (snapshot.user && result.user.id !== snapshot.user.id) {
        throw new Error('El perfil no corresponde a la sesión actual.');
      }
      if (snapshot.token) await save(expected, result.token ?? snapshot.token, result.user);
    } catch (error) {
      if (generation === expected && isAuthError(error)) await clear();
      // Errores de red, 403, servidor, almacenamiento o respuesta: conservar y reintentar.
    }
  }

  function refresh(): Promise<void> {
    if (signingIn) return Promise.resolve();
    if (!restored) return bootstrap();
    if (!snapshot.token) return Promise.resolve();
    if (pendingRefresh?.generation === generation) return pendingRefresh.promise;
    const request = { generation, promise: Promise.resolve() };
    request.promise = validate(generation).finally(() => {
      if (pendingRefresh === request) pendingRefresh = null;
    });
    pendingRefresh = request;
    return request.promise;
  }

  async function bootstrap() {
    const expected = ++generation;
    try {
      await writes;
      const token = await storage.getItemAsync(TOKEN_KEY);
      const cached = await storage.getItemAsync(USER_KEY).catch(() => null);
      if (generation !== expected) return;
      restored = true;
      if (!token) return;
      let user: User | null = null;
      try {
        const parsed = cached ? JSON.parse(cached) : null;
        const cachedUser = parsed?.sessionToken === token ? parsed.user :
          (!token.startsWith('v2:') && !parsed?.sessionToken ? parsed : null);
        if (cachedUser && Number.isSafeInteger(cachedUser.id) && cachedUser.id > 0) user = cachedUser;
      } catch { /* Una caché dañada se recupera desde el servidor. */ }
      publish({ token, user });
      await refresh();
    } catch {
      // SecureStore puede no estar disponible mientras iOS está bloqueado.
      // No borrar nada; el siguiente regreso a primer plano volverá a intentarlo.
    }
  }

  async function signIn(authenticate: () => Promise<{ token: string; user?: User }>) {
    const expected = ++generation;
    restored = true;
    signingIn = true;
    try {
      const result = await authenticate();
      if (generation !== expected) return;
      await save(expected, result.token, result.user ?? null);
    } finally {
      if (generation === expected) signingIn = false;
    }
    if (generation === expected) await refresh();
    if (generation === expected && !snapshot.user) {
      throw new Error('La sesión se guardó, pero no se pudo cargar tu perfil. Reintenta cuando haya conexión.');
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: (value: SessionSnapshot) => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    bootstrap,
    refresh,
    signIn,
    clear,
    cancelPending() {
      generation++;
      signingIn = false;
    },
  };
}

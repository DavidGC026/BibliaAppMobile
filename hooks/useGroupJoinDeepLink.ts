import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import { parseGroupJoinCode } from '@/lib/groupInvite';

/** Abre /join-group cuando llega un enlace ?joinGroup= o un deep link. */
export function useGroupJoinDeepLink() {
  const seen = useRef<string | null>(null);

  useEffect(() => {
    const open = (url: string | null) => {
      if (!url) return;
      const code = parseGroupJoinCode(url);
      if (!code || seen.current === code) return;
      seen.current = code;
      router.push(`/join-group?code=${code}` as Href);
    };

    Linking.getInitialURL().then(open).catch(() => {});
    const sub = Linking.addEventListener('url', (event) => open(event.url));
    return () => sub.remove();
  }, []);
}

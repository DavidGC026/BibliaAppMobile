import { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

import { setIsOnline } from '@/lib/network';
import { syncAll } from '@/lib/sync';

interface NetworkContextValue {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({ isOnline: true });

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setOnlineState] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const next = !!(state.isConnected && state.isInternetReachable !== false);
      setOnlineState(next);
      setIsOnline(next);
      if (next) {
        // Sube cambios offline y hace pull del servidor → SQLite
        syncAll().catch(() => {});
      }
    });
    NetInfo.fetch().then((state) => {
      const next = !!(state.isConnected && state.isInternetReachable !== false);
      setOnlineState(next);
      setIsOnline(next);
      if (next) syncAll().catch(() => {});
    });
    return unsub;
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline }}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

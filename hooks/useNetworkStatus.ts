import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isChecking: boolean;
  recheck: () => Promise<boolean>;
}

export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Fetch current state on mount
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? true);
    });

    // Subscribe to changes
    const unsub = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true);
    });

    return unsub;
  }, []);

  async function recheck(): Promise<boolean> {
    setIsChecking(true);
    try {
      const state = await NetInfo.fetch();
      const connected = state.isConnected ?? false;
      setIsConnected(connected);
      return connected;
    } finally {
      setIsChecking(false);
    }
  }

  return { isConnected, isChecking, recheck };
}

// One-shot connectivity check — use before making API calls
export async function checkConnectivity(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
}

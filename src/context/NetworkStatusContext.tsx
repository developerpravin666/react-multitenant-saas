import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface NetworkStatusContextType {
  isOnline: boolean;
  wasOffline: boolean;
  isChecking: boolean;
  checkConnection: () => Promise<boolean>;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: true,
  wasOffline: false,
  isChecking: false,
  checkConnection: async () => true,
});

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      // Fast ping using fetch with short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch("/api/health", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      const status = res !== null && (res.ok || res.status === 401 || res.status === 404);
      setIsOnline(status);
      return status;
    } catch {
      setIsOnline(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      checkConnection().then((online) => {
        if (online) {
          setWasOffline(true);
          const t = setTimeout(() => setWasOffline(false), 5000);
          return () => clearTimeout(t);
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkConnection]);

  return (
    <NetworkStatusContext.Provider value={{ isOnline, wasOffline, isChecking, checkConnection }}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus() {
  return useContext(NetworkStatusContext);
}


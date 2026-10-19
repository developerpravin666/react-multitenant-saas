import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface NetworkStatusContextValue {
  /** True if the browser reports network connectivity (navigator.onLine). */
  isOnline: boolean;
  /** True if the backend server was successfully reached on the last check. */
  isServerReachable: boolean;
  /** True while an active connectivity check is underway. */
  isChecking: boolean;
  /** Whether the user experienced an offline event in the current session. */
  wasOffline: boolean;
  /** Timestamp when connection was lost, or null if currently online. */
  offlineSince: Date | null;
  /** Timestamp when connection was last verified as working. */
  lastOnlineAt: Date | null;
  /** Whether the offline alert banner was manually dismissed by the user. */
  isBannerDismissed: boolean;
  /** Dismiss the current offline banner. */
  dismissBanner: () => void;
  /** Force an immediate connectivity check against the server. */
  checkConnection: () => Promise<boolean>;
}

export const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null);

const HEALTH_CHECK_TIMEOUT_MS = 4000;

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isServerReachable, setIsServerReachable] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [offlineSince, setOfflineSince] = useState<Date | null>(
    typeof navigator !== "undefined" && !navigator.onLine ? new Date() : null
  );
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(new Date());
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);

  const checkingRef = useRef(false);

  /**
   * Performs an active check to determine if the server / internet is genuinely reachable.
   */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (checkingRef.current) return isServerReachable;
    checkingRef.current = true;
    setIsChecking(true);

    // If the browser itself is offline, no need to attempt a fetch
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      setIsServerReachable(false);
      setIsChecking(false);
      checkingRef.current = false;
      return false;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

      // Ping health endpoint or fallback URL with timestamp to prevent browser cache
      const pingUrl = `/health?_t=${Date.now()}`;
      const response = await fetch(pingUrl, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timer);

      const reachable = response.status >= 200 && response.status < 500;
      setIsOnline(true);
      setIsServerReachable(reachable);

      if (reachable) {
        setLastOnlineAt(new Date());
        setOfflineSince(null);
      } else {
        if (!offlineSince) setOfflineSince(new Date());
      }

      setIsChecking(false);
      checkingRef.current = false;
      return reachable;
    } catch {
      // Fetch threw due to abort timeout, CORS, or complete network failure
      setIsServerReachable(false);
      if (!offlineSince) setOfflineSince(new Date());
      setIsChecking(false);
      checkingRef.current = false;
      return false;
    }
  }, [isServerReachable, offlineSince]);

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
  }, []);

  // Set up event listeners for browser online/offline and custom API network failures
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsBannerDismissed(false);
      // Verify actual connectivity with the server
      void checkConnection().then((reachable) => {
        if (reachable) {
          setWasOffline(true);
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsServerReachable(false);
      setWasOffline(true);
      setIsBannerDismissed(false);
      setOfflineSince(new Date());
    };

    const handleCustomNetworkOffline = () => {
      setIsServerReachable(false);
      setWasOffline(true);
      setIsBannerDismissed(false);
      if (!offlineSince) setOfflineSince(new Date());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("app:network-offline", handleCustomNetworkOffline);

    // Periodic heartbeat every 45s when online, or every 10s when offline to detect recovery
    const interval = setInterval(() => {
      if (!document.hidden) {
        void checkConnection();
      }
    }, isOnline && isServerReachable ? 45000 : 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("app:network-offline", handleCustomNetworkOffline);
      clearInterval(interval);
    };
  }, [checkConnection, isOnline, isServerReachable, offlineSince]);

  const value: NetworkStatusContextValue = {
    isOnline,
    isServerReachable,
    isChecking,
    wasOffline,
    offlineSince,
    lastOnlineAt,
    isBannerDismissed,
    dismissBanner,
    checkConnection,
  };

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus(): NetworkStatusContextValue {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error("useNetworkStatus must be used within a NetworkStatusProvider");
  }
  return context;
}


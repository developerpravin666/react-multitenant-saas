import { useState, useEffect } from "react";
import { WifiOff, RefreshCw, X, CheckCircle2 } from "lucide-react";
import { useNetworkStatus } from "../../context/NetworkStatusContext";

export function OfflineBanner() {
  const {
    isOnline,
    isServerReachable,
    isChecking,
    wasOffline,
    isBannerDismissed,
    dismissBanner,
    checkConnection,
  } = useNetworkStatus();

  const [showRestored, setShowRestored] = useState(false);

  const isDisconnected = !isOnline || !isServerReachable;

  // Show "Connection restored" toast banner briefly when transitioning back online
  useEffect(() => {
    if (!isDisconnected && wasOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isDisconnected, wasOffline]);

  if (!isDisconnected && !showRestored) {
    return null;
  }

  if (isDisconnected && isBannerDismissed) {
    return null;
  }

  if (showRestored) {
    return (
      <aside
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-[100] flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-600 text-white text-xs sm:text-sm font-medium shadow-md transition-all duration-300 animate-in slide-in-from-top"
      >
        <div className="flex items-center gap-2 mx-auto">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-100" />
          <span>You are back online! Network connection has been restored.</span>
        </div>
        <button
          type="button"
          onClick={() => setShowRestored(false)}
          className="rounded p-1 hover:bg-emerald-700/60 text-white/80 hover:text-white transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="size-3.5" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-[100] flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700 text-white text-xs sm:text-sm font-medium shadow-lg animate-in slide-in-from-top"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex size-6 items-center justify-center rounded-full bg-black/20 shrink-0">
          <WifiOff className="size-3.5 animate-pulse" />
        </div>
        <div>
          <span className="font-semibold">
            {!isOnline ? "You are offline." : "Server unreachable."}
          </span>{" "}
          <span className="hidden sm:inline text-amber-100">
            {!isOnline
              ? "Please check your internet connection. Changes will not be saved."
              : "Unable to reach the server. Please check your network or try again."}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={() => void checkConnection()}
          disabled={isChecking}
          className="inline-flex items-center gap-1.5 rounded-md bg-white/20 hover:bg-white/30 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`size-3 ${isChecking ? "animate-spin" : ""}`} />
          <span>{isChecking ? "Checking…" : "Retry Connection"}</span>
        </button>

        <button
          type="button"
          onClick={dismissBanner}
          className="rounded p-1 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          aria-label="Dismiss offline banner"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </aside>
  );
}


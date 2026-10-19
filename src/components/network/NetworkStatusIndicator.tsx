import { useState, useRef, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import { useNetworkStatus } from "../../context/NetworkStatusContext";

export function NetworkStatusIndicator() {
  const {
    isOnline,
    isServerReachable,
    isChecking,
    offlineSince,
    checkConnection,
  } = useNetworkStatus();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDisconnected = !isOnline || !isServerReachable;

  // Close popup on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  if (!isDisconnected) {
    // When connected, show a subtle green indicator tooltip
    return (
      <div className="relative group">
        <button
          type="button"
          onClick={() => void checkConnection()}
          aria-label="Network connected (Click to test)"
          className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="relative flex size-3">
            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500 m-auto" />
          </span>
        </button>
        <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex items-center gap-1.5 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-md dark:bg-slate-800 whitespace-nowrap z-50">
          <Wifi className="size-3 text-emerald-400" />
          <span>Connected</span>
        </div>
      </div>
    );
  }

  // When offline / disconnected
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Offline status"
        className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60 transition-colors"
      >
        <WifiOff className="size-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
        <span className="hidden sm:inline">Offline</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-rose-200 bg-white p-4 shadow-xl dark:border-rose-900/60 dark:bg-slate-900 z-50 animate-in fade-in zoom-in-95">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <AlertCircle className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {!isOnline ? "No Internet Connection" : "Server Unreachable"}
              </h4>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                {!isOnline
                  ? "Your device is not connected to any network."
                  : "We cannot reach the Siddhi server. Check your connection or server."}
              </p>
              {offlineSince && (
                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                  Disconnected at {offlineSince.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
            <button
              type="button"
              onClick={() => void checkConnection()}
              disabled={isChecking}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--tenant-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60 transition-all shadow-xs"
            >
              <RefreshCw className={`size-3 ${isChecking ? "animate-spin" : ""}`} />
              <span>{isChecking ? "Testing…" : "Retry Now"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


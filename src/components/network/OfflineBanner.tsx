import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useNetworkStatus } from "../../context/NetworkStatusContext";

export function OfflineBanner() {
  const { isOnline, wasOffline, isChecking, checkConnection } = useNetworkStatus();

  if (isOnline && !wasOffline) {
    return null;
  }

  if (wasOffline && isOnline) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all duration-300">
        <CheckCircle2 className="size-4" />
        <span>Connection Restored — Back online! Local changes are synchronizing.</span>
      </div>
    );
  }

  return (
    <div className="bg-amber-600 text-white px-4 py-2.5 text-xs font-medium flex flex-wrap items-center justify-between gap-3 shadow-md z-50">
      <div className="flex items-center gap-2.5">
        <WifiOff className="size-4 shrink-0 text-amber-200 animate-pulse" />
        <div>
          <strong className="font-bold">Offline Mode:</strong> Internet disconnected. You can continue local billing and data entry if connected to the store desktop or LAN.
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => checkConnection()}
          disabled={isChecking}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-750 px-3 py-1 font-semibold text-white hover:bg-amber-800 transition disabled:opacity-50 text-[11px] border border-amber-400/40"
        >
          <RefreshCw className={`size-3 ${isChecking ? "animate-spin" : ""}`} />
          <span>{isChecking ? "Checking…" : "Retry Connection"}</span>
        </button>
      </div>
    </div>
  );
}


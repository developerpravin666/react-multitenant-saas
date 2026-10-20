import { Wifi, WifiOff } from "lucide-react";
import { useNetworkStatus } from "../../context/NetworkStatusContext";

export function NetworkStatusIndicator() {
  const { isOnline } = useNetworkStatus();

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        isOnline
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
          : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
      }`}
      title={isOnline ? "Online (Connected to server)" : "Offline (Local mode)"}
    >
      {isOnline ? (
        <>
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <Wifi className="size-3" />
          <span className="hidden sm:inline">Online</span>
        </>
      ) : (
        <>
          <span className="size-1.5 rounded-full bg-rose-500" />
          <WifiOff className="size-3" />
          <span className="hidden sm:inline">Offline</span>
        </>
      )}
    </div>
  );
}


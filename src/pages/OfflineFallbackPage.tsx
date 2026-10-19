import { useState } from "react";
import { WifiOff, RefreshCw, RotateCcw, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { useNetworkStatus } from "../context/NetworkStatusContext";

interface OfflineFallbackPageProps {
  onRetry?: () => void;
  message?: string;
}

export function OfflineFallbackPage({ onRetry, message }: OfflineFallbackPageProps) {
  const { isOnline, isServerReachable, isChecking, checkConnection } = useNetworkStatus();
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [retryResult, setRetryResult] = useState<"success" | "failed" | null>(null);

  const handleRetry = async () => {
    setRetryResult(null);
    const reachable = await checkConnection();
    if (reachable) {
      setRetryResult("success");
      if (onRetry) {
        onRetry();
      } else {
        window.location.reload();
      }
    } else {
      setRetryResult("failed");
    }
  };

  return (
    <main className="grid min-h-[80vh] place-items-center bg-slate-50 p-4 sm:p-6 dark:bg-slate-950">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900 transition-all">
        {/* Animated Icon */}
        <div className="relative mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-inner">
          <div className="absolute inset-0 rounded-2xl bg-amber-400/10 animate-ping" />
          <WifiOff className="size-10 text-amber-600 dark:text-amber-400" />
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 dark:bg-rose-950/60 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 mb-3">
          <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
          <span>{!isOnline ? "Device is Offline" : "Server Unreachable"}</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          No Internet Connection
        </h1>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {message ||
            (!isOnline
              ? "You appear to be offline. Please verify your Wi-Fi, Ethernet, or mobile network connection and try again."
              : "We could not establish a connection to the Siddhi server. The network may be down or the server is temporarily unreachable.")}
        </p>

        {/* Retry result feedback */}
        {retryResult === "failed" && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 p-2.5 text-xs font-medium text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
            <AlertTriangle className="size-4 shrink-0 text-rose-500" />
            <span>Still unable to connect. Please check your network and try again.</span>
          </div>
        )}

        {retryResult === "success" && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            <span>Connection restored! Reloading application…</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isChecking}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--tenant-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tenant-primary)] transition-all disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${isChecking ? "animate-spin" : ""}`} />
            <span>{isChecking ? "Testing Connection…" : "Retry Connection"}</span>
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
          >
            <RotateCcw className="size-4" />
            <span>Reload Page</span>
          </button>
        </div>

        {/* Troubleshooting Accordion */}
        <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4 text-left">
          <button
            type="button"
            onClick={() => setShowTroubleshoot((prev) => !prev)}
            className="flex w-full items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <span>Network Troubleshooting Tips</span>
            {showTroubleshoot ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {showTroubleshoot && (
            <ul className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400 list-disc list-inside">
              <li>Ensure your Wi-Fi or Ethernet cable is securely connected.</li>
              <li>Toggle Airplane mode on and off on your device.</li>
              <li>Restart your router or mobile hotspot.</li>
              <li>Check if other websites and services are accessible.</li>
              <li>If running locally or in a private network, confirm the backend API is active.</li>
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}


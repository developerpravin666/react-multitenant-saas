import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { subscribeToApiLoading } from "../services/apiClient";

const ApiLoadingContext = createContext(false);

export function ApiLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => subscribeToApiLoading(setIsLoading), []);

  return (
    <ApiLoadingContext.Provider value={isLoading}>
      {children}
      {isLoading ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/20 backdrop-blur-[1px]"
          role="status"
          aria-live="polite"
          aria-label="Loading"
        >
          <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-xl dark:bg-slate-900 dark:text-slate-100">
            <span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--tenant-primary)]" />
            Loading…
          </div>
        </div>
      ) : null}
    </ApiLoadingContext.Provider>
  );
}

export function useApiLoading() {
  return useContext(ApiLoadingContext);
}

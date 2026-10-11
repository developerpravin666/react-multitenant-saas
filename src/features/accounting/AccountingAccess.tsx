import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { apiClient } from "../../services/apiClient";
import { useAuth } from "../auth/AuthContext";

type Access = { isOwner: boolean; permissions: string[] };
const Context = createContext<{ access: Access | null; refresh: () => Promise<void> }>({ access: null, refresh: async () => { } });
export function AccountingAccessProvider({ children }: PropsWithChildren) {
  const { isProductOwner } = useAuth();
  const [access, setAccess] = useState<Access | null>(
    isProductOwner ? { isOwner: true, permissions: ["*"] } : null
  );
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (isProductOwner) {
      setAccess({ isOwner: true, permissions: ["*"] });
      setError("");
      return;
    }
    try { setAccess(await apiClient.get<Access>("/accounting/access")); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load your permissions."); }
  }, [isProductOwner]);
  useEffect(() => {
    if (isProductOwner) return;
    void refresh();
    // const focus = () => { void refresh(); };
    // window.addEventListener("focus", focus);
    // return () => window.removeEventListener("focus", focus);
  }, [isProductOwner, refresh]);
  if (!access) return <div role={error ? "alert" : "status"}>{error || "Loading permissions…"}{error && <button onClick={() => void refresh()}>Retry</button>}</div>;
  return <Context.Provider value={{ access, refresh }}>{children}</Context.Provider>;
}
export function useAccountingAccess() {
  const { access, refresh } = useContext(Context);
  return {
    isOwner: access?.isOwner ?? false,
    can: (code: string) => Boolean(access?.permissions.includes("*") || access?.permissions.includes(code)),
    refresh,
  };
}
export function writePermission(path: string): string | undefined {
  if (path.startsWith("/sales/customers")) return "catalog.manage";
  if (path.startsWith("/sales")) return "sales.manage";
  if (path.startsWith("/purchase")) return "purchases.manage";
  if (path.startsWith("/products") || path.startsWith("/settings")) return "catalog.manage";
  if (path.startsWith("/accounting")) return "accounting.manage";
}

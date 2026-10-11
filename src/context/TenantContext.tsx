import {
  createContext,
  useContext,
  useLayoutEffect,
  type PropsWithChildren,
} from "react";
import type { TenantConfig } from "../types/tenant";
import { darkenHex, normalizeHexColor } from "../lib/color";

interface TenantContextValue {
  tenant: TenantConfig;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

interface TenantProviderProps extends PropsWithChildren {
  tenant: TenantConfig;
}

export function TenantProvider({ tenant, children }: TenantProviderProps) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const primary = normalizeHexColor(tenant.primaryColor);
    const secondary = normalizeHexColor(tenant.secondaryColor ?? "#eef2ff");

    root.style.setProperty("--tenant-primary", primary);
    root.style.setProperty("--tenant-primary-hover", darkenHex(primary));
    root.style.setProperty("--tenant-secondary", secondary);
    root.style.setProperty("--tenant-ring", primary);
  }, [tenant]);

  return (
    <TenantContext.Provider value={{ tenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant must be used within TenantProvider.");
  }

  return context;
}

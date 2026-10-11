import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import type { FeatureFlag, FeatureFlagContextValue, TenantSummary } from "./types";
import { featureFlagService } from "./featureFlagService";

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

export function FeatureFlagProvider({ children }: PropsWithChildren) {
  const initialCache = featureFlagService.getCache();
  const [flags, setFlags] = useState<Record<string, boolean>>(initialCache.flags);
  const [items, setItems] = useState<FeatureFlag[]>(initialCache.items);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFlags = useCallback(async (tenantId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const activeTenant = tenantId !== undefined ? tenantId : selectedTenantId;
      // Fetch admin feature flags which return full tenant lists and overrides
      const data = await featureFlagService.getAdminFeatureFlags(activeTenant);
      setFlags(data.flags);
      setItems(data.items);
      if (data.tenants && data.tenants.length > 0) {
        setTenants(data.tenants);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feature flags.");
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId]);

  // Fetch flags on initial mount
  useEffect(() => {
    void refreshFlags();
  }, [refreshFlags]);

  // Sync across tabs and components
  useEffect(() => {
    const handleSync = () => {
      const cached = featureFlagService.getCache();
      setFlags(cached.flags);
      setItems(cached.items);
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("siddhi_feature_flags_changed", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("siddhi_feature_flags_changed", handleSync);
    };
  }, []);

  const isEnabled = useCallback(
    (key: string, defaultValue: boolean = false): boolean => {
      const normalizedKey = key.toLowerCase();
      for (const k of Object.keys(flags)) {
        if (k.toLowerCase() === normalizedKey) {
          return Boolean(flags[k]);
        }
      }
      return defaultValue;
    },
    [flags]
  );

  const toggleFlag = useCallback(
    async (key: string, enabled: boolean, tenantId?: string | null): Promise<boolean> => {
      const effectiveTenant = tenantId !== undefined ? tenantId : selectedTenantId;

      // Optimistic update
      setFlags((prev) => ({ ...prev, [key]: enabled }));
      setItems((prev) =>
        prev.map((item) =>
          item.key.toLowerCase() === key.toLowerCase()
            ? { ...item, isEnabled: enabled, modifiedAt: new Date().toISOString() }
            : item
        )
      );

      try {
        await featureFlagService.toggleFeatureFlag(key, enabled, effectiveTenant);
        // Refresh to guarantee clean state and overrides
        await refreshFlags(effectiveTenant);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update feature flag.");
        return false;
      }
    },
    [selectedTenantId, refreshFlags]
  );

  const toggleAllTenants = useCallback(
    async (key: string, enabled: boolean): Promise<boolean> => {
      setLoading(true);
      try {
        const res = await featureFlagService.toggleAllTenants(key, enabled);
        await refreshFlags(selectedTenantId);
        return res.success;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to toggle feature flag for all tenants.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [selectedTenantId, refreshFlags]
  );

  const resetTenantOverride = useCallback(
    async (key: string, tenantId: string): Promise<boolean> => {
      setLoading(true);
      try {
        const res = await featureFlagService.resetTenantOverride(key, tenantId);
        await refreshFlags(selectedTenantId);
        return res.success;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reset tenant override.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [selectedTenantId, refreshFlags]
  );

  const saveFlag = useCallback(
    async (flag: {
      key: string;
      name: string;
      description?: string;
      isEnabled: boolean;
      category?: string;
      tenantId?: string | null;
    }): Promise<boolean> => {
      try {
        await featureFlagService.saveFeatureFlag({
          ...flag,
          tenantId: flag.tenantId !== undefined ? flag.tenantId : selectedTenantId,
        });
        await refreshFlags(selectedTenantId);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save feature flag.");
        return false;
      }
    },
    [selectedTenantId, refreshFlags]
  );

  return (
    <FeatureFlagContext.Provider
      value={{
        flags,
        items,
        tenants,
        loading,
        error,
        selectedTenantId,
        setSelectedTenantId: (id) => {
          setSelectedTenantId(id);
          void refreshFlags(id);
        },
        isEnabled,
        toggleFlag,
        toggleAllTenants,
        resetTenantOverride,
        saveFlag,
        refreshFlags,
      }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlagContextValue {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx) {
    throw new Error("useFeatureFlags must be used within a FeatureFlagProvider");
  }
  return ctx;
}

/**
 * Convenient hook to query a single feature flag by key.
 */
export function useFeatureFlag(key: string, defaultValue: boolean = true): boolean {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx) {
    const cached = featureFlagService.getCache();
    for (const k of Object.keys(cached.flags)) {
      if (k.toLowerCase() === key.toLowerCase()) {
        return Boolean(cached.flags[k]);
      }
    }
    return defaultValue;
  }
  return ctx.isEnabled(key, defaultValue);
}

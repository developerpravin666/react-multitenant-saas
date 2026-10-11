import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import type { FeatureFlag, FeatureFlagContextValue } from "./types";
import { featureFlagService } from "./featureFlagService";

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

export function FeatureFlagProvider({ children }: PropsWithChildren) {
  const initialCache = featureFlagService.getCache();
  const [flags, setFlags] = useState<Record<string, boolean>>(initialCache.flags);
  const [items, setItems] = useState<FeatureFlag[]>(initialCache.items);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await featureFlagService.getFeatureFlags();
      setFlags(data.flags);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feature flags.");
    } finally {
      setLoading(false);
    }
  }, []);

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
      // Match case-insensitively
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
        await featureFlagService.toggleFeatureFlag(key, enabled, tenantId);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update feature flag.");
        return false;
      }
    },
    []
  );

  const saveFlag = useCallback(
    async (flag: {
      key: string;
      name: string;
      description?: string;
      isEnabled: boolean;
      category?: string;
    }): Promise<boolean> => {
      try {
        await featureFlagService.saveFeatureFlag(flag);
        await refreshFlags();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save feature flag.");
        return false;
      }
    },
    [refreshFlags]
  );

  return (
    <FeatureFlagContext.Provider
      value={{
        flags,
        items,
        loading,
        error,
        isEnabled,
        toggleFlag,
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
    // If used outside provider, fallback to cache
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


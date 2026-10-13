import { apiClient } from "../../services/apiClient";
import type {
  FeatureFlag,
  FeatureFlagsResponse,
  AdminFeatureFlagsResponse,
} from "./types";

const CACHE_KEY = "siddhi_feature_flags_cache";

export const featureFlagService = {
  /**
   * Retrieves active feature flags from database or cached state for a client session.
   */
  async getFeatureFlags(tenantId?: string | null): Promise<FeatureFlagsResponse> {
    try {
      const url = tenantId ? `/features?tenantId=${encodeURIComponent(tenantId)}` : "/features";
      const response = await apiClient.get<FeatureFlagsResponse>(url);
      if (response && response.flags) {
        this.saveCache(response);
        return response;
      }
    } catch {
      // Fallback to cache
    }

    return this.getCache();
  },

  /**
   * Admin: Retrieves all registered feature flags, tenant summaries, and overrides directly from database.
   */
  async getAdminFeatureFlags(tenantId?: string | null): Promise<AdminFeatureFlagsResponse> {
    try {
      const url = tenantId ? `/admin/features?tenantId=${encodeURIComponent(tenantId)}` : "/admin/features";
      const response = await apiClient.get<AdminFeatureFlagsResponse>(url);
      if (response && response.flags) {
        this.saveCache({ flags: response.flags, items: response.items });
        return response;
      }
    } catch {
      // Fallback
    }

    const cache = this.getCache();
    return {
      flags: cache.flags,
      items: cache.items,
      tenants: [],
      rawOverrides: [],
    };
  },

  /**
   * Admin: Toggles a feature flag for a particular tenant (or global default if tenantId is null).
   */
  async toggleFeatureFlag(
    key: string,
    isEnabled: boolean,
    tenantId?: string | null
  ): Promise<{ success: boolean; flag: FeatureFlag; message?: string }> {
    try {
      const res = await apiClient.post<{ success: boolean; flag: FeatureFlag; message?: string }>(
        "/admin/features/toggle",
        {
          key,
          isEnabled,
          tenantId: tenantId || null,
        }
      );

      // Update local cache
      const current = this.getCache();
      current.flags[key] = isEnabled;
      const idx = current.items.findIndex((item) => item.key.toLowerCase() === key.toLowerCase());
      const targetItem = idx >= 0 ? current.items[idx] : undefined;
      if (targetItem && res.flag) {
        targetItem.isEnabled = isEnabled;
        if (res.flag.modifiedAt) {
          targetItem.modifiedAt = res.flag.modifiedAt;
        }
      } else if (res.flag) {
        current.items.push(res.flag);
      }
      this.saveCache(current);

      return res;
    } catch {
      // Fallback optimistic update
      const current = this.getCache();
      current.flags[key] = isEnabled;
      const existing = current.items.find((item) => item.key.toLowerCase() === key.toLowerCase());
      if (existing) {
        existing.isEnabled = isEnabled;
        existing.modifiedAt = new Date().toISOString();
      }
      this.saveCache(current);

      return {
        success: true,
        flag: existing || {
          id: "local-" + key,
          key,
          name: key,
          isEnabled,
          category: "General",
          tenantId: tenantId || null,
          modifiedAt: new Date().toISOString(),
        },
      };
    }
  },

  /**
   * Admin: Toggles a feature flag for ALL tenants at once in the database.
   */
  async toggleAllTenants(
    key: string,
    isEnabled: boolean
  ): Promise<{ success: boolean; updatedCount: number; message?: string }> {
    try {
      const res = await apiClient.post<{ success: boolean; updatedCount: number; message?: string }>(
        "/admin/features/toggle-all",
        {
          key,
          isEnabled,
          syncAllTenants: true,
        }
      );

      // Update local cache
      const current = this.getCache();
      if (key && key !== "all") {
        current.flags[key] = isEnabled;
        const target = current.items.find((i) => i.key.toLowerCase() === key.toLowerCase());
        if (target) {
          target.isEnabled = isEnabled;
          target.globalEnabled = isEnabled;
          target.modifiedAt = new Date().toISOString();
        }
      } else {
        Object.keys(current.flags).forEach((k) => (current.flags[k] = isEnabled));
        current.items.forEach((i) => {
          i.isEnabled = isEnabled;
          i.globalEnabled = isEnabled;
          i.modifiedAt = new Date().toISOString();
        });
      }
      this.saveCache(current);

      return res;
    } catch {
      return {
        success: false,
        updatedCount: 0,
        message: "Failed to broadcast toggle across all tenants.",
      };
    }
  },

  /**
   * Admin: Resets a tenant's custom override so they inherit the global default.
   */
  async resetTenantOverride(
    key: string,
    tenantId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await apiClient.post<{ success: boolean; message?: string }>(
        "/admin/features/reset-override",
        {
          key,
          tenantId,
        }
      );
      return res;
    } catch {
      return { success: false, message: "Failed to reset tenant override." };
    }
  },

  /**
   * Admin: Creates or updates a feature flag definition in the database.
   */
  async saveFeatureFlag(flag: {
    key: string;
    name: string;
    description?: string;
    isEnabled: boolean;
    category?: string;
    tenantId?: string | null;
  }): Promise<{ success: boolean; flag: FeatureFlag }> {
    const res = await apiClient.post<{ success: boolean; flag: FeatureFlag }>("/admin/features/save", flag);
    const current = this.getCache();
    current.flags[flag.key] = flag.isEnabled;
    const idx = current.items.findIndex((item) => item.key.toLowerCase() === flag.key.toLowerCase());
    if (idx >= 0 && res.flag) {
      current.items[idx] = res.flag;
    } else if (res.flag) {
      current.items.push(res.flag);
    }
    this.saveCache(current);
    return res;
  },

  getCache(): FeatureFlagsResponse {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.flags) return parsed;
      }
    } catch {
      // Ignore
    }

    // Default configuration: voice_typing is enabled by default
    return {
      flags: {
        voice_typing: true,
      },
      items: [
        {
          id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          key: "voice_typing",
          name: "Voice Typing & Speech Dictation",
          description: "Enables automatic speech-to-text dictation across input fields and form controls via Web Speech API",
          isEnabled: true,
          category: "Accessibility",
          tenantId: null,
          globalEnabled: true,
          overridesCount: 0,
        },
      ],
    };
  },

  saveCache(data: FeatureFlagsResponse) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent("siddhi_feature_flags_changed", { detail: data.flags }));
    } catch {
      // Ignore
    }
  },
};

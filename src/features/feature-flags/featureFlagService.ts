import { apiClient } from "../../services/apiClient";
import type { FeatureFlag, FeatureFlagsResponse } from "./types";

const CACHE_KEY = "siddhi_feature_flags_cache";

export const featureFlagService = {
  /**
   * Retrieves active feature flags from database or cached state.
   */
  async getFeatureFlags(tenantId?: string): Promise<FeatureFlagsResponse> {
    try {
      const url = tenantId ? `/features?tenantId=${encodeURIComponent(tenantId)}` : "/features";
      const response = await apiClient.get<FeatureFlagsResponse>(url);
      if (response && response.flags) {
        this.saveCache(response);
        return response;
      }
    } catch {
      // Fallback to cache or defaults
    }

    return this.getCache();
  },

  /**
   * Admin: Retrieves all registered feature flags directly from database.
   */
  async getAdminFeatureFlags(): Promise<FeatureFlagsResponse> {
    try {
      const response = await apiClient.get<FeatureFlagsResponse>("/admin/features");
      if (response && response.flags) {
        this.saveCache(response);
        return response;
      }
    } catch {
      // Fallback
    }

    return this.getCache();
  },

  /**
   * Admin: Toggles a feature flag on or off and persists to database table `tenant.feature_flags`.
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
      if (idx >= 0 && res.flag) {
        current.items[idx] = res.flag;
      } else if (res.flag) {
        current.items.push(res.flag);
      }
      this.saveCache(current);

      return res;
    } catch {
      // Optimistic local update if server is temporarily unreachable
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
          modifiedAt: new Date().toISOString(),
        },
      };
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


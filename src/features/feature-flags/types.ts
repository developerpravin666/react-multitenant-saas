export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  category: string;
  tenantId?: string | null;
  createdAt?: string;
  modifiedAt?: string;
}

export interface FeatureFlagsResponse {
  flags: Record<string, boolean>;
  items: FeatureFlag[];
}

export interface FeatureFlagContextValue {
  flags: Record<string, boolean>;
  items: FeatureFlag[];
  loading: boolean;
  error: string | null;
  isEnabled: (key: string, defaultValue?: boolean) => boolean;
  toggleFlag: (key: string, isEnabled: boolean, tenantId?: string | null) => Promise<boolean>;
  saveFlag: (flag: { key: string; name: string; description?: string; isEnabled: boolean; category?: string }) => Promise<boolean>;
  refreshFlags: () => Promise<void>;
}


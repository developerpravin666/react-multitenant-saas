export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
}

export interface TenantFlagOverride {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  isEnabled: boolean;
  modifiedAt?: string;
}

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
  globalEnabled?: boolean;
  overridesCount?: number;
  overrides?: TenantFlagOverride[];
}

export interface FeatureFlagsResponse {
  flags: Record<string, boolean>;
  items: FeatureFlag[];
}

export interface AdminFeatureFlagsResponse {
  flags: Record<string, boolean>;
  items: FeatureFlag[];
  tenants: TenantSummary[];
  rawOverrides?: FeatureFlag[];
}

export interface FeatureFlagContextValue {
  flags: Record<string, boolean>;
  items: FeatureFlag[];
  tenants: TenantSummary[];
  loading: boolean;
  error: string | null;
  selectedTenantId: string | null;
  setSelectedTenantId: (tenantId: string | null) => void;
  isEnabled: (key: string, defaultValue?: boolean) => boolean;
  toggleFlag: (key: string, isEnabled: boolean, tenantId?: string | null) => Promise<boolean>;
  toggleAllTenants: (key: string, isEnabled: boolean) => Promise<boolean>;
  resetTenantOverride: (key: string, tenantId: string) => Promise<boolean>;
  saveFlag: (flag: {
    key: string;
    name: string;
    description?: string;
    isEnabled: boolean;
    category?: string;
    tenantId?: string | null;
  }) => Promise<boolean>;
  refreshFlags: (tenantId?: string | null) => Promise<void>;
}

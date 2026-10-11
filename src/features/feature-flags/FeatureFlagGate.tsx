import type { ReactNode } from "react";
import { useFeatureFlag } from "./FeatureFlagContext";

interface FeatureFlagGateProps {
  flag: string;
  fallback?: ReactNode;
  children: ReactNode;
  defaultValue?: boolean;
}

/**
 * Conditionally renders children only when the specified feature flag is enabled in the database.
 */
export function FeatureFlagGate({
  flag,
  fallback = null,
  children,
  defaultValue = true,
}: FeatureFlagGateProps) {
  const enabled = useFeatureFlag(flag, defaultValue);

  if (!enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}


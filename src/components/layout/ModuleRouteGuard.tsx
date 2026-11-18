import type { ReactNode } from "react";
import { Link, Outlet } from "react-router-dom";
import { useFeatureFlags } from "../../features/feature-flags/FeatureFlagContext";
import { useAuth } from "../../features/auth/AuthContext";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface ModuleRouteGuardProps {
  flag: string;
  moduleName: string;
  children?: ReactNode;
}

export function ModuleRouteGuard({ flag, moduleName, children }: ModuleRouteGuardProps) {
  const { isEnabled } = useFeatureFlags();
  const { isProductOwner } = useAuth();

  // Super Admin / Product Owner always has unrestricted access
  if (isProductOwner || isEnabled(flag, true)) {
    return children ? <>{children}</> : <Outlet />;
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
        <ShieldAlert className="size-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        Module Not Subscribed
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        Your store workspace currently does not have access to the{" "}
        <strong className="text-slate-900 dark:text-white">{moduleName}</strong> module.
        Please contact your platform administrator to activate this module for your account.
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <ArrowLeft className="size-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}

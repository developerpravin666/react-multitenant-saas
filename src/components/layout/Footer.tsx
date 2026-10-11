import { useTenant } from "../../context/TenantContext";

export function Footer() {
  const { tenant } = useTenant();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 sm:px-6 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} {tenant.tenantName}. All rights reserved.
        </p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-[var(--tenant-primary)]">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-[var(--tenant-primary)]">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}

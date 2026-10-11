import { Moon, Search, Sun, UserRound, ChevronDown, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useTenant } from "../../context/TenantContext";
import { useTheme } from "../../context/ThemeContext";

export function Header() {
  const { tenant } = useTenant();
  const { theme, toggleTheme } = useTheme();
  const { session, logout, isProductOwner } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate(isProductOwner ? "/admin/login" : "/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
      {isProductOwner ? (
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <ShieldCheck className="size-5" />
          </div>
          <div className="hidden sm:block">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Platform Admin
            </div>
            <div className="max-w-48 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              Siddhi Multi-Tenant
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={tenant.logoUrl}
            alt={`${tenant.tenantName} logo`}
            className="size-9 rounded-lg border border-slate-200 bg-white object-contain p-1 dark:border-slate-700"
          />
          <span className="hidden max-w-44 truncate text-sm font-semibold text-slate-900 sm:block dark:text-slate-100">
            {tenant.tenantName}
          </span>
        </div>
      )}

      <div className="mx-auto hidden w-full max-w-xl md:block">
        <label className="relative block">
          <span className="sr-only">Global search</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            placeholder="Search users, projects, reports..."
            className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 transition-all duration-300 placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--tenant-primary)]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-950"
          />
        </label>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-600 transition-all duration-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </button>

        <div className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-slate-700 transition-all duration-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <span className={`grid size-7 place-items-center rounded-full ${isProductOwner ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200" : "bg-[var(--tenant-secondary)] text-[var(--tenant-primary)]"}`}>
            {isProductOwner ? <ShieldCheck className="size-4" /> : <UserRound className="size-4" />}
          </span>
          <div className="hidden text-left lg:block">
            <span className="block text-sm font-medium leading-none">
              {session?.user.displayName ?? session?.user.username}
            </span>
            {isProductOwner && (
              <span className="block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                Super Admin
              </span>
            )}
          </div>
          <ChevronDown className="size-4" aria-hidden />
        </button>
        {menuOpen && (
          <div role="menu" className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <button type="button" role="menuitem" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"><LogOut className="size-4" />Sign out</button>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate("/account/change-password"); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><KeyRound className="size-4" />Change password</button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}

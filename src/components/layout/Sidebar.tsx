import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

import { sidebarConfiguration, productOwnerSidebarConfiguration } from "../../config/sidebar.config";

import { SidebarMenuItem } from "../navigation/SidebarMenuItem";
import { useAccountingAccess } from "../../features/accounting/AccountingAccess";
import { useAuth } from "../../features/auth/AuthContext";
import type { NavigationItem } from "../../types/navigation";

interface SidebarProps {
  collapsed: boolean;

  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { isOwner } = useAccountingAccess();
  const { isProductOwner } = useAuth();

  const filter = (items: NavigationItem[]): NavigationItem[] => items
    .filter(item => item.id !== "staff-access" || isOwner)
    .map(item => ({ ...item, children: item.children ? filter(item.children) : undefined }));

  const activeNavItems = isProductOwner
    ? productOwnerSidebarConfiguration
    : filter(sidebarConfiguration);

  return (
    <aside
      className={[
        "relative flex h-full flex-col",
        "border-r border-slate-200",
        "bg-white",
        "dark:border-slate-800",
        "dark:bg-slate-900",
        "transition-all duration-300",

        collapsed ? "w-[72px]" : "w-[260px]",
      ].join(" ")}
    >
      <div
        className="
          flex-1
          overflow-y-auto
          px-3
          py-4
        "
      >
        {isProductOwner && !collapsed && (
          <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/40">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
              <ShieldCheck className="size-4 text-indigo-600 dark:text-indigo-400" />
              <span>Product Owner Console</span>
            </div>
            <p className="mt-1 text-[11px] text-indigo-700 dark:text-indigo-300">
              Platform & multi-tenant control plane
            </p>
          </div>
        )}

        <nav aria-label="Main navigation" className="space-y-1">
          {activeNavItems.map((item) => (
            <SidebarMenuItem key={item.id} item={item} collapsed={collapsed} />
          ))}
        </nav>
      </div>

      <div
        className="
          border-t
          border-slate-200
          p-3
          dark:border-slate-800
        "
      >
        <button
          type="button"
          onClick={onToggle}
          className="
            flex
            w-full
            items-center
            justify-center
            rounded-lg
            border
            border-slate-200
            p-2
            text-slate-600
            transition-all
            duration-300
            hover:bg-slate-100

            dark:border-slate-700
            dark:text-slate-300
            dark:hover:bg-slate-800
          "
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}

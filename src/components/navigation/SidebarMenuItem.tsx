import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { NavLink, useLocation } from "react-router-dom";

import type { NavigationItem } from "../../types/navigation";

interface SidebarMenuItemProps {
  item: NavigationItem;

  collapsed?: boolean;

  level?: number;
}

function hasActiveDescendant(item: NavigationItem, pathname: string): boolean {
  if (
    item.path &&
    (pathname === item.path || pathname.startsWith(`${item.path}/`))
  ) {
    return true;
  }
  return item.children?.some((child) => hasActiveDescendant(child, pathname)) ?? false;
}

export function SidebarMenuItem({
  item,
  collapsed = false,
  level = 0,
}: SidebarMenuItemProps) {
  const location = useLocation();

  const hasChildren = Boolean(item.children?.length);

  const isChildActive = item.children?.some((child) =>
    hasActiveDescendant(child, location.pathname),
  );

  const [expanded, setExpanded] = useState(Boolean(isChildActive));

  useEffect(() => {
    if (isChildActive) {
      setExpanded(true);
    }
  }, [isChildActive]);

  if (item.hidden) {
    return null;
  }

  const Icon = item.icon;

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          disabled={item.disabled}
          onClick={() => setExpanded((current) => !current)}
          className={[
            "flex w-full items-center rounded-lg",
            "transition-all duration-300",
            "text-slate-600",
            "dark:text-slate-300",
            "hover:bg-slate-100",
            "dark:hover:bg-slate-800",
            "focus:outline-none",
            "focus:ring-2",
            "focus:ring-[var(--tenant-primary)]/30",
            collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
            isChildActive
              ? "bg-slate-100 text-[var(--tenant-primary)] dark:bg-slate-800"
              : "",
          ].join(" ")}
          aria-expanded={expanded}
        >
          {Icon && <Icon size={20} className="shrink-0" />}

          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sm font-medium">
                {item.label}
              </span>

              {expanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </>
          )}
        </button>

        {!collapsed && expanded && (
          <div
            className="
              mt-1
              space-y-1
              border-l
              border-slate-200
              pl-3
              dark:border-slate-700
            "
            style={{
              marginLeft: level === 0 ? "1.35rem" : undefined,
            }}
          >
            {item.children?.map((child) => (
              <SidebarMenuItem
                key={child.id}
                item={child}
                collapsed={false}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!item.path) {
    return null;
  }

  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        [
          "flex items-center rounded-lg",
          "transition-all duration-300",
          "focus:outline-none",
          "focus:ring-2",
          "focus:ring-[var(--tenant-primary)]/30",

          collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",

          isActive
            ? `
                bg-[var(--tenant-primary)]/10
                text-[var(--tenant-primary)]
                font-semibold
              `
            : `
                text-slate-600
                hover:bg-slate-100
                dark:text-slate-300
                dark:hover:bg-slate-800
              `,
        ].join(" ")
      }
    >
      {Icon && <Icon size={20} className="shrink-0" />}

      {!collapsed && <span className="text-sm">{item.label}</span>}
    </NavLink>
  );
}

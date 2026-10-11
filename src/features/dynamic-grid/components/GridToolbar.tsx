import {
  Check,
  ChevronDown,
  Download,
  ListFilter,
  RefreshCw,
  Search,
  Settings2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GridColumn, GridDensity } from "../../../types/grid";

interface GridToolbarProps<TData> {
  search: string;
  onSearchChange: (value: string) => void;
  searchable: boolean;
  columns: GridColumn<TData>[];
  visibility: Record<string, boolean>;
  onToggleColumn: (columnId: string) => void;
  showColumnVisibility: boolean;
  density: GridDensity;
  onDensityChange: (density: GridDensity) => void;
  showDensity: boolean;
  showFilters: boolean;
  filtersVisible: boolean;
  onToggleFilters: () => void;
  showExport: boolean;
  onExport: () => void;
  onRefresh?: () => void;
  isLoading: boolean;
  selectedCount: number;
}

export function GridToolbar<TData>({
  search,
  onSearchChange,
  searchable,
  columns,
  visibility,
  onToggleColumn,
  showColumnVisibility,
  density,
  onDensityChange,
  showDensity,
  showFilters,
  filtersVisible,
  onToggleFilters,
  showExport,
  onExport,
  onRefresh,
  isLoading,
  selectedCount,
}: GridToolbarProps<TData>) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target))
        setSettingsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 p-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {searchable ? (
          <label className="relative min-w-48 flex-1 sm:max-w-sm">
            <span className="sr-only">Search grid</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search all visible columns..."
              autoComplete="off"
              className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[var(--tenant-primary)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            {isLoading ? (
              <RefreshCw
                className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-400"
                aria-hidden
              />
            ) : null}
          </label>
        ) : null}

        {selectedCount > 0 ? (
          <span className="rounded-full bg-[var(--tenant-secondary)] px-2.5 py-1 text-xs font-semibold text-[var(--tenant-primary)]">
            {selectedCount} selected
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showFilters ? (
          <button
            type="button"
            onClick={onToggleFilters}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition-colors ${filtersVisible ? "border-[var(--tenant-primary)] bg-[var(--tenant-secondary)] text-[var(--tenant-primary)]" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"}`}
          >
            <ListFilter className="size-4" aria-hidden /> Filters
          </button>
        ) : null}

        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`size-4 ${isLoading ? "animate-spin" : ""}`}
              aria-hidden
            />{" "}
            Refresh
          </button>
        ) : null}

        {showExport ? (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="size-4" aria-hidden /> Export CSV
          </button>
        ) : null}

        {showColumnVisibility || showDensity ? (
          <div className={`relative ${settingsOpen ? "z-50" : ""}`} ref={menuRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={settingsOpen}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Settings2 className="size-4" aria-hidden /> View{" "}
              <ChevronDown className="size-4" aria-hidden />
            </button>

            {settingsOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 flex max-h-[min(80vh,32rem)] w-72 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
              >
                {showDensity ? (
                  <div className="border-b border-slate-200 p-2 dark:border-slate-800">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Density
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        ["compact", "comfortable", "spacious"] as GridDensity[]
                      ).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => onDensityChange(item)}
                          className={`rounded-md px-2 py-2 text-xs font-semibold capitalize ${density === item ? "bg-[var(--tenant-secondary)] text-[var(--tenant-primary)]" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                        >
                          {item === "comfortable" ? "Normal" : item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {showColumnVisibility ? (
                  <div className="max-h-[min(70vh,28rem)] min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Columns
                    </p>
                    {columns.map((column) => (
                      <button
                        key={column.id}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={visibility[column.id] !== false}
                        onClick={() => onToggleColumn(column.id)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <span>{column.header}</span>
                        {visibility[column.id] !== false ? (
                          <Check
                            className="size-4 text-[var(--tenant-primary)]"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

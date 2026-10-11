import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface GridPaginationProps {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  pageSizeOptions: number[];
  onPageIndexChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
}

export function GridPagination({
  pageIndex,
  pageSize,
  totalCount,
  pageSizeOptions,
  onPageIndexChange,
  onPageSizeChange,
}: GridPaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(pageIndex, pageCount - 1);
  const start = totalCount === 0 ? 0 : safePage * pageSize + 1;
  const end = Math.min((safePage + 1) * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-2 border-t border-slate-200 px-3 py-2 text-xs dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <span>Rows per page</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-8 rounded-md border border-slate-300 bg-white px-2 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          aria-label="Rows per page"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="hidden sm:inline">
          {start}-{end} of {totalCount.toLocaleString()}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className="text-slate-500 dark:text-slate-400">
          Page {safePage + 1} of {pageCount}
        </span>
        <div className="flex items-center gap-1">
          {[
            {
              label: "First page",
              icon: ChevronFirst,
              target: 0,
              disabled: safePage === 0,
            },
            {
              label: "Previous page",
              icon: ChevronLeft,
              target: safePage - 1,
              disabled: safePage === 0,
            },
            {
              label: "Next page",
              icon: ChevronRight,
              target: safePage + 1,
              disabled: safePage >= pageCount - 1,
            },
            {
              label: "Last page",
              icon: ChevronLast,
              target: pageCount - 1,
              disabled: safePage >= pageCount - 1,
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              aria-label={item.label}
              title={item.label}
              onClick={() => onPageIndexChange(item.target)}
              disabled={item.disabled}
              className="inline-flex size-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <item.icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import type {
  GridColumn,
  GridColumnFilter,
  GridDensity,
  GridQuery,
  GridSort,
} from "../../../types/grid";

export function getColumnValue<TData>(
  row: TData,
  column: GridColumn<TData>,
): unknown {
  if (column.valueGetter) return column.valueGetter(row);
  const accessor = column.accessorKey ?? column.accessor;
  if (accessor) return row[accessor];
  return undefined;
}

function normalize(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.join(" ").toLocaleLowerCase();
  return String(value).toLocaleLowerCase();
}

export function applyClientSearch<TData>(
  rows: TData[],
  columns: GridColumn<TData>[],
  search: string,
): TData[] {
  const term = search.trim().toLocaleLowerCase();
  if (!term) return rows;

  const searchableColumns = columns.filter(
    (column) => column.searchable !== false && !column.hidden,
  );
  return rows.filter((row) =>
    searchableColumns.some((column) =>
      normalize(getColumnValue(row, column)).includes(term),
    ),
  );
}

export function applyClientFilters<TData>(
  rows: TData[],
  columns: GridColumn<TData>[],
  filters: GridColumnFilter[],
): TData[] {
  if (filters.length === 0) return rows;
  const columnMap = new Map(columns.map((column) => [column.id, column]));

  return rows.filter((row) =>
    filters.every((filter) => {
      if (!filter.value.trim()) return true;
      const column = columnMap.get(filter.field);
      if (!column) return true;

      const raw = getColumnValue(row, column);
      const current = normalize(raw);
      const expected = filter.value.toLocaleLowerCase();
      const operator = filter.operator ?? column.filterOperator ?? "contains";

      if (["gt", "gte", "lt", "lte"].includes(operator)) {
        const left = Number(raw);
        const right = Number(filter.value);
        if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
        if (operator === "gt") return left > right;
        if (operator === "gte") return left >= right;
        if (operator === "lt") return left < right;
        return left <= right;
      }

      if (operator === "equals") return current === expected;
      if (operator === "startsWith") return current.startsWith(expected);
      if (operator === "endsWith") return current.endsWith(expected);
      return current.includes(expected);
    }),
  );
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function applyClientSorting<TData>(
  rows: TData[],
  columns: GridColumn<TData>[],
  sorting: GridSort[],
): TData[] {
  if (sorting.length === 0) return rows;
  const columnMap = new Map(columns.map((column) => [column.id, column]));

  return [...rows].sort((left, right) => {
    for (const sort of sorting) {
      const column = columnMap.get(sort.field);
      if (!column) continue;
      const result = compare(
        getColumnValue(left, column),
        getColumnValue(right, column),
      );
      if (result !== 0) return sort.direction === "asc" ? result : -result;
    }
    return 0;
  });
}

export function processClientRows<TData>(
  rows: TData[],
  columns: GridColumn<TData>[],
  query: GridQuery,
) {
  const searched = applyClientSearch(rows, columns, query.search);
  const filtered = applyClientFilters(searched, columns, query.filters);
  const sorted = applyClientSorting(filtered, columns, query.sort);
  const start = query.pageIndex * query.pageSize;
  return {
    rows: sorted.slice(start, start + query.pageSize),
    totalCount: sorted.length,
  };
}

export function densityClasses(density: GridDensity): string {
  if (density === "compact") return "py-2";
  if (density === "spacious") return "py-4";
  return "py-3";
}

export function toCsv<TData>(
  rows: TData[],
  columns: GridColumn<TData>[],
): string {
  const visible = columns.filter(
    (column) => column.exportable !== false && !column.hidden,
  );
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  };

  return [
    visible.map((column) => escape(column.header)).join(","),
    ...rows.map((row) =>
      visible.map((column) => escape(getColumnValue(row, column))).join(","),
    ),
  ].join("\n");
}

export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

import type { ReactNode } from "react";

export type GridMode = "client" | "server";

export type GridSortDirection = "asc" | "desc";

export type GridDensity = "compact" | "comfortable" | "spacious";

export type GridAlign = "left" | "center" | "right";

export type GridEditorType =
  "text" | "number" | "email" | "tel" | "select" | "textarea";

export type GridFilterOperator =
  | "contains"
  | "equals"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export interface GridSort {
  field: string;
  direction: GridSortDirection;
}

export interface GridColumnFilter {
  field: string;
  value: string;
  operator?: GridFilterOperator;
}

export interface GridQuery {
  pageIndex: number;
  pageSize: number;
  search: string;
  sort: GridSort[];
  filters: GridColumnFilter[];
}

export interface GridResult<TData> {
  rows: TData[];
  totalCount: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface GridOption {
  label: string;
  value: string;
  disabled?: boolean;
}

/**
 * Kept for advanced custom-cell scenarios.
 */
export interface GridCellContext<TData> {
  row: TData;
  value: unknown;
  rowIndex: number;
}

/**
 * IMPORTANT:
 *
 * cell(value, row, context)
 *
 * This supports:
 *
 * cell: (_, row) => (...)
 *
 * which was causing the previous TypeScript error.
 */
export interface GridColumn<TData> {
  id: string;

  header: string;

  /**
   * New preferred property.
   */
  accessorKey?: keyof TData;

  /**
   * Backward compatibility with older V3/V4 configuration.
   */
  accessor?: keyof TData;

  valueGetter?: (row: TData) => unknown;

  cell?: (
    value: unknown,
    row: TData,
    context: GridCellContext<TData>,
  ) => ReactNode;

  /** Optional rich content shown in the grid's card-style cell tooltip. */
  tooltip?: (value: unknown, row: TData) => ReactNode;

  sortable?: boolean;

  searchable?: boolean;

  filterable?: boolean;

  filterOperator?: GridFilterOperator;

  filterOptions?: GridOption[];

  align?: GridAlign;

  /** Include this monetary column in the grid's current-page total footer. */
  isAmount?: boolean;

  /** Defaults to true for amount columns. */
  showTotal?: boolean;

  /** Overrides the default INR currency display for the total. */
  totalFormatter?: (total: number) => ReactNode;

  width?: number;

  minWidth?: number;

  hidden?: boolean;

  exportable?: boolean;

  /*
   * Inline editing
   */
  editable?: boolean;

  editor?: GridEditorType;

  options?: GridOption[];
}

export interface GridServerSource<TData> {
  load: (query: GridQuery, signal?: AbortSignal) => Promise<GridResult<TData>>;
}

export type GridActionId = "view" | "edit" | "delete";

export interface GridAction<TData> {
  id: GridActionId | string;

  label: string;

  icon?: "view" | "edit" | "delete" | "save" | "cancel" | "history";

  onClick: (row: TData) => void | Promise<void>;

  hidden?: (row: TData) => boolean;

  disabled?: (row: TData) => boolean;

  variant?: "default" | "danger";
}

export interface GridEditContext<TData> {
  row: TData;

  rowId: string;

  values: Record<string, unknown>;
}

export interface GridInlineEditConfig<TData> {
  enabled?: boolean;

  editableFields?: string[];

  onSave: (context: GridEditContext<TData>) => void | Promise<void>;

  onCancel?: (context: GridEditContext<TData>) => void;

  validate?: (context: GridEditContext<TData>) => Record<string, string>;
}

export interface DynamicGridProps<TData> {
  title?: string;

  description?: string;

  columns: GridColumn<TData>[];

  mode?: GridMode;

  data?: TData[];

  serverSource?: GridServerSource<TData>;

  /** Changes to this value trigger a server-data reload. */
  refreshKey?: number;

  getRowId: (row: TData) => string;

  pageSizeOptions?: number[];

  initialPageSize?: number;
  initialSort?: GridSort[];
  initialSearch?: string;

  defaultPageSize?: number;

  searchable?: boolean;

  selectable?: boolean;
  showColumnFilters?: boolean;
  showColumnVisibility?: boolean;
  showDensity?: boolean;
  showExport?: boolean;
  stickyHeader?: boolean;
  emptyMessage?: string;
  onSelectionChange?: (rows: TData[]) => void;

  actions?: GridAction<TData>[];

  inlineEdit?: GridInlineEditConfig<TData>;

  onView?: (row: TData) => void;

  onEdit?: (row: TData) => void;

  onDelete?: (row: TData) => void | Promise<void>;

  onRowClick?: (row: TData) => void;
}

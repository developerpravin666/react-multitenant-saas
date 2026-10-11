import { History as HistoryIcon, Plus, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useNotifications } from "../../context/NotificationContext";
import { DynamicForm } from "../dynamic-form/DynamicForm";
import { DynamicGrid } from "../dynamic-grid/DynamicGrid";
import type { FormFieldConfig } from "../../types/form";
import type { GridAction, GridColumn, GridServerSource } from "../../types/grid";
import { type ResourceRecord } from "./resourceApi";
import { APP_ROUTES } from "../../config/routes";
import { useAccountingAccess, writePermission } from "../accounting/AccountingAccess";

interface ResourceApi<T extends ResourceRecord> {
  list: (force?: boolean) => Promise<T[]>;
  serverSource: GridServerSource<T>;
  getById: (id: string) => Promise<T>;
  create: (values: Record<string, unknown>) => Promise<T>;
  update: (id: string, values: Record<string, unknown>) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

interface BulkAction<T extends ResourceRecord> {
  label: string;
  maximumRecords?: number;
  onClick: (records: T[]) => void;
}

export interface ResourcePageProps<T extends ResourceRecord> {
  title: string;
  description: string;
  singular: string;
  listPath: string;
  addPath: string;
  editPath: (id: string) => string;
  columns: GridColumn<T>[];
  fields?: FormFieldConfig[];
  loadFields?: (record?: T) => Promise<FormFieldConfig[]>;
  afterCreatePath?: (record: T) => string;
  initialValues?: Record<string, unknown>;
  columnsPerRow?: 2 | 3 | 4;
  api: ResourceApi<T>;
  auditTableName?: string;
  bulkAction?: BulkAction<T>;
  hideEdit?: (record: T) => boolean;
  hideDelete?: (record: T) => boolean;
}

function detailValue<T extends ResourceRecord>(record: T, column: GridColumn<T>) {
  const value = column.valueGetter
    ? column.valueGetter(record)
    : record[column.accessorKey ?? column.accessor ?? (column.id as keyof T)];
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
}

export function ResourceListPage<T extends ResourceRecord>(
  props: ResourcePageProps<T>,
) {
  const { title, description, singular, addPath, editPath, columns, api } =
    props;
  const navigate = useNavigate();
  const { can } = useAccountingAccess();
  const permission = writePermission(addPath);
  const canWrite = !permission || can(permission);
  const notifications = useNotifications();
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewingRecord, setViewingRecord] = useState<T | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<T[]>([]);
  const getRecordId = useCallback((record: T) => record.id, []);
  useEffect(() => {
    if (!viewingRecord) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewingRecord(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewingRecord]);

  const deleteRecord = async (record: T) => {
    const confirmed = await notifications.confirm({
      title: `Delete ${singular}?`,
      message: `This will permanently delete this ${singular.toLowerCase()}.`,
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!confirmed) return;
    try {
      await api.remove(record.id);
      setRefreshKey((key) => key + 1);
      notifications.success(`${singular} deleted`, "The record was deleted successfully.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : `Unable to delete ${singular.toLowerCase()}.`;
      setError(message);
      notifications.error(`${singular} could not be deleted`, message);
    }
  };

  const rowActions: GridAction<T>[] = [
    { id: "view", label: "View", icon: "view", onClick: setViewingRecord },
    ...(props.auditTableName ? [{
      id: "audit-history",
      label: "Audit History",
      icon: "history" as const,
      onClick: (record: T) => navigate(`${APP_ROUTES.settings.auditLogs}?tableName=${encodeURIComponent(props.auditTableName!)}&recordId=${encodeURIComponent(record.id)}`),
    }] : []),
    {
      id: "edit",
      label: "Edit",
      icon: "edit",
      onClick: (record) => navigate(editPath(record.id)),
      hidden: (record) => !canWrite || Boolean(props.hideEdit?.(record)),
    },
    {
      id: "delete",
      label: "Delete",
      icon: "delete",
      variant: "danger",
      onClick: deleteRecord,
      hidden: (record) => !canWrite || Boolean(props.hideDelete?.(record)),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
        <div className="flex gap-2">
          {props.bulkAction && canWrite ? (
            <Button
              variant="secondary"
              disabled={selectedRecords.length === 0 || selectedRecords.length > (props.bulkAction.maximumRecords ?? 500)}
              onClick={() => props.bulkAction?.onClick(selectedRecords)}
            >
              {props.bulkAction.label} ({selectedRecords.length})
            </Button>
          ) : null}
          {props.auditTableName ? <Button variant="secondary" onClick={() => navigate(`${APP_ROUTES.settings.auditLogs}?tableName=${encodeURIComponent(props.auditTableName!)}`)}><HistoryIcon size={16} /> Audit History</Button> : null}
          <Button variant="secondary" onClick={() => setRefreshKey((key) => key + 1)}>
            <RefreshCw size={16} /> Refresh
          </Button>
          {canWrite && <Button onClick={() => navigate(addPath)}>
            <Plus size={17} /> Add {singular}
          </Button>}
        </div>
      </div>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}
      <DynamicGrid
        key={title}
        title={`${title} List`}
        columns={columns}
        mode="server"
        serverSource={api.serverSource}
        refreshKey={refreshKey}
        getRowId={getRecordId}
        actions={rowActions}
        onSelectionChange={props.bulkAction ? setSelectedRecords : undefined}
        emptyMessage={`No ${title.toLowerCase()} have been created yet.`}
      />
      {viewingRecord ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewingRecord(null);
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="record-details-title" className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h3 id="record-details-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">{singular} details</h3>
              <button type="button" aria-label="Close details" onClick={() => setViewingRecord(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
            </div>
            <dl className="grid max-h-[70vh] grid-cols-1 gap-x-6 gap-y-4 overflow-y-auto p-6 sm:grid-cols-2">
              {columns.map((column) => <div key={column.id}>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{column.header}</dt>
                <dd className="mt-1 break-words text-sm text-slate-800 dark:text-slate-100">{detailValue(viewingRecord, column)}</dd>
              </div>)}
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ResourceFormPage<T extends ResourceRecord>(
  props: ResourcePageProps<T> & { mode: "create" | "edit" },
) {
  const { mode, title, singular, listPath, fields, loadFields, afterCreatePath, initialValues, columnsPerRow = 2, api } = props;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<FormFieldConfig[] | null>(
    fields ?? null,
  );
  const loaded = useRef(false);

  const load = useCallback(async () => {
    if (mode !== "edit" || !id) return;
    try {
      setError(null);
      setRecord(await api.getById(id));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : `Unable to load ${singular.toLowerCase()}.`,
      );
    }
  }, [api, id, mode, singular]);
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      void load();
    }
  }, [load]);

  useEffect(() => {
    if (fields) {
      setFormFields(fields);
      return;
    }
    if (!loadFields) return;
    if (mode === "edit" && !record) return;
    void loadFields(record ?? undefined)
      .then(setFormFields)
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Unable to load form data.",
        ),
      );
  }, [fields, loadFields, mode, record]);

  if (error)
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
      >
        {error}
      </div>
    );
  if (mode === "edit" && !record)
    return (
      <p className="text-sm text-slate-500">
        Loading {singular.toLowerCase()}…
      </p>
    );
  if (!formFields) return <p className="text-sm text-slate-500">Loading form…</p>;

  return (
    <DynamicForm
      title={mode === "create" ? `Add ${singular}` : `Update ${singular}`}
      description={
        mode === "create"
          ? `Create a new ${singular.toLowerCase()}.`
          : `Update the ${singular.toLowerCase()} details.`
      }
      fields={formFields}
      columnsPerRow={columnsPerRow}
      initialValues={mode === "edit" ? record ?? undefined : initialValues}
      submitLabel={mode === "create" ? `Create ${singular}` : "Save Changes"}
      onCancel={() => navigate(listPath)}
      onSubmit={async (values) => {
        if (mode === "create") {
          const created = await api.create(values);
          navigate(afterCreatePath?.(created) ?? listPath);
          return;
        }
        else {
          // `id` is not a visible/registered form field. Preserve the canonical
          // identifier returned by GET so APIs that require it in a PUT payload
          // receive it along with the edited values.
          await api.update(record!.id, { ...values, id: record!.id });
        }
        navigate(listPath);
      }}
    />
  );
}

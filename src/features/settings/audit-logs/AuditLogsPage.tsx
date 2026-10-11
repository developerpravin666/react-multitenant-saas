import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { DynamicGrid } from "../../dynamic-grid/DynamicGrid";
import { apiClient, type PagedData } from "../../../services/apiClient";
import type { GridAction, GridColumn, GridQuery, GridServerSource } from "../../../types/grid";

interface AuditLogRow {
  id: string;
  tableName: string;
  recordId: string;
  action: "Create" | "Update" | "Delete" | string;
  oldValue: string | null;
  newValue: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdDate: string;
  tenantSchema: string;
}

interface AuditLogModule { tableName: string; count: number }

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: string | null) {
  if (!value) return "—";
  try { return JSON.stringify(JSON.parse(value) as unknown, null, 2); }
  catch { return value; }
}

const columns: GridColumn<AuditLogRow>[] = [
  { id: "createdDate", header: "Date & Time", accessor: "createdDate", sortable: true, cell: (value) => new Date(String(value)).toLocaleString() },
  { id: "tableName", header: "Module / Table", accessor: "tableName", sortable: true, cell: (value) => humanize(String(value)) },
  { id: "action", header: "Action", accessor: "action", sortable: true, cell: (value) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${value === "Create" ? "bg-emerald-100 text-emerald-700" : value === "Delete" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{String(value)}</span> },
  { id: "recordId", header: "Record ID", accessor: "recordId", searchable: true, cell: (value) => <span className="font-mono text-xs">{String(value)}</span> },
  { id: "createdByName", header: "Changed By", accessor: "createdByName", sortable: true, cell: (value, row) => String(value ?? row.createdBy ?? "System") },
  { id: "oldValue", header: "Old Value", accessor: "oldValue", hidden: true, cell: (value) => <span className="block max-w-56 truncate font-mono text-xs">{value ? String(value) : "—"}</span> },
  { id: "newValue", header: "New Value", accessor: "newValue", hidden: true, cell: (value) => <span className="block max-w-56 truncate font-mono text-xs">{value ? String(value) : "—"}</span> },
  { id: "tenantSchema", header: "Tenant", accessor: "tenantSchema", hidden: true },
];

function queryParams(query: GridQuery, filters: { tableName: string; action: string; recordId: string; fromDate: string; toDate: string }) {
  const params = new URLSearchParams({ page: String(query.pageIndex + 1), pageSize: String(query.pageSize), search: query.search });
  const sort = query.sort[0];
  if (sort) { params.set("sortBy", query.sort.map((item) => item.field).join(",")); params.set("sortDirection", query.sort.map((item) => item.direction).join(",")); }
  if (filters.tableName) params.set("tableName", filters.tableName);
  if (filters.action) params.set("action", filters.action);
  if (filters.recordId.trim()) params.set("recordId", filters.recordId.trim());
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  return params;
}

export function AuditLogsPage() {
  const [searchParams] = useSearchParams();
  const [modules, setModules] = useState<AuditLogModule[]>([]);
  const [tableName, setTableName] = useState(() => searchParams.get("tableName") ?? "");
  const [action, setAction] = useState("");
  const [recordId, setRecordId] = useState(() => searchParams.get("recordId") ?? "");
  const [recordFilter, setRecordFilter] = useState(() => searchParams.get("recordId") ?? "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<AuditLogRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiClient.get<AuditLogModule[]>("/audit-logs/modules")
      .then(setModules)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load audit modules."));
  }, []);

  const filters = useMemo(() => ({ tableName, action, recordId: recordFilter, fromDate, toDate }), [tableName, action, recordFilter, fromDate, toDate]);
  const source = useMemo<GridServerSource<AuditLogRow>>(() => ({
    async load(query, signal): Promise<{ rows: AuditLogRow[]; totalCount: number; page: number; pageSize: number; totalPages: number }> {
      const page = await apiClient.get<PagedData<AuditLogRow>>(`/audit-logs?${queryParams(query, filters)}`, { signal });
      return { rows: page.items, totalCount: page.totalCount, page: page.page, pageSize: page.pageSize, totalPages: page.totalPages };
    },
  }), [filters]);

  const actions: GridAction<AuditLogRow>[] = useMemo(() => [
    { id: "view", label: "View change details", icon: "view", onClick: setSelected },
  ], []);

  const filterChanged = useCallback(() => setRefreshKey((key) => key + 1), []);
  const inputClass = "rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

  return (
    <section className="space-y-3">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Review changes across tenant modules, including who changed each record and its before and after values.</p>
      </header>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <label className="flex flex-col gap-1 text-xs font-medium">Module / table<select className={inputClass} value={tableName} onChange={(event) => { setTableName(event.target.value); filterChanged(); }}><option value="">All modules</option>{modules.map((module) => <option key={module.tableName} value={module.tableName}>{humanize(module.tableName)} ({module.count})</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs font-medium">Action<select className={inputClass} value={action} onChange={(event) => { setAction(event.target.value); filterChanged(); }}><option value="">All actions</option><option value="Create">Create</option><option value="Update">Update</option><option value="Delete">Delete</option></select></label>
        <label className="flex flex-col gap-1 text-xs font-medium">Record ID<input className={inputClass} value={recordId} onChange={(event) => setRecordId(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { setRecordFilter(recordId); filterChanged(); } }} placeholder="Filter by record ID" /></label>
        <label className="flex flex-col gap-1 text-xs font-medium">From<input type="date" className={inputClass} value={fromDate} onChange={(event) => { setFromDate(event.target.value); filterChanged(); }} /></label>
        <label className="flex flex-col gap-1 text-xs font-medium">To<input type="date" className={inputClass} value={toDate} onChange={(event) => { setToDate(event.target.value); filterChanged(); }} /></label>
        <Button variant="secondary" onClick={() => { setTableName(""); setAction(""); setRecordId(""); setRecordFilter(""); setFromDate(""); setToDate(""); filterChanged(); }}>Clear filters</Button>
      </div>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <DynamicGrid
        title="All Changes"
        description="Search values, module names, record IDs, actions, or user names. Select a row action to inspect the full change."
        columns={columns}
        mode="server"
        serverSource={source}
        refreshKey={refreshKey}
        getRowId={(row) => row.id}
        actions={actions}
        initialSort={[{ field: "createdDate", direction: "desc" }]}
        emptyMessage="No audit entries match the selected filters. New entity changes will appear here."
      />

      {selected ? <div role="presentation" className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="audit-details-title" className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800"><div><h2 id="audit-details-title" className="font-semibold">{humanize(selected.tableName)} · {selected.action}</h2><p className="text-xs text-slate-500">Record {selected.recordId} · {new Date(selected.createdDate).toLocaleString()} · {selected.createdByName ?? selected.createdBy ?? "System"}</p></div><button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close audit details" onClick={() => setSelected(null)}><X size={18} /></button></header>
          <div className="grid max-h-[78vh] gap-3 overflow-y-auto p-4 lg:grid-cols-2"><div><h3 className="mb-1 text-sm font-semibold">Old value</h3><pre className="max-h-[65vh] overflow-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-950">{formatValue(selected.oldValue)}</pre></div><div><h3 className="mb-1 text-sm font-semibold">New value</h3><pre className="max-h-[65vh] overflow-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-950">{formatValue(selected.newValue)}</pre></div></div>
        </section>
      </div> : null}
    </section>
  );
}

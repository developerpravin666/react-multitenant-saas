import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Database,
  ShieldCheck,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  Server,
  Edit2,
  X,
  Check,
  ChevronDown
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { useNotifications } from "../../context/NotificationContext";

export interface TableItem {
  id: string;
  schemaName: string;
  tableName: string;
  displayName: string;
  tableType: "Master" | "Data";
  category: string;
  description: string;
  isSystem: boolean;
  rowCount: number;
  createdAt: string;
  modifiedAt?: string | null;
}

export interface TableDashboardData {
  activeSchema: string;
  availableSchemas: string[];
  totalTables: number;
  masterTables: number;
  dataTables: number;
  totalDataRecords: number;
  tables: TableItem[];
}

export function TableManagementDashboardPage() {
  const notifications = useNotifications();

  const [data, setData] = useState<TableDashboardData | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [updatingTable, setUpdatingTable] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Master" | "Data">("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Modals
  const [clearTableModal, setClearTableModal] = useState<TableItem | null>(null);
  const [clearing, setClearing] = useState(false);

  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [confirmClearAllText, setConfirmClearAllText] = useState("");

  const [editingTable, setEditingTable] = useState<TableItem | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchTables = useCallback(async (schemaToLoad?: string) => {
    setLoading(true);
    try {
      const query = schemaToLoad ? `?schema=${encodeURIComponent(schemaToLoad)}` : "";
      const res = await apiClient.get<TableDashboardData>(`/admin/tables${query}`);
      setData(res);
      if (!selectedSchema && res.activeSchema) {
        setSelectedSchema(res.activeSchema);
      }
    } catch (err) {
      notifications.error("Failed to load tables", err instanceof Error ? err.message : "Error loading table registry");
    } finally {
      setLoading(false);
    }
  }, [notifications, selectedSchema]);

  useEffect(() => {
    void fetchTables(selectedSchema || undefined);
  }, [selectedSchema, fetchTables]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const query = selectedSchema ? `?schema=${encodeURIComponent(selectedSchema)}` : "";
      await apiClient.post(`/admin/tables/sync${query}`, {});
      notifications.success("Sync Complete", "Catalog synchronized with current PostgreSQL database tables.");
      await fetchTables(selectedSchema);
    } catch (err) {
      notifications.error("Sync Failed", err instanceof Error ? err.message : "Failed to sync tables");
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateType = async (table: TableItem, newType: "Master" | "Data") => {
    setUpdatingTable(table.tableName);
    try {
      const query = selectedSchema ? `?schema=${encodeURIComponent(selectedSchema)}` : "";
      await apiClient.put(`/admin/tables/${encodeURIComponent(table.tableName)}/type${query}`, {
        tableType: newType,
        displayName: table.displayName,
        category: table.category,
        description: table.description,
        schema: selectedSchema
      });

      setData((prev) => {
        if (!prev) return null;
        const updated = prev.tables.map((t) =>
          t.tableName === table.tableName ? { ...t, tableType: newType } : t
        );
        return {
          ...prev,
          masterTables: updated.filter((t) => t.tableType === "Master").length,
          dataTables: updated.filter((t) => t.tableType === "Data").length,
          tables: updated,
        };
      });

      notifications.success(
        "Table Type Updated",
        `Table '${table.tableName}' is now marked as ${newType}.`
      );
    } catch (err) {
      notifications.error("Update Failed", err instanceof Error ? err.message : "Failed to update table type");
    } finally {
      setUpdatingTable(null);
    }
  };

  const handleClearSingleTable = async () => {
    if (!clearTableModal) return;
    setClearing(true);
    try {
      const query = selectedSchema ? `?schema=${encodeURIComponent(selectedSchema)}` : "";
      await apiClient.post(`/admin/tables/${encodeURIComponent(clearTableModal.tableName)}/clear${query}`, {});

      notifications.success(
        "Data Cleared",
        `All data in table '${clearTableModal.tableName}' has been cleared.`
      );

      setData((prev) => {
        if (!prev) return null;
        const updated = prev.tables.map((t) =>
          t.tableName === clearTableModal.tableName ? { ...t, rowCount: 0 } : t
        );
        const newDataRecords = updated
          .filter((t) => t.tableType === "Data")
          .reduce((sum, t) => sum + t.rowCount, 0);

        return {
          ...prev,
          totalDataRecords: newDataRecords,
          tables: updated,
        };
      });

      setClearTableModal(null);
    } catch (err) {
      notifications.error("Clear Failed", err instanceof Error ? err.message : "Failed to clear table data");
    } finally {
      setClearing(false);
    }
  };

  const handleClearAllData = async () => {
    if (confirmClearAllText.trim().toUpperCase() !== "CLEAR DATA") {
      notifications.error("Confirmation Required", "Please type 'CLEAR DATA' to confirm wiping all transactional data.");
      return;
    }

    setClearingAll(true);
    try {
      const query = selectedSchema ? `?schema=${encodeURIComponent(selectedSchema)}` : "";
      const res = await apiClient.post<{ clearedCount: number; message: string }>(`/admin/tables/clear-all-data${query}`, {});

      notifications.success("All Data Tables Cleared", res.message || "All transactional data cleared. Master tables preserved.");
      setShowClearAllModal(false);
      setConfirmClearAllText("");
      await fetchTables(selectedSchema);
    } catch (err) {
      notifications.error("Operation Failed", err instanceof Error ? err.message : "Failed to clear all data tables");
    } finally {
      setClearingAll(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTable) return;
    setSavingEdit(true);
    try {
      const query = selectedSchema ? `?schema=${encodeURIComponent(selectedSchema)}` : "";
      await apiClient.put(`/admin/tables/${encodeURIComponent(editingTable.tableName)}/type${query}`, {
        tableType: editingTable.tableType,
        displayName: editDisplayName.trim() || editingTable.displayName,
        category: editCategory.trim() || editingTable.category,
        description: editDescription.trim(),
        schema: selectedSchema
      });

      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          tables: prev.tables.map((t) =>
            t.tableName === editingTable.tableName
              ? {
                  ...t,
                  displayName: editDisplayName.trim() || t.displayName,
                  category: editCategory.trim() || t.category,
                  description: editDescription.trim(),
                }
              : t
          ),
        };
      });

      notifications.success("Saved", `Metadata for '${editingTable.tableName}' updated.`);
      setEditingTable(null);
    } catch (err) {
      notifications.error("Save Failed", err instanceof Error ? err.message : "Failed to save table details");
    } finally {
      setSavingEdit(false);
    }
  };

  // Distinct categories for filter
  const categories = useMemo(() => {
    if (!data?.tables) return ["All"];
    const cats = Array.from(new Set(data.tables.map((t) => t.category).filter(Boolean)));
    return ["All", ...cats.sort()];
  }, [data]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    if (!data?.tables) return [];
    return data.tables.filter((table) => {
      const matchesSearch =
        search === "" ||
        table.tableName.toLowerCase().includes(search.toLowerCase()) ||
        table.displayName.toLowerCase().includes(search.toLowerCase()) ||
        (table.description && table.description.toLowerCase().includes(search.toLowerCase())) ||
        table.category.toLowerCase().includes(search.toLowerCase());

      const matchesType =
        typeFilter === "All" ||
        table.tableType.toLowerCase() === typeFilter.toLowerCase();

      const matchesCategory =
        categoryFilter === "All" || table.category === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [data, search, typeFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              <Database className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Database Tables & Classification
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Categorize Master vs Data tables. Safely clear transactional data while safeguarding Master reference catalogs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Schema Selector */}
          {data?.availableSchemas && data.availableSchemas.length > 1 && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Server className="size-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">Schema:</span>
              <select
                value={selectedSchema}
                onChange={(e) => setSelectedSchema(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-800 outline-none dark:text-slate-200"
              >
                {data.availableSchemas.map((sch) => (
                  <option key={sch} value={sch} className="dark:bg-slate-900">
                    {sch === "tenant" ? "Control Plane (tenant)" : `Tenant Store (${sch})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing || loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`size-3.5 ${syncing ? "animate-spin text-indigo-600" : ""}`} />
            {syncing ? "Scanning DB…" : "Scan & Sync DB"}
          </button>

          {/* Clear All Data Tables Button */}
          <button
            onClick={() => {
              setConfirmClearAllText("");
              setShowClearAllModal(true);
            }}
            disabled={loading || (data?.dataTables ?? 0) === 0}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/50"
          >
            <Trash2 className="size-3.5" />
            Clear All Data Tables
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Tables */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Recorded Tables</p>
            <Layers className="size-5 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? "…" : data?.totalTables ?? 0}
            </span>
            <span className="text-xs text-slate-500">in schema: {selectedSchema || "default"}</span>
          </div>
        </div>

        {/* Master Tables */}
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white p-4 shadow-sm dark:border-indigo-950 dark:from-indigo-950/20 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">Master Tables (Protected)</p>
            <ShieldCheck className="size-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
              {loading ? "…" : data?.masterTables ?? 0}
            </span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
              Never Deleted
            </span>
          </div>
        </div>

        {/* Data Tables */}
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white p-4 shadow-sm dark:border-emerald-950 dark:from-emerald-950/20 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">Data Tables (Deletable)</p>
            <Database className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {loading ? "…" : data?.dataTables ?? 0}
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
              Transactional
            </span>
          </div>
        </div>

        {/* Total Data Records */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Live Data Rows</p>
            <Sparkles className="size-5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? "…" : (data?.totalDataRecords ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">records in data tables</span>
          </div>
        </div>
      </div>

      {/* Info Alert Box */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
        <Info className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <div>
          <p className="font-semibold">How Table Types Work:</p>
          <p className="mt-1 leading-relaxed text-blue-800 dark:text-blue-300">
            <strong>Master Tables</strong> (e.g., Brands, Variants, Taxes, Store Settings, Users) contain core catalog & configuration references and are strictly locked against data deletion. 
            <strong> Data Tables</strong> (e.g., Sold Products, Invoices, Payments, Customers, Audit Logs) contain transactional history and can be cleared whenever you want to reset demo or cutover test data while leaving all your Master catalogs intact.
          </p>
        </div>
      </div>

      {/* Toolbar / Search & Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search table name, category, or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:bg-slate-800"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
            {(["All", "Master", "Data"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  typeFilter === t
                    ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {t === "All" ? "All Types" : t}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
            <Filter className="size-3 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 outline-none dark:text-slate-300"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="dark:bg-slate-900">
                  {c === "All" ? "All Categories" : c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Table Identifier</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Row Count</th>
                <th className="px-4 py-3">Table Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto size-6 animate-spin text-indigo-500" />
                    <p className="mt-2 text-xs">Loading database table registry…</p>
                  </td>
                </tr>
              ) : filteredTables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Database className="mx-auto size-8 text-slate-300 dark:text-slate-700" />
                    <p className="mt-2 font-medium text-slate-700 dark:text-slate-300">No tables match your filter criteria.</p>
                    <p className="text-xs text-slate-400">Try clearing the search or category filters.</p>
                  </td>
                </tr>
              ) : (
                filteredTables.map((tbl) => {
                  const isMaster = tbl.tableType === "Master";
                  const isBusy = updatingTable === tbl.tableName;

                  return (
                    <tr
                      key={tbl.id}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      {/* Table Name */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {tbl.displayName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {tbl.schemaName}.<span className="font-semibold text-slate-700 dark:text-slate-300">{tbl.tableName}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {tbl.category || "General"}
                        </span>
                      </td>

                      {/* Row Count */}
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono text-xs font-semibold ${
                            tbl.rowCount > 0
                              ? isMaster
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-400"
                          }`}
                        >
                          {tbl.rowCount.toLocaleString()}
                        </span>
                      </td>

                      {/* Table Type Selector */}
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                          {/* Master button */}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              if (!isMaster) void handleUpdateType(tbl, "Master");
                            }}
                            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                              isMaster
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                            title={isMaster ? "Protected Master Table" : "Switch to Master Table"}
                          >
                            <ShieldCheck className="size-3" />
                            Master
                          </button>

                          {/* Data button */}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              if (isMaster) void handleUpdateType(tbl, "Data");
                            }}
                            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                              !isMaster
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                            title={!isMaster ? "Transactional Data Table" : "Switch to Data Table"}
                          >
                            <Database className="size-3" />
                            Data
                          </button>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="max-w-xs truncate px-4 py-3 text-slate-500 dark:text-slate-400">
                        {tbl.description || "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTable(tbl);
                              setEditDisplayName(tbl.displayName);
                              setEditCategory(tbl.category);
                              setEditDescription(tbl.description);
                            }}
                            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            title="Edit metadata"
                          >
                            <Edit2 className="size-3.5" />
                          </button>

                          {/* Clear Table Action */}
                          {isMaster ? (
                            <span
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-400"
                              title="Master table data is protected. Switch type to Data if you want to clear."
                            >
                              <ShieldCheck className="size-3 text-indigo-400" />
                              Protected
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setClearTableModal(tbl)}
                              disabled={tbl.rowCount === 0}
                              className="flex items-center gap-1 rounded border border-red-200 bg-red-50/70 px-2 py-1 text-[11px] font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-30 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/40"
                              title="Clear table data"
                            >
                              <Trash2 className="size-3" />
                              Clear Data
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Confirm Clear Single Table */}
      {clearTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-xl dark:border-red-900/50 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 text-red-600 dark:bg-red-900/50 dark:text-red-300">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Clear Data Table?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Table: <code className="font-semibold text-red-600 dark:text-red-400">{clearTableModal.tableName}</code>
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete all{" "}
              <strong>{clearTableModal.rowCount.toLocaleString()}</strong> records from{" "}
              <strong>{clearTableModal.displayName}</strong>?
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              This action cannot be undone. All Master tables and catalogs will remain unaffected.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setClearTableModal(null)}
                disabled={clearing}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearSingleTable}
                disabled={clearing}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {clearing ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Clearing…
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    Yes, Clear Table Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Confirm Clear ALL Data Tables */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-red-300 bg-white p-6 shadow-2xl dark:border-red-900 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2.5 text-red-600 dark:bg-red-950 dark:text-red-400">
                <AlertTriangle className="size-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Clear All Data Tables in Schema '{selectedSchema}'?
                </h3>
                <p className="text-xs text-slate-500">
                  Transactional reset for testing / cutover
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  Protected Master Tables ({data?.masterTables ?? 0}):
                </p>
                <p className="mt-1 text-[11px] text-emerald-800 dark:text-emerald-300">
                  Brands, Variants, Colors, Product Models, Taxes, Bill Settings, Users and Chart of Accounts will <strong>NEVER</strong> be touched.
                </p>
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <Trash2 className="size-4 text-red-600" />
                  Tables to be Wiped ({data?.dataTables ?? 0}):
                </p>
                <p className="mt-1 text-[11px] text-red-800 dark:text-red-300">
                  Sales products, invoices, line items, customer ledgers, payments, advances, and journal transactions will be wiped.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Type <span className="font-mono font-bold text-red-600">CLEAR DATA</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmClearAllText}
                  onChange={(e) => setConfirmClearAllText(e.target.value)}
                  placeholder="CLEAR DATA"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono uppercase tracking-wider text-slate-900 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                disabled={clearingAll}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllData}
                disabled={confirmClearAllText.trim().toUpperCase() !== "CLEAR DATA" || clearingAll}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-40"
              >
                {clearingAll ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Wiping Data…
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    Confirm Wiping All Data Tables
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Table Metadata */}
      {editingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Table Metadata
              </h3>
              <button
                type="button"
                onClick={() => setEditingTable(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mt-1 font-mono text-xs text-slate-500">
              Table: {editingTable.tableName} ({editingTable.schemaName})
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Friendly Display Name
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingTable(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingEdit ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    Save Metadata
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


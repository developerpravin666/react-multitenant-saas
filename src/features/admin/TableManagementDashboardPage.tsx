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
  ChevronDown,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  FileSpreadsheet,
  Upload
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { useNotifications } from "../../context/NotificationContext";
import { DatabaseBackupRestoreModal } from "./DatabaseBackupRestoreModal";

export interface TableColumnMeta {
  name: string;
  dataType: string;
  isNullable: boolean;
}

export interface TableRecordsData {
  schema: string;
  tableName: string;
  primaryKeyColumn: string;
  columns: TableColumnMeta[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
  records: Record<string, unknown>[];
}

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

export const isTableProtected = (tableName: string): boolean =>
  tableName.startsWith("__") || tableName === "table_registry";

export function TableManagementDashboardPage() {
  const notifications = useNotifications();
  const notifyError = notifications.error;

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
  const [confirmTableName, setConfirmTableName] = useState('');

  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [confirmClearAllText, setConfirmClearAllText] = useState("");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [recoveries, setRecoveries] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("table-clear-recoveries") || "{}"); } catch { return {}; }
  });
  const [maintenance, setMaintenance] = useState<"selected" | "restore" | null>(null);
  const [maintenanceConfirmation, setMaintenanceConfirmation] = useState("");
  const [maintaining, setMaintaining] = useState(false);
  const [backupModalState, setBackupModalState] = useState<{
    isOpen: boolean;
    mode: "export" | "restore";
  }>({ isOpen: false, mode: "export" });
  useEffect(() => { setSelectedTables([]); }, [selectedSchema]);
  const saveRecovery = (schema: string, operationId?: string) => {
    if (!operationId) return;
    setRecoveries(previous => {
      const updated = { ...previous, [schema]: operationId };
      localStorage.setItem("table-clear-recoveries", JSON.stringify(updated));
      return updated;
    });
  };

  const selectedTablesInfo = useMemo(() => {
    if (!data?.tables || selectedTables.length === 0) return { tables: [], totalRows: 0 };
    const items = data.tables.filter((t) => selectedTables.includes(t.tableName));
    const totalRows = items.reduce((sum, t) => sum + t.rowCount, 0);
    return { tables: items, totalRows };
  }, [data, selectedTables]);

  const runMaintenance = async () => {
    const isRestore = maintenance === "restore";
    const conf = maintenanceConfirmation.trim().toUpperCase();
    if (isRestore) {
      if (conf !== "RESTORE DATA" && conf !== "RESTORE") return;
    } else {
      if (conf !== "DELETE" && conf !== "CLEAR SELECTED TABLES" && conf !== "CONFIRM" && conf !== "DELETE SELECTED") return;
    }

    setMaintaining(true);
    try {
      const path = isRestore ? `/admin/tables/restore/${recoveries[selectedSchema]}` : "/admin/tables/clear-selected";
      const result = await apiClient.post<{ operationId?: string; message?: string }>(
        `${path}?schema=${encodeURIComponent(selectedSchema)}`,
        { tables: selectedTables, confirmation: conf }
      );
      if (isRestore) {
        const updated = { ...recoveries }; delete updated[selectedSchema];
        setRecoveries(updated); localStorage.setItem("table-clear-recoveries", JSON.stringify(updated));
        notifications.success("Data Restored", "Previously cleared table records have been restored.");
      } else {
        saveRecovery(selectedSchema, result.operationId);
        notifications.success("Tables Cleared", `Data deleted from ${selectedTables.length} selected table(s).`);
      }
      setMaintenance(null);
      setSelectedTables([]);
      await fetchTables(selectedSchema);
    } catch (error) {
      notifications.error("Operation Failed", error instanceof Error ? error.message : "Operation failed");
    } finally {
      setMaintaining(false);
    }
  };

  const [editingTable, setEditingTable] = useState<TableItem | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Table Records Viewer & Deletion state
  const [viewingRecordsTable, setViewingRecordsTable] = useState<TableItem | null>(null);
  const [recordsData, setRecordsData] = useState<TableRecordsData | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPageSize, setRecordsPageSize] = useState(25);
  const [recordsSearch, setRecordsSearch] = useState("");
  const [selectedRecordKeys, setSelectedRecordKeys] = useState<string[]>([]);
  const [deletingRecords, setDeletingRecords] = useState(false);
  const [confirmDeleteRecordModal, setConfirmDeleteRecordModal] = useState<{
    singleKey?: string;
    keys: string[];
  } | null>(null);

  const fetchTableRecords = useCallback(async (table: TableItem, page = 1, pageSize = 25, search = "") => {
    setLoadingRecords(true);
    try {
      const queryParams = new URLSearchParams({
        schema: table.schemaName,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search.trim()) queryParams.set("search", search.trim());

      const res = await apiClient.get<TableRecordsData>(
        `/admin/tables/${encodeURIComponent(table.tableName)}/records?${queryParams.toString()}`
      );
      setRecordsData(res);
      setRecordsPage(res.page);
      setRecordsPageSize(res.pageSize);
      setSelectedRecordKeys([]);
    } catch (err) {
      notifications.error("Failed to load records", err instanceof Error ? err.message : "Error loading records");
    } finally {
      setLoadingRecords(false);
    }
  }, [notifications]);

  const handleDeleteRecords = async (keysToDelete: string[]) => {
    if (!viewingRecordsTable || !recordsData || keysToDelete.length === 0) return;
    setDeletingRecords(true);
    try {
      const res = await apiClient.post<{ success: boolean; deletedCount: number; message: string }>(
        `/admin/tables/${encodeURIComponent(viewingRecordsTable.tableName)}/delete-records?schema=${encodeURIComponent(viewingRecordsTable.schemaName)}`,
        {
          keyColumn: recordsData.primaryKeyColumn,
          recordKeys: keysToDelete,
        }
      );

      notifications.success("Records Deleted", res.message || `${res.deletedCount} record(s) deleted.`);
      setConfirmDeleteRecordModal(null);
      setSelectedRecordKeys([]);

      // Update rowCount in the main dashboard tables list
      setData((prev) => {
        if (!prev) return null;
        const updated = prev.tables.map((t) =>
          t.tableName === viewingRecordsTable.tableName
            ? { ...t, rowCount: Math.max(0, t.rowCount - res.deletedCount) }
            : t
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

      // Reload records in current modal
      await fetchTableRecords(viewingRecordsTable, recordsPage, recordsPageSize, recordsSearch);
    } catch (err) {
      notifications.error("Delete Failed", err instanceof Error ? err.message : "Failed to delete record(s)");
    } finally {
      setDeletingRecords(false);
    }
  };

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
      notifyError("Failed to load tables", err instanceof Error ? err.message : "Error loading table registry");
    } finally {
      setLoading(false);
    }
  }, [notifyError, selectedSchema]);

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
    if (!clearTableModal || (clearTableModal.tableType === "Master" && confirmTableName !== clearTableModal.tableName)) return;
    setClearing(true);
    try {
      const result = await apiClient.post<{ operationId?: string }>(`/admin/tables/${encodeURIComponent(clearTableModal.tableName)}/clear?schema=${encodeURIComponent(clearTableModal.schemaName)}`, { confirmTableName });
      saveRecovery(clearTableModal.schemaName, result.operationId);

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
      await fetchTables(selectedSchema);
    } catch (err) {
      notifications.error("Clear Failed", err instanceof Error ? err.message : "Failed to clear table data");
    } finally {
      setClearing(false);
    }
  };

  const handleClearAllData = async () => {
    const conf = confirmClearAllText.trim().toUpperCase();
    if (conf !== "CLEAR ALL TABLES" && conf !== "DELETE ALL" && conf !== "DELETE") {
      notifications.error("Confirmation Required", "Please type 'DELETE' or 'CLEAR ALL TABLES' to confirm wiping records.");
      return;
    }

    setClearingAll(true);
    try {
      const query = selectedSchema ? `?schema=${encodeURIComponent(selectedSchema)}` : "";
      const res = await apiClient.post<{ clearedCount: number; message: string; operationId?: string }>(
        `/admin/tables/clear-all-data${query}`,
        { confirmation: conf }
      );
      saveRecovery(selectedSchema, res.operationId);

      notifications.success("All Tables Cleared", res.message || "All Master and Data records cleared.");
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

  // Selectable tables (excluding protected system tables)
  const selectableTables = useMemo(
    () => filteredTables.filter((t) => !isTableProtected(t.tableName)),
    [filteredTables]
  );

  const allSelectableChecked = useMemo(
    () => selectableTables.length > 0 && selectableTables.every((t) => selectedTables.includes(t.tableName)),
    [selectableTables, selectedTables]
  );

  const someSelectableChecked = useMemo(
    () => selectableTables.some((t) => selectedTables.includes(t.tableName)),
    [selectableTables, selectedTables]
  );

  const handleToggleAll = () => {
    if (allSelectableChecked) {
      const selectableNames = new Set(selectableTables.map((t) => t.tableName));
      setSelectedTables((prev) => prev.filter((name) => !selectableNames.has(name)));
    } else {
      const selectableNames = selectableTables.map((t) => t.tableName);
      setSelectedTables((prev) => Array.from(new Set([...prev, ...selectableNames])));
    }
  };

  const handleToggleRow = (tableName: string) => {
    if (isTableProtected(tableName)) return;
    setSelectedTables((prev) =>
      prev.includes(tableName) ? prev.filter((name) => name !== tableName) : [...prev, tableName]
    );
  };

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
                Classify tables and clear their records. Master tables require explicit confirmation.
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

          {/* Export to Excel Button */}
          <button
            onClick={() => setBackupModalState({ isOpen: true, mode: "export" })}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
            title="Export database tables to multi-sheet formatted Excel workbook"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export to Excel</span>
          </button>

          {/* Restore from Excel Button */}
          <button
            onClick={() => setBackupModalState({ isOpen: true, mode: "restore" })}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
            title="Restore tables from Excel file with audit difference counts"
          >
            <Upload className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Restore from Excel</span>
          </button>

          {/* Selective Delete Button */}
          {selectedTables.length > 0 && (
            <button
              onClick={() => { setMaintenanceConfirmation(""); setMaintenance("selected"); }}
              className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 animate-pulse"
            >
              <Trash2 className="size-3.5" />
              <span>Delete Selected ({selectedTables.length})</span>
            </button>
          )}

          {/* Revert Last Clear Button */}
          <button
            disabled={loading || !recoveries[selectedSchema]}
            onClick={() => { setMaintenanceConfirmation(""); setMaintenance("restore"); }}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 disabled:opacity-40 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
            title={recoveries[selectedSchema] ? "Restore tables from the last clear snapshot" : "No recent clear snapshot to restore"}
          >
            <RotateCcw className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Revert Last Clear</span>
          </button>

          {/* Delete All Table Records Button */}
          <button
            onClick={() => {
              setConfirmClearAllText("");
              setShowClearAllModal(true);
            }}
            disabled={loading || (data?.tables.filter((table) => !isTableProtected(table.tableName)).length ?? 0) === 0}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/50"
          >
            <Trash2 className="size-3.5" />
            <span>Delete All Table Records</span>
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
            <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">Master Tables</p>
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
              {loading ? "…" : data?.tables.filter((table) => !isTableProtected(table.tableName)).length ?? 0}
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
            <strong>Master Tables</strong> contain catalog and configuration records. Clear them individually by confirming the exact table name. Related tables may also be cleared by database cascade rules.
            <strong> Data Tables</strong> (e.g., Sold Products, Invoices, Payments, Customers, Audit Logs) contain transactional history. Clear All Tables removes records from both table types.
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

      {/* Active Bulk Selection Bar */}
      {selectedTables.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/90 p-3.5 shadow-sm dark:border-red-900/60 dark:bg-red-950/40">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/60 dark:text-red-300">
                <CheckSquare className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-red-900 dark:text-red-100">
                  {selectedTables.length} {selectedTables.length === 1 ? "table" : "tables"} selected
                </span>
                <span className="ml-2 text-xs text-red-700 dark:text-red-300">
                  ({selectedTablesInfo.totalRows.toLocaleString()} total live records)
                </span>
              </div>
            </div>
            <div className="hidden sm:block h-4 w-px bg-red-200 dark:bg-red-800" />
            <button
              type="button"
              onClick={() => {
                const visibleDeletable = selectableTables.map((t) => t.tableName);
                setSelectedTables((prev) => Array.from(new Set([...prev, ...visibleDeletable])));
              }}
              className="text-xs font-semibold text-red-700 hover:underline dark:text-red-300"
            >
              Select All Visible ({selectableTables.length})
            </button>
            <button
              type="button"
              onClick={() => {
                const allDeletable = (data?.tables || [])
                  .filter((t) => !isTableProtected(t.tableName))
                  .map((t) => t.tableName);
                setSelectedTables(allDeletable);
              }}
              className="text-xs font-semibold text-red-700 hover:underline dark:text-red-300"
            >
              Select All in Schema ({(data?.tables || []).filter((t) => !isTableProtected(t.tableName)).length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTables([])}
              className="text-xs font-medium text-slate-600 hover:underline dark:text-slate-400"
            >
              Deselect All
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMaintenanceConfirmation("");
              setMaintenance("selected");
            }}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-red-700 hover:shadow-lg"
          >
            <Trash2 className="size-3.5" />
            <span>Delete Data from Selected ({selectedTables.length}) Tables</span>
          </button>
        </div>
      )}

      {/* Tables Grid */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="w-12 px-4 py-3 text-center">
                  <label className="inline-flex cursor-pointer items-center justify-center p-1">
                    <input
                      type="checkbox"
                      aria-label="Select all visible tables"
                      checked={allSelectableChecked}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = !allSelectableChecked && someSelectableChecked;
                        }
                      }}
                      onChange={handleToggleAll}
                      className="size-4 cursor-pointer rounded border-slate-300 text-red-600 accent-red-600 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </label>
                </th>
                <th className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span>Table Identifier</span>
                      {selectedTables.length > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                          {selectedTables.length} selected
                        </span>
                      )}
                    </div>
                    {selectedTables.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setMaintenanceConfirmation("");
                          setMaintenance("selected");
                        }}
                        className="inline-flex items-center gap-1 rounded bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-95 animate-pulse"
                        title="Delete records from selected tables"
                      >
                        <Trash2 className="size-3" />
                        <span>Delete ({selectedTables.length})</span>
                      </button>
                    )}
                  </div>
                </th>
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
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto size-6 animate-spin text-indigo-500" />
                    <p className="mt-2 text-xs">Loading database table registry…</p>
                  </td>
                </tr>
              ) : filteredTables.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Database className="mx-auto size-8 text-slate-300 dark:text-slate-700" />
                    <p className="mt-2 font-medium text-slate-700 dark:text-slate-300">No tables match your filter criteria.</p>
                    <p className="text-xs text-slate-400">Try clearing the search or category filters.</p>
                  </td>
                </tr>
              ) : (
                filteredTables.map((tbl) => {
                  const isMaster = tbl.tableType === "Master";
                  const isBusy = updatingTable === tbl.tableName;
                  const isSelected = selectedTables.includes(tbl.tableName);
                  const isProtected = isTableProtected(tbl.tableName);

                  return (
                    <tr
                      key={tbl.id}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-red-50/60 dark:bg-red-950/20"
                          : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="w-12 px-4 py-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRow(tbl.tableName);
                        }}
                      >
                        <label
                          className="inline-flex cursor-pointer items-center justify-center p-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Select ${tbl.tableName}`}
                            disabled={isProtected}
                            checked={isSelected}
                            onChange={() => handleToggleRow(tbl.tableName)}
                            className="size-4 cursor-pointer rounded border-slate-300 text-red-600 accent-red-600 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800"
                          />
                        </label>
                      </td>

                      {/* Table Identifier */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {tbl.displayName}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {tbl.schemaName}.<span className="font-semibold text-slate-700 dark:text-slate-300">{tbl.tableName}</span>
                            </div>
                          </div>
                          {!isProtected && (
                            <div className="flex items-center gap-1.5">
                              {isSelected ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMaintenanceConfirmation("");
                                    setMaintenance("selected");
                                  }}
                                  className="inline-flex items-center gap-1 rounded bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-95"
                                  title={`Delete data from selected tables (including ${tbl.tableName})`}
                                >
                                  <Trash2 className="size-3 text-white" />
                                  <span>Delete Selected ({selectedTables.length})</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTables([tbl.tableName]);
                                    setMaintenanceConfirmation("");
                                    setMaintenance("selected");
                                  }}
                                  className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50/70 px-2 py-0.5 text-[10px] font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60"
                                  title={`Select and delete records from ${tbl.tableName}`}
                                >
                                  <Trash2 className="size-3 text-red-600" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          )}
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
                            title={isMaster ? "Master Table" : "Switch to Master Table"}
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

                          {/* View & Delete Records */}
                          <button
                            type="button"
                            onClick={() => {
                              setViewingRecordsTable(tbl);
                              setRecordsSearch("");
                              void fetchTableRecords(tbl, 1, recordsPageSize, "");
                            }}
                            className="flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50/70 px-2 py-1 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
                            title="View and delete specific table records"
                          >
                            <Eye className="size-3" />
                            <span>Records</span>
                          </button>

                          {/* Clear Table Action */}
                          {tbl.isSystem || tbl.tableName.startsWith("__") ? (
                            <span
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-400"
                              title="System table data is protected."
                            >
                              <ShieldCheck className="size-3 text-indigo-400" />
                              Protected
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setConfirmTableName(""); setClearTableModal(tbl); }}
                              disabled={tbl.rowCount === 0}
                              className="flex items-center gap-1 rounded border border-red-200 bg-red-50/70 px-2 py-1 text-[11px] font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-30 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/40"
                              title="Delete all records from this table"
                            >
                              <Trash2 className="size-3" />
                              <span>Clear Table</span>
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

      {/* MODAL 0: Maintenance Modal (Clear Selected or Restore) */}
      {maintenance && (() => {
        const isRestore = maintenance === "restore";
        const conf = maintenanceConfirmation.trim().toUpperCase();
        const isConfValid = isRestore
          ? conf === "RESTORE DATA" || conf === "RESTORE"
          : conf === "DELETE" || conf === "CLEAR SELECTED TABLES" || conf === "CONFIRM" || conf === "DELETE SELECTED";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={isRestore ? "Restore cleared records" : "Delete data from selected tables"}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-full p-2.5 ${
                    isRestore
                      ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                      : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                  }`}
                >
                  {isRestore ? <RotateCcw className="size-6" /> : <AlertTriangle className="size-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isRestore ? "Restore Cleared Records?" : `Delete Data from ${selectedTables.length} Selected Tables?`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Target Schema: <code className="font-mono font-semibold">{selectedSchema}</code>
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <p>
                  {isRestore
                    ? "This will restore the most recent table truncation snapshot, including any dependent tables. Restore is blocked if affected tables have since received new records or schema modifications."
                    : `You are about to permanently delete all records from ${selectedTables.length} selected table(s). Dependent tables linked via foreign keys will also be truncated to preserve integrity. A point-in-time recovery snapshot is automatically created.`}
                </p>

                {!isRestore && selectedTablesInfo.tables.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                      <span>Selected Tables to Wipe:</span>
                      <span className="font-mono text-red-600 dark:text-red-400">
                        Total {selectedTablesInfo.totalRows.toLocaleString()} records
                      </span>
                    </div>
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-800/40">
                      {selectedTablesInfo.tables.map((t) => (
                        <div key={t.tableName} className="flex items-center justify-between py-1.5 px-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 dark:text-white">{t.displayName}</span>
                            <span className="font-mono text-[10px] text-slate-400">({t.tableName})</span>
                            <span
                              className={`rounded px-1.5 py-0.2 text-[9px] font-semibold ${
                                t.tableType === "Master"
                                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                              }`}
                            >
                              {t.tableType}
                            </span>
                          </div>
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {t.rowCount.toLocaleString()} rows
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Type <span className="font-mono font-bold text-red-600">{isRestore ? "RESTORE" : "DELETE"}</span> to confirm:
                  </label>
                  <input
                    aria-label="Maintenance confirmation"
                    type="text"
                    value={maintenanceConfirmation}
                    onChange={(event) => setMaintenanceConfirmation(event.target.value)}
                    placeholder={isRestore ? "RESTORE" : "DELETE"}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono uppercase tracking-wider text-slate-900 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={maintaining}
                  onClick={() => setMaintenance(null)}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={maintaining || !isConfValid}
                  onClick={() => void runMaintenance()}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition disabled:opacity-40 ${
                    isRestore
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {maintaining ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Processing…</span>
                    </>
                  ) : isRestore ? (
                    <>
                      <RotateCcw className="size-3.5" />
                      <span>Confirm Restore</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-3.5" />
                      <span>Confirm Delete Selected ({selectedTables.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {clearTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-xl dark:border-red-900/50 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 text-red-600 dark:bg-red-900/50 dark:text-red-300">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Clear {clearTableModal.tableType} Table?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Table: <code className="font-semibold text-red-600 dark:text-red-400">{clearTableModal.tableName}</code>
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Are you sure you want to delete all{" "}
              <strong>{clearTableModal.rowCount.toLocaleString()}</strong> records from{" "}
              <strong>{clearTableModal.displayName}</strong>?
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {clearTableModal.tableType === "Master"
                ? "Master and related records will be removed. A recovery copy is saved for Revert Last Clear."
                : "Related transactional tables may also be cleared. A recovery copy is saved for Revert Last Clear."}
            </p>
            {clearTableModal.tableType === "Master" && (
              <label className="mt-4 block text-xs text-slate-600 dark:text-slate-300">
                Type the exact table name to confirm
                <input value={confirmTableName} onChange={(event) => setConfirmTableName(event.target.value)}
                  autoComplete="off" className="mt-2 w-full rounded border border-red-200 p-2 dark:bg-slate-800" />
              </label>
            )}

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
                disabled={clearing || (clearTableModal.tableType === "Master" && confirmTableName !== clearTableModal.tableName)}
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
                  Clear All Tables in Schema '{selectedSchema}'?
                </h3>
                <p className="text-xs text-slate-500">
                  Deletes Master catalogs and transactional records
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <Trash2 className="size-4 text-red-600" />
                  Tables to be Wiped ({data?.tables.filter((table) => !isTableProtected(table.tableName)).length ?? 0}):
                </p>
                <p className="mt-1 text-[11px] text-red-800 dark:text-red-300">
                  Both Master and Data tables will be wiped, including brands, models, taxes, users, invoices and payments. Related tables may also be cleared. Internal system tables are excluded.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> or <span className="font-mono font-bold text-red-600">CLEAR ALL TABLES</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmClearAllText}
                  onChange={(e) => setConfirmClearAllText(e.target.value)}
                  placeholder="DELETE"
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
                disabled={!["CLEAR ALL TABLES", "DELETE ALL", "DELETE"].includes(confirmClearAllText.trim().toUpperCase()) || clearingAll}
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
                    Confirm Delete All Records
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

      {/* MODAL 4: Table Records Viewer & Row Deletion */}
      {viewingRecordsTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  <Database className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {viewingRecordsTable.displayName}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        viewingRecordsTable.tableType === "Master"
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                      }`}
                    >
                      {viewingRecordsTable.tableType} Table
                    </span>
                  </div>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {viewingRecordsTable.schemaName}.<span className="font-semibold text-slate-700 dark:text-slate-300">{viewingRecordsTable.tableName}</span>
                    {recordsData?.primaryKeyColumn && (
                      <span className="ml-2 text-slate-400">
                        (PK: <code className="text-indigo-600 dark:text-indigo-400">{recordsData.primaryKeyColumn}</code>)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingRecordsTable(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Toolbar: Search & Batch Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 px-6 py-3 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex flex-1 items-center gap-3">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search records in table…"
                    value={recordsSearch}
                    onChange={(e) => setRecordsSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void fetchTableRecords(viewingRecordsTable, 1, recordsPageSize, recordsSearch);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void fetchTableRecords(viewingRecordsTable, 1, recordsPageSize, recordsSearch)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => void fetchTableRecords(viewingRecordsTable, recordsPage, recordsPageSize, recordsSearch)}
                  disabled={loadingRecords}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  title="Reload records"
                >
                  <RefreshCw className={`size-3.5 ${loadingRecords ? "animate-spin text-indigo-600" : ""}`} />
                </button>
              </div>

              {/* Action: Delete Selected Records */}
              <div className="flex items-center gap-3">
                {selectedRecordKeys.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteRecordModal({ keys: selectedRecordKeys })}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete Selected Records ({selectedRecordKeys.length})</span>
                  </button>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Total Records: <strong className="font-semibold text-slate-900 dark:text-white">{(recordsData?.totalRecords ?? 0).toLocaleString()}</strong>
                </span>
              </div>
            </div>

            {/* Modal Body: Table Grid */}
            <div className="flex-1 overflow-auto p-4">
              {loadingRecords ? (
                <div className="flex h-full flex-col items-center justify-center py-20 text-slate-500">
                  <RefreshCw className="size-8 animate-spin text-indigo-500" />
                  <p className="mt-3 text-xs font-medium">Fetching table records from database…</p>
                </div>
              ) : !recordsData || recordsData.records.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-20 text-slate-500">
                  <Database className="size-10 text-slate-300 dark:text-slate-700" />
                  <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">No records found</p>
                  <p className="text-xs text-slate-400">This table is empty or no rows matched your search filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        <th className="w-10 px-3 py-2.5">
                          <input
                            type="checkbox"
                            aria-label="Select all records on page"
                            checked={
                              recordsData.records.length > 0 &&
                              recordsData.records.every((r) =>
                                selectedRecordKeys.includes(String(r[recordsData.primaryKeyColumn]))
                              )
                            }
                            onChange={(e) => {
                              const pageKeys = recordsData.records.map((r) =>
                                String(r[recordsData.primaryKeyColumn])
                              );
                              if (e.target.checked) {
                                setSelectedRecordKeys((prev) => Array.from(new Set([...prev, ...pageKeys])));
                              } else {
                                setSelectedRecordKeys((prev) => prev.filter((k) => !pageKeys.includes(k)));
                              }
                            }}
                          />
                        </th>
                        <th className="w-20 px-3 py-2.5 text-center">Action</th>
                        {recordsData.columns.map((col) => (
                          <th key={col.name} className="px-3 py-2.5 whitespace-nowrap" title={`${col.name} (${col.dataType})`}>
                            <span className={col.name === recordsData.primaryKeyColumn ? "text-indigo-600 dark:text-indigo-400 font-bold" : ""}>
                              {col.name}
                            </span>
                            <span className="ml-1 text-[10px] font-normal lowercase text-slate-400">
                              {col.dataType}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recordsData.records.map((row, idx) => {
                        const pkVal = String(row[recordsData.primaryKeyColumn] ?? idx);
                        const isSelected = selectedRecordKeys.includes(pkVal);

                        return (
                          <tr
                            key={pkVal + idx}
                            className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                              isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                            }`}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                aria-label={`Select record ${pkVal}`}
                                checked={isSelected}
                                onChange={(e) => {
                                  setSelectedRecordKeys((prev) =>
                                    e.target.checked ? [...prev, pkVal] : prev.filter((k) => k !== pkVal)
                                  );
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteRecordModal({ keys: [pkVal], singleKey: pkVal })}
                                className="rounded p-1 text-red-500 transition hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                                title="Delete this record"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                            {recordsData.columns.map((col) => {
                              const val = row[col.name];
                              const isNull = val === null || val === undefined;
                              const displayVal = isNull
                                ? "—"
                                : typeof val === "object"
                                ? JSON.stringify(val)
                                : String(val);

                              return (
                                <td
                                  key={col.name}
                                  className={`max-w-xs truncate px-3 py-2 font-mono text-[11px] ${
                                    isNull ? "text-slate-300 dark:text-slate-600" : "text-slate-700 dark:text-slate-300"
                                  } ${col.name === recordsData.primaryKeyColumn ? "font-semibold text-indigo-700 dark:text-indigo-400" : ""}`}
                                  title={displayVal}
                                >
                                  {displayVal}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer: Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-3 text-xs dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Rows per page:</span>
                <select
                  value={recordsPageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setRecordsPageSize(newSize);
                    void fetchTableRecords(viewingRecordsTable, 1, newSize, recordsSearch);
                  }}
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500">
                  Page <strong className="text-slate-800 dark:text-slate-200">{recordsPage}</strong> of{" "}
                  <strong className="text-slate-800 dark:text-slate-200">{recordsData?.totalPages || 1}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={recordsPage <= 1 || loadingRecords}
                    onClick={() => void fetchTableRecords(viewingRecordsTable, recordsPage - 1, recordsPageSize, recordsSearch)}
                    className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    title="Previous page"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!recordsData || recordsPage >= recordsData.totalPages || loadingRecords}
                    onClick={() => void fetchTableRecords(viewingRecordsTable, recordsPage + 1, recordsPageSize, recordsSearch)}
                    className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    title="Next page"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Confirm Delete Record(s) */}
      {confirmDeleteRecordModal && viewingRecordsTable && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl dark:border-red-900/50 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 text-red-600 dark:bg-red-900/50 dark:text-red-300">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete {confirmDeleteRecordModal.keys.length > 1 ? `${confirmDeleteRecordModal.keys.length} Records` : "Record"}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Table: <code className="font-semibold text-red-600 dark:text-red-400">{viewingRecordsTable.tableName}</code>
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {confirmDeleteRecordModal.singleKey ? (
                <>
                  Are you sure you want to permanently delete record with {recordsData?.primaryKeyColumn || "ID"}{" "}
                  <code className="font-mono font-semibold text-slate-900 dark:text-white">{confirmDeleteRecordModal.singleKey}</code>?
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete{" "}
                  <strong>{confirmDeleteRecordModal.keys.length}</strong> selected records?
                </>
              )}
            </p>
            <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
              Note: If any child tables reference these records, deletion will be blocked by foreign key constraints.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deletingRecords}
                onClick={() => setConfirmDeleteRecordModal(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingRecords}
                onClick={() => void handleDeleteRecords(confirmDeleteRecordModal.keys)}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deletingRecords ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database Excel Backup & Restore Modal */}
      <DatabaseBackupRestoreModal
        isOpen={backupModalState.isOpen}
        onClose={() => setBackupModalState((prev) => ({ ...prev, isOpen: false }))}
        schema={selectedSchema || data?.activeSchema || "tenant"}
        availableTables={data?.tables}
        initialMode={backupModalState.mode}
        onSuccess={() => void fetchTables(selectedSchema || data?.activeSchema)}
      />
    </div>
  );
}

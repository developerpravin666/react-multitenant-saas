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
  RotateCcw,
  Clock,
  Layers,
  FileSpreadsheet,
  Download,
  Upload,
  Eye,
  X,
  Check,
  HardDrive,
  Copy,
  Server,
  AlertCircle,
  Activity,
  User,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { useNotifications } from "../../context/NotificationContext";

export interface SnapshotTableInfo {
  tableName: string;
  displayName: string;
  rowCount: number;
  tempTableName: string;
}

export interface DatabaseSnapshot {
  id: string;
  backupName: string;
  backupSchemaName?: string;
  databaseName?: string;
  sourceSchema: string;
  totalTables: number;
  totalRows: number;
  createdAtUtc: string;
  createdBy: string;
  notes?: string | null;
  status?: string;
  lastRestoredAtUtc?: string | null;
  lastRestoredBy?: string | null;
  droppedAtUtc?: string | null;
  droppedBy?: string | null;
  tables: SnapshotTableInfo[];
}

export interface DatabaseBackupRestoreLog {
  id: string;
  backupRecordId?: string | null;
  action: "BACKUP_CREATED" | "RESTORE_EXECUTED" | "SCHEMA_DROPPED" | string;
  sourceSchema?: string | null;
  targetSchema?: string | null;
  backupSchemaName?: string | null;
  databaseName?: string | null;
  status: "Success" | "Failed" | "Partial" | string;
  totalRowsProcessed: number;
  totalInserted: number;
  totalUpdated: number;
  totalErrors: number;
  notes?: string | null;
  detailsJson?: string | null;
  executedBy: string;
  executedAtUtc: string;
}

export interface BackupTableInfo {
  tableName: string;
  displayName: string;
  tableType: string;
  category: string;
  rowCount: number;
  isSelected: boolean;
  isSystem: boolean;
}

export interface InspectBackupResult {
  fileName: string;
  sourceSchema?: string | null;
  exportedAtUtc?: string | null;
  formatVersion?: string | null;
  totalTablesInFile: number;
  totalRowsInFile: number;
  tables: BackupTableInfo[];
}

export interface TableRestoreAudit {
  tableName: string;
  displayName: string;
  rowsInFile: number;
  insertedCount: number;
  updatedCount: number;
  unchangedCount: number;
  errorCount: number;
  status: "Success" | "Partial" | "Skipped" | "Failed";
  sampleDifferences: string[];
  errorMessage?: string | null;
}

export interface DatabaseRestoreResult {
  success: boolean;
  message: string;
  targetSchema: string;
  backupFileName: string;
  restoredAtUtc: string;
  totalTablesInFile: number;
  selectedTablesCount: number;
  totalRowsProcessed: number;
  totalInserted: number;
  totalUpdated: number;
  totalUnchanged: number;
  totalErrors: number;
  tableAudits: TableRestoreAudit[];
  auditLogId?: string | null;
}

export function DatabaseBackupDashboardPage() {
  const notifications = useNotifications();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"schemas" | "logs" | "excel">("schemas");

  // Schema state
  const [activeSchema, setActiveSchema] = useState<string>("tenant");
  const [availableSchemas, setAvailableSchemas] = useState<string[]>([]);

  // Snapshots & Backups state
  const [snapshots, setSnapshots] = useState<DatabaseSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Active" | "Restored" | "Dropped">("ALL");

  // Logs state
  const [logs, setLogs] = useState<DatabaseBackupRestoreLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilterAction, setLogFilterAction] = useState<string>("ALL");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [newBackupName, setNewBackupName] = useState("");
  const [newBackupNotes, setNewBackupNotes] = useState("");
  const [eligibleTables, setEligibleTables] = useState<BackupTableInfo[]>([]);
  const [selectedTablesForBackup, setSelectedTablesForBackup] = useState<string[]>([]);

  // Table Inspection Modal
  const [inspectingSnapshot, setInspectingSnapshot] = useState<DatabaseSnapshot | null>(null);

  // Restore Confirmation Modal
  const [snapshotToRestore, setSnapshotToRestore] = useState<DatabaseSnapshot | null>(null);
  const [restoringSnapshot, setRestoringSnapshot] = useState(false);
  const [restoreResult, setRestoreResult] = useState<DatabaseRestoreResult | null>(null);

  // Delete & Drop Schema Confirmation Modal
  const [snapshotToDelete, setSnapshotToDelete] = useState<DatabaseSnapshot | null>(null);
  const [droppingSchema, setDroppingSchema] = useState(false);

  // Log Details Modal
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<DatabaseBackupRestoreLog | null>(null);

  // Excel Export/Restore State
  const [exportTables, setExportTables] = useState<BackupTableInfo[]>([]);
  const [selectedExportTables, setSelectedExportTables] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [inspectResult, setInspectResult] = useState<InspectBackupResult | null>(null);
  const [restoringExcel, setRestoringExcel] = useState(false);
  const [uploadedExcelFile, setUploadedExcelFile] = useState<File | null>(null);

  // 1. Load initial schemas
  useEffect(() => {
    fetchSchemas();
  }, []);

  const fetchSchemas = async () => {
    try {
      const res = await apiClient.get<Array<{ schemaName: string }>>("/tenants");
      const list = Array.isArray(res) ? res.map((t: { schemaName: string }) => t.schemaName).filter(Boolean) : [];
      const uniqueSchemas = Array.from(new Set(["tenant", ...list]));
      setAvailableSchemas(uniqueSchemas);
      if (uniqueSchemas.length > 0) {
        const preferred = uniqueSchemas.find((s) => s !== "tenant") || "tenant";
        setActiveSchema(preferred);
      }
    } catch {
      setAvailableSchemas(["tenant"]);
      setActiveSchema("tenant");
    }
  };

  // 2. Load Snapshots
  const loadSnapshots = useCallback(async () => {
    setLoadingSnapshots(true);
    try {
      const data = await apiClient.get<DatabaseSnapshot[]>(
        `/admin/backup/snapshots?schema=${encodeURIComponent(activeSchema)}`
      );
      setSnapshots(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      notifications.error("Failed to load backups", err instanceof Error ? err.message : "Error fetching backups");
    } finally {
      setLoadingSnapshots(false);
    }
  }, [activeSchema, notifications]);

  // 3. Load Logs
  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await apiClient.get<DatabaseBackupRestoreLog[]>("/admin/backup/logs");
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      notifications.error("Failed to load audit logs", err instanceof Error ? err.message : "Error fetching logs");
    } finally {
      setLoadingLogs(false);
    }
  }, [notifications]);

  // 4. Load Tables for Backup / Export
  const loadEligibleTables = useCallback(async (schemaToLoad: string) => {
    try {
      const res = await apiClient.get<{ tables?: BackupTableInfo[] } | BackupTableInfo[]>(
        `/admin/backup/tables?schema=${encodeURIComponent(schemaToLoad)}`
      );
      const t: BackupTableInfo[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.tables)
        ? res.tables
        : [];
      setEligibleTables(t);
      setSelectedTablesForBackup(t.map((item: BackupTableInfo) => item.tableName));
      setExportTables(t);
      setSelectedExportTables(t.map((item: BackupTableInfo) => item.tableName));
    } catch (err: unknown) {
      notifications.error("Failed to load tables list", err instanceof Error ? err.message : "Error fetching tables");
    }
  }, [notifications]);

  useEffect(() => {
    if (activeSchema) {
      loadSnapshots();
      loadEligibleTables(activeSchema);
    }
  }, [activeSchema, loadSnapshots, loadEligibleTables]);

  useEffect(() => {
    if (activeTab === "logs") {
      loadLogs();
    }
  }, [activeTab, loadLogs]);

  // Create In-Database Snapshot
  const handleCreateSnapshot = async () => {
    if (selectedTablesForBackup.length === 0) {
      notifications.error("Selection Required", "Please select at least one table to back up.");
      return;
    }

    setCreatingBackup(true);
    try {
      const res = await apiClient.post<DatabaseSnapshot>("/admin/backup/create-snapshot", {
        schema: activeSchema,
        tables: selectedTablesForBackup,
        backupName: newBackupName.trim() || undefined,
        notes: newBackupNotes.trim() || undefined,
      });

      const schemaCreated = res.backupSchemaName || "schema";
      notifications.success(
        "Backup Schema Created",
        `Created schema '${schemaCreated}' with ${res.totalTables} tables (${res.totalRows.toLocaleString()} rows).`
      );
      setIsCreateModalOpen(false);
      setNewBackupName("");
      setNewBackupNotes("");
      await loadSnapshots();
      await loadLogs();
    } catch (err: unknown) {
      notifications.error("Backup Creation Failed", err instanceof Error ? err.message : "Could not create backup.");
    } finally {
      setCreatingBackup(false);
    }
  };

  // Restore from In-Database Snapshot
  const handleExecuteRestore = async () => {
    if (!snapshotToRestore) return;

    setRestoringSnapshot(true);
    try {
      const res = await apiClient.post<DatabaseRestoreResult>(
        `/admin/backup/restore-snapshot/${snapshotToRestore.id}`,
        {
          schema: activeSchema,
        }
      );
      setRestoreResult(res);
      notifications.success(
        "Database Restored",
        `Successfully restored data from schema '${snapshotToRestore.backupSchemaName || snapshotToRestore.backupName}'. (${res.totalRowsProcessed.toLocaleString()} rows reconciled)`
      );
      setSnapshotToRestore(null);
      await loadSnapshots();
      await loadLogs();
    } catch (err: unknown) {
      notifications.error("Restore Failed", err instanceof Error ? err.message : "Could not restore database.");
    } finally {
      setRestoringSnapshot(false);
    }
  };

  // Delete Backup & Drop Schema
  const handleDeleteAndDropSchema = async () => {
    if (!snapshotToDelete) return;

    setDroppingSchema(true);
    try {
      await apiClient.delete(`/admin/backup/backups/${snapshotToDelete.id}`);
      notifications.success(
        "Schema Dropped",
        `PostgreSQL schema '${snapshotToDelete.backupSchemaName || snapshotToDelete.backupName}' was dropped and data was purged.`
      );
      setSnapshotToDelete(null);
      await loadSnapshots();
      await loadLogs();
    } catch (err: unknown) {
      notifications.error("Drop Schema Failed", err instanceof Error ? err.message : "Could not drop backup schema.");
    } finally {
      setDroppingSchema(false);
    }
  };

  // Excel Export Handler
  const handleExportExcel = async () => {
    if (selectedExportTables.length === 0) {
      notifications.error("Selection Required", "Select at least one table to export.");
      return;
    }
    setExporting(true);
    try {
      const defaultFileName = `${activeSchema}_backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const url = `/admin/backup/export?schema=${encodeURIComponent(activeSchema)}`;

      await apiClient.download(url, defaultFileName, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tables: selectedExportTables }),
      });

      notifications.success("Export Downloaded", `Exported ${selectedExportTables.length} tables to ${defaultFileName}`);
    } catch (err: unknown) {
      notifications.error("Export Failed", err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  // Excel Inspect Handler
  const handleInspectFile = async (file: File) => {
    setUploadedExcelFile(file);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post<InspectBackupResult>("/admin/backup/inspect", formData);
      setInspectResult(res);
      notifications.success(
        "Excel Validated",
        `Pre-flight inspection: ${res.totalTablesInFile} tables, ${res.totalRowsInFile} rows.`
      );
    } catch (err: unknown) {
      notifications.error("Inspection Failed", err instanceof Error ? err.message : "Inspection failed");
      setInspectResult(null);
    }
  };

  // Excel Restore Handler
  const handleRestoreFromExcel = async () => {
    if (!uploadedExcelFile) {
      notifications.error("File Required", "Please attach an Excel backup file.");
      return;
    }
    setRestoringExcel(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedExcelFile);
      formData.append("schema", activeSchema);
      const res = await apiClient.post<DatabaseRestoreResult>("/admin/backup/restore", formData);
      setRestoreResult(res);
      notifications.success("Restore Completed", "Database restore from Excel completed successfully!");
      await loadSnapshots();
      await loadLogs();
    } catch (err: unknown) {
      notifications.error("Restore Failed", err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoringExcel(false);
    }
  };

  // Filtered Snapshots
  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((s) => {
      const matchesSearch =
        searchQuery === "" ||
        s.backupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.backupSchemaName && s.backupSchemaName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.createdBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "Dropped" && s.status === "Dropped") ||
        (statusFilter === "Restored" && s.status === "Restored") ||
        (statusFilter === "Active" && (s.status === "Active" || !s.status));

      return matchesSearch && matchesStatus;
    });
  }, [snapshots, searchQuery, statusFilter]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (logFilterAction === "ALL") return true;
      return log.action === logFilterAction;
    });
  }, [logs, logFilterAction]);

  // Metrics
  const activeSnapshotsCount = snapshots.filter((s) => s.status !== "Dropped").length;
  const totalBackedUpRows = snapshots
    .filter((s) => s.status !== "Dropped")
    .reduce((acc, curr) => acc + (curr.totalRows || 0), 0);
  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
                <Database className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Database Backup, Restore & Schema Manager
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Same-DB In-Database Engine
                  </span>
                </h1>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  Backups stored as dedicated PostgreSQL schemas formatted as{" "}
                  <code className="text-amber-300 bg-black/40 px-1.5 py-0.5 rounded font-mono text-[11px]">
                    {"{{actual db name}}_bkp_YYYYMMDD"}
                  </code>
                  . Tracked in <code className="text-indigo-300 font-mono text-[11px]">tenant.database_backups</code> with
                  full audit history in{" "}
                  <code className="text-indigo-300 font-mono text-[11px]">tenant.database_backup_restore_logs</code>.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                loadSnapshots();
                if (activeTab === "logs") loadLogs();
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSnapshots ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                setIsCreateModalOpen(true);
                loadEligibleTables(activeSchema);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-colors border border-indigo-400/30"
            >
              <HardDrive className="w-3.5 h-3.5" />
              Take In-Database Backup
            </button>
          </div>
        </div>

        {/* Global Schema Selector Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-200">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span>Active Tenant Schema:</span>
            <select
              value={activeSchema}
              onChange={(e) => setActiveSchema(e.target.value)}
              className="bg-black/40 border border-white/20 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {availableSchemas.map((s) => (
                <option key={s} value={s} className="bg-slate-900 text-white">
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 text-indigo-200/90 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              PostgreSQL Isolated Schemas
            </span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Manual Schema Drop Supported
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Backups Taken</span>
            <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Database className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{snapshots.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Across all snapshots in registry</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Backup Schemas</span>
            <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{activeSnapshotsCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Live schemas ready for instant restore</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Backed Up Rows</span>
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {totalBackedUpRows.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Stored in active backup schemas</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Latest Backup Schema</span>
            <span className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xs font-mono font-semibold text-slate-900 dark:text-white mt-2 truncate">
            {latestSnapshot?.backupSchemaName || "None taken yet"}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {latestSnapshot ? new Date(latestSnapshot.createdAtUtc).toLocaleDateString() : "Ready to backup"}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab("schemas")}
            className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "schemas"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Database className="w-4 h-4" />
            In-Database Backup Schemas
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {snapshots.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "logs"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Activity className="w-4 h-4" />
            Backup & Restore Audit Logs
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {logs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("excel")}
            className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "excel"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel Export & Offline Restore
          </button>
        </div>
      </div>

      {/* TAB 1: In-Database Backup Schemas */}
      {activeTab === "schemas" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by schema name, notes, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "ALL" | "Active" | "Restored" | "Dropped")}
                className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active Schemas</option>
                <option value="Restored">Restored</option>
                <option value="Dropped">Dropped Schemas</option>
              </select>
            </div>
          </div>

          {/* Table List of Backup Schemas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {loadingSnapshots ? (
              <div className="p-12 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
                <p className="text-sm">Loading backup schemas from PostgreSQL registry...</p>
              </div>
            ) : filteredSnapshots.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Database className="w-10 h-10 mx-auto text-slate-400 mb-2 stroke-1" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">No backup schemas found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Create a new snapshot to backup tables into a dedicated{" "}
                  <code>{"{{db}}_bkp_YYYYMMDD"}</code> schema.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-500"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  Take First Backup
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">PostgreSQL Schema Name</th>
                      <th className="py-3 px-4">Backup Name / Label</th>
                      <th className="py-3 px-4">Source DB & Schema</th>
                      <th className="py-3 px-4">Tables & Rows</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created Details</th>
                      <th className="py-3 px-4">Last Restored</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSnapshots.map((snap) => {
                      const isDropped = snap.status === "Dropped";
                      return (
                        <tr
                          key={snap.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                            isDropped ? "opacity-60 bg-slate-50/20" : ""
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isDropped ? "bg-rose-400" : snap.status === "Restored" ? "bg-blue-400" : "bg-emerald-400"
                                }`}
                              />
                              <span className="select-all text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                                {snap.backupSchemaName || `${snap.sourceSchema}_backup`}
                              </span>
                              <button
                                title="Copy schema name"
                                onClick={() => {
                                  if (snap.backupSchemaName) {
                                    navigator.clipboard.writeText(snap.backupSchemaName);
                                    notifications.success("Copied", `Copied "${snap.backupSchemaName}"`);
                                  }
                                }}
                                className="p-1 hover:text-slate-900 dark:hover:text-white text-slate-400"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800 dark:text-slate-200">{snap.backupName}</div>
                            {snap.notes && <div className="text-[11px] text-slate-500 truncate max-w-xs">{snap.notes}</div>}
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            <div>{snap.databaseName || "active_db"}</div>
                            <span className="text-[10px] text-indigo-500">{snap.sourceSchema}</span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                              {snap.totalTables} tables
                            </span>
                            <span className="text-[11px] text-slate-500 ml-2">
                              {snap.totalRows.toLocaleString()} rows
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {isDropped ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                <Trash2 className="w-2.5 h-2.5" />
                                Dropped
                              </span>
                            ) : snap.status === "Restored" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Restored
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <HardDrive className="w-2.5 h-2.5" />
                                Live Schema
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-[11px] text-slate-500">
                            <div>{new Date(snap.createdAtUtc).toLocaleString()}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <User className="w-2.5 h-2.5" />
                              {snap.createdBy}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-[11px] text-slate-500">
                            {snap.lastRestoredAtUtc ? (
                              <div>
                                <div>{new Date(snap.lastRestoredAtUtc).toLocaleString()}</div>
                                <div className="text-[10px] text-indigo-500">{snap.lastRestoredBy}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">Never restored</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Tables button */}
                              <button
                                onClick={() => setInspectingSnapshot(snap)}
                                title="Inspect tables in this backup"
                                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {!isDropped && (
                                <>
                                  {/* Restore Snapshot button */}
                                  <button
                                    onClick={() => setSnapshotToRestore(snap)}
                                    title="Restore database from this schema"
                                    className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>

                                  {/* Drop Schema button */}
                                  <button
                                    onClick={() => setSnapshotToDelete(snap)}
                                    title="Delete backup and DROP SCHEMA CASCADE"
                                    className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Backup & Restore Audit Logs */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="text-xs text-slate-500">
              Complete audit history stored in <code className="font-mono text-indigo-600">tenant.database_backup_restore_logs</code>.
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filter Action:</span>
              <select
                value={logFilterAction}
                onChange={(e) => setLogFilterAction(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Actions</option>
                <option value="BACKUP_CREATED">BACKUP_CREATED</option>
                <option value="RESTORE_EXECUTED">RESTORE_EXECUTED</option>
                <option value="SCHEMA_DROPPED">SCHEMA_DROPPED</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {loadingLogs ? (
              <div className="p-12 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
                <p className="text-sm">Loading audit logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Activity className="w-10 h-10 mx-auto text-slate-400 mb-2 stroke-1" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">No logs found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Actions such as backup creation, restore, and schema drop will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Timestamp (UTC)</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Schema & Database</th>
                      <th className="py-3 px-4">Executed By</th>
                      <th className="py-3 px-4">Rows Impact</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLogs.map((log) => {
                      const isBackup = log.action === "BACKUP_CREATED";
                      const isRestore = log.action === "RESTORE_EXECUTED";
                      const isDrop = log.action === "SCHEMA_DROPPED";

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(log.executedAtUtc).toLocaleString()}
                          </td>

                          <td className="py-3 px-4">
                            {isBackup && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                <Database className="w-2.5 h-2.5" />
                                BACKUP_CREATED
                              </span>
                            )}
                            {isRestore && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <RotateCcw className="w-2.5 h-2.5" />
                                RESTORE_EXECUTED
                              </span>
                            )}
                            {isDrop && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                <Trash2 className="w-2.5 h-2.5" />
                                SCHEMA_DROPPED
                              </span>
                            )}
                            {!isBackup && !isRestore && !isDrop && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {log.action}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px]">
                            {log.backupSchemaName && (
                              <div className="font-semibold text-indigo-700 dark:text-indigo-400">
                                {log.backupSchemaName}
                              </div>
                            )}
                            <div className="text-slate-400 text-[10px]">
                              target: {log.targetSchema || log.sourceSchema || "-"}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-[11px] text-slate-700 dark:text-slate-300">
                            {log.executedBy}
                          </td>

                          <td className="py-3 px-4 text-[11px]">
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {log.totalRowsProcessed.toLocaleString()} processed
                            </div>
                            {(log.totalInserted > 0 || log.totalUpdated > 0) && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                +{log.totalInserted} ins, ~{log.totalUpdated} upd
                              </div>
                            )}
                            {log.totalErrors > 0 && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400">
                                ! {log.totalErrors} errors
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                log.status === "Success"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-[11px] text-slate-500 max-w-xs truncate">
                            {log.notes || "-"}
                          </td>

                          <td className="py-3 px-4 text-right">
                            {log.detailsJson ? (
                              <button
                                onClick={() => setSelectedLogForDetails(log)}
                                className="px-2 py-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded transition-colors"
                              >
                                View Diff
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Excel Export & Offline Restore */}
      {activeTab === "excel" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Export Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Download className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Export Database to Excel</h3>
                <p className="text-xs text-slate-500">Download formatted multi-sheet Excel workbook backup.</p>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 max-h-60 overflow-y-auto space-y-1 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                <span>Select Tables ({selectedExportTables.length}/{exportTables.length})</span>
                <button
                  onClick={() =>
                    setSelectedExportTables(
                      selectedExportTables.length === exportTables.length
                        ? []
                        : exportTables.map((t) => t.tableName)
                    )
                  }
                  className="text-indigo-600 text-[11px] hover:underline"
                >
                  {selectedExportTables.length === exportTables.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              {exportTables.map((t) => {
                const isSelected = selectedExportTables.includes(t.tableName);
                return (
                  <label
                    key={t.tableName}
                    className="flex items-center justify-between py-1 px-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setSelectedExportTables(selectedExportTables.filter((x) => x !== t.tableName));
                          } else {
                            setSelectedExportTables([...selectedExportTables, t.tableName]);
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200">{t.displayName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({t.tableName})</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{t.rowCount.toLocaleString()} rows</span>
                  </label>
                );
              })}
            </div>

            <button
              onClick={handleExportExcel}
              disabled={exporting || selectedExportTables.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs disabled:opacity-50 transition-colors shadow-sm"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Generating Excel Backup...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Export {selectedExportTables.length} Tables to .xlsx
                </>
              )}
            </button>
          </div>

          {/* Offline Restore Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Upload className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Restore from Excel Backup</h3>
                <p className="text-xs text-slate-500">Upload a previously exported Excel workbook for safe reconciliation.</p>
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {uploadedExcelFile ? uploadedExcelFile.name : "Select an Excel backup (.xlsx) file"}
              </p>
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleInspectFile(f);
                }}
                className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            {inspectResult && (
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 text-xs space-y-2">
                <div className="flex items-center justify-between font-semibold text-indigo-900 dark:text-indigo-300">
                  <span>Pre-flight Inspection OK</span>
                  <span>{inspectResult.totalTablesInFile} tables, {inspectResult.totalRowsInFile} rows</span>
                </div>
                <button
                  onClick={handleRestoreFromExcel}
                  disabled={restoringExcel}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs disabled:opacity-50 transition-colors shadow-sm"
                >
                  {restoringExcel ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Restoring Data...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      Execute Excel Database Restore
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Create Backup Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-sm">Create In-Database Backup Schema</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Automatic Schema Naming Convention</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    The backup engine will create a dedicated PostgreSQL schema formatted as{" "}
                    <code className="font-mono bg-amber-200/50 dark:bg-amber-900/50 px-1 py-0.5 rounded font-bold">
                      {"{{actual_db_name}}_bkp_YYYYMMDD"}
                    </code>{" "}
                    (e.g., <span className="font-mono">siddhi_dev_bkp_{new Date().toISOString().slice(0, 10).replace(/-/g, "")}</span>
                    ). It is registered in <code className="font-mono font-bold">tenant.database_backups</code>.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Backup Label / Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily Pre-closing Checkpoint"
                  value={newBackupName}
                  onChange={(e) => setNewBackupName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Reason for backup or changes introduced..."
                  value={newBackupNotes}
                  onChange={(e) => setNewBackupNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                />
              </div>

              {/* Table Selection for Backup */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-300">
                  <span>Include Tables ({selectedTablesForBackup.length}/{eligibleTables.length})</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedTablesForBackup(
                        selectedTablesForBackup.length === eligibleTables.length
                          ? []
                          : eligibleTables.map((t) => t.tableName)
                      )
                    }
                    className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px]"
                  >
                    {selectedTablesForBackup.length === eligibleTables.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                  {eligibleTables.map((t) => {
                    const isSelected = selectedTablesForBackup.includes(t.tableName);
                    return (
                      <label
                        key={t.tableName}
                        className="flex items-center justify-between py-1 px-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedTablesForBackup(selectedTablesForBackup.filter((x) => x !== t.tableName));
                              } else {
                                setSelectedTablesForBackup([...selectedTablesForBackup, t.tableName]);
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{t.displayName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({t.tableName})</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{t.rowCount.toLocaleString()} rows</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSnapshot}
                disabled={creatingBackup || selectedTablesForBackup.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors shadow-sm"
              >
                {creatingBackup ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Creating Schema & Copying Tables...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Create Backup Schema
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: View Tables Inside Backup Snapshot */}
      {inspectingSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  Tables in Schema: <code className="text-amber-300">{inspectingSnapshot.backupSchemaName}</code>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Backup: {inspectingSnapshot.backupName} • {inspectingSnapshot.totalTables} tables •{" "}
                  {inspectingSnapshot.totalRows.toLocaleString()} total rows
                </p>
              </div>
              <button
                onClick={() => setInspectingSnapshot(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Table Name</th>
                    <th className="py-2.5 px-3">Display Name</th>
                    <th className="py-2.5 px-3">PostgreSQL Temp Table</th>
                    <th className="py-2.5 px-3 text-right">Row Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(inspectingSnapshot.tables || []).map((t) => (
                    <tr key={t.tableName} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white">
                        {t.tableName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{t.displayName}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                        "{inspectingSnapshot.backupSchemaName}"."{t.tableName}"
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                        {t.rowCount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectingSnapshot(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Restore Database Confirmation Modal */}
      {snapshotToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-900">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-sm">Restore In-Database Backup</h3>
              </div>
              <button onClick={() => setSnapshotToRestore(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-300 space-y-1">
                <p className="font-semibold">Safe Topological Reconciliation</p>
                <p className="text-[11px] leading-relaxed">
                  Data from schema <code className="font-mono font-bold">{snapshotToRestore.backupSchemaName}</code> will be
                  safely reconciled into the active schema <code className="font-mono font-bold">"{activeSchema}"</code>.
                  Existing records will be updated and missing records will be inserted. No data outside this backup will be dropped.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Source Schema:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {snapshotToRestore.backupSchemaName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Schema:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{activeSchema}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Tables:</span>
                  <span className="text-slate-800 dark:text-white">{snapshotToRestore.totalTables}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Rows to Reconcile:</span>
                  <span className="text-slate-800 dark:text-white">{snapshotToRestore.totalRows.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSnapshotToRestore(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={restoringSnapshot}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors shadow-sm"
              >
                {restoringSnapshot ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Executing In-Database Restore...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Confirm & Execute Restore
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Backup & DROP SCHEMA Confirmation */}
      {snapshotToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 bg-rose-950 text-white flex items-center justify-between border-b border-rose-900">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <h3 className="font-semibold text-sm">Drop Backup Schema & Purge Data</h3>
              </div>
              <button onClick={() => setSnapshotToDelete(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-900 dark:text-rose-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Warning: Irreversible PostgreSQL DROP SCHEMA CASCADE
                </p>
                <p className="text-[11px] leading-relaxed">
                  You are about to execute:
                  <br />
                  <code className="font-mono font-bold block mt-1 bg-black/40 text-rose-300 p-1.5 rounded">
                    DROP SCHEMA IF EXISTS "{snapshotToDelete.backupSchemaName}" CASCADE;
                  </code>
                  All backed up tables and records in this schema will be permanently purged from PostgreSQL disk storage.
                  The record in <code className="font-mono">tenant.database_backups</code> will be marked as Dropped,
                  and this action will be logged in <code className="font-mono">tenant.database_backup_restore_logs</code>.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Schema to Drop:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {snapshotToDelete.backupSchemaName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tables in Schema:</span>
                  <span className="text-slate-800 dark:text-white">{snapshotToDelete.totalTables}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rows to Purge:</span>
                  <span className="text-slate-800 dark:text-white">{snapshotToDelete.totalRows.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSnapshotToDelete(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAndDropSchema}
                disabled={droppingSchema}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 transition-colors shadow-sm"
              >
                {droppingSchema ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Dropping Schema...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Permanently Drop Schema & Purge Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Log Details / Diff Modal */}
      {selectedLogForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Audit Details & Row Diffs</h3>
                <p className="text-[11px] text-slate-400">
                  {selectedLogForDetails.action} • {new Date(selectedLogForDetails.executedAtUtc).toLocaleString()} • {selectedLogForDetails.executedBy}
                </p>
              </div>
              <button onClick={() => setSelectedLogForDetails(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs">
              <pre className="bg-slate-950 text-slate-200 p-3 rounded-lg overflow-x-auto text-[11px] whitespace-pre-wrap">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(selectedLogForDetails.detailsJson || "{}"), null, 2);
                  } catch {
                    return selectedLogForDetails.detailsJson || "No diff details available";
                  }
                })()}
              </pre>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLogForDetails(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Restore Result Summary Modal */}
      {restoreResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-sm">Database Restore Execution Summary</h3>
              </div>
              <button onClick={() => setRestoreResult(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700 dark:text-slate-300">{restoreResult.message}</p>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-[10px] text-slate-500">Processed</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    {restoreResult.totalRowsProcessed.toLocaleString()}
                  </div>
                </div>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                  <div className="text-[10px] text-emerald-600">Inserted</div>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    +{restoreResult.totalInserted.toLocaleString()}
                  </div>
                </div>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
                  <div className="text-[10px] text-blue-600">Updated</div>
                  <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                    ~{restoreResult.totalUpdated.toLocaleString()}
                  </div>
                </div>
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg">
                  <div className="text-[10px] text-rose-600">Errors</div>
                  <div className="text-base font-bold text-rose-600 dark:text-rose-400">
                    {restoreResult.totalErrors.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Table audits */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {restoreResult.tableAudits.map((a) => (
                  <div key={a.tableName} className="p-2 flex items-center justify-between text-[11px]">
                    <div className="font-mono text-slate-800 dark:text-slate-200">
                      {a.tableName} <span className="text-[10px] text-slate-400">({a.displayName})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 font-medium">+{a.insertedCount}</span>
                      <span className="text-blue-600 font-medium">~{a.updatedCount}</span>
                      <span className="text-slate-400">={a.unchangedCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setRestoreResult(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


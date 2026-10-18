import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Check,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Database,
  ShieldCheck,
  FileText,
  Trash2,
  Layers,
  HardDrive,
  Clock,
  RotateCcw,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { useNotifications } from "../../context/NotificationContext";

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

export interface SnapshotTableInfo {
  tableName: string;
  displayName: string;
  rowCount: number;
  tempTableName: string;
}

export interface DatabaseSnapshot {
  id: string;
  backupName: string;
  sourceSchema: string;
  totalTables: number;
  totalRows: number;
  createdAtUtc: string;
  createdBy: string;
  notes?: string | null;
  tables: SnapshotTableInfo[];
}

export interface AvailableTableSource {
  tableName: string;
  displayName: string;
  tableType?: string;
  category?: string;
  rowCount?: number;
  isSystem?: boolean;
}

interface DatabaseBackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: string;
  availableTables?: AvailableTableSource[];
  initialMode: "export" | "restore" | "db-snapshot" | "db-restore";
  onSuccess?: () => void;
}

export function DatabaseBackupRestoreModal({
  isOpen,
  onClose,
  schema,
  availableTables,
  initialMode,
  onSuccess,
}: DatabaseBackupRestoreModalProps) {
  const notifications = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"export" | "restore" | "db-snapshot" | "db-restore">(initialMode);
  const [loading, setLoading] = useState(false);

  // Table selection for export / snapshot
  const [exportTables, setExportTables] = useState<BackupTableInfo[]>([]);
  const [selectedExportTables, setSelectedExportTables] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  // Database Temp-Table Snapshot State
  const [snapshots, setSnapshots] = useState<DatabaseSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [snapshotBackupName, setSnapshotBackupName] = useState("");
  const [snapshotNotes, setSnapshotNotes] = useState("");
  const [restoringSnapshotId, setRestoringSnapshotId] = useState<string | null>(null);
  const [deletingSnapshotId, setDeletingSnapshotId] = useState<string | null>(null);
  const [droppingBackupSchema, setDroppingBackupSchema] = useState(false);

  // Restore from Excel State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState<InspectBackupResult | null>(null);
  const [selectedRestoreTables, setSelectedRestoreTables] = useState<string[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<DatabaseRestoreResult | null>(null);

  // Expandable difference logs
  const [expandedTableDiffs, setExpandedTableDiffs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMode(initialMode);
    setSelectedFile(null);
    setInspectResult(null);
    setRestoreResult(null);
    setExpandedTableDiffs({});
  }, [initialMode, isOpen]);

  // Seed tables from availableTables if present
  useEffect(() => {
    if (!isOpen) return;

    if (availableTables && availableTables.length > 0) {
      const initialList: BackupTableInfo[] = availableTables
        .filter((t) => !t.tableName.startsWith("__") && t.tableName !== "table_registry")
        .map((t) => ({
          tableName: t.tableName,
          displayName: t.displayName || t.tableName,
          tableType: t.tableType || "Data",
          category: t.category || "General",
          rowCount: t.rowCount ?? 0,
          isSelected: true,
          isSystem: t.isSystem ?? false,
        }));
      setExportTables(initialList);
      setSelectedExportTables(initialList.map((t) => t.tableName));
    }
  }, [isOpen, availableTables]);

  // Fetch tables from server for freshest counts
  useEffect(() => {
    if (!isOpen) return;

    const fetchTables = async () => {
      if (!availableTables || availableTables.length === 0) {
        setLoading(true);
      }
      try {
        const res = await apiClient.get<any>(
          `/admin/backup/tables?schema=${encodeURIComponent(schema)}`
        );
        const list: BackupTableInfo[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.tables)
          ? res.tables
          : Array.isArray(res?.data?.tables)
          ? res.data.tables
          : Array.isArray(res?.data)
          ? res.data
          : [];

        if (list.length > 0) {
          setExportTables(list);
          setSelectedExportTables((prev) => (prev.length > 0 ? prev : list.map((t) => t.tableName)));
        }
      } catch (err) {
        if (!availableTables || availableTables.length === 0) {
          notifications.error("Failed to load tables", err instanceof Error ? err.message : "Error fetching tables");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, [isOpen, schema, availableTables]);

  // Fetch snapshots from database temp tables
  const fetchSnapshots = useCallback(async () => {
    setLoadingSnapshots(true);
    try {
      const data = await apiClient.get<DatabaseSnapshot[]>(
        `/admin/backup/snapshots?schema=${encodeURIComponent(schema)}`
      );
      setSnapshots(Array.isArray(data) ? data : []);
    } catch {
      setSnapshots([]);
    } finally {
      setLoadingSnapshots(false);
    }
  }, [schema]);

  useEffect(() => {
    if (isOpen && (mode === "db-restore" || mode === "db-snapshot")) {
      fetchSnapshots();
    }
  }, [isOpen, mode, fetchSnapshots]);

  if (!isOpen) return null;

  // Toggle export selection
  const handleToggleExportTable = (tableName: string) => {
    setSelectedExportTables((prev) =>
      prev.includes(tableName) ? prev.filter((t) => t !== tableName) : [...prev, tableName]
    );
  };

  const handleSelectAllExport = () => {
    if (selectedExportTables.length === exportTables.length) {
      setSelectedExportTables([]);
    } else {
      setSelectedExportTables(exportTables.map((t) => t.tableName));
    }
  };

  // 1. Create In-Database Snapshot (Stored in same DB temp tables)
  const handleCreateDatabaseSnapshot = async () => {
    if (selectedExportTables.length === 0) {
      notifications.error("Selection Required", "Please select at least one table to backup.");
      return;
    }

    setCreatingSnapshot(true);
    try {
      const res = await apiClient.post<DatabaseSnapshot>("/admin/backup/create-snapshot", {
        schema,
        tables: selectedExportTables,
        backupName: snapshotBackupName.trim() || undefined,
        notes: snapshotNotes.trim() || undefined,
      });

      notifications.success(
        "Backup Stored in Database",
        `Snapshot '${res.backupName}' with ${res.totalTables} tables (${res.totalRows.toLocaleString()} records) created in database temp tables.`
      );
      setSnapshotBackupName("");
      setSnapshotNotes("");
      await fetchSnapshots();
      setMode("db-restore");
      onSuccess?.();
    } catch (err) {
      notifications.error("Snapshot Failed", err instanceof Error ? err.message : "Failed to create database snapshot.");
    } finally {
      setCreatingSnapshot(false);
    }
  };

  // 2. Restore directly from in-database temp tables
  const handleRestoreDatabaseSnapshot = async (snapshot: DatabaseSnapshot) => {
    const confirmed = await notifications.confirm({
      title: `Restore Backup '${snapshot.backupName}'?`,
      message: `This will restore ${snapshot.totalTables} tables (${snapshot.totalRows.toLocaleString()} records) directly from the database temp tables in the same database.`,
      variant: "warning",
      confirmLabel: "Restore from Database",
    });
    if (!confirmed) return;

    setRestoringSnapshotId(snapshot.id);
    try {
      const res = await apiClient.post<DatabaseRestoreResult>(`/admin/backup/restore-snapshot/${snapshot.id}`, {
        schema,
      });
      setRestoreResult(res);

      if (res.success) {
        notifications.success("Restore Completed", res.message);
        onSuccess?.();
      } else {
        notifications.error("Restore Completed with Warnings", res.message);
      }
    } catch (err) {
      notifications.error("Restore Failed", err instanceof Error ? err.message : "Failed to restore database snapshot.");
    } finally {
      setRestoringSnapshotId(null);
    }
  };

  // 3. Delete in-database snapshot & drop temp tables
  const handleDeleteDatabaseSnapshot = async (snapshot: DatabaseSnapshot) => {
    const confirmed = await notifications.confirm({
      title: `Delete Backup '${snapshot.backupName}'?`,
      message: `This will drop the temporary backup tables (admin_table_clear.temp_snap_...) from the database and remove this snapshot record.`,
      variant: "danger",
      confirmLabel: "Delete Temp Tables",
    });
    if (!confirmed) return;

    setDeletingSnapshotId(snapshot.id);
    try {
      await apiClient.delete(`/admin/backup/snapshots/${snapshot.id}`);
      notifications.success("Backup Deleted", "Temporary backup tables dropped from the database.");
      await fetchSnapshots();
    } catch (err) {
      notifications.error("Delete Failed", err instanceof Error ? err.message : "Failed to delete snapshot.");
    } finally {
      setDeletingSnapshotId(null);
    }
  };

  // 3b. Manually drop all temporary backup tables and admin_table_clear schema
  const handleDropBackupDataAndSchema = async () => {
    const confirmed = await notifications.confirm({
      title: "Drop All Backup Temp Tables & Schema?",
      message:
        "This will permanently DROP SCHEMA admin_table_clear CASCADE and eliminate all temporary backup tables and snapshot records from the database. Are you sure you want to proceed?",
      variant: "danger",
      confirmLabel: "Drop Temp Schema & Tables",
    });
    if (!confirmed) return;

    setDroppingBackupSchema(true);
    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        droppedTablesCount: number;
        droppedTables: string[];
      }>("/admin/backup/drop-backup-schema", {});

      notifications.success(
        "Backup Schema & Temp Data Dropped",
        res.message || "Temporary backup tables and admin_table_clear schema have been dropped from the database."
      );
      await fetchSnapshots();
      onSuccess?.();
    } catch (err) {
      notifications.error(
        "Drop Failed",
        err instanceof Error ? err.message : "Failed to drop backup temporary tables and schema."
      );
    } finally {
      setDroppingBackupSchema(false);
    }
  };

  // 4. Execute Excel Export using apiClient.download
  const handleExecuteExport = async () => {
    if (selectedExportTables.length === 0) {
      notifications.error("Selection Required", "Please select at least one table to export.");
      return;
    }

    setExporting(true);
    try {
      const defaultFileName = `${schema}_backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const url = `/admin/backup/export?schema=${encodeURIComponent(schema)}`;

      await apiClient.download(url, defaultFileName, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tables: selectedExportTables }),
      });

      notifications.success("Export Downloaded", `Exported ${selectedExportTables.length} tables to ${defaultFileName}`);
      onClose();
    } catch (err) {
      notifications.error("Export Failed", err instanceof Error ? err.message : "Failed to export data to Excel.");
    } finally {
      setExporting(false);
    }
  };

  // 5. Inspect uploaded Excel file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      notifications.error("Invalid File Type", "Please select an Excel workbook (.xlsx) file.");
      return;
    }

    setSelectedFile(file);
    setRestoreResult(null);
    setInspecting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient.post<InspectBackupResult>("/admin/backup/inspect", formData);
      setInspectResult(res);
      setSelectedRestoreTables(res.tables.map((t) => t.tableName));
    } catch (err) {
      notifications.error("Inspection Failed", err instanceof Error ? err.message : "Could not inspect the Excel file.");
      setSelectedFile(null);
    } finally {
      setInspecting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleToggleRestoreTable = (tableName: string) => {
    setSelectedRestoreTables((prev) =>
      prev.includes(tableName) ? prev.filter((t) => t !== tableName) : [...prev, tableName]
    );
  };

  const handleSelectAllRestore = () => {
    if (!inspectResult) return;
    if (selectedRestoreTables.length === inspectResult.tables.length) {
      setSelectedRestoreTables([]);
    } else {
      setSelectedRestoreTables(inspectResult.tables.map((t) => t.tableName));
    }
  };

  // 6. Execute Restore from Excel
  const handleExecuteRestore = async () => {
    if (!selectedFile) {
      notifications.error("No File", "Please choose an Excel file to restore.");
      return;
    }

    if (selectedRestoreTables.length === 0) {
      notifications.error("Selection Required", "Please select at least one table to restore.");
      return;
    }

    const confirmed = await notifications.confirm({
      title: "Confirm Database Restore?",
      message: `You are about to restore data into schema '${schema}' for ${selectedRestoreTables.length} selected tables. Existing records will be updated only if modified; new records will be inserted. No data will be truncated.`,
      variant: "warning",
      confirmLabel: "Proceed with Restore",
    });

    if (!confirmed) return;

    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("schema", schema);
      formData.append("tables", JSON.stringify(selectedRestoreTables));

      const res = await apiClient.post<DatabaseRestoreResult>("/admin/backup/restore", formData);
      setRestoreResult(res);

      if (res.success) {
        notifications.success("Restore Completed", res.message);
        onSuccess?.();
      } else {
        notifications.error("Restore Partially Completed", res.message);
      }
    } catch (err) {
      notifications.error("Restore Failed", err instanceof Error ? err.message : "Database restore failed.");
    } finally {
      setRestoring(false);
    }
  };

  const toggleTableDiff = (table: string) => {
    setExpandedTableDiffs((prev) => ({ ...prev, [table]: !prev[table] }));
  };

  const handleDownloadRestoreLog = () => {
    if (!restoreResult) return;

    const timestamp = new Date(restoreResult.restoredAtUtc).toISOString();
    const divider = "=".repeat(88);
    const subDivider = "-".repeat(88);

    const lines: string[] = [
      divider,
      ` DATABASE RESTORE AUDIT LOG REPORT`,
      divider,
      ` Timestamp (UTC)  : ${timestamp}`,
      ` Target Schema    : ${restoreResult.targetSchema}`,
      ` Backup Source    : ${restoreResult.backupFileName}`,
      ` Status           : ${restoreResult.success ? "SUCCESS" : "PARTIAL / COMPLETED WITH WARNINGS"}`,
      ` Summary Message  : ${restoreResult.message}`,
      ...(restoreResult.auditLogId ? [` Audit Log Ref    : ${restoreResult.auditLogId}`] : []),
      divider,
      ` EXECUTIVE METRICS`,
      divider,
      ` Total Tables Restored : ${restoreResult.selectedTablesCount} of ${restoreResult.totalTablesInFile}`,
      ` Total Rows Processed  : ${restoreResult.totalRowsProcessed}`,
      ` Total Rows Inserted   : ${restoreResult.totalInserted}`,
      ` Total Rows Updated    : ${restoreResult.totalUpdated}`,
      ` Total Rows Unchanged  : ${restoreResult.totalUnchanged}`,
      ` Total Errors / Skips  : ${restoreResult.totalErrors}`,
      divider,
      ` TABLE-BY-TABLE BREAKDOWN`,
      divider,
      String("TABLE").padEnd(32) +
        String("STATUS").padEnd(12) +
        String("ROWS").padStart(8) +
        String("INSERTED").padStart(10) +
        String("UPDATED").padStart(10) +
        String("UNCHANGED").padStart(10) +
        String("ERRORS").padStart(8),
      subDivider,
    ];

    for (const audit of restoreResult.tableAudits) {
      lines.push(
        audit.tableName.padEnd(32) +
          audit.status.padEnd(12) +
          String(audit.rowsInFile).padStart(8) +
          String(audit.insertedCount).padStart(10) +
          String(audit.updatedCount).padStart(10) +
          String(audit.unchangedCount).padStart(10) +
          String(audit.errorCount).padStart(8)
      );

      if (audit.sampleDifferences && audit.sampleDifferences.length > 0) {
        lines.push(`    [MODIFICATIONS / CORRECTIONS]`);
        for (const diff of audit.sampleDifferences) {
          lines.push(`      * ${diff}`);
        }
      }

      if (audit.errorMessage) {
        lines.push(`    [ERROR]: ${audit.errorMessage}`);
      }
    }

    lines.push(divider);
    lines.push(` END OF RESTORE AUDIT LOG`);
    lines.push(divider);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanFileName = restoreResult.backupFileName.replace(/\.xlsx$/i, "");
    link.download = `RestoreAudit_${cleanFileName}_${new Date().toISOString().slice(0, 10)}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Database className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Database Backup & Restore
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Schema: {schema}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data is stored in temporary tables inside the same database. Zero extra databases created.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tab Controls (Only if not viewing restore result) */}
        {!restoreResult && (
          <div className="flex border-b border-slate-200 px-6 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <button
              onClick={() => setMode("db-snapshot")}
              className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition whitespace-nowrap ${
                mode === "db-snapshot"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <HardDrive className="size-4" />
              <span>Backup to DB (Temp Table)</span>
            </button>
            <button
              onClick={() => setMode("db-restore")}
              className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition whitespace-nowrap ${
                mode === "db-restore"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <RotateCcw className="size-4" />
              <span>Restore from DB ({snapshots.length})</span>
            </button>
            <button
              onClick={() => setMode("export")}
              className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition whitespace-nowrap ${
                mode === "export"
                  ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Download className="size-4" />
              <span>Export to Excel File</span>
            </button>
            <button
              onClick={() => setMode("restore")}
              className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition whitespace-nowrap ${
                mode === "restore"
                  ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Upload className="size-4" />
              <span>Restore from Excel File</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ======================= RESTORE RESULTS VIEW ======================= */}
          {restoreResult && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div
                className={`rounded-xl border p-4 ${
                  restoreResult.success
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {restoreResult.success ? (
                      <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="size-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-base">
                        {restoreResult.success ? "Database Restore Succeeded" : "Restore Completed with Warnings"}
                      </h3>
                      <p className="text-xs mt-1 opacity-90">{restoreResult.message}</p>
                      <div className="mt-2 text-xs font-medium flex flex-wrap gap-4 opacity-80">
                        <span>Source: {restoreResult.backupFileName}</span>
                        <span>Target Schema: {restoreResult.targetSchema}</span>
                        <span>Completed: {new Date(restoreResult.restoredAtUtc).toLocaleTimeString()}</span>
                        {restoreResult.auditLogId && (
                          <span>Audit Log ID: {restoreResult.auditLogId.slice(0, 8)}…</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadRestoreLog}
                    className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shrink-0 transition"
                    title="Download Formatted Log File"
                  >
                    <Download className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Download Log (.log)</span>
                  </button>
                </div>
              </div>

              {/* Post-Restore Cleanup Action Banner (Super Admin) */}
              <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-red-900 dark:text-red-300 flex items-center gap-1.5">
                      <Trash2 className="size-4 text-red-600 dark:text-red-400" />
                      Post-Restore Storage Cleanup (Manual Action)
                    </h4>
                    <p className="text-xs text-red-800/80 dark:text-red-300/80">
                      Restore is completely done. As Super Admin, you can now permanently drop the temporary backup data and schema (<code>admin_table_clear</code>) to free up database storage.
                    </p>
                  </div>
                  <button
                    onClick={handleDropBackupDataAndSchema}
                    disabled={droppingBackupSchema}
                    className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 disabled:opacity-50 shrink-0 transition"
                  >
                    {droppingBackupSchema ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>Dropping Temp Schema…</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-3.5" />
                        <span>Drop Backup Temp Data & Schema</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Rows</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {restoreResult.totalRowsProcessed.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Inserted (New)</span>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                    +{restoreResult.totalInserted.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Updated (Diffs)</span>
                  <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1">
                    {restoreResult.totalUpdated.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Unchanged</span>
                  <p className="text-2xl font-black text-slate-600 dark:text-slate-300 mt-1">
                    {restoreResult.totalUnchanged.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Detailed Table Audit Log */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                  <span>Table-by-Table Difference Breakdown</span>
                  <span className="text-xs font-normal text-slate-500">
                    {restoreResult.tableAudits.length} table(s) restored
                  </span>
                </h4>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Table Name</th>
                        <th className="py-2.5 px-3 text-right">Rows in Source</th>
                        <th className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">Inserted</th>
                        <th className="py-2.5 px-3 text-right text-indigo-700 dark:text-indigo-400">Updated</th>
                        <th className="py-2.5 px-3 text-right text-slate-500">Unchanged</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Diff Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                      {restoreResult.tableAudits.map((audit) => (
                        <tr key={audit.tableName} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                            {audit.tableName}
                            <span className="block text-[10px] font-normal text-slate-400">{audit.displayName}</span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300">
                            {audit.rowsInFile}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {audit.insertedCount > 0 ? `+${audit.insertedCount}` : "0"}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                            {audit.updatedCount}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-400">
                            {audit.unchangedCount}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                audit.status === "Success"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : audit.status === "Partial"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              }`}
                            >
                              {audit.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {audit.sampleDifferences && audit.sampleDifferences.length > 0 ? (
                              <button
                                onClick={() => toggleTableDiff(audit.tableName)}
                                className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 text-[11px] font-semibold underline flex items-center justify-center gap-1 mx-auto"
                              >
                                {expandedTableDiffs[audit.tableName] ? (
                                  <>Hide ({audit.sampleDifferences.length}) <ChevronDown className="size-3" /></>
                                ) : (
                                  <>View ({audit.sampleDifferences.length}) <ChevronRight className="size-3" /></>
                                )}
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px]">None</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================= TAB 1: DB SNAPSHOT TO TEMP TABLE ======================= */}
          {!restoreResult && mode === "db-snapshot" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200 flex items-start gap-3">
                <ShieldCheck className="size-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">In-Database Temporary Table Backup</h4>
                  <p className="mt-0.5 text-[11px] opacity-90">
                    Selected tables are copied into temporary tables directly in the <strong>same PostgreSQL database</strong> (under <code>admin_table_clear</code> schema). Zero extra databases or external files are created. When you restore, the data is read directly from those tables.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Backup Snapshot Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={snapshotBackupName}
                    onChange={(e) => setSnapshotBackupName(e.target.value)}
                    placeholder={`${schema}_backup_${new Date().toISOString().slice(0, 10)}`}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notes / Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={snapshotNotes}
                    onChange={(e) => setSnapshotNotes(e.target.value)}
                    placeholder="e.g. Pre-migration backup or monthly snapshot"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Select Tables to Backup into Database Temp Tables:
                </h3>
                <button
                  onClick={handleSelectAllExport}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                >
                  {selectedExportTables.length === exportTables.length ? (
                    <>
                      <CheckSquare className="size-4" /> Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="size-4" /> Select All ({exportTables.length})
                    </>
                  )}
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="size-6 animate-spin text-indigo-600" />
                </div>
              ) : exportTables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                  <Database className="size-8 text-slate-400 mb-2" />
                  <p className="text-sm font-semibold">No eligible tables found for schema "{schema}".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[40vh] overflow-y-auto p-1">
                  {exportTables.map((table) => {
                    const isChecked = selectedExportTables.includes(table.tableName);
                    return (
                      <div
                        key={table.tableName}
                        onClick={() => handleToggleExportTable(table.tableName)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${
                          isChecked
                            ? "border-indigo-300 bg-indigo-50/60 text-indigo-950 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="size-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="truncate">
                            <span className="font-semibold block truncate">{table.tableName}</span>
                            <span className="text-[10px] text-slate-400 block">{table.displayName}</span>
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                          {table.rowCount.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
                <span>
                  Selected: <strong>{selectedExportTables.length}</strong> of {exportTables.length} tables
                </span>
                <span>
                  Total Rows to Store:{" "}
                  <strong>
                    {exportTables
                      .filter((t) => selectedExportTables.includes(t.tableName))
                      .reduce((sum, t) => sum + t.rowCount, 0)
                      .toLocaleString()}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* ======================= TAB 2: DB RESTORE FROM TEMP TABLE ======================= */}
          {!restoreResult && mode === "db-restore" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Available In-Database Backup Snapshots
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Snapshots stored in temp tables in this database. Restoring reads directly from these tables.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDropBackupDataAndSchema}
                    disabled={droppingBackupSchema}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 transition"
                    title="Drop all backup temporary tables and schema (admin_table_clear)"
                  >
                    <Trash2 className="size-3" />
                    <span>Drop Temp Schema & Tables</span>
                  </button>
                  <button
                    onClick={fetchSnapshots}
                    disabled={loadingSnapshots}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                  >
                    <RefreshCw className={`size-3.5 ${loadingSnapshots ? "animate-spin" : ""}`} />
                    <span>Refresh Snapshots</span>
                  </button>
                </div>
              </div>

              {loadingSnapshots ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="size-6 animate-spin text-indigo-600" />
                </div>
              ) : snapshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border-2 border-dashed border-slate-200 p-8 dark:border-slate-800">
                  <HardDrive className="size-8 text-slate-400 mb-2" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No In-Database Snapshots Found</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Switch to the "Backup to DB" tab above to create an in-database snapshot. Data will be saved in temp tables inside the same database.
                  </p>
                  <button
                    onClick={() => setMode("db-snapshot")}
                    className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    Create First In-Database Backup
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto p-1">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {snap.backupName}
                            </span>
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              {snap.totalTables} Tables
                            </span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              {snap.totalRows.toLocaleString()} Rows
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {new Date(snap.createdAtUtc).toLocaleString()}
                            </span>
                            <span>Created By: {snap.createdBy}</span>
                            {snap.notes && <span className="italic text-slate-500">"{snap.notes}"</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            onClick={() => handleDeleteDatabaseSnapshot(snap)}
                            disabled={deletingSnapshotId === snap.id || restoringSnapshotId === snap.id}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400 transition"
                            title="Delete Snapshot & Drop Temp Tables"
                          >
                            <Trash2 className="size-4" />
                          </button>
                          <button
                            onClick={() => handleRestoreDatabaseSnapshot(snap)}
                            disabled={restoringSnapshotId === snap.id || deletingSnapshotId === snap.id}
                            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition"
                          >
                            {restoringSnapshotId === snap.id ? (
                              <>
                                <RefreshCw className="size-3.5 animate-spin" />
                                <span>Restoring from Temp Table…</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw className="size-3.5" />
                                <span>Restore from Database</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Tables Mini Preview */}
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                        {snap.tables.slice(0, 10).map((t) => (
                          <span
                            key={t.tableName}
                            className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {t.tableName} ({t.rowCount})
                          </span>
                        ))}
                        {snap.tables.length > 10 && (
                          <span className="text-[10px] text-slate-400 self-center">
                            +{snap.tables.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================= TAB 3: EXPORT TO EXCEL VIEW ======================= */}
          {!restoreResult && mode === "export" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Select Tables to Export to Excel
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Each selected table will be exported as its own formatted sheet in an Excel workbook.
                  </p>
                </div>
                <button
                  onClick={handleSelectAllExport}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 dark:text-emerald-400"
                >
                  {selectedExportTables.length === exportTables.length ? (
                    <>
                      <CheckSquare className="size-4" /> Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="size-4" /> Select All ({exportTables.length})
                    </>
                  )}
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="size-6 animate-spin text-emerald-600" />
                </div>
              ) : exportTables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                  <Database className="size-8 text-slate-400 mb-2" />
                  <p className="text-sm font-semibold">No eligible tables found for schema "{schema}".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[45vh] overflow-y-auto p-1">
                  {exportTables.map((table) => {
                    const isChecked = selectedExportTables.includes(table.tableName);
                    return (
                      <div
                        key={table.tableName}
                        onClick={() => handleToggleExportTable(table.tableName)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${
                          isChecked
                            ? "border-emerald-300 bg-emerald-50/60 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="size-4 rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className="truncate">
                            <span className="font-semibold block truncate">{table.tableName}</span>
                            <span className="text-[10px] text-slate-400 block">{table.displayName}</span>
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                          {table.rowCount.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
                <span>
                  Selected: <strong>{selectedExportTables.length}</strong> of {exportTables.length} tables
                </span>
                <span>
                  Total Records:{" "}
                  <strong>
                    {exportTables
                      .filter((t) => selectedExportTables.includes(t.tableName))
                      .reduce((sum, t) => sum + t.rowCount, 0)
                      .toLocaleString()}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* ======================= TAB 4: RESTORE FROM EXCEL VIEW ======================= */}
          {!restoreResult && mode === "restore" && (
            <div className="space-y-5">
              {!inspectResult ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-emerald-500 hover:bg-emerald-50/30 dark:border-slate-700 dark:hover:border-emerald-500 transition cursor-pointer"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center">
                    <div className="rounded-2xl bg-emerald-100 p-4 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 mb-3">
                      {inspecting ? (
                        <RefreshCw className="size-8 animate-spin" />
                      ) : (
                        <Upload className="size-8" />
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {inspecting ? "Analyzing Excel Backup..." : "Click or Drag & Drop Backup Excel File"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Upload any .xlsx backup workbook previously generated by this system.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                        <FileSpreadsheet className="size-4" />
                        {inspectResult.fileName}
                      </h4>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                        {inspectResult.totalTablesInFile} tables detected with{" "}
                        {inspectResult.totalRowsInFile.toLocaleString()} records
                        {inspectResult.sourceSchema && ` (Original source: ${inspectResult.sourceSchema})`}.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setInspectResult(null);
                      }}
                      className="text-xs font-semibold text-emerald-800 hover:underline dark:text-emerald-300"
                    >
                      Choose Different File
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Select Tables to Restore (Default: All)
                      </h4>
                      <button
                        onClick={handleSelectAllRestore}
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                      >
                        {selectedRestoreTables.length === inspectResult.tables.length ? (
                          <>
                            <CheckSquare className="size-3.5" /> Deselect All
                          </>
                        ) : (
                          <>
                            <Square className="size-3.5" /> Select All ({inspectResult.tables.length})
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[35vh] overflow-y-auto p-1">
                      {inspectResult.tables.map((t) => {
                        const isChecked = selectedRestoreTables.includes(t.tableName);
                        return (
                          <div
                            key={t.tableName}
                            onClick={() => handleToggleRestoreTable(t.tableName)}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                              isChecked
                                ? "border-emerald-300 bg-emerald-50/50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="size-3.5 rounded text-emerald-600"
                              />
                              <span className="font-semibold truncate">{t.tableName}</span>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {t.rowCount} rows
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Safe Upsert Restore</span>: Missing records will be inserted.
                      Existing records will be updated only if differences are detected. An audit log will be created.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              {restoreResult ? "Done" : "Cancel"}
            </button>
            {restoreResult && (
              <>
                <button
                  onClick={handleDownloadRestoreLog}
                  className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 transition"
                >
                  <FileText className="size-3.5" />
                  <span>Save Full Log Report (.log)</span>
                </button>
                <button
                  onClick={handleDropBackupDataAndSchema}
                  disabled={droppingBackupSchema}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 transition disabled:opacity-50"
                >
                  {droppingBackupSchema ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Dropping Temp Schema…</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-3.5 text-red-600 dark:text-red-400" />
                      <span>Drop Backup Temp Data & Schema</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Action button for DB Snapshot */}
          {!restoreResult && mode === "db-snapshot" && (
            <button
              onClick={handleCreateDatabaseSnapshot}
              disabled={creatingSnapshot || selectedExportTables.length === 0}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {creatingSnapshot ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Copying to Database Temp Tables...</span>
                </>
              ) : (
                <>
                  <HardDrive className="size-4" />
                  <span>Create Backup in Database ({selectedExportTables.length})</span>
                </>
              )}
            </button>
          )}

          {/* Action button for Excel Export */}
          {!restoreResult && mode === "export" && (
            <button
              onClick={handleExecuteExport}
              disabled={exporting || selectedExportTables.length === 0}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {exporting ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Generating Excel Backup...</span>
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  <span>Download Excel Backup ({selectedExportTables.length})</span>
                </>
              )}
            </button>
          )}

          {/* Action button for Excel Restore */}
          {!restoreResult && mode === "restore" && inspectResult && (
            <button
              onClick={handleExecuteRestore}
              disabled={restoring || selectedRestoreTables.length === 0}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {restoring ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Restoring Data & Computing Diffs...</span>
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  <span>Execute Restore ({selectedRestoreTables.length} Tables)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

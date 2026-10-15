import { useState, useEffect, useRef } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  X,
  Check,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Database,
  ArrowRight,
  ShieldCheck,
  FileText
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
  initialMode: "export" | "restore";
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

  const [mode, setMode] = useState<"export" | "restore">(initialMode);
  const [loading, setLoading] = useState(false);

  // Export State
  const [exportTables, setExportTables] = useState<BackupTableInfo[]>([]);
  const [selectedExportTables, setSelectedExportTables] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  // Restore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState<InspectBackupResult | null>(null);
  const [selectedRestoreTables, setSelectedRestoreTables] = useState<string[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<DatabaseRestoreResult | null>(null);

  // Differences expandable state
  const [expandedTableDiffs, setExpandedTableDiffs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMode(initialMode);
    setSelectedFile(null);
    setInspectResult(null);
    setRestoreResult(null);
    setExpandedTableDiffs({});
  }, [initialMode, isOpen]);

  // Synchronously seed tables from availableTables if present
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

  // Fetch tables from server for freshest row counts and validation
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

  // Execute Excel Export using apiClient.download
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

  // Inspect uploaded Excel file
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

      const inspectData = await apiClient.post<InspectBackupResult>("/admin/backup/inspect", formData);
      setInspectResult(inspectData);
      setSelectedRestoreTables(inspectData.tables.map((t) => t.tableName));
      notifications.success(
        "File Analyzed",
        `Found ${inspectData.totalTablesInFile} table(s) with ${inspectData.totalRowsInFile.toLocaleString()} record(s).`
      );
    } catch (err) {
      notifications.error("Inspection Failed", err instanceof Error ? err.message : "Failed to inspect Excel file.");
      setSelectedFile(null);
      setInspectResult(null);
    } finally {
      setInspecting(false);
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

  // Execute Restore from Excel
  const handleExecuteRestore = async () => {
    if (!selectedFile) {
      notifications.error("File Required", "Please select an Excel backup file to restore.");
      return;
    }

    if (selectedRestoreTables.length === 0) {
      notifications.error("Selection Required", "Please select at least one table to restore.");
      return;
    }

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
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <FileSpreadsheet className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Excel Data Backup & Restore
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Schema: {schema}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Export well-formatted multi-sheet Excel files or restore data with full difference tracking and audit logs.
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
          <div className="flex border-b border-slate-200 px-6 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button
              onClick={() => setMode("export")}
              className={`flex items-center gap-2 border-b-2 py-3 px-4 text-sm font-semibold transition ${
                mode === "export"
                  ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Download className="size-4" />
              <span>Export to Excel Backup</span>
            </button>
            <button
              onClick={() => setMode("restore")}
              className={`flex items-center gap-2 border-b-2 py-3 px-4 text-sm font-semibold transition ${
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
                        <span>File: {restoreResult.backupFileName}</span>
                        <span>Target: {restoreResult.targetSchema}</span>
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
                        <th className="py-2.5 px-3 text-right">Rows in File</th>
                        <th className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">Inserted</th>
                        <th className="py-2.5 px-3 text-right text-indigo-700 dark:text-indigo-400">Updated</th>
                        <th className="py-2.5 px-3 text-right text-slate-500">Unchanged</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Diff Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                      {restoreResult.tableAudits.map((audit) => (
                        <>
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

                          {/* Expanded Differences */}
                          {expandedTableDiffs[audit.tableName] && audit.sampleDifferences && (
                            <tr key={`${audit.tableName}-diffs`} className="bg-slate-50/90 dark:bg-slate-800/80">
                              <td colSpan={7} className="p-3">
                                <div className="space-y-1">
                                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                    Sample Modifications in '{audit.tableName}':
                                  </p>
                                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                                    {audit.sampleDifferences.map((diff, idx) => (
                                      <li key={idx} className="font-mono">{diff}</li>
                                    ))}
                                  </ul>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================= EXPORT MODE VIEW ======================= */}
          {!restoreResult && mode === "export" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Select Tables to Include in Backup
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    All tables are selected by default. Each selected table will be exported as its own formatted sheet.
                  </p>
                </div>
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
                  <p className="text-xs text-slate-400 mt-1">Please ensure the store schema has active tables or click "Scan & Sync DB" on the dashboard.</p>
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
                            onChange={() => {}} // handled by parent onClick
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

          {/* ======================= RESTORE MODE VIEW ======================= */}
          {!restoreResult && mode === "restore" && (
            <div className="space-y-5">
              {/* File Upload Box */}
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
                /* Inspection Summary and Table Selector */
                <div className="space-y-4">
                  {/* File Metadata Card */}
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

                  {/* Table Selection for Restore */}
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

                  {/* Warning banner */}
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
              <button
                onClick={handleDownloadRestoreLog}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 transition"
              >
                <FileText className="size-3.5" />
                <span>Save Full Log Report (.log)</span>
              </button>
            )}
          </div>

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


import { useState, useEffect, useRef } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Check,
  ArrowRight,
  ShieldCheck,
  Building2,
  Truck,
  Factory,
  Shapes,
  FolderTree,
  Tags,
  Palette,
  Eye,
  FileCheck2,
  Clock,
  AlertCircle,
  Trash2,
  Layers,
  ChevronDown,
  ChevronRight,
  GitCompare,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../auth/AuthContext";
import { useNotifications } from "../../../context/NotificationContext";

export interface MatchedExistingField {
  fieldName: string;
  existingValue?: string | null;
  incomingValue?: string | null;
  isMatching: boolean;
}

export interface MatchedExistingRecord {
  existingId: string;
  matchReason: string;
  fieldComparisons: MatchedExistingField[];
}

export interface MasterImportRowData {
  entityType?: string;
  name?: string;
  code?: string;
  mobile?: string;
  email?: string;
  brand?: string;
  productType?: string;
  description?: string;
  address?: string;
  isActive?: boolean;
  matchedRecord?: MatchedExistingRecord | null;
}

export interface MasterImportStagingRow {
  id: string;
  batchId: string;
  rowIndex: number;
  entityType: string;
  action: "Create" | "Update" | "Skip";
  status: "Valid" | "Invalid" | "Warning";
  entityKey: string;
  entityName: string;
  validationErrors?: string | null;
  rawData?: MasterImportRowData | null;
  isApproved: boolean;
  isImported: boolean;
  importedAt?: string | null;
  importMessage?: string | null;
  matchedRecord?: MatchedExistingRecord | null;
}

export interface MasterImportBatchSummary {
  id: string;
  batchNumber: string;
  fileName: string;
  fileType: string;
  status: "PendingVerification" | "Approved" | "Rejected" | "Failed";
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  createdCount: number;
  updatedCount: number;
  summaryJson?: string | null;
  createdAt: string;
  createdBy?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
  rows?: MasterImportStagingRow[] | null;
}

interface ApproveResult {
  success: boolean;
  batchId: string;
  batchNumber: string;
  status: string;
  totalImported: number;
  brandsImported: number;
  productTypesImported: number;
  modelsImported: number;
  variantsImported: number;
  colorsImported: number;
  vendorsImported: number;
  message: string;
  completedAt: string;
}

interface TenantItem {
  id: string;
  name: string;
  slug: string;
}

export function MasterImportPage({ isAdminMode = false }: { isAdminMode?: boolean }) {
  const { isProductOwner } = useAuth();
  const notifications = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tenant selection for Product Owner Admin mode
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  // Staging and batch states
  const [batches, setBatches] = useState<MasterImportBatchSummary[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<MasterImportBatchSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [exportingMasters, setExportingMasters] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [approveResult, setApproveResult] = useState<ApproveResult | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Determine base API path
  const getApiPrefix = () => {
    if (isAdminMode && selectedTenantId) {
      return `/admin/tenants/${selectedTenantId}/masters/import`;
    }
    return "/masters";
  };

  // Load tenants if in Admin Mode
  useEffect(() => {
    if (isAdminMode && isProductOwner) {
      apiClient.get<TenantItem[]>("/admin/tenants")
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            setTenants(res);
            setSelectedTenantId(res[0].id);
          }
        })
        .catch((err) => console.warn("Failed to load tenant directory", err));
    }
  }, [isAdminMode, isProductOwner]);

  // Load batches whenever active tenant changes
  const fetchBatches = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      let url = "/masters/import/batches";
      if (isAdminMode) {
        if (!selectedTenantId) {
          setLoading(false);
          return;
        }
        url = `/admin/tenants/${selectedTenantId}/masters/import/batches`;
      }

      const res = await apiClient.get<MasterImportBatchSummary[]>(url).catch(() => []);
      const batchList = Array.isArray(res) ? res : [];
      setBatches(batchList);

      if (batchList.length > 0) {
        // Automatically select the newest batch or keep currently selected
        const currentId = selectedBatch?.id;
        const target = currentId ? batchList.find((b) => b.id === currentId) || batchList[0] : batchList[0];
        fetchBatchDetails(target.id);
      } else {
        setSelectedBatch(null);
      }
    } catch (err) {
      console.error("Failed to load batches", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [selectedTenantId]);

  const fetchBatchDetails = async (batchId: string) => {
    setLoading(true);
    try {
      let url = `/masters/import/batches/${batchId}`;
      if (isAdminMode && selectedTenantId) {
        url = `/admin/tenants/${selectedTenantId}/masters/import/batches/${batchId}`;
      }

      const res = await apiClient.get<MasterImportBatchSummary>(url);
      setSelectedBatch(res);
    } catch (err) {
      console.error("Failed to load batch details", err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Download Master Template (Multi-Sheet Excel .xlsx)
  const handleDownloadTemplate = async () => {
    if (isAdminMode && !selectedTenantId) {
      setActionMessage({
        type: "error",
        text: "Please select a tenant store from the dropdown first.",
      });
      return;
    }

    setDownloadingTemplate(true);
    setActionMessage(null);
    try {
      const url = isAdminMode && selectedTenantId
        ? `/admin/tenants/${selectedTenantId}/masters/import/template`
        : `/masters/template`;
      const defaultFileName = "siddhi_master_import_template.xlsx";
      const headers = isAdminMode && selectedTenantId ? { "X-Tenant-ID": selectedTenantId } : undefined;

      await apiClient.download(url, defaultFileName, { headers });

      setActionMessage({
        type: "success",
        text: "Multi-Sheet Excel (.xlsx) master template downloaded successfully.",
      });
    } catch (err) {
      setActionMessage({
        type: "error",
        text: "Could not download template: " + (err instanceof Error ? err.message : String(err)),
      });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // 2. Export Live Masters (Multi-Sheet Excel .xlsx)
  const handleExportLiveMasters = async () => {
    if (isAdminMode && !selectedTenantId) {
      setActionMessage({
        type: "error",
        text: "Please select a tenant store from the dropdown first.",
      });
      return;
    }

    setExportingMasters(true);
    setActionMessage(null);
    try {
      const url = isAdminMode && selectedTenantId
        ? `/admin/tenants/${selectedTenantId}/masters/import/export`
        : `/masters/export`;
      const defaultFileName = `siddhi_masters_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const headers = isAdminMode && selectedTenantId ? { "X-Tenant-ID": selectedTenantId } : undefined;

      await apiClient.download(url, defaultFileName, { headers });

      setActionMessage({
        type: "success",
        text: "Current store master catalog exported as Multi-Sheet Excel (.xlsx).",
      });
    } catch (err) {
      setActionMessage({
        type: "error",
        text: "Could not export masters: " + (err instanceof Error ? err.message : String(err)),
      });
    } finally {
      setExportingMasters(false);
    }
  };

  // 3. Upload Excel File and Stage into Database
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setActionMessage({
        type: "error",
        text: "Please select an Excel workbook (.xlsx). CSV and text files are not supported.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setActionMessage(null);
    setApproveResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = window.btoa(binary);

          const uploadHeaders: Record<string, string> = {};
          if (isAdminMode && selectedTenantId) {
            uploadHeaders["X-Tenant-ID"] = selectedTenantId;
          }

          const res = await apiClient.post<MasterImportBatchSummary>("/masters/import/upload", {
            fileName: file.name,
            base64Content: base64,
            notes: `Uploaded via Web Portal on ${new Date().toLocaleString()}`,
          }, { headers: uploadHeaders });

          setSelectedBatch(res);
          setActionMessage({
            type: "success",
            text: `Batch '${res.batchNumber}' successfully staged! Verified ${res.validRows} valid records (${res.createdCount} new, ${res.updatedCount} updates).`,
          });
          fetchBatches();
        } catch (err) {
          setActionMessage({
            type: "error",
            text: "Failed to stage import: " + (err instanceof Error ? err.message : String(err)),
          });
        } finally {
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.onerror = () => {
        setActionMessage({ type: "error", text: "Failed to read Excel file." });
        setUploading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setActionMessage({
        type: "error",
        text: "Upload error: " + (err instanceof Error ? err.message : String(err)),
      });
      setUploading(false);
    }
  };

  // Delete Batch
  const handleDeleteBatch = async (batchIdToDelete?: string) => {
    const targetId = batchIdToDelete || selectedBatch?.id;
    if (!targetId) return;

    const targetBatch = batches.find((b) => b.id === targetId) || (selectedBatch?.id === targetId ? selectedBatch : null);
    const batchLabel = targetBatch ? targetBatch.batchNumber : "this import batch";

    const confirmed = await notifications.confirm({
      title: "Delete Import Batch?",
      message: `Are you sure you want to permanently delete import batch '${batchLabel}'? All staged rows for this batch will be removed from the temporary staging database.`,
      variant: "danger",
      confirmLabel: "Delete Batch",
      cancelLabel: "Cancel",
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      let url = `/masters/import/batches/${targetId}`;
      if (isAdminMode && selectedTenantId) {
        url = `/admin/tenants/${selectedTenantId}/masters/import/batches/${targetId}`;
      }

      await apiClient.delete(url);
      notifications.success(`Import batch '${batchLabel}' has been successfully deleted.`);

      if (selectedBatch?.id === targetId) {
        setSelectedBatch(null);
      }
      await fetchBatches();
    } catch (err) {
      notifications.error("Failed to delete batch: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // 4. Toggle Staging Row Approval
  const handleToggleRow = async (rowId: string, currentStatus: boolean) => {
    if (!selectedBatch) return;

    try {
      const toggleHeaders = isAdminMode && selectedTenantId ? { "X-Tenant-ID": selectedTenantId } : undefined;
      await apiClient.put(`/masters/import/batches/${selectedBatch.id}/rows/${rowId}/toggle`, {
        isApproved: !currentStatus,
      }, { headers: toggleHeaders });

      // Update state locally
      setSelectedBatch((prev) => {
        if (!prev || !prev.rows) return prev;
        const updatedRows = prev.rows.map((r) =>
          r.id === rowId ? { ...r, isApproved: !currentStatus } : r
        );
        return { ...prev, rows: updatedRows };
      });
    } catch (err) {
      console.error("Failed to toggle row approval", err);
    }
  };

  // 5. Approve & Commit to Main Tables
  const handleApproveBatch = async () => {
    if (!selectedBatch) return;

    setApproving(true);
    setActionMessage(null);
    try {
      let url = `/masters/import/batches/${selectedBatch.id}/approve`;
      if (isAdminMode && selectedTenantId) {
        url = `/admin/tenants/${selectedTenantId}/masters/import/batches/${selectedBatch.id}/approve`;
      }

      const res = await apiClient.post<ApproveResult>(url, {
        notes: "Approved and imported via Master Import Hub",
      });

      setApproveResult(res);
      setShowConfirmModal(false);
      setActionMessage({
        type: "success",
        text: res.message || "Master records successfully imported to the live production database!",
      });

      // Refresh details
      fetchBatchDetails(selectedBatch.id);
      fetchBatches();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: "Approval failed: " + (err instanceof Error ? err.message : String(err)),
      });
    } finally {
      setApproving(false);
    }
  };

  // 6. Reject Batch
  const handleRejectBatch = async () => {
    if (!selectedBatch) return;
    const confirmed = await notifications.confirm({
      title: "Reject Import Batch?",
      message: `Are you sure you want to reject batch '${selectedBatch.batchNumber}'? Staged records will not be imported into the main database.`,
      variant: "danger",
      confirmLabel: "Reject Batch",
      cancelLabel: "Cancel",
    });
    if (!confirmed) {
      return;
    }

    try {
      let url = `/masters/import/batches/${selectedBatch.id}/reject`;
      if (isAdminMode && selectedTenantId) {
        url = `/admin/tenants/${selectedTenantId}/masters/import/batches/${selectedBatch.id}/reject`;
      }

      await apiClient.post(url, { reason: "Rejected by reviewer" });
      setActionMessage({
        type: "info",
        text: `Batch '${selectedBatch.batchNumber}' marked as Rejected.`,
      });
      fetchBatchDetails(selectedBatch.id);
      fetchBatches();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: "Failed to reject batch: " + (err instanceof Error ? err.message : String(err)),
      });
    }
  };

  // Filtered rows
  const filteredRows = (selectedBatch?.rows || []).filter((row) => {
    // Entity filter
    if (entityFilter !== "ALL" && row.entityType.toUpperCase() !== entityFilter.toUpperCase()) {
      return false;
    }

    // Status filter
    if (statusFilter === "VALID" && row.status !== "Valid") return false;
    if (statusFilter === "INVALID" && row.status !== "Invalid") return false;
    if (statusFilter === "WARNING" && row.status !== "Warning") return false;
    if (statusFilter === "CREATE" && row.action !== "Create") return false;
    if (statusFilter === "UPDATE" && row.action !== "Update") return false;

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = row.entityName.toLowerCase().includes(q);
      const matchKey = row.entityKey.toLowerCase().includes(q);
      const matchType = row.entityType.toLowerCase().includes(q);
      const matchBrand = (row.rawData?.brand || "").toLowerCase().includes(q);
      const matchErr = (row.validationErrors || "").toLowerCase().includes(q);
      return matchName || matchKey || matchType || matchBrand || matchErr;
    }

    return true;
  });

  const getEntityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "vendor":
        return <Truck className="size-4 text-blue-500" />;
      case "brand":
        return <Factory className="size-4 text-purple-500" />;
      case "producttype":
        return <Shapes className="size-4 text-cyan-500" />;
      case "model":
        return <FolderTree className="size-4 text-amber-500" />;
      case "variant":
        return <Tags className="size-4 text-emerald-500" />;
      case "color":
        return <Palette className="size-4 text-rose-500" />;
      default:
        return <FileSpreadsheet className="size-4 text-slate-500" />;
    }
  };

  const getEntityBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "vendor":
        return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";
      case "brand":
        return "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300";
      case "producttype":
        return "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300";
      case "model":
        return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
      case "variant":
        return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
      case "color":
        return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300";
      default:
        return "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl dark:border-slate-800">
        <div className="absolute -right-16 -top-16 size-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur">
                <FileCheck2 className="size-3.5 text-indigo-300" />
                Two-Stage Staging & Verification Engine
              </span>
              {isAdminMode && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200 backdrop-blur">
                  <ShieldCheck className="size-3.5 text-amber-300" />
                  Product Owner Console
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Master Data Import & Verification Hub
            </h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Bulk import existing master data (<strong>Vendors</strong>, <strong>Brands</strong>, <strong>Product Types</strong>, <strong>Models</strong>, <strong>Variants</strong>, <strong>Colors</strong>).
              Data is safely inserted into a temporary database staging area first. Verify and approve to commit into the live catalog.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600/30 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-600/50 transition cursor-pointer disabled:opacity-50"
              title="Download Multi-Sheet Excel Template (Vendors, Brands, ProductTypes, Models, Variants, Colors)"
            >
              <Download className={`size-4 text-indigo-300 ${downloadingTemplate ? "animate-bounce" : ""}`} />
              <span>{downloadingTemplate ? "Generating Template..." : "Download Excel Template (.xlsx)"}</span>
            </button>
            <button
              onClick={handleExportLiveMasters}
              disabled={exportingMasters}
              className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-600/30 px-3.5 py-2 text-xs font-semibold text-emerald-200 shadow hover:bg-emerald-600/50 transition cursor-pointer disabled:opacity-50"
              title="Export live store catalog across all 6 worksheets (.xlsx)"
            >
              <FileSpreadsheet className={`size-4 text-emerald-400 ${exportingMasters ? "animate-pulse" : ""}`} />
              <span>{exportingMasters ? "Exporting Masters..." : "Export Master Catalog (.xlsx)"}</span>
            </button>
          </div>
        </div>

        {/* Admin Tenant Selector */}
        {isAdminMode && (
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Building2 className="size-4 text-indigo-400" />
              <span>Select Tenant Store:</span>
            </div>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Notifications */}
      {actionMessage && (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm transition-all ${actionMessage.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
            : actionMessage.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
              : "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200"
            }`}
        >
          {actionMessage.type === "success" && <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
          {actionMessage.type === "error" && <AlertCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400" />}
          {actionMessage.type === "info" && <AlertTriangle className="size-5 shrink-0 text-sky-600 dark:text-sky-400" />}
          <div className="flex-1 font-medium">{actionMessage.text}</div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success Approval Banner */}
      {approveResult && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-500/10 p-5 dark:border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <Check className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                Batch {approveResult.batchNumber} Successfully Imported!
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                All approved master records have been committed into the live database tables.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-3 border-t border-emerald-200 dark:border-emerald-800/60 text-xs">
            <div className="rounded-lg bg-emerald-100/50 p-2 dark:bg-emerald-950/50 text-center">
              <div className="font-bold text-emerald-900 dark:text-emerald-200">{approveResult.brandsImported}</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Brands</div>
            </div>
            <div className="rounded-lg bg-emerald-100/50 p-2 dark:bg-emerald-950/50 text-center">
              <div className="font-bold text-emerald-900 dark:text-emerald-200">{approveResult.productTypesImported}</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Product Types</div>
            </div>
            <div className="rounded-lg bg-emerald-100/50 p-2 dark:bg-emerald-950/50 text-center">
              <div className="font-bold text-emerald-900 dark:text-emerald-200">{approveResult.modelsImported}</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Models</div>
            </div>
            <div className="rounded-lg bg-emerald-100/50 p-2 dark:bg-emerald-950/50 text-center">
              <div className="font-bold text-emerald-900 dark:text-emerald-200">{approveResult.variantsImported}</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Variants</div>
            </div>
            <div className="rounded-lg bg-emerald-100/50 p-2 dark:bg-emerald-950/50 text-center">
              <div className="font-bold text-emerald-900 dark:text-emerald-200">{approveResult.colorsImported}</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Colors</div>
            </div>
            <div className="rounded-lg bg-emerald-100/50 p-2 dark:bg-emerald-950/50 text-center">
              <div className="font-bold text-emerald-900 dark:text-emerald-200">{approveResult.vendorsImported}</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Vendors</div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Zone Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Upload className="size-5 text-indigo-600 dark:text-indigo-400" />
              Upload & Stage New Master Data
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select or drop a Multi-Sheet Excel (.xlsx) file populated with your master data.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-60 cursor-pointer"
            >
              <Upload className={`size-4 ${uploading ? "animate-spin" : ""}`} />
              <span>{uploading ? "Parsing & Staging..." : "Browse & Upload Excel (.xlsx)"}</span>
            </button>
          </div>
        </div>

        {/* Supported Schema Guide */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
            <Truck className="size-4 text-blue-500 shrink-0" />
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">Vendors</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Code, Mobile, Email</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
            <Factory className="size-4 text-purple-500 shrink-0" />
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">Brands</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Brand Name</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
            <Shapes className="size-4 text-cyan-500 shrink-0" />
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">Product Types</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Type Name</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
            <FolderTree className="size-4 text-amber-500 shrink-0" />
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">Models</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Brand + Type + Code</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
            <Tags className="size-4 text-emerald-500 shrink-0" />
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">Variants</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Storage / Specs</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
            <Palette className="size-4 text-rose-500 shrink-0" />
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">Colors</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Color Name</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Review Workspace */}
      {selectedBatch ? (
        <div className="space-y-6">
          {/* Batch Overview Banner */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                    {selectedBatch.batchNumber}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${selectedBatch.status === "Approved"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : selectedBatch.status === "Rejected"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {selectedBatch.status === "PendingVerification"
                      ? "Pending Verification & Approval"
                      : selectedBatch.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>File: <strong className="text-slate-700 dark:text-slate-300">{selectedBatch.fileName}</strong></span>
                  <span>•</span>
                  <span>Uploaded: {new Date(selectedBatch.createdAt).toLocaleString()}</span>
                  {selectedBatch.reviewedBy && (
                    <>
                      <span>•</span>
                      <span>Reviewer: {selectedBatch.reviewedBy}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={fetchBatches}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition cursor-pointer"
                >
                  <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={() => handleDeleteBatch(selectedBatch.id)}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 transition cursor-pointer"
                  title="Permanently delete this batch and its staged rows"
                >
                  <Trash2 className="size-3.5 text-rose-600" />
                  <span>Delete Batch</span>
                </button>

                {selectedBatch.status === "PendingVerification" && (
                  <>
                    <button
                      onClick={handleRejectBatch}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
                    >
                      <XCircle className="size-4 text-slate-500" />
                      <span>Reject Batch</span>
                    </button>

                    <button
                      onClick={() => setShowConfirmModal(true)}
                      disabled={selectedBatch.validRows === 0}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 transition disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="size-4" />
                      <span>Approve & Import to Main Database</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Rows</div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {selectedBatch.totalRows}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Valid Records</div>
                <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {selectedBatch.validRows}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/70 p-3.5 dark:border-blue-900/50 dark:bg-blue-950/30">
                <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">New Creates</div>
                <div className="text-xl font-extrabold text-blue-700 dark:text-blue-300 mt-0.5">
                  {selectedBatch.createdCount}
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-200/80 bg-cyan-50/70 p-3.5 dark:border-cyan-900/50 dark:bg-cyan-950/30">
                <div className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-400">Existing Updates</div>
                <div className="text-xl font-extrabold text-cyan-700 dark:text-cyan-300 mt-0.5">
                  {selectedBatch.updatedCount}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Warnings</div>
                <div className="text-xl font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">
                  {selectedBatch.warningRows}
                </div>
              </div>

              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/30">
                <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">Invalid / Errors</div>
                <div className="text-xl font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">
                  {selectedBatch.errorRows}
                </div>
              </div>
            </div>
          </div>

          {/* Staged Rows Explorer */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, code, brand, error..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Filter className="size-3.5" /> Filter:
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="VALID">Valid Only</option>
                    <option value="INVALID">Errors Only</option>
                    <option value="WARNING">Warnings Only</option>
                    <option value="CREATE">New Creates</option>
                    <option value="UPDATE">Updates Only</option>
                  </select>
                </div>
              </div>

              {/* Sheet Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { key: "ALL", label: "All Sheets", icon: <Layers className="size-3.5" /> },
                  { key: "Vendor", label: "Vendors Sheet", icon: <Truck className="size-3.5 text-blue-500" /> },
                  { key: "Brand", label: "Brands Sheet", icon: <Factory className="size-3.5 text-purple-500" /> },
                  { key: "ProductType", label: "ProductTypes Sheet", icon: <Shapes className="size-3.5 text-cyan-500" /> },
                  { key: "Model", label: "Models Sheet", icon: <FolderTree className="size-3.5 text-amber-500" /> },
                  { key: "Variant", label: "Variants Sheet", icon: <Tags className="size-3.5 text-emerald-500" /> },
                  { key: "Color", label: "Colors Sheet", icon: <Palette className="size-3.5 text-rose-500" /> },
                ].map((sheet) => {
                  const count =
                    sheet.key === "ALL"
                      ? selectedBatch.rows?.length || 0
                      : selectedBatch.rows?.filter((r) => r.entityType.toUpperCase() === sheet.key.toUpperCase()).length || 0;

                  return (
                    <button
                      key={sheet.key}
                      onClick={() => setEntityFilter(sheet.key)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${entityFilter.toUpperCase() === sheet.key.toUpperCase()
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                    >
                      {sheet.icon}
                      <span>{sheet.label}</span>
                      <span className="text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Staging Rows Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <th className="py-3 px-4 w-10 text-center font-semibold">Include</th>
                    <th className="py-3 px-3 w-12 font-semibold">#</th>
                    <th className="py-3 px-3 font-semibold">Entity Type</th>
                    <th className="py-3 px-3 font-semibold">Action</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Name / Key</th>
                    <th className="py-3 px-4 font-semibold">Specifications / Contact</th>
                    <th className="py-3 px-4 font-semibold">Validation & Target Logic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No staging records found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${!row.isApproved ? "opacity-50 bg-slate-50/30 dark:bg-slate-900/30" : ""
                          }`}
                      >
                        {/* Include Checkbox */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={row.isApproved}
                            disabled={selectedBatch.status === "Approved"}
                            onChange={() => handleToggleRow(row.id, row.isApproved)}
                            className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* Row Index */}
                        <td className="py-3 px-3 text-slate-400 font-mono">
                          {row.rowIndex}
                        </td>

                        {/* Entity Type */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${getEntityBadgeColor(
                              row.entityType
                            )}`}
                          >
                            {getEntityIcon(row.entityType)}
                            <span>{row.entityType}</span>
                          </span>
                        </td>

                        {/* Action (Create vs Update) */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${row.action === "Create"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                              }`}
                          >
                            {row.action === "Create" ? "+ Create" : "↺ Update"}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${row.status === "Valid"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : row.status === "Warning"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              }`}
                          >
                            {row.status === "Valid" && <Check className="size-3 text-emerald-600" />}
                            {row.status === "Warning" && <AlertTriangle className="size-3 text-amber-600" />}
                            {row.status === "Invalid" && <XCircle className="size-3 text-rose-600" />}
                            <span>{row.status}</span>
                          </span>
                        </td>

                        {/* Name / Key */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {row.entityName}
                          </div>
                          {row.entityKey && row.entityKey !== row.entityName && (
                            <div className="font-mono text-[11px] text-slate-400">
                              Code: {row.entityKey}
                            </div>
                          )}
                        </td>

                        {/* Specs & Contact */}
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {row.entityType === "Model" && (
                            <div className="space-y-0.5">
                              <div>
                                Brand: <strong className="text-slate-800 dark:text-slate-200">{row.rawData?.brand || "—"}</strong>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Type: {row.rawData?.productType || "—"}
                              </div>
                            </div>
                          )}

                          {row.entityType === "Vendor" && (
                            <div className="space-y-0.5">
                              <div>{row.rawData?.mobile || "—"}</div>
                              <div className="text-[11px] text-slate-500">{row.rawData?.email || "—"}</div>
                            </div>
                          )}

                          {row.entityType !== "Model" && row.entityType !== "Vendor" && (
                            <div className="text-slate-500 text-[11px] italic">
                              {row.rawData?.description || "No description"}
                            </div>
                          )}
                        </td>

                        {/* Validation Messages / Reason / Match Comparison */}
                        <td className="py-3 px-4 max-w-md">
                          {row.validationErrors && (
                            <div
                              className={`text-[11px] rounded-lg p-2 border mb-2 ${row.status === "Invalid"
                                ? "border-rose-200 bg-rose-50/80 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300"
                                : "border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300"
                                }`}
                            >
                              {row.validationErrors}
                            </div>
                          )}

                          {!row.validationErrors && (
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                              <Check className="size-3.5" />
                              <span>Ready to {row.action.toLowerCase()}</span>
                            </div>
                          )}

                          {/* Existing Record Match Comparison */}
                          {(row.matchedRecord || row.rawData?.matchedRecord) && (() => {
                            const match = row.matchedRecord || row.rawData?.matchedRecord!;
                            return (
                              <div className="mt-2 rounded-xl border border-blue-200/90 bg-blue-50/70 p-2.5 dark:border-blue-900/60 dark:bg-blue-950/40 text-left">
                                <div className="flex items-center justify-between text-[11px] font-bold text-blue-900 dark:text-blue-200">
                                  <span className="flex items-center gap-1.5">
                                    <GitCompare className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <span>{match.matchReason}</span>
                                  </span>
                                </div>

                                {match.fieldComparisons && match.fieldComparisons.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    <div className="grid grid-cols-12 gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider pb-1 border-b border-blue-200/60 dark:border-blue-900/40">
                                      <span className="col-span-3">Field</span>
                                      <span className="col-span-4">In Database</span>
                                      <span className="col-span-1 text-center"></span>
                                      <span className="col-span-4">In Import</span>
                                    </div>
                                    {match.fieldComparisons.map((fc) => (
                                      <div
                                        key={fc.fieldName}
                                        className={`grid grid-cols-12 gap-1 text-[10.5px] py-0.5 px-1 rounded items-center ${fc.isMatching
                                          ? "text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-900/30"
                                          : "bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-semibold"
                                          }`}
                                      >
                                        <span className="col-span-3 font-medium text-slate-700 dark:text-slate-300">
                                          {fc.fieldName}
                                        </span>
                                        <span className="col-span-4 truncate font-mono text-[10px]">
                                          {fc.existingValue ?? <em className="text-slate-400">null</em>}
                                        </span>
                                        <span className="col-span-1 text-center text-slate-400 text-[10px]">
                                          {fc.isMatching ? "=" : "→"}
                                        </span>
                                        <span className="col-span-4 truncate font-mono text-[10px] font-semibold flex items-center justify-between gap-1">
                                          <span className="truncate">{fc.incomingValue ?? <em className="text-slate-400">null</em>}</span>
                                          {!fc.isMatching && (
                                            <span className="text-[8.5px] px-1 py-0.2 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 uppercase tracking-tight">
                                              Update
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Count */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing <strong>{filteredRows.length}</strong> of <strong>{selectedBatch.rows?.length || 0}</strong> records
              </div>
              <div className="flex items-center gap-4">
                <span>Active Approved: <strong>{selectedBatch.rows?.filter((r) => r.isApproved).length || 0}</strong></span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Batch History List */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="size-5 text-indigo-600 dark:text-indigo-400" />
            Previous Import Batches
          </h3>
          <button
            onClick={fetchBatches}
            disabled={loading}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Reload</span>
          </button>
        </div>

        {batches.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No previous import batches recorded for this store yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {batches.map((b) => (
              <div
                key={b.id}
                onClick={() => fetchBatchDetails(b.id)}
                className={`py-3.5 px-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition ${selectedBatch?.id === b.id
                  ? "bg-indigo-50/70 border border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-900/60"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {b.batchNumber}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${b.status === "Approved"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : b.status === "Rejected"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    File: {b.fileName} • {new Date(b.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="text-right">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {b.validRows} / {b.totalRows} Valid
                    </div>
                    <div className="text-[10px] text-slate-400">
                      +{b.createdCount} new, {b.updatedCount} updates
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBatch(b.id);
                    }}
                    title="Delete this import batch"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <ArrowRight className="size-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Approve & Import Master Data
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Batch: {selectedBatch.batchNumber}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 space-y-2 text-xs">
              <p className="text-slate-700 dark:text-slate-300">
                You are about to commit all approved valid records from the staging area into the live production tables:
              </p>
              <ul className="space-y-1 font-semibold text-slate-800 dark:text-slate-200 list-disc pl-4">
                <li>{selectedBatch.createdCount} new master records will be created</li>
                <li>{selectedBatch.updatedCount} existing records will be updated</li>
                <li>Dependency order will be resolved automatically (Brands & Types first, then Models)</li>
              </ul>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={approving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveBatch}
                disabled={approving}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition disabled:opacity-60 cursor-pointer"
              >
                <CheckCircle2 className={`size-4 ${approving ? "animate-spin" : ""}`} />
                <span>{approving ? "Importing to Main Database..." : "Confirm & Import Now"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


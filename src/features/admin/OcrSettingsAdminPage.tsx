import { useState, useEffect, useCallback } from "react";
import {
  ScanText,
  Building2,
  Server,
  Key,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Cpu,
  Zap,
  Globe,
  Sliders,
  FileText,
  Clock,
  Search,
  Check,
  X,
  RotateCcw,
  Info,
  Layers,
  AlertCircle,
} from "lucide-react";
import { z } from "zod";
import { apiClient } from "../../services/apiClient";
import { useNotifications } from "../../context/NotificationContext";

// -------------------------------------------------------------
// REACT ZOD VALIDATION SCHEMAS
// -------------------------------------------------------------
export const ocrProviderSchema = z.object({
  name: z.string().trim().min(2, "Provider name must be at least 2 characters."),
  providerType: z.enum(
    [
      "TesseractLocal",
      "AzureDocumentIntelligence",
      "GoogleDocumentAi",
      "AwsTextract",
      "Custom",
    ],
    { message: "Please select a valid OCR provider type." }
  ),
  endpointUrl: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          const parsed = new URL(val);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Endpoint URL must be a valid HTTP or HTTPS URL (e.g. https://...)." }
    ),
  apiKeyOrSecret: z.string().optional(),
  modelIdOrProcessorId: z.string().optional(),
  region: z.string().optional(),
  additionalConfigJson: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val || val === "{}") return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Additional configuration must be valid JSON format." }
    ),
  isEnabled: z.boolean(),
  isDefault: z.boolean(),
  description: z.string().optional(),
});

export const tenantScanQuotaSchema = z.object({
  maxScansLimit: z
    .number({ error: "Scan quota limit must be a valid number." })
    .int("Scan quota limit must be a whole integer.")
    .min(1, "Scan quota limit must be at least 1 scan.")
    .max(1000000, "Scan quota limit cannot exceed 1,000,000 scans."),
});

export interface OcrProviderDto {
  id: string;
  name: string;
  providerType: string;
  endpointUrl?: string | null;
  apiKeyOrSecret?: string | null;
  modelIdOrProcessorId?: string | null;
  region?: string | null;
  additionalConfigJson?: string | null;
  isEnabled: boolean;
  isDefault: boolean;
  description?: string | null;
  createdAtUtc: string;
  modifiedAtUtc?: string | null;
}

export interface TenantOcrSettingDto {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  isOcrEnabled: boolean;
  preferredProviderId?: string | null;
  preferredProviderName?: string | null;
  maxScansLimit: number;
  usedScansCount: number;
  remainingScansCount: number;
  allowOcrUploadPurchaseInvoice: boolean;
  lastScanAtUtc?: string | null;
  notes?: string | null;
  createdAtUtc: string;
}

export interface TenantOcrScanLog {
  id: string;
  tenantId: string;
  providerId?: string | null;
  providerName: string;
  providerType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  errorMessage?: string | null;
  processingTimeMs: number;
  extractedVendorName?: string | null;
  extractedBillNumber?: string | null;
  extractedGrandTotal?: number | null;
  extractedItemCount?: number | null;
  extractedDataJson?: string | null;
  scannedBy: string;
  scannedAtUtc: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  responseTimeMs: number;
}

export function OcrSettingsAdminPage() {
  const notifications = useNotifications();

  // Tabs
  const [activeTab, setActiveTab] = useState<"tenants" | "providers" | "logs">("tenants");

  // Data states
  const [providers, setProviders] = useState<OcrProviderDto[]>([]);
  const [tenants, setTenants] = useState<TenantOcrSettingDto[]>([]);
  const [logs, setLogs] = useState<TenantOcrScanLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");

  // Provider Modal state
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<OcrProviderDto | null>(null);
  const [providerFormData, setProviderFormData] = useState({
    name: "",
    providerType: "TesseractLocal",
    endpointUrl: "",
    apiKeyOrSecret: "",
    modelIdOrProcessorId: "",
    region: "",
    additionalConfigJson: "{}",
    isEnabled: true,
    isDefault: false,
    description: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [savingProvider, setSavingProvider] = useState(false);

  // Connection testing state
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});

  // View Log Modal
  const [selectedLog, setSelectedLog] = useState<TenantOcrScanLog | null>(null);

  // Load All Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [providersRes, tenantsRes, logsRes] = await Promise.allSettled([
        apiClient.get<OcrProviderDto[]>("/admin/ocr/providers"),
        apiClient.get<TenantOcrSettingDto[]>("/admin/ocr/tenants"),
        apiClient.get<TenantOcrScanLog[]>("/admin/ocr/logs?limit=50"),
      ]);

      if (providersRes.status === "fulfilled" && providersRes.value) {
        setProviders(providersRes.value);
      }
      if (tenantsRes.status === "fulfilled" && tenantsRes.value) {
        setTenants(tenantsRes.value);
      }
      if (logsRes.status === "fulfilled" && logsRes.value) {
        setLogs(logsRes.value);
      }
    } catch {
      notifications.error("Data Load Error", "Failed to retrieve OCR configuration data.");
    } finally {
      setIsLoading(false);
    }
  }, [notifications]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Provider Actions
  const handleOpenAddProvider = () => {
    setEditingProvider(null);
    setFormErrors({});
    setProviderFormData({
      name: "",
      providerType: "AzureDocumentIntelligence",
      endpointUrl: "https://<your-resource>.cognitiveservices.azure.com/",
      apiKeyOrSecret: "",
      modelIdOrProcessorId: "prebuilt-invoice",
      region: "eastus",
      additionalConfigJson: "{}",
      isEnabled: true,
      isDefault: false,
      description: "",
    });
    setIsProviderModalOpen(true);
  };

  const handleOpenEditProvider = (provider: OcrProviderDto) => {
    setEditingProvider(provider);
    setFormErrors({});
    setProviderFormData({
      name: provider.name,
      providerType: provider.providerType,
      endpointUrl: provider.endpointUrl || "",
      apiKeyOrSecret: provider.apiKeyOrSecret || "",
      modelIdOrProcessorId: provider.modelIdOrProcessorId || "",
      region: provider.region || "",
      additionalConfigJson: provider.additionalConfigJson || "{}",
      isEnabled: provider.isEnabled,
      isDefault: provider.isDefault,
      description: provider.description || "",
    });
    setIsProviderModalOpen(true);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // React Zod safe validation
    const validationResult = ocrProviderSchema.safeParse(providerFormData);
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        const fieldName = issue.path[0]?.toString() || "form";
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setFormErrors(fieldErrors);
      notifications.error(
        "Validation Error",
        validationResult.error.issues[0]?.message || "Please correct the form fields."
      );
      return;
    }

    setSavingProvider(true);
    try {
      const validPayload = validationResult.data;
      if (editingProvider) {
        await apiClient.put(`/admin/ocr/providers/${editingProvider.id}`, validPayload);
        notifications.success("Provider Updated", `OCR provider "${validPayload.name}" updated successfully.`);
      } else {
        await apiClient.post("/admin/ocr/providers", validPayload);
        notifications.success("Provider Created", `OCR provider "${validPayload.name}" registered successfully.`);
      }
      setIsProviderModalOpen(false);
      await loadData();
    } catch (err) {
      notifications.error(
        "Save Failed",
        err instanceof Error ? err.message : "Failed to save OCR provider."
      );
    } finally {
      setSavingProvider(false);
    }
  };

  const handleDeleteProvider = async (provider: OcrProviderDto) => {
    if (provider.isDefault) {
      notifications.error("Cannot Delete", "Default system OCR provider cannot be removed.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete OCR provider "${provider.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/admin/ocr/providers/${provider.id}`);
      notifications.success("Provider Removed", `Deleted provider "${provider.name}".`);
      await loadData();
    } catch (err) {
      notifications.error("Delete Failed", err instanceof Error ? err.message : "Could not delete provider.");
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingProviderId(providerId);
    try {
      const res = await apiClient.post<ConnectionTestResult>(`/admin/ocr/providers/${providerId}/test`, {});
      if (res) {
        setTestResults((prev) => ({ ...prev, [providerId]: res }));
        if (res.success) {
          notifications.success("Connection Test Passed", `${res.message} (${res.responseTimeMs}ms)`);
        } else {
          notifications.error("Connection Test Failed", res.message);
        }
      }
    } catch (err) {
      notifications.error("Test Error", err instanceof Error ? err.message : "Connection test failed.");
    } finally {
      setTestingProviderId(null);
    }
  };

  // Tenant Setting Updates
  const handleUpdateTenant = async (
    tenantId: string,
    updates: Partial<TenantOcrSettingDto>,
    resetScans = false
  ) => {
    const target = tenants.find((t) => t.tenantId === tenantId);
    if (!target) return;

    const payload = {
      isOcrEnabled: updates.isOcrEnabled ?? target.isOcrEnabled,
      preferredProviderId: updates.preferredProviderId !== undefined ? updates.preferredProviderId : target.preferredProviderId,
      maxScansLimit: updates.maxScansLimit ?? target.maxScansLimit,
      allowOcrUploadPurchaseInvoice: updates.allowOcrUploadPurchaseInvoice ?? target.allowOcrUploadPurchaseInvoice,
      notes: updates.notes ?? target.notes,
      resetScansCount: resetScans,
    };

    try {
      const updated = await apiClient.put<TenantOcrSettingDto>(`/admin/ocr/tenants/${tenantId}`, payload);
      if (updated) {
        setTenants((prev) => prev.map((t) => (t.tenantId === tenantId ? updated : t)));
        notifications.success(
          "Tenant OCR Updated",
          `Settings saved for store "${target.tenantName}".`
        );
      }
    } catch (err) {
      notifications.error(
        "Update Failed",
        err instanceof Error ? err.message : "Failed to update tenant OCR settings."
      );
    }
  };

  // Filtered tenants
  const filteredTenants = tenants.filter(
    (t) =>
      t.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tenantSlug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ScanText className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">OCR & Document AI Management</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Dynamic database-driven OCR engine registry (Tesseract, Azure Document Intelligence, Google Document AI)
            and multi-tenant scan quota management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadData()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleOpenAddProvider}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add OCR Provider
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("tenants")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === "tenants"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            <Building2 className="w-4 h-4" />
            Tenant Scan Quotas & Controls ({tenants.length})
          </button>
          <button
            onClick={() => setActiveTab("providers")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === "providers"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            <Cpu className="w-4 h-4" />
            OCR Providers & Engines ({providers.length})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === "logs"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            <Clock className="w-4 h-4" />
            Scan Audit Logs ({logs.length})
          </button>
        </nav>
      </div>

      {/* TAB 1: TENANT QUOTAS & OCR TOGGLES */}
      {activeTab === "tenants" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search store name or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Info className="w-4 h-4 text-indigo-500" />
              Changes saved dynamically to database. Quotas enforce strict bill upload limits for tenants.
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3.5">Store / Tenant</th>
                    <th className="px-4 py-3.5">OCR Status</th>
                    <th className="px-4 py-3.5">Assigned Provider</th>
                    <th className="px-4 py-3.5">Quota Limit</th>
                    <th className="px-4 py-3.5">Scans Used / Progress</th>
                    <th className="px-4 py-3.5">Remaining</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No stores found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((t) => {
                      const percentUsed = Math.min(
                        100,
                        Math.round((t.usedScansCount / (t.maxScansLimit || 1)) * 100)
                      );
                      const isLimitReached = t.usedScansCount >= t.maxScansLimit;

                      return (
                        <tr key={t.tenantId} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-4 py-4">
                            <div className="font-semibold text-gray-900">{t.tenantName}</div>
                            <div className="text-xs text-gray-400 font-mono">slug: {t.tenantSlug}</div>
                            {t.lastScanAtUtc && (
                              <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Last scan: {new Date(t.lastScanAtUtc).toLocaleDateString()}
                              </div>
                            )}
                          </td>

                          {/* Toggle OCR */}
                          <td className="px-4 py-4">
                            <button
                              onClick={() => handleUpdateTenant(t.tenantId, { isOcrEnabled: !t.isOcrEnabled })}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition ${t.isOcrEnabled
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-gray-100 text-gray-600 border border-gray-200"
                                }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${t.isOcrEnabled ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                                  }`}
                              />
                              {t.isOcrEnabled ? "Enabled" : "Disabled"}
                            </button>
                          </td>

                          {/* Preferred Provider selector */}
                          <td className="px-4 py-4">
                            <select
                              value={t.preferredProviderId || ""}
                              onChange={(e) =>
                                handleUpdateTenant(t.tenantId, {
                                  preferredProviderId: e.target.value ? e.target.value : null,
                                })
                              }
                              className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            >
                              <option value="">System Default Provider</option>
                              {providers
                                .filter((p) => p.isEnabled)
                                .map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.providerType})
                                  </option>
                                ))}
                            </select>
                          </td>

                          {/* Max limit editor with React Zod validation */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                defaultValue={t.maxScansLimit}
                                onBlur={(e) => {
                                  const raw = e.target.value.trim();
                                  const num = Number(raw);
                                  const validation = tenantScanQuotaSchema.safeParse({ maxScansLimit: num });
                                  if (!validation.success) {
                                    notifications.error(
                                      "Quota Validation Error",
                                      validation.error.issues[0]?.message || "Invalid scan limit."
                                    );
                                    e.target.value = t.maxScansLimit.toString();
                                    return;
                                  }
                                  if (validation.data.maxScansLimit !== t.maxScansLimit) {
                                    handleUpdateTenant(t.tenantId, { maxScansLimit: validation.data.maxScansLimit });
                                  }
                                }}
                                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-right font-medium"
                              />
                              <span className="text-xs text-gray-400">scans</span>
                            </div>
                          </td>

                          {/* Usage and progress bar */}
                          <td className="px-4 py-4">
                            <div className="w-36">
                              <div className="flex justify-between text-xs mb-1 font-medium">
                                <span className={isLimitReached ? "text-rose-600" : "text-gray-700"}>
                                  {t.usedScansCount} used
                                </span>
                                <span className="text-gray-400">{percentUsed}%</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full ${isLimitReached
                                      ? "bg-rose-500"
                                      : percentUsed > 80
                                        ? "bg-amber-500"
                                        : "bg-indigo-600"
                                    }`}
                                  style={{ width: `${percentUsed}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Remaining Scans */}
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${isLimitReached
                                  ? "bg-rose-100 text-rose-800"
                                  : t.remainingScansCount < 20
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                            >
                              {t.remainingScansCount} left
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Reset scanned count back to 0 for store "${t.tenantName}"?`
                                  )
                                ) {
                                  handleUpdateTenant(t.tenantId, {}, true);
                                }
                              }}
                              title="Reset used scans count back to 0"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 transition"
                            >
                              <RotateCcw className="w-3 h-3 text-gray-500" />
                              Reset
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OCR PROVIDERS CONFIGURATION */}
      {activeTab === "providers" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {providers.map((p) => {
              const testResult = testResults[p.id];
              const isTesting = testingProviderId === p.id;

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-xl border p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between ${p.isDefault ? "border-indigo-300 ring-2 ring-indigo-100" : "border-gray-200"
                    }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 text-base">{p.name}</h3>
                          {p.isDefault && (
                            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Default
                            </span>
                          )}
                        </div>
                        <span className="inline-block mt-1 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-mono">
                          {p.providerType}
                        </span>
                      </div>

                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.isEnabled
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-100 text-gray-500"
                          }`}
                      >
                        {p.isEnabled ? "Active" : "Disabled"}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                      {p.description || "Dynamic OCR parsing provider."}
                    </p>

                    {/* Metadata items */}
                    <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {p.endpointUrl && (
                        <div className="truncate">
                          <span className="font-medium text-gray-500">Endpoint: </span>
                          <span className="font-mono text-gray-800" title={p.endpointUrl}>
                            {p.endpointUrl}
                          </span>
                        </div>
                      )}
                      {p.modelIdOrProcessorId && (
                        <div>
                          <span className="font-medium text-gray-500">Model / Processor: </span>
                          <span className="font-mono text-gray-800">{p.modelIdOrProcessorId}</span>
                        </div>
                      )}
                      {p.region && (
                        <div>
                          <span className="font-medium text-gray-500">Region: </span>
                          <span className="font-mono text-gray-800">{p.region}</span>
                        </div>
                      )}
                      {p.apiKeyOrSecret && (
                        <div>
                          <span className="font-medium text-gray-500">API Key: </span>
                          <span className="font-mono text-gray-800">{p.apiKeyOrSecret}</span>
                        </div>
                      )}
                    </div>

                    {/* Test result banner if tested */}
                    {testResult && (
                      <div
                        className={`mt-3 p-2.5 rounded-lg text-xs flex items-start gap-2 ${testResult.success
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}
                      >
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">{testResult.message}</p>
                          <p className="text-[11px] opacity-75 mt-0.5">Latency: {testResult.responseTimeMs} ms</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleTestConnection(p.id)}
                      disabled={isTesting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition"
                    >
                      <Zap className={`w-3.5 h-3.5 ${isTesting ? "animate-spin text-indigo-600" : ""}`} />
                      {isTesting ? "Testing…" : "Test Connection"}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditProvider(p)}
                        className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition"
                        title="Edit Provider Details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!p.isDefault && (
                        <button
                          onClick={() => handleDeleteProvider(p)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Provider"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SCAN AUDIT LOGS */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Store Invoice Scans (Audit Trail)</h3>
            <span className="text-xs text-gray-500">{logs.length} logged scan records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Timestamp (UTC)</th>
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">OCR Provider</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Extracted Vendor / Bill</th>
                  <th className="px-4 py-3 text-right">Items / Total</th>
                  <th className="px-4 py-3 text-right">Latency</th>
                  <th className="px-4 py-3 text-center">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No invoice scans recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {new Date(log.scannedAtUtc).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-xs flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate max-w-xs" title={log.fileName}>
                            {log.fileName}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {(log.fileSize / 1024).toFixed(1)} KB • {log.scannedBy}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-xs">{log.providerName}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{log.providerType}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${log.status === "Success"
                              ? "bg-emerald-100 text-emerald-800"
                              : log.status === "QuotaExceeded"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                        >
                          {log.status}
                        </span>
                        {log.errorMessage && (
                          <div className="text-[10px] text-rose-600 mt-0.5 truncate max-w-xs" title={log.errorMessage}>
                            {log.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-gray-900">{log.extractedVendorName || "—"}</div>
                        <div className="text-gray-400 font-mono text-[11px]">{log.extractedBillNumber || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {log.extractedGrandTotal != null ? (
                          <>
                            <div className="font-semibold text-gray-900">
                              ₹{Number(log.extractedGrandTotal).toLocaleString()}
                            </div>
                            <div className="text-gray-400 text-[11px]">{log.extractedItemCount ?? 0} items</div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">
                        {log.processingTimeMs} ms
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.extractedDataJson ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded transition font-medium"
                          >
                            View JSON
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT OCR PROVIDER */}
      {isProviderModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900">
                  {editingProvider ? "Edit OCR Provider" : "Register New OCR Provider"}
                </h3>
              </div>
              <button
                onClick={() => setIsProviderModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProvider} noValidate className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Provider Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Azure AI Document Intelligence, Google DocAI"
                  value={providerFormData.name}
                  onChange={(e) => {
                    setProviderFormData({ ...providerFormData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: "" });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none transition ${formErrors.name
                      ? "border-rose-400 focus:ring-2 focus:ring-rose-500 bg-rose-50/20"
                      : "border-gray-300 focus:ring-2 focus:ring-indigo-500"
                    }`}
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Provider Type
                  </label>
                  <select
                    value={providerFormData.providerType}
                    onChange={(e) => {
                      setProviderFormData({ ...providerFormData, providerType: e.target.value });
                      if (formErrors.providerType) setFormErrors({ ...formErrors, providerType: "" });
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none bg-white transition ${formErrors.providerType
                        ? "border-rose-400 focus:ring-2 focus:ring-rose-500"
                        : "border-gray-300 focus:ring-2 focus:ring-indigo-500"
                      }`}
                  >
                    <option value="TesseractLocal">Tesseract (Local Engine)</option>
                    <option value="AzureDocumentIntelligence">Azure AI Document Intelligence</option>
                    <option value="GoogleDocumentAi">Google Document AI</option>
                    <option value="AwsTextract">AWS Textract</option>
                    <option value="Custom">Custom REST OCR API</option>
                  </select>
                  {formErrors.providerType && (
                    <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {formErrors.providerType}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. eastus, us, ap-south-1"
                    value={providerFormData.region}
                    onChange={(e) => setProviderFormData({ ...providerFormData, region: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Endpoint URL
                </label>
                <input
                  type="text"
                  placeholder="https://<your-resource-name>.cognitiveservices.azure.com/"
                  value={providerFormData.endpointUrl}
                  onChange={(e) => {
                    setProviderFormData({ ...providerFormData, endpointUrl: e.target.value });
                    if (formErrors.endpointUrl) setFormErrors({ ...formErrors, endpointUrl: "" });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none transition ${formErrors.endpointUrl
                      ? "border-rose-400 focus:ring-2 focus:ring-rose-500 bg-rose-50/20"
                      : "border-gray-300 focus:ring-2 focus:ring-indigo-500"
                    }`}
                />
                {formErrors.endpointUrl && (
                  <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {formErrors.endpointUrl}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    API Key / Secret
                  </label>
                  <input
                    type="password"
                    placeholder="Enter API key or secret token"
                    value={providerFormData.apiKeyOrSecret}
                    onChange={(e) =>
                      setProviderFormData({ ...providerFormData, apiKeyOrSecret: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Model / Processor ID
                  </label>
                  <input
                    type="text"
                    placeholder="prebuilt-invoice, invoice-processor"
                    value={providerFormData.modelIdOrProcessorId}
                    onChange={(e) =>
                      setProviderFormData({ ...providerFormData, modelIdOrProcessorId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Additional Configuration (JSON)
                </label>
                <textarea
                  rows={2}
                  placeholder='{"timeoutMs": 15000, "confidenceThreshold": 0.8}'
                  value={providerFormData.additionalConfigJson}
                  onChange={(e) => {
                    setProviderFormData({ ...providerFormData, additionalConfigJson: e.target.value });
                    if (formErrors.additionalConfigJson) setFormErrors({ ...formErrors, additionalConfigJson: "" });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-xs font-mono focus:outline-none transition ${formErrors.additionalConfigJson
                      ? "border-rose-400 focus:ring-2 focus:ring-rose-500 bg-rose-50/20"
                      : "border-gray-300 focus:ring-2 focus:ring-indigo-500"
                    }`}
                />
                {formErrors.additionalConfigJson && (
                  <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {formErrors.additionalConfigJson}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes about this OCR service, rate limits, tier, or purpose..."
                  value={providerFormData.description}
                  onChange={(e) =>
                    setProviderFormData({ ...providerFormData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={providerFormData.isEnabled}
                    onChange={(e) =>
                      setProviderFormData({ ...providerFormData, isEnabled: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Provider Enabled</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={providerFormData.isDefault}
                    onChange={(e) =>
                      setProviderFormData({ ...providerFormData, isDefault: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Set as System Default</span>
                </label>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProviderModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProvider}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2"
                >
                  {savingProvider && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {editingProvider ? "Save Changes" : "Register Provider"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW SCAN JSON PAYLOAD */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-900">Extracted Invoice OCR Payload</h3>
                <p className="text-xs text-gray-400">File: {selectedLog.fileName} • Provider: {selectedLog.providerName}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-auto max-h-96">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(selectedLog.extractedDataJson || "{}"), null, 2);
                  } catch {
                    return selectedLog.extractedDataJson;
                  }
                })()}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Ban,
  Play,
  Mail,
  Phone,
  MapPin,
  FileText
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { useNotifications } from "../../context/NotificationContext";

interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
  status: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerMobile: string | null;
  stateCode: string | null;
  gstin: string | null;
  address: string | null;
  rejectionReason: string | null;
  isActive: boolean;
  createdAt: string;
}

export function TenantDirectoryPage() {
  const notifications = useNotifications();
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Details Modal
  const [selectedTenant, setSelectedTenant] = useState<AdminTenant | null>(null);

  // Reject Modal
  const [rejectTenant, setRejectTenant] = useState<AdminTenant | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<AdminTenant[]>("/admin/tenants");
      setTenants(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenant directory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleSuspend = async (tenant: AdminTenant) => {
    const confirmed = await notifications.confirm({
      title: "Suspend Store?",
      message: `Are you sure you want to suspend "${tenant.name}"? Users belonging to this store will no longer be able to log in.`,
      variant: "danger",
      confirmLabel: "Suspend Store",
      cancelLabel: "Cancel",
    });
    if (!confirmed) {
      return;
    }

    setActionInProgress(tenant.id);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.post(`/admin/tenants/${tenant.id}/suspend`, {})
        .catch(() => apiClient.post(`/tenants/${tenant.id}/suspend`, {}));
      setSuccessMsg(`Store "${tenant.name}" has been suspended.`);
      await fetchTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to suspend store.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReactivate = async (tenant: AdminTenant) => {
    setActionInProgress(tenant.id);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.post(`/admin/tenants/${tenant.id}/reactivate`, {})
        .catch(() => apiClient.post(`/tenants/${tenant.id}/reactivate`, {}));
      setSuccessMsg(`Store "${tenant.name}" has been reactivated.`);
      await fetchTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reactivate store.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleApprove = async (tenant: AdminTenant) => {
    const confirmed = await notifications.confirm({
      title: "Approve Store Registration?",
      message: `Approve "${tenant.name}"? This will create its isolated PostgreSQL schema and seed default accounting ledgers.`,
      variant: "warning",
      confirmLabel: "Approve & Provision",
      cancelLabel: "Cancel",
    });
    if (!confirmed) {
      return;
    }

    setActionInProgress(tenant.id);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.post(`/admin/tenants/${tenant.id}/approve`, {})
        .catch(() => apiClient.post(`/tenants/${tenant.id}/approve`, {}));
      setSuccessMsg(`Store "${tenant.name}" approved and provisioned successfully.`);
      await fetchTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve store.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTenant) return;

    setActionInProgress(rejectTenant.id);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.post(`/admin/tenants/${rejectTenant.id}/reject`, {
        reason: rejectReason.trim() || undefined,
      }).catch(() => apiClient.post(`/tenants/${rejectTenant.id}/reject`, {
        reason: rejectReason.trim() || undefined,
      }));
      setSuccessMsg(`Registration for "${rejectTenant.name}" has been rejected.`);
      setRejectTenant(null);
      setRejectReason("");
      await fetchTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject registration.");
    } finally {
      setActionInProgress(null);
    }
  };

  const copySlug = (slug: string) => {
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      (t.ownerEmail && t.ownerEmail.toLowerCase().includes(search.toLowerCase())) ||
      (t.gstin && t.gstin.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "ACTIVE") return t.status === "Active" && t.isActive;
    if (statusFilter === "PENDING") return t.status.includes("Pending");
    if (statusFilter === "SUSPENDED") return t.status === "Suspended" || !t.isActive;
    if (statusFilter === "REJECTED") return t.status === "Rejected";
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Building2 className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tenant Store Directory</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete oversight of all onboarded store workspaces, lifecycle states, and isolated database schemas.
            </p>
          </div>
        </div>

        <button
          onClick={fetchTenants}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertTriangle className="size-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {successMsg && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1 font-medium">{successMsg}</div>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by store name, slug, owner email, or GSTIN…"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "ALL", label: "All Stores", count: tenants.length },
            { id: "ACTIVE", label: "Active", count: tenants.filter((t) => t.status === "Active" && t.isActive).length },
            { id: "PENDING", label: "Pending", count: tenants.filter((t) => t.status.includes("Pending")).length },
            { id: "SUSPENDED", label: "Suspended", count: tenants.filter((t) => t.status === "Suspended" || !t.isActive).length },
            { id: "REJECTED", label: "Rejected", count: tenants.filter((t) => t.status === "Rejected").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${statusFilter === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
            >
              {tab.label} <span className="opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tenant Directory Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Store & Schema</th>
                <th className="px-5 py-3.5 font-semibold">Workspace Slug</th>
                <th className="px-5 py-3.5 font-semibold">Store Owner</th>
                <th className="px-5 py-3.5 font-semibold">Tax & Region</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Registered</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    No stores match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const isPending = t.status.includes("Pending");
                  const isSuspended = t.status === "Suspended" || !t.isActive;
                  const isActive = t.status === "Active" && t.isActive;
                  const isRejected = t.status === "Rejected";

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">{t.name}</div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {t.schemaName}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <span>{t.slug}</span>
                          <button
                            type="button"
                            onClick={() => copySlug(t.slug)}
                            title="Copy slug"
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {copiedSlug === t.slug ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{t.ownerName || "—"}</div>
                        <div className="text-[11px] text-slate-400">{t.ownerEmail || t.ownerMobile || "—"}</div>
                      </td>

                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        <div>{t.gstin ? <span className="font-mono font-medium">{t.gstin}</span> : "Unregistered"}</div>
                        <div className="text-[11px] text-slate-400">State: {t.stateCode || "—"}</div>
                      </td>

                      <td className="px-5 py-3.5">
                        {isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="size-3" />
                            <span>Active</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            <Clock className="size-3" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {isSuspended && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            <XCircle className="size-3" />
                            <span>Suspended</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <XCircle className="size-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedTenant(t)}
                            title="View Full Store Profile"
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <Eye className="size-3.5" />
                          </button>

                          {isActive && (
                            <button
                              onClick={() => handleSuspend(t)}
                              disabled={actionInProgress === t.id}
                              title="Suspend Store Access"
                              className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-400"
                            >
                              <Ban className="size-3.5" />
                            </button>
                          )}

                          {isSuspended && (
                            <button
                              onClick={() => handleReactivate(t)}
                              disabled={actionInProgress === t.id}
                              title="Reactivate Store Access"
                              className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400"
                            >
                              <Play className="size-3.5" />
                            </button>
                          )}

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(t)}
                                disabled={actionInProgress === t.id}
                                title="Approve & Provision Schema"
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setRejectTenant(t);
                                  setRejectReason("");
                                }}
                                disabled={actionInProgress === t.id}
                                title="Reject Registration"
                                className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700"
                              >
                                Reject
                              </button>
                            </>
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

      {/* Details View Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{selectedTenant.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">Workspace Slug: {selectedTenant.slug}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="font-semibold text-slate-500">Database Schema</span>
                  <div className="mt-1 font-mono font-medium text-slate-800 dark:text-slate-200">
                    {selectedTenant.schemaName}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="font-semibold text-slate-500">Lifecycle Status</span>
                  <div className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                    {selectedTenant.status}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5">
                <div className="font-semibold text-slate-500">Store Owner & Credentials</div>
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <span className="font-medium">{selectedTenant.ownerName || "No name recorded"}</span>
                </div>
                {selectedTenant.ownerEmail && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Mail className="size-3.5" />
                    <span>{selectedTenant.ownerEmail}</span>
                  </div>
                )}
                {selectedTenant.ownerMobile && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Phone className="size-3.5" />
                    <span>{selectedTenant.ownerMobile}</span>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5">
                <div className="font-semibold text-slate-500">GSTIN & Address Details</div>
                <div className="text-slate-700 dark:text-slate-300">
                  GSTIN: <span className="font-mono font-semibold">{selectedTenant.gstin || "N/A (Unregistered)"}</span>
                </div>
                <div className="text-slate-700 dark:text-slate-300">
                  State Code: <span className="font-semibold">{selectedTenant.stateCode || "N/A"}</span>
                </div>
                {selectedTenant.address && (
                  <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400">
                    <MapPin className="size-3.5 shrink-0 mt-0.5" />
                    <span>{selectedTenant.address}</span>
                  </div>
                )}
              </div>

              {selectedTenant.rejectionReason && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                  <div className="font-semibold">Rejection Reason</div>
                  <div className="mt-1">{selectedTenant.rejectionReason}</div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedTenant(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Reject Store Registration: {rejectTenant.name}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Provide an explanation that will be stored on the record and notified to the applicant.
            </p>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4" noValidate>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Rejection Reason / Notes
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g., Incomplete GST registration documents or duplicate store name"
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectTenant(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress === rejectTenant.id}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
                >
                  {actionInProgress === rejectTenant.id ? "Rejecting…" : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


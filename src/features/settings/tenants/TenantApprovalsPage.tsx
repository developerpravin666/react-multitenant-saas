import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../services/apiClient";
import { useNotifications } from "../../../context/NotificationContext";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  Database,
} from "lucide-react";

interface PendingTenant {
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
  createdAt: string;
}

export function TenantApprovalsPage() {
  const notifications = useNotifications();
  const [tenants, setTenants] = useState<PendingTenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Rejection modal state
  const [rejectModalTenant, setRejectModalTenant] = useState<PendingTenant | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchPendingTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pending = await apiClient.get<PendingTenant[]>("/admin/tenants/pending");
      if (!Array.isArray(pending)) throw new Error("The service returned an invalid pending registrations list.");
      setTenants(pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pending registrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingTenants();
  }, [fetchPendingTenants]);

  const handleApprove = async (tenant: PendingTenant) => {
    const confirmed = await notifications.confirm({
      title: "Approve Store Registration?",
      message: `Are you sure you want to approve "${tenant.name}"? This will create its isolated PostgreSQL schema, apply all database migrations, and seed default ledgers.`,
      variant: "warning",
      confirmLabel: "Approve & Provision",
      cancelLabel: "Cancel",
    });
    if (!confirmed) {
      return;
    }

    setActionInProgress(tenant.id);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await apiClient.post<{ ownerUsername: string; message: string }>(
        `/admin/tenants/${tenant.id}/approve`, {}
      ).catch(() => apiClient.post<{ ownerUsername: string; message: string }>(
        `/tenants/${tenant.id}/approve`, {}
      ));

      setSuccessMessage(
        `Store "${tenant.name}" approved successfully! Schema "${tenant.schemaName}" provisioned, seed ledgers initialized, and owner account "${res.ownerUsername || "admin"}" activated.`
      );
      await fetchPendingTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalTenant) return;

    setActionInProgress(rejectModalTenant.id);
    setError(null);
    setSuccessMessage(null);
    try {
      await apiClient.post(`/admin/tenants/${rejectModalTenant.id}/reject`, {
        reason: rejectReason.trim() || undefined,
      }).catch(() => apiClient.post(`/tenants/${rejectModalTenant.id}/reject`, {
        reason: rejectReason.trim() || undefined,
      }));

      setSuccessMessage(`Registration for "${rejectModalTenant.name}" has been rejected.`);
      setRejectModalTenant(null);
      setRejectReason("");
      await fetchPendingTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed.");
    } finally {
      setActionInProgress(null);
    }
  };

  const copyRegistrationLink = () => {
    const origin = window.location.origin;
    const link = `${origin}/register-tenant`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-blue-600 text-white">
              <Building2 className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Store Onboarding & Approvals</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review store registrations, trigger automated database provisioning, and seed master ledgers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={copyRegistrationLink}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {copiedLink ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            <span>{copiedLink ? "Link Copied!" : "Copy Signup Link"}</span>
          </button>

          <button
            onClick={fetchPendingTenants}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Pending Registrations List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <Clock className="size-4 text-amber-500" />
            <span>Pending Approvals</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              {tenants.length}
            </span>
          </div>
        </div>

        {loading && tenants.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            <RefreshCw className="mx-auto mb-2 size-6 animate-spin text-blue-600" />
            Loading pending registrations...
          </div>
        ) : tenants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
            <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">All Caught Up!</h3>
            <p className="mt-1 text-xs text-slate-500">
              There are no pending store registrations waiting for approval.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tenants.map((t) => {
              const isProcessing = actionInProgress === t.id;
              return (
                <div
                  key={t.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 dark:border-slate-800 dark:hover:border-blue-900"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.name}</h3>
                        <p className="font-mono text-xs text-blue-600 dark:text-blue-400">
                          Slug: <code>{t.slug}</code>
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <Clock className="size-3" />
                        Pending Approval
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <User className="size-3.5 text-slate-400" />
                        <span>Owner: {t.ownerName || "Not provided"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="size-3.5 text-slate-400" />
                        <span className="font-medium text-slate-900 dark:text-slate-200">{t.ownerEmail || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 text-slate-400" />
                        <span>{t.ownerMobile || "N/A"}</span>
                      </div>
                      {(t.stateCode || t.gstin) && (
                        <div className="flex items-center gap-2">
                          <FileText className="size-3.5 text-slate-400" />
                          <span>
                            GSTIN: {t.gstin || "N/A"} · State: {t.stateCode || "N/A"}
                          </span>
                        </div>
                      )}
                      {t.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="size-3.5 text-slate-400" />
                          <span>{t.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Database className="size-3 text-slate-400" />
                        <span>Target Schema: {t.schemaName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleApprove(t)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="size-3.5 animate-spin" />
                          <span>Provisioning Schema & Ledgers...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-3.5" />
                          <span>Approve & Provision DB</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        setRejectModalTenant(t);
                        setRejectReason("");
                      }}
                      className="flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                    >
                      <XCircle className="size-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Reject Registration: {rejectModalTenant.name}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Provide an optional reason explaining why this registration was rejected. This will be included in the notification email to the store owner.
            </p>

            <form onSubmit={handleReject} noValidate className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Incomplete store address or invalid contact details."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalTenant(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress === rejectModalTenant.id}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                >
                  {actionInProgress === rejectModalTenant.id ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


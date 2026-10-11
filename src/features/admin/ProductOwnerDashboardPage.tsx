import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Database,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Server,
  AlertCircle,
  Sliders,
  ExternalLink,
  Layers,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { APP_ROUTES } from "../../config/routes";

interface TenantMetrics {
  totalTenants: number;
  pendingApprovals: number;
  activeTenants: number;
  suspendedTenants: number;
  rejectedTenants: number;
  offlineMode: boolean;
}

interface PendingTenant {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
  status: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerMobile: string | null;
  createdAt: string;
}

export function ProductOwnerDashboardPage() {
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [pendingTenants, setPendingTenants] = useState<PendingTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [activeDbTarget, setActiveDbTarget] = useState<string>("Local");

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, pendingRes, dbConfigRes] = await Promise.all([
        apiClient.get<TenantMetrics>("/admin/metrics").catch(() => ({
          totalTenants: 1,
          pendingApprovals: 0,
          activeTenants: 1,
          suspendedTenants: 0,
          rejectedTenants: 0,
          offlineMode: true,
        })),
        apiClient.get<PendingTenant[]>("/admin/tenants/pending").catch(() => []),
        apiClient.get<{ activeTarget?: string }>("/admin/database/config").catch(() => ({ activeTarget: "Local" })),
      ]);

      setMetrics(metricsRes);
      setPendingTenants(Array.isArray(pendingRes) ? pendingRes : []);
      if (dbConfigRes?.activeTarget) {
        setActiveDbTarget(dbConfigRes.activeTarget);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load platform metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleQuickApprove = async (tenant: PendingTenant) => {
    if (!window.confirm(`Approve "${tenant.name}"? This triggers PostgreSQL schema creation & default ledgers seeding.`)) {
      return;
    }

    setApprovingId(tenant.id);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.post(`/admin/tenants/${tenant.id}/approve`, {})
        .catch(() => apiClient.post(`/tenants/${tenant.id}/approve`, {}));
      setSuccessMsg(`Store "${tenant.name}" successfully provisioned with schema "${tenant.schemaName}".`);
      await fetchDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setApprovingId(null);
    }
  };

  const copyRegistrationLink = () => {
    const link = `${window.location.origin}/register-tenant`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Platform Owner Header */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
              <ShieldCheck className="size-4 text-indigo-400" />
              <span>Platform Owner Administration</span>
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Siddhi Multi-Tenant Platform Control Plane
            </h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Manage tenant store lifecycles, review self-service registrations, execute automated PostgreSQL schema migrations, and oversee system configurations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to={APP_ROUTES.admin.systemSettings}
              className="flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/20 px-3.5 py-2 text-xs font-semibold text-indigo-200 backdrop-blur hover:bg-indigo-500/30 transition"
              title="Click to view database settings or switch active database"
            >
              <Database className="size-4 text-indigo-300" />
              <span>DB: <strong className="text-white font-mono">{activeDbTarget}</strong></span>
            </Link>

            <button
              onClick={copyRegistrationLink}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 backdrop-blur hover:bg-slate-700 transition"
            >
              {copiedLink ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              <span>{copiedLink ? "Link Copied!" : "Store Signup Link"}</span>
            </button>
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {successMsg && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1 font-medium">{successMsg}</div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Tenants */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Stores</span>
            <div className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Building2 className="size-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {metrics?.totalTenants ?? "—"}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Registered across system</div>
        </div>

        {/* Pending Approvals */}
        <Link
          to={APP_ROUTES.admin.pendingApprovals}
          className="group rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-amber-900/40 dark:bg-amber-950/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Pending Review</span>
            <div className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
              <Clock className="size-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900 dark:text-amber-200">{metrics?.pendingApprovals ?? 0}</span>
            {(metrics?.pendingApprovals ?? 0) > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                Action Required
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 group-hover:underline">
            <span>Review registrations</span>
            <ArrowRight className="size-3 transition group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Active Stores */}
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Active Stores</span>
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
              <CheckCircle2 className="size-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-900 dark:text-emerald-200">
            {metrics?.activeTenants ?? "—"}
          </div>
          <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">Live & schema migrated</div>
        </div>

        {/* Suspended Stores */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Suspended</span>
            <div className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <XCircle className="size-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {metrics?.suspendedTenants ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Locked from store access</div>
        </div>

        {/* System Deployment Status */}
        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-5 shadow-sm dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Environment</span>
            <div className="grid size-9 place-items-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
              <Server className="size-5" />
            </div>
          </div>
          <div className="mt-3 text-lg font-bold text-indigo-950 dark:text-indigo-200">
            {metrics?.offlineMode ? "Offline Desktop" : "Cloud Hosted"}
          </div>
          <div className="mt-1 text-xs text-indigo-700 dark:text-indigo-400">PostgreSQL Schema Isolation</div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          to={APP_ROUTES.admin.tenants}
          className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
        >
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Building2 className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
              <span>Tenant Directory & Management</span>
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              View all stores, suspend or reactivate tenants, examine store schema names, and view owner contact details.
            </p>
          </div>
        </Link>

        <Link
          to={APP_ROUTES.admin.databaseMigrations}
          className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
        >
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Database className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
              <span>Database Migrations</span>
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Inspect master schema and per-tenant isolated schemas. Trigger platform-wide automated EF Core schema migrations.
            </p>
          </div>
        </Link>

        <Link
          to={APP_ROUTES.admin.systemSettings}
          className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
        >
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Sliders className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
              <span>System & Offline Settings</span>
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Verify local PostgreSQL connection, email simulation logs, offline/online switches, and platform security tokens.
            </p>
          </div>
        </Link>
      </div>

      {/* Pending Store Approvals Widget */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Pending Store Registrations ({pendingTenants.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Stores awaiting verification. Approving a store provisions its isolated database schema automatically.
            </p>
          </div>
          <Link
            to={APP_ROUTES.admin.pendingApprovals}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            <span>View Full Approval Queue</span>
            <ExternalLink className="size-3.5" />
          </Link>
        </div>

        {pendingTenants.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">All Store Registrations Processed</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              There are currently no stores waiting in the registration approval queue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                <tr>
                  <th className="px-5 py-3 font-semibold">Store Details</th>
                  <th className="px-5 py-3 font-semibold">Workspace Slug</th>
                  <th className="px-5 py-3 font-semibold">Owner Contact</th>
                  <th className="px-5 py-3 font-semibold">Registered On</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{t.name}</div>
                      <div className="font-mono text-[11px] text-slate-400">Target Schema: {t.schemaName}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {t.slug}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      <div>{t.ownerName || "—"}</div>
                      <div className="text-[11px] text-slate-400">{t.ownerEmail || t.ownerMobile || "—"}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleQuickApprove(t)}
                        disabled={approvingId === t.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Check className="size-3.5" />
                        <span>{approvingId === t.id ? "Provisioning…" : "Approve & Provision"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Architecture & Infrastructure Status */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Platform Multi-Tenancy Architecture</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Siddhi uses a Schema-per-Tenant PostgreSQL architecture providing full data isolation, independent backup capability, and zero cross-tenant contamination.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
              <Layers className="size-4 text-indigo-500" />
              <span>Master Directory Schema</span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-500">schema: "tenant"</div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              Stores global tenant registrations, subscription states, and administrator security audit logs.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
              <Database className="size-4 text-emerald-500" />
              <span>Isolated Tenant Schemas</span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-500">schema: "tenant_&lt;slug&gt;_&lt;id&gt;"</div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              Each store's chart of accounts, ledgers, vouchers, customers, stock batches, and invoices are kept strictly isolated.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="size-4 text-blue-500" />
              <span>Role-Based Governance</span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-500">role: "ProductOwner"</div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              Admin token bypasses tenant isolation to execute global maintenance without requiring store owner login.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


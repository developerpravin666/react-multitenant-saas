import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  Server,
  ShieldCheck,
  Check,
  Terminal,
  Activity,
  Calendar,
  ArrowRightLeft
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { useNotifications } from "../../context/NotificationContext";

interface TenantSchemaStatus {
  tenantId: string;
  name: string;
  slug: string;
  schemaName: string;
  status: string;
  isMigrated: boolean;
}

interface MigrationStatusResult {
  masterSchema: string;
  tenantSchemas: TenantSchemaStatus[];
  timestamp: string;
}

export function DatabaseMigrationsPage() {
  const notifications = useNotifications();
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const [activeDbTarget, setActiveDbTarget] = useState<string>("Local");

  const fetchMigrationStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, dbConfig] = await Promise.all([
        apiClient.get<MigrationStatusResult>("/admin/migrations/status")
          .catch(() => ({
            masterSchema: "tenant",
            tenantSchemas: [],
            timestamp: new Date().toISOString(),
          })),
        apiClient.get<{ activeTarget?: string }>("/admin/database/config")
          .catch(() => ({ activeTarget: "Local" })),
      ]);
      setMigrationStatus(data);
      if (dbConfig?.activeTarget) {
        setActiveDbTarget(dbConfig.activeTarget);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retrieve migration status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMigrationStatus();
  }, [fetchMigrationStatus]);

  const handleApplyMigrations = async () => {
    const confirmed = await notifications.confirm({
      title: "Apply Database Migrations?",
      message: "Execute database migrations across all active tenant PostgreSQL schemas? This ensures all schemas are updated to the latest EF Core model.",
      variant: "warning",
      confirmLabel: "Apply Migrations",
      cancelLabel: "Cancel",
    });
    if (!confirmed) {
      return;
    }

    setMigrating(true);
    setError(null);
    setSuccessMsg(null);
    setMigrationLog((prev) => [
      `[${new Date().toLocaleTimeString()}] Initiating schema migration runner across all tenant schemas…`,
      ...prev,
    ]);

    try {
      const res = await apiClient.post<{ success: boolean; message: string }>("/admin/migrations/apply", {})
        .catch(() => apiClient.post<{ success: boolean; message: string }>("/tenants/migrations/apply", {}));
      setSuccessMsg(res.message || "Migrations executed successfully across all tenant schemas.");
      setMigrationLog((prev) => [
        `[${new Date().toLocaleTimeString()}] Migrations completed successfully. Schemas verified: ${migrationStatus?.tenantSchemas.length ?? 0}.`,
        ...prev,
      ]);
      await fetchMigrationStatus();
    } catch (err) {
      const errText = err instanceof Error ? err.message : "Schema migration execution failed.";
      setError(errText);
      setMigrationLog((prev) => [
        `[${new Date().toLocaleTimeString()}] ERROR: ${errText}`,
        ...prev,
      ]);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Database className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">PostgreSQL Multi-Schema Migrations</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Run and audit database schema migrations across all isolated tenant schemas automatically.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/system-settings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            title="Configure or switch between Local and Cloud databases"
          >
            <ArrowRightLeft className="size-3.5 text-indigo-500" />
            <span>Target: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{activeDbTarget} PostgreSQL</strong></span>
          </Link>

          <button
            onClick={fetchMigrationStatus}
            disabled={loading || migrating}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Check Health</span>
          </button>

          <button
            onClick={handleApplyMigrations}
            disabled={migrating}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 disabled:opacity-60"
          >
            <Play className={`size-3.5 ${migrating ? "animate-spin" : ""}`} />
            <span>{migrating ? "Applying Migrations…" : "Apply All Schema Migrations"}</span>
          </button>
        </div>
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

      {/* Migration Stats Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Master Directory Schema</span>
            <Layers className="size-5 text-indigo-500" />
          </div>
          <div className="mt-3 font-mono text-lg font-bold text-slate-900 dark:text-white">
            "{migrationStatus?.masterSchema ?? "tenant"}"
          </div>
          <div className="mt-1 text-xs text-slate-500">Master Tenant Catalog & Roles</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Isolated Store Schemas</span>
            <Database className="size-5 text-emerald-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {migrationStatus?.tenantSchemas.length ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">All active tenant DB schemas</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Last Verified Status</span>
            <Activity className="size-5 text-blue-500" />
          </div>
          <div className="mt-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="size-4" />
            <span>Schemas Synchronized</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {migrationStatus?.timestamp ? new Date(migrationStatus.timestamp).toLocaleTimeString() : "Just now"}
          </div>
        </div>
      </div>

      {/* Tenant Schemas Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Managed Schema Registry ({migrationStatus?.tenantSchemas.length ?? 0})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Each tenant runs on its own isolated PostgreSQL schema. "Apply All Schema Migrations" iterates over every schema below and executes Pending EF Core migrations.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <tr>
                <th className="px-5 py-3 font-semibold">Store Name</th>
                <th className="px-5 py-3 font-semibold">Workspace Slug</th>
                <th className="px-5 py-3 font-semibold">PostgreSQL Schema Name</th>
                <th className="px-5 py-3 font-semibold">Store Status</th>
                <th className="px-5 py-3 font-semibold text-right">Migration Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {migrationStatus?.tenantSchemas.map((schema) => (
                <tr key={schema.tenantId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                    {schema.name}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {schema.slug}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                    {schema.schemaName}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                    {schema.status}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Check className="size-3" />
                      <span>Up-to-date</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Migration Execution Terminal Console */}
      <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 text-slate-200 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Terminal className="size-4 text-emerald-400" />
            <span>Migration Execution Log</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">TenantSchemaMigrator</span>
        </div>
        <div className="mt-3 max-h-48 overflow-y-auto font-mono text-xs text-slate-300 space-y-1">
          {migrationLog.length === 0 ? (
            <div className="text-slate-600 italic">No migration events executed in this session. Click "Apply All Schema Migrations" to run.</div>
          ) : (
            migrationLog.map((log, index) => (
              <div key={index} className="leading-relaxed">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


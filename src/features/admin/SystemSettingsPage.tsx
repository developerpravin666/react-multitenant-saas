import { useState, useEffect } from "react";
import {
  Server,
  Database,
  ShieldCheck,
  HardDrive,
  Copy,
  Check,
  CheckCircle2,
  RefreshCw,
  Radio,
  ArrowRightLeft,
  Cloud,
  Laptop,
  Eye,
  EyeOff,
  Zap,
  AlertCircle,
  Save,
  Activity,
  Mic,
  MicOff,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { Link } from "react-router-dom";
import { APP_ROUTES } from "../../config/routes";
import { useVoiceTyping } from "../voice-typing/VoiceTypingContext";
import { useNotifications } from "../../context/NotificationContext";

interface AdminSystemSettings {
  offlineMode: boolean;
  databaseProvider: string;
  databaseHost: string;
  databasePort: number;
  databaseName: string;
  masterSchema: string;
  emailProvider: string;
  adminEmail: string;
  productOwnerUsername: string;
  totalTenants: number;
  activeTenants: number;
  pendingApprovals: number;
  suspendedTenants: number;
  systemVersion: string;
  serverTimeUtc: string;
  activeDatabaseTarget?: string;
  cloudConfigured?: boolean;
}

interface DatabaseTargetDetails {
  target: "Local" | "Cloud";
  host: string;
  port: number;
  database: string;
  username: string;
  isConfigured: boolean;
  maskedConnectionString: string;
  rawConnectionString: string;
}

interface DatabaseConfigSummary {
  activeTarget: "Local" | "Cloud";
  local: DatabaseTargetDetails;
  cloud: DatabaseTargetDetails;
}

interface DatabaseTestResult {
  success: boolean;
  target: string;
  latencyMs: number;
  serverVersion: string | null;
  message: string;
}

interface DatabaseSwitchResult {
  success: boolean;
  activeTarget: string;
  message: string;
  schemasMigrated: number;
  timestamp: string;
}

export function SystemSettingsPage() {
  const notifications = useNotifications();
  const {
    isSupported: isVoiceSupported,
    isVoiceFeatureEnabled,
    setVoiceFeatureEnabled,
    toggleListening,
    isListening,
  } = useVoiceTyping();
  const [voiceTestInput, setVoiceTestInput] = useState("");

  const [settings, setSettings] = useState<AdminSystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleToggleVoiceFeature = async (enabled: boolean) => {
    await setVoiceFeatureEnabled(enabled);
    if (enabled) {
      notifications.success(
        "Voice Feature Flag Enabled",
        "Feature flag 'voice_typing' set to Enabled and stored in PostgreSQL database."
      );
    } else {
      notifications.info(
        "Voice Feature Flag Disabled",
        "Feature flag 'voice_typing' set to Disabled and stored in PostgreSQL database."
      );
    }
  };

  // Database Management State
  const [dbConfig, setDbConfig] = useState<DatabaseConfigSummary | null>(null);
  const [cloudConnInput, setCloudConnInput] = useState("");
  const [showCloudPassword, setShowCloudPassword] = useState(false);
  const [testState, setTestState] = useState<{
    Local?: { loading: boolean; result?: DatabaseTestResult };
    Cloud?: { loading: boolean; result?: DatabaseTestResult };
  }>({});
  const [isSwitching, setIsSwitching] = useState(false);
  const [syncTenantsOnSwitch, setSyncTenantsOnSwitch] = useState(true);
  const [dbActionMsg, setDbActionMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [switchConfirmTarget, setSwitchConfirmTarget] = useState<"Local" | "Cloud" | null>(null);
  const [isSavingCloudConfig, setIsSavingCloudConfig] = useState(false);
  const [dbLogs, setDbLogs] = useState<string[]>([]);

  const fetchDbConfig = async () => {
    try {
      const config = await apiClient
        .get<DatabaseConfigSummary>("/admin/database/config")
        .catch(() => apiClient.get<DatabaseConfigSummary>("/tenants/database/config"));
      setDbConfig(config);
      if (config.cloud?.rawConnectionString && !cloudConnInput) {
        setCloudConnInput(config.cloud.rawConnectionString);
      }
    } catch (err) {
      console.warn("Could not load database configuration", err);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [data] = await Promise.all([
        apiClient
          .get<AdminSystemSettings>("/admin/system-settings")
          .catch(() => apiClient.get<AdminSystemSettings>("/tenants/system-settings")),
        fetchDbConfig(),
      ]);
      setSettings(data);
    } catch {
      setSettings({
        offlineMode: true,
        databaseProvider: "PostgreSQL (Npgsql)",
        databaseHost: "localhost",
        databasePort: 5432,
        databaseName: "accounting_inventory",
        masterSchema: "tenant",
        emailProvider: "Simulated Console (Offline Mode)",
        adminEmail: "developer.pravin666@gmail.com",
        productOwnerUsername: "admin",
        totalTenants: 1,
        activeTenants: 1,
        pendingApprovals: 0,
        suspendedTenants: 0,
        systemVersion: "1.4.0",
        serverTimeUtc: new Date().toISOString(),
        activeDatabaseTarget: "Local",
        cloudConfigured: false,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await fetchSettings();
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const copyRegistrationLink = () => {
    const origin = window.location.origin;
    const link = `${origin}/register-tenant`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Test connection to Local or Cloud
  const handleTestConnection = async (target: "Local" | "Cloud") => {
    setTestState((prev) => ({
      ...prev,
      [target]: { loading: true },
    }));
    setDbActionMsg(null);

    const customStr = target === "Cloud" && cloudConnInput.trim() ? cloudConnInput.trim() : undefined;

    try {
      const res = await apiClient
        .post<DatabaseTestResult>("/admin/database/test", {
          target,
          connectionString: customStr,
        })
        .catch(() =>
          apiClient.post<DatabaseTestResult>("/tenants/database/test", {
            target,
            connectionString: customStr,
          })
        );

      setTestState((prev) => ({
        ...prev,
        [target]: { loading: false, result: res },
      }));

      const time = new Date().toLocaleTimeString();
      if (res.success) {
        setDbLogs((prev) => [
          `[${time}] Verified ${target} connection (${res.latencyMs}ms): ${res.serverVersion || "Ready"}`,
          ...prev.slice(0, 9),
        ]);
        setDbActionMsg({
          type: "success",
          text: `${target} database verified successfully! Latency: ${res.latencyMs}ms. ${res.serverVersion ? `Version: ${res.serverVersion}` : ""}`,
        });
      } else {
        setDbLogs((prev) => [
          `[${time}] Connection to ${target} failed: ${res.message}`,
          ...prev.slice(0, 9),
        ]);
        setDbActionMsg({
          type: "error",
          text: `Cannot connect to ${target} database: ${res.message}`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection probe failed";
      setTestState((prev) => ({
        ...prev,
        [target]: {
          loading: false,
          result: { success: false, target, latencyMs: 0, serverVersion: null, message: msg },
        },
      }));
      setDbActionMsg({ type: "error", text: msg });
    }
  };

  // Save Cloud Connection String without switching immediately
  const handleSaveCloudConfig = async () => {
    if (!cloudConnInput.trim()) {
      setDbActionMsg({ type: "error", text: "Please provide a valid PostgreSQL connection string." });
      return;
    }

    setIsSavingCloudConfig(true);
    setDbActionMsg(null);
    try {
      await apiClient.post("/admin/database/save-config", {
        cloudConnectionString: cloudConnInput.trim(),
      });
      setDbActionMsg({
        type: "success",
        text: "Cloud PostgreSQL connection string saved and cached in configuration.",
      });
      await fetchDbConfig();
    } catch (err) {
      setDbActionMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to persist cloud database configuration.",
      });
    } finally {
      setIsSavingCloudConfig(false);
    }
  };

  // Execute live target switch
  const executeSwitch = async (target: "Local" | "Cloud") => {
    setIsSwitching(true);
    setDbActionMsg(null);
    setSwitchConfirmTarget(null);

    const customStr = target === "Cloud" && cloudConnInput.trim() ? cloudConnInput.trim() : undefined;
    const time = new Date().toLocaleTimeString();

    setDbLogs((prev) => [
      `[${time}] Initiating switch to ${target} database (Auto-sync: ${syncTenantsOnSwitch ? "Yes" : "No"})...`,
      ...prev.slice(0, 9),
    ]);

    try {
      const result = await apiClient
        .post<DatabaseSwitchResult>("/admin/database/switch", {
          target,
          connectionString: customStr,
          syncTenants: syncTenantsOnSwitch,
        })
        .catch(() =>
          apiClient.post<DatabaseSwitchResult>("/tenants/database/switch", {
            target,
            connectionString: customStr,
            syncTenants: syncTenantsOnSwitch,
          })
        );

      setDbActionMsg({
        type: "success",
        text: result.message || `Application successfully switched to ${target} PostgreSQL database!`,
      });

      setDbLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Switch completed: Application active on ${target} (${result.schemasMigrated} schemas synced).`,
        ...prev.slice(0, 9),
      ]);

      await Promise.all([fetchDbConfig(), fetchSettings()]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to switch active database target.";
      setDbActionMsg({ type: "error", text: errMsg });
      setDbLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Switch failed: ${errMsg}`,
        ...prev.slice(0, 9),
      ]);
    } finally {
      setIsSwitching(false);
    }
  };

  const activeTarget = dbConfig?.activeTarget || settings?.activeDatabaseTarget || "Local";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-slate-800 text-white shadow-sm dark:bg-slate-700">
            <Server className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Platform System Settings</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Database connection switcher (Local ↔ Cloud), deployment operational modes, email dispatch configurations, and administrative keys.
            </p>
          </div>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading || isSwitching}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh All</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. DUAL-DATABASE SWITCHER (LOCAL ↔ CLOUD) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/40 to-white p-6 shadow-sm dark:border-indigo-900/60 dark:from-indigo-950/20 dark:to-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-indigo-100 pb-4 dark:border-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <ArrowRightLeft className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Database Target & Multi-Cloud Switcher</h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    activeTarget === "Cloud"
                      ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  }`}
                >
                  <span className="size-1.5 rounded-full bg-current animate-ping" />
                  Active: {activeTarget} PostgreSQL
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Switch seamlessly between your local PostgreSQL (offline/desktop) and cloud PostgreSQL (hosted/online) instances in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTestConnection("Local")}
              disabled={testState.Local?.loading || isSwitching}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Laptop className="size-3.5 text-emerald-600" />
              <span>{testState.Local?.loading ? "Probing Local…" : "Test Local DB"}</span>
            </button>
            <button
              onClick={() => handleTestConnection("Cloud")}
              disabled={testState.Cloud?.loading || isSwitching}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Cloud className="size-3.5 text-sky-600" />
              <span>{testState.Cloud?.loading ? "Probing Cloud…" : "Test Cloud DB"}</span>
            </button>
          </div>
        </div>

        {/* Action feedback banner */}
        {dbActionMsg && (
          <div
            className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
              dbActionMsg.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                : dbActionMsg.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                : "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300"
            }`}
          >
            {dbActionMsg.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <div className="flex-1 font-medium">{dbActionMsg.text}</div>
          </div>
        )}

        {/* Target Cards Grid */}
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card 1: Local PostgreSQL */}
          <div
            className={`relative rounded-2xl border p-5 transition-all ${
              activeTarget === "Local"
                ? "border-emerald-500 bg-white shadow-md ring-2 ring-emerald-500/20 dark:bg-slate-900"
                : "border-slate-200 bg-slate-50/60 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`grid size-9 place-items-center rounded-lg ${
                    activeTarget === "Local"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  <Laptop className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Local Database (Default)</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Offline-first local PostgreSQL instance</p>
                </div>
              </div>

              {activeTarget === "Local" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Check className="size-3" /> Active Now
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Standby
                </span>
              )}
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
                <span className="text-slate-500">Host & Port:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {dbConfig?.local?.host || "localhost"}:{dbConfig?.local?.port || 5432}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
                <span className="text-slate-500">Database Name:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {dbConfig?.local?.database || "accounting_inventory"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
                <span className="text-slate-500">Master Schema:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">"tenant"</span>
              </div>
              <div className="flex justify-between pb-1.5">
                <span className="text-slate-500">Connection String:</span>
                <span className="max-w-[200px] truncate font-mono text-[11px] text-slate-500" title={dbConfig?.local?.maskedConnectionString}>
                  {dbConfig?.local?.maskedConnectionString || "Host=localhost;Database=accounting_inventory..."}
                </span>
              </div>
            </div>

            {testState.Local?.result && (
              <div
                className={`mt-3 rounded-lg p-2.5 text-xs ${
                  testState.Local.result.success
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{testState.Local.result.success ? "✓ Local DB Reachable" : "✗ Connection Failed"}</span>
                  <span>{testState.Local.result.latencyMs}ms</span>
                </div>
                <div className="mt-0.5 text-[11px] opacity-90">{testState.Local.result.message}</div>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleTestConnection("Local")}
                disabled={testState.Local?.loading || isSwitching}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <Zap className="size-3.5 text-amber-500" />
                <span>Test Connection</span>
              </button>

              {activeTarget !== "Local" ? (
                <button
                  type="button"
                  onClick={() => setSwitchConfirmTarget("Local")}
                  disabled={isSwitching}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                >
                  <ArrowRightLeft className="size-3.5" />
                  <span>Switch to Local</span>
                </button>
              ) : (
                <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  ● Currently Serving All Stores
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Cloud PostgreSQL */}
          <div
            className={`relative rounded-2xl border p-5 transition-all ${
              activeTarget === "Cloud"
                ? "border-sky-500 bg-white shadow-md ring-2 ring-sky-500/20 dark:bg-slate-900"
                : "border-slate-200 bg-slate-50/60 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`grid size-9 place-items-center rounded-lg ${
                    activeTarget === "Cloud"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  <Cloud className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Cloud PostgreSQL (Hosted)</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">AWS RDS, Neon, Supabase, Azure, or remote VPS</p>
                </div>
              </div>

              {activeTarget === "Cloud" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                  <Check className="size-3" /> Active Now
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {dbConfig?.cloud?.isConfigured ? "Configured" : "Not Set"}
                </span>
              )}
            </div>

            {/* Cloud connection string input */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Cloud Connection String:
                </label>
                <button
                  type="button"
                  onClick={() => setShowCloudPassword(!showCloudPassword)}
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  {showCloudPassword ? <EyeOff className="size-3" /> : <Eye className="size-3 text-slate-400" />}
                  <span>{showCloudPassword ? "Mask password" : "Show password"}</span>
                </button>
              </div>

              <div className="relative">
                <textarea
                  rows={2}
                  value={cloudConnInput}
                  onChange={(e) => setCloudConnInput(e.target.value)}
                  placeholder="Host=db.cloudprovider.com;Port=5432;Database=accounting_inventory;Username=postgres;Password=your_secret_password;SSL Mode=Require;"
                  className={`w-full rounded-xl border p-2.5 font-mono text-[11px] outline-none transition dark:bg-slate-800 dark:text-slate-200 ${
                    showCloudPassword ? "" : "text-security-disc"
                  } border-slate-200 focus:border-indigo-500 dark:border-slate-700`}
                />
              </div>

              {/* Quick Template Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-400">Presets:</span>
                <button
                  type="button"
                  onClick={() =>
                    setCloudConnInput(
                      "Host=aws-rds-postgresql.cxxxx.ap-south-1.rds.amazonaws.com;Port=5432;Database=accounting_inventory;Username=postgres;Password=your_password;SSL Mode=Require;Trust Server Certificate=true;"
                    )
                  }
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  AWS RDS
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCloudConnInput(
                      "Host=db.xxxxx.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=your_password;SSL Mode=Require;"
                    )
                  }
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Supabase
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCloudConnInput(
                      "Host=ep-xxxx.ap-southeast-1.neon.tech;Port=5432;Database=neondb;Username=default;Password=your_password;SSL Mode=Require;"
                    )
                  }
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Neon
                </button>
                <button
                  type="button"
                  onClick={() => setCloudConnInput("")}
                  className="text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              </div>
            </div>

            {testState.Cloud?.result && (
              <div
                className={`mt-3 rounded-lg p-2.5 text-xs ${
                  testState.Cloud.result.success
                    ? "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                    : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{testState.Cloud.result.success ? "✓ Cloud DB Connected" : "✗ Connection Failed"}</span>
                  <span>{testState.Cloud.result.latencyMs}ms</span>
                </div>
                <div className="mt-0.5 text-[11px] opacity-90">{testState.Cloud.result.message}</div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection("Cloud")}
                  disabled={testState.Cloud?.loading || isSwitching || !cloudConnInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Zap className="size-3.5 text-amber-500" />
                  <span>Test Connection</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCloudConfig}
                  disabled={isSavingCloudConfig || isSwitching || !cloudConnInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  title="Save connection string without switching active target"
                >
                  <Save className="size-3.5 text-indigo-500" />
                  <span>Save String</span>
                </button>
              </div>

              {activeTarget !== "Cloud" ? (
                <button
                  type="button"
                  onClick={() => setSwitchConfirmTarget("Cloud")}
                  disabled={isSwitching || !cloudConnInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-500 disabled:opacity-50"
                >
                  <ArrowRightLeft className="size-3.5" />
                  <span>Switch to Cloud</span>
                </button>
              ) : (
                <div className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                  ● Currently Serving All Stores
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sync checkbox option & live operation logs */}
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-indigo-950/60 dark:bg-indigo-950/20">
          <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={syncTenantsOnSwitch}
              onChange={(e) => setSyncTenantsOnSwitch(e.target.checked)}
              className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              Auto-migrate database schema & synchronize tenant registry when switching targets
            </span>
          </label>

          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Changes take effect immediately on subsequent API requests (no restart needed).
          </span>
        </div>

        {/* Real-time switcher log */}
        {dbLogs.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-900 p-3.5 text-xs text-slate-200 shadow-inner dark:border-slate-800">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-[11px] font-semibold text-slate-400">
              <Activity className="size-3.5 text-emerald-400" />
              <span>Database Switching Activity Log</span>
            </div>
            <div className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed">
              {dbLogs.map((log, idx) => (
                <div key={idx} className={idx === 0 ? "text-emerald-300 font-semibold" : "text-slate-400"}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {switchConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div
                className={`grid size-11 place-items-center rounded-xl text-white ${
                  switchConfirmTarget === "Cloud" ? "bg-sky-600" : "bg-emerald-600"
                }`}
              >
                <ArrowRightLeft className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Switch Active Database to {switchConfirmTarget}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  All requests and store operations will point to {switchConfirmTarget} PostgreSQL.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="size-4 text-amber-600" />
                <span>What happens next:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Verification probe checks reachability to the {switchConfirmTarget} database.</li>
                <li>Control plane tables (<code className="font-mono">tenant.tenants</code>) are auto-migrated.</li>
                {syncTenantsOnSwitch && (
                  <li>Registered store schemas will be provisioned on the target database automatically.</li>
                )}
                <li>Configuration persists across application restarts.</li>
              </ul>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSwitchConfirmTarget(null)}
                disabled={isSwitching}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeSwitch(switchConfirmTarget)}
                disabled={isSwitching}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition ${
                  switchConfirmTarget === "Cloud" ? "bg-sky-600 hover:bg-sky-500" : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                {isSwitching ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    <span>Executing Switch…</span>
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    <span>Confirm & Switch Target</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VOICE TYPING & SPEECH DICTATION FEATURE CONTROL */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-indigo-200/80 bg-white p-6 shadow-sm dark:border-indigo-900/60 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`grid size-10 place-items-center rounded-xl text-white shadow-sm transition-colors ${
                isVoiceFeatureEnabled ? "bg-indigo-600" : "bg-slate-500"
              }`}
            >
              <Mic className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Voice Typing & Speech Dictation Control
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    isVoiceFeatureEnabled
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      isVoiceFeatureEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                    }`}
                  />
                  {isVoiceFeatureEnabled ? "Feature Active (Enabled)" : "Feature Disabled"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Database className="size-2.5" />
                  flag: voice_typing (DB)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Managed through the database feature flags engine (<code className="font-mono text-[11px]">tenant.feature_flags</code>).{" "}
                <Link
                  to={APP_ROUTES.admin.featureFlags}
                  className="font-semibold text-indigo-600 hover:text-indigo-500 underline dark:text-indigo-400"
                >
                  Open Feature Flags Manager →
                </Link>
              </p>
            </div>
          </div>

          {/* Admin Toggle Switch */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isVoiceFeatureEnabled ? "Enabled" : "Disabled"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isVoiceFeatureEnabled}
              onClick={() => handleToggleVoiceFeature(!isVoiceFeatureEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isVoiceFeatureEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
              title={isVoiceFeatureEnabled ? "Click to Disable Voice Typing" : "Click to Enable Voice Typing"}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isVoiceFeatureEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Feature status details & description */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Browser Speech API Support
            </span>
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span
                className={`size-2 rounded-full ${
                  isVoiceSupported ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              <span>{isVoiceSupported ? "Supported (Chrome / Edge)" : "Not Supported"}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Uses native browser Web Speech Recognition engine.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Global Shortcut & Form Buttons
            </span>
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white font-mono">
              Alt + V / [🎙️ Voice]
            </div>
            <p className="text-[11px] text-slate-500">
              {isVoiceFeatureEnabled
                ? "Microphone shortcuts and field triggers active."
                : "All shortcuts and buttons disabled."}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Floating Voice Assistant
            </span>
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              {isVoiceFeatureEnabled ? "Visible bottom-right" : "Hidden"}
            </div>
            <p className="text-[11px] text-slate-500">
              {isVoiceFeatureEnabled
                ? "Waveform, multi-language selector & transcript preview active."
                : "Floating widget completely deactivated."}
            </p>
          </div>
        </div>

        {/* Live Admin Test Sandbox */}
        <div className="mt-5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Admin Voice Typing Verification Sandbox
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isVoiceFeatureEnabled
                  ? "Click into the test box below and speak or press Alt + V to verify speech dictation."
                  : "Voice typing is currently disabled. Toggle the switch above to re-enable."}
              </p>
            </div>
            {isVoiceFeatureEnabled && (
              <button
                type="button"
                onClick={toggleListening}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm transition cursor-pointer ${
                  isListening
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-indigo-600 text-white hover:bg-indigo-500"
                }`}
              >
                {isListening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                <span>{isListening ? "Listening… Click to Stop" : "Test Voice Dictation"}</span>
              </button>
            )}
          </div>
          <div className="mt-3">
            <input
              type="text"
              id="admin-voice-test-input"
              value={voiceTestInput}
              disabled={!isVoiceFeatureEnabled}
              onChange={(e) => setVoiceTestInput(e.target.value)}
              placeholder={
                isVoiceFeatureEnabled
                  ? "Click here and say: 'Samsung Galaxy S24 Ultra 256GB' or any test words..."
                  : "Voice typing disabled by admin."
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Deployment Mode Overview */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Environment Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Radio className="size-5 text-emerald-500 animate-pulse" />
              <h2 className="font-bold text-slate-900 dark:text-white">Active Deployment Mode</h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {settings?.offlineMode ? "Offline First / Local Desktop" : "Cloud SaaS (Online)"}
            </span>
          </div>

          <div className="mt-4 space-y-4 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Database Engine</span>
                <p className="text-slate-500">PostgreSQL with isolated schema-per-tenant</p>
              </div>
              <span className="font-mono text-slate-600 dark:text-slate-400">
                {settings ? `${settings.databaseHost}:${settings.databasePort}` : "localhost:5432"}
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Active Database Target</span>
                <p className="text-slate-500">Target database currently receiving queries</p>
              </div>
              <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {activeTarget} PostgreSQL
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Database Name</span>
                <p className="text-slate-500">Active PostgreSQL database</p>
              </div>
              <span className="font-mono text-slate-600 dark:text-slate-400">
                {settings?.databaseName ?? "accounting_inventory"}
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Master Directory Schema</span>
                <p className="text-slate-500">Stores global tenant registry & system users</p>
              </div>
              <span className="font-mono text-slate-600 dark:text-slate-400">
                "{settings?.masterSchema ?? "tenant"}"
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Email Dispatch Strategy</span>
                <p className="text-slate-500">{settings?.emailProvider ?? "Simulated console logger"}</p>
              </div>
              <span className="rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                {settings?.offlineMode ? "No SMTP Required" : "Live SMTP"}
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">System Version</span>
                <p className="text-slate-500">Current software release</p>
              </div>
              <span className="font-mono text-slate-600 dark:text-slate-400">
                v{settings?.systemVersion ?? "1.4.0"}
              </span>
            </div>
          </div>
        </div>

        {/* Product Owner Identity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <ShieldCheck className="size-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-slate-900 dark:text-white">Product Owner Profile</h2>
          </div>

          <div className="mt-4 space-y-3.5 text-xs">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Primary Administrator
              </div>
              <div className="mt-1 font-bold text-slate-900 dark:text-white text-sm">
                {settings?.adminEmail ?? "developer.pravin666@gmail.com"}
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                Username: {settings?.productOwnerUsername ?? "admin"}
              </div>
            </div>

            <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <div className="font-semibold text-slate-700 dark:text-slate-300">Administrative Capabilities:</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>Switch database connection dynamically between Local and Cloud</li>
                <li>Approve self-service store registrations with automated schema setup</li>
                <li>Suspend or unfreeze tenant access instantly</li>
                <li>Execute global PostgreSQL migrations across all active tenant schemas</li>
                <li>Access all stores without tenant token restrictions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant Self-Service Onboarding Integration */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Self-Service Store Registration Link</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Share this onboarding link with new business customers. Registrations will appear in your Store Approvals queue.
            </p>
          </div>

          <button
            onClick={copyRegistrationLink}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
          >
            {copiedLink ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />}
            <span>{copiedLink ? "Link Copied to Clipboard!" : "Copy Public Registration Link"}</span>
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
          {window.location.origin}/register-tenant
        </div>
      </div>

      {/* Offline Deployment & Migration Guide */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
          <HardDrive className="size-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 dark:text-white">Offline Deployment & Setup Checklist</h3>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="grid size-6 place-items-center rounded-full bg-blue-600 text-[11px] text-white">1</span>
              <span>PostgreSQL Service</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Ensure PostgreSQL is running locally on port 5432 with the database named <code className="font-mono text-slate-800 dark:text-slate-200">accounting_inventory</code>. The master schema <code className="font-mono">tenant</code> is created automatically on first run.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="grid size-6 place-items-center rounded-full bg-blue-600 text-[11px] text-white">2</span>
              <span>Backend API Server</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Launch the .NET backend API. It includes the Product Owner admin endpoints and handles database schema creation using <code className="font-mono">TenantSchemaMigrator</code> when approving stores.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="grid size-6 place-items-center rounded-full bg-blue-600 text-[11px] text-white">3</span>
              <span>Store Onboarding</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Open <code className="font-mono">/register-tenant</code> to create a store. Log in as Product Owner at <code className="font-mono">/admin/login</code> to approve the store, test database connectivity, or toggle between Local and Cloud targets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

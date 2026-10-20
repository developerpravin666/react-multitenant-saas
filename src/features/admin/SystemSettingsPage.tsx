import { useState, useEffect } from "react";
import {
  Server,
  Database,
  ShieldCheck,
  HardDrive,
  Copy,
  Check,
  RefreshCw,
  Radio,
  Cloud,
  Mic,
  MicOff,
  FileSpreadsheet,
  Download,
  Laptop,
  Network,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { Link } from "react-router-dom";
import { APP_ROUTES } from "../../config/routes";
import { useVoiceTyping } from "../voice-typing/VoiceTypingContext";
import { useNotifications } from "../../context/NotificationContext";
import { RegistrationEmailTemplateEditor } from "./RegistrationEmailTemplateEditor";

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
}

interface DatabaseEngineOption {
  engineType: string;
  displayName: string;
  description: string;
  isRecommended: boolean;
  feasibility: string;
  pros: string;
  cons: string;
}

interface DatabaseEngineConfig {
  activeEngine: string;
  offlineMode: boolean;
  databaseHost: string;
  databasePort: number;
  databaseName: string;
  sqliteFilePath: string;
  excelWorkbookPath: string;
  lanBindingUrl: string;
  availableEngines: DatabaseEngineOption[];
}

interface DatabaseEngineTestResult {
  success: boolean;
  engineType: string;
  latencyMs: number;
  tableCount: number;
  message: string;
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
  const [dbConfig, setDbConfig] = useState<DatabaseEngineConfig | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<string>("PostgreSql");
  const [isTestingEngine, setIsTestingEngine] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<DatabaseEngineTestResult | null>(null);
  const [copiedLanUrl, setCopiedLanUrl] = useState<boolean>(false);
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

  const handleTestEngine = async (engineType: string) => {
    setIsTestingEngine(true);
    setTestResult(null);
    try {
      const res = await apiClient.post<DatabaseEngineTestResult>("/admin/database-engine/test", { engineType });
      setTestResult(res);
      if (res.success) {
        notifications.success("Engine Verification Succeeded", res.message);
      } else {
        notifications.error("Engine Verification Failed", res.message);
      }
    } catch (err) {
      notifications.error("Test Failed", err instanceof Error ? err.message : "Database engine verification failed");
    } finally {
      setIsTestingEngine(false);
    }
  };

  const handleExportDatabaseExcel = () => {
    notifications.info("Exporting Excel Database", "Generating comprehensive multi-sheet ledger workbook...");
    window.open("/api/admin/database-engine/export-excel", "_blank");
  };

  const copyLanUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLanUrl(true);
    setTimeout(() => setCopiedLanUrl(false), 2500);
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await apiClient
          .get<AdminSystemSettings>("/admin/system-settings")
          .catch(() => apiClient.get<AdminSystemSettings>("/tenants/system-settings"));
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
      });
    }

    try {
      const engineData = await apiClient.get<DatabaseEngineConfig>("/admin/database-engine");
      if (engineData) {
        setDbConfig(engineData);
        setSelectedEngine(engineData.activeEngine || "PostgreSql");
      }
    } catch {}

    setLoading(false);
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
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh All</span>
        </button>
      </div>

      <RegistrationEmailTemplateEditor />

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

      {/* Offline Desktop & Database Engine Architecture (Tally Prime Model) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Database className="size-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Database Engine & Offline Desktop Architecture
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure your offline deployment mode and choose between PostgreSQL (multi-counter LAN), SQLite (single-file portable), or Excel Sync.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Radio className="size-3 text-emerald-500 animate-pulse" />
              <span>{settings?.offlineMode ? "Offline Mode (Tally Prime Model)" : "Cloud / Hybrid Mode"}</span>
            </span>
          </div>
        </div>

        {/* Engine Selection Cards */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-3">
            Available Database & Sync Engines
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. PostgreSQL */}
            <div
              onClick={() => setSelectedEngine("PostgreSql")}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                selectedEngine === "PostgreSql"
                  ? "border-indigo-600 bg-indigo-50/40 dark:border-indigo-500 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <Database className="size-4 text-indigo-600 dark:text-indigo-400" />
                  <span>PostgreSQL (Local / LAN)</span>
                </div>
                <span className="rounded-md bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  Recommended
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Full transactional ACID engine with isolated schema-per-tenant. Supports local offline usage and multiple billing counters on local Wi-Fi / LAN (Tally Gold).
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                Target: {settings ? `${settings.databaseHost}:${settings.databasePort}` : "localhost:5432"} ({settings?.databaseName ?? "accounting_inventory"})
              </div>
            </div>

            {/* 2. SQLite */}
            <div
              onClick={() => setSelectedEngine("Sqlite")}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                selectedEngine === "Sqlite"
                  ? "border-indigo-600 bg-indigo-50/40 dark:border-indigo-500 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <HardDrive className="size-4 text-amber-600 dark:text-amber-400" />
                  <span>SQLite (Embedded File)</span>
                </div>
                <span className="rounded-md bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  Portable
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Single zero-install embedded database file. Runs inside the application process without any background database service. Ideal for single-laptop stores.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate" title={dbConfig?.sqliteFilePath}>
                File: {dbConfig?.sqliteFilePath ? dbConfig.sqliteFilePath.split("\\").pop() : "siddhi_store.db"}
              </div>
            </div>

            {/* 3. Excel Sync Engine */}
            <div
              onClick={() => setSelectedEngine("ExcelSync")}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                selectedEngine === "ExcelSync"
                  ? "border-indigo-600 bg-indigo-50/40 dark:border-indigo-500 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Excel Workbook Sync</span>
                </div>
                <span className="rounded-md bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                  Audit Mirror
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                ClosedXML continuous sync engine. Automatically mirrors ledgers, products, invoices, and vouchers to an organized multi-sheet Excel spreadsheet (.xlsx).
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate" title={dbConfig?.excelWorkbookPath}>
                Mirror: {dbConfig?.excelWorkbookPath ? dbConfig.excelWorkbookPath.split("\\").pop() : "siddhi_ledger_sync.xlsx"}
              </div>
            </div>
          </div>
        </div>

        {/* Engine Verification & Export Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleTestEngine(selectedEngine)}
              disabled={isTestingEngine}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 transition disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isTestingEngine ? "animate-spin" : ""}`} />
              <span>{isTestingEngine ? "Testing Connection…" : `Test ${selectedEngine} Engine`}</span>
            </button>

            <button
              type="button"
              onClick={handleExportDatabaseExcel}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition shadow-xs"
            >
              <Download className="size-3.5" />
              <span>Export Full Database to Excel (.xlsx)</span>
            </button>
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            Engine Selected: <strong className="text-slate-900 dark:text-white font-mono">{selectedEngine}</strong>
          </span>
        </div>

        {/* Verification Result Feedback */}
        {testResult && (
          <div
            className={`rounded-xl border p-4 text-xs font-medium ${
              testResult.success
                ? "border-emerald-200 bg-emerald-50/60 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50/60 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {testResult.success ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-bold">
                  {testResult.success ? "Engine Test Succeeded" : "Engine Test Failed"} — Latency: {testResult.latencyMs} ms · Tables: {testResult.tableCount}
                </div>
                <p className="mt-1 leading-relaxed opacity-90">{testResult.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Multi-Counter LAN Billing (Tally Gold Model) */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                <Network className="size-4 text-indigo-600 dark:text-indigo-400" />
                <span>Multi-Counter LAN Billing Setup (Tally Gold Model)</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                In offline store mode, any billing computer or POS tablet on your shop’s local Wi-Fi or LAN cable can connect to this main PC and bill concurrently without internet.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                {window.location.origin}
              </span>
              <button
                type="button"
                onClick={() => copyLanUrl(window.location.origin)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-xs"
              >
                {copiedLanUrl ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                <span>{copiedLanUrl ? "Copied!" : "Copy LAN URL"}</span>
              </button>
            </div>
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
              Open <code className="font-mono">/register-tenant</code> to create a store. Log in as Product Owner at <code className="font-mono">/admin/login</code> to approve the store and review platform settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

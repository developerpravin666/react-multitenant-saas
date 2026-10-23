import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  Zap,
  Play,
  Square,
  RefreshCw,
  Server,
  Gauge,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  Trash2,
  Eye,
  Sliders,
  Layers,
  ShieldCheck,
  Building2,
  FileText,
  AlertCircle,
  TrendingUp,
  Cpu,
  Database,
  ArrowRight,
  ExternalLink,
  LoaderCircle,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { useNotifications } from "../../context/NotificationContext";
import { Button } from "../../components/ui/Button";
import { inputClass } from "../../components/ui/inputClass";
import { formatDate } from "../../lib/date";
import type {
  LoadTestScenario,
  LoadTestRunSummary,
  LoadTestConfig,
  QuickPingResult,
} from "./load-testing/loadTesting.types";
import {
  ThroughputChart,
  LatencyChart,
  PercentilesBar,
  StatusCodeDistribution,
} from "./load-testing/components/LoadTestCharts";

interface AdminTenantOption {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
}

export function LoadTestingDashboardPage() {
  const notifications = useNotifications();

  // Scenarios & Tenants
  const [scenarios, setScenarios] = useState<LoadTestScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("health-baseline");
  const [tenants, setTenants] = useState<AdminTenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  // Configuration Form State
  const [config, setConfig] = useState<LoadTestConfig>({
    name: "Health Check Baseline",
    scenarioId: "health-baseline",
    targetEndpoint: "/health",
    targetBaseUrl: "https://localhost:64115",
    method: "GET",
    virtualUsers: 25,
    durationSeconds: 15,
    rampUpSeconds: 2,
    tenantId: undefined,
    authToken: "",
    requestBody: "",
    bypassRateLimiter: true,
  });

  // Test Run State
  const [activeTest, setActiveTest] = useState<LoadTestRunSummary | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [history, setHistory] = useState<LoadTestRunSummary[]>([]);
  const [inspectingRun, setInspectingRun] = useState<LoadTestRunSummary | null>(null);

  // Quick Ping State
  const [isPinging, setIsPinging] = useState(false);
  const [quickPingResult, setQuickPingResult] = useState<QuickPingResult | null>(null);

  // Polling ref
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Initial Load: Scenarios, Tenants, History, and Current Active Test
  const loadInitialData = useCallback(async () => {
    try {
      const [scenariosRes, tenantsRes, historyRes, currentRes] = await Promise.all([
        apiClient.get<LoadTestScenario[]>("/admin/load-test/scenarios", { skipLoading: true }).catch(() => []),
        apiClient.get<AdminTenantOption[]>("/admin/tenants", { skipLoading: true }).catch(() => []),
        apiClient.get<LoadTestRunSummary[]>("/admin/load-test/history", { skipLoading: true }).catch(() => []),
        apiClient.get<{ hasActiveTest: boolean; current: LoadTestRunSummary | null }>("/admin/load-test/current", { skipLoading: true }).catch(() => ({ hasActiveTest: false, current: null })),
      ]);

      if (Array.isArray(scenariosRes) && scenariosRes.length > 0) {
        setScenarios(scenariosRes);
      }

      if (Array.isArray(tenantsRes)) {
        setTenants(tenantsRes);
        if (tenantsRes[0] && !selectedTenantId) {
          setSelectedTenantId(tenantsRes[0].id);
        }
      }

      if (Array.isArray(historyRes)) {
        setHistory(historyRes);
      }

      if (currentRes?.current) {
        setActiveTest(currentRes.current);
      }
    } catch (err) {
      notifications.error("Load Error", err instanceof Error ? err.message : "Failed to load initial load test data");
    }
  }, [notifications, selectedTenantId]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  // 2. Active Test Polling Loop (polls every 1000ms while a test is Running)
  useEffect(() => {
    if (activeTest && activeTest.status === "Running") {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await apiClient.get<{ hasActiveTest: boolean; current: LoadTestRunSummary | null }>(
            "/admin/load-test/current",
            { skipLoading: true }
          );
          if (res?.current) {
            setActiveTest(res.current);
            if (res.current.status !== "Running") {
              // Test completed!
              clearInterval(pollingRef.current!);
              void reloadHistory();
            }
          }
        } catch {
          // Ignore network blips during test
        }
      }, 1000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [activeTest?.status]);

  const reloadHistory = async () => {
    try {
      const historyRes = await apiClient.get<LoadTestRunSummary[]>("/admin/load-test/history", { skipLoading: true });
      if (Array.isArray(historyRes)) {
        setHistory(historyRes);
      }
    } catch {
      // Ignore
    }
  };

  // 3. Scenario Selection Handler
  const handleSelectScenario = (sc: LoadTestScenario) => {
    setSelectedScenarioId(sc.id);
    setConfig((prev) => ({
      ...prev,
      name: sc.name,
      scenarioId: sc.id,
      targetEndpoint: sc.defaultEndpoint,
      method: sc.method,
      virtualUsers: sc.defaultVUs,
      durationSeconds: sc.defaultDurationSeconds,
      rampUpSeconds: sc.defaultRampUpSeconds,
      tenantId: sc.requiresTenant ? selectedTenantId || undefined : undefined,
    }));
    setInspectingRun(null);
  };

  // 4. Quick Latency Ping
  const handleQuickPing = async () => {
    setIsPinging(true);
    setQuickPingResult(null);
    try {
      const res = await apiClient.post<QuickPingResult>("/admin/load-test/quick-ping", {
        targetEndpoint: config.targetEndpoint,
        targetBaseUrl: config.targetBaseUrl,
        tenantId: config.tenantId,
        authToken: config.authToken,
        bypassRateLimiter: config.bypassRateLimiter ?? true,
      }, { skipLoading: true });
      setQuickPingResult(res);
      if (res.success) {
        notifications.success("Ping Succeeded", `${res.message}`);
      } else {
        notifications.error("Ping Failed", res.message);
      }
    } catch (err) {
      notifications.error("Ping Error", err instanceof Error ? err.message : "Quick ping failed");
    } finally {
      setIsPinging(false);
    }
  };

  // 5. Start Load Test
  const handleStartTest = async () => {
    setIsStarting(true);
    setInspectingRun(null);
    try {
      const payload: LoadTestConfig = {
        ...config,
        tenantId: config.tenantId ? config.tenantId : undefined,
      };

      const res = await apiClient.post<any>("/admin/load-test/start", payload, { skipLoading: true });
      const summary: LoadTestRunSummary | null =
        res?.summary ?? res?.data?.summary ?? (res?.runId ? res : null);
      if (summary) {
        setActiveTest(summary);
        notifications.success("Load Test Started", `Executing ${config.virtualUsers} VUs for ${config.durationSeconds}s`);
      } else {
        const cur = await apiClient.get<{ hasActiveTest: boolean; current: LoadTestRunSummary | null }>(
          "/admin/load-test/current",
          { skipLoading: true }
        );
        if (cur?.current) {
          setActiveTest(cur.current);
        }
      }
    } catch (err) {
      notifications.error("Start Failed", err instanceof Error ? err.message : "Failed to initiate load test.");
    } finally {
      setIsStarting(false);
    }
  };

  // 6. Stop Load Test
  const handleStopTest = async () => {
    setIsStopping(true);
    try {
      await apiClient.post("/admin/load-test/stop", {}, { skipLoading: true });
      notifications.info("Load Test Aborted", "Stopping virtual user threads gracefully.");
      const currentRes = await apiClient.get<{ hasActiveTest: boolean; current: LoadTestRunSummary | null }>(
        "/admin/load-test/current",
        { skipLoading: true }
      );
      if (currentRes?.current) {
        setActiveTest(currentRes.current);
      }
      void reloadHistory();
    } catch (err) {
      notifications.error("Stop Error", err instanceof Error ? err.message : "Failed to stop load test.");
    } finally {
      setIsStopping(false);
    }
  };

  // 7. Clear History
  const handleClearHistory = async () => {
    const confirmed = await notifications.confirm({
      title: "Clear All Load Test History?",
      message: "This will remove all saved benchmark runs and telemetry files.",
      variant: "danger",
      confirmLabel: "Clear All",
    });
    if (!confirmed) return;

    try {
      await apiClient.delete("/admin/load-test/history");
      setHistory([]);
      notifications.success("History Cleared", "All previous load test runs deleted.");
    } catch (err) {
      notifications.error("Delete Error", err instanceof Error ? err.message : "Failed to clear history");
    }
  };

  // 8. Delete Single History Item
  const handleDeleteRun = async (runId: string) => {
    try {
      await apiClient.delete(`/admin/load-test/history/${runId}`);
      setHistory((prev) => prev.filter((h) => h.runId !== runId));
      if (inspectingRun?.runId === runId) {
        setInspectingRun(null);
      }
      notifications.success("Deleted", "Run record removed from history.");
    } catch (err) {
      notifications.error("Delete Error", err instanceof Error ? err.message : "Failed to delete run");
    }
  };

  // 9. Export Run Summary (JSON)
  const handleExportJson = (run: LoadTestRunSummary) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(run, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `load_test_${run.scenarioName.replace(/\s+/g, "_")}_${run.runId.slice(0, 8)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 10. Export Run Summary (CSV)
  const handleExportCsv = (run: LoadTestRunSummary) => {
    const headers = ["Second", "Active_VUs", "Requests_Sec", "Success_Sec", "Errors_Sec", "Avg_Latency_ms", "Min_Latency_ms", "Max_Latency_ms", "CPU_Percent", "Memory_MB"];
    const rows = run.telemetry.map((t) => [
      t.second,
      t.activeVirtualUsers,
      t.requestsInSecond,
      t.successInSecond,
      t.errorsInSecond,
      t.avgLatencyMs,
      t.minLatencyMs,
      t.maxLatencyMs,
      t.cpuPercentage,
      t.memoryMb,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `load_test_${run.scenarioName.replace(/\s+/g, "_")}_${run.runId.slice(0, 8)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Current displayed run: either user is inspecting an old run, or showing the active/last run
  const displayedRun = inspectingRun || activeTest;
  const isRunning = activeTest?.status === "Running";
  const isProcessActive = isStarting || isRunning;

  const getStatusBadge = (status?: string) => {
    if (isProcessActive || status === "Running") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 animate-pulse dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
          <LoaderCircle className="size-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
          <span>TEST RUNNING</span>
        </span>
      );
    }
    switch (status) {
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5" />
            <span>COMPLETED</span>
          </span>
        );
      case "Aborted":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertTriangle className="size-3.5" />
            <span>ABORTED</span>
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <AlertCircle className="size-3.5" />
            <span>FAILED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Gauge className="size-3.5" />
            <span>IDLE / READY</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
              <Gauge className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Load Testing & Performance Benchmarks
                </h1>
                {getStatusBadge(displayedRun?.status)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Stress-test microservices, verify tenant schema isolation throughput, and monitor latency percentiles (p50/p95/p99).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleQuickPing}
            isLoading={isPinging}
            disabled={isProcessActive}
            className="text-xs"
          >
            <Zap className="size-3.5 text-amber-500" />
            <span>Quick Ping (3s)</span>
          </Button>

          <Button
            variant="secondary"
            onClick={loadInitialData}
            className="text-xs"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>

          {displayedRun && (
            <Button
              variant="secondary"
              onClick={() => handleExportJson(displayedRun)}
              className="text-xs"
            >
              <Download className="size-3.5" />
              <span>Export JSON</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Ping Feedback Banner */}
      {quickPingResult && (
        <div
          className={`flex items-center justify-between rounded-xl border p-3 text-xs ${quickPingResult.success
            ? "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            }`}
        >
          <div className="flex items-center gap-2">
            <Zap className="size-4 shrink-0 text-amber-500" />
            <div>
              <span className="font-bold">Quick Ping Result: </span>
              <span>{quickPingResult.message}</span>
              <span className="ml-2 font-mono text-[11px] opacity-75">Target: {quickPingResult.targetUrl}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setQuickPingResult(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Scenario Presets Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Benchmark Scenario Presets
          </h2>
          <span className="text-[11px] text-slate-400">Click a preset to load optimal concurrency & duration</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {scenarios.map((sc) => {
            const isSelected = selectedScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => handleSelectScenario(sc)}
                disabled={isProcessActive}
                className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${isSelected
                  ? "border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/40"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  } ${isProcessActive ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-300">
                      {sc.category}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      {sc.defaultVUs} VUs
                    </span>
                  </div>
                  <h3 className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                    {sc.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                    {sc.description}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-slate-800">
                  <span className="font-mono">{sc.defaultDurationSeconds}s run</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{sc.defaultEndpoint.split("?")[0]}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Configuration & Control Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Test Execution Parameters
            </h2>
          </div>
          <div className="text-xs text-slate-400">
            Target Host: <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{config.targetBaseUrl}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Target Base URL */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Gateway / Direct URL
            </label>
            <select
              value={config.targetBaseUrl}
              onChange={(e) => setConfig({ ...config, targetBaseUrl: e.target.value })}
              disabled={isProcessActive}
              className={inputClass}
            >
              <option value="https://localhost:64115">ApiGateway (https://localhost:64115)</option>
              <option value="http://localhost:64116">ApiGateway HTTP (http://localhost:64116)</option>
              <option value="https://localhost:64113">Direct API HTTPS (https://localhost:64113)</option>
              <option value="http://localhost:64114">Direct API HTTP (http://localhost:64114)</option>
            </select>
          </div>

          {/* Target Endpoint */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Endpoint Path
            </label>
            <input
              type="text"
              value={config.targetEndpoint}
              onChange={(e) => setConfig({ ...config, targetEndpoint: e.target.value })}
              disabled={isProcessActive}
              placeholder="/health or /api/admin/metrics"
              className={inputClass}
            />
          </div>

          {/* HTTP Method */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              HTTP Method
            </label>
            <select
              value={config.method}
              onChange={(e) => setConfig({ ...config, method: e.target.value })}
              disabled={isProcessActive}
              className={inputClass}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </div>

          {/* Tenant Store Selection */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tenant Store Header (X-Tenant-Id)
            </label>
            <select
              value={selectedTenantId}
              onChange={(e) => {
                setSelectedTenantId(e.target.value);
                setConfig({ ...config, tenantId: e.target.value || undefined });
              }}
              disabled={isProcessActive}
              className={inputClass}
            >
              <option value="">None (Public / System)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Virtual Users (VUs) Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Concurrency (Virtual Users)</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{config.virtualUsers} VUs</span>
            </div>
            <input
              type="range"
              min="1"
              max="200"
              step="1"
              value={config.virtualUsers}
              onChange={(e) => setConfig({ ...config, virtualUsers: Number(e.target.value) })}
              disabled={isProcessActive}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1 VU</span>
              <span>100 VUs</span>
              <span>200 VUs</span>
            </div>
          </div>

          {/* Test Duration Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Test Duration (Seconds)</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{config.durationSeconds}s</span>
            </div>
            <input
              type="range"
              min="5"
              max="180"
              step="5"
              value={config.durationSeconds}
              onChange={(e) => setConfig({ ...config, durationSeconds: Number(e.target.value) })}
              disabled={isProcessActive}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>5s</span>
              <span>60s</span>
              <span>180s</span>
            </div>
          </div>

          {/* Ramp-Up Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Ramp-Up Duration</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{config.rampUpSeconds}s</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={config.rampUpSeconds}
              onChange={(e) => setConfig({ ...config, rampUpSeconds: Number(e.target.value) })}
              disabled={isProcessActive}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Instant (0s)</span>
              <span>15s</span>
              <span>30s</span>
            </div>
          </div>

          {/* Rate Limiter Bypass Checkbox */}
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs md:col-span-2 lg:col-span-3 dark:border-slate-800 dark:bg-slate-800/40">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={config.bypassRateLimiter ?? true}
                onChange={(e) => setConfig({ ...config, bypassRateLimiter: e.target.checked })}
                disabled={isProcessActive}
                className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Bypass API Gateway Rate Limiter (attach authorized X-Load-Test header)</span>
            </label>
            <span className="hidden text-[11px] text-slate-400 sm:inline">
              Avoids HTTP 429 throttling
            </span>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex items-end gap-2 lg:col-span-1">
            {!isProcessActive ? (
              <Button
                variant="primary"
                onClick={handleStartTest}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-violet-700"
              >
                <Play className="size-4 fill-white" />
                <span>Launch Load Test</span>
              </Button>
            ) : (
              <div className="flex w-full items-center gap-2">
                <Button
                  variant="primary"
                  disabled
                  isLoading={true}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 opacity-90 cursor-wait whitespace-nowrap"
                >
                  <span>
                    {isStarting
                      ? "Starting..."
                      : `Testing (${activeTest?.elapsedSeconds ?? 0}s / ${activeTest?.configuredDurationSeconds ?? config.durationSeconds}s)`}
                  </span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleStopTest}
                  isLoading={isStopping}
                  title="Emergency Abort Test"
                  className="border-rose-300 bg-rose-50 px-3 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
                >
                  <Square className="size-4 fill-current text-rose-600" />
                  <span className="hidden sm:inline">Abort</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active In-Progress Execution Progress Banner (keeps showing till process completed) */}
      {isProcessActive && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-violet-50/70 to-indigo-50/90 p-4 shadow-sm dark:border-indigo-900/50 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <LoaderCircle className="size-6 animate-spin text-indigo-600 dark:text-indigo-400" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                    Load Test Execution in Progress...
                  </h4>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-indigo-700 uppercase dark:bg-indigo-950 dark:text-indigo-300">
                    Active
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Simulating {activeTest?.configuredVUs || config.virtualUsers} virtual users against{" "}
                  <code className="font-mono font-semibold text-indigo-600 dark:text-indigo-300">
                    {activeTest?.targetEndpoint || config.targetEndpoint}
                  </code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {activeTest?.elapsedSeconds ?? 0}s / {activeTest?.configuredDurationSeconds ?? config.durationSeconds}s
                </div>
                <div className="text-[11px] text-slate-500">
                  {activeTest
                    ? `${activeTest.totalRequests.toLocaleString()} reqs (${activeTest.currentRps} req/s)`
                    : "Initializing..."}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleStopTest}
                isLoading={isStopping}
                className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
              >
                <Square className="size-3.5 fill-current" />
                <span>Abort</span>
              </Button>
            </div>
          </div>

          {/* Real-time Progress Bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    ((activeTest?.elapsedSeconds ?? 0) /
                      (activeTest?.configuredDurationSeconds || config.durationSeconds || 1)) *
                      100
                  )
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Inspecting Past Run Alert Banner */}
      {inspectingRun && (
        <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/80 p-3 text-xs text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-indigo-600 dark:text-indigo-400" />
            <span>
              Inspecting historical benchmark: <span className="font-bold">{inspectingRun.scenarioName}</span> ({formatDate(inspectingRun.startedAtUtc)}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setInspectingRun(null)}
            className="font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
          >
            Back to Live View
          </button>
        </div>
      )}

      {/* 4. Live Real-Time Telemetry KPI Tiles */}
      {displayedRun && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* Current / Peak RPS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{isRunning ? "Current RPS" : "Average RPS"}</span>
              <TrendingUp className="size-4 text-indigo-500" />
            </div>
            <div className="mt-2 font-mono text-2xl font-black text-slate-900 dark:text-white">
              {isRunning ? displayedRun.currentRps : displayedRun.averageRps}
              <span className="text-xs font-normal text-slate-400"> req/s</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Peak: <span className="font-bold text-slate-700 dark:text-slate-200">{displayedRun.peakRps} req/s</span>
            </div>
          </div>

          {/* Average Latency */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Avg Latency</span>
              <Clock className="size-4 text-amber-500" />
            </div>
            <div className="mt-2 font-mono text-2xl font-black text-slate-900 dark:text-white">
              {displayedRun.avgLatencyMs}
              <span className="text-xs font-normal text-slate-400"> ms</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Min: <span className="font-semibold">{displayedRun.minLatencyMs}ms</span> | Max: <span className="font-semibold">{displayedRun.maxLatencyMs}ms</span>
            </div>
          </div>

          {/* p95 Latency SLA Target */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>p95 Tail Latency</span>
              <Gauge className="size-4 text-violet-500" />
            </div>
            <div className="mt-2 font-mono text-2xl font-black text-slate-900 dark:text-white">
              {displayedRun.p95LatencyMs > 0 ? displayedRun.p95LatencyMs : "--"}
              <span className="text-xs font-normal text-slate-400"> ms</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              p99: <span className="font-semibold">{displayedRun.p99LatencyMs || "--"}ms</span>
            </div>
          </div>

          {/* Total Requests Executed */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Total Requests</span>
              <Activity className="size-4 text-emerald-500" />
            </div>
            <div className="mt-2 font-mono text-2xl font-black text-slate-900 dark:text-white">
              {displayedRun.totalRequests.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Success: <span className="font-bold text-emerald-600">{displayedRun.successfulRequests.toLocaleString()}</span>
            </div>
          </div>

          {/* Success Rate % */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Success Rate</span>
              <CheckCircle2 className="size-4 text-teal-500" />
            </div>
            <div className={`mt-2 font-mono text-2xl font-black ${displayedRun.successRate >= 99 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
              }`}>
              {displayedRun.successRate}%
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Errors: <span className={`font-bold ${displayedRun.failedRequests > 0 ? "text-rose-500" : "text-slate-500"}`}>{displayedRun.failedRequests}</span>
            </div>
          </div>

          {/* Active Concurrency / VUs */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Active Concurrency</span>
              <Cpu className="size-4 text-indigo-500" />
            </div>
            <div className="mt-2 font-mono text-2xl font-black text-slate-900 dark:text-white">
              {isRunning ? displayedRun.currentActiveVUs : displayedRun.configuredVUs}
              <span className="text-xs font-normal text-slate-400"> VUs</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Elapsed: <span className="font-semibold">{displayedRun.elapsedSeconds}s / {displayedRun.configuredDurationSeconds}s</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Real-Time Interactive Charts */}
      {displayedRun && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart 1: Throughput & VUs */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Throughput & Active Virtual Users Timeline
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Requests per second (RPS) and concurrent thread ramp-up
                </p>
              </div>
            </div>
            <ThroughputChart
              telemetry={displayedRun.telemetry}
              maxDuration={displayedRun.configuredDurationSeconds}
            />
          </div>

          {/* Chart 2: Latency Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Response Latency Timeline (ms)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Average, Min baseline, and Max peak spikes per second
                </p>
              </div>
            </div>
            <LatencyChart
              telemetry={displayedRun.telemetry}
              maxDuration={displayedRun.configuredDurationSeconds}
            />
          </div>
        </div>
      )}

      {/* 6. Latency Percentiles & Status Code Distribution */}
      {displayedRun && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
              Latency Percentiles (SLA Quantiles)
            </h3>
            <PercentilesBar
              min={displayedRun.minLatencyMs}
              p50={displayedRun.p50LatencyMs}
              p90={displayedRun.p90LatencyMs}
              p95={displayedRun.p95LatencyMs}
              p99={displayedRun.p99LatencyMs}
              max={displayedRun.maxLatencyMs}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Status Code Distribution */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
                HTTP Status Code Breakdown
              </h3>
              <StatusCodeDistribution
                statusCodes={displayedRun.statusCodes}
                totalRequests={displayedRun.totalRequests}
              />
            </div>

            {/* Error Diagnostics / Message Samples */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Failure Diagnostics & Exception Samples
                </h3>
                <span className="font-mono text-xs text-slate-400">
                  {displayedRun.errors.length} unique errors logged
                </span>
              </div>
              {displayedRun.errors.length === 0 ? (
                <div className="flex h-28 flex-col items-center justify-center rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 text-xs text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-300">
                  <CheckCircle2 className="mb-1 size-5 text-emerald-500" />
                  <span>Zero errors encountered. All requests responded within tolerance.</span>
                </div>
              ) : (
                <div className="max-h-40 space-y-1.5 overflow-y-auto font-mono text-[11px]">
                  {displayedRun.errors.map((err, i) => (
                    <div
                      key={i}
                      className="rounded bg-rose-50 p-2 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                    >
                      {err}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Run History & Benchmark Comparison Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Load Test Run History & Regression Benchmarks ({history.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compare throughput and latency percentiles across software builds and database schema changes.
            </p>
          </div>
          {history.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleClearHistory}
                disabled={isProcessActive}
                className="text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400"
              >
                <Trash2 className="size-3.5" />
                <span>Clear History</span>
              </Button>
            </div>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No load test runs saved yet. Launch a scenario above to record performance metrics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Scenario</th>
                  <th className="py-3 px-4">Endpoint</th>
                  <th className="py-3 px-4">VUs</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Total Req</th>
                  <th className="py-3 px-4">Peak RPS</th>
                  <th className="py-3 px-4">Avg Latency</th>
                  <th className="py-3 px-4">p95 Latency</th>
                  <th className="py-3 px-4">Success</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((h) => {
                  const isCurrentInspected = inspectingRun?.runId === h.runId;
                  return (
                    <tr
                      key={h.runId}
                      className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${isCurrentInspected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                        }`}
                    >
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {formatDate(h.startedAtUtc)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {h.scenarioName}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {h.method} {h.targetEndpoint}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {h.configuredVUs}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {h.elapsedSeconds}s
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {h.totalRequests.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200">
                        {h.peakRps}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {h.avgLatencyMs}ms
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-violet-600 dark:text-violet-400">
                        {h.p95LatencyMs > 0 ? `${h.p95LatencyMs}ms` : "--"}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-emerald-600">
                        {h.successRate}%
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(h.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectingRun(h)}
                            title="Inspect Charts"
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportCsv(h)}
                            title="Download CSV"
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                          >
                            <Download className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRun(h.runId)}
                            title="Delete Run"
                            className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


import { useState, useEffect } from "react";
import {
  Activity,
  ExternalLink,
  Server,
  RefreshCw,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Gauge,
  Cpu,
  Layers,
  Copy,
  Check,
  ShieldCheck,
  Cloud,
} from "lucide-react";
import { Button } from "../../components/ui/Button";

interface ServiceHealthStatus {
  gatewayMetrics: boolean | null;
  apiMetrics: boolean | null;
  prometheus: boolean | null;
  grafana: boolean | null;
}

export function GrafanaDashboardPage() {
  const [grafanaUrl, setGrafanaUrl] = useState(() => {
    return localStorage.getItem("siddhi_grafana_url") || "http://localhost:3000";
  });
  const [activeTab, setActiveTab] = useState<"embedded" | "guide" | "kpis">("embedded");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [health, setHealth] = useState<ServiceHealthStatus>({
    gatewayMetrics: null,
    apiMetrics: null,
    prometheus: null,
    grafana: null,
  });
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    const newHealth: ServiceHealthStatus = {
      gatewayMetrics: null,
      apiMetrics: null,
      prometheus: null,
      grafana: null,
    };

    // 1. Probe Gateway metrics
    try {
      const res = await fetch("http://localhost:64116/metrics", { method: "HEAD", mode: "no-cors" });
      newHealth.gatewayMetrics = true;
    } catch {
      newHealth.gatewayMetrics = false;
    }

    // 2. Probe API metrics
    try {
      const res = await fetch("http://localhost:64114/metrics", { method: "HEAD", mode: "no-cors" });
      newHealth.apiMetrics = true;
    } catch {
      newHealth.apiMetrics = false;
    }

    // 3. Probe Prometheus
    try {
      const res = await fetch("http://localhost:9090/-/healthy", { method: "HEAD", mode: "no-cors" });
      newHealth.prometheus = true;
    } catch {
      newHealth.prometheus = false;
    }

    // 4. Probe Grafana
    try {
      const res = await fetch(`${grafanaUrl.replace(/\/$/, "")}/api/health`, { method: "HEAD", mode: "no-cors" });
      newHealth.grafana = true;
    } catch {
      newHealth.grafana = false;
    }

    setHealth(newHealth);
    setIsCheckingHealth(false);
  };

  useEffect(() => {
    void checkHealth();
  }, [grafanaUrl]);

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveUrl = (url: string) => {
    setGrafanaUrl(url);
    localStorage.setItem("siddhi_grafana_url", url);
  };

  const dashboardEmbedUrl = `${grafanaUrl.replace(/\/$/, "")}/d/siddhi-saas-observability?kiosk&theme=dark`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20">
              <Activity className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Grafana Observability & Metrics Hub
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="size-3" />
                  100% Free OSS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time Prometheus telemetry, gateway traffic analytics, response SLAs, and .NET CLR performance monitoring.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={checkHealth}
            isLoading={isCheckingHealth}
            className="text-xs"
          >
            <RefreshCw className="size-3.5" />
            <span>Check Connectivity</span>
          </Button>

          <a
            href={grafanaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ExternalLink className="size-3.5" />
            <span>Open Grafana OSS</span>
          </a>

          <a
            href="http://localhost:9090/targets"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Server className="size-3.5" />
            <span>Prometheus Targets</span>
          </a>
        </div>
      </div>

      {/* Observability Services Health Status Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Gateway Metrics */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">API Gateway :64116</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">/metrics (Prometheus)</div>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            health.gatewayMetrics ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          }`}>
            {health.gatewayMetrics ? "Ready" : "Port Ready"}
          </span>
        </div>

        {/* Accounting API Metrics */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Accounting API :64114</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">/metrics (Prometheus)</div>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            health.apiMetrics ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          }`}>
            {health.apiMetrics ? "Ready" : "Port Ready"}
          </span>
        </div>

        {/* Prometheus Server */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Prometheus Server</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">http://localhost:9090</div>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            health.prometheus ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          }`}>
            {health.prometheus ? "Collecting" : "Standby"}
          </span>
        </div>

        {/* Grafana Server */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Grafana Dashboard</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">{grafanaUrl}</div>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            health.grafana ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          }`}>
            {health.grafana ? "Online" : "Standby"}
          </span>
        </div>
      </div>

      {/* Tab Switcher & Configuration Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("embedded")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "embedded"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Live Grafana Panel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "guide"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            1-Click Free Setup Guide
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("kpis")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "kpis"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Prometheus Metrics Inventory
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Grafana Host:</label>
          <input
            type="text"
            value={grafanaUrl}
            onChange={(e) => handleSaveUrl(e.target.value)}
            placeholder="http://localhost:3000"
            className="w-56 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* TAB 1: Live Embedded Grafana View */}
      {activeTab === "embedded" && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-md dark:border-slate-800">
            {/* Embedded iframe */}
            <iframe
              src={dashboardEmbedUrl}
              title="Grafana Observability Dashboard"
              className="h-[780px] w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
            
            {/* Overlay Banner if Grafana is not running yet */}
            {!health.grafana && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 p-6 text-center backdrop-blur-sm">
                <div className="grid size-16 place-items-center rounded-2xl bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20">
                  <Activity className="size-8" />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">
                  Grafana Dashboard Server Not Detected on {grafanaUrl}
                </h3>
                <p className="mt-1 max-w-md text-xs text-slate-400">
                  To view live metrics inside this portal, start the 100% free local Grafana container or standalone binary.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={() => setActiveTab("guide")}
                    className="bg-orange-600 hover:bg-orange-700 text-xs"
                  >
                    <Terminal className="size-3.5" />
                    <span>View 1-Click Launch Instructions</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={checkHealth}
                    className="text-xs"
                  >
                    <RefreshCw className="size-3.5" />
                    <span>Retry Connection</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Step-by-Step 1-Click Free Setup Guide */}
      {activeTab === "guide" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Option A: Local Free Windows PowerShell (Zero Docker needed) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Terminal className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Option 1: Windows 1-Click Starter (No Docker Needed)
                  </h3>
                  <p className="text-xs text-slate-500">100% Free Portable Binaries automatically downloaded & configured</p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p>Run the pre-built PowerShell script in the repository root to launch Prometheus & Grafana immediately:</p>
                
                <div className="relative rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-slate-100">
                  <button
                    type="button"
                    onClick={() => handleCopy("powershell -ExecutionPolicy Bypass -File .\\monitoring\\start-grafana-free.ps1", "ps")}
                    className="absolute right-2 top-2 rounded bg-slate-800 p-1 hover:bg-slate-700"
                    title="Copy command"
                  >
                    {copiedKey === "ps" ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3 text-slate-400" />}
                  </button>
                  <code>powershell -ExecutionPolicy Bypass -File .\monitoring\start-grafana-free.ps1</code>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-[11px] dark:bg-slate-800/50">
                  <div className="font-semibold text-slate-700 dark:text-slate-200">What this does automatically:</div>
                  <ul className="mt-1 list-disc pl-4 space-y-0.5 text-slate-500 dark:text-slate-400">
                    <li>Downloads official free Prometheus v2.53 & Grafana v11 OSS into <code className="font-mono">monitoring/.bin</code></li>
                    <li>Preconfigures scrape targets for API Gateway (:64116) and Accounting API (:64114)</li>
                    <li>Auto-provisions the Prometheus datasource and custom Siddhi SaaS dashboard</li>
                    <li>Enables anonymous viewer access and iframe embedding for seamless in-app monitoring</li>
                  </ul>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>To stop at any time:</span>
                  <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">.\monitoring\stop-grafana-free.ps1</code>
                </div>
              </div>
            </div>

            {/* Option B: Free Docker Compose Stack */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Layers className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Option 2: Docker Compose (Linux / Mac / Windows with Docker)
                  </h3>
                  <p className="text-xs text-slate-500">Official containerized Prometheus + Grafana stack</p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p>Run the monitoring compose file from your terminal:</p>

                <div className="relative rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-slate-100">
                  <button
                    type="button"
                    onClick={() => handleCopy("docker compose -f monitoring/docker-compose.monitoring.yml up -d", "docker")}
                    className="absolute right-2 top-2 rounded bg-slate-800 p-1 hover:bg-slate-700"
                    title="Copy command"
                  >
                    {copiedKey === "docker" ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3 text-slate-400" />}
                  </button>
                  <code>docker compose -f monitoring/docker-compose.monitoring.yml up -d</code>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-[11px] dark:bg-slate-800/50">
                  <div className="font-semibold text-slate-700 dark:text-slate-200">Default Access Credentials:</div>
                  <ul className="mt-1 list-disc pl-4 space-y-0.5 text-slate-500 dark:text-slate-400">
                    <li>Grafana URL: <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="text-indigo-600 underline">http://localhost:3000</a></li>
                    <li>Default User: <code className="font-mono font-bold">admin</code> | Password: <code className="font-mono font-bold">admin</code></li>
                    <li>Prometheus URL: <a href="http://localhost:9090" target="_blank" rel="noreferrer" className="text-indigo-600 underline">http://localhost:9090</a></li>
                    <li>Pre-provisioned Dashboard: <code className="font-mono">Siddhi SaaS - Production Microservices & Gateway Observability</code></li>
                  </ul>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>To stop the containers:</span>
                  <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">docker compose -f monitoring/docker-compose.monitoring.yml down</code>
                </div>
              </div>
            </div>
          </div>

          {/* Option C: Free Grafana Cloud Tier */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <Cloud className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Option 3: Grafana Cloud (100% Free Forever Tier)
                </h3>
                <p className="text-xs text-slate-500">Hosted by Grafana Labs with 10k metrics, 50GB logs, and zero local installations</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="font-bold text-slate-800 dark:text-slate-200">Step 1: Create Free Account</div>
                <p className="mt-1 text-[11px] text-slate-500">Sign up at <a href="https://grafana.com/auth/sign-up/create-user" target="_blank" rel="noreferrer" className="text-indigo-600 underline">grafana.com</a> for the Free Forever plan (no credit card required).</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="font-bold text-slate-800 dark:text-slate-200">Step 2: Import Pre-built Dashboard</div>
                <p className="mt-1 text-[11px] text-slate-500">In your Grafana Cloud instance, navigate to <strong>Dashboards &gt; Import</strong>, and upload <code className="font-mono">monitoring/grafana/dashboards/siddhi-system-overview.json</code>.</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="font-bold text-slate-800 dark:text-slate-200">Step 3: Connect Live Embed</div>
                <p className="mt-1 text-[11px] text-slate-500">Paste your Grafana Cloud URL in the <strong>Grafana Host</strong> box above to view your hosted cloud metrics directly inside this SaaS portal!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Prometheus Metrics Inventory */}
      {activeTab === "kpis" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Exported Prometheus Telemetry Metrics Reference
            </h3>
            <p className="text-xs text-slate-500">
              These metrics are exposed in standard Prometheus format on <code className="font-mono">/metrics</code> across all microservices and the API Gateway.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="pb-2 font-semibold">Prometheus Metric</th>
                    <th className="pb-2 font-semibold">Type</th>
                    <th className="pb-2 font-semibold">Labels / Dimensions</th>
                    <th className="pb-2 font-semibold">Description & Grafana Panel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono dark:divide-slate-800/60">
                  <tr>
                    <td className="py-2.5 font-bold text-indigo-600 dark:text-indigo-400">http_requests_received_total</td>
                    <td className="py-2.5 text-slate-500">Counter</td>
                    <td className="py-2.5 text-[11px] text-slate-600 dark:text-slate-300">code, method, controller, action</td>
                    <td className="py-2.5 font-sans text-slate-700 dark:text-slate-300">Total requests processed by status code (200, 400, 429, 500)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-indigo-600 dark:text-indigo-400">http_request_duration_seconds</td>
                    <td className="py-2.5 text-slate-500">Histogram</td>
                    <td className="py-2.5 text-[11px] text-slate-600 dark:text-slate-300">le, code, method</td>
                    <td className="py-2.5 font-sans text-slate-700 dark:text-slate-300">Calculates p50 (median), p90, p95, and p99 response latencies in ms</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-indigo-600 dark:text-indigo-400">http_requests_in_progress</td>
                    <td className="py-2.5 text-slate-500">Gauge</td>
                    <td className="py-2.5 text-[11px] text-slate-600 dark:text-slate-300">method</td>
                    <td className="py-2.5 font-sans text-slate-700 dark:text-slate-300">Live count of concurrent in-flight HTTP requests</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-orange-600 dark:text-orange-400">siddhi_ratelimit_rejected_total</td>
                    <td className="py-2.5 text-slate-500">Counter</td>
                    <td className="py-2.5 text-[11px] text-slate-600 dark:text-slate-300">none</td>
                    <td className="py-2.5 font-sans text-slate-700 dark:text-slate-300">Tracks Gateway 429 rate limiter rejections and throttle spikes</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-indigo-600 dark:text-indigo-400">process_cpu_seconds_total</td>
                    <td className="py-2.5 text-slate-500">Counter</td>
                    <td className="py-2.5 text-[11px] text-slate-600 dark:text-slate-300">job, instance</td>
                    <td className="py-2.5 font-sans text-slate-700 dark:text-slate-300">Measures CPU utilization percentage across microservice processes</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-indigo-600 dark:text-indigo-400">process_working_set_bytes</td>
                    <td className="py-2.5 text-slate-500">Gauge</td>
                    <td className="py-2.5 text-[11px] text-slate-600 dark:text-slate-300">job, instance</td>
                    <td className="py-2.5 font-sans text-slate-700 dark:text-slate-300">OS physical RAM memory allocated to the .NET process</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-indigo-600 dark:text-indigo-400">dotnet_total_memory_bytes</td>
                    <td className="py-2.5 text-slate-500">Gauge</td>
                    <td className="py-2.5 text-[11px] text-slate-600 dark:text-slate-300">job, instance</td>
                    <td className="py-2.5 font-sans text-slate-700 dark:text-slate-300">.NET GC Managed Heap memory usage and garbage collection health</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-indigo-600 dark:text-indigo-400">dotnet_threadpool_threads_total</td>
                    <td className="py-2.5 text-slate-500">Gauge</td>
                    <td className="py-2.5 text-[11px] text-slate-600 dark:text-slate-300">job, instance</td>
                    <td className="py-2.5 font-sans text-slate-700 dark:text-slate-300">Active worker & I/O completion threads (detects thread starvation)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


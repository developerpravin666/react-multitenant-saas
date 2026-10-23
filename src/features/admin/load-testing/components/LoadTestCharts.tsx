import { useState } from "react";
import type { LoadTestTelemetryPoint } from "../loadTesting.types";

interface ThroughputChartProps {
  telemetry: LoadTestTelemetryPoint[];
  maxDuration: number;
}

export function ThroughputChart({ telemetry, maxDuration }: ThroughputChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!telemetry || telemetry.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
        Waiting for test telemetry samples...
      </div>
    );
  }

  const width = 680;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxSec = Math.max(maxDuration, telemetry[telemetry.length - 1]?.second || 1, 10);
  const maxRps = Math.max(...telemetry.map(t => t.requestsInSecond), 10);
  const maxVu = Math.max(...telemetry.map(t => t.activeVirtualUsers), 5);

  const getX = (second: number) => padding.left + (second / maxSec) * chartW;
  const getYRps = (rps: number) => padding.top + chartH - (rps / (maxRps * 1.15)) * chartH;
  const getYVu = (vu: number) => padding.top + chartH - (vu / (maxVu * 1.15)) * chartH;

  const rpsPoints = telemetry.map(t => `${getX(t.second)},${getYRps(t.requestsInSecond)}`).join(" ");
  const vuPoints = telemetry.map(t => `${getX(t.second)},${getYVu(t.activeVirtualUsers)}`).join(" ");

  const areaPoints = [
    `${getX(telemetry[0]?.second || 0)},${padding.top + chartH}`,
    ...telemetry.map(t => `${getX(t.second)},${getYRps(t.requestsInSecond)}`),
    `${getX(telemetry[telemetry.length - 1]?.second || 0)},${padding.top + chartH}`
  ].join(" ");

  const hoveredPoint = hoverIndex !== null && telemetry[hoverIndex] ? telemetry[hoverIndex] : null;

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
            <span className="size-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            <span>Requests / Sec (RPS)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span>Active Virtual Users (VUs)</span>
          </div>
        </div>
        {hoveredPoint && (
          <div className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white shadow dark:bg-slate-800">
            {hoveredPoint.second}s: {hoveredPoint.requestsInSecond} RPS | {hoveredPoint.activeVirtualUsers} VUs | {hoveredPoint.avgLatencyMs}ms
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full select-none overflow-visible rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950"
      >
        <defs>
          <linearGradient id="rpsAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padding.top + chartH * (1 - pct);
          const rpsVal = Math.round(maxRps * 1.15 * pct);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-medium"
              >
                {rpsVal}
              </text>
            </g>
          );
        })}

        {/* Time labels on X axis */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const sec = Math.round(maxSec * pct);
          const x = padding.left + chartW * pct;
          return (
            <text
              key={i}
              x={x}
              y={height - 10}
              textAnchor="middle"
              className="fill-slate-400 text-[10px] font-medium"
            >
              {sec}s
            </text>
          );
        })}

        {/* RPS Area */}
        <polygon points={areaPoints} fill="url(#rpsAreaGradient)" />

        {/* VUs line */}
        <polyline
          points={vuPoints}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* RPS line */}
        <polyline
          points={rpsPoints}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive hover overlay */}
        {telemetry.map((pt, idx) => {
          const x = getX(pt.second);
          return (
            <g key={idx}>
              <rect
                x={x - (chartW / maxSec) / 2}
                y={padding.top}
                width={Math.max(4, chartW / maxSec)}
                height={chartH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              />
              {hoverIndex === idx && (
                <>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + chartH}
                    stroke="#6366f1"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <circle cx={x} cy={getYRps(pt.requestsInSecond)} r="4" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
                  <circle cx={x} cy={getYVu(pt.activeVirtualUsers)} r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface LatencyChartProps {
  telemetry: LoadTestTelemetryPoint[];
  maxDuration: number;
}

export function LatencyChart({ telemetry, maxDuration }: LatencyChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!telemetry || telemetry.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
        Waiting for latency samples...
      </div>
    );
  }

  const width = 680;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxSec = Math.max(maxDuration, telemetry[telemetry.length - 1]?.second || 1, 10);
  const maxLat = Math.max(...telemetry.map(t => t.maxLatencyMs), 20);

  const getX = (second: number) => padding.left + (second / maxSec) * chartW;
  const getY = (lat: number) => padding.top + chartH - (lat / (maxLat * 1.15)) * chartH;

  const avgPoints = telemetry.map(t => `${getX(t.second)},${getY(t.avgLatencyMs)}`).join(" ");
  const maxPoints = telemetry.map(t => `${getX(t.second)},${getY(t.maxLatencyMs)}`).join(" ");
  const minPoints = telemetry.map(t => `${getX(t.second)},${getY(t.minLatencyMs)}`).join(" ");

  const areaPoints = [
    `${getX(telemetry[0]?.second || 0)},${padding.top + chartH}`,
    ...telemetry.map(t => `${getX(t.second)},${getY(t.avgLatencyMs)}`),
    `${getX(telemetry[telemetry.length - 1]?.second || 0)},${padding.top + chartH}`
  ].join(" ");

  const hoveredPoint = hoverIndex !== null && telemetry[hoverIndex] ? telemetry[hoverIndex] : null;

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
            <span className="size-2.5 rounded-full bg-amber-500" />
            <span>Avg Latency (ms)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-rose-500">
            <span className="size-2.5 rounded-full bg-rose-500" />
            <span>Max Peak</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-teal-600 dark:text-teal-400">
            <span className="size-2.5 rounded-full bg-teal-500" />
            <span>Min Baseline</span>
          </div>
        </div>
        {hoveredPoint && (
          <div className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white shadow dark:bg-slate-800">
            {hoveredPoint.second}s: Avg {hoveredPoint.avgLatencyMs}ms (Min {hoveredPoint.minLatencyMs}ms / Max {hoveredPoint.maxLatencyMs}ms)
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full select-none overflow-visible rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950"
      >
        <defs>
          <linearGradient id="latencyAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padding.top + chartH * (1 - pct);
          const latVal = Math.round(maxLat * 1.15 * pct);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-medium"
              >
                {latVal}ms
              </text>
            </g>
          );
        })}

        {/* Time labels on X axis */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const sec = Math.round(maxSec * pct);
          const x = padding.left + chartW * pct;
          return (
            <text
              key={i}
              x={x}
              y={height - 10}
              textAnchor="middle"
              className="fill-slate-400 text-[10px] font-medium"
            >
              {sec}s
            </text>
          );
        })}

        {/* Avg Latency Area */}
        <polygon points={areaPoints} fill="url(#latencyAreaGradient)" />

        {/* Max line */}
        <polyline
          points={maxPoints}
          fill="none"
          stroke="#f43f5e"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Min line */}
        <polyline
          points={minPoints}
          fill="none"
          stroke="#14b8a6"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Avg line */}
        <polyline
          points={avgPoints}
          fill="none"
          stroke="#d97706"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive hover overlay */}
        {telemetry.map((pt, idx) => {
          const x = getX(pt.second);
          return (
            <g key={idx}>
              <rect
                x={x - (chartW / maxSec) / 2}
                y={padding.top}
                width={Math.max(4, chartW / maxSec)}
                height={chartH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              />
              {hoverIndex === idx && (
                <>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + chartH}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <circle cx={x} cy={getY(pt.avgLatencyMs)} r="4" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface PercentilesBarProps {
  min: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
}

export function PercentilesBar({ min, p50, p90, p95, p99, max }: PercentilesBarProps) {
  const items = [
    { label: "Min Latency", val: min, desc: "Fastest response captured" },
    { label: "p50 (Median)", val: p50, desc: "50% of requests completed faster" },
    { label: "p90", val: p90, desc: "90% of requests completed faster" },
    { label: "p95", val: p95, desc: "95% of requests completed faster (SLA target)" },
    { label: "p99", val: p99, desc: "Tail latency (99th percentile)" },
    { label: "Max Peak", val: max, desc: "Worst-case response time" },
  ];

  const maxVal = Math.max(max, 10);

  const getStatusColor = (ms: number) => {
    if (ms <= 100) return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/50 dark:border-emerald-900";
    if (ms <= 300) return "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/50 dark:border-amber-900";
    if (ms <= 600) return "text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/50 dark:border-orange-900";
    return "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/50 dark:border-rose-900";
  };

  const getBarColor = (ms: number) => {
    if (ms <= 100) return "bg-emerald-500";
    if (ms <= 300) return "bg-amber-500";
    if (ms <= 600) return "bg-orange-500";
    return "bg-rose-500";
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {items.map((it, idx) => {
        const pct = Math.min(100, Math.max(8, (it.val / maxVal) * 100));
        return (
          <div
            key={idx}
            className={`rounded-xl border p-3 transition-all ${getStatusColor(it.val)}`}
          >
            <div className="text-[11px] font-semibold tracking-wider uppercase opacity-80">
              {it.label}
            </div>
            <div className="mt-1 font-mono text-xl font-bold">
              {it.val > 0 ? `${it.val} ms` : "--"}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-700/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBarColor(it.val)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 text-[10px] opacity-75">
              {it.desc}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface StatusCodeDistributionProps {
  statusCodes: Record<string, number>;
  totalRequests: number;
}

export function StatusCodeDistribution({ statusCodes, totalRequests }: StatusCodeDistributionProps) {
  const codes = Object.entries(statusCodes).map(([code, count]) => ({
    code: Number(code),
    count,
    pct: totalRequests > 0 ? ((count / totalRequests) * 100).toFixed(1) : "0",
  })).sort((a, b) => a.code - b.code);

  const getCodeBadge = (code: number) => {
    if (code >= 200 && code < 300) return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
    if (code >= 300 && code < 400) return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
    if (code >= 400 && code < 500) return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
    if (code >= 500) return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
    return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  };

  const getCodeLabel = (code: number) => {
    if (code === 200) return "200 OK";
    if (code === 201) return "201 Created";
    if (code === 204) return "204 No Content";
    if (code === 400) return "400 Bad Request";
    if (code === 401) return "401 Unauthorized";
    if (code === 403) return "403 Forbidden";
    if (code === 404) return "404 Not Found";
    if (code === 409) return "409 Conflict";
    if (code === 429) return "429 Rate Limited";
    if (code === 500) return "500 Internal Error";
    if (code === 502) return "502 Bad Gateway";
    if (code === 503) return "503 Unavailable";
    if (code === 0) return "Timeout / Connection Failed";
    return `HTTP ${code}`;
  };

  if (codes.length === 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-800">
        No status code samples yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {codes.map(c => (
        <div key={c.code} className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold ${getCodeBadge(c.code)}`}>
              {c.code === 0 ? "TIMEOUT" : c.code}
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {getCodeLabel(c.code)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {c.count.toLocaleString()} ({c.pct}%)
            </span>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${c.code >= 200 && c.code < 300 ? "bg-emerald-500" : c.code >= 400 && c.code < 500 ? "bg-amber-500" : "bg-rose-500"}`}
                style={{ width: `${c.pct}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


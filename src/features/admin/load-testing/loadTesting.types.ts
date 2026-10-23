export type LoadTestStatus = "Idle" | "Running" | "Completed" | "Aborted" | "Failed";

export interface LoadTestScenario {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultEndpoint: string;
  method: string;
  defaultVUs: number;
  defaultDurationSeconds: number;
  defaultRampUpSeconds: number;
  requiresAuth: boolean;
  requiresTenant: boolean;
}

export interface LoadTestTelemetryPoint {
  timestampUtc: string;
  second: number;
  activeVirtualUsers: number;
  requestsInSecond: number;
  successInSecond: number;
  errorsInSecond: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  cpuPercentage: number;
  memoryMb: number;
}

export interface LoadTestRunSummary {
  runId: string;
  scenarioName: string;
  targetEndpoint: string;
  targetBaseUrl: string;
  method: string;
  status: LoadTestStatus;
  startedAtUtc: string;
  completedAtUtc?: string | null;
  configuredDurationSeconds: number;
  elapsedSeconds: number;
  configuredVUs: number;
  currentActiveVUs: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  currentRps: number;
  averageRps: number;
  peakRps: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p50LatencyMs: number;
  p90LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  totalBytesReceived: number;
  statusCodes: Record<string, number>;
  errors: string[];
  telemetry: LoadTestTelemetryPoint[];
}

export interface LoadTestConfig {
  name: string;
  scenarioId: string;
  targetEndpoint: string;
  targetBaseUrl: string;
  method: string;
  virtualUsers: number;
  durationSeconds: number;
  rampUpSeconds: number;
  tenantId?: string;
  authToken?: string;
  customHeaders?: Record<string, string>;
  requestBody?: string;
  bypassRateLimiter?: boolean;
}

export interface QuickPingResult {
  success: boolean;
  statusCode: number;
  latencyMs: number;
  message: string;
  targetUrl: string;
}


export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]> | null;
  metadata?: Record<string, string> | null;
}

export interface PagedData<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ApiRequestConfig extends RequestInit {
  /** Set false for endpoints such as sign-in that do not accept a bearer token. */
  authenticate?: boolean;
  /** Prevent auth refresh requests and their retries from entering the refresh flow. */
  skipAuthRefresh?: boolean;
}

type RequestInterceptor = (
  url: string,
  config: ApiRequestConfig,
) => Promise<ApiRequestConfig> | ApiRequestConfig;
type ResponseInterceptor = (response: Response) => Promise<Response> | Response;
type UnauthorizedHandler = () => Promise<boolean>;
type LoadingListener = (isLoading: boolean) => void;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];
const loadingListeners = new Set<LoadingListener>();
let unauthorizedHandler: UnauthorizedHandler | undefined;
let activeRequests = 0;

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(
  /\/$/,
  "",
);

function notifyLoading() {
  loadingListeners.forEach((listener) => listener(activeRequests > 0));
}

function toUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;

  let normalized = path.startsWith("/") ? path : `/${path}`;

  // Prevent double /api/api prefix if baseUrl ends with /api
  if (baseUrl.endsWith("/api") && normalized.startsWith("/api/")) {
    normalized = normalized.substring(4);
  } else if (!baseUrl.endsWith("/api") && !normalized.startsWith("/api/")) {
    normalized = `/api${normalized}`;
  }

  return `${baseUrl}${normalized}`;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (!contentType.includes("json")) return text;
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readablePropertyName(property: string) {
  const productMatch = property.match(/Products\[(\d+)\]\.([\w]+)/i);
  const name = productMatch?.[2] ?? property;
  const labels: Record<string, string> = {
    SerialNumber: "Serial Number",
    SerialNumber1: "Serial Number 1",
    VendorId: "Vendor",
    BrandId: "Brand",
    ProductTypeId: "Product Type",
    ProductModelId: "Model",
    VariantId: "Variant",
    ColorId: "Color",
    Quantity: "Quantity",
    PurchasePrice: "Purchase Price",
  };
  const label = labels[name] ?? name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return productMatch ? `Unit ${Number(productMatch[1]) + 1} · ${label}` : label;
}

function getErrorMessage(body: unknown, status: number) {
  if (isRecord(body)) {
    const errors = body.errors;
    if (isRecord(errors)) {
      const messages = Object.entries(errors).flatMap(([property, value]) => {
        const values = Array.isArray(value) ? value : [value];
        return values
          .filter((message): message is string => typeof message === "string" && Boolean(message.trim()))
          .map((message) => `${readablePropertyName(property)}: ${message}`);
      });
      if (messages.length) return messages.join("\n");
    }

    for (const key of ["detail", "message", "title"]) {
      const value = body[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  if (typeof body === "string" && body.trim()) return body;
  return `Request failed (${status}). Please try again.`;
}

function unwrapApiResponse<T>(body: unknown, status: number): T {
  if (!isRecord(body) || typeof body.success !== "boolean" || typeof body.message !== "string" || !("data" in body))
    return body as T;

  if (!body.success)
    throw new ApiError(getErrorMessage(body, status), status, body);
  return body.data as T;
}

/** Add a request interceptor. Return the unsubscribe function when it is no longer needed. */
export function addRequestInterceptor(interceptor: RequestInterceptor) {
  requestInterceptors.push(interceptor);
  return () => {
    requestInterceptors.splice(requestInterceptors.indexOf(interceptor), 1);
  };
}

/** Add a response interceptor. It runs before non-2xx responses are converted to ApiError. */
export function addResponseInterceptor(interceptor: ResponseInterceptor) {
  responseInterceptors.push(interceptor);
  return () => {
    responseInterceptors.splice(responseInterceptors.indexOf(interceptor), 1);
  };
}

export function setUnauthorizedHandler(handler?: UnauthorizedHandler) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = undefined;
  };
}

export function subscribeToApiLoading(listener: LoadingListener) {
  loadingListeners.add(listener);
  listener(activeRequests > 0);
  return () => {
    loadingListeners.delete(listener);
  };
}

// Default authentication interceptor. Replace the storage key here if your login API uses another one.
addRequestInterceptor((_, config) => {
  if (config.authenticate === false) return config;
  const token = localStorage.getItem("auth_token");
  if (!token) return config;
  const headers = new Headers(config.headers);
  if (!headers.has("X-Tenant-ID")) {
    const tenantId = localStorage.getItem("tenant_id");
    if (tenantId && tenantId !== "00000000-0000-0000-0000-000000000000" && tenantId !== "system") {
      headers.set("X-Tenant-ID", tenantId);
    }
  }
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return { ...config, headers };
});

// A central place to respond to expired credentials. It deliberately does not redirect;
// the application can register a response interceptor for its login route.
addResponseInterceptor((response) => response);

async function request<T>(
  path: string,
  config: ApiRequestConfig = {},
): Promise<T> {
  const headers = new Headers(config.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  let retryStorageKey: string | undefined;
  const moneyRequest = config.method === "POST" && (path.startsWith("/sales/invoices") || path.startsWith("/inventory/skus") || path.includes("/payments") || path.includes("/receipts") || path.includes("/refunds") || path.includes("/settlements"));
  if (moneyRequest && !headers.has("Idempotency-Key")) {
    const fingerprint = new TextEncoder().encode(`${localStorage.getItem("tenant_id")}:${localStorage.getItem("auth_user_id")}:${path}:${String(config.body ?? "")}`);
    const digest = await crypto.subtle.digest("SHA-256", fingerprint);
    retryStorageKey = "money-retry:" + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    const token = sessionStorage.getItem(retryStorageKey) ?? crypto.randomUUID();
    sessionStorage.setItem(retryStorageKey, token);
    headers.set("Idempotency-Key", token);
  }
  let finalConfig: ApiRequestConfig = { ...config, headers };

  for (const interceptor of requestInterceptors)
    finalConfig = await interceptor(toUrl(path), finalConfig);

  activeRequests += 1;
  notifyLoading();
  try {
    let response = await fetch(toUrl(path), finalConfig);
    if (
      response.status === 401 &&
      finalConfig.authenticate !== false &&
      !finalConfig.skipAuthRefresh &&
      unauthorizedHandler
    ) {
      if (await unauthorizedHandler()) {
        const retryConfig = { ...config, headers: new Headers(headers) };
        for (const interceptor of requestInterceptors)
          finalConfig = await interceptor(toUrl(path), retryConfig);
        response = await fetch(toUrl(path), finalConfig);
      }
    }
    for (const interceptor of responseInterceptors)
      response = await interceptor(response);
    const body = await parseBody(response);
    if (!response.ok) {
      throw new ApiError(getErrorMessage(body, response.status), response.status, body);
    }
    const result = unwrapApiResponse<T>(body, response.status);
    if (retryStorageKey) sessionStorage.removeItem(retryStorageKey);
    return result;
  } finally {
    activeRequests -= 1;
    notifyLoading();
  }
}

function withJsonBody(
  body: unknown,
  config: ApiRequestConfig,
): ApiRequestConfig {
  const headers = new Headers(config.headers);
  headers.set("Content-Type", "application/json");
  return { ...config, headers, body: JSON.stringify(body) };
}

export const apiClient = {
  get: <T>(path: string, config?: ApiRequestConfig) =>
    request<T>(path, { ...config, method: "GET" }),
  post: <T>(path: string, body: unknown, config: ApiRequestConfig = {}) =>
    request<T>(path, withJsonBody(body, { ...config, method: "POST" })),
  put: <T>(path: string, body: unknown, config: ApiRequestConfig = {}) =>
    request<T>(path, withJsonBody(body, { ...config, method: "PUT" })),
  patch: <T>(path: string, body: unknown, config: ApiRequestConfig = {}) =>
    request<T>(path, withJsonBody(body, { ...config, method: "PATCH" })),
  delete: <T>(path: string, config?: ApiRequestConfig) =>
    request<T>(path, { ...config, method: "DELETE" }),
  download: async (
    path: string,
    defaultFileName: string,
    config: ApiRequestConfig = {},
  ): Promise<void> => {
    const headers = new Headers(config.headers);
    let finalConfig: ApiRequestConfig = { ...config, headers, method: "GET" };

    for (const interceptor of requestInterceptors)
      finalConfig = await interceptor(toUrl(path), finalConfig);

    activeRequests += 1;
    notifyLoading();
    try {
      let response = await fetch(toUrl(path), finalConfig);
      if (
        response.status === 401 &&
        finalConfig.authenticate !== false &&
        !finalConfig.skipAuthRefresh &&
        unauthorizedHandler
      ) {
        if (await unauthorizedHandler()) {
          const retryConfig = { ...config, headers: new Headers(headers), method: "GET" };
          for (const interceptor of requestInterceptors)
            finalConfig = await interceptor(toUrl(path), retryConfig);
          response = await fetch(toUrl(path), finalConfig);
        }
      }

      if (!response.ok) {
        const body = await parseBody(response);
        throw new ApiError(getErrorMessage(body, response.status), response.status, body);
      }

      const blob = await response.blob();
      if (defaultFileName.toLowerCase().endsWith(".xlsx")) {
        const signature = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("json") || contentType.includes("text/html")
          || signature.length !== 4 || signature[0] !== 0x50 || signature[1] !== 0x4b
          || signature[2] !== 0x03 || signature[3] !== 0x04) {
          throw new ApiError(
            "The server did not return a valid Excel workbook. Please restart the updated AccountingInventory API and try again. If the issue continues, check the download response in the browser Network tab.",
            response.status,
            { contentType },
          );
        }
      }
      let fileName = defaultFileName;
      const contentDisposition = response.headers.get("content-disposition");
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          fileName = match[1].replace(/['"]/g, "").trim();
        }
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 5000);
    } finally {
      activeRequests -= 1;
      notifyLoading();
    }
  },
};

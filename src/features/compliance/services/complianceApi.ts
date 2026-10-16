import { apiClient } from "../../../services/apiClient";
import type {
  EWayBillDto,
  EInvoiceDto,
  GenerateEWayBillRequest,
  GenerateEInvoiceRequest,
  CancelComplianceRequest,
  PagedResult,
} from "../types/compliance.types";

export const complianceApi = {
  // --- E-Way Bills ---
  async getEWayBills(params?: {
    page?: number;
    pageSize?: number;
    fromDate?: string;
    toDate?: string;
    status?: string;
    search?: string;
  }): Promise<PagedResult<EWayBillDto>> {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.pageSize) q.append("pageSize", params.pageSize.toString());
    if (params?.fromDate) q.append("fromDate", params.fromDate);
    if (params?.toDate) q.append("toDate", params.toDate);
    if (params?.status) q.append("status", params.status);
    if (params?.search) q.append("search", params.search);

    const qs = q.toString();
    return apiClient.get<PagedResult<EWayBillDto>>(`/compliance/eway-bill${qs ? `?${qs}` : ""}`);
  },

  async getEWayBillByInvoiceId(invoiceId: string): Promise<EWayBillDto | null> {
    try {
      return await apiClient.get<EWayBillDto>(`/compliance/eway-bill/invoice/${encodeURIComponent(invoiceId)}`);
    } catch {
      return null;
    }
  },

  async generateEWayBill(data: GenerateEWayBillRequest): Promise<{ id: string }> {
    return apiClient.post<{ id: string }>("/compliance/eway-bill/generate", data);
  },

  async cancelEWayBill(id: string, reason: string): Promise<void> {
    return apiClient.post<void>(`/compliance/eway-bill/${encodeURIComponent(id)}/cancel`, {
      reason,
    } as CancelComplianceRequest);
  },

  async getEWayBillJson(id: string): Promise<string> {
    return apiClient.get<string>(`/compliance/eway-bill/${encodeURIComponent(id)}/json`);
  },

  // --- E-Invoicing ---
  async getEInvoices(params?: {
    page?: number;
    pageSize?: number;
    fromDate?: string;
    toDate?: string;
    status?: string;
    search?: string;
  }): Promise<PagedResult<EInvoiceDto>> {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.pageSize) q.append("pageSize", params.pageSize.toString());
    if (params?.fromDate) q.append("fromDate", params.fromDate);
    if (params?.toDate) q.append("toDate", params.toDate);
    if (params?.status) q.append("status", params.status);
    if (params?.search) q.append("search", params.search);

    const qs = q.toString();
    return apiClient.get<PagedResult<EInvoiceDto>>(`/compliance/e-invoice${qs ? `?${qs}` : ""}`);
  },

  async getEInvoiceByInvoiceId(invoiceId: string): Promise<EInvoiceDto | null> {
    try {
      return await apiClient.get<EInvoiceDto>(`/compliance/e-invoice/invoice/${encodeURIComponent(invoiceId)}`);
    } catch {
      return null;
    }
  },

  async generateEInvoice(data: GenerateEInvoiceRequest): Promise<{ id: string }> {
    return apiClient.post<{ id: string }>("/compliance/e-invoice/generate", data);
  },

  async cancelEInvoice(id: string, reason: string): Promise<void> {
    return apiClient.post<void>(`/compliance/e-invoice/${encodeURIComponent(id)}/cancel`, {
      reason,
    } as CancelComplianceRequest);
  },

  async getEInvoiceJson(id: string): Promise<string> {
    return apiClient.get<string>(`/compliance/e-invoice/${encodeURIComponent(id)}/json`);
  },
};

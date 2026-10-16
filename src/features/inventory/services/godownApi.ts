import { apiClient } from "../../../services/apiClient";
import type {
  GodownDto,
  CreateGodownRequest,
  UpdateGodownRequest,
  GodownStockItemDto,
  StockTransferSummaryDto,
  StockTransferDetailDto,
  CreateStockTransferRequest,
  PhysicalStockAuditSummaryDto,
  StockAdjustmentDto,
  CreateStockAdjustmentRequest,
} from "../types/godown.types";

export const godownApi = {
  getGodowns: async (): Promise<GodownDto[]> => {
    return await apiClient.get<GodownDto[]>("/inventory/godowns");
  },

  createGodown: async (payload: CreateGodownRequest): Promise<{ id: string }> => {
    return await apiClient.post<{ id: string }>("/inventory/godowns", payload);
  },

  updateGodown: async (id: string, payload: UpdateGodownRequest): Promise<void> => {
    await apiClient.put(`/inventory/godowns/${id}`, payload);
  },

  getGodownStock: async (godownId: string): Promise<GodownStockItemDto[]> => {
    return await apiClient.get<GodownStockItemDto[]>(`/inventory/godowns/${godownId}/stock`);
  },

  getStockTransfers: async (params?: {
    godownId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<StockTransferSummaryDto[]> => {
    const searchParams = new URLSearchParams();
    if (params?.godownId) searchParams.set("godownId", params.godownId);
    if (params?.fromDate) searchParams.set("fromDate", params.fromDate);
    if (params?.toDate) searchParams.set("toDate", params.toDate);
    const query = searchParams.toString();
    return await apiClient.get<StockTransferSummaryDto[]>(
      `/inventory/transfers${query ? `?${query}` : ""}`
    );
  },

  getStockTransferById: async (id: string): Promise<StockTransferDetailDto> => {
    return await apiClient.get<StockTransferDetailDto>(`/inventory/transfers/${id}`);
  },

  createStockTransfer: async (payload: CreateStockTransferRequest): Promise<{ id: string }> => {
    return await apiClient.post<{ id: string }>("/inventory/transfers", payload);
  },

  getPhysicalStockAudit: async (godownId: string): Promise<PhysicalStockAuditSummaryDto> => {
    return await apiClient.get<PhysicalStockAuditSummaryDto>(`/inventory/audit?godownId=${godownId}`);
  },

  getStockAdjustments: async (params?: {
    godownId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<StockAdjustmentDto[]> => {
    const searchParams = new URLSearchParams();
    if (params?.godownId) searchParams.set("godownId", params.godownId);
    if (params?.fromDate) searchParams.set("fromDate", params.fromDate);
    if (params?.toDate) searchParams.set("toDate", params.toDate);
    const query = searchParams.toString();
    return await apiClient.get<StockAdjustmentDto[]>(
      `/inventory/adjustments${query ? `?${query}` : ""}`
    );
  },

  createStockAdjustment: async (payload: CreateStockAdjustmentRequest): Promise<{ id: string }> => {
    return await apiClient.post<{ id: string }>("/inventory/adjustments", payload);
  },
};


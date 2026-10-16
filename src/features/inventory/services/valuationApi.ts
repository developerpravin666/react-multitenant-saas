import { apiClient } from "../../../services/apiClient";
import type {
  UnitOfMeasureDto,
  CreateUnitOfMeasureRequest,
  StockValuationSummaryDto,
  TradingProfitLossValuationDto,
} from "../types/valuation.types";

export const valuationApi = {
  getUnitOfMeasures: async (activeOnly?: boolean): Promise<UnitOfMeasureDto[]> => {
    const query = activeOnly ? "?activeOnly=true" : "";
    return await apiClient.get<UnitOfMeasureDto[]>(`/inventory/uom${query}`);
  },

  createUnitOfMeasure: async (payload: CreateUnitOfMeasureRequest): Promise<{ id: string }> => {
    return await apiClient.post<{ id: string }>("/inventory/uom", payload);
  },

  getStockValuationSummary: async (params?: {
    method?: string;
    asOfDate?: string;
    godownId?: string;
    search?: string;
  }): Promise<StockValuationSummaryDto> => {
    const searchParams = new URLSearchParams();
    if (params?.method) searchParams.set("method", params.method);
    if (params?.asOfDate) searchParams.set("asOfDate", params.asOfDate);
    if (params?.godownId) searchParams.set("godownId", params.godownId);
    if (params?.search) searchParams.set("search", params.search);
    const query = searchParams.toString();
    return await apiClient.get<StockValuationSummaryDto>(
      `/inventory/valuation/summary${query ? `?${query}` : ""}`
    );
  },

  getTradingProfitLossValuation: async (params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<TradingProfitLossValuationDto> => {
    const searchParams = new URLSearchParams();
    if (params?.fromDate) searchParams.set("fromDate", params.fromDate);
    if (params?.toDate) searchParams.set("toDate", params.toDate);
    const query = searchParams.toString();
    return await apiClient.get<TradingProfitLossValuationDto>(
      `/inventory/valuation/trading-cogs${query ? `?${query}` : ""}`
    );
  },
};


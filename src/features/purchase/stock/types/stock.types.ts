import type { ResourceRecord } from "../../../shared/resourceApi";

export interface StockTotalsSummary {
  totalQuantity: number;
  totalCostWithoutGst: number;
  totalGstAmount: number;
  totalCostWithGst: number;
}

export interface StockGroup {
  brandId: string;
  productModelId: string;
  variantId: string;
  brandName: string;
  modelName: string;
  variantName: string;
  totalQuantity: number;
  totalProductCostWithoutGst: number;
  totalGstAmount: number;
  totalProductCostWithGst: number;
  gstRate: number;
  unitCostWithoutGst: number;
  unitCostWithGst: number;
  totalProductCost: number;
}

export interface AvailableStockProduct extends ResourceRecord {
  serialNumber: string;
  serialNumber1?: string | null;
  colorName: string;
  costWithoutGst: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

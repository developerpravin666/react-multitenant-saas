import type { ResourceRecord } from "../../../shared/resourceApi";

export interface StockGroup {
  brandId: string;
  productModelId: string;
  variantId: string;
  brandName: string;
  modelName: string;
  variantName: string;
  totalProductCost: number;
  totalQuantity: number;
}

export interface AvailableStockProduct extends ResourceRecord {
  serialNumber: string;
  serialNumber1?: string | null;
  colorName: string;
  totalAmount: number;
}

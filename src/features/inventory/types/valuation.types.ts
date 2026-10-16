export interface UnitOfMeasureDto {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBaseUnit: boolean;
  baseUnitId?: string | null;
  baseUnitCode?: string | null;
  conversionRate?: number | null;
  description?: string | null;
  isActive: boolean;
}

export interface CreateUnitOfMeasureRequest {
  code: string;
  name: string;
  symbol: string;
  isBaseUnit: boolean;
  baseUnitId?: string | null;
  conversionRate?: number | null;
  description?: string | null;
}

export interface StockValuationLotDto {
  date: string;
  reference: string;
  originalQuantity: number;
  remainingQuantity: number;
  unitCost: number;
  valuationValue: number;
}

export interface StockValuationItemDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: "SKU" | "Serialized" | string;
  baseUnit: string;
  alternateUnit?: string | null;
  conversionFactor?: number | null;
  quantity: number;
  alternateQuantity?: number | null;
  fifoRate: number;
  fifoValue: number;
  weightedAverageRate: number;
  weightedAverageValue: number;
  lastPurchaseRate: number;
  lastPurchaseValue: number;
  variance: number;
  lots: StockValuationLotDto[];
}

export interface StockValuationSummaryDto {
  totalItems: number;
  totalQuantity: number;
  fifoValuation: number;
  weightedAverageValuation: number;
  lastPurchaseValuation: number;
  selectedMethod: string;
  selectedTotalValuation: number;
  valuationVariance: number;
  asOfDate: string;
  items: StockValuationItemDto[];
}

export interface ValuationCogsMetricDto {
  methodName: string;
  openingStock: number;
  purchases: number;
  closingStock: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossProfitMarginPercent: number;
}

export interface TradingProfitLossValuationDto {
  fromDate: string;
  toDate: string;
  salesRevenue: number;
  directExpenses: number;
  fifo: ValuationCogsMetricDto;
  weightedAverage: ValuationCogsMetricDto;
  lastPurchaseCost: ValuationCogsMetricDto;
  valuationVariance: number;
  summaryNotes: string;
}


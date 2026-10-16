export interface GodownDto {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  isPrimary: boolean;
  isActive: boolean;
  serializedItemCount: number;
  skuItemQuantity: number;
  totalStockValue: number;
}

export interface CreateGodownRequest {
  name: string;
  code: string;
  address?: string | null;
  isPrimary?: boolean;
}

export interface UpdateGodownRequest {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  isPrimary: boolean;
  isActive: boolean;
}

export interface GodownStockItemDto {
  itemId: string;
  itemType: "Serialized" | "Sku";
  name: string;
  serialNumber?: string | null;
  serialNumber1?: string | null;
  availableQuantity: number;
  unitCost: number;
}

export interface StockTransferLineInput {
  itemType: "Serialized" | "Sku";
  productId?: string | null;
  skuId?: string | null;
  itemName: string;
  serialNumber?: string | null;
  quantity: number;
  unitCost: number;
}

export interface CreateStockTransferRequest {
  transferDate: string;
  fromGodownId: string;
  toGodownId: string;
  vehicleNumber?: string | null;
  dispatchNote?: string | null;
  transporterName?: string | null;
  narration?: string | null;
  lines: StockTransferLineInput[];
}

export interface StockTransferSummaryDto {
  id: string;
  transferNumber: string;
  transferDate: string;
  fromGodownId: string;
  fromGodownName: string;
  toGodownId: string;
  toGodownName: string;
  vehicleNumber?: string | null;
  dispatchNote?: string | null;
  transporterName?: string | null;
  narration?: string | null;
  status: string;
  totalQuantity: number;
  totalValue: number;
  itemCount: number;
}

export interface StockTransferLineDto {
  id: string;
  itemType: "Serialized" | "Sku";
  productId?: string | null;
  skuId?: string | null;
  itemName: string;
  serialNumber?: string | null;
  quantity: number;
  unitCost: number;
  totalValue: number;
}

export interface StockTransferDetailDto {
  id: string;
  transferNumber: string;
  transferDate: string;
  fromGodownId: string;
  fromGodownName: string;
  toGodownId: string;
  toGodownName: string;
  vehicleNumber?: string | null;
  dispatchNote?: string | null;
  transporterName?: string | null;
  narration?: string | null;
  status: string;
  totalQuantity: number;
  totalValue: number;
  lines: StockTransferLineDto[];
}

export interface StockAuditItemDto {
  productId?: string | null;
  skuId?: string | null;
  itemType: "Serialized" | "Sku";
  itemName: string;
  serialNumber?: string | null;
  serialNumber1?: string | null;
  bookQuantity: number;
  unitCost: number;
  totalBookValue: number;
}

export interface PhysicalStockAuditSummaryDto {
  godownId: string;
  godownName: string;
  godownCode: string;
  isPrimary: boolean;
  totalItemsCount: number;
  totalBookQuantity: number;
  totalBookValue: number;
  items: StockAuditItemDto[];
}

export interface CreateStockAdjustmentRequest {
  adjustmentDate: string;
  godownId: string;
  adjustmentType: "Shortage" | "Surplus";
  reason: string;
  itemType: "Serialized" | "Sku";
  productId?: string | null;
  skuId?: string | null;
  itemName: string;
  serialNumber?: string | null;
  bookQuantity: number;
  physicalQuantity: number;
  unitCost: number;
}

export interface StockAdjustmentDto {
  id: string;
  adjustmentNumber: string;
  adjustmentDate: string;
  godownId: string;
  godownName: string;
  adjustmentType: string;
  reason: string;
  itemType: string;
  itemName: string;
  serialNumber?: string | null;
  bookQuantity: number;
  physicalQuantity: number;
  discrepancyQuantity: number;
  unitCost: number;
  totalValue: number;
  journalEntryId?: string | null;
}


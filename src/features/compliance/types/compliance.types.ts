export interface EWayBillDto {
  id: string;
  salesInvoiceId: string;
  billNumber: string;
  invoiceDate: string;
  customerName: string;
  customerGstin?: string | null;
  totalAmount: number;
  ewbNumber?: string | null;
  ewbDate?: string | null;
  validUpto?: string | null;
  docType: string;
  supplyType: string;
  subSupplyType: string;
  transMode: number; // 1 = Road, 2 = Rail, 3 = Air, 4 = Ship
  distanceKm: number;
  transporterId?: string | null;
  transporterName?: string | null;
  transDocNo?: string | null;
  transDocDate?: string | null;
  vehicleNo?: string | null;
  vehicleType: string; // R = Regular, O = Over Dimensional Cargo
  status: "Generated" | "Cancelled";
  cancelReason?: string | null;
  cancelDate?: string | null;
}

export interface EInvoiceDto {
  id: string;
  salesInvoiceId: string;
  billNumber: string;
  invoiceDate: string;
  customerName: string;
  customerGstin?: string | null;
  totalAmount: number;
  irn: string;
  ackNo: string;
  ackDate: string;
  signedQrCode: string;
  signedInvoice?: string | null;
  status: "Generated" | "Cancelled";
  cancelReason?: string | null;
  cancelDate?: string | null;
}

export interface GenerateEWayBillRequest {
  salesInvoiceId: string;
  distanceKm: number;
  transMode?: number;
  vehicleNo?: string;
  vehicleType?: string;
  transporterId?: string;
  transporterName?: string;
  transDocNo?: string;
  transDocDate?: string;
  docType?: string;
  supplyType?: string;
  subSupplyType?: string;
  customEwbNumber?: string;
}

export interface GenerateEInvoiceRequest {
  salesInvoiceId: string;
  customIrn?: string;
  customAckNo?: string;
}

export interface CancelComplianceRequest {
  reason: string;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}


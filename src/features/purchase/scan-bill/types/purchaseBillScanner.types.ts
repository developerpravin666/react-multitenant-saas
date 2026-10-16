export interface ExtractedBillHeader {
  vendorName: string;
  vendorGstin: string;
  vendorAddress: string;
  vendorPhone?: string;
  vendorEmail: string;
  vendorState: string;
  vendorStateCode: string;
  buyerName: string;
  buyerGstin: string;
  buyerState: string;
  buyerStateCode: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  paymentTermsDays: number;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  pan: string;
}

export interface ExtractedBillItem {
  id: string;
  lineNumber: number;
  description: string;
  brand: string;
  model: string;
  variant: string;
  color: string;
  serialNumber: string;
  serialNumber1?: string | null;
  hsnCode: string;
  quantity: number;
  unit: string;
  taxableRate: number;
  taxableAmount: number;
  cgstRate: number;
  sgstRate: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
  // Optional matched lookup IDs
  vendorId?: string;
  brandId?: string;
  modelId?: string;
  variantId?: string;
  colorId?: string;
  productTypeId?: string;
}

export interface ExtractedBillSummary {
  totalItems: number;
  totalQuantity: number;
  subtotalTaxable: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  amountInWords?: string;
}

export interface ExtractedPurchaseBill {
  header: ExtractedBillHeader;
  items: ExtractedBillItem[];
  summary: ExtractedBillSummary;
  rawText: string;
  confidence: number;
}


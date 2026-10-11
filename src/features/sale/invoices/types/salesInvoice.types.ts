export type InvoiceItemType = 0 | 1 | 2; // 0 = Serialized, 1 = Standard, 2 = Service

export type GstSupplyType = 0 | 1; // 0 = Intra-State (CGST + SGST), 1 = Inter-State (IGST)

export interface SalesInvoiceSummary {
  id: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  customerEmail?: string | null;
  invoiceDate: string;
  paymentTermsDays: number;
  dueDate: string;
  itemCount: number;
  subTotal: number;
  discount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  paymentStatus: "Unpaid" | "Partially paid" | "Paid" | "Cancelled";
  notes?: string | null;
  supplyType?: GstSupplyType;
  placeOfSupplyStateCode?: string | null;
  placeOfSupplyStateName?: string | null;
  customerGstin?: string | null;
}

export interface SalesInvoiceLine {
  id: string;
  lineNumber: number;
  itemType: InvoiceItemType;
  productId?: string | null;
  skuId?: string | null;
  itemDescription: string;
  hsnSac?: string | null;
  unitOfMeasure?: string;
  serialNumber?: string | null;
  serialNumber1?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxId?: string | null;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface SalesInvoiceReceipt {
  id: string;
  amount: number;
  paymentMode: string;
  paymentDate: string;
  referenceNumber?: string | null;
  note?: string | null;
}

export interface SalesInvoiceDetails {
  invoice: SalesInvoiceSummary;
  lines: SalesInvoiceLine[];
  payments: SalesInvoiceReceipt[];
}

export interface CreateInvoiceLineDraft {
  itemType: InvoiceItemType;
  productId?: string | null;
  skuId?: string | null;
  itemDescription: string;
  hsnSac?: string | null;
  unitOfMeasure?: string;
  serialNumber?: string | null;
  serialNumber1?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxId?: string | null;
  cgstRate: number;
  sgstRate: number;
  igstRate?: number;
}

export interface CreateSalesInvoicePayload {
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  customerEmail?: string | null;
  customerGstin?: string | null;
  placeOfSupplyStateCode?: string | null;
  placeOfSupplyStateName?: string | null;
  supplyType?: GstSupplyType;
  invoiceDate: string;
  paymentTermsDays: number;
  notes?: string | null;
  lines: CreateInvoiceLineDraft[];
  initialPayment?: {
    amount: number;
    paymentMode: string;
    paymentDate: string;
    referenceNumber?: string | null;
    note?: string | null;
  } | null;
}

export interface GstStateOption {
  code: string;
  name: string;
}

export const INDIAN_GST_STATES: GstStateOption[] = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" }
];

export interface UnpaidCustomerInvoice {
  invoiceId: string;
  billNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  daysOverdue: number;
}

export interface CustomerUnpaidInvoicesSummary {
  customerId: string;
  customerName: string;
  customerMobile: string;
  totalOutstanding: number;
  invoices: UnpaidCustomerInvoice[];
}

export interface InvoiceAllocationItem {
  invoiceId: string;
  allocatedAmount: number;
}

export interface AllocateCustomerPaymentPayload {
  customerId: string;
  totalPaymentAmount: number;
  paymentMode: string;
  paymentDate: string;
  referenceNumber?: string | null;
  note?: string | null;
  autoAllocateFifo: boolean;
  specificAllocations?: InvoiceAllocationItem[] | null;
}

export interface InvoiceAllocationDetail {
  invoiceId: string;
  billNumber: string;
  invoiceDate: string;
  totalAmount: number;
  previousBalance: number;
  amountAllocated: number;
  remainingBalance: number;
  newStatus: string;
  receiptId: string;
}

export interface PaymentAllocationResult {
  customerId: string;
  customerName: string;
  totalPaymentAmount: number;
  totalAllocated: number;
  unallocatedAdvance: number;
  paymentMode: string;
  paymentDate: string;
  referenceNumber?: string | null;
  allocations: InvoiceAllocationDetail[];
}

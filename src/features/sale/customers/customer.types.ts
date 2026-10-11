import type { ResourceRecord } from "../../shared/resourceApi";

export interface CustomerRecord extends ResourceRecord {
  name: string;
  mobile: string;
  address: string;
  email?: string | null;
  isActive: boolean;
  salesCount: number;
}

export interface CustomerPaymentHistory {
  id: string;
  amount: number;
  paymentMode: string;
  paymentDate: string;
  referenceNumber?: string | null;
  note?: string | null;
}

export interface CustomerSaleHistory {
  isMultiLineInvoice?: boolean;
  id: string;
  billNumber: string;
  saleDate: string;
  productName: string;
  serialNumber: string;
  sellingPrice: number;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  paymentPlan?: string | null;
  payments: CustomerPaymentHistory[];
}

export interface CustomerHistory {
  customer: CustomerRecord;
  totalSales: number;
  totalReceived: number;
  outstandingBalance: number;
  sales: CustomerSaleHistory[];
}

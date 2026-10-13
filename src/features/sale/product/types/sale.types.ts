import type { ResourceRecord } from "../../../shared/resourceApi";

export interface EmiScheduleItem {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: "Upcoming" | "Due Soon" | "Overdue" | "Paid";
  daysRemaining?: number;
}

export interface SaleRecord extends ResourceRecord {
  billNumber: string;
  productId: string;
  productName: string;
  serialNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  customerEmail?: string | null;
  saleDate: string;
  paymentTermsDays: number;
  dueDate: string;
  productPrice: number;
  sellingPrice: number;
  discount: number;
  taxId?: string | null;
  cgstRate?: number;
  sgstRate?: number;
  totalAmount?: number;
  paymentMode?: "Cash" | "Finance" | null;
  paidAmount?: number;
  balanceAmount?: number;
  downPayment?: number | null;
  numberOfEmi?: number | null;
  emiAmount?: number | null;
  firstInstallmentDate?: string | null;
  financeVendorName?: string | null;
  hasInsurance?: boolean | null;
  insuranceAmount?: number | null;
}

export interface SaleProductOption extends ResourceRecord {
  taxId?: string | null;
  hsnSac?: string | null;
  brand: string;
  productType: string;
  productModel: string;
  variant: string;
  color: string;
  serialNumber?: string;
  serialNumber1?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  totalAmount?: number;
  cgst?: number;
  sgst?: number;
  discount?: number;
  isActive?: boolean;
}

export interface CustomerLookupRecord extends ResourceRecord {
  name: string;
  mobile: string;
  address: string;
  email?: string | null;
}

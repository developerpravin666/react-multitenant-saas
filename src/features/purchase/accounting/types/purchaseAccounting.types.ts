import type { ResourceRecord } from "../../../shared/resourceApi";

export interface PurchaseBill extends ResourceRecord {
  vendorId: string;
  vendorName: string;
  billNumber: string;
  billDate: string;
  paymentTermsDays: number;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  paymentStatus: "Paid" | "Partially paid" | "Unpaid" | string;
}

export interface PurchasePayment {
  id: string;
  amount: number;
  paymentMode: string;
  paymentDate: string;
  referenceNumber?: string | null;
  note?: string | null;
}

export interface PurchaseBillDetails {
  bill: PurchaseBill;
  payments: PurchasePayment[];
}

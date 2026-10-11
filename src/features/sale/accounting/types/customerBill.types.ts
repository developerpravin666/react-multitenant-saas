export type CustomerBillPaperSize = "A4" | "A5" | "Thermal80";

export interface CustomerBillTemplate {
  companyName: string;
  companyAddress: string;
  companyMobile: string;
  companyEmail: string | null;
  taxRegistrationNumber: string | null;
  stateCode?: string | null;
  stateName?: string | null;
  billTitle: string;
  footerNote: string;
  paperSize: CustomerBillPaperSize;
  showCustomerEmail: boolean;
  showSerialNumber: boolean;
  showDiscount: boolean;
  showPaymentHistory: boolean;
  showBalanceDue: boolean;
}

export interface PrintableSalesBill {
  billNumber: string;
  billDate: string;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  customerEmail?: string | null;
  productName: string;
  serialNumber: string;
  sellingPrice: number;
  discount: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  paymentStatus: string;
  payments: {
    id: string;
    amount: number;
    paymentMode: string;
    paymentDate: string;
    referenceNumber?: string | null;
  }[];
}

export const defaultCustomerBillTemplate: CustomerBillTemplate = {
  companyName: "",
  companyAddress: "",
  companyMobile: "",
  companyEmail: null,
  taxRegistrationNumber: null,
  stateCode: null,
  stateName: null,
  billTitle: "SALES INVOICE",
  footerNote: "Thank you for your business.",
  paperSize: "A4",
  showCustomerEmail: true,
  showSerialNumber: true,
  showDiscount: true,
  showPaymentHistory: true,
  showBalanceDue: true,
};

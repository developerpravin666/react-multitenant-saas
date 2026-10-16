export interface Gstr1ItemDetail {
  rate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
}

export interface Gstr1InvoiceLine {
  lineNumber: number;
  itemDetails: Gstr1ItemDetail;
}

export interface Gstr1B2bInvoiceItem {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: number;
  placeOfSupply: string;
  reverseCharge: string;
  invoiceType: string;
  ecommerceGstin?: string | null;
  items: Gstr1InvoiceLine[];
}

export interface Gstr1B2bInvoiceGroup {
  customerGstin: string;
  customerLegalName: string;
  invoices: Gstr1B2bInvoiceItem[];
}

export interface Gstr1B2cLargeInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: number;
  placeOfSupply: string;
  ecommerceGstin?: string | null;
  applicableTaxRatePercent: number;
  items: Gstr1InvoiceLine[];
}

export interface Gstr1B2cSmallSummary {
  placeOfSupply: string;
  supplyType: "IntraState" | "InterState";
  rate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  ecommerceGstin?: string | null;
}

export interface Gstr1CdnrItem {
  noteNumber: string;
  noteDate: string;
  noteType: "C" | "D";
  originalInvoiceNumber: string;
  originalInvoiceDate: string;
  noteValue: number;
  placeOfSupply: string;
  reverseCharge: string;
  items: Gstr1InvoiceLine[];
}

export interface Gstr1CdnrInvoiceGroup {
  customerGstin: string;
  customerLegalName: string;
  notes: Gstr1CdnrItem[];
}

export interface Gstr1CdnumInvoice {
  noteNumber: string;
  noteDate: string;
  noteType: string;
  originalInvoiceNumber: string;
  originalInvoiceDate: string;
  noteValue: number;
  placeOfSupply: string;
  items: Gstr1InvoiceLine[];
}

export interface Gstr1HsnSummary {
  serialNumber: number;
  hsnCode: string;
  description: string;
  uqc: string;
  totalQuantity: number;
  totalValue: number;
  taxableValue: number;
  integratedTax: number;
  centralTax: number;
  stateTax: number;
  cess: number;
}

export interface Gstr1DocIssuedDetail {
  docNatureNumber: number;
  docNatureDescription: string;
  fromSerialNumber: string;
  toSerialNumber: string;
  totalNumber: number;
  cancelledNumber: number;
  netIssuedNumber: number;
}

export interface Gstr1Summary {
  gstin: string;
  legalName: string;
  returnPeriod: string;
  fromDate: string;
  toDate: string;
  grossTurnover: number;
  totalTaxableValue: number;
  totalTax: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  b2bInvoices: Gstr1B2bInvoiceGroup[];
  b2cLargeInvoices: Gstr1B2cLargeInvoice[];
  b2cSmallSummaries: Gstr1B2cSmallSummary[];
  creditDebitNotesRegistered: Gstr1CdnrInvoiceGroup[];
  creditDebitNotesUnregistered: Gstr1CdnumInvoice[];
  hsnSummaries: Gstr1HsnSummary[];
  documentsIssued: {
    documentDetails: Gstr1DocIssuedDetail[];
  };
}

export interface Gstr3bSupplyRow {
  natureOfSupply: string;
  totalTaxableValue: number;
  integratedTax: number;
  centralTax: number;
  stateTax: number;
  cess: number;
}

export interface Gstr3bTable31OutwardSupplies {
  outwardTaxableSupplies: Gstr3bSupplyRow;
  outwardZeroRatedSupplies: Gstr3bSupplyRow;
  otherOutwardNilExemptedSupplies: Gstr3bSupplyRow;
  inwardLiableToReverseCharge: Gstr3bSupplyRow;
  nonGstOutwardSupplies: Gstr3bSupplyRow;
}

export interface Gstr3bItcRow {
  details: string;
  integratedTax: number;
  centralTax: number;
  stateTax: number;
  cess: number;
}

export interface Gstr3bTable4EligibleItc {
  itcAvailable: Gstr3bItcRow[];
  itcReversed: Gstr3bItcRow[];
  netItcAvailable: Gstr3bItcRow;
}

export interface Gstr3bTable5InwardSupplies {
  interStateSupplies: number;
  intraStateSupplies: number;
}

export interface Gstr3bTaxPaymentRow {
  taxType: string;
  totalTaxPayable: number;
  paidThroughItc: number;
  taxPaidCash: number;
  interestPaid: number;
  lateFeePaid: number;
}

export interface Gstr3bTaxPaymentSummary {
  rows: Gstr3bTaxPaymentRow[];
  totalTaxLiability: number;
  totalItcUtilized: number;
  netCashPayable: number;
}

export interface Gstr3bSummary {
  gstin: string;
  legalName: string;
  returnPeriod: string;
  fromDate: string;
  toDate: string;
  outwardSupplies: Gstr3bTable31OutwardSupplies;
  eligibleItc: Gstr3bTable4EligibleItc;
  inwardSupplies: Gstr3bTable5InwardSupplies;
  taxPayment: Gstr3bTaxPaymentSummary;
}

export interface Gstr2bReconciliationItem {
  status: "MATCHED" | "BOOKS_ONLY" | "PORTAL_ONLY" | "VALUE_MISMATCH";
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  booksTaxableValue: number;
  booksTaxAmount: number;
  booksCgst: number;
  booksSgst: number;
  booksIgst: number;
  portalTaxableValue: number;
  portalTaxAmount: number;
  portalCgst: number;
  portalSgst: number;
  portalIgst: number;
  differenceAmount: number;
  discrepancyReason?: string | null;
}

export interface Gstr2bReconciliationResult {
  tenantGstin: string;
  returnPeriod: string;
  fromDate: string;
  toDate: string;
  totalInvoicesCount: number;
  matchedCount: number;
  booksOnlyCount: number;
  portalOnlyCount: number;
  valueMismatchCount: number;
  totalMatchedItc: number;
  totalBooksOnlyItc: number;
  totalPortalOnlyItc: number;
  totalValueMismatchItcDiff: number;
  items: Gstr2bReconciliationItem[];
}

export interface TriangulationException {
  severity: "Critical" | "Warning";
  category: "InvalidGSTIN" | "MissingHSN" | "TaxMismatch" | "InterStateTaxMismatch" | "MismatchedLedgers" | "MissingStateCode";
  voucherType: "SalesInvoice" | "PurchaseBill" | "JournalEntry" | "CreditNote";
  voucherNumber: string;
  voucherDate: string | null;
  partyName?: string | null;
  partyGstin?: string | null;
  impactedAmount: number;
  description: string;
  recommendedAction: string;
}

export interface PreFilingTriangulationResult {
  tenantGstin: string;
  fromDate: string;
  toDate: string;
  totalVouchersScanned: number;
  totalExceptionsCount: number;
  criticalErrorsCount: number;
  warningsCount: number;
  isFilingReady: boolean;
  exceptions: TriangulationException[];
}



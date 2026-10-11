export interface StatementTransaction {
  date: string;
  voucherType: string;
  voucherNumber: string;
  particulars: string;
  debit: number;
  credit: number;
  runningBalance: number;
  balanceSide: "Dr" | "Cr";
  sourceId?: string | null;
}

export interface PartyAgingSummary {
  current0To30: number;
  days31To60: number;
  days61To90: number;
  daysOver90: number;
  totalOutstanding: number;
}

export interface PartyStatementOfAccount {
  partyId: string;
  partyType: "Customer" | "Vendor";
  partyName: string;
  partyMobile: string;
  partyEmail?: string | null;
  partyAddress: string;
  partyGstin?: string | null;
  partyStateCode?: string | null;
  partyStateName?: string | null;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  openingBalanceSide: "Dr" | "Cr";
  transactions: StatementTransaction[];
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  closingBalance: number;
  closingBalanceSide: "Dr" | "Cr";
  aging: PartyAgingSummary;
}

export type StatementPartyType = "Customer" | "Vendor";

export interface PartyLookupOption {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  gstin?: string;
}


export interface TaxRate {
  id: string;
  name?: string;
  profileId?: string;
  effectiveFrom?: string;
  treatment?: string;
  cgst: number;
  sgst: number;
  totalTax: number;
  isActive: boolean;
}

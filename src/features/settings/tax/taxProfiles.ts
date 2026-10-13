export interface DatedTaxRate {
  id: string; profileId?: string; name?: string; effectiveFrom?: string;
  treatment?: string; isActive?: boolean; cgst: number; sgst: number; totalTax: number;
}
export function resolveTaxRate<T extends DatedTaxRate>(rates: T[], selection: unknown, date: string): T | undefined {
  if (!selection) return undefined;
  const selected = rates.find(t => t.id === selection || t.profileId === selection);
  if (!selected) return undefined;
  const profileId = selected.profileId || selected.id;
  const candidate = rates.filter(t => (t.profileId || t.id) === profileId && (t.effectiveFrom || "0001-01-01") <= date)
    .sort((a, b) => (b.effectiveFrom || "0001-01-01").localeCompare(a.effectiveFrom || "0001-01-01"))[0];
  return candidate?.isActive === false ? undefined : candidate;
}
export function taxProfileOptions(rates: DatedTaxRate[], date = new Date().toISOString().slice(0, 10)) {
  const profiles = new Map(rates.map(t => [t.profileId || t.id, t]));
  return [...profiles].map(([id, t]) => {
    const rate = resolveTaxRate(rates, id, date);
    return { value: id, label: `${t.name || "GST"} - ${rate ? `${rate.totalTax}% (${rate.treatment || "Taxable"})` : "no active rate for date"}` };
  });
}

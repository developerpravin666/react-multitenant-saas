import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { apiClient } from "../../services/apiClient";

type RateRow = { igstRate: number; igstAmount: number; cgstRate: number; sgstRate: number; taxableAmount: number; cgstAmount: number; sgstAmount: number; totalTax: number };
type TaxReport = { fromDate: string; toDate: string; sales: RateRow[]; purchases: RateRow[]; salesTaxable: number; outputTax: number; purchaseTaxable: number; inputTaxCredit: number; outputTaxLedger: number; inputTaxCreditLedger: number; outputTaxDifference: number; inputTaxCreditDifference: number; netTaxPayable: number };
const inputClass = "min-h-9 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";
const money = (value: number) => value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function TaxReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(`${today.slice(0, 4)}-01-01`);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<TaxReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const query = new URLSearchParams({ from, to });
      setReport(await apiClient.get<TaxReport>(`/general-ledger/tax-report?${query}`));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load GST report."); }
    finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { void load(); }, [load]);

  const exportCsv = () => {
    if (!report) return;
    const rows: (string | number)[][] = [["GST Summary", report.fromDate, report.toDate], [], ["Type", "CGST rate", "SGST rate", "IGST rate", "Taxable amount", "CGST", "SGST", "IGST", "Total tax"]];
    for (const [type, list] of [["Sales", report.sales], ["Purchases", report.purchases]] as const)
      for (const row of list) rows.push([type, row.cgstRate, row.sgstRate, row.igstRate, row.taxableAmount, row.cgstAmount, row.sgstAmount, row.igstAmount, row.totalTax]);
    rows.push([], ["Reconciliation", "Report", "Ledger", "Difference"], ["Output GST", report.outputTax, report.outputTaxLedger, report.outputTaxDifference], ["Input tax credit", report.inputTaxCredit, report.inputTaxCreditLedger, report.inputTaxCreditDifference], ["Net tax payable", report.netTaxPayable]);
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `gst-summary-${report.fromDate}-${report.toDate}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const renderTable = (title: string, items: RateRow[]) => <section className="overflow-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-2 font-semibold">{title}</h2><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="p-2">CGST / SGST / IGST</th><th className="p-2 text-right">Taxable</th><th className="p-2 text-right">CGST</th><th className="p-2 text-right">SGST</th><th className="p-2 text-right">IGST</th><th className="p-2 text-right">Total GST</th></tr></thead><tbody>{items.map(row => <tr key={`${row.cgstRate}-${row.sgstRate}-${row.igstRate}`} className="border-t border-slate-100 dark:border-slate-800"><td className="p-2">{row.cgstRate}% / {row.sgstRate}% / {row.igstRate}%</td><td className="p-2 text-right">{money(row.taxableAmount)}</td><td className="p-2 text-right">{money(row.cgstAmount)}</td><td className="p-2 text-right">{money(row.sgstAmount)}</td><td className="p-2 text-right">{money(row.igstAmount)}</td><td className="p-2 text-right font-medium">{money(row.totalTax)}</td></tr>)}{items.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-500">No transactions in this period.</td></tr>}</tbody></table></section>;

  return <section className="space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-semibold">GST Reports &amp; Reconciliation</h1><p className="mt-0.5 text-xs text-slate-500">Tax on sales and purchases reconciled to GST control accounts.</p></div><div className="flex flex-wrap items-end gap-2"><label className="text-xs">From<input className={`${inputClass} mt-1 block`} type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label className="text-xs">To<input className={`${inputClass} mt-1 block`} type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></label><Button variant="secondary" onClick={() => void load()} isLoading={loading}><RefreshCw size={14} /> Refresh</Button>{report && <Button onClick={exportCsv}><Download size={14} /> Export CSV</Button>}</div></header>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {report && <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Sales taxable", report.salesTaxable], ["Output GST", report.outputTax], ["Purchase taxable", report.purchaseTaxable], ["Input tax credit", report.inputTaxCredit]].map(([label, amount]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold">{money(Number(amount))}</p></div>)}</div>
      <div className="grid gap-3 xl:grid-cols-2">{renderTable("Sales · Output GST", report.sales)}{renderTable("Purchases · Input tax credit", report.purchases)}</div>
      <section className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-2 font-semibold">Ledger reconciliation</h2><div className="grid gap-2 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs text-slate-500">Output GST · report / ledger / difference</p><p className="font-medium">{money(report.outputTax)} / {money(report.outputTaxLedger)} / <span className={Math.abs(report.outputTaxDifference) < .01 ? "text-emerald-700" : "text-amber-700"}>{money(report.outputTaxDifference)}</span></p></div><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs text-slate-500">Input credit · report / ledger / difference</p><p className="font-medium">{money(report.inputTaxCredit)} / {money(report.inputTaxCreditLedger)} / <span className={Math.abs(report.inputTaxCreditDifference) < .01 ? "text-emerald-700" : "text-amber-700"}>{money(report.inputTaxCreditDifference)}</span></p></div><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs text-slate-500">Net GST payable</p><p className="font-semibold">{money(report.netTaxPayable)}</p></div></div></section>
      <p className="text-xs text-slate-500">CSV is a transaction summary for return preparation; validate statutory classifications and adjustments before filing.</p>
    </>}
  </section>;
}

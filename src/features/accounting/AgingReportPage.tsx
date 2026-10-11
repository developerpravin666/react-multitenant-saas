import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { apiClient, type PagedData } from "../../services/apiClient";

type AgingInvoice = {
  invoiceNumber: string;
  counterpartyId: string;
  counterpartyName: string;
  invoiceDate: string;
  dueDate: string;
  ageDays: number;
  ageBucket: string;
  originalAmount: number;
  amountPaid: number;
  balance: number;
};
type AgingBucket = { bucket: string; invoiceCount: number; balance: number };
type AgingReport = {
  asOfDate: string;
  receivables: PagedData<AgingInvoice>;
  receivableBuckets: AgingBucket[];
  totalReceivables: number;
  payables: PagedData<AgingInvoice>;
  payableBuckets: AgingBucket[];
  totalPayables: number;
};

const inputClass = "min-h-9 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";
const money = (value: number) => value.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

export function AgingReportPage() {
  const [report, setReport] = useState<AgingReport | null>(null);
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ asOfDate: asOf, page: String(page), pageSize: "20" });
      if (search.trim()) query.set("search", search.trim());
      setReport(await apiClient.get<AgingReport>(`/general-ledger/aging?${query}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load receivables and payables aging.");
    } finally { setLoading(false); }
  }, [asOf, page, search]);
  useEffect(() => { void load(); }, [load]);

  const renderBuckets = (buckets: AgingBucket[]) => <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{buckets.map(bucket => <div key={bucket.bucket} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-950"><p className="text-xs text-slate-500">{bucket.bucket}</p><p className="mt-1 text-sm font-semibold">{money(bucket.balance)}</p><p className="text-[11px] text-slate-500">{bucket.invoiceCount} invoices</p></div>)}</div>;
  const renderInvoices = (title: string, invoices: PagedData<AgingInvoice> | undefined) => {
    const data = invoices?.items ?? [];
    const currentPage = invoices?.page ?? 1;
    const totalPages = invoices?.totalPages ?? 0;
    return <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{title}</h2><div className="flex gap-2"><Button variant="secondary" disabled={currentPage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</Button><span className="self-center text-xs text-slate-500">Page {currentPage} of {totalPages}</span><Button variant="secondary" disabled={currentPage >= totalPages} onClick={() => setPage(value => value + 1)}>Next</Button></div></div>
      <div className="overflow-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="p-2">Invoice</th><th className="p-2">Customer / Vendor</th><th className="p-2">Invoice date</th><th className="p-2">Due date</th><th className="p-2">Overdue</th><th className="p-2">Bucket</th><th className="p-2 text-right">Amount</th><th className="p-2 text-right">Paid</th><th className="p-2 text-right">Outstanding</th></tr></thead><tbody>{data.map((invoice, index) => <tr key={`${invoice.counterpartyId}-${invoice.invoiceNumber}-${index}`} className="border-t border-slate-100 dark:border-slate-800"><td className="p-2 font-mono">{invoice.invoiceNumber}</td><td className="p-2">{invoice.counterpartyName}</td><td className="p-2">{invoice.invoiceDate}</td><td className="p-2">{invoice.dueDate}</td><td className="p-2">{invoice.ageDays === 0 ? "Current" : `${invoice.ageDays} d`}</td><td className="p-2">{invoice.ageBucket}</td><td className="p-2 text-right">{money(invoice.originalAmount)}</td><td className="p-2 text-right">{money(invoice.amountPaid)}</td><td className="p-2 text-right font-medium">{money(invoice.balance)}</td></tr>)}{data.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-slate-500">No outstanding invoices.</td></tr>}</tbody></table></div>
    </section>;
  };

  return <section className="space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-2"><div><h1 className="text-xl font-semibold">Receivable &amp; Payable Aging</h1><p className="mt-0.5 text-xs text-slate-500">Outstanding invoices aged from contractual due date. Payments are allocated to their recorded invoice.</p></div><div className="flex flex-wrap items-end gap-2"><label className="text-xs">As of date<input className={`${inputClass} mt-1 block`} type="date" value={asOf} onChange={event => { setAsOf(event.target.value); setPage(1); }} /></label><label className="text-xs">Search invoices or names<input className={`${inputClass} mt-1 block`} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search" /></label><Button variant="secondary" onClick={() => void load()} isLoading={loading}><RefreshCw size={14} /> Refresh</Button></div></header>
    {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
    {report ? <>
      <div className="grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">Total receivables as of {report.asOfDate}</p><p className="mt-1 text-xl font-semibold">{money(report.totalReceivables)}</p><div className="mt-3">{renderBuckets(report.receivableBuckets)}</div></div><div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">Total payables as of {report.asOfDate}</p><p className="mt-1 text-xl font-semibold">{money(report.totalPayables)}</p><div className="mt-3">{renderBuckets(report.payableBuckets)}</div></div></div>
      {renderInvoices("Customer receivables", report.receivables)}
      {renderInvoices("Supplier payables", report.payables)}
    </> : loading ? <p className="text-sm text-slate-500">Loading aging report…</p> : null}
  </section>;
}

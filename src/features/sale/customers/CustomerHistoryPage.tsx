import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { APP_ROUTES } from "../../../config/routes";
import { apiClient } from "../../../services/apiClient";
import type { CustomerHistory } from "./customer.types";

const currency = (amount: number) => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CustomerHistoryPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [history, setHistory] = useState<CustomerHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setHistory(await apiClient.get<CustomerHistory>(`/customers/${encodeURIComponent(id)}/history`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load customer history.");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => { void loadHistory(); }, [loadHistory]);

  if (loading) return <p className="text-sm text-slate-500">Loading customer history…</p>;
  if (!history) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error ?? "Customer not found."}</div>;

  const { customer, sales } = history;
  const metrics = [
    ["Purchases", String(sales.length)],
    ["Total billed", currency(history.totalSales)],
    ["Net received", currency(history.totalReceived)],
    ["Outstanding", currency(history.outstandingBalance)],
  ];

  return (
    <section className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{customer.name}</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{customer.mobile}{customer.email ? ` · ${customer.email}` : ""}</p>
          <p className="mt-1 max-w-2xl text-xs text-slate-500 dark:text-slate-400">{customer.address}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(APP_ROUTES.sale.customers.edit(customer.id))}>Edit customer</Button>
          <Button variant="secondary" onClick={() => navigate(APP_ROUTES.sale.customers.list)}>Back to customers</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{value}</p></div>)}
      </div>

      {sales.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">Enquiry customer</h2><p className="mt-1 text-sm text-slate-500">No products have been sold to this customer yet.</p>
        </div>
      ) : sales.map((sale) => (
        <article key={sale.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div><p className="font-semibold">{sale.productName || "Product sale"}</p><p className="mt-0.5 text-xs text-slate-500">{sale.billNumber}{sale.serialNumber ? ` · S/N ${sale.serialNumber}` : ""}{sale.paymentPlan ? ` · ${sale.paymentPlan}` : ""}</p></div>
            <Button variant="secondary" onClick={() => navigate(sale.isMultiLineInvoice ? APP_ROUTES.sale.invoices.print(sale.id) : APP_ROUTES.sale.accountingPayment(sale.id))}>Open bill</Button>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm sm:grid-cols-3 xl:grid-cols-6">
            <div><p className="text-xs text-slate-500">Purchase date</p><p className="font-medium">{sale.saleDate}</p></div>
            <div><p className="text-xs text-slate-500">Selling price</p><p className="font-medium">{currency(sale.sellingPrice)}</p></div>
            <div><p className="text-xs text-slate-500">Discount</p><p className="font-medium">{currency(sale.discount)}</p></div>
            <div><p className="text-xs text-slate-500">Bill total</p><p className="font-medium">{currency(sale.totalAmount)}</p></div>
            <div><p className="text-xs text-slate-500">Received</p><p className="font-medium">{currency(sale.amountPaid)}</p></div>
            <div><p className="text-xs text-slate-500">Balance</p><p className="font-medium">{currency(sale.balance)}</p></div>
          </div>
          {sale.payments.length ? <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Payment history</p><div className="space-y-1.5">{sale.payments.map((payment) => <div key={payment.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs"><span>{payment.paymentDate} · {payment.paymentMode}{payment.referenceNumber ? ` · ${payment.referenceNumber}` : ""}{payment.note ? ` · ${payment.note}` : ""}</span><span className="font-semibold">{currency(payment.amount)}</span></div>)}</div></div> : <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">No payments have been recorded for this bill.</p>}
        </article>
      ))}
    </section>
  );
}

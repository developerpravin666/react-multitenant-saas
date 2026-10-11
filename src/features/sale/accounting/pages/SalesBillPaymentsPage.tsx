import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { APP_ROUTES } from "../../../../config/routes";
import { apiClient } from "../../../../services/apiClient";
import type { SalesBillDetails, SalesReceipt } from "../types/salesAccounting.types";

type PaymentMode = "Cash" | "UPI" | "OnlineTransfer" | "Cheque" | "Other";
const currency = (amount: number) => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function SalesBillPaymentsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<SalesBillDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");
  const [paymentDate, setPaymentDate] = useState(today);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const loadDetails = useCallback(async () => {
    if (!id) {
      setError("A sales bill is required.");
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setDetails(await apiClient.get<SalesBillDetails>(`/sales/accounting/bills/${encodeURIComponent(id)}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load this sales bill.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadDetails(); }, [loadDetails]);

  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details) return;

    const errors: Record<string, string> = {};
    const paymentAmount = Number(amount);
    if (!amount || !Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      errors.amount = "Please enter a valid payment amount.";
    } else if (paymentAmount > details.bill.balance) {
      errors.amount = `Amount cannot exceed balance ${currency(details.bill.balance)}.`;
    }

    if (!paymentDate) {
      errors.paymentDate = "Payment date is required.";
    }

    if (["UPI", "OnlineTransfer", "Cheque"].includes(paymentMode) && !referenceNumber.trim()) {
      errors.referenceNumber = "Reference number or cheque ID is required for this method.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    try {
      setSaving(true);
      setError(null);
      await apiClient.post<SalesReceipt>(`/sales/accounting/bills/${encodeURIComponent(id)}/payments`, {
        salesProductId: id,
        amount: paymentAmount,
        paymentMode,
        paymentDate,
        referenceNumber: referenceNumber.trim() || null,
        note: note.trim() || null,
      });
      setAmount("");
      setReferenceNumber("");
      setNote("");
      await loadDetails();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to record this payment.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading sales bill…</p>;
  if (!details) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error ?? "Sales bill not found."}</div>;

  const { bill, payments } = details;
  const cards: [string, string][] = [
    ["Total sell amount", currency(bill.sellingPrice)],
    ["Bill total", currency(bill.totalAmount)],
    ["Received", currency(bill.amountPaid)],
    ["Balance due", currency(bill.balance)],
    ["Status", bill.paymentStatus],
  ];

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sales Bill Payments</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{bill.customerName} · {bill.productName} · {bill.billNumber} · {bill.billDate}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(APP_ROUTES.sale.printCustomerBill(id))}><Printer size={15} /> Print bill</Button>
          <Button variant="secondary" onClick={() => navigate(APP_ROUTES.sale.accounting)}>Back to bills</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      {bill.balance > 0 ? (
        <form onSubmit={recordPayment} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-base font-semibold">Record a payment</h2>
            <p className="text-xs text-slate-500">Record installments as they are received. The bill balance updates automatically.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-200">Amount <span className="text-rose-500">*</span></label>
              <input
                type="number"
                min="0.01"
                max={bill.balance}
                step="0.01"
                value={amount}
                aria-invalid={Boolean(fieldErrors.amount)}
                onChange={(event) => { setAmount(event.target.value); clearFieldError("amount"); }}
                className={`${inputClass} ${fieldErrors.amount ? "border-rose-500 bg-rose-50/20" : ""}`}
              />
              {fieldErrors.amount && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.amount}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-200">Payment method</label>
              <select
                value={paymentMode}
                onChange={(event) => { setPaymentMode(event.target.value as PaymentMode); clearFieldError("referenceNumber"); }}
                className={inputClass}
              >
                <option value="Cash">Cash</option><option value="UPI">UPI</option><option value="OnlineTransfer">Online transfer / NEFT / RTGS</option><option value="Cheque">Cheque</option><option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-200">Payment date <span className="text-rose-500">*</span></label>
              <input
                type="date"
                value={paymentDate}
                aria-invalid={Boolean(fieldErrors.paymentDate)}
                onChange={(event) => { setPaymentDate(event.target.value); clearFieldError("paymentDate"); }}
                className={`${inputClass} ${fieldErrors.paymentDate ? "border-rose-500 bg-rose-50/20" : ""}`}
              />
              {fieldErrors.paymentDate && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.paymentDate}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {paymentMode === "Cheque" ? "Cheque number" : "Transaction reference"}{["UPI", "OnlineTransfer", "Cheque"].includes(paymentMode) ? <span className="text-rose-500"> *</span> : ""}
              </label>
              <input
                maxLength={100}
                value={referenceNumber}
                aria-invalid={Boolean(fieldErrors.referenceNumber)}
                onChange={(event) => { setReferenceNumber(event.target.value); clearFieldError("referenceNumber"); }}
                placeholder={["UPI", "OnlineTransfer", "Cheque"].includes(paymentMode) ? "Required reference ID" : "Optional"}
                className={`${inputClass} ${fieldErrors.referenceNumber ? "border-rose-500 bg-rose-50/20" : ""}`}
              />
              {fieldErrors.referenceNumber && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.referenceNumber}</p>}
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-200">Note (optional)</label>
              <input maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} />
            </div>
          </div>
          <Button type="submit" disabled={saving}>{saving ? "Recording…" : "Record payment"}</Button>
        </form>
      ) : <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">This bill is fully paid.</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800"><h2 className="text-base font-semibold">Payment history</h2></div>
        {payments.length === 0 ? <p className="p-4 text-sm text-slate-500">No payments have been recorded.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 dark:bg-slate-950"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Method</th><th className="px-3 py-2">Reference</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Note</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{payments.map((payment) => <tr key={payment.id}><td className="px-3 py-2">{payment.paymentDate}</td><td className="px-3 py-2">{payment.paymentMode === "OnlineTransfer" ? "Online transfer" : payment.paymentMode}</td><td className="px-3 py-2">{payment.referenceNumber || "—"}</td><td className="px-3 py-2 text-right">{currency(payment.amount)}</td><td className="px-3 py-2">{payment.note || "—"}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </section>
  );
}

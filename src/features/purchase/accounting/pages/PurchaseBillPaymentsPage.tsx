import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../../../components/ui/Button";
import { APP_ROUTES } from "../../../../config/routes";
import { apiClient } from "../../../../services/apiClient";
import type { PurchaseBillDetails, PurchasePayment } from "../types/purchaseAccounting.types";

type PaymentMode = "Cash" | "UPI" | "OnlineTransfer" | "Cheque" | "Other";
const currency = (amount: number) => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function PurchaseBillPaymentsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const vendorId = searchParams.get("vendorId") ?? "";
  const billNumber = searchParams.get("billNumber") ?? "";
  const [details, setDetails] = useState<PurchaseBillDetails | null>(null);
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
    if (!vendorId || !billNumber) {
      setError("Vendor and bill number are required to open purchase accounting.");
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const query = new URLSearchParams({ vendorId, billNumber });
      setDetails(await apiClient.get<PurchaseBillDetails>(`/purchases/bills/details?${query}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load this vendor bill.");
    } finally {
      setLoading(false);
    }
  }, [vendorId, billNumber]);

  useEffect(() => { void loadDetails(); }, [loadDetails]);

  const recordPayment = async (event: FormEvent<HTMLFormElement>) => {
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
      await apiClient.post<PurchasePayment>("/purchases/payments", {
        vendorId,
        billNumber,
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
  };

  if (loading) return <p className="text-sm text-slate-500">Loading vendor bill…</p>;
  if (!details) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error ?? "Vendor bill not found."}</div>;

  const { bill, payments } = details;
  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendor Bill Payments</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{bill.vendorName} · Bill {bill.billNumber}</p>
        </div>
        <Button variant="secondary" onClick={() => navigate(APP_ROUTES.purchase.accounting)}>Back to bills</Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        {[["Bill Total", bill.totalAmount], ["Paid", bill.amountPaid], ["Balance Due", bill.balance]].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-semibold">{currency(Number(value))}</p>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
          <p className="mt-2 text-xl font-semibold">{bill.paymentStatus}</p>
        </div>
      </div>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {bill.balance > 0 ? (
        <form onSubmit={recordPayment} noValidate className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-semibold">Record a payment</h2>
            <p className="text-sm text-slate-500">You can record multiple installments. Each entry is retained in the payment history.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Amount <span className="text-rose-500">*</span></label>
              <input
                type="number"
                min="0.01"
                max={bill.balance}
                step="0.01"
                value={amount}
                aria-invalid={Boolean(fieldErrors.amount)}
                onChange={(event) => { setAmount(event.target.value); clearFieldError("amount"); }}
                className={`mt-1 w-full rounded-lg border ${
                  fieldErrors.amount ? "border-rose-500 bg-rose-50/20" : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
                } px-3 py-2`}
              />
              {fieldErrors.amount && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.amount}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Payment method</label>
              <select
                value={paymentMode}
                onChange={(event) => { setPaymentMode(event.target.value as PaymentMode); clearFieldError("referenceNumber"); }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="Cash">Cash</option><option value="UPI">UPI</option><option value="OnlineTransfer">Online transfer / NEFT / RTGS</option><option value="Cheque">Cheque</option><option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Payment date <span className="text-rose-500">*</span></label>
              <input
                type="date"
                value={paymentDate}
                aria-invalid={Boolean(fieldErrors.paymentDate)}
                onChange={(event) => { setPaymentDate(event.target.value); clearFieldError("paymentDate"); }}
                className={`mt-1 w-full rounded-lg border ${
                  fieldErrors.paymentDate ? "border-rose-500 bg-rose-50/20" : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
                } px-3 py-2`}
              />
              {fieldErrors.paymentDate && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.paymentDate}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">
                {paymentMode === "Cheque" ? "Cheque number" : "Transaction reference"}{["UPI", "OnlineTransfer", "Cheque"].includes(paymentMode) ? <span className="text-rose-500"> *</span> : ""}
              </label>
              <input
                maxLength={100}
                value={referenceNumber}
                aria-invalid={Boolean(fieldErrors.referenceNumber)}
                onChange={(event) => { setReferenceNumber(event.target.value); clearFieldError("referenceNumber"); }}
                placeholder={["UPI", "OnlineTransfer", "Cheque"].includes(paymentMode) ? "Required reference ID" : "Optional"}
                className={`mt-1 w-full rounded-lg border ${
                  fieldErrors.referenceNumber ? "border-rose-500 bg-rose-50/20" : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
                } px-3 py-2`}
              />
              {fieldErrors.referenceNumber && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.referenceNumber}</p>}
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="text-sm font-medium">Note (optional)</label>
              <input maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
            </div>
          </div>
          <Button type="submit" disabled={saving}>{saving ? "Recording…" : "Record payment"}</Button>
        </form>
      ) : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">This bill is fully paid.</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800"><h2 className="text-lg font-semibold">Payment history</h2></div>
        {payments.length === 0 ? <p className="p-5 text-sm text-slate-500">No payments have been recorded.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Note</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{payments.map((payment) => <tr key={payment.id}><td className="px-4 py-3">{payment.paymentDate}</td><td className="px-4 py-3">{payment.paymentMode === "OnlineTransfer" ? "Online transfer" : payment.paymentMode}</td><td className="px-4 py-3">{payment.referenceNumber || "—"}</td><td className="px-4 py-3 text-right">{currency(payment.amount)}</td><td className="px-4 py-3">{payment.note || "—"}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </section>
  );
}

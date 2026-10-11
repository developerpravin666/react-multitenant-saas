import { useState, useEffect, useMemo, type FormEvent } from "react";
import { X, CheckCircle2, DollarSign, ArrowRight, Zap, RefreshCw, AlertCircle, FileText, Sparkles, Lightbulb } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { apiClient } from "../../../../services/apiClient";
import { useNotifications } from "../../../../context/NotificationContext";
import { CustomerAdvancePanel } from "./CustomerAdvancePanel";
import type {
  CustomerUnpaidInvoicesSummary,
  UnpaidCustomerInvoice,
  PaymentAllocationResult
} from "../types/salesInvoice.types";

interface Props {
  initialCustomerId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const currency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function MultiInvoicePaymentModal({ initialCustomerId, onClose, onSuccess }: Props) {
  const notifications = useNotifications();

  // Customer state
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; mobile: string }>>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || "");
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Invoices state
  const [summary, setSummary] = useState<CustomerUnpaidInvoicesSummary | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isFifo, setIsFifo] = useState<boolean>(true);

  // Custom allocation map: invoiceId -> amount
  const [customAllocations, setCustomAllocations] = useState<Record<string, number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PaymentAllocationResult | null>(null);

  // Load customer list if no initial customer
  useEffect(() => {
    async function loadCustomers() {
      setLoadingCustomers(true);
      try {
        const list = await apiClient.get<Array<{ id: string; name: string; mobile: string }>>("/customers?limit=100");
        setCustomers(list);
        if (!selectedCustomerId && list[0]) {
          setSelectedCustomerId(list[0].id);
        }
      } catch {
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    }
    void loadCustomers();
  }, []);

  // Load customer unpaid invoices when customerId changes
  useEffect(() => {
    let active = true;
    setSummary(null);
    setCustomAllocations({});
    setPaymentAmount(0);
    if (!selectedCustomerId) {
      setSummary(null);
      return;
    }
    async function loadInvoices() {
      setLoadingInvoices(true);
      try {
        const res = await apiClient.get<CustomerUnpaidInvoicesSummary>(
          `/sales/invoices/unpaid-by-customer/${selectedCustomerId}`
        );
        if (!active) return;
        setSummary(res);
        // Pre-fill payment amount with total outstanding if unset
        setPaymentAmount(res.totalOutstanding);
      } catch (err) {
        if (!active) return;
        setSummary(null);
        notifications.error("Error", "Could not load customer invoices.");
      } finally {
        if (active) setLoadingInvoices(false);
      }
    }
    void loadInvoices();
    return () => { active = false; };
  }, [selectedCustomerId, notifications]);

  // FIFO live allocation preview computation
  const fifoAllocations = useMemo(() => {
    if (!summary || !isFifo) return {};
    let rem = Number(paymentAmount || 0);
    const allocMap: Record<string, number> = {};

    for (const inv of summary.invoices) {
      if (rem <= 0) {
        allocMap[inv.invoiceId] = 0;
      } else {
        const alloc = Math.min(inv.balance, rem);
        allocMap[inv.invoiceId] = alloc;
        rem -= alloc;
      }
    }
    return allocMap;
  }, [summary, isFifo, paymentAmount]);

  // Effective allocation map
  const effectiveAllocations = isFifo ? fifoAllocations : customAllocations;

  // Total allocated vs advance computation
  const totalAllocated = useMemo(() => {
    return Object.values(effectiveAllocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [effectiveAllocations]);

  const unallocatedAdvance = Math.max(0, Number(paymentAmount || 0) - totalAllocated);

  const settlementStats = useMemo(() => {
    if (!summary) return { fullyPaid: 0, partiallyPaid: 0 };
    let fullyPaid = 0;
    let partiallyPaid = 0;
    for (const inv of summary.invoices) {
      const alloc = effectiveAllocations[inv.invoiceId] || 0;
      if (alloc >= inv.balance && inv.balance > 0) {
        fullyPaid++;
      } else if (alloc > 0) {
        partiallyPaid++;
      }
    }
    return { fullyPaid, partiallyPaid };
  }, [summary, effectiveAllocations]);

  const handleCustomAllocChange = (invoiceId: string, val: number, max: number) => {
    const clamped = Math.min(max, Math.max(0, val));
    setCustomAllocations((prev) => ({ ...prev, [invoiceId]: clamped }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      notifications.error("No Customer", "Please select a customer.");
      return;
    }
    if (paymentAmount <= 0) {
      notifications.error("Invalid Amount", "Please enter a valid payment amount greater than zero.");
      return;
    }

    if (totalAllocated > paymentAmount) { notifications.error("Invalid Allocation", "Allocated amounts exceed the payment received."); return; }
    setSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        totalPaymentAmount: paymentAmount,
        paymentMode,
        paymentDate,
        referenceNumber: referenceNumber.trim() || null,
        note: note.trim() || null,
        autoAllocateFifo: isFifo,
        specificAllocations: !isFifo
          ? Object.entries(customAllocations)
            .filter(([, amt]) => amt > 0)
            .map(([id, amt]) => ({ invoiceId: id, allocatedAmount: amt }))
          : null,
      };

      const res = await apiClient.post<PaymentAllocationResult>(
        "/sales/invoices/allocate-payment",
        payload
      );
      setResult(res);
      notifications.success("Payment Allocated", `Successfully posted ${currency(res.totalPaymentAmount)}.`);
      onSuccess();
    } catch (err) {
      notifications.error("Allocation Failed", err instanceof Error ? err.message : "Failed to allocate payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X size={18} />
        </button>

        {summary && !result && <CustomerAdvancePanel customerId={selectedCustomerId} invoices={summary.invoices} onChanged={onSuccess} />}
        {/* Success Result View */}
        {result ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Payment Successfully Allocated
            </h2>
            <p className="text-xs text-slate-500">
              Received {currency(result.totalPaymentAmount)} from <strong>{result.customerName}</strong> via {result.paymentMode} on {result.paymentDate}.
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950">
              <h3 className="text-xs font-semibold uppercase text-slate-500 mb-2">Invoice Settlement Breakdown</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-1">Bill #</th>
                    <th className="py-1 text-right">Prev Balance</th>
                    <th className="py-1 text-right">Settled</th>
                    <th className="py-1 text-right">New Balance</th>
                    <th className="py-1 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {result.allocations.map((a) => (
                    <tr key={a.invoiceId}>
                      <td className="py-1.5 font-semibold">{a.billNumber}</td>
                      <td className="py-1.5 text-right text-slate-500">{currency(a.previousBalance)}</td>
                      <td className="py-1.5 text-right font-medium text-emerald-600">+{currency(a.amountAllocated)}</td>
                      <td className="py-1.5 text-right font-semibold">{currency(a.remainingBalance)}</td>
                      <td className="py-1.5 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.newStatus === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>
                          {a.newStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {result.unallocatedAdvance > 0 && (
                <div className="mt-3 flex justify-between border-t border-slate-200 pt-2 text-xs font-semibold text-purple-700 dark:text-purple-300">
                  <span>Advance On-Account Balance:</span>
                  <span>{currency(result.unallocatedAdvance)}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button onClick={onClose} className="w-full">
                Done & Close
              </Button>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            <header className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Zap size={18} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Smart Multi-Invoice Payment Allocation
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Collect a lumpsum payment and auto-settle multiple outstanding bills (FIFO or custom).
                  </p>
                </div>
              </div>
            </header>

            {/* Smart Settle Assistant Banner */}
            <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-blue-50/80 p-3 text-xs text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200">
              <div className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs dark:bg-indigo-500">
                  <Lightbulb size={14} />
                </span>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-indigo-950 dark:text-indigo-100">
                    <span>💡 Smart Settle Assistant</span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300">
                      Zero Accounting Knowledge Needed
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-indigo-900/80 dark:text-indigo-300/80">
                    Keep <strong>Auto-Allocate FIFO</strong> selected. The customer’s payment automatically clears their oldest outstanding bills first. Any extra money paid is safely preserved as an <strong>Advance Store Credit</strong> on their account for future visits!
                  </p>
                </div>
              </div>
            </div>

            {/* Customer selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Customer *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                disabled={Boolean(initialCustomerId)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobile})
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Outstanding Header */}
            {summary && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 dark:border-blue-900 dark:bg-blue-950/40">
                <div>
                  <span className="text-xs text-blue-700 dark:text-blue-300">Total Outstanding Due:</span>
                  <div className="text-xl font-black text-blue-950 dark:text-blue-100">
                    {currency(summary.totalOutstanding)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {summary.invoices.length} unpaid bill(s)
                  </span>
                  <p className="text-[11px] text-slate-400">Oldest to newest invoice sequence</p>
                </div>
              </div>
            )}

            {/* Smart Amount Quick-Suggest Chips */}
            {summary && summary.totalOutstanding > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Sparkles size={13} className="text-amber-500" />
                  <span>💡 Smart Suggestion (1-Click Fill):</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(summary.totalOutstanding)}
                    className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  >
                    Clear All Dues ({currency(summary.totalOutstanding)})
                  </button>
                  {summary.totalOutstanding > 100 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(Math.round(summary.totalOutstanding / 2))}
                      className="rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                    >
                      Pay Half ({currency(Math.round(summary.totalOutstanding / 2))})
                    </button>
                  )}
                  {Math.ceil(summary.totalOutstanding / 1000) * 1000 > summary.totalOutstanding && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(Math.ceil(summary.totalOutstanding / 1000) * 1000)}
                      className="rounded-md border border-purple-300 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-800 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                    >
                      Round Figure ({currency(Math.ceil(summary.totalOutstanding / 1000) * 1000)})
                    </button>
                  )}
                  {[1000, 2000, 5000].filter(amt => amt < summary.totalOutstanding && amt !== Math.round(summary.totalOutstanding / 2)).map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPaymentAmount(amt)}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {currency(amt)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Input Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="mt-1 w-full text-base font-bold text-slate-900 rounded-lg border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Mode *</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Bank">Bank Transfer / NEFT</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Reference / Cheque / UTR #
                </label>
                <input
                  type="text"
                  placeholder="Optional reference"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Memo / Note</label>
                <input
                  type="text"
                  placeholder="Optional note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Live Settlement Suggestion Preview */}
            {summary && summary.invoices.length > 0 && paymentAmount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 p-2.5 text-xs text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Will clear <strong>{settlementStats.fullyPaid}</strong> bill(s) completely
                    {settlementStats.partiallyPaid > 0 ? " and partially pay 1 bill" : ""}.
                  </span>
                </div>
                {unallocatedAdvance > 0 && (
                  <span className="rounded bg-purple-100 px-2 py-0.5 font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    + {currency(unallocatedAdvance)} saved safely as Customer Advance
                  </span>
                )}
              </div>
            )}

            {/* Allocation Strategy Selection */}
            <div className="flex items-center gap-4 rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-slate-800/50">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Allocation Mode:</span>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-900 dark:text-slate-100">
                <input
                  type="radio"
                  name="allocMode"
                  checked={isFifo}
                  onChange={() => setIsFifo(true)}
                  className="accent-blue-600"
                />
                Auto-Allocate FIFO (Oldest First)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-900 dark:text-slate-100">
                <input
                  type="radio"
                  name="allocMode"
                  checked={!isFifo}
                  onChange={() => setIsFifo(false)}
                  className="accent-blue-600"
                />
                Custom Manual Split
              </label>
            </div>

            {/* Invoices List Table */}
            {summary && summary.invoices.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-800">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950">
                        <th className="py-2 pl-3">Invoice #</th>
                        <th className="py-2">Date</th>
                        <th className="py-2 text-right">Invoice Total</th>
                        <th className="py-2 text-right">Balance Due</th>
                        <th className="py-2 pr-3 text-right" style={{ width: "140px" }}>
                          Allocated (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {summary.invoices.map((inv) => {
                        const alloc = effectiveAllocations[inv.invoiceId] || 0;
                        const isFullyPaid = alloc >= inv.balance;

                        return (
                          <tr key={inv.invoiceId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <td className="py-2 pl-3 font-semibold text-slate-900 dark:text-slate-100">
                              {inv.billNumber}
                            </td>
                            <td className="py-2 text-slate-500">{inv.invoiceDate}</td>
                            <td className="py-2 text-right text-slate-500">{currency(inv.totalAmount)}</td>
                            <td className="py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                              {currency(inv.balance)}
                            </td>
                            <td className="py-2 pr-3 text-right">
                              {isFifo ? (
                                <span className={`inline-block rounded px-2 py-0.5 font-bold ${alloc > 0
                                    ? isFullyPaid
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                    : "text-slate-400"
                                  }`}>
                                  {currency(alloc)}
                                </span>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={inv.balance}
                                  value={customAllocations[inv.invoiceId] || 0}
                                  onChange={(e) =>
                                    handleCustomAllocChange(inv.invoiceId, Number(e.target.value), inv.balance)
                                  }
                                  className="w-28 rounded border border-slate-300 py-1 text-right text-xs dark:border-slate-700 dark:bg-slate-800"
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Allocation summary row */}
                <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
                  <div>
                    <span className="text-slate-500">Total Settled: </span>
                    <strong className="text-emerald-700 dark:text-emerald-400">{currency(totalAllocated)}</strong>
                  </div>
                  {unallocatedAdvance > 0 && (
                    <div className="rounded bg-purple-100 px-2 py-0.5 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold">
                      Advance Credit (On-Account): {currency(unallocatedAdvance)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {summary && summary.invoices.length === 0 && (
              <div className="rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                This customer has no unpaid invoices. Any payment will be recorded as an On-Account Advance credit.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || paymentAmount <= 0}>
                {submitting ? "Allocating…" : `Apply & Post ${currency(paymentAmount)}`}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


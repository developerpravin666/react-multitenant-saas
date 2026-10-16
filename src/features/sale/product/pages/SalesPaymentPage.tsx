import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "../../../../components/ui/Button";
import { apiClient } from "../../../../services/apiClient";
import type { FormFieldConfig } from "../../../../types/form";
import { DynamicForm } from "../../../dynamic-form/DynamicForm";
import type { SaleRecord } from "../types/sale.types";
import { generateEmiSchedule } from "../components/FinanceEmiModal";
import type { SalesBillDetails, SalesReceipt } from "../../accounting/types/salesAccounting.types";
import {
  Calendar,
  CreditCard,
  Building2,
  AlertCircle,
  Copy,
  Check,
  Plus,
  Receipt,
  Wallet,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatDate } from "../../../../lib/date";
import { z } from "zod";
import { useNotifications } from "../../../../context/NotificationContext";

type PaymentMode = "Cash" | "Finance";
type CashMethod = "Cash" | "UPI" | "OnlineTransfer" | "Cheque" | "Other";

interface FinanceVendorOption {
  id: string;
  name: string;
  code: string;
}

interface SalesPaymentRecord {
  id: string;
  salesProductId: string;
  paymentMode: PaymentMode;
  financeVendorId: string | null;
  financeVendorName: string | null;
  downPayment: number | null;
  numberOfEmi: number | null;
  emiAmount: number | null;
  hasInsurance: boolean | null;
  insuranceAmount: number | null;
  firstInstallmentDate: string | null;
}

const financeFields: FormFieldConfig[] = [
  {
    id: "financeVendorId",
    name: "financeVendorId",
    label: "Finance Company",
    type: "select",
    required: true,
    options: [],
    placeholder: "Choose a finance company",
  },
  {
    id: "downPayment",
    name: "downPayment",
    label: "Down Payment (Initial Customer Deposit)",
    type: "number",
    required: true,
    min: 0,
    step: 1,
  },
  {
    id: "numberOfEmi",
    name: "numberOfEmi",
    label: "Number of EMIs (Months)",
    type: "number",
    required: true,
    min: 1,
    step: 1,
  },
  {
    id: "emiAmount",
    name: "emiAmount",
    label: "Monthly EMI Amount",
    type: "number",
    required: true,
    min: 1,
    step: 1,
  },
  {
    id: "firstInstallmentDate",
    name: "firstInstallmentDate",
    label: "First EMI Due Date",
    type: "date",
    required: true,
  },
  {
    id: "hasInsurance",
    name: "hasInsurance",
    label: "Insurance Included?",
    type: "select",
    required: true,
    options: [
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ],
  },
  {
    id: "insuranceAmount",
    name: "insuranceAmount",
    label: "Insurance Amount",
    type: "number",
    min: 0,
    step: 1,
    defaultValue: 0,
    visibleWhen: { field: "hasInsurance", value: "true" },
  },
];

const formatCurrency = (val?: number | null) =>
  `₹${(val ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const todayDate = () => new Date().toISOString().slice(0, 10);

const partPaymentSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Payment amount must be a number." })
    .positive("Please enter a valid payment amount greater than zero."),
  paymentMode: z.string().min(1, "Payment method is required."),
  paymentDate: z.string().min(1, "Payment date is required."),
});

export function SalesPaymentPage() {
  const notifications = useNotifications();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [payment, setPayment] = useState<SalesPaymentRecord | null>(null);
  const [billDetails, setBillDetails] = useState<SalesBillDetails | null>(null);
  const [financeVendors, setFinanceVendors] = useState<FinanceVendorOption[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");
  const [error, setError] = useState<string | null>(null);

  // New Part Payment Form State
  const [partAmount, setPartAmount] = useState("");
  const [partMethod, setPartMethod] = useState<CashMethod>("Cash");
  const [partDate, setPartDate] = useState(todayDate());
  const [partRef, setPartRef] = useState("");
  const [partNote, setPartNote] = useState("");
  const [isRecordingPartPayment, setIsRecordingPartPayment] = useState(false);
  const [partPaymentSuccessMsg, setPartPaymentSuccessMsg] = useState<string | null>(null);
  const [partPaymentErrors, setPartPaymentErrors] = useState<Record<string, string>>({});

  // Reminder copy state
  const [copiedReminder, setCopiedReminder] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      const [saleRecord, savedPayment, vendors, accountingBill] = await Promise.all([
        apiClient.get<SaleRecord>(`/sales/products/${encodeURIComponent(id)}`),
        apiClient.get<SalesPaymentRecord | null>(`/sales/products/${encodeURIComponent(id)}/payment`).catch(() => null),
        apiClient.get<FinanceVendorOption[]>("/finance-vendors/all").catch(() => []),
        apiClient.get<SalesBillDetails>(`/sales/accounting/bills/${encodeURIComponent(id)}`).catch(() => null),
      ]);

      setSale(saleRecord);
      setPayment(savedPayment);
      setPaymentMode(savedPayment?.paymentMode ?? "Cash");
      setFinanceVendors(vendors);
      setBillDetails(accountingBill);

      if (accountingBill && accountingBill.bill) {
        setPartAmount(String(Math.max(0, accountingBill.bill.balance)));
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to load payment details.");
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  const fields = useMemo<FormFieldConfig[]>(() => {
    return financeFields.map((field) =>
      field.name === "financeVendorId"
        ? {
          ...field,
          options: financeVendors.map((vendor) => ({
            label: `${vendor.name} (${vendor.code})`,
            value: vendor.id,
          })),
        }
        : field
    );
  }, [financeVendors]);

  // Derived financial figures
  const totalBillAmount = billDetails?.bill?.totalAmount ?? sale?.totalAmount ?? sale?.sellingPrice ?? 0;
  const totalAmountPaid = billDetails?.bill?.amountPaid ?? sale?.paidAmount ?? 0;
  const remainingBalance = billDetails?.bill?.balance ?? Math.max(0, totalBillAmount - totalAmountPaid);
  const receiptsList: SalesReceipt[] = billDetails?.payments ?? [];

  // Live EMI schedule calculation for Finance view
  const numberOfEmi = payment?.numberOfEmi || 0;
  const emiAmount = payment?.emiAmount || 0;
  const firstInstallmentDate = payment?.firstInstallmentDate || null;
  const emiSchedule = useMemo(() => {
    return generateEmiSchedule(numberOfEmi, emiAmount, firstInstallmentDate);
  }, [numberOfEmi, emiAmount, firstInstallmentDate]);

  const nextDueEmi = useMemo(() => {
    return emiSchedule.find((item) => item.status === "Due Soon" || item.status === "Upcoming") || emiSchedule[0];
  }, [emiSchedule]);

  const reminderText = useMemo(() => {
    if (!sale) return "";
    const nextDate = nextDueEmi?.dueDate
      ? formatDate(nextDueEmi.dueDate)
      : "your upcoming due date";
    return `Dear ${sale.customerName}, this is a reminder regarding your finance EMI for ${sale.productName} (Sales Bill #${sale.billNumber}). Your monthly installment of ${formatCurrency(emiAmount)} is due on ${nextDate}. Please maintain sufficient balance in your linked bank account to ensure smooth auto-debit (ECS/NACH) and avoid bounce charges. Thank you!`;
  }, [sale, nextDueEmi, emiAmount]);

  const handleCopyReminder = () => {
    navigator.clipboard.writeText(reminderText);
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 2500);
  };

  // Handler to record a part / split payment
  const handleRecordPartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !sale) return;

    const amt = Number(partAmount);
    const parseResult = partPaymentSchema.safeParse({
      amount: amt,
      paymentMode: partMethod,
      paymentDate: partDate,
    });

    const errs: Record<string, string> = {};
    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        if (!errs[field]) errs[field] = issue.message;
      }
    }

    if (amt > remainingBalance + 0.01) {
      errs.amount = `Amount cannot exceed the remaining balance of ${formatCurrency(remainingBalance)}.`;
    }

    if (Object.keys(errs).length > 0) {
      setPartPaymentErrors(errs);
      notifications.error("Validation error", "Please correct the highlighted issues.");
      return;
    }

    setPartPaymentErrors({});
    setIsRecordingPartPayment(true);
    setPartPaymentSuccessMsg(null);

    try {
      // 1. Record receipt against this sales bill
      await apiClient.post(`/sales/accounting/bills/${encodeURIComponent(id)}/payments`, {
        salesProductId: id,
        amount: amt,
        paymentMode: partMethod,
        paymentDate: partDate,
        referenceNumber: partRef.trim() || null,
        note: partNote.trim() || null,
      });

      // 2. Guarantee payment mode is recorded as Cash on the sale
      await apiClient.put(`/sales/products/${encodeURIComponent(id)}/payment`, {
        salesProductId: id,
        paymentMode: "Cash",
      });

      notifications.success("Payment Recorded", `Payment of ${formatCurrency(amt)} recorded successfully!`);
      setPartPaymentSuccessMsg(`Payment of ${formatCurrency(amt)} recorded successfully!`);
      setPartAmount("");
      setPartRef("");
      setPartNote("");

      // Reload updated balance and receipts
      await loadData();
    } catch (err) {
      notifications.error("Payment Failed", err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setIsRecordingPartPayment(false);
    }
  };

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!sale || !id) {
    return <p className="text-sm text-slate-500">Loading sale details…</p>;
  }

  const initialValues = payment
    ? {
      financeVendorId: payment.financeVendorId ?? "",
      downPayment: payment.downPayment ?? 0,
      numberOfEmi: payment.numberOfEmi ?? 1,
      emiAmount: payment.emiAmount ?? 0,
      hasInsurance: payment.hasInsurance === true ? "true" : "false",
      insuranceAmount: payment.insuranceAmount ?? 0,
      firstInstallmentDate: payment.firstInstallmentDate ?? "",
    }
    : {
      financeVendorId: "",
      downPayment: 0,
      numberOfEmi: 1,
      emiAmount: 0,
      hasInsurance: "false",
      insuranceAmount: 0,
      firstInstallmentDate: "",
    };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Title & Sale Summary */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sales Payment & Customer Billing
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Bill #{sale.billNumber} · {sale.productName} · Customer: <strong className="text-slate-700 dark:text-slate-300">{sale.customerName}</strong> ({sale.customerMobile})
          </p>
        </div>

        <Link
          to="/sales/products/list"
          className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 self-start sm:self-auto"
        >
          ← Back to Sales Products Grid
        </Link>
      </div>

      {/* Bill Balance Overview Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Selling Price
          </span>
          <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalBillAmount)}
          </div>
          <span className="text-[11px] text-slate-400">Inclusive of Taxes & Discounts</span>
        </div>

        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Amount Paid
          </span>
          <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalAmountPaid)}
          </div>
          <span className="text-[11px] text-slate-400">{receiptsList.length} Payment receipt(s)</span>
        </div>

        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Remaining Balance
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-xl font-bold ${remainingBalance <= 0.01
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
                }`}
            >
              {formatCurrency(remainingBalance)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${remainingBalance <= 0.01
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : totalAmountPaid > 0
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                }`}
            >
              {remainingBalance <= 0.01 ? "Paid in Full" : totalAmountPaid > 0 ? "Partial Payment" : "Unpaid"}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {remainingBalance > 0.01 ? "Customer balance outstanding" : "Account settled"}
          </span>
        </div>
      </div>

      {/* Payment Plan Mode Switcher */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Select Payment Plan
        </h2>
        <div className="mt-3 flex flex-wrap gap-4">
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-5 py-3 text-sm font-semibold transition ${paymentMode === "Cash"
                ? "border-indigo-600 bg-indigo-50/60 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-200 shadow-xs"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
          >
            <input
              type="radio"
              name="paymentMode"
              value="Cash"
              checked={paymentMode === "Cash"}
              onChange={() => setPaymentMode("Cash")}
              className="text-indigo-600"
            />
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-indigo-600 dark:text-indigo-400" />
              <span>Cash & Part Payments (Multiple Installments)</span>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-5 py-3 text-sm font-semibold transition ${paymentMode === "Finance"
                ? "border-indigo-600 bg-indigo-50/60 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-200 shadow-xs"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
          >
            <input
              type="radio"
              name="paymentMode"
              value="Finance"
              checked={paymentMode === "Finance"}
              onChange={() => setPaymentMode("Finance")}
              className="text-indigo-600"
            />
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-indigo-600 dark:text-indigo-400" />
              <span>Finance EMI Plan (Bank / NBFC Schedule)</span>
            </div>
          </label>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODE 1: CASH & MULTIPLE PART PAYMENTS                                     */}
      {/* ========================================================================= */}
      {paymentMode === "Cash" && (
        <div className="space-y-6">
          {/* Multiple Payments Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Payment History & Receipts ({receiptsList.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Paid: <strong>{formatCurrency(totalAmountPaid)}</strong> of {formatCurrency(totalBillAmount)}
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Payment Method</th>
                    <th className="py-2.5 px-3">Reference / Transaction #</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3 text-right">Amount Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {receiptsList.map((receipt, index) => (
                    <tr key={receipt.id || index} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {receipt.paymentDate ? formatDate(receipt.paymentDate) : "—"}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {receipt.paymentMode || "Cash"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono">
                        {receipt.referenceNumber || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                        {receipt.note || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(receipt.amount)}
                      </td>
                    </tr>
                  ))}

                  {receiptsList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 text-xs">
                        No payments recorded yet. Record a full or partial cash payment below.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Multiple / Partial Payment Form */}
          {remainingBalance > 0.01 ? (
            <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm dark:border-indigo-900/60 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-indigo-100 pb-3 dark:border-indigo-900/40">
                <Plus className="size-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Add Partial / Full Payment
                </h3>
                <span className="ml-auto text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Balance Due: {formatCurrency(remainingBalance)}
                </span>
              </div>

              {partPaymentSuccessMsg && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span>{partPaymentSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleRecordPartPayment} noValidate autoComplete="off" className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={partAmount}
                      onChange={(e) => {
                        setPartAmount(e.target.value);
                        if (partPaymentErrors.amount) {
                          setPartPaymentErrors((prev) => ({ ...prev, amount: "" }));
                        }
                      }}
                      placeholder="e.g. 5000"
                      className={`w-full rounded-xl border bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 dark:bg-slate-800 dark:text-white ${partPaymentErrors.amount
                          ? "border-rose-500 dark:border-rose-500"
                          : "border-slate-300 dark:border-slate-700"
                        }`}
                    />
                    {partPaymentErrors.amount && (
                      <p role="alert" className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                        {partPaymentErrors.amount}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPartAmount(String(remainingBalance));
                          if (partPaymentErrors.amount) {
                            setPartPaymentErrors((prev) => ({ ...prev, amount: "" }));
                          }
                        }}
                        className="text-[10px] text-indigo-600 hover:underline dark:text-indigo-400 font-semibold cursor-pointer"
                      >
                        Set Full Remaining ({formatCurrency(remainingBalance)})
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={partMethod}
                      onChange={(e) => setPartMethod(e.target.value as CashMethod)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                      <option value="OnlineTransfer">Bank NEFT / IMPS / RTGS</option>
                      <option value="Cheque">Bank Cheque</option>
                      <option value="Other">Debit / Credit Card / Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      value={partDate}
                      onChange={(e) => {
                        setPartDate(e.target.value);
                        if (partPaymentErrors.paymentDate) {
                          setPartPaymentErrors((prev) => ({ ...prev, paymentDate: "" }));
                        }
                      }}
                      className={`w-full rounded-xl border bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:bg-slate-800 dark:text-white ${partPaymentErrors.paymentDate
                          ? "border-rose-500 dark:border-rose-500"
                          : "border-slate-300 dark:border-slate-700"
                        }`}
                    />
                    {partPaymentErrors.paymentDate && (
                      <p role="alert" className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                        {partPaymentErrors.paymentDate}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Transaction Ref / Cheque # (Optional)
                    </label>
                    <input
                      type="text"
                      value={partRef}
                      onChange={(e) => setPartRef(e.target.value)}
                      placeholder="e.g. UPI-123456789 or Chq #0045"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Notes / Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      value={partNote}
                      onChange={(e) => setPartNote(e.target.value)}
                      placeholder="e.g. Part payment round 1"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={isRecordingPartPayment}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="size-3.5" />
                    <span>{isRecordingPartPayment ? "Recording Payment…" : "Record Payment Entry"}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 text-center text-xs dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <CheckCircle2 className="size-6 text-emerald-600 mx-auto mb-1" />
              <div className="font-bold text-emerald-900 dark:text-emerald-200">
                This sales bill is fully settled!
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Total paid: {formatCurrency(totalAmountPaid)}. Remaining balance: ₹0.00.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: FINANCE DETAILS & EMI SCHEDULE REMINDERS                          */}
      {/* ========================================================================= */}
      {paymentMode === "Finance" && (
        <div className="space-y-6">
          {financeVendors.length === 0 && (
            <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              No finance vendors configured. Add an active finance company under Settings → Finance Vendors.
            </div>
          )}

          {/* Finance Setup Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <DynamicForm
              key="finance-form"
              title="Finance EMI Configuration"
              description="Enter the finance company, customer down payment, monthly EMI schedule, and insurance details."
              fields={fields}
              initialValues={initialValues}
              submitLabel={payment ? "Update Finance Details" : "Record Finance Plan"}
              onCancel={() => navigate("/sales/products/list")}
              onSubmit={async (values) => {
                const hasInsurance = String(values.hasInsurance) === "true";
                if (hasInsurance && Number(values.insuranceAmount) <= 0) {
                  throw new Error("Enter an insurance amount greater than zero.");
                }

                const body = {
                  salesProductId: id,
                  paymentMode: "Finance",
                  financeVendorId: String(values.financeVendorId),
                  downPayment: Number(values.downPayment),
                  numberOfEmi: Number(values.numberOfEmi),
                  emiAmount: Number(values.emiAmount),
                  hasInsurance,
                  insuranceAmount: hasInsurance ? Number(values.insuranceAmount) : 0,
                  firstInstallmentDate: String(values.firstInstallmentDate || ""),
                };

                await apiClient.put<SalesPaymentRecord>(`/sales/products/${encodeURIComponent(id)}/payment`, body);
                await loadData();
              }}
            />
          </div>

          {/* EMI Schedule & Reminder Section */}
          {numberOfEmi > 0 && emiAmount > 0 && (
            <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm dark:border-indigo-900/60 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3 dark:border-indigo-900/40">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Finance List of EMIs Details & Due Dates
                  </h3>
                </div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {numberOfEmi} Monthly EMIs × {formatCurrency(emiAmount)}
                </span>
              </div>

              {/* Customer Due Date & Bank Balance Reminder Alert */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/30">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                    <div>
                      <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                        <span>Customer Auto-Debit & Due Date Reminder Notice</span>
                        {nextDueEmi && (
                          <span className="rounded-full bg-indigo-200/80 px-2 py-0.2 text-[10px] font-extrabold text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200">
                            Upcoming Due: {formatDate(nextDueEmi.dueDate)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                        Remind customer to <strong>maintain sufficient balance</strong> in their registered bank account on or before the due date for auto-debit (ECS/NACH mandate) to avoid bounce charges and maintain their credit rating.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyReminder}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-xs hover:bg-indigo-50 border border-indigo-200 dark:bg-slate-800 dark:border-indigo-800 dark:text-indigo-300 cursor-pointer shrink-0"
                    title="Copy reminder message to send via WhatsApp or SMS"
                  >
                    {copiedReminder ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    <span>{copiedReminder ? "Copied to Clipboard!" : "Copy WhatsApp/SMS Reminder"}</span>
                  </button>
                </div>
              </div>

              {/* EMI List Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Installment #</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">Installment Amount</th>
                      <th className="py-2.5 px-3 text-right">Schedule Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {emiSchedule.map((item) => (
                      <tr key={item.installmentNumber} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          EMI Installment #{item.installmentNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                          {formatDate(item.dueDate)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${item.status === "Due Soon"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse"
                                : item.status === "Overdue"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                          >
                            {item.status}
                            {item.daysRemaining !== undefined && item.daysRemaining >= 0 && (
                              <span className="ml-1 opacity-75">
                                ({item.daysRemaining === 0 ? "Today" : `${item.daysRemaining}d`})
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation footer */}
      <div className="flex justify-end pt-2">
        <Button variant="secondary" onClick={() => navigate("/sales/products/list")}>
          Return to Sales Products Grid
        </Button>
      </div>
    </div>
  );
}

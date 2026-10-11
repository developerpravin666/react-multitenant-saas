import { useState, useMemo } from "react";
import {
  Calendar,
  CreditCard,
  Building2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  X,
  ExternalLink,
  Wallet,
} from "lucide-react";
import type { SaleRecord, EmiScheduleItem } from "../types/sale.types";

interface FinanceEmiModalProps {
  sale: SaleRecord;
  onClose: () => void;
}

export function generateEmiSchedule(
  numberOfEmi: number,
  emiAmount: number,
  firstInstallmentDateStr?: string | null
): EmiScheduleItem[] {
  if (!numberOfEmi || numberOfEmi <= 0) return [];
  const items: EmiScheduleItem[] = [];
  const baseDate = firstInstallmentDateStr ? new Date(firstInstallmentDateStr) : new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < numberOfEmi; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let status: EmiScheduleItem["status"] = "Upcoming";
    if (diffDays < 0) {
      status = "Overdue";
    } else if (diffDays <= 7) {
      status = "Due Soon";
    }

    items.push({
      installmentNumber: i + 1,
      dueDate: dueDate.toISOString().slice(0, 10),
      amount: emiAmount,
      status,
      daysRemaining: diffDays,
    });
  }
  return items;
}

const formatCurrency = (val?: number | null) =>
  `₹${(val ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function FinanceEmiModal({ sale, onClose }: FinanceEmiModalProps) {
  const [copied, setCopied] = useState(false);

  const numberOfEmi = sale.numberOfEmi || 0;
  const emiAmount = sale.emiAmount || 0;
  const downPayment = sale.downPayment || 0;
  const totalAmount = sale.totalAmount || sale.sellingPrice;
  const financedAmount = Math.max(0, totalAmount - downPayment);

  const schedule = useMemo(() => {
    return generateEmiSchedule(numberOfEmi, emiAmount, sale.firstInstallmentDate);
  }, [numberOfEmi, emiAmount, sale.firstInstallmentDate]);

  const nextDueEmi = useMemo(() => {
    return schedule.find((item) => item.status === "Due Soon" || item.status === "Upcoming") || schedule[0];
  }, [schedule]);

  const reminderMessage = useMemo(() => {
    const nextDate = nextDueEmi?.dueDate ? new Date(nextDueEmi.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "the upcoming due date";
    return `Dear ${sale.customerName}, this is a gentle reminder regarding your EMI for ${sale.productName} (Bill #${sale.billNumber}). Your upcoming monthly installment of ${formatCurrency(emiAmount)} is scheduled for ${nextDate}. Kindly ensure sufficient balance in your linked bank account for smooth auto-debit (ECS/NACH) to avoid bank bounce charges and maintain a healthy credit score. Thank you!`;
  }, [sale, nextDueEmi, emiAmount]);

  const copyReminder = () => {
    navigator.clipboard.writeText(reminderMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                <CreditCard className="size-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Finance EMI Details & Schedule
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Bill #{sale.billNumber} · {sale.customerName} ({sale.customerMobile}) · {sale.productName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Finance Overview Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-[11px] font-semibold text-slate-400">Finance Partner</span>
            <div className="mt-0.5 font-bold text-slate-900 dark:text-white flex items-center gap-1 truncate">
              <Building2 className="size-3 text-indigo-600 shrink-0" />
              <span className="truncate">{sale.financeVendorName || "Financed"}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-[11px] font-semibold text-slate-400">Down Payment</span>
            <div className="mt-0.5 font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(downPayment)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-[11px] font-semibold text-slate-400">Financed Loan</span>
            <div className="mt-0.5 font-bold text-slate-900 dark:text-white">
              {formatCurrency(financedAmount)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-[11px] font-semibold text-slate-400">Monthly EMI</span>
            <div className="mt-0.5 font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(emiAmount)} × {numberOfEmi}
            </div>
          </div>
        </div>

        {/* Due Date & Bank Maintenance Reminder Box */}
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
              <div>
                <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                  <span>Customer EMI & Auto-Debit Reminder</span>
                  {nextDueEmi && (
                    <span className="rounded-full bg-indigo-200/80 px-2 py-0.2 text-[10px] font-extrabold text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200">
                      Next Due: {new Date(nextDueEmi.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  Remind customer to <strong>maintain sufficient account balance</strong> prior to due date to guarantee seamless auto-debit debit (NACH/e-Mandate) and avoid bounce penalty fees.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={copyReminder}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-700 shadow-xs hover:bg-indigo-50 border border-indigo-200 dark:bg-slate-800 dark:border-indigo-800 dark:text-indigo-300 cursor-pointer shrink-0"
              title="Copy WhatsApp / SMS reminder message"
            >
              {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
              <span>{copied ? "Copied Message!" : "Copy Reminder"}</span>
            </button>
          </div>
        </div>

        {/* EMI Schedule List */}
        <div className="mt-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="size-3.5 text-slate-400" />
              <span>Installment Schedule ({schedule.length} Months)</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              1st EMI: {sale.firstInstallmentDate ? new Date(sale.firstInstallmentDate).toLocaleDateString("en-IN") : "Not specified"}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Installment</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {schedule.map((item) => (
                  <tr key={item.installmentNumber} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      EMI #{item.installmentNumber}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {new Date(item.dueDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          item.status === "Due Soon"
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

                {schedule.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400">
                      No EMI schedule available. Ensure number of EMIs and first installment date are set.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800 text-xs">
          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
            Customer: {sale.customerMobile}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


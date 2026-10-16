import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Landmark,
  Plus,
  RefreshCw,
  Undo2,
  Wallet,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { apiClient, type PagedData } from "../../../services/apiClient";
import { useNotifications } from "../../../context/NotificationContext";

interface ContraAccount {
  id: string;
  code: string;
  name: string;
  type: number;
  currentBalance: number;
}

interface ContraVoucher {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  fromLedgerId: string;
  fromLedgerName: string;
  fromLedgerCode: string;
  toLedgerId: string;
  toLedgerName: string;
  toLedgerCode: string;
  amount: number;
  referenceNumber?: string | null;
  instrumentType?: string | null;
  clearingDate?: string | null;
  narration: string;
  isReversed: boolean;
  reversalOfJournalEntryId?: string | null;
  postedAt: string;
}

const inputClass =
  "min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

const INSTRUMENT_TYPES = [
  "Cash",
  "Cheque",
  "NEFT",
  "RTGS",
  "IMPS",
  "UPI",
  "NetBanking",
  "Internal Transfer",
];

export function ContraVoucherPage() {
  const notifications = useNotifications();
  const [accounts, setAccounts] = useState<ContraAccount[]>([]);
  const [vouchers, setVouchers] = useState<ContraVoucher[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [fromLedgerId, setFromLedgerId] = useState("");
  const [toLedgerId, setToLedgerId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [instrumentType, setInstrumentType] = useState("Cash");
  const [clearingDate, setClearingDate] = useState("");
  const [narration, setNarration] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, page] = await Promise.all([
        apiClient.get<ContraAccount[]>("/general-ledger/contra/accounts"),
        apiClient.get<PagedData<ContraVoucher>>(
          "/general-ledger/contra?page=1&pageSize=50"
        ),
      ]);
      setAccounts(accs || []);
      setVouchers(page?.items || []);
    } catch (cause) {
      notifications.error(
        "Failed to load contra data",
        cause instanceof Error ? cause.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [notifications]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Derived Account Objects & Projected Balances
  const fromAccount = accounts.find((a) => a.id === fromLedgerId);
  const toAccount = accounts.find((a) => a.id === toLedgerId);
  const transferNum = typeof amount === "number" && !isNaN(amount) ? amount : 0;

  const fromCurrent = fromAccount ? fromAccount.currentBalance : 0;
  const fromProjected = fromAccount ? fromCurrent - transferNum : 0;

  const toCurrent = toAccount ? toAccount.currentBalance : 0;
  const toProjected = toAccount ? toCurrent + transferNum : 0;

  // Auto-fill suggested narration when accounts change
  const handleAccountChange = (type: "from" | "to", id: string) => {
    if (type === "from") {
      setFromLedgerId(id);
      clearError("fromLedgerId");
      if (toLedgerId && id) {
        const src = accounts.find((a) => a.id === id);
        const dst = accounts.find((a) => a.id === toLedgerId);
        if (src && dst) suggestNarration(src, dst);
      }
    } else {
      setToLedgerId(id);
      clearError("toLedgerId");
      if (fromLedgerId && id) {
        const src = accounts.find((a) => a.id === fromLedgerId);
        const dst = accounts.find((a) => a.id === id);
        if (src && dst) suggestNarration(src, dst);
      }
    }
  };

  const suggestNarration = (src: ContraAccount, dst: ContraAccount) => {
    const isSrcCash = src.name.toLowerCase().includes("cash") || src.code === "1000";
    const isDstBank = dst.name.toLowerCase().includes("bank") || dst.code === "1010";
    const isSrcBank = src.name.toLowerCase().includes("bank") || src.code === "1010";
    const isDstCash = dst.name.toLowerCase().includes("cash") || dst.code === "1000";

    if (isSrcCash && isDstBank) {
      setNarration(`Cash deposited into ${dst.name}`);
      setInstrumentType("Cash");
    } else if (isSrcBank && isDstCash) {
      setNarration(`Cash withdrawn from ${src.name} for office cash counter`);
      setInstrumentType("Cheque");
    } else {
      setNarration(`Fund transfer from ${src.name} to ${dst.name}`);
      setInstrumentType("Internal Transfer");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!voucherDate) errs.voucherDate = "Voucher date is required.";
    if (!fromLedgerId) errs.fromLedgerId = "Select source account (transfer from).";
    if (!toLedgerId) errs.toLedgerId = "Select destination account (transfer to).";
    if (fromLedgerId && toLedgerId && fromLedgerId === toLedgerId) {
      errs.toLedgerId = "Source and destination accounts must be different.";
    }
    if (!transferNum || transferNum <= 0) {
      errs.amount = "Transfer amount must be greater than zero.";
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      notifications.error("Validation error", "Please correct the highlighted errors.");
      return;
    }

    setBusy(true);
    try {
      await apiClient.post("/general-ledger/contra", {
        voucherDate,
        fromLedgerId,
        toLedgerId,
        amount: transferNum,
        referenceNumber: referenceNumber.trim() || null,
        instrumentType: instrumentType.trim() || null,
        clearingDate: clearingDate || null,
        narration: narration.trim() || null,
      });

      notifications.success(
        "Contra Voucher Posted",
        `Transferred ₹${transferNum.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })} from ${fromAccount?.name} to ${toAccount?.name}.`
      );

      // Reset form fields
      setAmount("");
      setReferenceNumber("");
      setClearingDate("");
      setNarration("");
      await loadData();
    } catch (cause) {
      notifications.error(
        "Could not post contra voucher",
        cause instanceof Error ? cause.message : "Please check your entries."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleReverse = async (voucher: ContraVoucher) => {
    if (
      !window.confirm(
        `Are you sure you want to reverse Contra Voucher ${voucher.voucherNumber}? This creates a balanced reversing journal entry.`
      )
    ) {
      return;
    }

    const reason = window.prompt("Reason for reversal (optional):") ?? "";
    setBusy(true);
    try {
      await apiClient.post(
        `/general-ledger/journals/${encodeURIComponent(voucher.id)}/reverse`,
        {
          reversalDate: new Date().toISOString().slice(0, 10),
          reason: reason.trim() || `Reversal of contra voucher ${voucher.voucherNumber}`,
        }
      );
      notifications.success("Voucher Reversed", `${voucher.voucherNumber} reversed successfully.`);
      await loadData();
    } catch (cause) {
      notifications.error(
        "Reversal Failed",
        cause instanceof Error ? cause.message : "Could not reverse voucher."
      );
    } finally {
      setBusy(false);
    }
  };

  const formatCurrency = (val: number) => {
    const abs = Math.abs(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return val >= 0 ? `₹${abs} Dr` : `₹${abs} Cr`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Contra Voucher
            </h1>
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              F4
            </span>
            <span className="text-xs text-slate-400">Tally Prime Equivalent</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Record fund transfers between Cash-in-Hand and Bank Accounts without affecting revenue or expense ledgers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void loadData()} isLoading={loading}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Main Voucher Form & Live Balance Cards */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 8 Cols: The Entry Form */}
        <div className="lg:col-span-8">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                <ArrowLeftRight size={16} className="text-indigo-600" />
                Voucher Entry
              </h2>
              <span className="text-xs text-slate-400">Keyboard Shortcut: F4</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Voucher Date */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Voucher Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  className={`${inputClass} mt-1 ${
                    formErrors.voucherDate ? "border-rose-500 bg-rose-50/20" : ""
                  }`}
                  value={voucherDate}
                  onChange={(e) => {
                    setVoucherDate(e.target.value);
                    clearError("voucherDate");
                  }}
                />
                {formErrors.voucherDate && (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.voucherDate}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Transfer Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-semibold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className={`${inputClass} pl-8 font-semibold text-slate-900 dark:text-white ${
                      formErrors.amount ? "border-rose-500 bg-rose-50/20" : ""
                    }`}
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                      setAmount(val);
                      clearError("amount");
                    }}
                  />
                </div>
                {formErrors.amount && (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.amount}</p>
                )}
              </div>
            </div>

            {/* Source and Destination Accounts */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {/* Source Account (Transfer From - Cr) */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Source Ledger (Transfer From / Cr) <span className="text-rose-500">*</span>
                </label>
                <select
                  className={`${inputClass} mt-1 ${
                    formErrors.fromLedgerId ? "border-rose-500 bg-rose-50/20" : ""
                  }`}
                  value={fromLedgerId}
                  onChange={(e) => handleAccountChange("from", e.target.value)}
                >
                  <option value="">Select Cash or Bank Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} disabled={acc.id === toLedgerId}>
                      {acc.code} · {acc.name} ({formatCurrency(acc.currentBalance)})
                    </option>
                  ))}
                </select>
                {formErrors.fromLedgerId && (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.fromLedgerId}</p>
                )}
              </div>

              {/* Destination Account (Transfer To - Dr) */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Destination Ledger (Transfer To / Dr) <span className="text-rose-500">*</span>
                </label>
                <select
                  className={`${inputClass} mt-1 ${
                    formErrors.toLedgerId ? "border-rose-500 bg-rose-50/20" : ""
                  }`}
                  value={toLedgerId}
                  onChange={(e) => handleAccountChange("to", e.target.value)}
                >
                  <option value="">Select Cash or Bank Account</option>
                  {accounts
                    .filter((acc) => acc.id !== fromLedgerId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} · {acc.name} ({formatCurrency(acc.currentBalance)})
                      </option>
                    ))}
                </select>
                {formErrors.toLedgerId && (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.toLedgerId}</p>
                )}
              </div>
            </div>

            {/* Instrument Details */}
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Payment Mode / Instrument
                </label>
                <select
                  className={`${inputClass} mt-1`}
                  value={instrumentType}
                  onChange={(e) => setInstrumentType(e.target.value)}
                >
                  {INSTRUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Cheque / UTR / Ref Number
                </label>
                <input
                  type="text"
                  maxLength={50}
                  placeholder="e.g. CHQ-104928 or UTR98213"
                  className={`${inputClass} mt-1`}
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Clearing Date (Optional)
                </label>
                <input
                  type="date"
                  className={`${inputClass} mt-1`}
                  value={clearingDate}
                  onChange={(e) => setClearingDate(e.target.value)}
                />
              </div>
            </div>

            {/* Narration */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Narration / Memo
              </label>
              <input
                type="text"
                maxLength={500}
                placeholder="e.g. Cash withdrawal for store counter float"
                className={`${inputClass} mt-1`}
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
              />
            </div>

            {/* Quick Action Suggestions */}
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-slate-500">
              <span className="font-medium text-slate-400">Quick Suggestions:</span>
              <button
                type="button"
                onClick={() => setNarration("Cash deposited into Bank account")}
                className="rounded bg-slate-100 px-2 py-0.5 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Cash Deposit
              </button>
              <button
                type="button"
                onClick={() =>
                  setNarration("Cash withdrawal from Bank for office cash counter")
                }
                className="rounded bg-slate-100 px-2 py-0.5 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Cash Withdrawal
              </button>
              <button
                type="button"
                onClick={() => setNarration("Inter-bank fund transfer")}
                className="rounded bg-slate-100 px-2 py-0.5 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Inter-Bank Transfer
              </button>
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setAmount("");
                  setReferenceNumber("");
                  setClearingDate("");
                  setNarration("");
                  setFormErrors({});
                }}
              >
                Clear
              </Button>
              <Button type="submit" isLoading={busy}>
                <CheckCircle2 size={16} className="mr-1.5" />
                Post Contra Voucher
              </Button>
            </div>
          </form>
        </div>

        {/* Right 4 Cols: Live Balance Preview Cards */}
        <div className="space-y-4 lg:col-span-4">
          {/* Source Account Balance Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Wallet size={14} className="text-amber-500" />
                From Account (Cr)
              </div>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {fromAccount?.code || "—"}
              </span>
            </div>

            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
              {fromAccount?.name || "Select Source Account"}
            </p>

            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
              <div className="flex justify-between text-slate-500">
                <span>Current Balance:</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {fromAccount ? formatCurrency(fromCurrent) : "—"}
                </span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>Transfer Out:</span>
                <span className="font-mono font-medium">
                  {transferNum > 0 ? `- ₹${transferNum.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between border-t border-dashed border-slate-200 pt-1 font-semibold text-slate-900 dark:border-slate-700 dark:text-white">
                <span>Projected Balance:</span>
                <span
                  className={`font-mono ${
                    fromProjected < 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {fromAccount ? formatCurrency(fromProjected) : "—"}
                </span>
              </div>
              {fromAccount && fromProjected < 0 && (
                <p className="mt-1 rounded bg-rose-50 p-1.5 text-[11px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  Warning: Projected balance will result in an overdraft / deficit.
                </p>
              )}
            </div>
          </div>

          {/* Transfer Visual Arrow */}
          <div className="flex justify-center text-slate-400">
            <ArrowRight size={20} className="rotate-90 lg:rotate-0" />
          </div>

          {/* Destination Account Balance Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Landmark size={14} className="text-emerald-500" />
                To Account (Dr)
              </div>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {toAccount?.code || "—"}
              </span>
            </div>

            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
              {toAccount?.name || "Select Destination Account"}
            </p>

            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
              <div className="flex justify-between text-slate-500">
                <span>Current Balance:</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {toAccount ? formatCurrency(toCurrent) : "—"}
                </span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Transfer In:</span>
                <span className="font-mono font-medium">
                  {transferNum > 0 ? `+ ₹${transferNum.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between border-t border-dashed border-slate-200 pt-1 font-semibold text-slate-900 dark:border-slate-700 dark:text-white">
                <span>Projected Balance:</span>
                <span className="font-mono text-emerald-600">
                  {toAccount ? formatCurrency(toProjected) : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Contra Vouchers Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Recent Contra Vouchers
          </h2>
          <span className="text-xs text-slate-500">{vouchers.length} vouchers recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950">
              <tr>
                <th className="py-2.5 px-3">Voucher #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">From (Credit)</th>
                <th className="py-2.5 px-3">To (Debit)</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3">Narration &amp; Mode</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {vouchers.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="py-2.5 px-3 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                    {v.voucherNumber}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                    {v.voucherDate}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {v.fromLedgerName}
                    </span>
                    <span className="ml-1 text-[11px] text-slate-400">({v.fromLedgerCode})</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {v.toLedgerName}
                    </span>
                    <span className="ml-1 text-[11px] text-slate-400">({v.toLedgerCode})</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                    ₹
                    {v.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                    <div>{v.narration}</div>
                    {v.referenceNumber && (
                      <span className="text-[10px] text-slate-400">
                        Ref: {v.referenceNumber}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {v.isReversed ? (
                      <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        Reversed
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Posted
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {!v.isReversed && !v.reversalOfJournalEntryId && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleReverse(v)}
                      >
                        <Undo2 size={12} className="mr-1" /> Reverse
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {vouchers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No contra vouchers posted yet. Press F4 or use the form above to record internal cash and bank transfers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


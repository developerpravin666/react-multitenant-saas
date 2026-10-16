import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { apiClient, type PagedData } from "../../../services/apiClient";
import { useNotifications } from "../../../context/NotificationContext";

interface Account {
  id: string;
  code: string;
  name: string;
  type: number;
  normalBalance: number;
  isActive: boolean;
  isSystem: boolean;
}

interface Dimension {
  id: string;
  code: string;
  name: string;
  dimensionType: string;
}

interface JournalLineRow {
  id: string;
  type: "Dr" | "Cr";
  ledgerId: string;
  debitAmount: number | "";
  creditAmount: number | "";
  lineNarration: string;
  dimensionId: string;
}

interface JournalLineSummary {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string | null;
  dimensionId?: string | null;
}

interface JournalVoucher {
  id: string;
  journalNumber: string;
  journalDate: string;
  description: string;
  sourceType?: string | null;
  sourceId?: string | null;
  postedAt: string;
  reversalOfJournalEntryId?: string | null;
  isReversed: boolean;
  lines: JournalLineSummary[];
  totalDebit: number;
  totalCredit: number;
}

const inputClass =
  "min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

const accountTypeNames = ["Asset", "Liability", "Equity", "Revenue", "Expense"];

export function JournalVoucherPage() {
  const notifications = useNotifications();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [journals, setJournals] = useState<JournalVoucher[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [referenceNumber, setReferenceNumber] = useState("");
  const [narration, setNarration] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 2 Initial Multi-Leg rows: 1 Dr and 1 Cr
  const [rows, setRows] = useState<JournalLineRow[]>([
    {
      id: "row-1",
      type: "Dr",
      ledgerId: "",
      debitAmount: "",
      creditAmount: 0,
      lineNarration: "",
      dimensionId: "",
    },
    {
      id: "row-2",
      type: "Cr",
      ledgerId: "",
      debitAmount: 0,
      creditAmount: "",
      lineNarration: "",
      dimensionId: "",
    },
  ]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [chart, dims, page] = await Promise.all([
        apiClient.get<Account[]>("/general-ledger/accounts"),
        apiClient.get<Dimension[]>("/accounting-dimensions"),
        apiClient.get<PagedData<JournalVoucher>>(
          "/general-ledger/journals?page=1&pageSize=50"
        ),
      ]);
      setAccounts(chart || []);
      setDimensions(dims || []);
      setJournals(page?.items || []);
    } catch (cause) {
      notifications.error(
        "Could not load journal data",
        cause instanceof Error ? cause.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [notifications]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Generate Reference Number
  const generateRef = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    setReferenceNumber(`JRN-${year}-${random}`);
  };

  // Row Manipulation
  const addRow = (type: "Dr" | "Cr") => {
    const newRow: JournalLineRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      ledgerId: "",
      debitAmount: type === "Dr" ? "" : 0,
      creditAmount: type === "Cr" ? "" : 0,
      lineNarration: "",
      dimensionId: "",
    };
    setRows((current) => [...current, newRow]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 2) {
      notifications.warning(
        "Minimum lines required",
        "A journal voucher requires at least two lines."
      );
      return;
    }
    setRows((current) => current.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, patch: Partial<JournalLineRow>) => {
    setRows((current) =>
      current.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...patch };
        if (patch.type === "Dr") {
          updated.creditAmount = 0;
        } else if (patch.type === "Cr") {
          updated.debitAmount = 0;
        }
        return updated;
      })
    );
  };

  // Live Totals and Validation
  const totalDebit = rows.reduce(
    (sum, r) => sum + (typeof r.debitAmount === "number" ? r.debitAmount : 0),
    0
  );
  const totalCredit = rows.reduce(
    (sum, r) => sum + (typeof r.creditAmount === "number" ? r.creditAmount : 0),
    0
  );
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced =
    totalDebit > 0 && Math.round(totalDebit * 100) === Math.round(totalCredit * 100);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!voucherDate) errs.voucherDate = "Voucher date is required.";
    if (!narration.trim()) errs.narration = "Voucher narration is required.";

    const hasMissingAccount = rows.some((r) => !r.ledgerId);
    if (hasMissingAccount) {
      errs.rows = "Select a ledger account for every line.";
    }

    if (totalDebit <= 0 || !isBalanced) {
      errs.balance = `Voucher is unbalanced. Total Debits (₹${totalDebit.toFixed(
        2
      )}) must equal Total Credits (₹${totalCredit.toFixed(2)}).`;
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      notifications.error("Validation error", "Please correct the highlighted issues.");
      return;
    }

    setBusy(true);
    try {
      const payloadLines = rows.map((r) => ({
        ledgerId: r.ledgerId,
        debitAmount: typeof r.debitAmount === "number" ? r.debitAmount : 0,
        creditAmount: typeof r.creditAmount === "number" ? r.creditAmount : 0,
        lineNarration: r.lineNarration.trim() || null,
        dimensionId: r.dimensionId || null,
      }));

      await apiClient.post("/general-ledger/journal", {
        voucherDate,
        referenceNumber: referenceNumber.trim() || null,
        narration: narration.trim(),
        lines: payloadLines,
      });

      notifications.success(
        "Journal Voucher Posted",
        `Balanced entry of ₹${totalDebit.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })} posted successfully.`
      );

      // Reset
      setNarration("");
      setReferenceNumber("");
      setFormErrors({});
      setRows([
        {
          id: `row-${Date.now()}-1`,
          type: "Dr",
          ledgerId: "",
          debitAmount: "",
          creditAmount: 0,
          lineNarration: "",
          dimensionId: "",
        },
        {
          id: `row-${Date.now()}-2`,
          type: "Cr",
          ledgerId: "",
          debitAmount: 0,
          creditAmount: "",
          lineNarration: "",
          dimensionId: "",
        },
      ]);
      await loadData();
    } catch (cause) {
      notifications.error(
        "Could not post journal",
        cause instanceof Error ? cause.message : "Please check line entries."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleReverse = async (voucher: JournalVoucher) => {
    const confirmed = await notifications.confirm({
      title: `Reverse Journal ${voucher.journalNumber}?`,
      message: "This will create an equal and opposite reversing journal entry while keeping the original intact for audit compliance.",
      variant: "warning",
      confirmLabel: "Reverse Journal",
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      await apiClient.post(
        `/general-ledger/journals/${encodeURIComponent(voucher.id)}/reverse`,
        {
          reversalDate: new Date().toISOString().slice(0, 10),
          reason: `Reversal of ${voucher.journalNumber}`,
        }
      );
      notifications.success("Journal Reversed", "Reversing entry posted successfully.");
      await loadData();
    } catch (cause) {
      notifications.error(
        "Reversal Failed",
        cause instanceof Error ? cause.message : "Could not reverse journal."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Journal Voucher
            </h1>
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              F7
            </span>
            <span className="text-xs text-slate-400">Tally Prime Equivalent</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Multi-leg adjustment entries, depreciation, prepaid expenses, accrued revenue, and non-cash ledger reclassifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void loadData()} isLoading={loading}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Main Journal Entry Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        autoComplete="off"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-purple-600" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Multi-Leg Voucher Entry
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Keyboard Shortcut: F7</span>
            <span
              className={`font-semibold ${
                isBalanced
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              Dr ₹{totalDebit.toFixed(2)} · Cr ₹{totalCredit.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Voucher Header: Date and Reference Number */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Voucher Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              className={`${inputClass} mt-1`}
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
            />
            {formErrors.voucherDate && (
              <p className="mt-1 text-xs text-rose-600">{formErrors.voucherDate}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Reference Number (Optional)
            </label>
            <div className="flex gap-1.5 mt-1">
              <input
                type="text"
                maxLength={50}
                placeholder="e.g. JRN-2026-0042"
                className={inputClass}
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={generateRef}
                title="Auto generate voucher reference"
              >
                Auto
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Voucher Narration <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              maxLength={500}
              placeholder="e.g. Monthly depreciation on store fixtures"
              className={`${inputClass} mt-1`}
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
            />
            {formErrors.narration && (
              <p className="mt-1 text-xs text-rose-600">{formErrors.narration}</p>
            )}
          </div>
        </div>

        {/* Alert when balance error or line error */}
        {formErrors.balance && (
          <div className="mt-4 rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {formErrors.balance}
          </div>
        )}
        {formErrors.rows && (
          <div className="mt-2 rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {formErrors.rows}
          </div>
        )}

        {/* Multi-Leg Table */}
        <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-3 w-16 text-center">By / To</th>
                <th className="py-2.5 px-3">Ledger Account</th>
                <th className="py-2.5 px-3 w-36 text-right">Debit (₹)</th>
                <th className="py-2.5 px-3 w-36 text-right">Credit (₹)</th>
                <th className="py-2.5 px-3 w-40">Cost Center / Dim</th>
                <th className="py-2.5 px-3">Line Narration</th>
                <th className="py-2.5 px-3 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="bg-white hover:bg-slate-50/50 dark:bg-slate-900 dark:hover:bg-slate-800/50"
                >
                  {/* By / To Toggle */}
                  <td className="py-2 px-3 text-center">
                    <select
                      className="rounded border border-slate-300 bg-slate-50 px-1 py-1 font-semibold text-xs dark:border-slate-700 dark:bg-slate-800"
                      value={row.type}
                      onChange={(e) =>
                        updateRow(row.id, {
                          type: e.target.value as "Dr" | "Cr",
                        })
                      }
                    >
                      <option value="Dr">By (Dr)</option>
                      <option value="Cr">To (Cr)</option>
                    </select>
                  </td>

                  {/* Ledger Account */}
                  <td className="py-2 px-3">
                    <select
                      className={inputClass}
                      value={row.ledgerId}
                      onChange={(e) => updateRow(row.id, { ledgerId: e.target.value })}
                    >
                      <option value="">Select Ledger Account *</option>
                      {accounts
                        .filter((a) => a.isActive)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} · {a.name} ({accountTypeNames[a.type] || "Account"})
                          </option>
                        ))}
                    </select>
                  </td>

                  {/* Debit Amount */}
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      disabled={row.type === "Cr"}
                      className={`${inputClass} text-right font-mono ${
                        row.type === "Cr"
                          ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800"
                          : ""
                      }`}
                      value={row.type === "Dr" ? row.debitAmount : ""}
                      onChange={(e) =>
                        updateRow(row.id, {
                          debitAmount:
                            e.target.value === "" ? "" : parseFloat(e.target.value),
                          creditAmount: 0,
                        })
                      }
                    />
                  </td>

                  {/* Credit Amount */}
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      disabled={row.type === "Dr"}
                      className={`${inputClass} text-right font-mono ${
                        row.type === "Dr"
                          ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800"
                          : ""
                      }`}
                      value={row.type === "Cr" ? row.creditAmount : ""}
                      onChange={(e) =>
                        updateRow(row.id, {
                          creditAmount:
                            e.target.value === "" ? "" : parseFloat(e.target.value),
                          debitAmount: 0,
                        })
                      }
                    />
                  </td>

                  {/* Dimension / Cost Center */}
                  <td className="py-2 px-3">
                    <select
                      className={inputClass}
                      value={row.dimensionId}
                      onChange={(e) =>
                        updateRow(row.id, { dimensionId: e.target.value })
                      }
                    >
                      <option value="">No Cost Center</option>
                      {dimensions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.dimensionType}: {d.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Line Narration */}
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      maxLength={250}
                      placeholder="Line memo..."
                      className={inputClass}
                      value={row.lineNarration}
                      onChange={(e) =>
                        updateRow(row.id, { lineNarration: e.target.value })
                      }
                    />
                  </td>

                  {/* Remove Button */}
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      disabled={rows.length <= 2}
                      onClick={() => removeRow(row.id)}
                      className="text-slate-400 transition hover:text-rose-500 disabled:opacity-20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Table Footer with Running Totals */}
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              <tr>
                <td colSpan={2} className="py-3 px-3 text-right uppercase text-xs text-slate-500">
                  Total (₹):
                </td>
                <td className="py-3 px-3 text-right font-mono text-sm text-indigo-600 dark:text-indigo-400">
                  ₹{totalDebit.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-sm text-indigo-600 dark:text-indigo-400">
                  ₹{totalCredit.toFixed(2)}
                </td>
                <td colSpan={3} className="py-3 px-3">
                  <div className="flex items-center justify-between">
                    {isBalanced ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 size={12} /> Balanced (₹0.00 difference)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Difference: ₹{difference.toFixed(2)}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Row Add Buttons and Submit */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addRow("Dr")}
            >
              <Plus size={13} className="mr-1" /> Add Debit (By)
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addRow("Cr")}
            >
              <Plus size={13} className="mr-1" /> Add Credit (To)
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              isLoading={busy}
              disabled={!isBalanced || totalDebit <= 0 || busy}
            >
              <CheckCircle2 size={16} className="mr-1.5" />
              Post Journal Voucher
            </Button>
          </div>
        </div>
      </form>

      {/* Recent Posted Journals List */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Recent Journal Vouchers
          </h2>
          <span className="text-xs text-slate-500">{journals.length} vouchers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950">
              <tr>
                <th className="py-2.5 px-3">Date / Number</th>
                <th className="py-2.5 px-3">Narration &amp; Line Accounts</th>
                <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {journals.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {j.journalDate}
                    </div>
                    <div className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                      {j.journalNumber}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {j.description}
                      {j.reversalOfJournalEntryId && (
                        <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          REVERSAL
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-slate-500">
                      {j.lines.map((l, i) => (
                        <span
                          key={i}
                          className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800"
                        >
                          {l.accountCode} {l.debit > 0 ? `Dr ₹${l.debit.toFixed(2)}` : `Cr ₹${l.credit.toFixed(2)}`}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                    ₹{j.totalDebit.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                    ₹{j.totalCredit.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {j.isReversed ? (
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
                    {!j.isReversed && !j.reversalOfJournalEntryId && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleReverse(j)}
                      >
                        <Undo2 size={12} className="mr-1" /> Reverse
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {journals.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No journal vouchers recorded yet.
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


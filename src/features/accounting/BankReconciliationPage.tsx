import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Check,
  Plus,
  RefreshCw,
  Sparkles,
  Lightbulb,
  ArrowDownRight,
  ArrowUpRight,
  FileSpreadsheet,
  CheckCircle2,
  X,
  UploadCloud,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { apiClient } from "../../services/apiClient";
import { useNotifications } from "../../context/NotificationContext";
import { formatDate, formatDateForApi } from "../../lib/date";
import type { AutoMatchResultDto, BankStatementSuggestionDto } from "../compliance/types/compliance.types";

type Account = { id: string; code: string; name: string; type: number; normalBalance: number; isActive: boolean };
type StatementLine = { id: string; transactionDate: string; description: string; reference: string | null; amount: number; journalLineId: string | null };
type Reconciliation = { id: string; accountId: string; accountCode: string; accountName: string; statementReference: string; startDate: string; endDate: string; openingBalance: number; closingBalance: number; isFinalized: boolean; lines: StatementLine[] };
type LedgerLine = { id: string; journalDate: string; journalNumber: string; description: string; amount: number; memo: string | null };
type DraftLine = { transactionDate: string; description: string; reference: string; amount: string };

const inputClass = "min-h-9 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";

/**
 * Robust CSV row parser supporting quoted strings with commas and escaped quotes
 */
const parseCsvRow = (row: string) =>
  row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((value) => value.trim().replace(/^"|"$/g, "").replaceAll('""', '"'));

/**
 * Native OFX (Open Financial Exchange) parser for SBI, HDFC, ICICI, Axis Bank statements
 */
function parseOfxContent(content: string): {
  lines: DraftLine[];
  openingBal?: number;
  closingBal?: number;
  startDate?: string;
  endDate?: string;
} {
  const lines: DraftLine[] = [];

  // Match all STMTTRN transaction blocks
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;

  while ((match = trnRegex.exec(content)) !== null) {
    const block = match[1] ?? "";

    // DTPOSTED (Format: YYYYMMDD or YYYYMMDDHHMMSS)
    const dateMatch = /<DTPOSTED>\s*(\d{8})/i.exec(block);
    let txnDate = "";
    if (dateMatch && dateMatch[1]) {
      const raw = dateMatch[1];
      txnDate = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    }

    // TRNAMT
    const amtMatch = /<TRNAMT>\s*([+-]?\d+(?:\.\d+)?)/i.exec(block);
    const amt = amtMatch?.[1] ?? "";

    // NAME or MEMO
    const nameMatch = /<NAME>\s*([^<\r\n]+)/i.exec(block);
    const memoMatch = /<MEMO>\s*([^<\r\n]+)/i.exec(block);
    const description = (nameMatch?.[1]?.trim() ?? "") || (memoMatch?.[1]?.trim() ?? "Bank Transaction");

    // CHECKNUM or REFNUM or FITID
    const chqMatch = /<CHECKNUM>\s*([^<\r\n]+)/i.exec(block);
    const refMatch = /<REFNUM>\s*([^<\r\n]+)/i.exec(block);
    const fitidMatch = /<FITID>\s*([^<\r\n]+)/i.exec(block);
    const reference = (chqMatch?.[1]?.trim() ?? "") || (refMatch?.[1]?.trim() ?? "") || (fitidMatch?.[1]?.trim() ?? "");

    if (txnDate && amt && !isNaN(Number(amt))) {
      lines.push({
        transactionDate: txnDate,
        description,
        reference,
        amount: amt,
      });
    }
  }

  // Extract balances if present
  let closingBal: number | undefined;
  const balMatch = /<LEDGERBAL>[\s\S]*?<BALAMT>\s*([+-]?\d+(?:\.\d+)?)/i.exec(content);
  if (balMatch && balMatch[1]) {
    closingBal = parseFloat(balMatch[1]);
  }

  // Extract start and end dates
  let startDate: string | undefined;
  let endDate: string | undefined;
  if (lines.length > 0) {
    const sortedDates = lines.map((l) => l.transactionDate).sort();
    startDate = sortedDates[0];
    endDate = sortedDates[sortedDates.length - 1];
  }

  return { lines, closingBal, startDate, endDate };
}

export function BankReconciliationPage() {
  const notifications = useNotifications();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [unmatched, setUnmatched] = useState<LedgerLine[]>([]);
  const [accountId, setAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([
    { transactionDate: "", description: "", reference: "", amount: "" },
  ]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Phase 7: Auto-Match & Smart Suggestions State
  const [autoMatchResult, setAutoMatchResult] = useState<AutoMatchResultDto | null>(null);
  const [showAutoMatchModal, setShowAutoMatchModal] = useState(false);
  const [suggestions, setSuggestions] = useState<BankStatementSuggestionDto[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<"statement" | "suggestions">("statement");

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const load = useCallback(async () => {
    const [chart, statements] = await Promise.all([
      apiClient.get<Account[]>("/general-ledger/accounts"),
      apiClient.get<Reconciliation[]>("/bank-reconciliations"),
    ]);
    setAccounts(chart.filter((item) => item.type === 0 && item.normalBalance === 0));
    setReconciliations(statements);
  }, []);

  useEffect(() => {
    void load().catch(() =>
      notifications.error("Unable to load reconciliation data", "Refresh the page and try again.")
    );
  }, [load, notifications]);

  // Load Suggestions
  const loadSuggestions = useCallback(async (id: string) => {
    if (!id) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const data = await apiClient.get<BankStatementSuggestionDto[]>(
        `/bank-reconciliations/${encodeURIComponent(id)}/suggestions`
      );
      setSuggestions(Array.isArray(data) ? data : []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  const selectReconciliation = async (id: string) => {
    setSelectedId(id);
    if (!id) {
      setUnmatched([]);
      setSuggestions([]);
      return;
    }
    try {
      const [unmatchedLines] = await Promise.all([
        apiClient.get<LedgerLine[]>(`/bank-reconciliations/${encodeURIComponent(id)}/unmatched-ledger`),
        loadSuggestions(id),
      ]);
      setUnmatched(unmatchedLines);
    } catch (cause) {
      notifications.error(
        "Unable to load ledger transactions",
        cause instanceof Error ? cause.message : "Please try again."
      );
    }
  };

  // Smart multi-format file import (.csv, .ofx, .qfx)
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const filename = file.name.toLowerCase();

      if (filename.endsWith(".ofx") || filename.endsWith(".qfx") || content.includes("<OFX>") || content.includes("<STMTTRN>")) {
        // OFX Parsing
        const parsed = parseOfxContent(content);
        if (parsed.lines.length > 0) {
          setDraftLines(parsed.lines);
          if (parsed.startDate && !startDate) setStartDate(parsed.startDate);
          if (parsed.endDate && !endDate) setEndDate(parsed.endDate);
          if (parsed.closingBal !== undefined && !closingBalance) setClosingBalance(parsed.closingBal.toString());
          if (!reference) setReference(`OFX-${file.name.replace(/\.[^/.]+$/, "")}`);
          notifications.success(
            "OFX Statement Parsed",
            `Successfully extracted ${parsed.lines.length} transactions from ${file.name}.`
          );
        } else {
          notifications.error("Invalid OFX file", "No statement transactions found in file.");
        }
      } else {
        // Multi-column flexible CSV parsing
        const rows = content.split(/\r?\n/).filter((r) => r.trim()).map(parseCsvRow);
        if (rows.length < 2) {
          notifications.error("Invalid CSV", "File must contain a header and transaction rows.");
          return;
        }

        const headers = (rows[0] ?? []).map((h) => h.toLowerCase().trim());
        const dateIdx = headers.findIndex((h) => h.includes("date"));
        const descIdx = headers.findIndex((h) => h.includes("desc") || h.includes("narration") || h.includes("particular") || h.includes("remark"));
        const refIdx = headers.findIndex((h) => h.includes("ref") || h.includes("chq") || h.includes("cheque") || h.includes("utr") || h.includes("id"));
        const amtIdx = headers.findIndex((h) => h === "amount" || h === "txn amount");
        const debitIdx = headers.findIndex((h) => h.includes("debit") || h.includes("dr") || h.includes("withdrawal"));
        const creditIdx = headers.findIndex((h) => h.includes("credit") || h.includes("cr") || h.includes("deposit"));

        const parsed: DraftLine[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;
          const rawDate = dateIdx >= 0 ? row[dateIdx] : row[0];
          const formattedDate = formatDateForApi(rawDate ?? "") || rawDate || "";
          const desc = descIdx >= 0 ? row[descIdx] : row[1] || "";
          const ref = refIdx >= 0 ? row[refIdx] : (row[2] || "");

          let amt = "";
          if (amtIdx >= 0 && row[amtIdx]) {
            amt = (row[amtIdx] ?? "").replace(/,/g, "");
          } else if (debitIdx >= 0 || creditIdx >= 0) {
            const dr = parseFloat(((debitIdx >= 0 ? row[debitIdx] : undefined) || "0").replace(/,/g, "")) || 0;
            const cr = parseFloat(((creditIdx >= 0 ? row[creditIdx] : undefined) || "0").replace(/,/g, "")) || 0;
            if (cr > 0) amt = cr.toString();
            else if (dr > 0) amt = (-dr).toString();
          } else if (row[3]) {
            amt = (row[3] ?? "").replace(/,/g, "");
          }

          if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate) && desc && !isNaN(Number(amt)) && Number(amt) !== 0) {
            parsed.push({
              transactionDate: formattedDate,
              description: desc,
              reference: ref ?? "",
              amount: amt,
            });
          }
        }

        if (parsed.length > 0) {
          setDraftLines(parsed);
          notifications.success("CSV Statement Parsed", `Extracted ${parsed.length} transactions from ${file.name}.`);
        } else {
          notifications.error("Could not parse CSV", "Check that the columns contain Date, Description, and Amount.");
        }
      }
    } catch (err) {
      notifications.error("File Read Error", err instanceof Error ? err.message : "Unable to read file.");
    } finally {
      event.target.value = "";
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!accountId) errors.accountId = "Bank ledger account is required.";
    if (!reference.trim()) errors.reference = "Statement reference is required.";
    if (!startDate) errors.startDate = "Start date is required.";
    if (!endDate) {
      errors.endDate = "End date is required.";
    } else if (startDate && endDate < startDate) {
      errors.endDate = "End date must be on or after start date.";
    }
    if (openingBalance === "" || isNaN(Number(openingBalance))) errors.openingBalance = "Valid opening balance is required.";
    if (closingBalance === "" || isNaN(Number(closingBalance))) errors.closingBalance = "Valid closing balance is required.";

    const hasInvalidLine = draftLines.some((l) => !l.transactionDate || !l.description.trim() || !l.amount || isNaN(Number(l.amount)));
    if (hasInvalidLine) {
      errors.lines = "All statement lines must have a valid date, description, and amount.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setBusy(true);
    try {
      const created = await apiClient.post<Reconciliation>("/bank-reconciliations", {
        accountId,
        statementReference: reference.trim(),
        startDate,
        endDate,
        openingBalance: Number(openingBalance),
        closingBalance: Number(closingBalance),
        lines: draftLines.map((line) => ({ ...line, amount: Number(line.amount) })),
      });
      notifications.success("Statement imported", "Now match statement rows or use Auto-Match.");
      await load();
      await selectReconciliation(created.id);
    } catch (cause) {
      notifications.error(
        "Statement not imported",
        cause instanceof Error ? cause.message : "Check the statement values and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const match = async (statementLineId: string, journalLineId: string) => {
    if (!selectedId || !journalLineId) return;
    setBusy(true);
    try {
      await apiClient.post(`/bank-reconciliations/${encodeURIComponent(selectedId)}/match`, {
        statementLineId,
        journalLineId,
      });
      notifications.success("Transaction matched", "Statement transaction linked to the ledger.");
      await load();
      await selectReconciliation(selectedId);
    } catch (cause) {
      notifications.error("Could not match transaction", cause instanceof Error ? cause.message : "Amounts and dates must match.");
    } finally {
      setBusy(false);
    }
  };

  // Rule-Based Auto-Matching Engine Trigger
  const handleAutoMatch = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await apiClient.post<AutoMatchResultDto>(
        `/bank-reconciliations/${encodeURIComponent(selectedId)}/auto-match`,
        {}
      );
      setAutoMatchResult(res);
      setShowAutoMatchModal(true);
      if (res.matchedCount > 0) {
        notifications.success(
          "Auto-Match Complete",
          `Automatically matched ${res.matchedCount} transactions totaling ₹${res.totalMatchedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}.`
        );
      } else {
        notifications.info("Auto-Match", "No unambiguous 1:1 candidate matches found with current rules.");
      }
      await load();
      await selectReconciliation(selectedId);
    } catch (err) {
      notifications.error("Auto-Match Failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // Accept Smart Suggestion Trigger
  const handleAcceptSuggestion = async (suggestion: BankStatementSuggestionDto) => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await apiClient.post(
        `/bank-reconciliations/${encodeURIComponent(selectedId)}/accept-suggestion`,
        {
          statementLineId: suggestion.statementLineId,
          suggestionType: suggestion.suggestionType,
          entityId: suggestion.entityId,
          billOrReferenceNumber: suggestion.documentNumber,
        }
      );
      notifications.success(
        "Suggestion Accepted & Reconciled",
        `Posted ${suggestion.suggestionType === "CustomerReceipt" ? "Customer Receipt" : "Vendor Payment"} for ${suggestion.partyName} and matched statement line.`
      );
      await load();
      await selectReconciliation(selectedId);
    } catch (err) {
      notifications.error("Could not accept suggestion", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await apiClient.post(`/bank-reconciliations/${encodeURIComponent(selectedId)}/finalize`, {});
      notifications.success("Reconciliation finalized", "This statement can no longer be changed.");
      await load();
      await selectReconciliation(selectedId);
    } catch (cause) {
      notifications.error("Could not finalize", cause instanceof Error ? cause.message : "Match all statement rows first.");
    } finally {
      setBusy(false);
    }
  };

  const selected = reconciliations.find((item) => item.id === selectedId);
  const updateDraft = (index: number, patch: Partial<DraftLine>) => {
    setDraftLines((current) => current.map((line, row) => (row === index ? { ...line, ...patch } : line)));
    clearFieldError("lines");
  };

  const matchedCount = selected ? selected.lines.filter((l) => l.journalLineId).length : 0;
  const totalLines = selected ? selected.lines.length : 0;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
            Bank Statement Import & Reconciliation
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Import statements (.OFX / .CSV), run rule-based auto-matching (UTR & date window), and review smart payment suggestions.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load()}>
          <RefreshCw size={14} className="mr-1.5" /> Refresh
        </Button>
      </header>

      {/* Import Form */}
      <form
        onSubmit={(event) => void create(event)}
        noValidate
        autoComplete="off"
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-indigo-600" />
            Import Bank Statement
          </h2>
          <span className="text-xs text-slate-500">Supports .CSV, .OFX, .QFX (SBI, HDFC, ICICI, Axis)</span>
        </div>

        {fieldErrors.lines && (
          <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
            {fieldErrors.lines}
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-xs font-medium">Bank ledger account <span className="text-rose-500">*</span></label>
            <select
              className={`${inputClass} mt-1 w-full ${fieldErrors.accountId ? "border-rose-500 bg-rose-50/20" : ""}`}
              aria-invalid={Boolean(fieldErrors.accountId)}
              value={accountId}
              onChange={(event) => {
                setAccountId(event.target.value);
                clearFieldError("accountId");
              }}
            >
              <option value="">Select account</option>
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </select>
            {fieldErrors.accountId && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.accountId}</p>}
          </div>

          <div>
            <label className="text-xs font-medium">Statement reference <span className="text-rose-500">*</span></label>
            <input
              maxLength={100}
              className={`${inputClass} mt-1 w-full ${fieldErrors.reference ? "border-rose-500 bg-rose-50/20" : ""}`}
              aria-invalid={Boolean(fieldErrors.reference)}
              value={reference}
              onChange={(event) => {
                setReference(event.target.value);
                clearFieldError("reference");
              }}
              placeholder="e.g. HDFC-OCT-2026 or SBI-STMT-01"
            />
            {fieldErrors.reference && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.reference}</p>}
          </div>

          <div>
            <label className="text-xs font-medium">Statement File (.CSV or .OFX)</label>
            <input
              className="mt-1 block w-full text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              type="file"
              accept=".csv,.ofx,.qfx,text/csv,application/x-ofx"
              onChange={(event) => void importFile(event)}
            />
          </div>

          <div>
            <label className="text-xs font-medium">Start date <span className="text-rose-500">*</span></label>
            <input
              type="date"
              className={`${inputClass} mt-1 w-full ${fieldErrors.startDate ? "border-rose-500 bg-rose-50/20" : ""}`}
              aria-invalid={Boolean(fieldErrors.startDate)}
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                clearFieldError("startDate");
              }}
            />
            {fieldErrors.startDate && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.startDate}</p>}
          </div>

          <div>
            <label className="text-xs font-medium">End date <span className="text-rose-500">*</span></label>
            <input
              type="date"
              className={`${inputClass} mt-1 w-full ${fieldErrors.endDate ? "border-rose-500 bg-rose-50/20" : ""}`}
              aria-invalid={Boolean(fieldErrors.endDate)}
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                clearFieldError("endDate");
              }}
            />
            {fieldErrors.endDate && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.endDate}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Opening balance <span className="text-rose-500">*</span></label>
              <input
                type="number"
                step="0.01"
                className={`${inputClass} mt-1 w-full ${fieldErrors.openingBalance ? "border-rose-500 bg-rose-50/20" : ""}`}
                aria-invalid={Boolean(fieldErrors.openingBalance)}
                value={openingBalance}
                onChange={(event) => {
                  setOpeningBalance(event.target.value);
                  clearFieldError("openingBalance");
                }}
              />
              {fieldErrors.openingBalance && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.openingBalance}</p>}
            </div>

            <div>
              <label className="text-xs font-medium">Closing balance <span className="text-rose-500">*</span></label>
              <input
                type="number"
                step="0.01"
                className={`${inputClass} mt-1 w-full ${fieldErrors.closingBalance ? "border-rose-500 bg-rose-50/20" : ""}`}
                aria-invalid={Boolean(fieldErrors.closingBalance)}
                value={closingBalance}
                onChange={(event) => {
                  setClosingBalance(event.target.value);
                  clearFieldError("closingBalance");
                }}
              />
              {fieldErrors.closingBalance && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.closingBalance}</p>}
            </div>
          </div>
        </div>

        {/* Draft Transaction Lines */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {draftLines.map((line, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-950 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_1fr_1fr_auto]"
            >
              <input
                aria-label="Transaction date"
                type="date"
                className={inputClass}
                value={line.transactionDate}
                onChange={(event) => updateDraft(index, { transactionDate: event.target.value })}
              />
              <input
                aria-label="Description"
                className={inputClass}
                placeholder="Description / Narration"
                value={line.description}
                onChange={(event) => updateDraft(index, { description: event.target.value })}
              />
              <input
                aria-label="Reference"
                className={inputClass}
                placeholder="Cheque / UTR Ref"
                value={line.reference}
                onChange={(event) => updateDraft(index, { reference: event.target.value })}
              />
              <input
                aria-label="Signed amount"
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="+ in / − out"
                value={line.amount}
                onChange={(event) => updateDraft(index, { amount: event.target.value })}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={draftLines.length === 1}
                onClick={() => setDraftLines((rows) => rows.filter((_, row) => row !== index))}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setDraftLines((rows) => [
                ...rows,
                { transactionDate: "", description: "", reference: "", amount: "" },
              ])
            }
          >
            <Plus size={14} className="mr-1" /> Add line
          </Button>
          <Button type="submit" isLoading={busy} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Import statement
          </Button>
        </div>
      </form>

      {/* Reconciliation Workspace */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1 max-w-xl">
            Selected Bank Statement
            <select
              className={`${inputClass} mt-1 w-full`}
              value={selectedId}
              onChange={(event) => void selectReconciliation(event.target.value)}
            >
              <option value="">Select statement to reconcile</option>
              {reconciliations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.accountCode} · {item.statementReference} · {formatDate(item.startDate)} to {formatDate(item.endDate)}
                  {item.isFinalized ? " · Finalized" : ""}
                </option>
              ))}
            </select>
          </label>

          {selected && !selected.isFinalized && (
            <div className="flex items-center gap-2 pt-4">
              <Button
                type="button"
                variant="secondary"
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300"
                disabled={busy}
                onClick={() => void handleAutoMatch()}
              >
                <Sparkles className="h-4 w-4 mr-1.5 text-indigo-600" />
                Auto-Match (Rules Engine)
              </Button>

              <Button
                disabled={busy || selected.lines.some((line) => !line.journalLineId)}
                onClick={() => void finalize()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check size={14} className="mr-1" /> Finalize
              </Button>
            </div>
          )}
        </div>

        {selected ? (
          <>
            {/* Status Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  <strong>Account:</strong> {selected.accountName}
                </span>
                <span>
                  <strong>Opening:</strong> ₹{selected.openingBalance.toFixed(2)}
                </span>
                <span>
                  <strong>Closing:</strong> ₹{selected.closingBalance.toFixed(2)}
                </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {matchedCount} / {totalLines} Transactions Matched
                </span>
              </div>
              <div>
                {selected.isFinalized ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Finalized
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">In Progress</span>
                )}
              </div>
            </div>

            {/* Navigation Tabs: Transactions vs Smart Suggestions */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab("statement")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === "statement"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                  }`}
              >
                Statement Lines ({selected.lines.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("suggestions")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === "suggestions"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                  }`}
              >
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                Smart Suggestions
                {suggestions.length > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {suggestions.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: Statement Transactions Table */}
            {activeTab === "statement" && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Statement transaction</th>
                      <th className="p-2.5 text-right">Amount (₹)</th>
                      <th className="p-2.5">Ledger match</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {selected.lines.map((line) => {
                      const isMatched = Boolean(line.journalLineId);
                      const matchingJournal = unmatched.find((item) => item.id === line.journalLineId);
                      return (
                        <tr key={line.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 whitespace-nowrap">{formatDate(line.transactionDate)}</td>
                          <td className="p-2.5">
                            <div className="font-medium text-slate-900 dark:text-slate-100">{line.description}</div>
                            {line.reference ? (
                              <div className="text-[11px] text-slate-500">Ref / UTR: {line.reference}</div>
                            ) : null}
                          </td>
                          <td className="p-2.5 text-right font-medium">
                            <span className={line.amount > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>
                              {line.amount > 0 ? "+" : ""}
                              {line.amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-2.5">
                            {isMatched ? (
                              <div className="text-xs text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Matched:</span>{" "}
                                {matchingJournal?.journalNumber ?? "GL Entry"}
                              </div>
                            ) : (
                              <select
                                disabled={selected.isFinalized || busy}
                                className={`${inputClass} text-xs py-1`}
                                defaultValue=""
                                onChange={(event) => void match(line.id, event.target.value)}
                              >
                                <option value="">Choose exact amount match</option>
                                {unmatched
                                  .filter((item) => Math.round(item.amount * 100) === Math.round(line.amount * 100))
                                  .map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {formatDate(item.journalDate)} · {item.journalNumber} · {item.description} · ₹
                                      {item.amount.toFixed(2)}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {isMatched ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                Matched
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                Unmatched
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: Smart Suggestions Panel */}
            {activeTab === "suggestions" && (
              <div className="space-y-3">
                {loadingSuggestions ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Scanning ledger for matches...</p>
                ) : suggestions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
                    No open customer receipts or vendor payment suggestions found for remaining unmatched statement lines.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {suggestions.map((sugg) => (
                      <div
                        key={sugg.statementLineId}
                        className="rounded-xl border border-indigo-100 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${sugg.suggestionType === "CustomerReceipt"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              }`}
                          >
                            {sugg.suggestionType === "CustomerReceipt" ? (
                              <>
                                <ArrowDownRight className="h-3.5 w-3.5" /> Customer Receipt
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="h-3.5 w-3.5" /> Vendor Payment
                              </>
                            )}
                          </span>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sugg.matchConfidence === "High"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                          >
                            {sugg.matchConfidence} Confidence
                          </span>
                        </div>

                        <div className="text-xs space-y-1">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                            {sugg.partyName}
                          </div>
                          <div className="text-slate-500">
                            Doc #{sugg.documentNumber} · Due/Total: ₹{sugg.documentBalance.toFixed(2)}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 italic">
                            Statement: "{sugg.statementDescription}" ({formatDate(sugg.transactionDate)})
                          </div>
                          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                            Reason: {sugg.matchReason}
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            ₹{Math.abs(sugg.statementAmount).toFixed(2)}
                          </span>
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => void handleAcceptSuggestion(sugg)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Accept & Auto-Match
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {unmatched.length > 0 && (
              <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {unmatched.length} unmatched ledger item(s) remain in this statement period. These will be treated as outstanding items in the balance reconciliation check upon finalizing.
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Select or import a statement above to begin reconciliation.</p>
        )}
      </section>

      {/* AUTO-MATCH RESULT MODAL */}
      {showAutoMatchModal && autoMatchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                Auto-Match Results
              </h3>
              <button
                onClick={() => setShowAutoMatchModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 uppercase font-semibold">Matched Items</span>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {autoMatchResult.matchedCount}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 uppercase font-semibold">Total Amount</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  ₹{autoMatchResult.totalMatchedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto text-xs pr-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Match Details Log:</span>
              {autoMatchResult.matchDetails.map((detail, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-slate-50 p-2 text-slate-700 dark:bg-slate-950 dark:text-slate-300 font-mono text-[11px]"
                >
                  {detail}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowAutoMatchModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, Plus, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { apiClient } from "../../services/apiClient";
import { useNotifications } from "../../context/NotificationContext";

type Account = { id: string; code: string; name: string; type: number; normalBalance: number; isActive: boolean };
type StatementLine = { id: string; transactionDate: string; description: string; reference: string | null; amount: number; journalLineId: string | null };
type Reconciliation = { id: string; accountId: string; accountCode: string; accountName: string; statementReference: string; startDate: string; endDate: string; openingBalance: number; closingBalance: number; isFinalized: boolean; lines: StatementLine[] };
type LedgerLine = { id: string; journalDate: string; journalNumber: string; description: string; amount: number; memo: string | null };
type DraftLine = { transactionDate: string; description: string; reference: string; amount: string };
const inputClass = "min-h-9 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";
const parseCsvRow = (row: string) => row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(value => value.trim().replace(/^"|"$/g, "").replaceAll('""', '"'));

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
  const [draftLines, setDraftLines] = useState<DraftLine[]>([{ transactionDate: "", description: "", reference: "", amount: "" }]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

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
    setAccounts(chart.filter(item => item.type === 0 && item.normalBalance === 0));
    setReconciliations(statements);
  }, []);
  useEffect(() => { void load().catch(() => notifications.error("Unable to load reconciliation data", "Refresh the page and try again.")); }, [load, notifications]);

  const selectReconciliation = async (id: string) => {
    setSelectedId(id);
    if (!id) { setUnmatched([]); return; }
    try { setUnmatched(await apiClient.get<LedgerLine[]>(`/bank-reconciliations/${encodeURIComponent(id)}/unmatched-ledger`)); }
    catch (cause) { notifications.error("Unable to load ledger transactions", cause instanceof Error ? cause.message : "Please try again."); }
  };

  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const rows = (await file.text()).split(/\r?\n/).filter(row => row.trim()).map(parseCsvRow);
    const parsed = rows.map(row => ({ transactionDate: row[0] ?? "", description: row[1] ?? "", reference: row[2] ?? "", amount: row[3] ?? "" }))
      .filter((row, index) => index === 0 && !/^\d{4}-\d{2}-\d{2}$/.test(row.transactionDate) ? false : /^\d{4}-\d{2}-\d{2}$/.test(row.transactionDate) && row.description && Number.isFinite(Number(row.amount)) && Number(row.amount) !== 0);
    setDraftLines(parsed.length ? parsed : [{ transactionDate: "", description: "", reference: "", amount: "" }]);
    event.target.value = "";
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

    const hasInvalidLine = draftLines.some(l => !l.transactionDate || !l.description.trim() || !l.amount || isNaN(Number(l.amount)));
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
        accountId, statementReference: reference.trim(), startDate, endDate,
        openingBalance: Number(openingBalance), closingBalance: Number(closingBalance),
        lines: draftLines.map(line => ({ ...line, amount: Number(line.amount) })),
      });
      notifications.success("Statement imported", "Now match every statement row to a ledger transaction.");
      await load(); await selectReconciliation(created.id);
    } catch (cause) { notifications.error("Statement not imported", cause instanceof Error ? cause.message : "Check the statement values and try again."); }
    finally { setBusy(false); }
  };

  const match = async (statementLineId: string, journalLineId: string) => {
    if (!selectedId || !journalLineId) return;
    setBusy(true);
    try {
      await apiClient.post(`/bank-reconciliations/${encodeURIComponent(selectedId)}/match`, { statementLineId, journalLineId });
      notifications.success("Transaction matched", "Statement transaction linked to the ledger.");
      await load(); await selectReconciliation(selectedId);
    } catch (cause) { notifications.error("Could not match transaction", cause instanceof Error ? cause.message : "Amounts and dates must match."); }
    finally { setBusy(false); }
  };

  const finalize = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await apiClient.post(`/bank-reconciliations/${encodeURIComponent(selectedId)}/finalize`, {});
      notifications.success("Reconciliation finalized", "This statement can no longer be changed.");
      await load(); await selectReconciliation(selectedId);
    } catch (cause) { notifications.error("Could not finalize", cause instanceof Error ? cause.message : "Match all statement rows first."); }
    finally { setBusy(false); }
  };

  const selected = reconciliations.find(item => item.id === selectedId);
  const updateDraft = (index: number, patch: Partial<DraftLine>) => {
    setDraftLines(current => current.map((line, row) => row === index ? { ...line, ...patch } : line));
    clearFieldError("lines");
  };

  return <section className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-2"><div><h1 className="text-xl font-semibold">Bank Reconciliation</h1><p className="mt-0.5 text-xs text-slate-500">Import statement transactions, match them to bank ledger entries, then finalize the period.</p></div><Button variant="secondary" onClick={() => void load()}><RefreshCw size={14} /> Refresh</Button></header>
    <form onSubmit={event => void create(event)} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-semibold">Import statement</h2>
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
            onChange={event => { setAccountId(event.target.value); clearFieldError("accountId"); }}
          >
            <option value="">Select account</option>
            {accounts.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
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
            onChange={event => { setReference(event.target.value); clearFieldError("reference"); }}
            placeholder="Bank statement ID"
          />
          {fieldErrors.reference && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.reference}</p>}
        </div>

        <div>
          <label className="text-xs font-medium">CSV file (optional)</label>
          <input className="mt-2 block w-full text-xs" type="file" accept=".csv,text/csv" onChange={event => void importCsv(event)} />
        </div>

        <div>
          <label className="text-xs font-medium">Start date <span className="text-rose-500">*</span></label>
          <input
            type="date"
            className={`${inputClass} mt-1 w-full ${fieldErrors.startDate ? "border-rose-500 bg-rose-50/20" : ""}`}
            aria-invalid={Boolean(fieldErrors.startDate)}
            value={startDate}
            onChange={event => { setStartDate(event.target.value); clearFieldError("startDate"); }}
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
            onChange={event => { setEndDate(event.target.value); clearFieldError("endDate"); }}
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
              onChange={event => { setOpeningBalance(event.target.value); clearFieldError("openingBalance"); }}
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
              onChange={event => { setClosingBalance(event.target.value); clearFieldError("closingBalance"); }}
            />
            {fieldErrors.closingBalance && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.closingBalance}</p>}
          </div>
        </div>
      </div>
      <div className="space-y-2">{draftLines.map((line, index) => <div key={index} className="grid gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-950 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_1fr_1fr_auto]"><input aria-label="Transaction date" type="date" className={inputClass} value={line.transactionDate} onChange={event => updateDraft(index, { transactionDate: event.target.value })} /><input aria-label="Description" className={inputClass} placeholder="Description" value={line.description} onChange={event => updateDraft(index, { description: event.target.value })} /><input aria-label="Reference" className={inputClass} placeholder="Reference" value={line.reference} onChange={event => updateDraft(index, { reference: event.target.value })} /><input aria-label="Signed amount" type="number" step="0.01" className={inputClass} placeholder="+ in / − out" value={line.amount} onChange={event => updateDraft(index, { amount: event.target.value })} /><Button type="button" variant="secondary" disabled={draftLines.length === 1} onClick={() => setDraftLines(rows => rows.filter((_, row) => row !== index))}>Remove</Button></div>)}</div>
      <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setDraftLines(rows => [...rows, { transactionDate: "", description: "", reference: "", amount: "" }])}><Plus size={14} /> Add line</Button><Button type="submit" isLoading={busy}>Import statement</Button></div>
    </form>
    <section className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><label className="text-xs">Reconciliation<select className={`${inputClass} mt-1 w-full max-w-2xl`} value={selectedId} onChange={event => void selectReconciliation(event.target.value)}><option value="">Select statement</option>{reconciliations.map(item => <option key={item.id} value={item.id}>{item.accountCode} · {item.statementReference} · {item.startDate} to {item.endDate}{item.isFinalized ? " · Finalized" : ""}</option>)}</select></label>
      {selected ? <><div className="my-3 flex flex-wrap items-center justify-between gap-2 text-sm"><span>{selected.accountName} · Opening {selected.openingBalance.toFixed(2)} · Closing {selected.closingBalance.toFixed(2)} · {selected.lines.filter(line => line.journalLineId).length}/{selected.lines.length} matched</span>{!selected.isFinalized ? <Button disabled={busy || selected.lines.some(line => !line.journalLineId)} onClick={() => void finalize()}><Check size={14} /> Finalize</Button> : <span className="text-emerald-700">Finalized</span>}</div>
        <div className="overflow-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="p-2">Date</th><th className="p-2">Statement transaction</th><th className="p-2">Amount</th><th className="p-2">Ledger match</th><th className="p-2">Status</th></tr></thead><tbody>{selected.lines.map(line => <tr key={line.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-2">{line.transactionDate}</td><td className="p-2">{line.description}{line.reference ? <div className="text-xs text-slate-500">{line.reference}</div> : null}</td><td className="p-2">{line.amount.toFixed(2)}</td><td className="p-2">{line.journalLineId ? unmatched.find(item => item.id === line.journalLineId)?.journalNumber ?? "Matched" : <select disabled={selected.isFinalized || busy} className={inputClass} defaultValue="" onChange={event => void match(line.id, event.target.value)}><option value="">Choose exact amount</option>{unmatched.filter(item => Math.round(item.amount * 100) === Math.round(line.amount * 100)).map(item => <option key={item.id} value={item.id}>{item.journalDate} · {item.journalNumber} · {item.description} · {item.amount.toFixed(2)}</option>)}</select>}</td><td className="p-2">{line.journalLineId ? "Matched" : "Unmatched"}</td></tr>)}</tbody></table></div>
        {unmatched.length ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{unmatched.length} unmatched ledger item(s) remain in this statement period. These are treated as outstanding items in the closing balance check.</p> : null}
      </> : <p className="mt-3 text-sm text-slate-500">Select or import a statement to match bank transactions.</p>}
    </section>
  </section>;
}

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BookOpenCheck, Plus, RefreshCw, Undo2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { apiClient, type PagedData } from "../../services/apiClient";
import { useNotifications } from "../../context/NotificationContext";

type Account = { id: string; code: string; name: string; type: number; normalBalance: number; isActive: boolean; isSystem: boolean };
type Dimension = { id: string; code: string; name: string; dimensionType: string };
type JournalLine = { accountId: string; debit: number; credit: number; memo?: string; dimensionId?: string | null };
type Journal = { id: string; sourceType?: string | null; journalNumber: string; journalDate: string; description: string; reversalOfJournalEntryId?: string | null; isReversed: boolean; totalDebit: number; totalCredit: number; lines: { accountCode: string; accountName: string; debit: number; credit: number }[] };
type TrialBalance = { asOfDate: string; accounts: { code: string; name: string; type: number; debitBalance: number; creditBalance: number }[]; totalDebits: number; totalCredits: number };
type StatementLine = { code: string; name: string; amount: number };
type FinancialStatements = { fromDate: string; toDate: string; revenue: StatementLine[]; totalRevenue: number; expenses: StatementLine[]; totalExpenses: number; netIncome: number; assets: StatementLine[]; totalAssets: number; liabilities: StatementLine[]; totalLiabilities: number; equity: StatementLine[]; totalEquity: number; currentEarnings: number; balanceDifference: number };
type CashFlow = { fromDate: string; toDate: string; operating: StatementLine[]; operatingTotal: number; investing: StatementLine[]; investingTotal: number; financing: StatementLine[]; financingTotal: number; openingCash: number; netChange: number; closingCash: number };
const accountTypes = ["Asset", "Liability", "Equity", "Revenue", "Expense"];
const balanceSides = ["Debit", "Credit"];
const inputClass = "min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";

export function GeneralLedgerPage() {
  const notifications = useNotifications();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [statements, setStatements] = useState<FinancialStatements | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlow | null>(null);
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().slice(0, 10));
  const [openingLines, setOpeningLines] = useState<JournalLine[]>([{ accountId: "", debit: 0, credit: 0, memo: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [statementFrom, setStatementFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [statementTo, setStatementTo] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState(0);
  const [normalBalance, setNormalBalance] = useState(0);
  const [lines, setLines] = useState<JournalLine[]>([{ accountId: "", debit: 0, credit: 0 }, { accountId: "", debit: 0, credit: 0 }]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const clearError = (key: string) => {
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const statementQuery = new URLSearchParams({ from: statementFrom, to: statementTo });
      const [chart, page, balance, report, cash, dimensionRows] = await Promise.all([
        apiClient.get<Account[]>("/general-ledger/accounts"),
        apiClient.get<PagedData<Journal>>("/general-ledger/journals?page=1&pageSize=50"),
        apiClient.get<TrialBalance>("/general-ledger/trial-balance"),
        apiClient.get<FinancialStatements>(`/general-ledger/financial-statements?${statementQuery}`),
        apiClient.get<CashFlow>(`/general-ledger/cash-flow?${statementQuery}`),
        apiClient.get<Dimension[]>("/accounting-dimensions"),
      ]);
      setAccounts(chart);
      setJournals(page.items);
      setTrialBalance(balance);
      setStatements(report);
      setCashFlow(cash);
      setDimensions(dimensionRows);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load the ledger."); }
  }, [statementFrom, statementTo]);
  useEffect(() => { void load(); }, [load]);

  const initialize = async () => {
    setBusy(true);
    try {
      const result = await apiClient.post<{ created: number }>("/general-ledger/accounts/initialize", {});
      notifications.success("Chart of accounts ready", `${result.created} standard accounts added.`);
      await load();
    } catch (cause) { notifications.error("Could not initialize accounts", cause instanceof Error ? cause.message : "Please try again."); }
    finally { setBusy(false); }
  };

  const createAccount = async (event: FormEvent) => {
    event.preventDefault();
    const errs: Record<string, string> = {};
    if (!accountCode.trim()) errs.accountCode = "Account code is required.";
    if (!accountName.trim()) errs.accountName = "Account name is required.";
    if (Object.keys(errs).length > 0) {
      setFormErrors((prev) => ({ ...prev, ...errs }));
      notifications.error("Incomplete account", "Account code and name are required.");
      return;
    }
    setBusy(true);
    try {
      await apiClient.post("/general-ledger/accounts", { code: accountCode.trim(), name: accountName.trim(), type: accountType, normalBalance });
      setAccountCode(""); setAccountName("");
      notifications.success("Account created", "The ledger account is ready to use.");
      await load();
    } catch (cause) { notifications.error("Account not created", cause instanceof Error ? cause.message : "Check the account details."); }
    finally { setBusy(false); }
  };

  const updateLine = (index: number, patch: Partial<JournalLine>) => setLines(current => current.map((line, row) => row === index ? { ...line, ...patch } : line));
  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  const post = async (event: FormEvent) => {
    event.preventDefault();
    const errs: Record<string, string> = {};
    if (!date) errs.journalDate = "Journal date is required.";
    if (!description.trim()) errs.journalDescription = "Description is required.";
    const hasUnselectedAccount = lines.some((l) => !l.accountId);
    if (hasUnselectedAccount) errs.journalLines = "Every line must have an account selected.";
    if (totalDebit <= 0 || Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
      errs.journalBalance = `Total debits (${totalDebit.toFixed(2)}) must equal credits (${totalCredit.toFixed(2)}).`;
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors((prev) => ({ ...prev, ...errs }));
      notifications.error("Journal not posted", "Please correct the highlighted fields.");
      return;
    }

    setBusy(true);
    try {
      await apiClient.post("/general-ledger/journals", { journalDate: date, description: description.trim(), lines });
      notifications.success("Journal posted", "The balanced journal entry was recorded.");
      setDescription("");
      setLines([{ accountId: "", debit: 0, credit: 0 }, { accountId: "", debit: 0, credit: 0 }]);
      await load();
    } catch (cause) { notifications.error("Journal not posted", cause instanceof Error ? cause.message : "Check the lines and try again."); }
    finally { setBusy(false); }
  };

  const reverseJournal = async (journal: Journal) => {
    if (!window.confirm(`Reverse ${journal.journalNumber}? This adds an equal and opposite journal entry and keeps the original intact.`)) return;
    const reason = window.prompt("Reason for reversal (optional):") ?? "";
    setBusy(true);
    try {
      await apiClient.post(`/general-ledger/journals/${encodeURIComponent(journal.id)}/reverse`, {
        reversalDate: new Date().toISOString().slice(0, 10), reason,
      });
      notifications.success("Journal reversed", "A linked reversing entry was posted.");
      await load();
    } catch (cause) { notifications.error("Journal not reversed", cause instanceof Error ? cause.message : "Please try again."); }
    finally { setBusy(false); }
  };

  const importOpeningBalances = async (event: FormEvent) => {
    event.preventDefault();
    const errs: Record<string, string> = {};
    if (!openingDate) errs.openingDate = "Cutover date is required.";
    const validLines = openingLines.filter(line => line.accountId && (Number(line.debit) > 0 || Number(line.credit) > 0));
    if (validLines.length === 0) {
      errs.openingLines = "Add at least one line with an account and debit or credit balance.";
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors((prev) => ({ ...prev, ...errs }));
      notifications.error("Cutover not imported", "Please choose an account and enter a balance amount.");
      return;
    }

    setBusy(true);
    try {
      await apiClient.post("/general-ledger/opening-balances", { cutoverDate: openingDate, lines: validLines });
      notifications.success("Opening balances imported", "The cutover journal was balanced to retained earnings.");
      setOpeningLines([{ accountId: "", debit: 0, credit: 0, memo: "" }]); await load();
    } catch (cause) { notifications.error("Opening balances not imported", cause instanceof Error ? cause.message : "Check the account balances."); }
    finally { setBusy(false); }
  };

  return <section className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-2"><div><h1 className="text-xl font-semibold">General Ledger</h1><p className="mt-0.5 text-xs text-slate-500">Chart of accounts and balanced journal entries.</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => void load()}><RefreshCw size={15} /> Refresh</Button><Button variant="secondary" isLoading={busy} onClick={() => void initialize()}><BookOpenCheck size={15} /> Add standard accounts</Button></div></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <form onSubmit={event => void importOpeningBalances(event)} noValidate className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Opening balance cutover</h2>
          <p className="text-xs text-slate-500">Balance sheet control totals only; difference posts to retained earnings. Customer/vendor balances and item quantities are not created by this journal. Add references in memo.</p>
        </div>
        <label className="text-xs">
          Cutover date <span className="text-rose-500">*</span>
          <input
            type="date"
            className={`${inputClass} mt-1 ${formErrors.openingDate ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white" : ""}`}
            aria-invalid={Boolean(formErrors.openingDate)}
            value={openingDate}
            onChange={event => { setOpeningDate(event.target.value); clearError("openingDate"); }}
          />
          {formErrors.openingDate && <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{formErrors.openingDate}</p>}
        </label>
      </div>
      {formErrors.openingLines && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{formErrors.openingLines}</p>}
      {openingLines.map((line, index) => <div key={index} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_2fr_auto]"><select aria-label="Opening balance account" className={inputClass} value={line.accountId} onChange={event => { clearError("openingLines"); setOpeningLines(current => current.map((row, i) => i === index ? { ...row, accountId: event.target.value } : row)); }}><option value="">Choose account</option>{accounts.filter(account => account.type <= 2).map(account => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</select><input aria-label="Opening debit" className={inputClass} type="number" min="0" step="0.01" placeholder="Debit" value={line.debit || ""} onChange={event => { clearError("openingLines"); setOpeningLines(current => current.map((row, i) => i === index ? { ...row, debit: Number(event.target.value), credit: 0 } : row)); }} /><input aria-label="Opening credit" className={inputClass} type="number" min="0" step="0.01" placeholder="Credit" value={line.credit || ""} onChange={event => { clearError("openingLines"); setOpeningLines(current => current.map((row, i) => i === index ? { ...row, credit: Number(event.target.value), debit: 0 } : row)); }} /><input aria-label="Customer vendor or stock reference" className={inputClass} placeholder="Customer, vendor, or stock reference" value={line.memo ?? ""} onChange={event => setOpeningLines(current => current.map((row, i) => i === index ? { ...row, memo: event.target.value } : row))} /><Button type="button" variant="secondary" onClick={() => setOpeningLines(current => current.filter((_, i) => i !== index))}>Remove</Button></div>)}
      <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => setOpeningLines(current => [...current, { accountId: "", debit: 0, credit: 0, memo: "" }])}><Plus size={14} /> Add balance</Button><Button type="submit" disabled={busy || openingLines.length === 0}>Import cutover</Button></div>
    </form>
    {cashFlow && <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Cash Flow Statement</h2><p className="text-xs text-slate-500">Direct method · {cashFlow.fromDate} to {cashFlow.toDate}</p></div><div className="text-right text-xs">Opening {cashFlow.openingCash.toFixed(2)} · Change {cashFlow.netChange.toFixed(2)}<div className="font-semibold">Closing {cashFlow.closingCash.toFixed(2)}</div></div></div><div className="grid gap-2 md:grid-cols-3">{([['Operating', cashFlow.operating, cashFlow.operatingTotal], ['Investing', cashFlow.investing, cashFlow.investingTotal], ['Financing', cashFlow.financing, cashFlow.financingTotal]] as const).map(([name, rows, total]) => <div key={name} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800"><div className="mb-1 flex justify-between text-sm font-semibold"><span>{name}</span><span>{total.toFixed(2)}</span></div>{rows.map(row => <div key={row.code} className="flex justify-between gap-2 border-t border-slate-100 py-1 text-xs dark:border-slate-800"><span>{row.code} · {row.name}</span><span>{row.amount.toFixed(2)}</span></div>)}</div>)}</div></section>}
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(400px,1.1fr)]">
      <section className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 font-semibold">Chart of Accounts</h2>
        <form onSubmit={createAccount} noValidate className="mb-3 grid gap-2 sm:grid-cols-2">
          <div>
            <input
              maxLength={20}
              aria-label="Account code"
              className={`${inputClass} ${formErrors.accountCode ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white" : ""}`}
              placeholder="Account code *"
              value={accountCode}
              onChange={event => { setAccountCode(event.target.value); clearError("accountCode"); }}
              aria-invalid={Boolean(formErrors.accountCode)}
            />
            {formErrors.accountCode && <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{formErrors.accountCode}</p>}
          </div>
          <div>
            <input
              maxLength={150}
              aria-label="Account name"
              className={`${inputClass} ${formErrors.accountName ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white" : ""}`}
              placeholder="Account name *"
              value={accountName}
              onChange={event => { setAccountName(event.target.value); clearError("accountName"); }}
              aria-invalid={Boolean(formErrors.accountName)}
            />
            {formErrors.accountName && <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{formErrors.accountName}</p>}
          </div>
          <select className={inputClass} value={accountType} onChange={event => setAccountType(Number(event.target.value))}>
            {accountTypes.map((type, index) => <option key={type} value={index}>{type}</option>)}
          </select>
          <div className="flex gap-2">
            <select aria-label="Normal balance" className={inputClass} value={normalBalance} onChange={event => setNormalBalance(Number(event.target.value))}>
              {balanceSides.map((side, index) => <option key={side} value={index}>{side} normal balance</option>)}
            </select>
            <Button type="submit" isLoading={busy}><Plus size={14} /> Add</Button>
          </div>
        </form>
        <div className="max-h-[24rem] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs dark:bg-slate-950"><tr><th className="p-2">Code</th><th className="p-2">Account</th><th className="p-2">Type</th><th className="p-2">Normal balance</th></tr></thead><tbody>{accounts.map(account => <tr key={account.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-2 font-mono">{account.code}</td><td className="p-2">{account.name}{account.isSystem ? <span className="ml-1 text-[10px] text-slate-400">SYSTEM</span> : null}</td><td className="p-2">{accountTypes[account.type] ?? account.type}</td><td className="p-2">{balanceSides[account.normalBalance] ?? account.normalBalance}</td></tr>)}{accounts.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">Initialize the standard chart to begin.</td></tr>}</tbody></table></div>
      </section>
      <form onSubmit={post} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Post Journal</h2>
          <span className={`text-xs font-semibold ${totalDebit === totalCredit ? "text-emerald-700" : "text-amber-700"}`}>
            Dr {totalDebit.toFixed(2)} · Cr {totalCredit.toFixed(2)}
          </span>
        </div>
        {formErrors.journalBalance && (
          <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {formErrors.journalBalance}
          </p>
        )}
        {formErrors.journalLines && (
          <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {formErrors.journalLines}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
          <label className="text-xs">
            Journal date <span className="text-rose-500">*</span>
            <input
              type="date"
              className={`${inputClass} mt-1 ${formErrors.journalDate ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white" : ""}`}
              value={date}
              onChange={event => { setDate(event.target.value); clearError("journalDate"); }}
              aria-invalid={Boolean(formErrors.journalDate)}
            />
            {formErrors.journalDate && <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{formErrors.journalDate}</p>}
          </label>
          <label className="text-xs">
            Description <span className="text-rose-500">*</span>
            <input
              maxLength={500}
              className={`${inputClass} mt-1 ${formErrors.journalDescription ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white" : ""}`}
              value={description}
              onChange={event => { setDescription(event.target.value); clearError("journalDescription"); }}
              aria-invalid={Boolean(formErrors.journalDescription)}
            />
            {formErrors.journalDescription && <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{formErrors.journalDescription}</p>}
          </label>
        </div>
        {lines.map((line, index) => (
          <div key={index} className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-950 sm:grid-cols-[minmax(150px,1fr)_100px_100px_minmax(130px,1fr)_32px]">
            <select
              aria-label={`Account line ${index + 1}`}
              className={inputClass}
              value={line.accountId}
              onChange={event => { clearError("journalLines"); updateLine(index, { accountId: event.target.value }); }}
            >
              <option value="">Select account *</option>
              {accounts.filter(account => account.isActive).map(account => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
            </select>
            <input aria-label="Debit" type="number" min="0" step="0.01" className={inputClass} placeholder="Debit" value={line.debit || ""} onChange={event => { clearError("journalBalance"); updateLine(index, { debit: Number(event.target.value), credit: 0 }); }} />
            <input aria-label="Credit" type="number" min="0" step="0.01" className={inputClass} placeholder="Credit" value={line.credit || ""} onChange={event => { clearError("journalBalance"); updateLine(index, { credit: Number(event.target.value), debit: 0 }); }} />
            <select aria-label={`Reporting dimension line ${index + 1}`} className={inputClass} value={line.dimensionId ?? ""} onChange={event => updateLine(index, { dimensionId: event.target.value || null })}>
              <option value="">No dimension</option>
              {dimensions.map(d => <option key={d.id} value={d.id}>{d.dimensionType}: {d.code} · {d.name}</option>)}
            </select>
            <button type="button" aria-label="Remove line" disabled={lines.length <= 2} onClick={() => setLines(current => current.filter((_, row) => row !== index))} className="text-slate-500 disabled:opacity-30">×</button>
          </div>
        ))}
        <div className="flex flex-wrap justify-between gap-2">
          <Button type="button" variant="secondary" onClick={() => setLines(current => [...current, { accountId: "", debit: 0, credit: 0 }])}><Plus size={14} /> Add line</Button>
          <Button type="submit" isLoading={busy} disabled={accounts.length === 0 || totalDebit <= 0 || Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)}>Post balanced journal</Button>
        </div>
      </form>
    </div>
    <section className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-2 font-semibold">Recent Posted Journals</h2><div className="overflow-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="p-2">Date / number</th><th className="p-2">Description</th><th className="p-2">Lines</th><th className="p-2 text-right">Debit</th><th className="p-2 text-right">Credit</th><th className="p-2">Action</th></tr></thead><tbody>{journals.map(journal => <tr key={journal.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-2">{journal.journalDate}<div className="font-mono text-xs text-slate-500">{journal.journalNumber}</div></td><td className="p-2">{journal.description}{journal.reversalOfJournalEntryId ? <span className="ml-1 text-xs text-amber-700">REVERSAL</span> : null}<div className="text-xs text-slate-500">{journal.lines.map(line => `${line.accountCode} ${line.debit ? `Dr ${line.debit.toFixed(2)}` : `Cr ${line.credit.toFixed(2)}`}`).join(" · ")}</div></td><td className="p-2">{journal.lines.length}</td><td className="p-2 text-right">{journal.totalDebit.toFixed(2)}</td><td className="p-2 text-right">{journal.totalCredit.toFixed(2)}</td><td className="p-2">{journal.isReversed ? <span className="text-xs text-slate-500">Reversed</span> : !journal.reversalOfJournalEntryId && (!journal.sourceType || ["manual", "financialcorrection"].includes(journal.sourceType.toLowerCase())) ? <Button type="button" variant="secondary" disabled={busy} onClick={() => void reverseJournal(journal)}><Undo2 size={14} /> Reverse</Button> : <span className="text-xs text-slate-500">—</span>}</td></tr>)}{journals.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">No journals posted yet.</td></tr>}</tbody></table></div></section>
    {statements && <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="font-semibold">Financial Statements</h2><p className="text-xs text-slate-500">Profit and loss for the selected period; balance sheet through the end date.</p></div><div className="flex flex-wrap items-end gap-2"><label className="text-xs">From<input type="date" className={inputClass} value={statementFrom} onChange={event => setStatementFrom(event.target.value)} /></label><label className="text-xs">To<input type="date" className={inputClass} value={statementTo} onChange={event => setStatementTo(event.target.value)} /></label><Button variant="secondary" onClick={() => void load()}><RefreshCw size={14} /> Update</Button></div></div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><h3 className="mb-2 text-sm font-semibold">Profit &amp; Loss · {statements.fromDate} to {statements.toDate}</h3>{([['Revenue', statements.revenue, statements.totalRevenue], ['Expenses', statements.expenses, statements.totalExpenses]] as const).map(([title, rows, total]) => <div key={title} className="mb-3"><p className="text-xs font-semibold uppercase text-slate-500">{title}</p>{rows.map(row => <div key={row.code} className="flex justify-between gap-3 border-b border-slate-100 py-1 text-sm dark:border-slate-800"><span>{row.code} · {row.name}</span><span>{row.amount.toFixed(2)}</span></div>)}<div className="flex justify-between py-1 text-sm font-medium"><span>Total {title.toLowerCase()}</span><span>{total.toFixed(2)}</span></div></div>)}<div className="flex justify-between border-t-2 pt-2 font-semibold"><span>Net income</span><span>{statements.netIncome.toFixed(2)}</span></div></div>
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><h3 className="mb-2 text-sm font-semibold">Balance Sheet · As of {statements.toDate}</h3>{([['Assets', statements.assets, statements.totalAssets], ['Liabilities', statements.liabilities, statements.totalLiabilities], ['Equity', statements.equity, statements.totalEquity]] as const).map(([title, rows, total]) => <div key={title} className="mb-3"><p className="text-xs font-semibold uppercase text-slate-500">{title}</p>{rows.map(row => <div key={row.code} className="flex justify-between gap-3 border-b border-slate-100 py-1 text-sm dark:border-slate-800"><span>{row.code} · {row.name}</span><span>{row.amount.toFixed(2)}</span></div>)}<div className="flex justify-between py-1 text-sm font-medium"><span>Total {title.toLowerCase()}</span><span>{total.toFixed(2)}</span></div></div>)}<div className="flex justify-between border-t-2 pt-2 font-semibold"><span>Current earnings through {statements.toDate}</span><span>{statements.currentEarnings.toFixed(2)}</span></div><div className={`mt-2 flex justify-between rounded px-2 py-1 text-sm ${Math.abs(statements.balanceDifference) < 0.01 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}><span>Assets − liabilities − equity − earnings</span><span>{statements.balanceDifference.toFixed(2)}</span></div></div>
      </div>
    </section>}
    {trialBalance && <section className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-2 font-semibold">Trial Balance <span className="text-xs font-normal text-slate-500">as of {trialBalance.asOfDate}</span></h2><div className="overflow-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="p-2">Code</th><th className="p-2">Account</th><th className="p-2">Type</th><th className="p-2 text-right">Debit balance</th><th className="p-2 text-right">Credit balance</th></tr></thead><tbody>{trialBalance.accounts.map(account => <tr key={account.code} className="border-t border-slate-100 dark:border-slate-800"><td className="p-2 font-mono">{account.code}</td><td className="p-2">{account.name}</td><td className="p-2">{accountTypes[account.type] ?? account.type}</td><td className="p-2 text-right">{account.debitBalance.toFixed(2)}</td><td className="p-2 text-right">{account.creditBalance.toFixed(2)}</td></tr>)}</tbody><tfoot><tr className="border-t-2 font-semibold"><td className="p-2" colSpan={3}>Totals</td><td className="p-2 text-right">{trialBalance.totalDebits.toFixed(2)}</td><td className="p-2 text-right">{trialBalance.totalCredits.toFixed(2)}</td></tr></tfoot></table></div></section>}
  </section>;
}

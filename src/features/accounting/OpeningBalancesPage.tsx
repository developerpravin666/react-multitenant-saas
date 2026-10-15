import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Package,
  Plus,
  RefreshCw,
  Scale,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { Button } from "../../components/ui/Button";
import { inputClass } from "../../components/ui/inputClass";
import { useNotifications } from "../../context/NotificationContext";
import { useAccountingAccess } from "./AccountingAccess";

type Account = { id: string; code: string; name: string; type: number };
type Party = { id: string; name: string };
type Stock = { id: string; serialNumber: string; cost: number };
type Line = { accountId: string; debit: number; credit: number };
type PartyLine = { kind: string; partyId: string; reference: string; dueDate: string; amount: number };
type Item = {
  id: string;
  kind: string;
  partyName: string;
  reference: string;
  dueDate: string;
  amount: number;
  settled: number;
  balance: number;
  cutoverDate: string;
};
type Reconciliation = {
  asOf: string;
  receivableSubledger: number;
  receivableLedger: number;
  receivableDifference: number;
  payableSubledger: number;
  payableLedger: number;
  payableDifference: number;
  stockSubledger: number;
  stockLedger: number;
  stockDifference: number;
};

const today = () => new Date().toISOString().slice(0, 10);
const afterCutover = (date: string) => {
  const next = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
};
const money = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR" });

export function OpeningBalancesPage() {
  const { can } = useAccountingAccess();
  const manage = can("accounting.manage");
  const notifications = useNotifications();

  const [date, setDate] = useState(today);
  const [activeTab, setActiveTab] = useState<"overview" | "items" | "import">("overview");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Party[]>([]);
  const [vendors, setVendors] = useState<Party[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [report, setReport] = useState<Reconciliation | null>(null);

  const [lines, setLines] = useState<Line[]>([{ accountId: "", debit: 0, credit: 0 }]);
  const [parties, setParties] = useState<PartyLine[]>([]);
  const [settlement, setSettlement] = useState<Item | null>(null);
  const [settlementDate, setSettlementDate] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementMode, setSettlementMode] = useState("Cash");

  const [searchItem, setSearchItem] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState<"All" | "Customer" | "Vendor">("All");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [chart, c, v, s, o, r] = await Promise.all([
        apiClient.get<Account[]>("/general-ledger/accounts"),
        apiClient.get<Party[]>("/accounting/opening-customers"),
        apiClient.get<Party[]>("/vendors/all"),
        apiClient.get<Stock[]>(`/accounting/opening-stock?cutover=${date}`),
        apiClient.get<Item[]>("/accounting/opening-items"),
        apiClient.get<Reconciliation>(`/accounting/reconciliation?asOf=${date}`),
      ]);
      setAccounts(chart.filter((a) => a.type < 3));
      setCustomers(c);
      setVendors(v);
      setStock(s);
      setItems(o);
      setReport(r);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounting data.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (work: () => Promise<unknown>, successMsg?: string) => {
    setBusy(true);
    setError("");
    try {
      await work();
      await load();
      setSettlement(null);
      if (successMsg) {
        notifications.success("Success", successMsg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Action failed.";
      setError(msg);
      notifications.error("Action Failed", msg);
    } finally {
      setBusy(false);
    }
  };

  const importBalances = (e: FormEvent) => {
    e.preventDefault();
    if (lines.some((l) => !l.accountId || (l.debit === 0 && l.credit === 0))) {
      setError("Please select an account and specify debit or credit for each balance line.");
      return;
    }
    if (parties.some((p) => !p.partyId || !p.reference.trim() || p.amount <= 0)) {
      setError("Please select a party, invoice reference, and amount for each outstanding item.");
      return;
    }
    void run(
      () =>
        apiClient.post("/general-ledger/opening-balances", {
          cutoverDate: date,
          lines,
          parties,
          stockProductIds: stock.map((s) => s.id),
        }),
      "Opening balances and subledger items imported successfully."
    );
  };

  const openSettlement = (item: Item) => {
    setSettlement(item);
    const minD = afterCutover(item.cutoverDate);
    const t = today();
    setSettlementDate(t > minD ? t : minD);
    setSettlementAmount(String(item.balance));
    setSettlementMode("Cash");
  };

  const handleSettle = (e: FormEvent) => {
    e.preventDefault();
    const amt = Number(settlementAmount);
    if (!settlementDate || isNaN(amt) || amt <= 0 || (settlement && amt > settlement.balance)) {
      setError(`Please provide a valid settlement date and positive amount up to ${settlement ? money(settlement.balance) : ""}.`);
      return;
    }
    if (settlement) {
      void run(
        () =>
          apiClient.post(`/accounting/opening-items/${settlement.id}/settlements`, {
            paymentDate: settlementDate,
            amount: amt,
            paymentMode: settlementMode,
          }),
        `Settlement of ${money(amt)} recorded successfully.`
      );
    }
  };

  // Import Live Calculations
  const totalDebits = lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const totalCredits = lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  const trialDiff = Math.abs(totalDebits - totalCredits);
  const isTrialBalanced = trialDiff < 0.01 && lines.length > 0;

  const totalOpeningStockCost = stock.reduce((s, x) => s + x.cost, 0);
  const totalCustomerItems = parties.filter((p) => p.kind === "Customer").reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalVendorItems = parties.filter((p) => p.kind === "Vendor").reduce((s, p) => s + (Number(p.amount) || 0), 0);

  // Filtered opening items
  const filteredItems = items.filter((item) => {
    if (itemTypeFilter !== "All" && item.kind !== itemTypeFilter) return false;
    if (searchItem.trim()) {
      const q = searchItem.toLowerCase();
      return (
        item.partyName.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const allReconciled =
    report &&
    Math.abs(report.receivableDifference) < 0.01 &&
    Math.abs(report.payableDifference) < 0.01 &&
    Math.abs(report.stockDifference) < 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Opening Balances & Reconciliation
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Reconcile subledgers to control accounts (1100, 2000, 1200), post initial cutover balances, and settle opening invoices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">As of Date:</span>
            <input
              type="date"
              aria-label="As of Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none dark:text-slate-200"
            />
          </div>

          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {manage && (
            <Link to="/accounting/opening-stock/add">
              <Button variant="secondary">
                <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Import Opening Stock
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <p className="flex-1 font-medium">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Cards: Control Account Reconciliation Summary */}
      {report && (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Receivables Card */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Users className="h-4 w-4 text-blue-500" />
                  Receivables (1100)
                </span>
                {Math.abs(report.receivableDifference) < 0.01 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Reconciled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    <AlertCircle className="h-3.5 w-3.5" /> Variance
                  </span>
                )}
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {money(report.receivableLedger)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">GL Control Balance</p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Customer Subledger:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {money(report.receivableSubledger)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Difference:</span>
                <span
                  className={`font-semibold ${Math.abs(report.receivableDifference) < 0.01
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                    }`}
                >
                  {money(report.receivableDifference)}
                </span>
              </div>
            </div>
          </div>

          {/* Payables Card */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Building2 className="h-4 w-4 text-amber-500" />
                  Payables (2000)
                </span>
                {Math.abs(report.payableDifference) < 0.01 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Reconciled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    <AlertCircle className="h-3.5 w-3.5" /> Variance
                  </span>
                )}
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {money(report.payableLedger)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">GL Control Balance</p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Vendor Subledger:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {money(report.payableSubledger)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Difference:</span>
                <span
                  className={`font-semibold ${Math.abs(report.payableDifference) < 0.01
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                    }`}
                >
                  {money(report.payableDifference)}
                </span>
              </div>
            </div>
          </div>

          {/* Stock Card */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Boxes className="h-4 w-4 text-indigo-500" />
                  Inventory Stock (1200)
                </span>
                {Math.abs(report.stockDifference) < 0.01 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Reconciled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    <AlertCircle className="h-3.5 w-3.5" /> Variance
                  </span>
                )}
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {money(report.stockLedger)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">GL Control Balance</p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Stock Subledger:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {money(report.stockSubledger)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Difference:</span>
                <span
                  className={`font-semibold ${Math.abs(report.stockDifference) < 0.01
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                    }`}
                >
                  {money(report.stockDifference)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors ${activeTab === "overview"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
          >
            <Scale className="h-4 w-4" />
            Reconciliation Overview
            {allReconciled ? (
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("items")}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors ${activeTab === "items"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
          >
            <FileText className="h-4 w-4" />
            Opening Outstanding Items
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {items.length}
            </span>
          </button>

          {manage && (
            <button
              type="button"
              onClick={() => setActiveTab("import")}
              className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors ${activeTab === "import"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
            >
              <Sparkles className="h-4 w-4" />
              Import Cutover Balances
            </button>
          )}
        </nav>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && report && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Control Accounts Breakdown
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detailed comparison between subledgers and respective General Ledger control accounts as of {date}.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Control Account</th>
                    <th className="px-5 py-3 text-right">Subledger Balance</th>
                    <th className="px-5 py-3 text-right">General Ledger Balance</th>
                    <th className="px-5 py-3 text-right">Variance / Difference</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    {
                      label: "Receivables (1100)",
                      sub: report.receivableSubledger,
                      gl: report.receivableLedger,
                      diff: report.receivableDifference,
                      icon: <Users className="h-4 w-4 text-blue-500" />,
                    },
                    {
                      label: "Payables (2000)",
                      sub: report.payableSubledger,
                      gl: report.payableLedger,
                      diff: report.payableDifference,
                      icon: <Building2 className="h-4 w-4 text-amber-500" />,
                    },
                    {
                      label: "Opening Stock (1200)",
                      sub: report.stockSubledger,
                      gl: report.stockLedger,
                      diff: report.stockDifference,
                      icon: <Boxes className="h-4 w-4 text-indigo-500" />,
                    },
                  ].map((row) => {
                    const isZero = Math.abs(Number(row.diff)) < 0.01;
                    return (
                      <tr key={row.label} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                            {row.icon}
                            {row.label}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-slate-800 dark:text-slate-200">
                          {money(Number(row.sub))}
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-slate-800 dark:text-slate-200">
                          {money(Number(row.gl))}
                        </td>
                        <td
                          className={`px-5 py-4 text-right font-semibold ${isZero
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                            }`}
                        >
                          {money(Number(row.diff))}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {isZero ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Reconciled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                              <AlertCircle className="h-3.5 w-3.5" /> Unbalanced
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Educational / Explanatory card */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-950/50 dark:bg-indigo-950/20">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-300">
              <Scale className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Reconciliation Principles & Cutover Rules
            </h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-indigo-800/80 dark:text-indigo-300/80">
              <li>
                <strong>Customer Subledger</strong> must equal <strong>1100 (Accounts Receivable)</strong>.
              </li>
              <li>
                <strong>Vendor Subledger</strong> must equal <strong>2000 (Accounts Payable)</strong>.
              </li>
              <li>
                <strong>Opening Stock</strong> net historical costs must equal <strong>1200 (Inventory)</strong>.
              </li>
              <li>
                Any trial balance variance between total assets and liabilities/equity posts to <strong>3100 (Retained Earnings)</strong>.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 2: Opening Outstanding Items */}
      {activeTab === "items" && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                {(["All", "Customer", "Vendor"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setItemTypeFilter(kind)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${itemTypeFilter === kind
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                  >
                    {kind}
                  </button>
                ))}
              </div>

              <div className="w-64">
                <input
                  type="text"
                  placeholder="Search party or reference..."
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <div>
                Total Items:{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {filteredItems.length}
                </span>
              </div>
              <div>
                Remaining Balance:{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {money(filteredItems.reduce((acc, it) => acc + it.balance, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Party Name</th>
                    <th className="px-5 py-3">Invoice Reference</th>
                    <th className="px-5 py-3">Due Date</th>
                    <th className="px-5 py-3 text-right">Original Amount</th>
                    <th className="px-5 py-3 text-right">Settled</th>
                    <th className="px-5 py-3 text-right">Balance Due</th>
                    <th className="px-5 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${item.kind === "Customer"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            }`}
                        >
                          {item.kind === "Customer" ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {item.kind}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                        {item.partyName}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                        {item.reference}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                        {item.dueDate}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                        {money(item.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {money(item.settled)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                        {money(item.balance)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {manage && item.balance > 0 ? (
                          <Button size="sm" onClick={() => openSettlement(item)}>
                            {item.kind === "Customer" ? "Receive Payment" : "Pay Vendor"}
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Fully Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        No opening items found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Import Cutover Balances */}
      {activeTab === "import" && manage && (
        <form onSubmit={importBalances} noValidate className="space-y-6">
          {/* Info Card & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Import Opening Balances Once
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Import prior to posting transactional entries. Customer items must equal 1100, vendor items 2000, and stock costs 1200. Any remaining difference posts to retained earnings.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => apiClient.post("/general-ledger/accounts/initialize", {}),
                    "System accounts initialized."
                  )
                }
              >
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Initialize System Accounts
              </Button>
            </div>
          </div>

          {/* Section 1: General Ledger Account Balances */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  1. Balance Sheet Accounts (Assets, Liabilities & Equity)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter cutover balances for balance sheet accounts.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isTrialBalanced
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    }`}
                >
                  {isTrialBalanced ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Trial Balance Equal
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5" /> Out of Balance (
                      {money(trialDiff)})
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {lines.map((l, i) => (
                <div
                  key={i}
                  className="grid items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/50 md:grid-cols-12"
                >
                  <div className="md:col-span-6">
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      Account <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      aria-label={`Account ${i + 1}`}
                      className={inputClass}
                      value={l.accountId}
                      onChange={(e) =>
                        setLines((a) =>
                          a.map((x, j) => (i === j ? { ...x, accountId: e.target.value } : x))
                        )
                      }
                    >
                      <option value="">Select Balance-Sheet Account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} · {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      Debit (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      value={l.debit || ""}
                      placeholder="0.00"
                      onChange={(e) =>
                        setLines((a) =>
                          a.map((x, j) =>
                            i === j ? { ...x, debit: Number(e.target.value) || 0 } : x
                          )
                        )
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      Credit (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      value={l.credit || ""}
                      placeholder="0.00"
                      onChange={(e) =>
                        setLines((a) =>
                          a.map((x, j) =>
                            i === j ? { ...x, credit: Number(e.target.value) || 0 } : x
                          )
                        )
                      }
                    />
                  </div>

                  <div className="flex items-end justify-end md:col-span-2 md:pt-5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setLines((a) => a.filter((_, j) => j !== i))}
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setLines((a) => [...a, { accountId: "", debit: 0, credit: 0 }])}
              >
                <Plus className="h-4 w-4" /> Add Account Balance
              </Button>

              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total Debits: </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {money(totalDebits)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total Credits: </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {money(totalCredits)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Customer / Vendor Outstanding Items */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  2. Outstanding Subledger Items (Invoices & Bills)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Record individual unpaid customer invoices (must sum to 1100) and unpaid vendor bills (must sum to 2000).
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="text-blue-700 dark:text-blue-300">
                  Customer Items: {money(totalCustomerItems)}
                </span>
                <span className="text-amber-700 dark:text-amber-300">
                  Vendor Items: {money(totalVendorItems)}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {parties.map((p, i) => (
                <div
                  key={i}
                  className="grid items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/50 md:grid-cols-12"
                >
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      Kind
                    </label>
                    <select
                      className={inputClass}
                      value={p.kind}
                      onChange={(e) =>
                        setParties((a) =>
                          a.map((x, j) => (i === j ? { ...x, kind: e.target.value, partyId: "" } : x))
                        )
                      }
                    >
                      <option value="Customer">Customer</option>
                      <option value="Vendor">Vendor</option>
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      Party <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      className={inputClass}
                      aria-label="Party"
                      value={p.partyId}
                      onChange={(e) =>
                        setParties((a) =>
                          a.map((x, j) => (i === j ? { ...x, partyId: e.target.value } : x))
                        )
                      }
                    >
                      <option value="">Select {p.kind}</option>
                      {(p.kind === "Customer" ? customers : vendors).map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      Invoice Ref <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      placeholder="e.g. INV-1001"
                      maxLength={100}
                      className={inputClass}
                      value={p.reference}
                      onChange={(e) =>
                        setParties((a) =>
                          a.map((x, j) => (i === j ? { ...x, reference: e.target.value } : x))
                        )
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      Due Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="date"
                      className={inputClass}
                      value={p.dueDate}
                      onChange={(e) =>
                        setParties((a) =>
                          a.map((x, j) => (i === j ? { ...x, dueDate: e.target.value } : x))
                        )
                      }
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      Amount <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      className={inputClass}
                      value={p.amount || ""}
                      placeholder="0.00"
                      onChange={(e) =>
                        setParties((a) =>
                          a.map((x, j) =>
                            i === j ? { ...x, amount: Number(e.target.value) || 0 } : x
                          )
                        )
                      }
                    />
                  </div>

                  <div className="flex items-end justify-end md:col-span-1 md:pt-5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setParties((a) => a.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                </div>
              ))}
              {parties.length === 0 && (
                <p className="py-2 text-xs italic text-slate-400 dark:text-slate-500">
                  No outstanding customer or vendor items added. Click below to add open balances.
                </p>
              )}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setParties((a) => [
                    ...a,
                    { kind: "Customer", partyId: "", reference: "", dueDate: date, amount: 0 },
                  ])
                }
              >
                <Plus className="h-4 w-4" /> Add Outstanding Subledger Item
              </Button>
            </div>
          </div>

          {/* Section 3: Opening Stock Staging Status */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
                <Boxes className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Opening Staged Inventory
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {stock.length} units staged · Total net cost:{" "}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {money(totalOpeningStockCost)}
                  </span>
                </p>
              </div>
            </div>

            <Link to="/accounting/opening-stock/add">
              <Button type="button" variant="secondary" size="sm">
                <Plus className="h-4 w-4" /> Import More Stock
              </Button>
            </Link>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="submit" disabled={busy || !lines.length || !isTrialBalanced}>
              <CheckCircle2 className="h-4 w-4" />
              Post Reconciled Opening Balances
            </Button>
          </div>
        </form>
      )}

      {/* Settlement Modal Dialog */}
      {settlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                {settlement.kind === "Customer" ? (
                  <ArrowDownLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <ArrowUpRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                )}
                {settlement.kind === "Customer"
                  ? "Receive Payment from Customer"
                  : "Pay Vendor Opening Balance"}
              </h2>
              <button
                type="button"
                onClick={() => setSettlement(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Party:</span>{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {settlement.partyName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Invoice Ref:</span>{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {settlement.reference}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Cutover Date:</span>{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {settlement.cutoverDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Remaining Balance:</span>{" "}
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {money(settlement.balance)}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSettle} noValidate className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Payment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="date"
                  min={afterCutover(settlement.cutoverDate)}
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  className={inputClass}
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Must be after cutover date ({afterCutover(settlement.cutoverDate)})
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Settlement Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSettlementAmount(String(settlement.balance))}
                    className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Pay Full Balance ({money(settlement.balance)})
                  </button>
                </div>
                <input
                  required
                  type="number"
                  min="0.01"
                  max={settlement.balance}
                  step="0.01"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <select
                  value={settlementMode}
                  onChange={(e) => setSettlementMode(e.target.value)}
                  className={inputClass}
                >
                  <option value="Cash">Cash (Account 1000)</option>
                  <option value="Bank">Bank (Account 1010)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button type="button" variant="secondary" onClick={() => setSettlement(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  Save Settlement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

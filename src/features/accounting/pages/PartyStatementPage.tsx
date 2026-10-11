import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Search,
  Building2,
  Users,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { apiClient } from "../../../services/apiClient";
import { useNotifications } from "../../../context/NotificationContext";
import type { CustomerBillTemplate } from "../../sale/accounting/types/customerBill.types";
import { defaultCustomerBillTemplate } from "../../sale/accounting/types/customerBill.types";
import type {
  PartyStatementOfAccount,
  StatementPartyType,
  PartyLookupOption
} from "../types/statementOfAccount.types";
import { APP_ROUTES } from "../../../config/routes";

const currency = (amount: number) =>
  `₹${Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PartyStatementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const notifications = useNotifications();

  // URL state
  const initialPartyType = (searchParams.get("partyType") as StatementPartyType) || "Customer";
  const initialPartyId = searchParams.get("partyId") || "";

  // Core filter state
  const [partyType, setPartyType] = useState<StatementPartyType>(initialPartyType);
  const [partyId, setPartyId] = useState<string>(initialPartyId);

  // Date filters (default to current month)
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState<string>(searchParams.get("from") || firstDayOfMonth);
  const [toDate, setToDate] = useState<string>(searchParams.get("to") || today);

  // Party search & list state
  const [partySearch, setPartySearch] = useState("");
  const [partiesList, setPartiesList] = useState<PartyLookupOption[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);

  // Statement data
  const [statement, setStatement] = useState<PartyStatementOfAccount | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [showLedgerGuide, setShowLedgerGuide] = useState(false);
  const [sellerSettings, setSellerSettings] = useState<CustomerBillTemplate>(defaultCustomerBillTemplate);

  // Load tenant branding settings
  useEffect(() => {
    apiClient.get<CustomerBillTemplate>("/settings/customer-bill")
      .then(setSellerSettings)
      .catch(() => {});
  }, []);

  // Load parties list when partyType or search changes
  useEffect(() => {
    let active = true;
    async function loadParties() {
      setLoadingParties(true);
      try {
        if (partyType === "Customer") {
          const res = await apiClient.get<Array<{ id: string; name: string; mobile: string; address?: string; gstin?: string }>>(
            `/customers?search=${encodeURIComponent(partySearch)}&limit=25`
          );
          if (active) setPartiesList(res);
        } else {
          const res = await apiClient.get<Array<{ id: string; name: string; mobile: string; address?: string }>>(
            `/vendors/all`
          );
          if (active) {
            const mapped = res.map((v) => ({
              id: v.id,
              name: v.name,
              mobile: v.mobile,
              address: v.address,
            }));
            const filtered = partySearch.trim()
              ? mapped.filter(m => m.name.toLowerCase().includes(partySearch.toLowerCase()) || m.mobile.includes(partySearch))
              : mapped;
            setPartiesList(filtered);
          }
        }
      } catch {
        if (active) setPartiesList([]);
      } finally {
        if (active) setLoadingParties(false);
      }
    }
    void loadParties();
    return () => { active = false; };
  }, [partyType, partySearch]);

  // Fetch statement data
  const loadStatement = useCallback(async (pType: StatementPartyType, pId: string, fDate: string, tDate: string) => {
    if (!pId) {
      setStatement(null);
      return;
    }
    setLoadingStatement(true);
    try {
      const endpoint = `/general-ledger/party-statement?partyType=${pType}&partyId=${encodeURIComponent(pId)}&from=${fDate}&to=${tDate}`;
      const data = await apiClient.get<PartyStatementOfAccount>(endpoint);
      setStatement(data);
    } catch (err) {
      notifications.error("Statement Error", err instanceof Error ? err.message : "Failed to load statement.");
      setStatement(null);
    } finally {
      setLoadingStatement(false);
    }
  }, [notifications]);

  // Initial auto-load if partyId is present in URL
  useEffect(() => {
    if (partyId) {
      void loadStatement(partyType, partyId, fromDate, toDate);
    }
  }, [partyId, partyType, fromDate, toDate, loadStatement]);

  const handleSelectParty = (id: string) => {
    setPartyId(id);
    setSearchParams({
      partyType,
      partyId: id,
      from: fromDate,
      to: toDate
    });
    void loadStatement(partyType, id, fromDate, toDate);
  };

  const handleQuickPreset = (preset: "thisMonth" | "lastMonth" | "thisFY" | "allTime") => {
    const current = new Date();
    let f = fromDate;
    let t = toDate;

    if (preset === "thisMonth") {
      f = new Date(current.getFullYear(), current.getMonth(), 1).toISOString().slice(0, 10);
      t = current.toISOString().slice(0, 10);
    } else if (preset === "lastMonth") {
      f = new Date(current.getFullYear(), current.getMonth() - 1, 1).toISOString().slice(0, 10);
      t = new Date(current.getFullYear(), current.getMonth(), 0).toISOString().slice(0, 10);
    } else if (preset === "thisFY") {
      const fyStartYear = current.getMonth() >= 3 ? current.getFullYear() : current.getFullYear() - 1;
      f = `${fyStartYear}-04-01`;
      t = current.toISOString().slice(0, 10);
    } else if (preset === "allTime") {
      f = "2020-01-01";
      t = current.toISOString().slice(0, 10);
    }

    setFromDate(f);
    setToDate(t);
    if (partyId) {
      setSearchParams({ partyType, partyId, from: f, to: t });
      void loadStatement(partyType, partyId, f, t);
    }
  };

  const handleExportCsv = () => {
    if (!statement || statement.transactions.length === 0) {
      notifications.warning("No data to export.");
      return;
    }

    const headers = ["Date", "Voucher Type", "Voucher #", "Particulars", "Debit", "Credit", "Running Balance", "Side"];
    const rows = statement.transactions.map((t) => [
      t.date,
      `"${t.voucherType}"`,
      `"${t.voucherNumber}"`,
      `"${t.particulars.replace(/"/g, '""')}"`,
      t.debit.toFixed(2),
      t.credit.toFixed(2),
      t.runningBalance.toFixed(2),
      t.balanceSide
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [
      [`Statement of Account - ${statement.partyName} (${statement.partyType})`],
      [`Period: ${statement.fromDate} to ${statement.toDate}`],
      [`Opening Balance: ${statement.openingBalance.toFixed(2)} ${statement.openingBalanceSide}`],
      [],
      headers,
      ...rows,
      [],
      ["Total Debits", statement.totalPeriodDebit.toFixed(2), "Total Credits", statement.totalPeriodCredit.toFixed(2)],
      ["Closing Balance", statement.closingBalance.toFixed(2), statement.closingBalanceSide]
    ].map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Statement_${statement.partyName.replace(/\s+/g, "_")}_${statement.fromDate}_to_${statement.toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="space-y-6 pb-16">
      {/* Page Header (Hidden on print) */}
      <header className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <FileText size={20} />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Party Statement of Account (Ledger)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tally-style complete customer and vendor subledger with opening balance, chronologically linked vouchers, and aging.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statement && (
            <>
              <Button variant="secondary" onClick={handleExportCsv} className="gap-1.5">
                <Download size={14} /> Export CSV
              </Button>
              <Button onClick={() => window.print()} className="gap-1.5">
                <Printer size={14} /> Print Statement
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Non-Accountant Plain-English Ledger Guide Banner */}
      <div className="no-print rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-purple-50/70 p-3.5 text-xs text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs dark:bg-indigo-500">
              <Lightbulb size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-950 dark:text-indigo-100">
                  Plain-English Ledger Guide
                </span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300">
                  <Sparkles size={10} className="inline mr-0.5" /> Easy for Non-Accountants
                </span>
              </div>
              <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                Understand Debit (+), Credit (-), and Closing Balance without formal accounting training.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowLedgerGuide((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-300/70 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 shadow-2xs hover:bg-indigo-50 dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-200 dark:hover:bg-slate-700"
          >
            {showLedgerGuide ? "Hide Guide" : "💡 How to Read Ledgers"}
            {showLedgerGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {showLedgerGuide && (
          <div className="mt-3 grid grid-cols-1 gap-2.5 border-t border-indigo-200/70 pt-3 sm:grid-cols-2 lg:grid-cols-3 dark:border-indigo-900/50">
            <div className="rounded-lg bg-white/80 p-2.5 shadow-2xs dark:bg-slate-900/60">
              <span className="font-semibold text-blue-900 dark:text-blue-300">Customer (Debtor) Statements</span>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                • <strong>Debit (+)</strong>: Goods or phones you sold to them on bill.<br />
                • <strong>Credit (-)</strong>: Payments they gave you (Cash/UPI).<br />
                • <strong>Closing Dr</strong>: Customer still owes you this money.<br />
                • <strong>Closing Cr</strong>: Customer gave you advance store credit.
              </p>
            </div>
            <div className="rounded-lg bg-white/80 p-2.5 shadow-2xs dark:bg-slate-900/60">
              <span className="font-semibold text-purple-900 dark:text-purple-300">Vendor (Creditor) Statements</span>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                • <strong>Credit (+)</strong>: Stock you purchased from supplier.<br />
                • <strong>Debit (-)</strong>: Payments you sent to supplier.<br />
                • <strong>Closing Cr</strong>: You still owe this money to supplier.<br />
                • <strong>Closing Dr</strong>: You gave advance payment to supplier.
              </p>
            </div>
            <div className="rounded-lg bg-white/80 p-2.5 shadow-2xs dark:bg-slate-900/60">
              <span className="font-semibold text-emerald-900 dark:text-emerald-300">Aging & Overdue Insights</span>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                • <strong>0–30 Days (Green)</strong>: Recent, normal business cycle.<br />
                • <strong>31–60 Days (Blue)</strong>: Due soon, send friendly reminder.<br />
                • <strong>61–90 Days (Amber)</strong>: Overdue, follow up phone call.<br />
                • <strong>90+ Days (Rose)</strong>: Critical overdue, prioritize recovery.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Party Selector Bar (Hidden on print) */}
      <div className="no-print rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Party Type selector */}
          <div className="lg:col-span-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Party Classification</label>
            <div className="mt-1.5 flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => {
                  setPartyType("Customer");
                  setPartyId("");
                  setStatement(null);
                }}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                  partyType === "Customer"
                    ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                <Users size={13} className="inline mr-1" /> Customer (Debtor)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPartyType("Vendor");
                  setPartyId("");
                  setStatement(null);
                }}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                  partyType === "Vendor"
                    ? "bg-white text-purple-700 shadow-sm dark:bg-slate-800 dark:text-purple-300"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                <Building2 size={13} className="inline mr-1" /> Vendor (Creditor)
              </button>
            </div>
          </div>

          {/* Party Autocomplete Dropdown */}
          <div className="lg:col-span-4">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select {partyType} *
            </label>
            <div className="mt-1.5 relative">
              <select
                value={partyId}
                onChange={(e) => handleSelectParty(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">-- Choose {partyType} to View Statement --</option>
                {partiesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.mobile ? `(${p.mobile})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="lg:col-span-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Statement Period</label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Quick Apply Button */}
          <div className="lg:col-span-2 flex items-end">
            <Button
              className="w-full"
              disabled={!partyId || loadingStatement}
              onClick={() => loadStatement(partyType, partyId, fromDate, toDate)}
            >
              {loadingStatement ? "Generating…" : "View Statement"}
            </Button>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400">Quick Presets:</span>
          <button
            type="button"
            onClick={() => handleQuickPreset("thisMonth")}
            className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset("lastMonth")}
            className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          >
            Last Month
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset("thisFY")}
            className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          >
            This Financial Year
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset("allTime")}
            className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          >
            All Time
          </button>
        </div>
      </div>

      {/* Statement Content */}
      {loadingStatement && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Reconciling ledger entries and computing running balance…
        </div>
      )}

      {!loadingStatement && !statement && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
          <FileText size={36} className="mx-auto mb-2 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Party Selected</h3>
          <p className="mt-1 text-xs text-slate-500">
            Please choose a Customer or Vendor from the dropdown above to view their Statement of Account.
          </p>
        </div>
      )}

      {!loadingStatement && statement && (
        <>
          {/* Action Suggestion Card */}
          {statement.partyType === "Customer" && statement.closingBalance > 0 && statement.closingBalanceSide === "Dr" && (
            <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <strong>💡 Suggested Next Action:</strong> This customer has an outstanding balance of{" "}
                  <span className="font-extrabold text-amber-900 dark:text-amber-100">{currency(statement.closingBalance)}</span>.
                </div>
              </div>
              <Link to={`${APP_ROUTES.sale.invoices.list}?action=multipay&customerId=${encodeURIComponent(statement.partyId)}`}>
                <Button size="sm" className="gap-1.5 text-xs">
                  Collect Payment via Multi-Pay <ArrowRight size={13} />
                </Button>
              </Link>
            </div>
          )}
          {statement.partyType === "Customer" && statement.closingBalance === 0 && (
            <div className="no-print flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <strong>✨ All Settled:</strong> This customer has a <strong>Zero Balance</strong>. All past bills are fully paid!
              </div>
            </div>
          )}

          {/* Key Stat Cards (Screen View) */}
          <div className="no-print grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Opening Balance Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Opening Balance</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  statement.openingBalanceSide === "Dr"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                }`}>
                  {statement.openingBalanceSide === "Dr" ? "Debit (Receivable)" : "Credit (Advance)"}
                </span>
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                {currency(statement.openingBalance)}
                <span className="ml-1 text-xs font-semibold text-slate-500">{statement.openingBalanceSide}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Before {statement.fromDate}</p>
            </div>

            {/* Total Period Debits Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Total Invoiced / Debits</span>
                <TrendingUp size={14} className="text-blue-500" />
              </div>
              <div className="mt-2 text-xl font-bold text-blue-600 dark:text-blue-400">
                +{currency(statement.totalPeriodDebit)}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Bills & charges in period</p>
            </div>

            {/* Total Period Credits Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Total Received / Credits</span>
                <TrendingDown size={14} className="text-emerald-500" />
              </div>
              <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                −{currency(statement.totalPeriodCredit)}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Payments & credit notes</p>
            </div>

            {/* Closing Balance Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Closing Balance Due</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  statement.closingBalanceSide === "Dr"
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                }`}>
                  {statement.closingBalanceSide === "Dr"
                    ? (statement.partyType === "Customer" ? "Receivable" : "Advance Debit")
                    : (statement.partyType === "Customer" ? "Advance Credit" : "Payable")}
                </span>
              </div>
              <div className="mt-2 text-xl font-extrabold text-[var(--tenant-primary)]">
                {currency(statement.closingBalance)}
                <span className="ml-1 text-xs font-semibold text-slate-500">{statement.closingBalanceSide}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">As of {statement.toDate}</p>
            </div>
          </div>

          {/* Aging Breakdown Bar (Screen View) */}
          {statement.partyType === "Customer" && statement.aging.totalOutstanding > 0 && (
            <div className="no-print rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock size={15} className="text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Accounts Receivable Aging Breakdown
                  </h3>
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Total Outstanding: {currency(statement.aging.totalOutstanding)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                <div className="rounded-lg bg-emerald-50 p-2.5 dark:bg-emerald-950/40">
                  <span className="text-slate-500 dark:text-slate-400">0 - 30 Days</span>
                  <div className="mt-1 font-bold text-emerald-700 dark:text-emerald-300">
                    {currency(statement.aging.current0To30)}
                  </div>
                </div>
                <div className="rounded-lg bg-blue-50 p-2.5 dark:bg-blue-950/40">
                  <span className="text-slate-500 dark:text-slate-400">31 - 60 Days</span>
                  <div className="mt-1 font-bold text-blue-700 dark:text-blue-300">
                    {currency(statement.aging.days31To60)}
                  </div>
                </div>
                <div className="rounded-lg bg-amber-50 p-2.5 dark:bg-amber-950/40">
                  <span className="text-slate-500 dark:text-slate-400">61 - 90 Days</span>
                  <div className="mt-1 font-bold text-amber-700 dark:text-amber-300">
                    {currency(statement.aging.days61To90)}
                  </div>
                </div>
                <div className="rounded-lg bg-rose-50 p-2.5 dark:bg-rose-950/40">
                  <span className="text-slate-500 dark:text-slate-400">Over 90 Days</span>
                  <div className="mt-1 font-bold text-rose-700 dark:text-rose-300">
                    {currency(statement.aging.daysOver90)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Printable Document / Ledger Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Formal Stationery Header (Always visible in print & screen) */}
            <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {sellerSettings.companyName || "Your Business Name"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {sellerSettings.companyAddress}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Phone: {sellerSettings.companyMobile} {sellerSettings.companyEmail ? `· Email: ${sellerSettings.companyEmail}` : ""}
                  </p>
                  {sellerSettings.taxRegistrationNumber && (
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      GSTIN: {sellerSettings.taxRegistrationNumber}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <div className="inline-block rounded-md bg-slate-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    STATEMENT OF ACCOUNT
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Statement Period: <strong className="text-slate-800 dark:text-slate-200">{statement.fromDate}</strong> to <strong className="text-slate-800 dark:text-slate-200">{statement.toDate}</strong>
                  </p>
                  <p className="text-xs text-slate-400">
                    Generated on: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Party Information Box */}
              <div className="mt-4 rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/40">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">{statement.partyType} Details:</span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {statement.partyName}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300">Phone: {statement.partyMobile}</p>
                    {statement.partyEmail && <p className="text-slate-500">Email: {statement.partyEmail}</p>}
                    <p className="text-slate-500">{statement.partyAddress}</p>
                  </div>
                  <div className="sm:text-right">
                    {statement.partyGstin && (
                      <p className="text-slate-700 dark:text-slate-300">
                        GSTIN: <strong>{statement.partyGstin}</strong>
                      </p>
                    )}
                    {statement.partyStateName && (
                      <p className="text-slate-500">
                        Place of Supply: {statement.partyStateName} ({statement.partyStateCode})
                      </p>
                    )}
                    <div className="mt-2 inline-block rounded border border-slate-200 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900">
                      Opening Balance ({statement.fromDate}): <strong>{currency(statement.openingBalance)} {statement.openingBalanceSide}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-50 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                    <th className="py-2.5 pl-2" style={{ width: "95px" }}>Date</th>
                    <th className="py-2.5" style={{ width: "120px" }}>Voucher Type</th>
                    <th className="py-2.5" style={{ width: "130px" }}>Voucher / Ref #</th>
                    <th className="py-2.5">Particulars / Memo</th>
                    <th className="py-2.5 text-right" style={{ width: "110px" }}>Debit (₹)</th>
                    <th className="py-2.5 text-right" style={{ width: "110px" }}>Credit (₹)</th>
                    <th className="py-2.5 pr-2 text-right" style={{ width: "130px" }}>Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Opening Balance Line */}
                  <tr className="bg-slate-50/50 font-medium text-slate-600 dark:bg-slate-800/20 dark:text-slate-400">
                    <td className="py-2 pl-2">{statement.fromDate}</td>
                    <td>Opening Balance</td>
                    <td>—</td>
                    <td>Balance brought forward</td>
                    <td className="text-right">{statement.openingBalanceSide === "Dr" ? currency(statement.openingBalance) : "—"}</td>
                    <td className="text-right">{statement.openingBalanceSide === "Cr" ? currency(statement.openingBalance) : "—"}</td>
                    <td className="pr-2 text-right font-bold text-slate-800 dark:text-slate-200">
                      {currency(statement.openingBalance)} {statement.openingBalanceSide}
                    </td>
                  </tr>

                  {/* Period Transactions */}
                  {statement.transactions.map((t, idx) => (
                    <tr key={`${t.voucherNumber}_${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 pl-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {t.date}
                      </td>
                      <td>
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          t.voucherType.includes("Invoice")
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : t.voucherType.includes("Receipt") || t.voucherType.includes("Payment")
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                        }`}>
                          {t.voucherType}
                        </span>
                      </td>
                      <td className="font-semibold text-slate-900 dark:text-slate-100">
                        {t.sourceId && t.voucherType.includes("Sales Invoice") ? (
                          <Link
                            to={APP_ROUTES.sale.invoices.print(t.sourceId)}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                            title="View Invoice"
                          >
                            {t.voucherNumber}
                          </Link>
                        ) : (
                          t.voucherNumber || "—"
                        )}
                      </td>
                      <td className="text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {t.particulars}
                      </td>
                      <td className="text-right font-medium text-slate-900 dark:text-slate-100">
                        {t.debit > 0 ? currency(t.debit) : "—"}
                      </td>
                      <td className="text-right font-medium text-slate-900 dark:text-slate-100">
                        {t.credit > 0 ? currency(t.credit) : "—"}
                      </td>
                      <td className="pr-2 text-right font-bold text-slate-900 dark:text-slate-100">
                        {currency(t.runningBalance)}
                        <span className="ml-1 text-[10px] font-semibold text-slate-500">{t.balanceSide}</span>
                      </td>
                    </tr>
                  ))}

                  {statement.transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No transactions recorded in this period.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Table Totals Footer */}
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                    <td colSpan={4} className="py-2.5 pl-2 text-right">
                      Period Total:
                    </td>
                    <td className="py-2.5 text-right text-blue-700 dark:text-blue-300">
                      {currency(statement.totalPeriodDebit)}
                    </td>
                    <td className="py-2.5 text-right text-emerald-700 dark:text-emerald-300">
                      {currency(statement.totalPeriodCredit)}
                    </td>
                    <td className="py-2.5 pr-2 text-right text-sm text-[var(--tenant-primary)]">
                      {currency(statement.closingBalance)} {statement.closingBalanceSide}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Formal Footer Sign-Off (Print-friendly) */}
            <div className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Terms & Reconciliation:</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Please notify us within 7 days in case of any discrepancies in this statement.
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Cheques/transfers are subject to realization.
                  </p>
                </div>
                <div className="text-center sm:text-right">
                  <div className="h-12 border-b border-dashed border-slate-300 dark:border-slate-700 w-44 inline-block"></div>
                  <p className="mt-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    For {sellerSettings.companyName || "Your Business"}
                  </p>
                  <p className="text-[10px] text-slate-400">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}


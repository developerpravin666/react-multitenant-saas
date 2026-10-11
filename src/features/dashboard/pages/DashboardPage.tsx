import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Package,
  Boxes,
  PlusCircle,
  FileText,
  WalletCards,
  RefreshCw,
  Printer,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Zap,
  Sparkles,
  ArrowUpRight,
  Lightbulb
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { apiClient } from "../../../services/apiClient";
import { useNotifications } from "../../../context/NotificationContext";
import type { DashboardSummary } from "../types/dashboard.types";
import { APP_ROUTES } from "../../../config/routes";

const formatCurrency = (amt: number) =>
  `₹${Math.abs(amt).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function DashboardPage() {
  const navigate = useNavigate();
  const notifications = useNotifications();

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [showStoreGuide, setShowStoreGuide] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const summary = await apiClient.get<DashboardSummary>("/dashboard/summary");
      setData(summary);
      setLastRefreshed(new Date());
    } catch (err) {
      notifications.error("Dashboard Error", err instanceof Error ? err.message : "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  }, [notifications]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  // Global hotkeys for dashboard navigation (Tally-speed workflow)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (e.altKey && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        navigate(APP_ROUTES.sale.invoices.add);
      } else if (e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        navigate(APP_ROUTES.partyStatement);
      } else if (e.altKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        navigate(`${APP_ROUTES.sale.invoices.list}?action=multipay`);
      } else if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        void fetchSummary();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, fetchSummary]);

  const metrics = data?.metrics;

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Business Intelligence Dashboard
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Sparkles className="size-3" /> Live
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time financial position, sales billing, automated GST, and inventory valuation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-slate-400 lg:inline-block">
            Updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          <Button
            variant="secondary"
            onClick={() => void fetchSummary()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh <span className="hidden text-[10px] text-slate-400 sm:inline">[Alt+R]</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowStoreGuide((prev) => !prev)}
            className="flex items-center gap-1.5 border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
          >
            <Lightbulb className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            {showStoreGuide ? "Hide Guide" : "💡 Shopkeeper's Guide"}
          </Button>
          <Link to={APP_ROUTES.sale.invoices.add}>
            <Button className="flex items-center gap-1.5 text-xs">
              <PlusCircle className="size-4" />
              New Invoice <span className="text-[10px] opacity-80">[Alt+I]</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4-Step Shopkeeper Guide Banner */}
      {showStoreGuide && (
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/95 via-sky-50/80 to-purple-50/90 p-4 text-xs text-indigo-950 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
          <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2.5 dark:border-indigo-900/40">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs dark:bg-indigo-500">
                <Lightbulb size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-100">
                  Shopkeeper's 4-Step Daily Store Workflow
                </h3>
                <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                  Run your entire mobile store smoothly without any formal accounting background.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowStoreGuide(false)}
              className="text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
            >
              Close
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white/90 p-3 shadow-2xs dark:bg-slate-900/80">
              <span className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
                <Boxes size={15} className="text-blue-500" /> 1. Buy & Receive Stock
              </span>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                Enter phone purchases under <strong>Purchase &gt; Products</strong> with IMEI serial numbers. Stock increases immediately with accurate cost tracking.
              </p>
            </div>
            <div className="rounded-lg bg-white/90 p-3 shadow-2xs dark:bg-slate-900/80">
              <span className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
                <PlusCircle size={15} className="text-emerald-500" /> 2. Fast Customer Billing
              </span>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                Hit <strong>[Alt+I]</strong>. Type customer mobile, pick phone IMEI from stock. Indian GST splits automatically based on customer state. Hit <strong>[Ctrl+Enter]</strong> to print!
              </p>
            </div>
            <div className="rounded-lg bg-white/90 p-3 shadow-2xs dark:bg-slate-900/80">
              <span className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
                <WalletCards size={15} className="text-purple-500" /> 3. Smart Multi-Pay
              </span>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                Hit <strong>[Alt+M]</strong>. When a customer pays a lumpsum against old bills, the system clears their oldest bills first (FIFO) and saves extra as advance store credit.
              </p>
            </div>
            <div className="rounded-lg bg-white/90 p-3 shadow-2xs dark:bg-slate-900/80">
              <span className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
                <FileText size={15} className="text-amber-500" /> 4. Party Ledger (SOA)
              </span>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                Hit <strong>[Alt+P]</strong>. View chronological customer and vendor statements with running balances and color-coded overdue aging (0-30, 31-60, 61-90 days).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Launch Hotbar */}
      <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Zap className="size-3.5 text-amber-500" /> Quick Actions
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={APP_ROUTES.sale.invoices.add}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500"
            >
              <PlusCircle className="size-3.5 text-blue-500" />
              <span>New Invoice</span>
              <kbd className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-mono text-slate-500 dark:bg-slate-700 dark:text-slate-400">Alt+I</kbd>
            </Link>

            <Link
              to={`${APP_ROUTES.sale.invoices.list}?action=multipay`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500"
            >
              <WalletCards className="size-3.5 text-emerald-500" />
              <span>Smart Multi-Pay</span>
              <kbd className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-mono text-slate-500 dark:bg-slate-700 dark:text-slate-400">Alt+M</kbd>
            </Link>

            <Link
              to={APP_ROUTES.partyStatement}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:border-violet-400 hover:text-violet-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-violet-500"
            >
              <FileText className="size-3.5 text-violet-500" />
              <span>Party Ledger (SOA)</span>
              <kbd className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-mono text-slate-500 dark:bg-slate-700 dark:text-slate-400">Alt+P</kbd>
            </Link>

            <Link
              to={APP_ROUTES.taxReports}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500"
            >
              <Receipt className="size-3.5 text-indigo-500" />
              <span>Tax / GST Reports</span>
            </Link>

            <Link
              to={APP_ROUTES.stockMovements}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-cyan-500"
            >
              <Boxes className="size-3.5 text-cyan-500" />
              <span>Stock Movements</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 6 Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* 1. Monthly Revenue */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Revenue</span>
            <span className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <TrendingUp className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {metrics ? formatCurrency(metrics.monthlyRevenue) : "—"}
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Current month billed
            </p>
          </div>
        </div>

        {/* 2. Total Receivables */}
        <div className="relative overflow-hidden rounded-xl border border-rose-200/70 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-rose-900/40 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Receivables (AR)</span>
            <span className="rounded-lg bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <TrendingDown className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {metrics ? formatCurrency(metrics.totalReceivables) : "—"}
            </div>
            <div className="mt-0.5 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {metrics ? `${metrics.unpaidInvoicesCount} unpaid bills` : "—"}
              </span>
              <Link to={APP_ROUTES.partyStatement} className="font-medium text-rose-600 hover:underline dark:text-rose-400">
                SOA →
              </Link>
            </div>
          </div>
        </div>

        {/* 3. Total Payables */}
        <div className="relative overflow-hidden rounded-xl border border-amber-200/70 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-amber-900/40 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Payables (AP)</span>
            <span className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <ArrowUpRight className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {metrics ? formatCurrency(metrics.totalPayables) : "—"}
            </div>
            <div className="mt-0.5 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Supplier due</span>
              <Link to={`${APP_ROUTES.partyStatement}?partyType=Vendor`} className="font-medium text-amber-600 hover:underline dark:text-amber-400">
                Vendor SOA →
              </Link>
            </div>
          </div>
        </div>

        {/* 4. Net GST Liability */}
        <div className="relative overflow-hidden rounded-xl border border-purple-200/70 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-purple-900/40 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Net GST Due</span>
            <span className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Receipt className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
              {metrics ? formatCurrency(metrics.netGstLiability) : "—"}
            </div>
            <div className="mt-0.5 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Output − Input</span>
              <Link to={APP_ROUTES.taxReports} className="font-medium text-purple-600 hover:underline dark:text-purple-400">
                Tax GSTR →
              </Link>
            </div>
          </div>
        </div>

        {/* 5. Inventory Valuation */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-200/70 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-emerald-900/40 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Stock Valuation</span>
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Package className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {metrics ? formatCurrency(metrics.inventoryValuation) : "—"}
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              At purchase cost
            </p>
          </div>
        </div>

        {/* 6. In-Stock Units */}
        <div className="relative overflow-hidden rounded-xl border border-cyan-200/70 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-cyan-900/40 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">In-Stock Units</span>
            <span className="rounded-lg bg-cyan-50 p-2 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              <Boxes className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-cyan-700 dark:text-cyan-300">
              {metrics ? `${metrics.inStockUnits} units` : "—"}
            </div>
            <div className="mt-0.5 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Available on floor</span>
              <Link to={APP_ROUTES.stockMovements} className="font-medium text-cyan-600 hover:underline dark:text-cyan-400">
                Stock →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Proactive Action Suggestions */}
      {metrics && (metrics.totalReceivables > 0 || metrics.netGstLiability > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-950 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <span className="font-bold text-indigo-950 dark:text-indigo-100">💡 Smart Store Insights:</span>
              <span className="ml-1 text-indigo-900/90 dark:text-indigo-300">
                {metrics.totalReceivables > 0
                  ? `You have ${formatCurrency(metrics.totalReceivables)} pending across ${metrics.unpaidInvoicesCount} customer bill(s). Consider running Multi-Pay to clear dues.`
                  : `Your sales ledger is healthy and all customer bills are settled!`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {metrics.totalReceivables > 0 && (
              <Link to={`${APP_ROUTES.sale.invoices.list}?action=multipay`}>
                <Button size="sm" className="gap-1 text-xs">
                  <WalletCards size={13} /> Settle Customer Dues
                </Button>
              </Link>
            )}
            <Link to={APP_ROUTES.taxReports}>
              <Button size="sm" variant="secondary" className="gap-1 text-xs">
                <Receipt size={13} /> Review GST
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Main Grid: Left Recent Invoices + Right Intelligence & Watchlist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 spans): Recent Invoices */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-slate-500" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Recent Sales Invoices
                </h2>
              </div>
              <Link
                to={APP_ROUTES.sale.invoices.list}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                View All Invoices <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading && !data ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                        Loading recent invoices...
                      </td>
                    </tr>
                  ) : data?.recentInvoices && data.recentInvoices.length > 0 ? (
                    data.recentInvoices.map((inv) => (
                      <tr key={inv.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-white">
                          {inv.billNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                          {inv.customerName}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {inv.invoiceDate}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                          {formatCurrency(inv.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {inv.balance > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">{formatCurrency(inv.balance)}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">₹0.00</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {inv.paymentStatus === "Paid" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <CheckCircle2 className="size-3" /> Paid
                            </span>
                          ) : inv.paymentStatus === "Partial" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                              Partial
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              Unpaid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={APP_ROUTES.sale.invoices.print(inv.id)}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                            title="Print Tax Invoice"
                          >
                            <Printer className="size-3" /> Print
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                        No sales invoices recorded yet.
                        <div className="mt-2">
                          <Link to={APP_ROUTES.sale.invoices.add}>
                            <Button className="text-xs">Create First Invoice</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Inventory Alerts & Speed Tips */}
        <div className="space-y-6">
          {/* Low Stock Watchlist */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Stock Depletion Watchlist
                </h3>
              </div>
              <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                ≤ 2 units
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {data?.lowStockAlerts && data.lowStockAlerts.length > 0 ? (
                data.lowStockAlerts.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-sm dark:border-slate-800/80 dark:bg-slate-800/30"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.brand}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.productModel}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      item.availableCount === 0
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                    }`}>
                      {item.availableCount === 0 ? "Out of Stock" : `${item.availableCount} left`}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 py-4 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  All inventory models have healthy stock levels (&gt; 2 units).
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Link
                to={APP_ROUTES.stockMovements}
                className="flex items-center justify-between text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                <span>Full Inventory &amp; IMEI Movements</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>

          {/* ERP Speed Cheat Sheet */}
          <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-slate-100/60 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
            <div className="flex items-center gap-2 pb-2">
              <Zap className="size-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Keyboard-Speed Shortcuts
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Operate at Tally speed without lifting your hands from the keyboard:
            </p>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">New Sales Invoice</span>
                <kbd className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Alt + I</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Party Ledger (SOA)</span>
                <kbd className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Alt + P</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Smart Multi-Pay (FIFO)</span>
                <kbd className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Alt + M</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Save Invoice (in Form)</span>
                <kbd className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Ctrl + Enter / Alt + S</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Add Phone Row</span>
                <kbd className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Alt + N</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Add Accessory Row</span>
                <kbd className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Alt + A</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


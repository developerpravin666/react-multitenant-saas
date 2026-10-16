import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Scale,
  TrendingUp,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Package,
  Boxes,
  HelpCircle,
  Building,
} from "lucide-react";
import { valuationApi } from "../services/valuationApi";
import { godownApi } from "../services/godownApi";
import type {
  StockValuationSummaryDto,
  StockValuationItemDto,
  TradingProfitLossValuationDto,
  UnitOfMeasureDto,
  CreateUnitOfMeasureRequest,
} from "../types/valuation.types";
import type { GodownDto } from "../types/godown.types";

export const StockValuationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"valuation" | "cogs" | "uom">("valuation");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Valuation Tab State
  const [valuationData, setValuationData] = useState<StockValuationSummaryDto | null>(null);
  const [method, setMethod] = useState<string>("FIFO");
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split("T")[0] || "");
  const [selectedGodownId, setSelectedGodownId] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // COGS / Trading Tab State
  const [cogsData, setCogsData] = useState<TradingProfitLossValuationDto | null>(null);
  const [fromDate, setFromDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0] || "";
  });
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split("T")[0] || "");
  const [cogsLoading, setCogsLoading] = useState<boolean>(false);

  // UOM Tab State
  const [uoms, setUoms] = useState<UnitOfMeasureDto[]>([]);
  const [isUomModalOpen, setIsUomModalOpen] = useState<boolean>(false);
  const [uomForm, setUomForm] = useState<CreateUnitOfMeasureRequest>({
    code: "",
    name: "",
    symbol: "",
    isBaseUnit: true,
    baseUnitId: "",
    conversionRate: 1,
    description: "",
  });
  const [uomSubmitting, setUomSubmitting] = useState<boolean>(false);
  const [uomError, setUomError] = useState<string | null>(null);

  // Godowns for filter
  const [godowns, setGodowns] = useState<GodownDto[]>([]);

  useEffect(() => {
    loadGodowns();
    if (activeTab === "valuation") {
      loadValuationData();
    } else if (activeTab === "cogs") {
      loadCogsData();
    } else if (activeTab === "uom") {
      loadUoms();
    }
  }, [activeTab, method, asOfDate, selectedGodownId]);

  const loadGodowns = async () => {
    try {
      const data = await godownApi.getGodowns();
      setGodowns(data || []);
    } catch {
      // Ignore godown load failures
    }
  };

  const loadValuationData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await valuationApi.getStockValuationSummary({
        method,
        asOfDate,
        godownId: selectedGodownId || undefined,
        search: search.trim() || undefined,
      });
      setValuationData(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load stock valuation data.");
    } finally {
      setLoading(false);
    }
  };

  const loadCogsData = async () => {
    setCogsLoading(true);
    setError(null);
    try {
      const data = await valuationApi.getTradingProfitLossValuation({
        fromDate,
        toDate,
      });
      setCogsData(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load Trading & COGS valuation data.");
    } finally {
      setCogsLoading(false);
    }
  };

  const loadUoms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await valuationApi.getUnitOfMeasures();
      setUoms(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load units of measure.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUom = async (e: React.FormEvent) => {
    e.preventDefault();
    setUomSubmitting(true);
    setUomError(null);
    try {
      await valuationApi.createUnitOfMeasure({
        code: uomForm.code.trim().toUpperCase(),
        name: uomForm.name.trim(),
        symbol: uomForm.symbol.trim(),
        isBaseUnit: uomForm.isBaseUnit,
        baseUnitId: !uomForm.isBaseUnit ? uomForm.baseUnitId : undefined,
        conversionRate: !uomForm.isBaseUnit ? Number(uomForm.conversionRate) : undefined,
        description: uomForm.description?.trim() || undefined,
      });
      setIsUomModalOpen(false);
      setUomForm({
        code: "",
        name: "",
        symbol: "",
        isBaseUnit: true,
        baseUnitId: "",
        conversionRate: 1,
        description: "",
      });
      await loadUoms();
    } catch (err: any) {
      setUomError(err?.message || "Failed to create Unit of Measure.");
    } finally {
      setUomSubmitting(false);
    }
  };

  const formatCurrency = (val: number | null | undefined): string => {
    const num = val ?? 0;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatQty = (qty: number | null | undefined): string => {
    const num = qty ?? 0;
    return num.toLocaleString("en-IN", { maximumFractionDigits: 4 });
  };

  const exportValuationCsv = () => {
    if (!valuationData || !valuationData.items || valuationData.items.length === 0) return;
    const headers = [
      "Item Code",
      "Item Name",
      "Category",
      "Base Qty",
      "Base Unit",
      "Alt Qty",
      "Alt Unit",
      "FIFO Rate",
      "FIFO Value",
      "Wt Avg Rate",
      "Wt Avg Value",
      "Last Cost Rate",
      "Last Cost Value",
      "Variance (FIFO - Wt Avg)",
    ];

    const rows = valuationData.items.map((i) => [
      `"${i.itemCode}"`,
      `"${i.itemName.replace(/"/g, '""')}"`,
      `"${i.category}"`,
      i.quantity,
      `"${i.baseUnit}"`,
      i.alternateQuantity ?? "",
      `"${i.alternateUnit ?? ""}"`,
      i.fifoRate,
      i.fifoValue,
      i.weightedAverageRate,
      i.weightedAverageValue,
      i.lastPurchaseRate,
      i.lastPurchaseValue,
      i.variance,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Stock_Valuation_${asOfDate}_${method}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const baseUnits = useMemo(() => uoms.filter((u) => u.isBaseUnit), [uoms]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Scale className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            Stock Valuation & Alternate Units
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            FIFO Lot Costing, Periodic Weighted Average, Last Purchase Rates & Compound Units (e.g. 1 Box = 10 Pcs)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "valuation" && (
            <button
              onClick={exportValuationCsv}
              disabled={loading || !valuationData?.items?.length}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}

          {activeTab === "uom" && (
            <button
              onClick={() => setIsUomModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Unit of Measure
            </button>
          )}

          <button
            onClick={() => {
              if (activeTab === "valuation") loadValuationData();
              else if (activeTab === "cogs") loadCogsData();
              else loadUoms();
            }}
            disabled={loading || cogsLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading || cogsLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab("valuation")}
          className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${activeTab === "valuation"
              ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
        >
          <Layers className="w-4 h-4" />
          Stock Valuation Summary
        </button>

        <button
          onClick={() => setActiveTab("cogs")}
          className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${activeTab === "cogs"
              ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
        >
          <TrendingUp className="w-4 h-4" />
          Trading & COGS Comparative Analysis
        </button>

        <button
          onClick={() => setActiveTab("uom")}
          className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${activeTab === "uom"
              ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
        >
          <Boxes className="w-4 h-4" />
          Units of Measure (UOM)
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: STOCK VALUATION SUMMARY */}
      {activeTab === "valuation" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Valuation Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full text-sm rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="FIFO">FIFO (First In, First Out)</option>
                <option value="WEIGHTEDAVERAGE">Monthly / Periodic Weighted Average</option>
                <option value="LASTPURCHASECOST">Last Purchase Cost</option>
                <option value="ALL">Compare All Costing Methods</option>
              </select>
            </div>

            <div className="w-44">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                As Of Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full text-sm rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="w-48">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Godown / Location
              </label>
              <select
                value={selectedGodownId}
                onChange={(e) => setSelectedGodownId(e.target.value)}
                className="w-full text-sm rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">All Godowns</option>
                {godowns.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Filter Item / SKU
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search item code or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadValuationData()}
                  className="w-full pl-9 text-sm rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total In-Stock Items</span>
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {valuationData?.totalItems ?? 0}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({formatQty(valuationData?.totalQuantity)} units)
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Unique SKU & Serialized lines</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">FIFO Valuation</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  Default
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(valuationData?.fifoValuation)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Unexhausted lot layers</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Weighted Average</span>
                <Scale className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(valuationData?.weightedAverageValuation)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Periodic weighted avg cost</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Costing Variance</span>
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(valuationData?.valuationVariance)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">FIFO vs Weighted Average</p>
            </div>
          </div>

          {/* Valuation Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Stock Items Valuation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click on an item to inspect unexhausted purchase lot breakdown (FIFO layers)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-8"></th>
                    <th className="py-3 px-4">Item Code</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Closing Qty</th>
                    <th className="py-3 px-4 text-right">FIFO Rate</th>
                    <th className="py-3 px-4 text-right">FIFO Value</th>
                    <th className="py-3 px-4 text-right">Wt. Avg Rate</th>
                    <th className="py-3 px-4 text-right">Wt. Avg Value</th>
                    <th className="py-3 px-4 text-right">Last Cost</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
                          <span>Computing inventory valuation layers...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !valuationData?.items || valuationData.items.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No in-stock inventory items found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    valuationData.items.map((item) => {
                      const isExpanded = expandedRow === item.itemId;
                      return (
                        <React.Fragment key={item.itemId}>
                          <tr
                            onClick={() => setExpandedRow(isExpanded ? null : item.itemId)}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-4 text-slate-400">
                              {item.lots && item.lots.length > 0 ? (
                                isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-primary-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )
                              ) : null}
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                              {item.itemCode}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-800 dark:text-slate-200">{item.itemName}</div>
                              {item.alternateUnit && item.conversionFactor && (
                                <div className="text-xs text-primary-600 dark:text-primary-400">
                                  1 {item.alternateUnit} = {item.conversionFactor} {item.baseUnit}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 text-xs font-semibold rounded ${item.category === "Serialized"
                                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                  }`}
                              >
                                {item.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {formatQty(item.quantity)} {item.baseUnit}
                              </div>
                              {item.alternateQuantity !== null && item.alternateQuantity !== undefined && (
                                <div className="text-xs text-slate-400">
                                  ({formatQty(item.alternateQuantity)} {item.alternateUnit})
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.fifoRate)}</td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(item.fifoValue)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.weightedAverageRate)}</td>
                            <td className="py-3 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(item.weightedAverageValue)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.lastPurchaseRate)}</td>
                            <td className="py-3 px-4 text-right font-mono">
                              <span
                                className={`font-semibold ${item.variance > 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : item.variance < 0
                                      ? "text-rose-600 dark:text-rose-400"
                                      : "text-slate-400"
                                  }`}
                              >
                                {formatCurrency(item.variance)}
                              </span>
                            </td>
                          </tr>

                          {/* Expanded Lots Drill-Down */}
                          {isExpanded && item.lots && item.lots.length > 0 && (
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                              <td colSpan={11} className="py-3 px-8">
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Layers className="w-3.5 h-3.5 text-primary-500" />
                                    Active Purchase Lots / FIFO Layers for {item.itemName}
                                  </div>
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500">
                                      <tr>
                                        <th className="py-2 px-3">Acquisition Date</th>
                                        <th className="py-2 px-3">Reference / Bill</th>
                                        <th className="py-2 px-3 text-right">Original Qty</th>
                                        <th className="py-2 px-3 text-right">Remaining In-Stock</th>
                                        <th className="py-2 px-3 text-right">Lot Unit Cost</th>
                                        <th className="py-2 px-3 text-right">Layer Value</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                                      {item.lots.map((lot, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                          <td className="py-1.5 px-3">{lot.date}</td>
                                          <td className="py-1.5 px-3 font-sans">{lot.reference}</td>
                                          <td className="py-1.5 px-3 text-right">{formatQty(lot.originalQuantity)}</td>
                                          <td className="py-1.5 px-3 text-right font-semibold text-primary-600 dark:text-primary-400">
                                            {formatQty(lot.remainingQuantity)}
                                          </td>
                                          <td className="py-1.5 px-3 text-right">{formatCurrency(lot.unitCost)}</td>
                                          <td className="py-1.5 px-3 text-right font-semibold">
                                            {formatCurrency(lot.valuationValue)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRADING & COGS COMPARATIVE STATEMENT */}
      {activeTab === "cogs" && (
        <div className="space-y-6">
          {/* Date Selector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="text-sm rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="text-sm rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                />
              </div>

              <button
                onClick={loadCogsData}
                disabled={cogsLoading}
                className="mt-5 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                Apply Range
              </button>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs text-slate-400">Period Net Sales</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(cogsData?.salesRevenue)}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div>
                <span className="text-xs text-slate-400">Period Purchases</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(cogsData?.fifo?.purchases)}
                </div>
              </div>
            </div>
          </div>

          {/* Comparative Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Cost of Goods Sold (COGS) & Gross Profit Comparison
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluates how inventory costing methods directly impact reported profit margins in the Trading Statement
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-6">Statement Metric</th>
                    <th className="py-3.5 px-6 text-right text-emerald-600 dark:text-emerald-400">
                      FIFO (First In, First Out)
                    </th>
                    <th className="py-3.5 px-6 text-right text-indigo-600 dark:text-indigo-400">
                      Weighted Average
                    </th>
                    <th className="py-3.5 px-6 text-right text-blue-600 dark:text-blue-400">
                      Last Purchase Cost
                    </th>
                    <th className="py-3.5 px-6 text-right text-amber-600 dark:text-amber-400">
                      Variance (FIFO - Wt. Avg)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-sm">
                  {cogsLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
                          <span>Generating comparative trading statement...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !cogsData ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                        No financial data available for the chosen date range.
                      </td>
                    </tr>
                  ) : (
                    <>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-6 font-sans font-medium text-slate-900 dark:text-slate-100">
                          Opening Stock (A)
                        </td>
                        <td className="py-3 px-6 text-right">{formatCurrency(cogsData.fifo.openingStock)}</td>
                        <td className="py-3 px-6 text-right">{formatCurrency(cogsData.weightedAverage.openingStock)}</td>
                        <td className="py-3 px-6 text-right">{formatCurrency(cogsData.lastPurchaseCost.openingStock)}</td>
                        <td className="py-3 px-6 text-right text-slate-500">
                          {formatCurrency(cogsData.fifo.openingStock - cogsData.weightedAverage.openingStock)}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-6 font-sans font-medium text-slate-900 dark:text-slate-100">
                          Add: Inward Purchases (B)
                        </td>
                        <td className="py-3 px-6 text-right">{formatCurrency(cogsData.fifo.purchases)}</td>
                        <td className="py-3 px-6 text-right">{formatCurrency(cogsData.weightedAverage.purchases)}</td>
                        <td className="py-3 px-6 text-right">{formatCurrency(cogsData.lastPurchaseCost.purchases)}</td>
                        <td className="py-3 px-6 text-right text-slate-400">₹0.00</td>
                      </tr>

                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-6 font-sans font-medium text-slate-900 dark:text-slate-100">
                          Less: Closing Stock (C)
                        </td>
                        <td className="py-3 px-6 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(cogsData.fifo.closingStock)}
                        </td>
                        <td className="py-3 px-6 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(cogsData.weightedAverage.closingStock)}
                        </td>
                        <td className="py-3 px-6 text-right font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrency(cogsData.lastPurchaseCost.closingStock)}
                        </td>
                        <td className="py-3 px-6 text-right font-semibold text-amber-600 dark:text-amber-400">
                          {formatCurrency(cogsData.valuationVariance)}
                        </td>
                      </tr>

                      <tr className="bg-slate-50/80 dark:bg-slate-800/50 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                        <td className="py-3.5 px-6 font-sans text-slate-900 dark:text-white">
                          Cost of Goods Sold (COGS = A + B - C)
                        </td>
                        <td className="py-3.5 px-6 text-right text-slate-900 dark:text-white">
                          {formatCurrency(cogsData.fifo.costOfGoodsSold)}
                        </td>
                        <td className="py-3.5 px-6 text-right text-slate-900 dark:text-white">
                          {formatCurrency(cogsData.weightedAverage.costOfGoodsSold)}
                        </td>
                        <td className="py-3.5 px-6 text-right text-slate-900 dark:text-white">
                          {formatCurrency(cogsData.lastPurchaseCost.costOfGoodsSold)}
                        </td>
                        <td className="py-3.5 px-6 text-right text-slate-900 dark:text-white">
                          {formatCurrency(cogsData.fifo.costOfGoodsSold - cogsData.weightedAverage.costOfGoodsSold)}
                        </td>
                      </tr>

                      <tr className="bg-emerald-50/60 dark:bg-emerald-950/20 font-bold text-base">
                        <td className="py-4 px-6 font-sans text-emerald-950 dark:text-emerald-200">
                          Gross Profit (Revenue - COGS)
                        </td>
                        <td className="py-4 px-6 text-right text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(cogsData.fifo.grossProfit)}
                        </td>
                        <td className="py-4 px-6 text-right text-indigo-700 dark:text-indigo-400">
                          {formatCurrency(cogsData.weightedAverage.grossProfit)}
                        </td>
                        <td className="py-4 px-6 text-right text-blue-700 dark:text-blue-400">
                          {formatCurrency(cogsData.lastPurchaseCost.grossProfit)}
                        </td>
                        <td className="py-4 px-6 text-right text-amber-700 dark:text-amber-400">
                          {formatCurrency(cogsData.fifo.grossProfit - cogsData.weightedAverage.grossProfit)}
                        </td>
                      </tr>

                      <tr className="bg-emerald-50/40 dark:bg-emerald-950/10 font-semibold text-xs">
                        <td className="py-3 px-6 font-sans text-slate-700 dark:text-slate-300">
                          Gross Profit Margin %
                        </td>
                        <td className="py-3 px-6 text-right text-emerald-700 dark:text-emerald-400">
                          {cogsData.fifo.grossProfitMarginPercent.toFixed(2)}%
                        </td>
                        <td className="py-3 px-6 text-right text-indigo-700 dark:text-indigo-400">
                          {cogsData.weightedAverage.grossProfitMarginPercent.toFixed(2)}%
                        </td>
                        <td className="py-3 px-6 text-right text-blue-700 dark:text-blue-400">
                          {cogsData.lastPurchaseCost.grossProfitMarginPercent.toFixed(2)}%
                        </td>
                        <td className="py-3 px-6 text-right text-slate-500">
                          {(cogsData.fifo.grossProfitMarginPercent - cogsData.weightedAverage.grossProfitMarginPercent).toFixed(2)}%
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {cogsData?.summaryNotes && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {cogsData.summaryNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: UNITS OF MEASURE (UOM) MASTER */}
      {activeTab === "uom" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Units of Measure & Compound Conversions</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage base units (PCS, NOS, NAG, KGS) and alternate units with conversion factors (e.g. 1 Box = 10 Pcs, 1 Dozen = 12 Pcs)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Symbol</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Conversion Rule</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        <RefreshCw className="w-4 h-4 animate-spin inline-block mr-2" />
                        Loading units of measure...
                      </td>
                    </tr>
                  ) : uoms.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No units of measure found.
                      </td>
                    </tr>
                  ) : (
                    uoms.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {u.code}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {u.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {u.symbol}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded ${u.isBaseUnit
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                              }`}
                          >
                            {u.isBaseUnit ? "Base Unit" : "Compound / Alternate"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {!u.isBaseUnit && u.baseUnitCode && u.conversionRate ? (
                            <span className="font-mono text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2 py-1 rounded">
                              1 {u.code} = {u.conversionRate} {u.baseUnitCode}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Primary standard</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                          {u.description || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded ${u.isActive
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                              }`}
                          >
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE UNIT OF MEASURE */}
      {isUomModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-primary-600" />
                Add Unit of Measure
              </h3>
              <button
                onClick={() => setIsUomModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {uomError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uomError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUom} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Unit Code * (e.g. PCS, BOX, NAG, DOZ)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BOX"
                  value={uomForm.code}
                  onChange={(e) => setUomForm({ ...uomForm, code: e.target.value.toUpperCase() })}
                  className="w-full text-sm rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Unit Name * (e.g. Box of 10 Pieces)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Box"
                  value={uomForm.name}
                  onChange={(e) => setUomForm({ ...uomForm, name: e.target.value })}
                  className="w-full text-sm rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Symbol * (e.g. box, pcs, nos)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. box"
                  value={uomForm.symbol}
                  onChange={(e) => setUomForm({ ...uomForm, symbol: e.target.value })}
                  className="w-full text-sm rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Unit Classification
                </label>
                <div className="flex items-center gap-4 mt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="uomType"
                      checked={uomForm.isBaseUnit}
                      onChange={() => setUomForm({ ...uomForm, isBaseUnit: true, baseUnitId: "" })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-xs text-slate-800 dark:text-slate-200">Base Unit</span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="uomType"
                      checked={!uomForm.isBaseUnit}
                      onChange={() => setUomForm({ ...uomForm, isBaseUnit: false })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-xs text-slate-800 dark:text-slate-200">Compound / Alternate Unit</span>
                  </label>
                </div>
              </div>

              {!uomForm.isBaseUnit && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Target Base Unit *
                    </label>
                    <select
                      required={!uomForm.isBaseUnit}
                      value={uomForm.baseUnitId || ""}
                      onChange={(e) => setUomForm({ ...uomForm, baseUnitId: e.target.value })}
                      className="w-full text-sm rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Select Base Unit...</option>
                      {baseUnits.map((bu) => (
                        <option key={bu.id} value={bu.id}>
                          {bu.name} ({bu.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Conversion Factor * (1 {uomForm.code || "UNIT"} = X Base Units)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      required={!uomForm.isBaseUnit}
                      placeholder="e.g. 10"
                      value={uomForm.conversionRate || ""}
                      onChange={(e) => setUomForm({ ...uomForm, conversionRate: parseFloat(e.target.value) || 0 })}
                      className="w-full text-sm rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description / Note
                </label>
                <input
                  type="text"
                  placeholder="Optional description"
                  value={uomForm.description || ""}
                  onChange={(e) => setUomForm({ ...uomForm, description: e.target.value })}
                  className="w-full text-sm rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUomModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uomSubmitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {uomSubmitting ? "Saving..." : "Create Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
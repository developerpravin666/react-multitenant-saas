import React, { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, FileText, CheckCircle2, Building, AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { apiClient } from "../../services/apiClient";
import type { Gstr1Summary, Gstr3bSummary } from "./types/gstReturns.types";

type RateRow = {
  taxTreatment?: string;
  igstRate: number;
  igstAmount: number;
  cgstRate: number;
  sgstRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
};

type TaxReport = {
  fromDate: string;
  toDate: string;
  sales: RateRow[];
  purchases: RateRow[];
  salesTaxable: number;
  outputTax: number;
  purchaseTaxable: number;
  inputTaxCredit: number;
  outputTaxLedger: number;
  inputTaxCreditLedger: number;
  outputTaxDifference: number;
  inputTaxCreditDifference: number;
  netTaxPayable: number;
};

const inputClass =
  "min-h-9 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 text-slate-900 dark:text-slate-100";

const money = (value: number | undefined | null) =>
  (Number(value) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

type TabType = "summary" | "gstr1" | "gstr3b";

export function TaxReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const firstDayOfMonth = `${today.slice(0, 7)}-01`;
  const [from, setFrom] = useState(firstDayOfMonth);
  const [to, setTo] = useState(today);
  const [activeTab, setActiveTab] = useState<TabType>("gstr1");

  // Summary state
  const [report, setReport] = useState<TaxReport | null>(null);
  // GSTR-1 state
  const [gstr1, setGstr1] = useState<Gstr1Summary | null>(null);
  const [gstr1SubTab, setGstr1SubTab] = useState<"b2b" | "b2cl" | "b2cs" | "cdnr" | "hsn" | "docs">("b2b");
  // GSTR-3B state
  const [gstr3b, setGstr3b] = useState<Gstr3bSummary | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ from, to });
      const [taxRep, g1, g3b] = await Promise.all([
        apiClient.get<TaxReport>(`/general-ledger/tax-report?${query}`).catch(() => null),
        apiClient.get<Gstr1Summary>(`/tax/gstr1/summary?${query}`).catch(() => null),
        apiClient.get<Gstr3bSummary>(`/tax/gstr3b/summary?${query}`).catch(() => null),
      ]);
      setReport(taxRep);
      setGstr1(g1);
      setGstr3b(g3b);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load GST return data.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Export GSTR-1 JSON (GST Portal format)
  const exportGstr1Json = async () => {
    setExportingJson(true);
    try {
      const query = new URLSearchParams({ from, to });
      const response = await fetch(`/api/tax/gstr1/export-json?${query}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          "X-Tenant-Id": localStorage.getItem("tenantId") || "",
        },
      });
      if (!response.ok) throw new Error("Failed to download GST Portal JSON.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `GSTR1_${gstr1?.gstin || "PORTAL"}_${gstr1?.returnPeriod || "PERIOD"}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export Portal JSON");
    } finally {
      setExportingJson(false);
    }
  };

  // Export GSTR-1 Excel (Official Offline Tool format)
  const exportGstr1Excel = async () => {
    setExportingExcel(true);
    try {
      const query = new URLSearchParams({ from, to });
      const response = await fetch(`/api/tax/gstr1/export-excel?${query}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          "X-Tenant-Id": localStorage.getItem("tenantId") || "",
        },
      });
      if (!response.ok) throw new Error("Failed to download GSTR-1 Excel.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `GSTR1_${gstr1?.gstin || "EXCEL"}_${gstr1?.returnPeriod || "PERIOD"}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export Excel file");
    } finally {
      setExportingExcel(false);
    }
  };

  // Export standard Tax Summary CSV
  const exportCsv = () => {
    if (!report) return;
    const rows: (string | number)[][] = [
      ["GST Summary", report.fromDate, report.toDate],
      [],
      ["Type", "Tax treatment", "CGST rate", "SGST rate", "IGST rate", "Taxable amount", "CGST", "SGST", "IGST", "Total tax"],
    ];
    for (const [type, list] of [
      ["Sales", report.sales],
      ["Purchases", report.purchases],
    ] as const) {
      for (const row of list) {
        rows.push([
          type,
          row.taxTreatment || "Taxable",
          row.cgstRate,
          row.sgstRate,
          row.igstRate,
          row.taxableAmount,
          row.cgstAmount,
          row.sgstAmount,
          row.igstAmount,
          row.totalTax,
        ]);
      }
    }
    rows.push(
      [],
      ["Reconciliation", "Report", "Ledger", "Difference"],
      ["Output GST", report.outputTax, report.outputTaxLedger, report.outputTaxDifference],
      ["Input tax credit", report.inputTaxCredit, report.inputTaxCreditLedger, report.inputTaxCreditDifference],
      ["Net tax payable", report.netTaxPayable]
    );
    const csv = rows
      .map((row) => row.map((val) => `"${String(val ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `gst-summary-${report.fromDate}-${report.toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            GST Returns &amp; Compliance Center
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Official GSTR-1, GSTR-3B return compilation, portal JSON v1.4 export, and general ledger reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            From
            <input
              className={`${inputClass} mt-1 block`}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            To
            <input
              className={`${inputClass} mt-1 block`}
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>

          <Button variant="secondary" onClick={() => void loadData()} isLoading={loading}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>

          {activeTab === "gstr1" && gstr1 && (
            <>
              <Button onClick={exportGstr1Json} isLoading={exportingJson} className="bg-emerald-600 hover:bg-emerald-700">
                <Download size={14} className="mr-1.5" /> Portal JSON (v1.4)
              </Button>
              <Button variant="secondary" onClick={exportGstr1Excel} isLoading={exportingExcel}>
                <Download size={14} className="mr-1.5" /> GSTR-1 Excel
              </Button>
            </>
          )}

          {activeTab === "summary" && report && (
            <Button onClick={exportCsv} variant="secondary">
              <Download size={14} className="mr-1.5" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("gstr1")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "gstr1"
              ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <FileText size={16} /> GSTR-1 (Outward Supplies)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("gstr3b")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "gstr3b"
              ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <CheckCircle2 size={16} /> GSTR-3B (Monthly Summary)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "summary"
              ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Building size={16} /> Ledger Reconciliation
        </button>
      </div>

      {/* TAB 1: GSTR-1 */}
      {activeTab === "gstr1" && (
        <div className="space-y-6">
          {gstr1 ? (
            <>
              {/* Return Period & Metric Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">GSTIN / Return Period</p>
                  <p className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-slate-100">{gstr1.gstin}</p>
                  <p className="text-xs text-slate-500">Period: {gstr1.returnPeriod}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Gross Turnover</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">₹{money(gstr1.grossTurnover)}</p>
                  <p className="text-xs text-slate-500">Total Taxable + Tax</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Taxable Value</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">₹{money(gstr1.totalTaxableValue)}</p>
                  <p className="text-xs text-slate-500">Net after credit notes</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Output Tax</p>
                  <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">₹{money(gstr1.totalTax)}</p>
                  <p className="text-xs text-slate-500">CGST + SGST + IGST</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Tax Breakdown</p>
                  <div className="mt-1 text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                    <div>CGST: ₹{money(gstr1.totalCgst)}</div>
                    <div>SGST: ₹{money(gstr1.totalSgst)}</div>
                    <div>IGST: ₹{money(gstr1.totalIgst)}</div>
                  </div>
                </div>
              </div>

              {/* GSTR-1 Sub-tabs */}
              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                {[
                  { id: "b2b", label: `4A, 4B - B2B Invoices (${gstr1.b2bInvoices.reduce((a, b) => a + b.invoices.length, 0)})` },
                  { id: "b2cl", label: `5A - B2C Large (${gstr1.b2cLargeInvoices.length})` },
                  { id: "b2cs", label: `7 - B2C Others (${gstr1.b2cSmallSummaries.length})` },
                  { id: "cdnr", label: `9B - Credit/Debit Notes (${gstr1.creditDebitNotesRegistered.reduce((a, b) => a + b.notes.length, 0) + gstr1.creditDebitNotesUnregistered.length})` },
                  { id: "hsn", label: `12 - HSN Summary (${gstr1.hsnSummaries.length})` },
                  { id: "docs", label: `13 - Documents Issued (${gstr1.documentsIssued?.documentDetails?.length || 0})` },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setGstr1SubTab(st.id as any)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      gstr1SubTab === st.id
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Sub-tab Content: Table 4A/B B2B */}
              {gstr1SubTab === "b2b" && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        <th className="p-3">Customer GSTIN</th>
                        <th className="p-3">Legal Name</th>
                        <th className="p-3">Invoice No</th>
                        <th className="p-3">Date</th>
                        <th className="p-3 text-right">Value (₹)</th>
                        <th className="p-3">POS</th>
                        <th className="p-3 text-center">Reverse Charge</th>
                        <th className="p-3 text-right">Taxable (₹)</th>
                        <th className="p-3 text-right">CGST (₹)</th>
                        <th className="p-3 text-right">SGST (₹)</th>
                        <th className="p-3 text-right">IGST (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {gstr1.b2bInvoices.flatMap((grp) =>
                        grp.invoices.map((inv) => {
                          const taxVal = inv.items.reduce((s, itm) => s + itm.itemDetails.taxableValue, 0);
                          const cgst = inv.items.reduce((s, itm) => s + itm.itemDetails.cgstAmount, 0);
                          const sgst = inv.items.reduce((s, itm) => s + itm.itemDetails.sgstAmount, 0);
                          const igst = inv.items.reduce((s, itm) => s + itm.itemDetails.igstAmount, 0);
                          return (
                            <tr key={`${grp.customerGstin}-${inv.invoiceNumber}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="p-3 font-mono font-medium text-slate-900 dark:text-slate-100">{grp.customerGstin}</td>
                              <td className="p-3">{grp.customerLegalName}</td>
                              <td className="p-3 font-mono font-semibold">{inv.invoiceNumber}</td>
                              <td className="p-3">{inv.invoiceDate}</td>
                              <td className="p-3 text-right font-medium">₹{money(inv.invoiceValue)}</td>
                              <td className="p-3">{inv.placeOfSupply}</td>
                              <td className="p-3 text-center">{inv.reverseCharge}</td>
                              <td className="p-3 text-right">₹{money(taxVal)}</td>
                              <td className="p-3 text-right">₹{money(cgst)}</td>
                              <td className="p-3 text-right">₹{money(sgst)}</td>
                              <td className="p-3 text-right">₹{money(igst)}</td>
                            </tr>
                          );
                        })
                      )}
                      {gstr1.b2bInvoices.length === 0 && (
                        <tr>
                          <td colSpan={11} className="p-6 text-center text-slate-500">
                            No registered B2B invoices in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sub-tab Content: Table 5A B2C Large */}
              {gstr1SubTab === "b2cl" && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        <th className="p-3">Invoice No</th>
                        <th className="p-3">Date</th>
                        <th className="p-3 text-right">Invoice Value (₹)</th>
                        <th className="p-3">Place of Supply (POS)</th>
                        <th className="p-3 text-right">Tax Rate (%)</th>
                        <th className="p-3 text-right">Taxable Value (₹)</th>
                        <th className="p-3 text-right">IGST (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {gstr1.b2cLargeInvoices.map((inv) => {
                        const taxVal = inv.items.reduce((s, itm) => s + itm.itemDetails.taxableValue, 0);
                        const igst = inv.items.reduce((s, itm) => s + itm.itemDetails.igstAmount, 0);
                        return (
                          <tr key={inv.invoiceNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-3 font-mono font-semibold">{inv.invoiceNumber}</td>
                            <td className="p-3">{inv.invoiceDate}</td>
                            <td className="p-3 text-right font-medium">₹{money(inv.invoiceValue)}</td>
                            <td className="p-3">{inv.placeOfSupply}</td>
                            <td className="p-3 text-right">{inv.applicableTaxRatePercent}%</td>
                            <td className="p-3 text-right">₹{money(taxVal)}</td>
                            <td className="p-3 text-right font-medium">₹{money(igst)}</td>
                          </tr>
                        );
                      })}
                      {gstr1.b2cLargeInvoices.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-500">
                            No interstate B2C Large invoices (&gt; ₹2,50,000) in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sub-tab Content: Table 7 B2C Others */}
              {gstr1SubTab === "b2cs" && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        <th className="p-3">Type</th>
                        <th className="p-3">Place of Supply (POS)</th>
                        <th className="p-3 text-right">Rate (%)</th>
                        <th className="p-3 text-right">Taxable Value (₹)</th>
                        <th className="p-3 text-right">CGST (₹)</th>
                        <th className="p-3 text-right">SGST (₹)</th>
                        <th className="p-3 text-right">IGST (₹)</th>
                        <th className="p-3 text-right">Total Tax (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {gstr1.b2cSmallSummaries.map((s, idx) => (
                        <tr key={`${s.placeOfSupply}-${s.rate}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-medium">{s.supplyType === "InterState" ? "Inter-State (OE)" : "Intra-State (OE)"}</td>
                          <td className="p-3">{s.placeOfSupply}</td>
                          <td className="p-3 text-right">{s.rate}%</td>
                          <td className="p-3 text-right">₹{money(s.taxableValue)}</td>
                          <td className="p-3 text-right">₹{money(s.cgstAmount)}</td>
                          <td className="p-3 text-right">₹{money(s.sgstAmount)}</td>
                          <td className="p-3 text-right">₹{money(s.igstAmount)}</td>
                          <td className="p-3 text-right font-medium">₹{money(s.cgstAmount + s.sgstAmount + s.igstAmount)}</td>
                        </tr>
                      ))}
                      {gstr1.b2cSmallSummaries.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-500">
                            No B2C small retail sales in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sub-tab Content: Table 9B Credit/Debit Notes */}
              {gstr1SubTab === "cdnr" && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        <th className="p-3">Customer GSTIN / Type</th>
                        <th className="p-3">Note No</th>
                        <th className="p-3">Note Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Original Invoice</th>
                        <th className="p-3 text-right">Note Value (₹)</th>
                        <th className="p-3 text-right">Taxable (₹)</th>
                        <th className="p-3 text-right">CGST (₹)</th>
                        <th className="p-3 text-right">SGST (₹)</th>
                        <th className="p-3 text-right">IGST (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {gstr1.creditDebitNotesRegistered.flatMap((grp) =>
                        grp.notes.map((n) => (
                          <tr key={n.noteNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-3 font-mono font-medium">{grp.customerGstin} ({grp.customerLegalName})</td>
                            <td className="p-3 font-mono font-semibold">{n.noteNumber}</td>
                            <td className="p-3">{n.noteDate}</td>
                            <td className="p-3 font-semibold text-amber-600">{n.noteType === "C" ? "Credit Note" : "Debit Note"}</td>
                            <td className="p-3">{n.originalInvoiceNumber} ({n.originalInvoiceDate})</td>
                            <td className="p-3 text-right font-medium">₹{money(n.noteValue)}</td>
                            <td className="p-3 text-right">₹{money(n.items.reduce((s, i) => s + i.itemDetails.taxableValue, 0))}</td>
                            <td className="p-3 text-right">₹{money(n.items.reduce((s, i) => s + i.itemDetails.cgstAmount, 0))}</td>
                            <td className="p-3 text-right">₹{money(n.items.reduce((s, i) => s + i.itemDetails.sgstAmount, 0))}</td>
                            <td className="p-3 text-right">₹{money(n.items.reduce((s, i) => s + i.itemDetails.igstAmount, 0))}</td>
                          </tr>
                        ))
                      )}
                      {gstr1.creditDebitNotesUnregistered.map((n) => (
                        <tr key={n.noteNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 text-slate-500">Unregistered Consumer</td>
                          <td className="p-3 font-mono font-semibold">{n.noteNumber}</td>
                          <td className="p-3">{n.noteDate}</td>
                          <td className="p-3 font-semibold text-amber-600">{n.noteType === "C" ? "Credit Note" : "Debit Note"}</td>
                          <td className="p-3">{n.originalInvoiceNumber} ({n.originalInvoiceDate})</td>
                          <td className="p-3 text-right font-medium">₹{money(n.noteValue)}</td>
                          <td className="p-3 text-right">₹{money(n.items.reduce((s, i) => s + i.itemDetails.taxableValue, 0))}</td>
                          <td className="p-3 text-right">₹{money(n.items.reduce((s, i) => s + i.itemDetails.cgstAmount, 0))}</td>
                          <td className="p-3 text-right">₹{money(n.items.reduce((s, i) => s + i.itemDetails.sgstAmount, 0))}</td>
                          <td className="p-3 text-right">₹{money(n.items.reduce((s, i) => s + i.itemDetails.igstAmount, 0))}</td>
                        </tr>
                      ))}
                      {gstr1.creditDebitNotesRegistered.length === 0 && gstr1.creditDebitNotesUnregistered.length === 0 && (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-500">
                            No credit/debit notes issued in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sub-tab Content: Table 12 HSN Summary */}
              {gstr1SubTab === "hsn" && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">HSN / SAC Code</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">UQC</th>
                        <th className="p-3 text-right">Total Qty</th>
                        <th className="p-3 text-right">Total Value (₹)</th>
                        <th className="p-3 text-right">Taxable Value (₹)</th>
                        <th className="p-3 text-right">IGST (₹)</th>
                        <th className="p-3 text-right">CGST (₹)</th>
                        <th className="p-3 text-right">SGST (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {gstr1.hsnSummaries.map((h) => (
                        <tr key={h.serialNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 text-slate-500">{h.serialNumber}</td>
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{h.hsnCode}</td>
                          <td className="p-3">{h.description}</td>
                          <td className="p-3 font-medium">{h.uqc}</td>
                          <td className="p-3 text-right font-medium">{h.totalQuantity}</td>
                          <td className="p-3 text-right">₹{money(h.totalValue)}</td>
                          <td className="p-3 text-right font-medium">₹{money(h.taxableValue)}</td>
                          <td className="p-3 text-right">₹{money(h.integratedTax)}</td>
                          <td className="p-3 text-right">₹{money(h.centralTax)}</td>
                          <td className="p-3 text-right">₹{money(h.stateTax)}</td>
                        </tr>
                      ))}
                      {gstr1.hsnSummaries.length === 0 && (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-500">
                            No HSN line items recorded in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sub-tab Content: Table 13 Documents Issued */}
              {gstr1SubTab === "docs" && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Nature of Document</th>
                        <th className="p-3">From Serial No</th>
                        <th className="p-3">To Serial No</th>
                        <th className="p-3 text-right">Total Number</th>
                        <th className="p-3 text-right">Cancelled</th>
                        <th className="p-3 text-right">Net Issued</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {gstr1.documentsIssued?.documentDetails?.map((d) => (
                        <tr key={d.docNatureNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 text-slate-500">{d.docNatureNumber}</td>
                          <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{d.docNatureDescription}</td>
                          <td className="p-3 font-mono">{d.fromSerialNumber}</td>
                          <td className="p-3 font-mono">{d.toSerialNumber}</td>
                          <td className="p-3 text-right">{d.totalNumber}</td>
                          <td className="p-3 text-right text-red-600">{d.cancelledNumber}</td>
                          <td className="p-3 text-right font-semibold text-emerald-600">{d.netIssuedNumber}</td>
                        </tr>
                      ))}
                      {(!gstr1.documentsIssued?.documentDetails || gstr1.documentsIssued.documentDetails.length === 0) && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-500">
                            No documents issued in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-slate-500">Loading GSTR-1 summary data...</div>
          )}
        </div>
      )}

      {/* TAB 2: GSTR-3B */}
      {activeTab === "gstr3b" && (
        <div className="space-y-6">
          {gstr3b ? (
            <>
              {/* Header Details */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Form GSTR-3B: Monthly Return Self-Declaration
                  </h2>
                  <p className="text-xs text-slate-500">
                    GSTIN: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{gstr3b.gstin}</span> | Legal Name: {gstr3b.legalName} | Return Period: {gstr3b.returnPeriod}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-slate-500">Net Cash Payable</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{money(gstr3b.taxPayment.netCashPayable)}</p>
                </div>
              </div>

              {/* Section 3.1: Outward supplies and inward supplies liable to reverse charge */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="bg-slate-50 px-4 py-3 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    3.1 Details of Outward Supplies and Inward Supplies Liable to Reverse Charge
                  </h3>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="p-3">Nature of Supplies</th>
                      <th className="p-3 text-right">Total Taxable Value (₹)</th>
                      <th className="p-3 text-right">Integrated Tax (₹)</th>
                      <th className="p-3 text-right">Central Tax (₹)</th>
                      <th className="p-3 text-right">State/UT Tax (₹)</th>
                      <th className="p-3 text-right">Cess (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      gstr3b.outwardSupplies.outwardTaxableSupplies,
                      gstr3b.outwardSupplies.outwardZeroRatedSupplies,
                      gstr3b.outwardSupplies.otherOutwardNilExemptedSupplies,
                      gstr3b.outwardSupplies.inwardLiableToReverseCharge,
                      gstr3b.outwardSupplies.nonGstOutwardSupplies,
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{row.natureOfSupply}</td>
                        <td className="p-3 text-right font-medium">₹{money(row.totalTaxableValue)}</td>
                        <td className="p-3 text-right">₹{money(row.integratedTax)}</td>
                        <td className="p-3 text-right">₹{money(row.centralTax)}</td>
                        <td className="p-3 text-right">₹{money(row.stateTax)}</td>
                        <td className="p-3 text-right">₹{money(row.cess)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section 4: Eligible Input Tax Credit (ITC) */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="bg-slate-50 px-4 py-3 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    4. Eligible Input Tax Credit (ITC)
                  </h3>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="p-3">Details</th>
                      <th className="p-3 text-right">Integrated Tax (₹)</th>
                      <th className="p-3 text-right">Central Tax (₹)</th>
                      <th className="p-3 text-right">State/UT Tax (₹)</th>
                      <th className="p-3 text-right">Cess (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr className="bg-slate-50/50 font-semibold dark:bg-slate-800/30">
                      <td colSpan={5} className="p-3 text-slate-900 dark:text-slate-100">
                        (A) ITC Available (whether in full or in part)
                      </td>
                    </tr>
                    {gstr3b.eligibleItc.itcAvailable.map((row, idx) => (
                      <tr key={`avail-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 pl-6 text-slate-700 dark:text-slate-300">{row.details}</td>
                        <td className="p-3 text-right">₹{money(row.integratedTax)}</td>
                        <td className="p-3 text-right">₹{money(row.centralTax)}</td>
                        <td className="p-3 text-right">₹{money(row.stateTax)}</td>
                        <td className="p-3 text-right">₹{money(row.cess)}</td>
                      </tr>
                    ))}

                    <tr className="bg-slate-50/50 font-semibold dark:bg-slate-800/30">
                      <td colSpan={5} className="p-3 text-slate-900 dark:text-slate-100">
                        (B) ITC Reversed
                      </td>
                    </tr>
                    {gstr3b.eligibleItc.itcReversed.map((row, idx) => (
                      <tr key={`rev-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 pl-6 text-slate-700 dark:text-slate-300">{row.details}</td>
                        <td className="p-3 text-right">₹{money(row.integratedTax)}</td>
                        <td className="p-3 text-right">₹{money(row.centralTax)}</td>
                        <td className="p-3 text-right">₹{money(row.stateTax)}</td>
                        <td className="p-3 text-right">₹{money(row.cess)}</td>
                      </tr>
                    ))}

                    <tr className="bg-emerald-50/50 font-bold dark:bg-emerald-950/20">
                      <td className="p-3 text-emerald-800 dark:text-emerald-300">(C) {gstr3b.eligibleItc.netItcAvailable.details}</td>
                      <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">₹{money(gstr3b.eligibleItc.netItcAvailable.integratedTax)}</td>
                      <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">₹{money(gstr3b.eligibleItc.netItcAvailable.centralTax)}</td>
                      <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">₹{money(gstr3b.eligibleItc.netItcAvailable.stateTax)}</td>
                      <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">₹{money(gstr3b.eligibleItc.netItcAvailable.cess)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 6: Payment of Tax & ITC Set-Off */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="bg-slate-50 px-4 py-3 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    6. Payment of Tax &amp; Input Credit Utilization
                  </h3>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Total Tax Payable (₹)</th>
                      <th className="p-3 text-right">Paid Through ITC (₹)</th>
                      <th className="p-3 text-right">Tax Paid Cash (₹)</th>
                      <th className="p-3 text-right">Interest (₹)</th>
                      <th className="p-3 text-right">Late Fee (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {gstr3b.taxPayment.rows.map((row) => (
                      <tr key={row.taxType} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{row.taxType}</td>
                        <td className="p-3 text-right font-medium">₹{money(row.totalTaxPayable)}</td>
                        <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">₹{money(row.paidThroughItc)}</td>
                        <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">₹{money(row.taxPaidCash)}</td>
                        <td className="p-3 text-right text-slate-500">₹{money(row.interestPaid)}</td>
                        <td className="p-3 text-right text-slate-500">₹{money(row.lateFeePaid)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold dark:bg-slate-800/80">
                      <td className="p-3">Total Tax Liability &amp; Settlement</td>
                      <td className="p-3 text-right">₹{money(gstr3b.taxPayment.totalTaxLiability)}</td>
                      <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">₹{money(gstr3b.taxPayment.totalItcUtilized)}</td>
                      <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">₹{money(gstr3b.taxPayment.netCashPayable)}</td>
                      <td className="p-3 text-right">₹0.00</td>
                      <td className="p-3 text-right">₹0.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500">Loading GSTR-3B monthly return data...</div>
          )}
        </div>
      )}

      {/* TAB 3: LEDGER RECONCILIATION */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {report ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Sales Taxable", report.salesTaxable],
                  ["Output GST (Report)", report.outputTax],
                  ["Purchase Taxable", report.purchaseTaxable],
                  ["Input Tax Credit (Report)", report.inputTaxCredit],
                ].map(([label, amount]) => (
                  <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs text-slate-500 font-medium">{label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">₹{money(Number(amount))}</p>
                  </div>
                ))}
              </div>

              {/* General Ledger Comparison Cards */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Control Ledger Reconciliation vs Return Registers
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500 font-medium">Output GST · Report / Ledger / Difference</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                      ₹{money(report.outputTax)} / ₹{money(report.outputTaxLedger)} /{" "}
                      <span className={Math.abs(report.outputTaxDifference) < 0.01 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                        ₹{money(report.outputTaxDifference)}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500 font-medium">Input Credit · Report / Ledger / Difference</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                      ₹{money(report.inputTaxCredit)} / ₹{money(report.inputTaxCreditLedger)} /{" "}
                      <span className={Math.abs(report.inputTaxCreditDifference) < 0.01 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                        ₹{money(report.inputTaxCreditDifference)}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500 font-medium">Net GST Payable (Before Set-Off)</p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">₹{money(report.netTaxPayable)}</p>
                  </div>
                </div>
              </div>

              {/* Sales & Purchases Rate Tables */}
              <div className="grid gap-4 xl:grid-cols-2">
                <section className="overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Sales · Output GST by Rate</h3>
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="p-2">Treatment</th>
                        <th className="p-2">Rate %</th>
                        <th className="p-2 text-right">Taxable</th>
                        <th className="p-2 text-right">CGST</th>
                        <th className="p-2 text-right">SGST</th>
                        <th className="p-2 text-right">IGST</th>
                        <th className="p-2 text-right">Total GST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {report.sales.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2">{row.taxTreatment || "Taxable"}</td>
                          <td className="p-2">{row.cgstRate + row.sgstRate + row.igstRate}%</td>
                          <td className="p-2 text-right">₹{money(row.taxableAmount)}</td>
                          <td className="p-2 text-right">₹{money(row.cgstAmount)}</td>
                          <td className="p-2 text-right">₹{money(row.sgstAmount)}</td>
                          <td className="p-2 text-right">₹{money(row.igstAmount)}</td>
                          <td className="p-2 text-right font-medium">₹{money(row.totalTax)}</td>
                        </tr>
                      ))}
                      {report.sales.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-500">
                            No sales in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </section>

                <section className="overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Purchases · Input Tax Credit by Rate</h3>
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="p-2">Treatment</th>
                        <th className="p-2">Rate %</th>
                        <th className="p-2 text-right">Taxable</th>
                        <th className="p-2 text-right">CGST</th>
                        <th className="p-2 text-right">SGST</th>
                        <th className="p-2 text-right">IGST</th>
                        <th className="p-2 text-right">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {report.purchases.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2">{row.taxTreatment || "Taxable"}</td>
                          <td className="p-2">{row.cgstRate + row.sgstRate + row.igstRate}%</td>
                          <td className="p-2 text-right">₹{money(row.taxableAmount)}</td>
                          <td className="p-2 text-right">₹{money(row.cgstAmount)}</td>
                          <td className="p-2 text-right">₹{money(row.sgstAmount)}</td>
                          <td className="p-2 text-right">₹{money(row.igstAmount)}</td>
                          <td className="p-2 text-right font-medium">₹{money(row.totalTax)}</td>
                        </tr>
                      ))}
                      {report.purchases.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-500">
                            No purchases in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </section>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500">Loading ledger reconciliation data...</div>
          )}
        </div>
      )}
    </div>
  );
}

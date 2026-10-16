import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Truck,
  QrCode,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Copy,
  Clock,
  RefreshCw,
  Plus,
  Search,
  ExternalLink,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { complianceApi } from "../services/complianceApi";
import type { EWayBillDto, EInvoiceDto } from "../types/compliance.types";
import { apiClient } from "../../../services/apiClient";
import { QrCodeSvg } from "../../../components/ui/QrCodeSvg";
import { formatDate } from "../../../lib/date";

interface InvoiceOption {
  id: string;
  billNumber: string;
  invoiceDate: string;
  customerName: string;
  customerGstin?: string | null;
  totalAmount: number;
}

const currency = (val: number) =>
  `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const EWayBillAndEInvoicePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"eway" | "einvoice">("eway");

  // Filter state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Data state
  const [ewbList, setEwbList] = useState<EWayBillDto[]>([]);
  const [einvList, setEinvList] = useState<EInvoiceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invoices for generation modal
  const [availableInvoices, setAvailableInvoices] = useState<InvoiceOption[]>([]);

  // Modals state
  const [isGenerateEwbOpen, setIsGenerateEwbOpen] = useState(false);
  const [isGenerateEinvOpen, setIsGenerateEinvOpen] = useState(false);
  const [selectedEinvForQr, setSelectedEinvForQr] = useState<EInvoiceDto | null>(null);
  const [cancelModalData, setCancelModalData] = useState<{
    type: "eway" | "einvoice";
    id: string;
    docNumber: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Form states for EWB generation
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [distanceKm, setDistanceKm] = useState(50);
  const [transMode, setTransMode] = useState(1);
  const [vehicleNo, setVehicleNo] = useState("");
  const [vehicleType, setVehicleType] = useState("R");
  const [transporterId, setTransporterId] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [transDocNo, setTransDocNo] = useState("");
  const [transDocDate, setTransDocDate] = useState("");
  const [docType, setDocType] = useState("INV");
  const [supplyType, setSupplyType] = useState("O");
  const [subSupplyType, setSubSupplyType] = useState("1");
  const [actionLoading, setActionLoading] = useState(false);

  // Load Invoices for dropdown
  const loadInvoices = useCallback(async () => {
    try {
      const res = await apiClient.get<{ items: InvoiceOption[] }>("/sales/invoices?pageSize=100");
      setAvailableInvoices(res.items || []);
    } catch {
      // ignore
    }
  }, []);

  // Load E-Way Bills
  const loadEWayBills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await complianceApi.getEWayBills({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setEwbList(res.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load E-Way Bills.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, statusFilter, searchQuery]);

  // Load E-Invoices
  const loadEInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await complianceApi.getEInvoices({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setEinvList(res.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load E-Invoices.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, statusFilter, searchQuery]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    if (activeTab === "eway") {
      void loadEWayBills();
    } else {
      void loadEInvoices();
    }
  }, [activeTab, loadEWayBills, loadEInvoices]);

  // Handle Generate E-Way Bill
  const handleGenerateEwb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      alert("Please select a sales invoice.");
      return;
    }
    if (distanceKm <= 0) {
      alert("Distance must be greater than 0 km.");
      return;
    }
    try {
      setActionLoading(true);
      await complianceApi.generateEWayBill({
        salesInvoiceId: selectedInvoiceId,
        distanceKm,
        transMode,
        vehicleNo: vehicleNo || undefined,
        vehicleType,
        transporterId: transporterId || undefined,
        transporterName: transporterName || undefined,
        transDocNo: transDocNo || undefined,
        transDocDate: transDocDate || undefined,
        docType,
        supplyType,
        subSupplyType,
      });
      setIsGenerateEwbOpen(false);
      resetEwbForm();
      void loadEWayBills();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate E-Way Bill.");
    } finally {
      setActionLoading(false);
    }
  };

  const resetEwbForm = () => {
    setSelectedInvoiceId("");
    setDistanceKm(50);
    setTransMode(1);
    setVehicleNo("");
    setVehicleType("R");
    setTransporterId("");
    setTransporterName("");
    setTransDocNo("");
    setTransDocDate("");
    setDocType("INV");
    setSupplyType("O");
    setSubSupplyType("1");
  };

  // Handle Generate E-Invoice
  const handleGenerateEinv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      alert("Please select a sales invoice.");
      return;
    }
    try {
      setActionLoading(true);
      await complianceApi.generateEInvoice({
        salesInvoiceId: selectedInvoiceId,
      });
      setIsGenerateEinvOpen(false);
      setSelectedInvoiceId("");
      void loadEInvoices();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate E-Invoice.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancellation
  const handleConfirmCancel = async () => {
    if (!cancelModalData) return;
    if (!cancelReason.trim()) {
      alert("Please provide a cancellation reason.");
      return;
    }
    try {
      setActionLoading(true);
      if (cancelModalData.type === "eway") {
        await complianceApi.cancelEWayBill(cancelModalData.id, cancelReason);
        void loadEWayBills();
      } else {
        await complianceApi.cancelEInvoice(cancelModalData.id, cancelReason);
        void loadEInvoices();
      }
      setCancelModalData(null);
      setCancelReason("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel compliance document.");
    } finally {
      setActionLoading(false);
    }
  };

  // Download JSON helper
  const handleDownloadEwbJson = async (ewb: EWayBillDto) => {
    try {
      const json = await complianceApi.getEWayBillJson(ewb.id);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `EWB_${ewb.ewbNumber || ewb.billNumber}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download E-Way Bill JSON.");
    }
  };

  const handleDownloadEinvJson = async (einv: EInvoiceDto) => {
    try {
      const json = await complianceApi.getEInvoiceJson(einv.id);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `EINV_${einv.billNumber}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download E-Invoice JSON.");
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  // KPIs
  const ewbKpis = useMemo(() => {
    const active = ewbList.filter((e) => e.status === "Generated");
    const cancelled = ewbList.filter((e) => e.status === "Cancelled");
    const totalConsignmentVal = active.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    return {
      total: ewbList.length,
      active: active.length,
      cancelled: cancelled.length,
      consignmentVal: totalConsignmentVal,
    };
  }, [ewbList]);

  const einvKpis = useMemo(() => {
    const active = einvList.filter((e) => e.status === "Generated");
    const cancelled = einvList.filter((e) => e.status === "Cancelled");
    const totalVal = active.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    return {
      total: einvList.length,
      active: active.length,
      cancelled: cancelled.length,
      totalVal,
    };
  }, [einvList]);

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            <ShieldCheck className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Compliance: E-Way Bill & E-Invoicing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Official NIC Portal Direct Export, 64-char IRN hashing, Scannable Signed QR Codes, and statutory validity tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === "eway") void loadEWayBills();
              else void loadEInvoices();
            }}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {activeTab === "eway" ? (
            <button
              onClick={() => setIsGenerateEwbOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Generate E-Way Bill
            </button>
          ) : (
            <button
              onClick={() => setIsGenerateEinvOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Generate E-Invoice (IRN)
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("eway")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === "eway"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          <Truck className="h-4 w-4" />
          E-Way Bills (Form GST EWB-01)
        </button>
        <button
          onClick={() => setActiveTab("einvoice")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === "einvoice"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          <QrCode className="h-4 w-4" />
          E-Invoicing (IRN & Signed QR)
        </button>
      </div>

      {/* KPI Cards */}
      {activeTab === "eway" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Active E-Way Bills</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{ewbKpis.active}</span>
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <span className="mt-1 block text-[11px] text-slate-400">Valid & in-transit cargo</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Consignment Value</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {currency(ewbKpis.consignmentVal)}
              </span>
              <Truck className="h-6 w-6 text-indigo-500" />
            </div>
            <span className="mt-1 block text-[11px] text-slate-400">Total moving inventory</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Cancelled E-Way Bills</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{ewbKpis.cancelled}</span>
              <XCircle className="h-6 w-6 text-rose-500" />
            </div>
            <span className="mt-1 block text-[11px] text-slate-400">Voided within 24h window</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Total Generated</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{ewbKpis.total}</span>
              <FileText className="h-6 w-6 text-blue-500" />
            </div>
            <span className="mt-1 block text-[11px] text-slate-400">All historical records</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Active IRNs</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{einvKpis.active}</span>
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <span className="mt-1 block text-[11px] text-slate-400">Verified B2B invoices</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Compliant Invoiced Value</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{currency(einvKpis.totalVal)}</span>
              <ShieldCheck className="h-6 w-6 text-indigo-500" />
            </div>
            <span className="mt-1 block text-[11px] text-slate-400">Total B2B e-invoiced value</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Cancelled IRNs</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{einvKpis.cancelled}</span>
              <XCircle className="h-6 w-6 text-rose-500" />
            </div>
            <span className="mt-1 block text-[11px] text-slate-400">Voided on IRP</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Signed QR Verified</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{einvKpis.active}</span>
              <QrCode className="h-6 w-6 text-purple-500" />
            </div>
            <span className="mt-1 block text-[11px] text-slate-400">100% scannable barcodes</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            placeholder="From Date"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            placeholder="To Date"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">All Statuses</option>
          <option value="Generated">Active / Generated</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "eway"
                ? "Search by EWB No, Vehicle No, or Transporter..."
                : "Search by 64-char IRN or Ack No..."
            }
            className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>

        {(fromDate || toDate || statusFilter || searchQuery) && (
          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
              setStatusFilter("");
              setSearchQuery("");
            }}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {activeTab === "eway" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                <tr>
                  <th className="py-3 pl-4 pr-3">E-Way Bill No & Date</th>
                  <th className="px-3 py-3">Sales Invoice</th>
                  <th className="px-3 py-3">Customer & GSTIN</th>
                  <th className="px-3 py-3">Consignment Val</th>
                  <th className="px-3 py-3">Transport & Vehicle</th>
                  <th className="px-3 py-3">Valid Until</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ewbList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      {loading ? "Loading E-Way Bills..." : "No E-Way Bills found for the selected criteria."}
                    </td>
                  </tr>
                ) : (
                  ewbList.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3 pl-4 pr-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span>{e.ewbNumber || "—"}</span>
                          {e.ewbNumber && (
                            <button
                              onClick={() => copyToClipboard(e.ewbNumber!, "E-Way Bill Number")}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              title="Copy EWB No"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <span className="block font-sans text-[11px] font-normal text-slate-400">
                          {e.ewbDate ? formatDate(e.ewbDate.split("T")[0]) : "—"}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <a
                          href={`/sales/invoices/${e.salesInvoiceId}/print`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          {e.billNumber}
                        </a>
                        <span className="block text-[11px] text-slate-400">{formatDate(e.invoiceDate)}</span>
                      </td>

                      <td className="px-3 py-3">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{e.customerName}</span>
                        {e.customerGstin && (
                          <span className="block font-mono text-[11px] text-slate-400">{e.customerGstin}</span>
                        )}
                      </td>

                      <td className="px-3 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {currency(e.totalAmount)}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {e.transMode === 1
                              ? "Road"
                              : e.transMode === 2
                              ? "Rail"
                              : e.transMode === 3
                              ? "Air"
                              : "Ship"}
                          </span>
                          <span className="font-mono font-medium">{e.vehicleNo || "—"}</span>
                        </div>
                        <span className="block text-[11px] text-slate-400">
                          {e.distanceKm} km · {e.vehicleType === "O" ? "ODC Cargo" : "Regular Cargo"}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        {e.validUpto ? (
                          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{formatDate(e.validUpto.split("T")[0])}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            e.status === "Generated"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          }`}
                        >
                          {e.status}
                        </span>
                        {e.cancelReason && (
                          <span className="block text-[10px] text-slate-400" title={e.cancelReason}>
                            Reason: {e.cancelReason.slice(0, 18)}...
                          </span>
                        )}
                      </td>

                      <td className="py-3 pl-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => void handleDownloadEwbJson(e)}
                            className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            title="Download Official NIC JSON for E-Way Bill Portal Direct Upload"
                          >
                            <Download className="h-3 w-3" />
                            NIC JSON
                          </button>
                          {e.status === "Generated" && (
                            <button
                              onClick={() =>
                                setCancelModalData({
                                  type: "eway",
                                  id: e.id,
                                  docNumber: e.ewbNumber || e.billNumber,
                                })
                              }
                              className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                <tr>
                  <th className="py-3 pl-4 pr-3">64-Character IRN Hash</th>
                  <th className="px-3 py-3">Ack No & Date</th>
                  <th className="px-3 py-3">Sales Invoice</th>
                  <th className="px-3 py-3">Customer & GSTIN</th>
                  <th className="px-3 py-3">Invoice Total</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {einvList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {loading ? "Loading E-Invoices..." : "No E-Invoices found for the selected criteria."}
                    </td>
                  </tr>
                ) : (
                  einvList.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="max-w-[240px] py-3 pl-4 pr-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                          <span className="truncate" title={e.irn}>
                            {e.irn.substring(0, 16)}...{e.irn.substring(48)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(e.irn, "IRN Hash")}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Copy full 64-char IRN"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="block text-[10px] text-slate-400">SHA-256 Statutory Hash</span>
                      </td>

                      <td className="px-3 py-3">
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{e.ackNo}</span>
                        <span className="block text-[11px] text-slate-400">
                          {formatDate(e.ackDate.split("T")[0])}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <a
                          href={`/sales/invoices/${e.salesInvoiceId}/print`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          {e.billNumber}
                        </a>
                        <span className="block text-[11px] text-slate-400">{formatDate(e.invoiceDate)}</span>
                      </td>

                      <td className="px-3 py-3">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{e.customerName}</span>
                        {e.customerGstin && (
                          <span className="block font-mono text-[11px] text-slate-400">{e.customerGstin}</span>
                        )}
                      </td>

                      <td className="px-3 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {currency(e.totalAmount)}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            e.status === "Generated"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>

                      <td className="py-3 pl-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedEinvForQr(e)}
                            className="flex items-center gap-1 rounded border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300"
                            title="View Scannable Signed QR Code"
                          >
                            <QrCode className="h-3 w-3" />
                            View QR
                          </button>
                          <button
                            onClick={() => void handleDownloadEinvJson(e)}
                            className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            title="Download NIC Schema v1.03 JSON"
                          >
                            <Download className="h-3 w-3" />
                            Schema v1.03
                          </button>
                          {e.status === "Generated" && (
                            <button
                              onClick={() =>
                                setCancelModalData({
                                  type: "einvoice",
                                  id: e.id,
                                  docNumber: e.billNumber,
                                })
                              }
                              className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL: GENERATE E-WAY BILL --- */}
      {isGenerateEwbOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
              <Truck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Generate E-Way Bill (Form GST EWB-01)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Enter vehicle and transporter dispatch details to create the statutory consignment note and NIC JSON payload.
            </p>

            <form onSubmit={(e) => void handleGenerateEwb(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Sales Invoice *
                </label>
                <select
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">-- Choose Sales Invoice --</option>
                  {availableInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.billNumber} — {inv.customerName} ({currency(inv.totalAmount)}) · {formatDate(inv.invoiceDate)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Distance in KM (Statutory Validity: 1 day/200km) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={4000}
                    required
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(parseInt(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                  <span className="mt-0.5 block text-[10px] text-slate-400">
                    Approx validity: {Math.max(1, Math.ceil(distanceKm / 200))} Day(s)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Transport Mode *
                  </label>
                  <select
                    value={transMode}
                    onChange={(e) => setTransMode(parseInt(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value={1}>1 - Road</option>
                    <option value={2}>2 - Rail</option>
                    <option value={3}>3 - Air</option>
                    <option value={4}>4 - Ship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Vehicle Number (e.g. KA01AB1234)
                  </label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                    placeholder="KA01AB1234"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="R">Regular Cargo (R)</option>
                    <option value="O">Over Dimensional Cargo (O)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Transporter ID (GSTIN / TRANSIN)
                  </label>
                  <input
                    type="text"
                    value={transporterId}
                    onChange={(e) => setTransporterId(e.target.value.toUpperCase())}
                    placeholder="29AAAAA0000A1Z5"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Transporter Name
                  </label>
                  <input
                    type="text"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    placeholder="VRL Logistics / Blue Dart"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Transport Doc / Lorry Receipt (LR) No
                  </label>
                  <input
                    type="text"
                    value={transDocNo}
                    onChange={(e) => setTransDocNo(e.target.value)}
                    placeholder="LR-8921"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Transport Doc Date
                  </label>
                  <input
                    type="date"
                    value={transDocDate}
                    onChange={(e) => setTransDocDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGenerateEwbOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading ? "Generating..." : "Generate E-Way Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: GENERATE E-INVOICE --- */}
      {isGenerateEinvOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
              <QrCode className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Generate E-Invoice (IRN & Signed QR)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              1-click computation of official 64-char SHA-256 IRN hash, 15-digit Ack Number, Signed QR Code payload, and NIC schema v1.03 JSON.
            </p>

            <form onSubmit={(e) => void handleGenerateEinv(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Sales Invoice *
                </label>
                <select
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">-- Choose Sales Invoice --</option>
                  {availableInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.billNumber} — {inv.customerName} ({currency(inv.totalAmount)}) {inv.customerGstin ? `[${inv.customerGstin}]` : "[URP]"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
                <span className="font-semibold">IRN Hashing Formula:</span>
                <p className="mt-0.5 font-mono text-[11px]">
                  SHA256(SupplierGSTIN + FinYear + DocType + DocNo)
                </p>
                <p className="mt-1 text-[10px] text-indigo-600 dark:text-indigo-400">
                  Generates tamper-proof B2B invoice identifier automatically linked to printable invoice & portal JSON.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGenerateEinvOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading ? "Generating..." : "Generate IRN & QR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: VIEW SIGNED QR CODE --- */}
      {selectedEinvForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <QrCode className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Signed QR Code — {selectedEinvForQr.billNumber}
              </h2>
              <button
                onClick={() => setSelectedEinvForQr(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="my-6 flex flex-col items-center justify-center">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-white">
                <QrCodeSvg value={selectedEinvForQr.signedQrCode} size={200} />
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Scannable by GST NIC Mobile App & standard QR readers
              </p>
            </div>

            <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-500">Ack No:</span>
                <span className="font-mono font-semibold">{selectedEinvForQr.ackNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ack Date:</span>
                <span>{formatDate(selectedEinvForQr.ackDate.split("T")[0])}</span>
              </div>
              <div>
                <span className="text-slate-500">IRN:</span>
                <p className="mt-0.5 break-all font-mono text-[10px] text-slate-700 dark:text-slate-300">
                  {selectedEinvForQr.irn}
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <a
                href={`/sales/invoices/${selectedEinvForQr.salesInvoiceId}/print`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Print Tax Invoice with QR
              </a>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CANCEL COMPLIANCE DOCUMENT --- */}
      {cancelModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-base font-bold text-rose-600">
              <AlertCircle className="h-5 w-5" />
              Cancel {cancelModalData.type === "eway" ? "E-Way Bill" : "E-Invoice (IRN)"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Are you sure you want to cancel document{" "}
              <strong className="text-slate-800 dark:text-slate-200">{cancelModalData.docNumber}</strong>? Statutory
              regulations require a valid audit reason.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Cancellation Reason *
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">-- Select Statutory Reason --</option>
                <option value="1 - Duplicate">1 - Duplicate Document</option>
                <option value="2 - Order Cancelled">2 - Order Cancelled</option>
                <option value="3 - Data Entry Mistake">3 - Data Entry Mistake</option>
                <option value="4 - Transporter Changed">4 - Transporter Changed (E-Way Bill)</option>
                <option value="5 - Other">5 - Other Statutory Reason</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCancelModalData(null);
                  setCancelReason("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={actionLoading || !cancelReason}
                onClick={() => void handleConfirmCancel()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


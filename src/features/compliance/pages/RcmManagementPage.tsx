import { useCallback, useEffect, useState, useMemo } from "react";
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Printer,
  Ban,
  AlertTriangle,
  Receipt,
  Scale,
  IndianRupee,
  Calendar,
  X,
  CreditCard,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { complianceApi } from "../services/complianceApi";
import type { RcmSelfInvoiceDto, CreateRcmSelfInvoiceRequest } from "../types/compliance.types";
import { useNotifications } from "../../../context/NotificationContext";
import { formatDate } from "../../../lib/date";
import { apiClient } from "../../../services/apiClient";

interface VendorSummary {
  id: string;
  name: string;
  pan?: string | null;
  gstin?: string | null;
  address?: string | null;
}

const INDIAN_STATES = [
  { code: "27", name: "Maharashtra" },
  { code: "24", name: "Gujarat" },
  { code: "29", name: "Karnataka" },
  { code: "07", name: "Delhi" },
  { code: "33", name: "Tamil Nadu" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "19", name: "West Bengal" },
  { code: "06", name: "Haryana" },
  { code: "08", name: "Rajasthan" },
  { code: "36", name: "Telangana" },
  { code: "32", name: "Kerala" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "21", name: "Odisha" },
  { code: "03", name: "Punjab" },
  { code: "10", name: "Bihar" },
  { code: "30", name: "Goa" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "20", name: "Jharkhand" },
  { code: "22", name: "Chhattisgarh" },
];

const RCM_9_3_CATEGORIES = [
  { value: "GTA", label: "Goods Transport Agency (GTA) Services", defaultRate: 5, defaultSac: "9965" },
  { value: "LegalServices", label: "Legal Services by Advocate / Firm", defaultRate: 18, defaultSac: "9982" },
  { value: "SecurityServices", label: "Security Services (Personnel)", defaultRate: 18, defaultSac: "9985" },
  { value: "SponsorshipServices", label: "Sponsorship Services", defaultRate: 18, defaultSac: "9983" },
  { value: "DirectorServices", label: "Services supplied by a Director to Company", defaultRate: 18, defaultSac: "9983" },
  { value: "RentingMotorVehicle", label: "Renting of Motor Vehicle", defaultRate: 5, defaultSac: "9966" },
  { value: "Other", label: "Other Section 9(3) Specified Service", defaultRate: 18, defaultSac: "9999" },
];

export function RcmManagementPage() {
  const notifications = useNotifications();

  // State
  const [invoices, setInvoices] = useState<RcmSelfInvoiceDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Filters
  const [sectionFilter, setSectionFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Vendors list for dropdown
  const [vendors, setVendors] = useState<VendorSummary[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<RcmSelfInvoiceDto | null>(null);
  const [viewModalType, setViewModalType] = useState<"self-invoice" | "payment-voucher" | null>(null);
  const [cancelModalInvoice, setCancelModalInvoice] = useState<RcmSelfInvoiceDto | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Create Form State
  const [formData, setFormData] = useState<CreateRcmSelfInvoiceRequest>({
    invoiceDate: new Date().toISOString().slice(0, 10),
    section: "9(3)",
    category: "GTA",
    vendorName: "",
    vendorGstin: "",
    vendorAddress: "",
    vendorPan: "",
    placeOfSupplyStateCode: "27",
    placeOfSupplyStateName: "Maharashtra",
    description: "Goods Transport Agency freight charges",
    hsnSacCode: "9965",
    taxableAmount: 10000,
    gstRate: 5,
    isItcEligible: true,
    paymentMode: "Bank Transfer",
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentReference: "",
  });

  // Load Vendors
  const loadVendors = useCallback(async () => {
    try {
      const data = await apiClient.get<VendorSummary[]>("/vendors");
      setVendors(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }, []);

  // Load Invoices
  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complianceApi.getRcmSelfInvoices({
        page,
        pageSize,
        section: sectionFilter !== "All" ? sectionFilter : undefined,
        status: statusFilter !== "All" ? statusFilter : undefined,
        search: search.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setInvoices(res.items);
      setTotalCount(res.totalCount);
    } catch (err) {
      notifications.error("Failed to load RCM vouchers", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sectionFilter, statusFilter, search, fromDate, toDate, notifications]);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  // Compute KPI summaries from active invoices
  const kpis = useMemo(() => {
    const active = invoices.filter((i) => i.status === "Active");
    const totalTaxable = active.reduce((sum, i) => sum + i.taxableAmount, 0);
    const totalTax = active.reduce((sum, i) => sum + (i.cgstAmount + i.sgstAmount + i.igstAmount), 0);
    const eligibleItc = active.filter((i) => i.isItcEligible).reduce((sum, i) => sum + (i.cgstAmount + i.sgstAmount + i.igstAmount), 0);
    const sec93Count = active.filter((i) => i.section === "9(3)").length;
    const sec94Count = active.filter((i) => i.section === "9(4)").length;

    return { totalTaxable, totalTax, eligibleItc, sec93Count, sec94Count };
  }, [invoices]);

  // Form Computed Taxes
  const formTaxBreakdown = useMemo(() => {
    const taxable = Number(formData.taxableAmount) || 0;
    const rate = Number(formData.gstRate) || 0;
    const isInterState = formData.placeOfSupplyStateCode !== "27"; // Assume 27 (MH) is home state

    if (isInterState) {
      const igst = Number(((taxable * rate) / 100).toFixed(2));
      return { cgst: 0, sgst: 0, igst, totalTax: igst, grandTotal: taxable + igst };
    } else {
      const halfRate = rate / 2;
      const cgst = Number(((taxable * halfRate) / 100).toFixed(2));
      const sgst = Number(((taxable * halfRate) / 100).toFixed(2));
      return { cgst, sgst, igst: 0, totalTax: cgst + sgst, grandTotal: taxable + cgst + sgst };
    }
  }, [formData.taxableAmount, formData.gstRate, formData.placeOfSupplyStateCode]);

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendorName.trim()) {
      notifications.error("Validation error", "Vendor name is required.");
      return;
    }
    if (formData.taxableAmount <= 0) {
      notifications.error("Validation error", "Taxable amount must be greater than zero.");
      return;
    }

    setBusy(true);
    try {
      await complianceApi.createRcmSelfInvoice(formData);
      notifications.success(
        "RCM Self-Invoice Created",
        "Statutory Self-Invoice and Payment Voucher generated. General Ledger posted and GST liability accrued."
      );
      setShowCreateModal(false);
      void loadInvoices();
    } catch (err) {
      notifications.error("Failed to create RCM voucher", err instanceof Error ? err.message : "Please check your inputs.");
    } finally {
      setBusy(false);
    }
  };

  // Handle Cancel Submit
  const handleCancelSubmit = async () => {
    if (!cancelModalInvoice || !cancelReason.trim()) {
      notifications.error("Validation error", "Please enter a reason for cancellation.");
      return;
    }

    setBusy(true);
    try {
      await complianceApi.cancelRcmSelfInvoice(cancelModalInvoice.id, cancelReason.trim());
      notifications.success("Voucher Cancelled", `RCM invoice ${cancelModalInvoice.invoiceNumber} has been cancelled.`);
      setCancelModalInvoice(null);
      setCancelReason("");
      void loadInvoices();
    } catch (err) {
      notifications.error("Cancellation failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-1 sm:p-2">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Scale className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Reverse Charge Mechanism (RCM)
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Section 9(3) & 9(4) statutory self-invoicing (Sec 31(3)(f)), payment vouchers (Sec 31(3)(g)), cash discharge rules (Sec 49(4)) & ITC triangulation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => void loadInvoices()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => {
              setFormData({
                invoiceDate: new Date().toISOString().slice(0, 10),
                section: "9(3)",
                category: "GTA",
                vendorName: "",
                vendorGstin: "",
                vendorAddress: "",
                vendorPan: "",
                placeOfSupplyStateCode: "27",
                placeOfSupplyStateName: "Maharashtra",
                description: "Goods Transport Agency freight charges",
                hsnSacCode: "9965",
                taxableAmount: 10000,
                gstRate: 5,
                isItcEligible: true,
                paymentMode: "Bank Transfer",
                paymentDate: new Date().toISOString().slice(0, 10),
                paymentReference: "",
              });
              setShowCreateModal(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Self-Invoice & Voucher
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>RCM Inward Taxable</span>
            <Receipt className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            ₹{kpis.totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            {kpis.sec93Count} under Sec 9(3) · {kpis.sec94Count} under Sec 9(4)
          </span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <span>RCM Output Liability</span>
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">
            ₹{kpis.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-amber-700 dark:text-amber-400 mt-1 block font-medium">
            Must be discharged in CASH (Sec 49(4))
          </span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <span>Eligible ITC Claimable</span>
            <IndianRupee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-200">
            ₹{kpis.eligibleItc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 block">
            Auto-flows into GSTR-3B Table 4(A)(3)
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Vouchers</span>
            <FileText className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{totalCount}</p>
          <span className="text-xs text-slate-500 mt-1 block">
            Self-Invoices (31(3)(f)) & Payment (31(3)(g))
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice #, vendor, PAN, GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {/* Section Filter */}
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="All">All Sections</option>
            <option value="9(3)">Section 9(3) - Specified Services/Goods</option>
            <option value="9(4)">Section 9(4) - Unregistered Suppliers</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              title="From Date"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              title="To Date"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-950 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Invoice / Voucher #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Section & Category</th>
                <th className="px-4 py-3">Vendor / Supplier</th>
                <th className="px-4 py-3 text-right">Taxable (₹)</th>
                <th className="px-4 py-3 text-right">RCM Tax (₹)</th>
                <th className="px-4 py-3 text-right">Total (₹)</th>
                <th className="px-4 py-3 text-center">ITC Eligible</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading RCM self-invoices and payment vouchers...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    No Reverse Charge Mechanism records found matching your filters.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const totalTax = inv.cgstAmount + inv.sgstAmount + inv.igstAmount;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {inv.invoiceNumber}
                        {inv.journalEntryNumber && (
                          <div className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400">
                            GL: {inv.journalEntryNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          Sec {inv.section}
                        </span>
                        <div className="text-xs text-slate-500 mt-0.5">{inv.category}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{inv.vendorName}</div>
                        <div className="text-xs text-slate-500">
                          {inv.vendorPan ? `PAN: ${inv.vendorPan}` : "Unregistered"} · {inv.placeOfSupplyStateName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ₹{inv.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-amber-700 dark:text-amber-400">
                          ₹{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {inv.gstRate}% {inv.igstAmount > 0 ? "IGST" : "CGST+SGST"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                        ₹{inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {inv.isItcEligible ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Claimable
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Ineligible
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {inv.status === "Active" ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            title="Print Statutory Self-Invoice (Section 31(3)(f))"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setViewModalType("self-invoice");
                            }}
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Self-Invoice
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Print Statutory Payment Voucher (Section 31(3)(g))"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setViewModalType("payment-voucher");
                            }}
                          >
                            <CreditCard className="h-3.5 w-3.5 mr-1" />
                            Payment Voucher
                          </Button>
                          {inv.status === "Active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              title="Cancel Voucher"
                              onClick={() => {
                                setCancelModalInvoice(inv);
                                setCancelReason("");
                              }}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800">
            <span className="text-xs text-slate-500">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} records
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page * pageSize >= totalCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-indigo-600" />
                  Generate RCM Self-Invoice & Payment Voucher
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Creates statutory Self-Invoice (Sec 31(3)(f)) and Payment Voucher (Sec 31(3)(g)), posts double-entry GL journal, and accrues GSTR-3B liability.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4 text-sm">
              {/* Section & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    GST Law Section <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.section}
                    onChange={(e) => {
                      const sec = e.target.value as "9(3)" | "9(4)";
                      setFormData((prev) => ({
                        ...prev,
                        section: sec,
                        category: sec === "9(3)" ? "GTA" : "UnregisteredVendor",
                        gstRate: sec === "9(3)" ? 5 : 18,
                        hsnSacCode: sec === "9(3)" ? "9965" : "9999",
                        description:
                          sec === "9(3)"
                            ? "Goods Transport Agency freight charges"
                            : "Procurement from unregistered supplier",
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="9(3)">Section 9(3) - Specified Goods & Services (GTA, Legal, etc.)</option>
                    <option value="9(4)">Section 9(4) - Supplies from Unregistered Persons</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Supply Category <span className="text-rose-500">*</span>
                  </label>
                  {formData.section === "9(3)" ? (
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        const cat = RCM_9_3_CATEGORIES.find((c) => c.value === e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          category: e.target.value,
                          gstRate: cat ? cat.defaultRate : prev.gstRate,
                          hsnSacCode: cat ? cat.defaultSac : prev.hsnSacCode,
                          description: cat ? cat.label : prev.description,
                        }));
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      {RCM_9_3_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label} ({cat.defaultRate}%)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                      placeholder="e.g. Unregistered Vendor Purchase"
                    />
                  )}
                </div>
              </div>

              {/* Vendor Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/50 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Supplier / Vendor Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Select Existing Vendor (Optional)
                    </label>
                    <select
                      onChange={(e) => {
                        const v = vendors.find((vend) => vend.id === e.target.value);
                        if (v) {
                          setFormData((prev) => ({
                            ...prev,
                            vendorName: v.name,
                            vendorGstin: v.gstin || "",
                            vendorPan: v.pan || "",
                            vendorAddress: v.address || "",
                          }));
                        }
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="">-- Choose or enter manually below --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.pan ? `(${v.pan})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Vendor Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.vendorName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, vendorName: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                      placeholder="e.g. Bharat Freight Logistics"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Vendor PAN
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={formData.vendorPan || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, vendorPan: e.target.value.toUpperCase() }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm uppercase dark:border-slate-700 dark:bg-slate-950"
                      placeholder="ABCDE1234F"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Place of Supply (POS) State <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.placeOfSupplyStateCode}
                      onChange={(e) => {
                        const st = INDIAN_STATES.find((s) => s.code === e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          placeOfSupplyStateCode: e.target.value,
                          placeOfSupplyStateName: st ? st.name : "",
                        }));
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.code} - {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Vendor Full Address
                    </label>
                    <input
                      type="text"
                      value={formData.vendorAddress || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, vendorAddress: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                      placeholder="e.g. Plot 42, Transport Nagar, Nigdi, Pune"
                    />
                  </div>
                </div>
              </div>

              {/* Supply Details & Tax Calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Description of Supply <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    value={formData.hsnSacCode || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, hsnSacCode: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    placeholder="e.g. 9965"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Voucher Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, invoiceDate: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Taxable Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.taxableAmount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, taxableAmount: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    GST Rate <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, gstRate: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value={5}>5% (GTA / Specified goods)</option>
                    <option value={12}>12% (Specified services)</option>
                    <option value={18}>18% (Legal / Security / Standard)</option>
                    <option value={28}>28% (Luxury / Specified)</option>
                  </select>
                </div>
              </div>

              {/* Tax Computation Summary */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 dark:border-indigo-950 dark:bg-indigo-950/20">
                <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 mb-2">
                  Tax Breakdown & Accounting Simulation
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Taxable Value:</span>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      ₹{formData.taxableAmount.toFixed(2)}
                    </div>
                  </div>
                  {formTaxBreakdown.igst > 0 ? (
                    <div>
                      <span className="text-slate-500">IGST ({formData.gstRate}%):</span>
                      <div className="font-semibold text-amber-700 dark:text-amber-400">
                        ₹{formTaxBreakdown.igst.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-slate-500">CGST ({(formData.gstRate / 2).toFixed(1)}%):</span>
                        <div className="font-semibold text-amber-700 dark:text-amber-400">
                          ₹{formTaxBreakdown.cgst.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">SGST ({(formData.gstRate / 2).toFixed(1)}%):</span>
                        <div className="font-semibold text-amber-700 dark:text-amber-400">
                          ₹{formTaxBreakdown.sgst.toFixed(2)}
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-slate-500">Total Voucher Value:</span>
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      ₹{formTaxBreakdown.grandTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* ITC Eligibility & Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="itcEligible"
                    checked={formData.isItcEligible}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isItcEligible: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="itcEligible" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Eligible for Input Tax Credit (ITC)
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Payment Mode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paymentMode: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Payment Reference / UTR
                  </label>
                  <input
                    type="text"
                    value={formData.paymentReference || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paymentReference: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    placeholder="e.g. UTR9876543210"
                  />
                </div>
              </div>

              {/* Statutory Note */}
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <strong>Statutory Compliance Mandate:</strong> Under GST Section 49(4), tax liability accrued under Reverse Charge cannot be paid using existing Input Tax Credit. It must be discharged in <strong>CASH</strong> via the Electronic Cash Ledger.
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {busy ? "Generating..." : "Generate & Post to GL"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUTORY SELF-INVOICE MODAL (Section 31(3)(f)) */}
      {viewModalType === "self-invoice" && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 printable-document">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Statutory Document Preview
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
                <button
                  onClick={() => setViewModalType(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="py-4 space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold uppercase text-slate-900 dark:text-slate-100 tracking-wide">
                  TAX INVOICE
                </h2>
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  Issued under Section 31(3)(f) of the CGST Act, 2017 (Reverse Charge Mechanism)
                </p>
                <p className="text-xs text-slate-500 mt-1">Recipient-generated Invoice for Unregistered / Specified Supplies</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px]">
                    Recipient Details (Issued By)
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Siddhi Enterprise / Store</div>
                  <div>Place of Supply: {selectedInvoice.placeOfSupplyStateName} ({selectedInvoice.placeOfSupplyStateCode})</div>
                  <div>Tax Payable on Reverse Charge: <strong className="text-indigo-600">YES</strong></div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px]">
                    Supplier / Vendor Details
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{selectedInvoice.vendorName}</div>
                  <div>{selectedInvoice.vendorAddress || "Address on record"}</div>
                  <div>PAN: {selectedInvoice.vendorPan || "N/A"}</div>
                  <div>GSTIN: {selectedInvoice.vendorGstin || "Unregistered"}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs border-y py-2 text-slate-600 dark:text-slate-400">
                <div>
                  <strong>Invoice No:</strong> {selectedInvoice.invoiceNumber}
                </div>
                <div>
                  <strong>Date:</strong> {formatDate(selectedInvoice.invoiceDate)}
                </div>
                <div>
                  <strong>Section:</strong> {selectedInvoice.section} ({selectedInvoice.category})
                </div>
              </div>

              <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="border-b">
                    <th className="p-2">Description</th>
                    <th className="p-2">HSN/SAC</th>
                    <th className="p-2 text-right">Taxable Value</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Tax Amount</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 font-medium">{selectedInvoice.description}</td>
                    <td className="p-2">{selectedInvoice.hsnSacCode || "-"}</td>
                    <td className="p-2 text-right font-medium">₹{selectedInvoice.taxableAmount.toFixed(2)}</td>
                    <td className="p-2 text-right">{selectedInvoice.gstRate}%</td>
                    <td className="p-2 text-right font-semibold text-amber-700 dark:text-amber-400">
                      ₹{(selectedInvoice.cgstAmount + selectedInvoice.sgstAmount + selectedInvoice.igstAmount).toFixed(2)}
                    </td>
                    <td className="p-2 text-right font-bold">₹{selectedInvoice.totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/40 space-y-1">
                <div className="flex justify-between">
                  <span>CGST:</span>
                  <span>₹{selectedInvoice.cgstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST:</span>
                  <span>₹{selectedInvoice.sgstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGST:</span>
                  <span>₹{selectedInvoice.igstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1 text-slate-900 dark:text-slate-100">
                  <span>Total Tax Payable under RCM:</span>
                  <span>₹{(selectedInvoice.cgstAmount + selectedInvoice.sgstAmount + selectedInvoice.igstAmount).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-8 flex justify-between items-end text-xs text-slate-500">
                <div>
                  <p>Declaration: Certified that all particulars are true and correct.</p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 mb-1"></div>
                  <span>Authorized Signatory</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATUTORY PAYMENT VOUCHER MODAL (Section 31(3)(g)) */}
      {viewModalType === "payment-voucher" && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 printable-document">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Payment Voucher Preview
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
                <button
                  onClick={() => setViewModalType(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="py-4 space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold uppercase text-slate-900 dark:text-slate-100 tracking-wide">
                  PAYMENT VOUCHER
                </h2>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Issued under Section 31(3)(g) of the CGST Act, 2017
                </p>
                <p className="text-xs text-slate-500 mt-1">Payment Document for Reverse Charge Mechanism Transactions</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px]">
                    Payer (Recipient)
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Siddhi Enterprise / Store</div>
                  <div>Place of Supply: {selectedInvoice.placeOfSupplyStateName}</div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px]">
                    Payee (Supplier)
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{selectedInvoice.vendorName}</div>
                  <div>PAN: {selectedInvoice.vendorPan || "N/A"}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs border-y py-2 text-slate-600 dark:text-slate-400">
                <div>
                  <strong>Voucher Ref:</strong> PV-{selectedInvoice.invoiceNumber}
                </div>
                <div>
                  <strong>Payment Date:</strong> {formatDate(selectedInvoice.paymentDate)}
                </div>
                <div>
                  <strong>Mode:</strong> {selectedInvoice.paymentMode}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid to Supplier:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    ₹{selectedInvoice.taxableAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Reference / UTR:</span>
                  <span>{selectedInvoice.paymentReference || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tax Payable under RCM (Discharged to Govt):</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    ₹{(selectedInvoice.cgstAmount + selectedInvoice.sgstAmount + selectedInvoice.igstAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-8 flex justify-between items-end text-xs text-slate-500">
                <div>
                  <p>Certified that the amount mentioned above has been disbursed to the supplier.</p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 mb-1"></div>
                  <span>Authorized Signatory</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <Ban className="h-5 w-5" /> Cancel RCM Voucher
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Cancelling voucher <strong>{cancelModalInvoice.invoiceNumber}</strong> will reverse the RCM liability in GSTR-3B and GL journal entries.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Cancellation Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Data entry error in taxable amount..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setCancelModalInvoice(null)}>
                Close
              </Button>
              <Button
                disabled={busy || !cancelReason.trim()}
                onClick={handleCancelSubmit}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {busy ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

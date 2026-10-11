import type { StockSku } from "../../../accounting/SkuInventoryPanel";
import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Smartphone,
  PackagePlus,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Building2,
  RefreshCw,
  Zap,
  Lightbulb,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { APP_ROUTES } from "../../../../config/routes";
import { apiClient } from "../../../../services/apiClient";
import { useNotifications } from "../../../../context/NotificationContext";
import type { CustomerLookupRecord, SaleProductOption } from "../../product/types/sale.types";
import type { SaleTaxOption } from "../../product/config/sale.form";
import type { CustomerBillTemplate } from "../../accounting/types/customerBill.types";
import {
  type CreateInvoiceLineDraft,
  type GstSupplyType,
  INDIAN_GST_STATES
} from "../types/salesInvoice.types";

interface LineFormRow extends CreateInvoiceLineDraft {
  tempId: string;
}

const currency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SalesInvoiceFormPage() {
  const navigate = useNavigate();
  const notifications = useNotifications();

  // Reference data
  const [availableProducts, setAvailableProducts] = useState<SaleProductOption[]>([]);
  const [skus, setSkus] = useState<StockSku[]>([]);
  useEffect(() => { void apiClient.get<StockSku[]>("/inventory/skus").then(rows => setSkus(rows.filter(s => s.isActive !== false))).catch(e => notifications.error("Accessory stock unavailable", String(e))); }, []);
  const [taxes, setTaxes] = useState<SaleTaxOption[]>([]);
  const [sellerSettings, setSellerSettings] = useState<CustomerBillTemplate | null>(null);
  const [loadingRefData, setLoadingRefData] = useState(true);

  // Customer state & Smart Dues Suggestion
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerMatches, setCustomerMatches] = useState<CustomerLookupRecord[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDues, setCustomerDues] = useState<{ totalOutstanding: number; invoiceCount: number } | null>(null);
  const [customerAdvance, setCustomerAdvance] = useState<number>(0);
  const [loadingCustomerBalance, setLoadingCustomerBalance] = useState(false);
  const [showPlainEnglishGuide, setShowPlainEnglishGuide] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerErrors, setCustomerErrors] = useState<Record<string, string>>({});

  const clearCustomerError = (key: string) => {
    if (customerErrors[key]) {
      setCustomerErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  // Place of Supply & Tax Mode
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState("");
  const [placeOfSupplyStateName, setPlaceOfSupplyStateName] = useState("");
  const [manualSupplyTypeOverride, setManualSupplyTypeOverride] = useState<GstSupplyType | null>(null);

  // Invoice header state
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentTermsDays, setPaymentTermsDays] = useState(0);
  const [notes, setNotes] = useState("");

  // Line items state
  const [lines, setLines] = useState<LineFormRow[]>([]);

  // Initial payment state
  const [collectPayment, setCollectPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentRef, setPaymentRef] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Load available products, taxes, and tenant seller settings
  useEffect(() => {
    async function loadData() {
      try {
        const [prods, taxList, billSettings] = await Promise.all([
          apiClient.get<SaleProductOption[]>("/products/all"),
          apiClient.get<SaleTaxOption[]>("/taxes/all"),
          apiClient.get<CustomerBillTemplate>("/settings/customer-bill").catch(() => null),
        ]);
        setAvailableProducts(prods.filter(p => p.isActive !== false));
        setTaxes(taxList);
        if (billSettings) {
          setSellerSettings(billSettings);
          // Default Place of Supply to seller's home state if present
          if (billSettings.stateCode) {
            setPlaceOfSupplyStateCode(billSettings.stateCode);
            setPlaceOfSupplyStateName(billSettings.stateName || "");
          }
        }

        // Add initial serialized row if products available
        if (prods[0]) {
          const first = prods[0];
          const matchedTax = taxList.find((t) => t.cgst === first.cgst && t.sgst === first.sgst) ?? taxList[0];
          setLines([
            {
              tempId: `row_${Date.now()}`,
              itemType: 0,
              productId: first.id,
              itemDescription: `${first.brand} - ${first.productModel} - ${first.variant} - ${first.color}`,
              serialNumber: first.serialNumber,
              serialNumber1: first.serialNumber1,
              quantity: 1,
              unitPrice: first.purchasePrice ?? 0,
              discount: 0,
              taxId: matchedTax?.id,
              cgstRate: matchedTax?.cgst ?? 0,
              sgstRate: matchedTax?.sgst ?? 0,
              igstRate: (matchedTax?.cgst ?? 0) + (matchedTax?.sgst ?? 0),
            },
          ]);
        } else {
          setLines([
            {
              tempId: `row_${Date.now()}`,
              itemType: 1,
              itemDescription: "",
              quantity: 1,
              unitPrice: 0,
              discount: 0,
              taxId: taxList[0]?.id,
              cgstRate: taxList[0]?.cgst ?? 0,
              sgstRate: taxList[0]?.sgst ?? 0,
              igstRate: (taxList[0]?.cgst ?? 0) + (taxList[0]?.sgst ?? 0),
            },
          ]);
        }
      } catch (err) {
        notifications.error("Failed to load catalog data", err instanceof Error ? err.message : "Error loading data");
      } finally {
        setLoadingRefData(false);
      }
    }
    void loadData();
  }, [notifications]);

  // Handle GSTIN change with instant 2-digit state resolution
  const handleGstinChange = (raw: string) => {
    const val = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
    setCustomerGstin(val);

    if (val.length >= 2) {
      const code = val.slice(0, 2);
      const matchedState = INDIAN_GST_STATES.find((s) => s.code === code);
      if (matchedState) {
        setPlaceOfSupplyStateCode(matchedState.code);
        setPlaceOfSupplyStateName(matchedState.name);
      }
    }
  };

  const handleStateChange = (code: string) => {
    setPlaceOfSupplyStateCode(code);
    const matchedState = INDIAN_GST_STATES.find((s) => s.code === code);
    setPlaceOfSupplyStateName(matchedState?.name || "");
  };

  // Determine Supply Type: IntraState (0) vs InterState (1)
  const effectiveSupplyType: GstSupplyType = useMemo(() => {
    if (manualSupplyTypeOverride !== null) {
      return manualSupplyTypeOverride;
    }

    const sellerCode = sellerSettings?.stateCode?.trim() || sellerSettings?.taxRegistrationNumber?.slice(0, 2);
    const customerCode = placeOfSupplyStateCode?.trim();

    if (sellerCode && customerCode) {
      return sellerCode.toLowerCase() === customerCode.toLowerCase() ? 0 : 1;
    }

    return 0; // Default intra-state
  }, [manualSupplyTypeOverride, sellerSettings?.stateCode, sellerSettings?.taxRegistrationNumber, placeOfSupplyStateCode]);

  const isInterState = effectiveSupplyType === 1;

  // Customer search debouncing
  useEffect(() => {
    if (!customerSearch.trim() || customerSearch.length < 2) {
      setCustomerMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await apiClient.get<CustomerLookupRecord[]>(
          `/customers?search=${encodeURIComponent(customerSearch)}&limit=5`
        );
        setCustomerMatches(results);
      } catch {
        setCustomerMatches([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const fetchCustomerBalance = async (customerId: string) => {
    setLoadingCustomerBalance(true);
    try {
      const [unpaidRes, advRes] = await Promise.allSettled([
        apiClient.get<{ totalOutstanding: number; invoices: Array<unknown> }>(`/sales/invoices/unpaid-by-customer/${customerId}`),
        apiClient.get<Array<{ remainingAmount: number }>>(`/sales/invoices/advances/${customerId}`)
      ]);

      if (unpaidRes.status === "fulfilled" && unpaidRes.value) {
        setCustomerDues({
          totalOutstanding: unpaidRes.value.totalOutstanding || 0,
          invoiceCount: unpaidRes.value.invoices?.length || 0,
        });
      } else {
        setCustomerDues(null);
      }

      if (advRes.status === "fulfilled" && Array.isArray(advRes.value)) {
        const totalAdv = advRes.value.reduce((sum, a) => sum + (Number(a.remainingAmount) || 0), 0);
        setCustomerAdvance(totalAdv);
      } else {
        setCustomerAdvance(0);
      }
    } catch {
      setCustomerDues(null);
      setCustomerAdvance(0);
    } finally {
      setLoadingCustomerBalance(false);
    }
  };

  const selectCustomer = (c: CustomerLookupRecord) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerMobile(c.mobile);
    setCustomerAddress(c.address);
    setCustomerEmail(c.email || "");
    setCustomerSearch("");
    setCustomerMatches([]);

    setCustomerGstin("");
    setManualSupplyTypeOverride(null);
    handleStateChange(sellerSettings?.stateCode ?? "");
    // Check if customer has GSTIN or state info
    const anyCustomer = c as unknown as { gstin?: string; stateCode?: string; stateName?: string };
    if (anyCustomer.gstin) {
      handleGstinChange(anyCustomer.gstin);
    } else if (anyCustomer.stateCode) {
      handleStateChange(anyCustomer.stateCode);
    }

    // Proactively fetch customer unpaid dues and advance store credit for smart suggestions
    void fetchCustomerBalance(c.id);
  };

  // Line calculations taking Supply Type (IGST vs CGST+SGST) into account
  const calculatedLines = useMemo(() => {
    return lines.map((line) => {
      const gross = Math.round(Number(line.quantity || 0) * Number(line.unitPrice || 0) * 100) / 100;
      const discount = Math.min(gross, Math.max(0, Number(line.discount || 0)));
      const taxable = Math.max(0, gross - discount);

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        const igstRate = Number(line.igstRate || 0) || (Number(line.cgstRate || 0) + Number(line.sgstRate || 0));
        igst = Math.round(taxable * (igstRate / 100) * 100) / 100;
      } else {
        cgst = Math.round(taxable * (Number(line.cgstRate || 0) / 100) * 100) / 100;
        sgst = Math.round(taxable * (Number(line.sgstRate || 0) / 100) * 100) / 100;
      }

      const lineTotal = taxable + cgst + sgst + igst;
      return {
        ...line,
        gross,
        taxable,
        cgst,
        sgst,
        igst,
        lineTotal,
      };
    });
  }, [lines, isInterState]);

  const totals = useMemo(() => {
    let subTotal = 0;
    let discount = 0;
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let total = 0;
    calculatedLines.forEach((l) => {
      subTotal += l.gross;
      discount += l.discount;
      taxable += l.taxable;
      cgst += l.cgst;
      sgst += l.sgst;
      igst += l.igst;
      total += l.lineTotal;
    });
    return {
      subTotal: Math.round(subTotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      taxable: Math.round(taxable * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }, [calculatedLines]);

  // Sync initial payment when total changes
  useEffect(() => {
    if (collectPayment) {
      setPaymentAmount(totals.total);
    }
  }, [totals.total, collectPayment]);

  const addSerializedLine = () => {
    const usedProductIds = new Set(lines.filter((l) => l.productId).map((l) => l.productId));
    const nextProd = availableProducts.find((p) => !usedProductIds.has(p.id));
    if (!nextProd) { notifications.warning("All available devices are already selected."); return; }
    const defaultTax = nextProd ? taxes.find((t) => t.cgst === nextProd.cgst && t.sgst === nextProd.sgst) ?? taxes[0] : taxes[0];

    setLines((prev) => [
      ...prev,
      {
        tempId: `row_${Date.now()}_${Math.random()}`,
        itemType: 0,
        productId: nextProd?.id,
        itemDescription: nextProd
          ? `${nextProd.brand} - ${nextProd.productModel} - ${nextProd.variant} - ${nextProd.color}`
          : "Serialized Device",
        serialNumber: nextProd?.serialNumber,
        serialNumber1: nextProd?.serialNumber1,
        quantity: 1,
        unitPrice: nextProd?.purchasePrice ?? 0,
        discount: 0,
        taxId: defaultTax?.id,
        cgstRate: defaultTax?.cgst ?? 0,
        sgstRate: defaultTax?.sgst ?? 0,
        igstRate: (defaultTax?.cgst ?? 0) + (defaultTax?.sgst ?? 0),
      },
    ]);
  };

  const addStandardLine = () => {
    const defaultTax = taxes[0];
    setLines((prev) => [
      ...prev,
      {
        tempId: `row_${Date.now()}_${Math.random()}`,
        itemType: 1,
        itemDescription: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxId: defaultTax?.id,
        cgstRate: defaultTax?.cgst ?? 0,
        sgstRate: defaultTax?.sgst ?? 0,
        igstRate: (defaultTax?.cgst ?? 0) + (defaultTax?.sgst ?? 0),
      },
    ]);
  };

  const removeLine = (tempId: string) => {
    if (lines.length <= 1) {
      notifications.warning("Invoice must have at least one line item.");
      return;
    }
    setLines((prev) => prev.filter((l) => l.tempId !== tempId));
  };

  const updateLineField = (tempId: string, patch: Partial<CreateInvoiceLineDraft>) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.tempId !== tempId) return line;

        // If product changed in serialized row, auto-fill details
        if (patch.productId && patch.productId !== line.productId) {
          const prod = availableProducts.find((p) => p.id === patch.productId);
          if (prod) {
            const matchedTax = taxes.find((t) => t.cgst === prod.cgst && t.sgst === prod.sgst) ?? taxes[0];
            return {
              ...line,
              ...patch,
              itemDescription: `${prod.brand} - ${prod.productModel} - ${prod.variant} - ${prod.color}`,
              serialNumber: prod.serialNumber,
              serialNumber1: prod.serialNumber1,
              unitPrice: prod.purchasePrice ?? 0,
              taxId: matchedTax?.id,
              cgstRate: matchedTax?.cgst ?? 0,
              sgstRate: matchedTax?.sgst ?? 0,
              igstRate: (matchedTax?.cgst ?? 0) + (matchedTax?.sgst ?? 0),
            };
          }
        }

        // If tax changed, update rates
        if (patch.taxId && patch.taxId !== line.taxId) {
          const t = taxes.find((tax) => tax.id === patch.taxId);
          return {
            ...line,
            ...patch,
            cgstRate: t?.cgst ?? 0,
            sgstRate: t?.sgst ?? 0,
            igstRate: (t?.cgst ?? 0) + (t?.sgst ?? 0),
          };
        }

        return { ...line, ...patch };
      })
    );
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (sellerSettings?.taxRegistrationNumber?.trim() &&
      (!(sellerSettings.stateCode?.trim() || /^\d{2}/.exec(sellerSettings.taxRegistrationNumber)?.[0]) || !placeOfSupplyStateCode)) {
      notifications.error("GST state missing", "Save Home State (GST) in Settings > Customer Bill, then choose Place of Supply (State).");
      return;
    }

    const errors: Record<string, string> = {};
    if (!customerName.trim()) errors.customerName = "Customer name is required.";
    if (!customerMobile.trim()) {
      errors.customerMobile = "Mobile number is required.";
    } else if (!/^\d{10}$/.test(customerMobile.trim())) {
      errors.customerMobile = "Mobile number must be a 10-digit number.";
    }
    if (!customerAddress.trim()) errors.customerAddress = "Customer address is required.";
    if (!placeOfSupplyStateCode) errors.placeOfSupplyStateCode = "Please select Place of Supply state.";
    if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      errors.customerEmail = "Please enter a valid email address.";
    }
    if (customerGstin.trim()) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(customerGstin.trim())) {
        errors.customerGstin = "Invalid GSTIN format (e.g. 27AABCU9603R1ZM).";
      }
    }
    if (!invoiceDate) errors.invoiceDate = "Invoice date is required.";
    if (collectPayment) {
      if (!paymentAmount || paymentAmount <= 0) {
        errors.paymentAmount = "Payment amount must be greater than zero.";
      } else if (paymentAmount > totals.total) {
        errors.paymentAmount = "Payment amount cannot exceed invoice total.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setCustomerErrors(errors);
      notifications.error("Incomplete details", "Please correct the highlighted fields before submitting.");
      return;
    }
    setCustomerErrors({});

    if (lines.length === 0) {
      notifications.error("Empty Invoice", "Please add at least one line item.");
      return;
    }

    if (submitting) return;
    const ids = lines.filter(l => l.itemType === 0).map(l => l.productId);
    if (ids.some(id => !id) || new Set(ids).size !== ids.length) { notifications.error("Invalid items", "Choose a different device for every serialized line."); return; }
    for (const l of lines) {
      if (!l.itemDescription.trim()) {
        notifications.error("Missing Description", "Every item must have a valid description.");
        return;
      }
      if (l.quantity <= 0) {
        notifications.error("Invalid Quantity", "Quantity must be greater than zero.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerMobile: customerMobile.trim(),
        customerAddress: customerAddress.trim(),
        customerEmail: customerEmail.trim() || null,
        customerGstin: customerGstin.trim() || null,
        placeOfSupplyStateCode: placeOfSupplyStateCode || null,
        placeOfSupplyStateName: placeOfSupplyStateName || null,
        supplyType: effectiveSupplyType,
        invoiceDate,
        paymentTermsDays,
        notes: notes.trim() || null,
        lines: lines.map((l) => ({
          itemType: l.itemType,
          productId: l.productId || null,
          skuId: l.skuId || null,
          itemDescription: l.itemDescription.trim(),
          hsnSac: l.hsnSac?.trim() || null,
          unitOfMeasure: l.unitOfMeasure || "NOS",
          serialNumber: l.serialNumber?.trim() || null,
          serialNumber1: l.serialNumber1?.trim() || null,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discount: Number(l.discount || 0),
          taxId: l.taxId || null,
          cgstRate: Number(l.cgstRate || 0),
          sgstRate: Number(l.sgstRate || 0),
          igstRate: isInterState ? Number(l.cgstRate || 0) + Number(l.sgstRate || 0) : 0,
        })),
        initialPayment:
          collectPayment && paymentAmount > 0
            ? {
              amount: Number(paymentAmount),
              paymentMode,
              paymentDate: invoiceDate,
              referenceNumber: paymentRef.trim() || null,
            }
            : null,
      };

      const result = await apiClient.post<{ invoice: { id: string; billNumber: string } }>(
        "/sales/invoices",
        payload
      );
      notifications.success("Invoice Created", `Invoice ${result.invoice.billNumber} posted successfully.`);
      navigate(APP_ROUTES.sale.invoices.print(result.invoice.id));
    } catch (err) {
      notifications.error("Invoice Failed", err instanceof Error ? err.message : "Failed to create invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  // Keep latest function refs for keyboard hotkeys
  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;
  const addSerializedRef = useRef(addSerializedLine);
  addSerializedRef.current = addSerializedLine;
  const addStandardRef = useRef(addStandardLine);
  addStandardRef.current = addStandardLine;

  // Global hotkeys for invoice entry (Tally speed workflow)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Alt+S => Submit & Post
      if ((e.ctrlKey && e.key === "Enter") || (e.altKey && (e.key === "s" || e.key === "S"))) {
        e.preventDefault();
        void submitRef.current();
        return;
      }
      // Alt+N => Add Serialized Phone
      if (e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        addSerializedRef.current();
        return;
      }
      // Alt+A => Add Accessory / General
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        addStandardRef.current();
        return;
      }
      // Escape => Cancel back to invoices list
      if (e.key === "Escape") {
        const target = e.target as HTMLElement;
        if (target && target.tagName === "SELECT") return;
        if (window.confirm("Discard unsaved invoice changes and return to invoice list?")) {
          navigate(APP_ROUTES.sale.invoices.list);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  if (loadingRefData) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading catalog and taxes…</div>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 pb-12">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.sale.invoices.list)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              New Multi-Line Sales Invoice
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automated Place of Supply, IGST / CGST / SGST split, serialized phones, and accessories.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(APP_ROUTES.sale.invoices.list)}>
            Cancel <kbd className="hidden rounded bg-slate-100 px-1 py-0.5 text-[10px] font-mono text-slate-500 sm:inline dark:bg-slate-800">Esc</kbd>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Posting Invoice…" : "Post & Print Invoice"}
            <kbd className="ml-1.5 hidden rounded bg-white/25 px-1.5 py-0.5 text-[10px] font-mono text-white sm:inline">Ctrl+Enter</kbd>
          </Button>
        </div>
      </header>

      {/* Smart Plain-English Guide for Non-Accountants Banner */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-purple-50/70 p-3.5 text-xs text-indigo-950 shadow-xs dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs dark:bg-indigo-500">
              <Lightbulb size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-950 dark:text-indigo-100">
                  Plain-English Billing Assistant
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300">
                  <Sparkles size={10} /> Zero Accounting Knowledge Required
                </span>
              </div>
              <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                Double-entry journals, GST splits, inventory relieving, and customer ledger balances run automatically behind the scenes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPlainEnglishGuide((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-300/70 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 shadow-2xs hover:bg-indigo-50 dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-200 dark:hover:bg-slate-700"
          >
            {showPlainEnglishGuide ? "Hide Guide" : "💡 How It Works (Quick Tour)"}
            {showPlainEnglishGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {showPlainEnglishGuide && (
          <div className="mt-3 grid grid-cols-1 gap-2.5 border-t border-indigo-200/70 pt-3 sm:grid-cols-2 lg:grid-cols-4 dark:border-indigo-900/50">
            <div className="rounded-lg bg-white/80 p-2.5 shadow-2xs dark:bg-slate-900/60">
              <span className="font-semibold text-indigo-900 dark:text-indigo-200">1. Customer & Dues</span>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                Type mobile number to find customer. The system proactively checks if they owe past bills or hold advance store credits.
              </p>
            </div>
            <div className="rounded-lg bg-white/80 p-2.5 shadow-2xs dark:bg-slate-900/60">
              <span className="font-semibold text-indigo-900 dark:text-indigo-200">2. Serialized IMEI & Stock</span>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                Pick a phone from inventory. Its IMEI is locked to this invoice. Saving automatically subtracts 1 from store stock.
              </p>
            </div>
            <div className="rounded-lg bg-white/80 p-2.5 shadow-2xs dark:bg-slate-900/60">
              <span className="font-semibold text-indigo-900 dark:text-indigo-200">3. Automated GST Split</span>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                No tax formulas needed. Intra-State splits CGST + SGST (50/50). Inter-State applies 100% IGST. All tax ledgers are ready for your CA.
              </p>
            </div>
            <div className="rounded-lg bg-white/80 p-2.5 shadow-2xs dark:bg-slate-900/60">
              <span className="font-semibold text-indigo-900 dark:text-indigo-200">4. 1-Click Fast Payment</span>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                Click 1 button for "Full Cash", "Full UPI", or "Pay Later". Unpaid bills are safely tracked in the customer's ledger.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard-Speed Assist Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-950 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
        <div className="flex items-center gap-2 font-medium">
          <Zap className="size-4 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold text-amber-800 dark:text-amber-300">Tally Keyboard Speed Mode:</span>
          <span className="hidden sm:inline">Rapid voucher entry without touching the mouse</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px]">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-amber-300/60 bg-white px-1.5 py-0.5 font-bold shadow-2xs dark:border-slate-700 dark:bg-slate-800">Alt+N</kbd> Phone
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-amber-300/60 bg-white px-1.5 py-0.5 font-bold shadow-2xs dark:border-slate-700 dark:bg-slate-800">Alt+A</kbd> Accessory
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-amber-300/60 bg-white px-1.5 py-0.5 font-bold shadow-2xs dark:border-slate-700 dark:bg-slate-800">Ctrl+Enter</kbd> or <kbd className="rounded border border-amber-300/60 bg-white px-1.5 py-0.5 font-bold shadow-2xs dark:border-slate-700 dark:bg-slate-800">Alt+S</kbd> Save
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-amber-300/60 bg-white px-1.5 py-0.5 font-bold shadow-2xs dark:border-slate-700 dark:bg-slate-800">Esc</kbd> Cancel
          </span>
        </div>
      </div>

      {/* Customer & GST Place of Supply Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Customer Details Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Customer Details</h2>
            <span className="text-xs text-slate-400">Search existing or type new</span>
          </div>

          <div className="relative mt-3">
            <input
              type="text"
              placeholder="🔍 Search customer by name or mobile number…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950"
            />
            {customerMatches.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {customerMatches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCustomer(c)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div>
                      <strong className="text-slate-900 dark:text-slate-100">{c.name}</strong>
                      <p className="text-slate-500">{c.mobile}</p>
                    </div>
                    <span className="text-slate-400">{c.address}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Proactive Customer Suggestion Badge */}
          {(customerDues?.totalOutstanding || customerAdvance > 0 || loadingCustomerBalance) && (
            <div className="mt-2.5 space-y-2">
              {loadingCustomerBalance && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <RefreshCw size={12} className="animate-spin" /> Checking customer account history…
                </div>
              )}
              {customerDues && customerDues.totalOutstanding > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/90 p-2.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <strong>💡 Smart Suggestion:</strong> Customer has{" "}
                      <span className="font-extrabold text-amber-950 dark:text-amber-100">{currency(customerDues.totalOutstanding)}</span>{" "}
                      unpaid balance across {customerDues.invoiceCount} past bill(s).
                    </div>
                  </div>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                    Consider collecting old dues together with this bill
                  </span>
                </div>
              )}
              {customerAdvance > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/90 p-2.5 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <strong>✨ Advance Credit Available:</strong> Customer has{" "}
                      <span className="font-extrabold text-emerald-950 dark:text-emerald-100">{currency(customerAdvance)}</span> in store credit.
                    </div>
                  </div>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                    Can be applied to settle bills in Multi-Pay
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  clearCustomerError("customerName");
                }}
                placeholder="Full Name"
                aria-invalid={Boolean(customerErrors.customerName)}
                className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm dark:bg-slate-800 ${
                  customerErrors.customerName
                    ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
              {customerErrors.customerName && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {customerErrors.customerName}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={customerMobile}
                onChange={(e) => {
                  setCustomerMobile(e.target.value);
                  clearCustomerError("customerMobile");
                }}
                placeholder="10-digit mobile"
                aria-invalid={Boolean(customerErrors.customerMobile)}
                className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm dark:bg-slate-800 ${
                  customerErrors.customerMobile
                    ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
              {customerErrors.customerMobile && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {customerErrors.customerMobile}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => {
                  setCustomerAddress(e.target.value);
                  clearCustomerError("customerAddress");
                }}
                placeholder="Street / Area / City"
                aria-invalid={Boolean(customerErrors.customerAddress)}
                className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm dark:bg-slate-800 ${
                  customerErrors.customerAddress
                    ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
              {customerErrors.customerAddress && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {customerErrors.customerAddress}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Email (Optional)</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => {
                  setCustomerEmail(e.target.value);
                  clearCustomerError("customerEmail");
                }}
                placeholder="customer@email.com"
                aria-invalid={Boolean(customerErrors.customerEmail)}
                className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm dark:bg-slate-800 ${
                  customerErrors.customerEmail
                    ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
              {customerErrors.customerEmail && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {customerErrors.customerEmail}
                </p>
              )}
            </div>

            {/* GSTIN & Place of Supply */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Customer GSTIN (B2B Sales)
              </label>
              <input
                type="text"
                maxLength={15}
                placeholder="e.g. 27AABCU9603R1ZM"
                value={customerGstin}
                onChange={(e) => {
                  handleGstinChange(e.target.value);
                  clearCustomerError("customerGstin");
                }}
                aria-invalid={Boolean(customerErrors.customerGstin)}
                className={`mt-1 w-full font-mono uppercase rounded-lg border px-3 py-1.5 text-sm tracking-wider dark:bg-slate-800 ${
                  customerErrors.customerGstin
                    ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
              {customerErrors.customerGstin && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {customerErrors.customerGstin}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Place of Supply (State) <span className="text-rose-500">*</span>
              </label>
              <select
                value={placeOfSupplyStateCode}
                onChange={(e) => {
                  handleStateChange(e.target.value);
                  clearCustomerError("placeOfSupplyStateCode");
                }}
                aria-invalid={Boolean(customerErrors.placeOfSupplyStateCode)}
                className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm dark:bg-slate-800 ${
                  customerErrors.placeOfSupplyStateCode
                    ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              >
                <option value="">Select State / UT</option>
                {INDIAN_GST_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
              {customerErrors.placeOfSupplyStateCode && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {customerErrors.placeOfSupplyStateCode}
                </p>
              )}
            </div>
          </div>

          {/* Place of Supply Detection Banner */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Seller State:</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                <Building2 size={13} className="text-slate-400" />
                {sellerSettings?.stateName || sellerSettings?.stateCode || (/^\d{2}/.exec(sellerSettings?.taxRegistrationNumber ?? "")?.[0]) || "Not configured — set Home State in Customer Bill settings"}
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-xs text-slate-500">Place of Supply:</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                <MapPin size={13} className="text-slate-400" />
                {placeOfSupplyStateName || "Local"} ({placeOfSupplyStateCode || "Local"})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isInterState ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  <ShieldCheck size={13} /> Inter-State Supply (IGST 100%)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 size={13} /> Intra-State Supply (CGST 50% + SGST 50%)
                </span>
              )}

            </div>
          </div>
        </div>

        {/* Invoice Metadata Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            Invoice Settings
          </h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Invoice Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => {
                  setInvoiceDate(e.target.value);
                  clearCustomerError("invoiceDate");
                }}
                aria-invalid={Boolean(customerErrors.invoiceDate)}
                className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm dark:bg-slate-800 ${
                  customerErrors.invoiceDate
                    ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
              {customerErrors.invoiceDate && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {customerErrors.invoiceDate}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Payment Terms (days)</label>
              <input
                type="number"
                min={0}
                max={365}
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Notes / Memo</label>
              <input
                type="text"
                placeholder="Warranty notes, sales rep, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Invoice Items</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {lines.length} lines
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addSerializedLine}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300"
            >
              <Smartphone size={14} /> + Serialized Phone
              <kbd className="ml-1 rounded bg-blue-200/70 px-1 py-0.5 text-[10px] font-mono text-blue-900 dark:bg-blue-900 dark:text-blue-200">Alt+N</kbd>
            </button>
            <button
              type="button"
              onClick={addStandardLine}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
            >
              <PackagePlus size={14} /> + Accessory / General
              <kbd className="ml-1 rounded bg-emerald-200/70 px-1 py-0.5 text-[10px] font-mono text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">Alt+A</kbd>
            </button>
          </div>
        </div>

        {skus.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2.5 pt-1 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400">💡 Quick Add Stocked Accessories:</span>
            {skus.slice(0, 5).map((sku) => (
              <button
                key={sku.id}
                type="button"
                onClick={() => {
                  const defaultTax = taxes[0];
                  setLines((prev) => [
                    ...prev,
                    {
                      tempId: `row_${Date.now()}_${Math.random()}`,
                      itemType: 1,
                      skuId: sku.id,
                      itemDescription: sku.name,
                      hsnSac: sku.hsnSac,
                      unitOfMeasure: sku.unitOfMeasure || "NOS",
                      quantity: 1,
                      unitPrice: sku.unitCost || 0,
                      discount: 0,
                      taxId: defaultTax?.id,
                      cgstRate: defaultTax?.cgst ?? 0,
                      sgstRate: defaultTax?.sgst ?? 0,
                      igstRate: (defaultTax?.cgst ?? 0) + (defaultTax?.sgst ?? 0),
                    },
                  ]);
                }}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                + {sku.name} ({sku.quantity} in stock)
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                <th className="py-2.5 pl-3">Type</th>
                <th className="py-2.5">Item & Details</th>
                <th className="py-2.5">HSN/SAC · Unit</th><th className="py-2.5 text-center">Qty</th>
                <th className="py-2.5 text-right">Price (₹)</th>
                <th className="py-2.5 text-right">Discount (₹)</th>
                <th className="py-2.5 text-center">
                  {isInterState ? "IGST Rate" : "GST Rate (CGST+SGST)"}
                </th>
                <th className="py-2.5 text-right">Total (₹)</th>
                <th className="py-2.5 pr-3 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {calculatedLines.map((line) => (
                <tr key={line.tempId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 pl-3">
                    {line.itemType === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        <Smartphone size={10} /> Serial
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <select aria-label="Line item type" value={line.itemType} onChange={e => updateLineField(line.tempId, { itemType: Number(e.target.value) as 1 | 2, skuId: null, itemDescription: "" })} className="bg-transparent"><option value={1}>Accessory</option><option value={2}>Service</option></select>
                      </span>
                    )}
                  </td>

                  {/* Item Description / Product Selection */}
                  <td className="py-2.5 pr-2">
                    {line.itemType === 0 ? (
                      <div className="space-y-1">
                        <select
                          value={line.productId ?? ""}
                          onChange={(e) => updateLineField(line.tempId, { productId: e.target.value })}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        >
                          {availableProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.brand} - {p.productModel} ({p.variant}/{p.color}) — {p.serialNumber}
                            </option>
                          ))}
                        </select>
                        <div className="text-[10px] text-slate-500">
                          IMEI 1: {line.serialNumber || "—"}{" "}
                          {line.serialNumber1 ? `· IMEI 2: ${line.serialNumber1}` : ""}
                        </div>
                      </div>
                    ) : line.itemType === 1 ? (
                      <select aria-label="Accessory SKU" value={line.skuId ?? ""} onChange={e => {
                        const sku = skus.find(s => s.id === e.target.value);
                        updateLineField(line.tempId, { skuId: sku?.id, itemDescription: sku?.name ?? "", hsnSac: sku?.hsnSac, unitOfMeasure: sku?.unitOfMeasure });
                      }} className="w-full rounded border bg-transparent p-2"><option value="">Choose stocked accessory</option>{skus.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name} · {s.quantity} available</option>)}</select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Service description"
                        value={line.itemDescription}
                        onChange={(e) => updateLineField(line.tempId, { itemDescription: e.target.value })}
                        required
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    )}
                  </td>

                  <td className="py-2 px-2"><input aria-label="HSN / SAC" placeholder="HSN / SAC" maxLength={8} value={line.hsnSac ?? ""} onChange={e => updateLineField(line.tempId, { hsnSac: e.target.value })} className="w-20 rounded border bg-transparent p-1" /><input aria-label="Unit of measure" placeholder="NOS" maxLength={10} value={line.unitOfMeasure ?? "NOS"} onChange={e => updateLineField(line.tempId, { unitOfMeasure: e.target.value })} className="mt-1 w-20 rounded border bg-transparent p-1" /></td>
                  {/* Quantity */}
                  <td className="w-16 py-2.5 px-2 text-center">
                    <input
                      type="number"
                      step={line.itemType === 0 ? "1" : "0.0001"}
                      min="1"
                      disabled={line.itemType === 0}
                      value={line.quantity}
                      onChange={(e) => updateLineField(line.tempId, { quantity: Number(e.target.value) })}
                      className="w-14 rounded border border-slate-300 py-1 text-center text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </td>

                  {/* Unit Price */}
                  <td className="w-28 py-2.5 px-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unitPrice}
                      onChange={(e) => updateLineField(line.tempId, { unitPrice: Number(e.target.value) })}
                      className="w-24 rounded border border-slate-300 py-1 text-right text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </td>

                  {/* Discount */}
                  <td className="w-24 py-2.5 px-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.discount}
                      onChange={(e) => updateLineField(line.tempId, { discount: Number(e.target.value) })}
                      className="w-20 rounded border border-slate-300 py-1 text-right text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </td>

                  {/* Tax Dropdown */}
                  <td className="w-32 py-2.5 px-2 text-center">
                    <select
                      value={line.taxId ?? ""}
                      onChange={(e) => updateLineField(line.tempId, { taxId: e.target.value })}
                      className="rounded border border-slate-300 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      {taxes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {isInterState ? `IGST ${t.totalTax}%` : `${t.totalTax}% (${t.cgst}+${t.sgst})`}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Line Total */}
                  <td className="w-28 py-2.5 px-2 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {currency(line.lineTotal)}
                  </td>

                  {/* Delete button */}
                  <td className="w-12 py-2.5 pr-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(line.tempId)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section: Payment Collection & Financial Summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Payment Collection Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <input
              type="checkbox"
              checked={collectPayment}
              onChange={(e) => setCollectPayment(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            <span>Collect Payment at Invoicing (Optional)</span>
          </label>

          {/* 1-Click Smart Payment Suggestion Shortcuts */}
          <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 dark:text-indigo-300">
              <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Smart Payment Shortcuts (1-Click Auto-Fill):</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCollectPayment(true);
                  setPaymentAmount(totals.total);
                  setPaymentMode("Cash");
                }}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                💵 Full Cash ({currency(totals.total)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setCollectPayment(true);
                  setPaymentAmount(totals.total);
                  setPaymentMode("UPI");
                }}
                className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
              >
                📱 Full UPI / QR ({currency(totals.total)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setCollectPayment(true);
                  setPaymentAmount(totals.total);
                  setPaymentMode("Card");
                }}
                className="inline-flex items-center gap-1 rounded-md border border-purple-300 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-800 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
              >
                💳 Card Swipe ({currency(totals.total)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setCollectPayment(false);
                  setPaymentAmount(0);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                ⏳ Pay Later (Credit Bill)
              </button>
            </div>
          </div>

          {collectPayment && (
            <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Payment Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totals.total}
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentAmount(Number(e.target.value));
                      clearCustomerError("paymentAmount");
                    }}
                    aria-invalid={Boolean(customerErrors.paymentAmount)}
                    className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm dark:bg-slate-800 ${
                      customerErrors.paymentAmount
                        ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                  />
                  {customerErrors.paymentAmount && (
                    <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {customerErrors.paymentAmount}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="Bank">Bank Transfer / IMPS</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Transaction / Ref Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cheque No."
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* Invoice Grand Totals Summary Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            Invoice Summary
          </h2>
          <dl className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-800">
            <div className="flex justify-between py-1.5">
              <dt className="text-slate-500">Gross Subtotal</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{currency(totals.subTotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between py-1.5 text-rose-600 dark:text-rose-400">
                <dt>Total Discount</dt>
                <dd>− {currency(totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between py-1.5">
              <dt className="text-slate-500">Taxable Value</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{currency(totals.taxable)}</dd>
            </div>

            {/* Tax breakdown based on Supply Type */}
            {isInterState ? (
              totals.igst > 0 && (
                <div className="flex justify-between py-1.5 text-purple-700 dark:text-purple-400 font-medium">
                  <dt>Integrated GST (IGST)</dt>
                  <dd>+{currency(totals.igst)}</dd>
                </div>
              )
            ) : (
              <>
                {totals.cgst > 0 && (
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">CGST Total</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">+{currency(totals.cgst)}</dd>
                  </div>
                )}
                {totals.sgst > 0 && (
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">SGST Total</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">+{currency(totals.sgst)}</dd>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-between py-3 text-base font-bold text-slate-900 dark:text-slate-100">
              <dt>Grand Total</dt>
              <dd className="text-lg text-[var(--tenant-primary)]">{currency(totals.total)}</dd>
            </div>

            {collectPayment && (
              <div className="flex justify-between border-t border-slate-200 pt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <dt>Amount Paid Now</dt>
                <dd>{currency(paymentAmount)}</dd>
              </div>
            )}
            {collectPayment && (
              <div className="flex justify-between pt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <dt>Balance Remaining</dt>
                <dd>{currency(Math.max(0, totals.total - paymentAmount))}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </form>
  );
}
